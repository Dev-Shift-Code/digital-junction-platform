CREATE TABLE IF NOT EXISTS paymentProviderSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK (provider IN ('payrex', 'paypal')),
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_provider_settings_provider_unique ON paymentProviderSettings(provider);
INSERT OR IGNORE INTO paymentProviderSettings (provider, isActive) VALUES ('payrex', 1), ('paypal', 1);

CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'general' CHECK (scope IN ('general', 'selected_products')),
  discountKind TEXT NOT NULL CHECK (discountKind IN ('percent', 'fixed')),
  discountValue INTEGER NOT NULL,
  maxRedemptions INTEGER,
  redemptionCount INTEGER NOT NULL DEFAULT 0,
  startsAt INTEGER,
  endsAt INTEGER,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_code_unique ON vouchers(code);
CREATE INDEX IF NOT EXISTS vouchers_active_idx ON vouchers(isActive, startsAt, endsAt);

CREATE TABLE IF NOT EXISTS voucherProducts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucherId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS voucher_product_scope_unique ON voucherProducts(voucherId, productId);
CREATE INDEX IF NOT EXISTS voucher_products_voucher_idx ON voucherProducts(voucherId);
CREATE INDEX IF NOT EXISTS voucher_products_product_idx ON voucherProducts(productId);

ALTER TABLE guestCheckoutRequests ADD COLUMN voucherId INTEGER;
ALTER TABLE guestCheckoutRequests ADD COLUMN voucherCodeSnapshot TEXT;
ALTER TABLE guestCheckoutRequests ADD COLUMN subtotalCents INTEGER;
ALTER TABLE guestCheckoutRequests ADD COLUMN discountCents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guestCheckoutRequests ADD COLUMN totalCents INTEGER;
