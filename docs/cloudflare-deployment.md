# Cloudflare deployment — Digital Junction Development Co.

This repository deploys its existing Express application to **Cloudflare Workers**, serves the existing Vite build through Workers static assets, and uses the existing **Cloudflare D1** database `digital-junction-db` as the primary application database. The migration file creates the data structure only; it does not insert sample products, create customer or owner records, or modify orders and payments.

## One-time Cloudflare setup

Set the following Worker secrets. Never commit their values to Git.

| Secret | Use |
| --- | --- |
| `JWT_SECRET` | Signs customer and owner sessions. Use a long random value. |
| `OWNER_EMAIL` | Email address permitted to bootstrap the first owner account. |
| `OWNER_SETUP_TOKEN` | One-time private token for `/owner/setup`. |
| `OAUTH_SERVER_URL` | Required only for Manus OAuth customer flow. |
| `OWNER_OPEN_ID` | Optional legacy Manus OAuth owner identifier. |

Use this command once per secret:

```powershell
npx wrangler@latest secret put JWT_SECRET --config wrangler.jsonc
```

The browser-facing `VITE_APP_ID` is not a secret. Set it in the deployment shell before building when the Manus OAuth customer flow is required:

```powershell
$env:VITE_APP_ID = "your-public-manus-app-id"
```

## Apply the D1 schema

Review the migration first. It uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` only.

```powershell
Get-Content .\cloudflare\migrations\0001_initial_djdc_schema.sql
pnpm db:migrate:cloudflare
```

Verify the remote D1 tables:

```powershell
npx wrangler@latest d1 execute digital-junction-db --remote --config wrangler.jsonc --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## Deploy the existing website

Run the repository checks and deploy the existing application:

```powershell
pnpm check
pnpm test -- --run
pnpm deploy:cloudflare
```

Wrangler returns a `workers.dev` URL after a successful deployment. To use a custom domain, add the domain to Cloudflare and configure a Worker Custom Domain in the Cloudflare dashboard or in `wrangler.jsonc`; do not add a route until the domain ownership and DNS configuration are confirmed.

## Deploy the requested Pages URL

The repository's `deploy:pages` command creates or updates the Pages project named `digital-junction-platform`. If that Pages name is available in the Cloudflare account, its public URL is:

```text
https://digital-junction-platform.pages.dev
```

The Pages build contains a same-origin `/api/*` proxy. Before deploying Pages, add the deployed Worker URL as the `WORKER_ORIGIN` Pages secret:

```powershell
npx wrangler@latest pages secret put WORKER_ORIGIN --project-name digital-junction-platform
```

Enter `https://digital-junction-platform.devshiftcode2025.workers.dev` when prompted, then deploy Pages:

```powershell
pnpm deploy:pages
```

The Pages domain then serves the public frontend while its authentication, owner, catalogue, checkout, and D1 operations are forwarded to the existing Worker. Do not use the Pages deployment before setting `WORKER_ORIGIN`, because owner and data-backed workflows would return a configuration error.

## First owner account

After the D1 schema is applied and deployment succeeds, open:

```text
https://<your-worker>.workers.dev/owner/setup
```

Enter the exact `OWNER_EMAIL`, the private `OWNER_SETUP_TOKEN`, and a new password. The code permits this only when no admin user exists. Later attempts require normal Owner sign-in and cannot create a second owner through this route.

## Notes

This is a **D1-only deployment**. D1 stores persistent structured records for the public site, owner workspace, catalogue, projects, enquiries, payment methods, orders, and authentication. It does not store binary file bytes. Therefore the deployed application rejects new product-file, payment-proof, logo, QR-code, and cover-image uploads, and returns `410 Gone` for legacy `/manus-storage/*` paths. Use written instructions and approved external HTTPS media URLs where applicable.

## References

- [Cloudflare: Deploy an Express.js application on Workers](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/)
- [Cloudflare: D1 Getting Started](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare: Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare: Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
