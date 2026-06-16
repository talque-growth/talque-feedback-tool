# talque · Post-Event-Feedback

Internes Next.js-Tool zur Erfassung von Post-Event-Feedback.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # Werte eintragen
pnpm dev
```

## Environment-Variablen

| Variable                     | Zweck                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `HUBSPOT_ACCESS_TOKEN`       | HubSpot Private-App-Token                                    |
| `HUBSPOT_PORTAL_ID`          | HubSpot Portal-ID                                            |
| `HUBSPOT_CLOSED_WON_STAGE_ID`| Stage-ID für „Closed Won"                                    |
| `APP_PASSWORD`               | Gemeinsames Firmen-Passwort für den Zugangsschutz            |
| `AUTH_SECRET`                | Secret zum Signieren des Session-Cookies                     |

`AUTH_SECRET` erzeugen mit:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Zugangsschutz (Login)

Die App ist durch ein einfaches, gemeinsames Firmen-Passwort geschützt — ohne
Datenbank und ohne externen Auth-Dienst.

- Eine `middleware.ts` schützt alle Seiten und API-Routes. Ohne gültiges,
  signiertes Cookie wird auf `/login` umgeleitet (API-Routes antworten mit
  401). Öffentlich bleiben nur `/login`, `/api/login`, `/api/logout` und
  Next-interne Assets.
- **Fail-closed:** Fehlt `AUTH_SECRET`, wird grundsätzlich alles geblockt.
- Anmeldung über `/login`, Abmelden über den „Abmelden"-Button in der Topbar.

### Deployment auf Vercel

Unter **Settings → Environment Variables** (Scope **Production**) eintragen:

- `APP_PASSWORD` — das gemeinsame Firmen-Passwort
- `AUTH_SECRET` — das generierte Cookie-Secret

Danach **einmal neu deployen**, damit die Variablen aktiv werden.
