CREATE TABLE IF NOT EXISTS paymentDeliveryEmails (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  orderId INTEGER NOT NULL,
  paymentTransactionId INTEGER NOT NULL,
  recipientEmail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sending',
  resendEmailId TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  sentAt INTEGER,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_delivery_emails_order_unique ON paymentDeliveryEmails (orderId);
CREATE INDEX IF NOT EXISTS payment_delivery_emails_transaction_idx ON paymentDeliveryEmails (paymentTransactionId);
CREATE INDEX IF NOT EXISTS payment_delivery_emails_status_idx ON paymentDeliveryEmails (status);
