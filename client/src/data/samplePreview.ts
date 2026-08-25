export type SampleProduct = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  price: string;
  coverImageUrl: null;
  isFeatured: boolean;
  isSample: true;
  createdAt: Date;
  features: string[];
  format: string;
  version: string;
};

const productFeatures = ["Editable source files", "Clear setup guide", "Digital delivery format"];

export const sampleProducts: SampleProduct[] = [
  { id: -1, slug: "sample-creator-portfolio-launch-kit", title: "Creator Portfolio Launch Kit", category: "Website Template", summary: "A polished personal portfolio starter for freelancers and creatives.", description: "Sample preview product used to show the complete Digital Junction detail-page layout, included content, and request flow.", price: "899", coverImageUrl: null, isFeatured: true, isSample: true, createdAt: new Date("2026-01-10"), features: productFeatures, format: "Figma + HTML concept", version: "Sample v1.0" },
  { id: -2, slug: "sample-dashboard-wireframe-library", title: "Dashboard Wireframe Library", category: "UI Kit", summary: "Core dashboard patterns for mapping reporting and admin experiences.", description: "Sample preview product with practical dashboard screens, layout patterns, and component directions.", price: "1249", coverImageUrl: null, isFeatured: true, isSample: true, createdAt: new Date("2026-01-12"), features: ["48 sample screens", "Navigation patterns", "Component annotations"], format: "Figma concept", version: "Sample v1.2" },
  { id: -3, slug: "sample-service-business-landing-page", title: "Service Business Landing Page", category: "Landing Page", summary: "Conversion-focused page sections for a modern service company.", description: "Sample preview product that demonstrates long-form service storytelling, a package section, and contact conversion.", price: "799", coverImageUrl: null, isFeatured: true, isSample: true, createdAt: new Date("2026-01-15"), features: ["Hero through footer", "Responsive content plan", "CTA system"], format: "HTML + content concept", version: "Sample v1.0" },
  { id: -4, slug: "sample-cafe-pos-interface-kit", title: "Café POS Interface Kit", category: "POS UI Kit", summary: "Point-of-sale screens and component patterns for food service workflows.", description: "Sample preview product for ordering, payment, inventory, and daily close-out interfaces.", price: "1499", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-01-19"), features: ["Ordering flows", "Inventory states", "Daily reports"], format: "Figma concept", version: "Sample v0.9" },
  { id: -5, slug: "sample-client-project-tracker", title: "Client Project Tracker", category: "Productivity Template", summary: "A simple system for project status, milestones, and client handoffs.", description: "Sample preview product for a thoughtful client project workspace with transparent handoffs.", price: "599", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-01-23"), features: ["Milestone board", "Handoff tracker", "Status summaries"], format: "Notion concept", version: "Sample v1.0" },
  { id: -6, slug: "sample-invoice-proposal-pack", title: "Invoice + Proposal Pack", category: "Business Resource", summary: "Editable documents for sending clear, professional project proposals.", description: "Sample preview product for proposal structures, scope summaries, and invoice-ready formatting.", price: "449", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-02-01"), features: ["Proposal outline", "Invoice layout", "Scope checklist"], format: "Document concept", version: "Sample v1.0" },
  { id: -7, slug: "sample-social-content-planner", title: "Social Content Planner", category: "Canva Template", summary: "A monthly planning set for publishing thoughtful social content.", description: "Sample preview product for campaign planning, publishing rhythm, and asset tracking.", price: "349", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-02-05"), features: ["Monthly calendar", "Idea bank", "Asset checklist"], format: "Canva concept", version: "Sample v1.0" },
  { id: -8, slug: "sample-resume-profile-kit", title: "Resume Profile Kit", category: "Career Template", summary: "A flexible resume and personal profile template set.", description: "Sample preview product for professional introductions, CV organisation, and portfolio presentation.", price: "299", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-02-08"), features: ["Resume pages", "Profile layout", "Portfolio checklist"], format: "Document concept", version: "Sample v1.0" },
  { id: -9, slug: "sample-mobile-wellness-screens", title: "Mobile Wellness App Screens", category: "Mobile UI", summary: "A focused mobile screen set for a habit and wellness concept.", description: "Sample preview product for mobile navigation, daily check-ins, and data-visualisation states.", price: "1099", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-02-12"), features: ["Onboarding flow", "Daily dashboard", "Progress screens"], format: "Figma concept", version: "Sample v1.1" },
  { id: -10, slug: "sample-notion-freelancer-os", title: "Notion Freelancer OS", category: "Notion Template", summary: "A workspace concept for leads, tasks, clients, and resource planning.", description: "Sample preview product for lead tracking, task planning, and a focused independent-work system.", price: "699", coverImageUrl: null, isFeatured: false, isSample: true, createdAt: new Date("2026-02-16"), features: ["Lead board", "Task planning", "Resource library"], format: "Notion concept", version: "Sample v1.0" },
];

export const sampleProjects = [
  { id: -101, title: "Service Business Website Concept", category: "Website Concept", summary: "Sample concept preview showing a service business homepage, packages, and contact conversion flow.", technologies: "React · Responsive UI · Content strategy", coverImageUrl: null, clientName: null, isSample: true },
  { id: -102, title: "Studio Ledger Dashboard Concept", category: "Web Application", summary: "Sample concept preview for a finance and operations dashboard layout.", technologies: "Dashboard UI · Data views · Role-based design", coverImageUrl: null, clientName: null, isSample: true },
  { id: -103, title: "Café Operations POS Concept", category: "POS System", summary: "Sample concept preview for ordering, inventory, and daily sales workflows.", technologies: "POS UI · Inventory · Reporting", coverImageUrl: null, clientName: null, isSample: true },
  { id: -104, title: "Wellness Companion App Concept", category: "Mobile Application", summary: "Sample concept preview for a mobile-first wellness and habit-tracking experience.", technologies: "Mobile UI · User flows · Component system", coverImageUrl: null, clientName: null, isSample: true },
  { id: -105, title: "Property Discovery Interface Concept", category: "UI/UX", summary: "Sample concept preview for search, listing comparison, and property discovery screens.", technologies: "UX research · Search UI · Prototyping", coverImageUrl: null, clientName: null, isSample: true },
  { id: -106, title: "Community Inventory Dashboard Concept", category: "Business System", summary: "Sample concept preview for multi-location stock visibility and operational alerts.", technologies: "Admin UI · Inventory logic · Notifications", coverImageUrl: null, clientName: null, isSample: true },
  { id: -107, title: "Event RSVP Mobile Flow Concept", category: "Mobile Application", summary: "Sample concept preview for invitations, attendance tracking, and event updates.", technologies: "Mobile UX · RSVP flow · Event UI", coverImageUrl: null, clientName: null, isSample: true },
  { id: -108, title: "Learning Portal Concept", category: "Web Application", summary: "Sample concept preview for course browsing, lesson progress, and resource access.", technologies: "Client UI · Progress tracking · Content design", coverImageUrl: null, clientName: null, isSample: true },
  { id: -109, title: "Membership Admin Concept", category: "Business System", summary: "Sample concept preview for member profiles, subscriptions, and operational review.", technologies: "Admin UX · Account flows · Data tables", coverImageUrl: null, clientName: null, isSample: true },
  { id: -110, title: "Creator Portfolio Concept", category: "Website Concept", summary: "Sample concept preview for a creator portfolio, selected work, and inquiry journey.", technologies: "Editorial layout · Case studies · Contact flow", coverImageUrl: null, clientName: null, isSample: true },
];

export const sampleClientProjects = [
  { id: "sample-project-1", title: "Sample Brand Website Refresh", category: "Website Concept", description: "Sample preview project used to demonstrate project status, milestones, and delivery cards.", status: "in progress", progress: 72, targetDate: "May 24, 2026", milestones: [{ title: "Content direction", status: "completed", due: "Apr 18, 2026" }, { title: "Responsive interface", status: "in progress", due: "May 10, 2026" }, { title: "Launch checklist", status: "upcoming", due: "May 24, 2026" }], deliverables: [{ title: "Sample content map", detail: "Preview PDF placeholder" }, { title: "Sample interface direction", detail: "Preview design placeholder" }] },
  { id: "sample-project-2", title: "Sample Client Workspace", category: "Web Application", description: "Sample preview project that shows a structured client area and resource handoff.", status: "review", progress: 88, targetDate: "Jun 02, 2026", milestones: [{ title: "Flow review", status: "completed", due: "May 01, 2026" }, { title: "Client feedback", status: "in progress", due: "May 20, 2026" }], deliverables: [{ title: "Sample workflow guide", detail: "Preview document placeholder" }] },
  { id: "sample-project-3", title: "Sample Digital Product Launch", category: "Digital Product", description: "Sample preview project for planning product positioning, assets, and delivery readiness.", status: "discovery", progress: 34, targetDate: "Jun 18, 2026", milestones: [{ title: "Product outline", status: "completed", due: "May 14, 2026" }, { title: "Asset planning", status: "upcoming", due: "Jun 01, 2026" }], deliverables: [{ title: "Sample launch outline", detail: "Preview document placeholder" }] },
];

export const sampleClientPurchases = [
  { id: "sample-purchase-1", title: "Creator Portfolio Launch Kit", format: "Sample download", status: "Preview ready", date: "Sample date · May 2026" },
  { id: "sample-purchase-2", title: "Dashboard Wireframe Library", format: "Sample UI kit", status: "Preview ready", date: "Sample date · Apr 2026" },
  { id: "sample-purchase-3", title: "Client Project Tracker", format: "Sample workspace", status: "Preview ready", date: "Sample date · Mar 2026" },
  { id: "sample-purchase-4", title: "Invoice + Proposal Pack", format: "Sample document", status: "Preview ready", date: "Sample date · Feb 2026" },
];

export const sampleBillingRecords = [
  { id: "SAMPLE-INV-001", title: "Sample project discovery", date: "Sample date · May 2026", amount: "₱12,500.00", status: "Sample preview" },
  { id: "SAMPLE-INV-002", title: "Sample interface direction", date: "Sample date · Apr 2026", amount: "₱18,000.00", status: "Sample preview" },
  { id: "SAMPLE-INV-003", title: "Sample digital-product request", date: "Sample date · Mar 2026", amount: "₱899.00", status: "Sample preview" },
];

export const sampleResources = [
  { id: "sample-resource-1", placement: "Project guide", title: "Sample project kick-off guide", body: "A sample resource card showing how project expectations, milestones, and shared files can be organised." },
  { id: "sample-resource-2", placement: "Announcement", title: "Sample studio update", body: "A sample update card for communicating delivery windows and project handoff notes." },
  { id: "sample-resource-3", placement: "Product guide", title: "Sample product access guide", body: "A sample reference for where fulfilment notes, file access, and support guidance can appear." },
  { id: "sample-resource-4", placement: "Resource", title: "Sample feedback checklist", body: "A sample client resource for collecting clear and useful project feedback." },
];
