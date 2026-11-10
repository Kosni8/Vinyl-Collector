// Supabase Edge Function "discogs"
//
// A small, authenticated proxy in front of the Discogs API. It keeps the
// Discogs personal access token on the server (secret DISCOGS_TOKEN) so it is
// never shipped to the browser, and only answers requests from users who are
// logged in to the app.
//
// Request: POST { action: string, ...params }  (JSON)
// Response: JSON, or raw image bytes for action "image".

import { createClient } from 'jsr:@supabase/supabase-js@2'

const API = 'https://api.discogs.com'
const USER_AGENT = 'VinylCollectorPWA/1.0 +https://github.com/Kosni8/Vinyl-Collector'
const FOLDER_NAME = 'Vinyl Collector'
const CURRENCY = 'EUR'
const VALUE_CONDITION = 'Very Good Plus (VG+)'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

class DiscogsError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function discogs(path: string, init: RequestInit = {}) {
  const token = Deno.env.get('DISCOGS_TOKEN')
  if (!token) throw new DiscogsError(500, 'DISCOGS_TOKEN ist nicht gesetzt')
  const res = await fetch(API + path, {
    ...init,
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Discogs token=${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 204) return null
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  if (!res.ok) throw new DiscogsError(res.status, data?.message ?? `Discogs-Fehler ${res.status}`)
  return data
}

// --- helpers ---------------------------------------------------------------

let cachedUsername: string | null = null
async function username() {
  if (cachedUsername) return cachedUsername
  const id = await discogs('/oauth/identity')
  cachedUsername = id.username as string
  return cachedUsername
}

let cachedFolderId: number | null = null
async function folderId() {
  if (cachedFolderId) return cachedFolderId
  const user = await username()
  const { folders } = await discogs(`/users/${encodeURIComponent(user)}/collection/folders`)
  const existing = folders.find((f: any) => f.name === FOLDER_NAME)
  if (existing) {
    cachedFolderId = existing.id
  } else {
    const created = await discogs(`/users/${encodeURIComponent(user)}/collection/folders`, {
      method: 'POST',
      body: JSON.stringify({ name: FOLDER_NAME }),
    })
    cachedFolderId = created.id
  }
  return cachedFolderId!
}

function searchParams(p: Record<string, unknown>) {
  const params = new URLSearchParams({
    type: 'release',
    format: 'Vinyl', // vinyl only, no CDs, cassettes, files …
    per_page: String(p.per_page ?? 40),
    page: String(p.page ?? 1),
  })
  if (p.q) params.set('q', String(p.q))
  if (p.barcode) params.set('barcode', String(p.barcode).replace(/\D/g, ''))
  // optional Discogs search filters
  for (const key of ['country', 'year', 'artist', 'release_title', 'label', 'sort', 'sort_order']) {
    if (p[key]) params.set(key, String(p[key]))
  }
  return params
}

async function prices(releaseId: number) {
  let valueError: string | null = null
  const [stats, suggestions] = await Promise.all([
    discogs(`/marketplace/stats/${releaseId}?curr_abbr=${CURRENCY}`).catch(() => null),
    // Needs seller settings (currency) filled out in the Discogs account.
    discogs(`/marketplace/price_suggestions/${releaseId}`).catch((e) => {
      valueError = (e as Error).message
      return null
    }),
  ])
  const suggestion = suggestions?.[VALUE_CONDITION]
  if (suggestions && !suggestion) valueError = 'Discogs hat für diese Pressung keine Preisempfehlung.'
  if (suggestion && suggestion.currency !== CURRENCY) {
    valueError = `Deine Discogs-Verkäuferwährung ist ${suggestion.currency}, bitte auf ${CURRENCY} stellen.`
  }
  return {
    num_for_sale: stats?.num_for_sale ?? null,
    lowest_price: stats?.lowest_price?.value ?? null,
    lowest_price_currency: stats?.lowest_price?.currency ?? CURRENCY,
    blocked_from_sale: stats?.blocked_from_sale ?? false,
    value: suggestion?.value ?? null,
    value_currency: suggestion?.currency ?? null,
    value_condition: VALUE_CONDITION,
    value_error: valueError,
    // all conditions, so the app can use the condition of each copy:
    // { 'Mint (M)': 31.5, 'Near Mint (NM or M-)': 27.1, … } (only values in CURRENCY)
    suggestions: Object.fromEntries(
      Object.entries(suggestions ?? {})
        .filter(([, s]: [string, any]) => s?.currency === CURRENCY && s?.value != null)
        .map(([k, s]: [string, any]) => [k, s.value]),
    ),
  }
}

// --- request handler -------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405)

  // Only logged-in app users may use the proxy.
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: auth } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
  if (!auth?.user) return json({ error: 'Nicht angemeldet' }, 401)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ungültiger Request' }, 400)
  }

  try {
    switch (body.action) {
      case 'search': {
        const data = await discogs(`/database/search?${searchParams(body)}`)
        return json(data)
      }

      case 'release': {
        const id = Number(body.id)
        const [release, p] = await Promise.all([
          discogs(`/releases/${id}?curr_abbr=${CURRENCY}`),
          prices(id),
        ])
        return json({ release, prices: p })
      }

      case 'prices': {
        return json(await prices(Number(body.id)))
      }

      case 'addToCollection': {
        const user = await username()
        const folder = await folderId()
        const data = await discogs(
          `/users/${encodeURIComponent(user)}/collection/folders/${folder}/releases/${Number(body.id)}`,
          { method: 'POST' },
        )
        return json({ instance_id: data?.instance_id ?? null, folder_id: folder })
      }

      case 'removeFromCollection': {
        const user = await username()
        const folder = await folderId()
        await discogs(
          `/users/${encodeURIComponent(user)}/collection/folders/${folder}/releases/${Number(body.id)}/instances/${Number(body.instance_id)}`,
          { method: 'DELETE' },
        )
        return json({ ok: true })
      }

      case 'wantlist': {
        // Newest first; 100 per page is the Discogs maximum.
        const user = await username()
        const params = new URLSearchParams({
          per_page: '100',
          page: String(Number(body.page) || 1),
          sort: 'added',
          sort_order: 'desc',
        })
        const data = await discogs(`/users/${encodeURIComponent(user)}/wants?${params}`)
        return json(data)
      }

      case 'addToWantlist': {
        const user = await username()
        // empty body so a Content-Length header is sent (some proxies refuse a PUT without it)
        const data = await discogs(`/users/${encodeURIComponent(user)}/wants/${Number(body.id)}`, {
          method: 'PUT',
          body: '',
        })
        return json(data ?? { ok: true })
      }

      case 'removeFromWantlist': {
        const user = await username()
        await discogs(`/users/${encodeURIComponent(user)}/wants/${Number(body.id)}`, { method: 'DELETE' })
        return json({ ok: true })
      }

      case 'image': {
        // Re-serve a Discogs cover with CORS headers so the app can read its
        // pixels (dominant colour for the shelf). Only Discogs hosts allowed.
        const url = new URL(String(body.url))
        if (url.protocol !== 'https:' || !/(^|\.)discogs\.com$/.test(url.hostname)) {
          return json({ error: 'Host nicht erlaubt' }, 400)
        }
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
        if (!res.ok) return json({ error: `Bild nicht ladbar (${res.status})` }, 502)
        return new Response(res.body, {
          headers: {
            ...cors,
            'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }

      default:
        return json({ error: `Unbekannte Aktion: ${body.action}` }, 400)
    }
  } catch (e) {
    const status = e instanceof DiscogsError ? e.status : 500
    return json({ error: (e as Error).message }, status)
  }
})
