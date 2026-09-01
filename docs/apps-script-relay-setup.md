# Google Apps Script Buyer Email Relay

The buyer email sender is a private Google Apps Script web app owned by `devshiftcode2025@gmail.com`. This avoids Gmail OAuth refresh tokens and an external email provider account. It sends the existing branded HTML/text delivery and manual-payment rejection notices using `MailApp`.

The Cloudflare Worker submits a timestamped serialized email payload and the same high-entropy private shared secret held in Apps Script Script Properties. The relay rejects unauthenticated or stale requests, uses a script-level lock to prevent concurrent duplicates, and retains short-lived sent-message records keyed by the D1 email audit request identifier. The secret travels only in the HTTPS Worker-to-Google request and must never appear in frontend source. The relay sends no attachment; delivery messages retain individual one-time D1 entitlement links only and rejection messages include no download link.

## Apps Script web-app configuration

The owner must deploy `apps-script/DJDCEmailRelay.gs` in a new script project while signed in as `devshiftcode2025@gmail.com`. The web app must run as the owner and be accessible by anyone, because the Cloudflare Worker has no interactive Google session. The relay's signed request validation is mandatory before choosing that access setting.

Set the Script Property `DJDC_RELAY_SECRET` to a long random value, then save the `/exec` deployment URL. Do not use the `/dev` URL, which is only for editor testing.

## Required Worker secrets

- `APPS_SCRIPT_RELAY_URL`: Apps Script deployed web-app `/exec` URL.
- `APPS_SCRIPT_RELAY_SECRET`: exact same secret stored as `DJDC_RELAY_SECRET` in Apps Script Script Properties.
- `APPS_SCRIPT_REPLY_TO`: optional reply mailbox, normally `devshiftcode2025@gmail.com`.

## Operating limit

Consumer Gmail accounts have a Google-documented Apps Script quota of 100 email recipients per day. The relay checks remaining daily quota before attempting a send. If the limit is reached, the related D1 email audit becomes failed and can be retried later from Owner Sales.

## Official references

- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)
- [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
