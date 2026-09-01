# Apps Script Relay Evaluation

Google Apps Script web apps can receive HTTP POST requests through a `doPost(e)` function and can be configured to execute as the script owner. This makes a sender owned by `devshiftcode2025@gmail.com` technically feasible without OAuth Playground refresh-token handling in the Cloudflare Worker.

The relay would need a privately stored shared secret validated by the Apps Script code and the Cloudflare Worker. It must never expose the deployed web-app URL or the shared secret in frontend source.

Google documents a consumer Gmail quota of 100 email recipients per day for Apps Script email sending, with quotas per user that reset 24 hours after the first request. Limits may change without notice. A Google Workspace account has a higher documented quota, but the owner currently uses a consumer Gmail account.

## Official references

- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
