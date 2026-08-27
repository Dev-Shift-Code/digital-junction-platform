# Brevo API Buyer Delivery Notes

The buyer delivery sender uses the Brevo transactional-email API with a permanent Worker API key. The sender is the owner-controlled email address `devshiftcode2025@gmail.com`, which must be registered and confirmed by the owner in Brevo using the verification code delivered to that inbox. The website does not use OAuth Playground, Google OAuth client credentials, Gmail API access tokens, or refresh tokens.

The Worker sends transactional HTML and text content to `POST https://api.brevo.com/v3/smtp/email` using the backend-only `BREVO_API_KEY`. Each request supplies the registered `BREVO_SENDER_EMAIL`, the D1 checkout email recipient, optional `BREVO_REPLY_TO`, a D1-linked audit marker, and a message type tag. Brevo returns a message ID that is retained in the existing D1 audit record.

Paid-order delivery continues to create individual one-time `/api/delivery/:token` links only after verified provider payment or Owner-approved manual payment. The rejection-notice flow is separate: it is triggered only by an explicit Owner rejection of a manual payment, contains no download link, and records its own D1 email audit state. Neither email flow attaches product files or exposes a direct Cloudinary URL.

## Required Worker secrets

- `BREVO_API_KEY`: API key generated in the Brevo account.
- `BREVO_SENDER_EMAIL`: confirmed sender email, currently `devshiftcode2025@gmail.com`.
- `BREVO_REPLY_TO`: optional reply destination, normally `devshiftcode2025@gmail.com`.

## Official references

- [Send a transactional email — Brevo API](https://developers.brevo.com/docs/send-a-transactional-email)
- [Validate a sender using OTP — Brevo API](https://developers.brevo.com/reference/validate-sender-by-otp)
- [Troubleshooting sender verification — Brevo Help Center](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP)
