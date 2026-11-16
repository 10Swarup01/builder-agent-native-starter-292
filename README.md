# My App

An app built with [Builder.io](https://www.builder.io) on the
[Agent-Native](https://agent-native.com?utm_source=github&utm_medium=referral&utm_content=fusion-starter-readme) framework. Replace this paragraph with
what the app does and who it's for.

## Develop locally

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

`.env.example` sets `AUTH_DISABLED=true` as a commented-out option; uncomment it
to skip sign-in while developing.

Photo analysis in the Report Waste wizard calls Google Gemini from the server.
Set `GEMINI_API_KEY` in the server environment (for production, in Render). It is
never sent to the browser. `GEMINI_MODEL` is optional and defaults to
`gemini-3.8-flash`. Without a key, reports still submit with a manually chosen
category.

Analysis attempts are saved with `SUPABASE_SERVICE_ROLE_KEY`, which must also be a
server-only variable (for production, in Render). Browser users cannot write analysis
records. Without this key, photo analysis returns an error and reports still submit.

Apply these migrations to the Supabase project before deploying this feature:
`supabase/migrations/20261115120000_attach_report_photo_analysis.sql` and
`supabase/migrations/20261116090000_restrict_photo_analysis_writes.sql`.

## Project layout

- `app/`: routes and UI components
- `actions/`: operations shared by the UI and the app's agent
- `server/`: server plugins and the database client
- `drizzle/`: schema and migrations; start with `drizzle/START_HERE.md`

Framework docs: [agent-native.com/docs](https://agent-native.com/docs?utm_source=github&utm_medium=referral&utm_content=fusion-starter-readme).
