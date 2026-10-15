# Turfen

Telefoon-app (PWA) om tijdens het werk snel meterwissels te turven, met overzicht per LM Flex factuurweek (vrijdag t/m donderdag).

## Starten

```bash
npm install
npm run dev
```

Zonder Supabase-gegevens draait de app in **lokale modus**: alles blijft op het toestel.

## Supabase koppelen

1. Draait in het Supabase-project **Boekhouding** (tabellen met prefix `turf_`). Voor een nieuw project: draai `supabase/migrations/20261015000000_init.sql` (SQL editor of MCP/CLI).
2. Kopieer `.env.example` naar `.env.local` en vul de URL en publishable key in.
3. Zet bij Authentication → Providers e-mail aan. Wil je zonder bevestigingsmail kunnen inloggen, zet "Confirm email" uit.

Elke gebruiker ziet via RLS alleen zijn eigen regels. Tarieven staan in `turf_activity_types` en (voor offline gebruik) in `src/lib/rates.ts`; houd die twee gelijk.

## Op de telefoon

Deploy (bv. Vercel: `npm run build`, output `dist`), open de URL en kies *Zet op beginscherm* (iPhone/Safari) of *App installeren* (Android/Chrome). De app werkt daarna ook zonder bereik en synchroniseert zodra er weer internet is.
