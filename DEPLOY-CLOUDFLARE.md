# Cloudflare Workers Deploy

This repo is configured to deploy to Cloudflare Workers with OpenNext.

## 1. Log in to Cloudflare

```powershell
cmd /c npx wrangler login
```

## 2. Create a local Wrangler env file for preview

Copy [`.dev.vars.example`](/c:/Users/niraj/Documents/Github_Repo/GatheringsStats/.dev.vars.example) to `.dev.vars` and fill in real values.

## 3. Set production secrets

```powershell
cmd /c npx wrangler secret put GATHERINGS_API_KEY
cmd /c npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
cmd /c npx wrangler secret put CRON_SECRET
cmd /c npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
cmd /c npx wrangler secret put GATHERINGS_API_BASE_URL
cmd /c npx wrangler secret put GATHERINGS_LIVE_ENDPOINT
```

If you prefer, you can set the non-sensitive values in the Cloudflare dashboard instead of storing them as secrets.

## 4. Preview locally in Worker mode

```powershell
cmd /c npm run cf:preview
```

## 5. Deploy

```powershell
cmd /c npm run cf:deploy
```

## 6. Attach your domain

In the Cloudflare dashboard:

1. Go to `Workers & Pages`
2. Open the `gatherings-stats` Worker
3. Add a custom domain

## Notes

- The Worker name is defined in [`wrangler.jsonc`](/c:/Users/niraj/Documents/Github_Repo/GatheringsStats/wrangler.jsonc).
- The generated Worker bundle is written to `.open-next/` during `cf:build`.
- The app's custom in-memory caches are best-effort on Workers. If you need strict persistent caching across isolates, move them to KV, R2, or another durable store.
