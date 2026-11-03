# Vinyl Collector

Eine Web-App (PWA) für unsere Schallplattensammlung, die man auf dem iPhone wie eine App installieren kann.
Alle Plattendaten, Cover und Preise kommen von [Discogs](https://www.discogs.com), die Sammlung liegt in einer
kostenlosen [Supabase](https://supabase.com)-Datenbank, gehostet wird über GitHub Pages.

## Funktionen

- **Home:** Titelbild, Profilbild, Name, Lieblings-Künstler:in / -Album / -Song und ein Regal mit dem
  Lieblingsalbum vorne und bis zu 14 Plattenrücken in der Farbe ihres Covers. Alles lässt sich durch Antippen ändern.
- **Sammlung:** Alle Platten mit Cover, Titel, Künstler:in, Jahr, Format, Vinyl-Farbe und Wert.
  Suche nach Album/Künstler:in, Sortierung nach Hinzugefügt, Jahr, Alphabet und Wert.
- **Suche:** Discogs-Suche, nur Vinyl. Barcode-Scan mit der Kamera. Detailseite mit Bildergalerie,
  Jahr, Format, Wert sowie aktueller Anzahl und günstigstem Preis der Angebote auf Discogs.
- **Hinzufügen:** Vinyl-Farbe (Auswahl oder eigene) und Muster, optional Foto, Kommentar und „signiert“.
  Die Platte wird zusätzlich im Discogs-Konto im Ordner „Vinyl Collector“ eingetragen.
- **Gemeinsames Konto:** Ein Login, auf beliebig vielen Geräten.

**Zum Wert:** Discogs bietet den Median-Verkaufspreis nicht über die API an. Als „Wert“ zeigt die App deshalb die
Discogs-Preisempfehlung für den Zustand *Very Good Plus (VG+)*.

## Einrichtung (einmalig, ca. 15 Minuten)

### 1. Discogs

1. Auf <https://www.discogs.com/settings/developers> auf **„Generate new token“** klicken und den Token kopieren.
2. Auf <https://www.discogs.com/settings/seller> die **Währung auf EUR** stellen und speichern.
   (Ohne ausgefüllte Verkäufer-Einstellungen liefert Discogs keine Preisempfehlungen. Verkaufen muss man nichts.)

### 2. Supabase

1. Auf <https://supabase.com> ein kostenloses Projekt anlegen (Region z. B. Frankfurt).
2. **SQL Editor → New query**: den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und **Run**.
3. **Edge Functions → Deploy a new function → Via Editor**: Name `discogs`, den Inhalt von
   [`supabase/functions/discogs/index.ts`](supabase/functions/discogs/index.ts) einfügen und deployen.
4. **Edge Functions → Secrets**: neues Secret `DISCOGS_TOKEN` mit dem Discogs-Token aus Schritt 1.1.
5. **Authentication → Users → Add user → Create new user**: E-Mail und Passwort für unser gemeinsames Konto,
   „Auto Confirm User“ anhaken.
6. **Authentication → Sign In / Providers**: **„Allow new users to sign up“ ausschalten**, damit sich niemand
   sonst registrieren kann.
7. **Project Settings → API** (bzw. *Data API* / *API Keys*): die **Project URL** und den **anon / publishable key**
   notieren. Beide sind öffentlich und dürfen im Browser stehen; geschützt wird alles durch den Login.

Hinweis: Kostenlose Supabase-Projekte pausieren nach 7 Tagen ohne Nutzung. Dann im Supabase-Dashboard auf
„Restore“ klicken, die Daten bleiben erhalten.

### 3. GitHub Pages

1. Im Repo unter **Settings → Secrets and variables → Actions → Variables** zwei Variablen anlegen:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon / publishable key
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Auf `main` pushen (oder unter **Actions → Deploy to GitHub Pages → Run workflow**).
   Die App läuft danach unter `https://<github-name>.github.io/Vinyl-Collector/`.

### Server-Funktion automatisch aktualisieren (empfohlen)

Damit Änderungen an `supabase/functions/` automatisch in Supabase landen:

1. Auf <https://supabase.com/dashboard/account/tokens> einen **Access Token** erzeugen.
2. Im Repo unter **Settings → Secrets and variables → Actions → Secrets** ein Repository-Secret
   `SUPABASE_ACCESS_TOKEN` mit diesem Token anlegen.
3. Unter **Actions → Deploy Supabase Edge Functions → Run workflow** einmal starten.

### 4. Aufs iPhone

Die Seite in **Safari** öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**. Danach einmal in der App anmelden.

## Entwicklung

```bash
cp .env.example .env.local   # Supabase-URL und Key eintragen
npm install
npm run dev
```

Aufbau:

- `src/pages/` – Home, Sammlung, Suche, Detailseiten, Login
- `src/components/` – Liste, Galerie, Barcode-Scanner, Formular, Bottom Sheet …
- `src/lib/discogs.js` – Aufrufe der Edge Function und Umwandlung der Discogs-Daten
- `src/lib/color.js` – Cover-Farbe für die Plattenrücken
- `supabase/schema.sql` – Tabellen, Zugriffsregeln, Foto-Speicher
- `supabase/functions/discogs/` – Proxy zur Discogs-API, hält den Token geheim
