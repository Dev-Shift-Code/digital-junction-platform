CREATE TABLE IF NOT EXISTS paymentDeliveryEntitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  paymentTransactionId INTEGER NOT NULL,
  productFileId INTEGER NOT NULL,
  fileName TEXT NOT NULL,
  fileKey TEXT NOT NULL,
  fileMimeType TEXT,
  tokenHash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked', 'expired')),
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER,
  revokedAt INTEGER,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_delivery_entitlement_token_unique ON paymentDeliveryEntitlements(tokenHash);
CREATE INDEX IF NOT EXISTS payment_delivery_entitlement_order_idx ON paymentDeliveryEntitlements(orderId);
CREATE INDEX IF NOT EXISTS payment_delivery_entitlement_transaction_idx ON paymentDeliveryEntitlements(paymentTransactionId);
CREATE INDEX IF NOT EXISTS payment_delivery_entitlement_status_idx ON paymentDeliveryEntitlements(status, expiresAt);
