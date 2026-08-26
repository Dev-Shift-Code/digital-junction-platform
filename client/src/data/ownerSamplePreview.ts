import { sampleProducts } from "@/data/samplePreview";

export const ownerInventoryPreview = sampleProducts.slice(0, 4).map((product, index) => ({
  id: product.id,
  title: product.title,
  category: product.category,
  price: product.price,
  state: index === 0 ? "Preview featured layout" : "Preview listing layout",
}));

export const ownerWorkspacePreview = {
  sales: [
    { label: "Checkout state", value: "Preview only", detail: "A real checkout or payment record will appear here when connected." },
    { label: "Fulfilment state", value: "Not connected", detail: "Delivery queues remain empty until a genuine access grant is created." },
    { label: "Insights state", value: "Awaiting records", detail: "Revenue and conversion figures are intentionally withheld until real sales exist." },
  ],
  vouchers: [
    { label: "Promotion layout", value: "Sample campaign", detail: "Design preview only — no voucher code has been issued." },
    { label: "Availability", value: "Not configured", detail: "Start and end dates stay blank until real promotion terms are approved." },
    { label: "Redemptions", value: "No live data", detail: "No fictional redemptions or discount results are shown." },
  ],
  settings: [
    { label: "Owner access", value: "Configured", detail: "A dedicated owner password and session are active." },
    { label: "Customer sessions", value: "Separate", detail: "Customer activity remains independent from owner administration." },
    { label: "Payment documents", value: "Not connected", detail: "Real invoice documents are required before downloads become available." },
  ],
  support: [
    { label: "Support queue layout", value: "Preview only", detail: "No support ticket has been created for this sample state." },
    { label: "Preferred route", value: "Contact Digital Junction", detail: "Use the public Contact page for actual owner support requests." },
    { label: "History", value: "No live records", detail: "The workspace does not invent support outcomes or timestamps." },
  ],
} as const;
