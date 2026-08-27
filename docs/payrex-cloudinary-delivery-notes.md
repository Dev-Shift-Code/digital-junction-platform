# PayRex and Cloudinary Delivery Notes

Digital Junction uses a PayRex-hosted GCash Checkout Session created on the Worker from the server-calculated D1 product price and quantity. PayRex documents that Checkout Sessions are one-time use, return a hosted `url`, use amounts in centavos, and support success and cancel URLs. The configured payment method is `gcash` only.

PayRex webhook delivery is accepted only at the Worker endpoint after raw-body `PayRex-Signature` HMAC verification. The implementation uses only the `payment_intent.succeeded` event to mark a transaction paid. Webhook event IDs are stored in D1 to make duplicate delivery idempotent.

Buyer delivery files are stored as Cloudinary private raw assets, not public CDN assets. Cloudinary documents that private assets require a signed delivery URL and supports `private_download_url` parameters for a short-lived attachment download. Digital Junction additionally uses a D1-backed single-use entitlement token: the Worker consumes the token before issuing a short-lived Cloudinary private download URL. This creates a single controlled download attempt and leaves an audit trail for expiry, use, and owner revocation.

## Sources

- PayRex Checkout Session API: https://docs.payrex.com/docs/api/checkout_sessions
- PayRex Checkout integration guide: https://docs.payrex.com/docs/guide/developer_handbook/payments/integrations/checkout
- PayRex webhook guide: https://docs.payrex.com/docs/guide/developer_handbook/webhooks
- Cloudinary media access and private downloads: https://cloudinary.com/documentation/control_access_to_media
