# Sample Preview Fallback Audit

This audit records the safe design-review fallback used when a supported Digital Junction data source has no live records. **Live database content always takes precedence.** Sample records are held only in the frontend, visibly labelled as sample or preview data, and are never persisted as real customers, orders, invoices, files, reviews, or business outcomes.

| Area | Screen or route | Empty-data fallback | Guardrail |
|---|---|---|---|
| Public catalogue | `/shop` | Ten sample Digital Junction product concepts | Labelled **Sample preview**; no third-party listings or customer claims. |
| Public product detail | `/shop/:handle` for sample slugs | Full sample product detail with contents and a contact path | The product request form is disabled for a sample product; no negative-ID request is sent. |
| Public work | `/work` | Ten sample project concepts | Labelled **Concept preview**; no client identity, outcome, review, testimonial, or metric is claimed. |
| Public home | `/` featured products and work | Featured sample cards when published records are empty | Cards retain sample labels and link only to available preview detail flows. |
| Customer overview | `/client` and `/client/projects` | Sample service engagements, milestones, deliverables, and account resources | Sample work is marked read-only and cannot be treated as assigned client work. |
| Customer orders | `/client/purchases` | Sample Digital Junction product-order library with search, filter, selected-order panel, version, licence, and support layout | Buttons that would download or retrieve customer data are disabled; no purchase or delivery is claimed. |
| Customer billing | `/client/billing` | Searchable sample invoice-layout records for services and product orders | Prominently states that entries are not invoices, payment records, payment methods, or transaction confirmation. |
| Customer account | `/client/account` | Sample notification and billing-preference layouts beside real account identity | No financial details or real preferences are stored in a sample state. |
| Customer support | `/client/support` | Sample service and product-order support-history cards | Clearly states no support ticket, message, or record was submitted. |
| Customer resources | `/client/resources` | Sample service guidance, product-access, and feedback resources | Labelled as unpublished account-notice previews. |
| Owner overview | `/owner` | Read-only sample service-project operation cards | No owner mutation controls are wired to sample rows. |
| Owner products | `/owner/products` | Read-only sample product-listing cards | Samples cannot be edited, published, featured, archived, or saved. |
| Owner shop preview | `/owner/shop-preview` | Same sample product grid as the public catalogue | Explicitly not live owner listings; review-only. |
| Owner content manager | `/owner/manage` | Read-only sample service milestones, deliverables, and portal-content cards | Samples do not enter real project selectors and cannot be saved or published. |

## Validation Standard

The fallback set is designed solely for interface review. It intentionally excludes fabricated customer reviews, ratings, testimonials, client brands, sales outcomes, payment confirmations, payment-card details, delivery confirmations, and business-performance metrics. The corresponding real flows remain available only after the owner creates or publishes real records through the protected owner workspace.
