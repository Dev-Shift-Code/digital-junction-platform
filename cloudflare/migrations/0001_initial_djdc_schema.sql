-- Digital Junction Development Co. primary Cloudflare D1 schema.
-- This migration only creates missing tables and indexes. It does not insert,
-- replace, or delete any customer, owner, product, payment, or order record.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT NOT NULL,
  name TEXT,
  email TEXT,
  passwordHash TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  lastSignedIn INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_open_id_unique ON users(openId);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL, serviceCategory TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'discovery' CHECK (status IN ('discovery', 'in_progress', 'review', 'complete', 'on_hold')),
  progress INTEGER NOT NULL DEFAULT 0, startDate INTEGER, targetDate INTEGER,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON projects(slug);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

CREATE TABLE IF NOT EXISTS projectClients (id INTEGER PRIMARY KEY AUTOINCREMENT, projectId INTEGER NOT NULL, userId INTEGER NOT NULL, createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE UNIQUE INDEX IF NOT EXISTS project_client_unique ON projectClients(projectId, userId);
CREATE INDEX IF NOT EXISTS project_clients_user_idx ON projectClients(userId);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT, projectId INTEGER NOT NULL, title TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  dueDate INTEGER, completedAt INTEGER, sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS milestones_project_idx ON milestones(projectId);

CREATE TABLE IF NOT EXISTS deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT, projectId INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, fileName TEXT NOT NULL, fileUrl TEXT NOT NULL, fileKey TEXT,
  isClientVisible INTEGER NOT NULL DEFAULT 1 CHECK (isClientVisible IN (0, 1)), createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS deliverables_project_idx ON deliverables(projectId);

CREATE TABLE IF NOT EXISTS portalContents (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'announcement' CHECK (placement IN ('welcome', 'announcement', 'resource')),
  isPublished INTEGER NOT NULL DEFAULT 0 CHECK (isPublished IN (0, 1)), sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS portal_content_placement_idx ON portalContents(placement, isPublished);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, serviceInterest TEXT, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')), createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries(status);

CREATE TABLE IF NOT EXISTS caseStudies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL, category TEXT NOT NULL, clientName TEXT, summary TEXT NOT NULL, problem TEXT, solution TEXT, results TEXT, technologies TEXT, coverImageUrl TEXT,
  isPublished INTEGER NOT NULL DEFAULT 0 CHECK (isPublished IN (0, 1)), sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS case_studies_slug_unique ON caseStudies(slug);
CREATE INDEX IF NOT EXISTS case_studies_public_idx ON caseStudies(isPublished, category);

CREATE TABLE IF NOT EXISTS digitalProducts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL, category TEXT NOT NULL, summary TEXT NOT NULL, description TEXT, deliveryNotes TEXT, price NUMERIC NOT NULL, coverImageUrl TEXT,
  isPublished INTEGER NOT NULL DEFAULT 0 CHECK (isPublished IN (0, 1)), isFeatured INTEGER NOT NULL DEFAULT 0 CHECK (isFeatured IN (0, 1)), isArchived INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0, 1)), sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS digital_products_slug_unique ON digitalProducts(slug);
CREATE INDEX IF NOT EXISTS digital_products_public_idx ON digitalProducts(isPublished, isArchived, isFeatured, category);

CREATE TABLE IF NOT EXISTS productAccess (
  id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, userId INTEGER NOT NULL, deliveryUrl TEXT NOT NULL, deliveryFileName TEXT NOT NULL, grantedByUserId INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS product_access_user_product_unique ON productAccess(productId, userId);
CREATE INDEX IF NOT EXISTS product_access_user_idx ON productAccess(userId);
CREATE INDEX IF NOT EXISTS product_access_product_idx ON productAccess(productId);

CREATE TABLE IF NOT EXISTS productInquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')), createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS product_inquiries_product_idx ON productInquiries(productId);
CREATE INDEX IF NOT EXISTS product_inquiries_status_idx ON productInquiries(status);

CREATE TABLE IF NOT EXISTS paymentMethods (
  id INTEGER PRIMARY KEY AUTOINCREMENT, methodType TEXT NOT NULL, displayName TEXT NOT NULL, logoUrl TEXT, logoKey TEXT, qrCodeUrl TEXT, qrCodeKey TEXT, instructions TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)), sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS payment_methods_active_idx ON paymentMethods(isActive, sortOrder);

CREATE TABLE IF NOT EXISTS guestCheckoutRequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, message TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'contacted', 'fulfilled', 'cancelled')),
  paymentMethodId INTEGER, paymentMethodName TEXT, paymentMethodType TEXT, paymentInstructionsSnapshot TEXT, paymentLogoUrlSnapshot TEXT, paymentQrCodeUrlSnapshot TEXT, paymentReference TEXT,
  paymentProofUrl TEXT, paymentProofKey TEXT, paymentProofFileName TEXT, paymentProofMimeType TEXT, paymentProofSizeBytes INTEGER,
  paymentStatus TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (paymentStatus IN ('awaiting_payment', 'submitted', 'verified', 'rejected')),
  paymentReviewedAt INTEGER, paymentReviewNote TEXT, createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS guest_checkout_product_idx ON guestCheckoutRequests(productId);
CREATE INDEX IF NOT EXISTS guest_checkout_status_idx ON guestCheckoutRequests(status);
CREATE INDEX IF NOT EXISTS guest_checkout_payment_status_idx ON guestCheckoutRequests(paymentStatus);

CREATE TABLE IF NOT EXISTS productFiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, fileName TEXT NOT NULL, fileUrl TEXT NOT NULL, fileKey TEXT, mimeType TEXT, sizeBytes INTEGER, sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS product_files_product_idx ON productFiles(productId);

CREATE TABLE IF NOT EXISTS publicSiteContent (
  id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, section TEXT NOT NULL, eyebrow TEXT, title TEXT, body TEXT, imageUrl TEXT, ctaLabel TEXT, ctaHref TEXT,
  isPublished INTEGER NOT NULL DEFAULT 1 CHECK (isPublished IN (0, 1)), updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS public_site_content_page_section_unique ON publicSiteContent(page, section);
CREATE INDEX IF NOT EXISTS public_site_content_page_idx ON publicSiteContent(page, isPublished);
