ALTER TABLE guestCheckoutRequests ADD COLUMN commerceStatus TEXT NOT NULL DEFAULT 'pending_payment';
ALTER TABLE guestCheckoutRequests ADD COLUMN paidAt INTEGER;
ALTER TABLE guestCheckoutRequests ADD COLUMN paymentPublicToken TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS guest_checkout_payment_public_token_unique ON guestCheckoutRequests(paymentPublicToken);

CREATE TABLE IF NOT EXISTS paymentTransactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  publicToken TEXT NOT NULL,
  provider TEXT NOT NULL,
  paymentMethod TEXT NOT NULL DEFAULT 'gcash',
  amountCents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'expired', 'cancelled')),
  providerCheckoutSessionId TEXT NOT NULL,
  providerPaymentIntentId TEXT,
  providerPaymentId TEXT,
  checkoutUrl TEXT NOT NULL,
  expiresAt INTEGER,
  paidAt INTEGER,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_public_token_unique ON paymentTransactions(publicToken);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_checkout_session_unique ON paymentTransactions(providerCheckoutSessionId);
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON paymentTransactions(orderId);
CREATE INDEX IF NOT EXISTS payment_transactions_payment_intent_idx ON paymentTransactions(providerPaymentIntentId);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON paymentTransactions(status);

CREATE TABLE IF NOT EXISTS paymentWebhookEvents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  providerEventId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  providerPaymentIntentId TEXT,
  receivedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  processedAt INTEGER,
  payloadHash TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_unique ON paymentWebhookEvents(provider, providerEventId);
CREATE INDEX IF NOT EXISTS payment_webhook_events_intent_idx ON paymentWebhookEvents(providerPaymentIntentId);
