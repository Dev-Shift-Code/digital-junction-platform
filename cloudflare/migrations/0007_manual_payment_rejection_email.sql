CREATE TABLE IF NOT EXISTS paymentRejectionEmails (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  orderId INTEGER NOT NULL,
  recipientEmail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sending',
  providerMessageId TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  sentAt INTEGER,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_rejection_emails_order_unique ON paymentRejectionEmails (orderId);
CREATE INDEX IF NOT EXISTS payment_rejection_emails_status_idx ON paymentRejectionEmails (status);
