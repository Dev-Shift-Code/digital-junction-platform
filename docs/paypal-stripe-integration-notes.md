# PayPal and Stripe Integration Notes

Digital Junction will retain a server-side provider model: the Worker calculates the amount from the D1 product record, creates a provider checkout session or order, then waits for a provider-verified webhook before marking a transaction paid or releasing buyer delivery controls.

## PayPal — implemented in source, Sandbox setup still required

The Worker now creates a PayPal Orders v2 `CAPTURE` order in PHP from the product price stored in D1 multiplied by the buyer’s selected quantity. It sends the buyer to PayPal’s approval URL and accepts the returned order token only when it matches the D1 transaction associated with the checkout public token.

The browser return triggers a server-side capture request, but **does not** mark an order as paid. The Worker waits for a `PAYMENT.CAPTURE.COMPLETED` webhook at `https://digital-junction-platform.devshiftcode2025.workers.dev/api/paypal/webhook`. It sends the unmodified received event plus PayPal transmission headers to PayPal’s `verify-webhook-signature` endpoint. Only a `SUCCESS` verification updates the D1 transaction/order and enables the existing one-time Cloudinary delivery flow.

Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENVIRONMENT=sandbox` as Worker secrets/variables before testing. After the Worker is deployed, create a webhook for the exact endpoint above in the same PayPal **Sandbox** application, subscribe to `PAYMENT.CAPTURE.COMPLETED`, and set the returned webhook ID as `PAYPAL_WEBHOOK_ID`. Never put the secret or webhook ID in browser code or Git.

## Stripe — pending credentials and separate implementation

The intended integration is Stripe-hosted Checkout. The Worker creates a Checkout Session using a server-calculated PHP line-item amount, redirects the buyer to the returned provider URL, and releases digital delivery only after a raw-body, signature-verified Stripe webhook event. The endpoint is subscribed to `checkout.session.completed`; payment-status checks must be used as appropriate for delayed payment methods.

Expected configuration values are `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_ENVIRONMENT` (`test` or `live`). Stripe’s `Stripe-Signature` must be verified against the unmodified request body and endpoint secret. No Stripe Checkout route, database change, or buyer option is included until a Stripe Test secret key and webhook secret are configured.

## Sources

- PayPal Orders API: https://developer.paypal.com/api/rest/integration/orders-api
- PayPal Webhooks: https://developer.paypal.com/api/rest/webhooks
- Stripe Checkout fulfillment: https://docs.stripe.com/checkout/fulfillment
- Stripe webhooks: https://docs.stripe.com/webhooks
