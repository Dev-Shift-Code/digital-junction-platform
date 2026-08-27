export type PublicPage = "home" | "shop" | "services" | "work" | "about" | "contact" | "footer";

export type PublicSectionDefault = {
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  isPublished: boolean;
};

const make = (values: Partial<PublicSectionDefault>): PublicSectionDefault => ({ eyebrow: "", title: "", body: "", imageUrl: "", ctaLabel: "", ctaHref: "", isPublished: true, ...values });

export const publicSectionDefaults: Record<PublicPage, Record<string, PublicSectionDefault>> = {
  home: {
    hero: make({ eyebrow: "Digital Junction Development Co.", title: "Connecting Ideas. Building Digital Success.", body: "Modern digital solutions for businesses, startups, entrepreneurs, and creators. We build websites, applications, business systems, branding solutions, and digital products designed to help ideas grow.", ctaLabel: "Start a project", ctaHref: "/contact" }),
    services: make({ eyebrow: "Digital solutions overview", title: "Digital solutions built around your goals.", body: "From websites and software systems to creative design and digital resources, every solution is shaped around a real business need.", ctaLabel: "Explore our services", ctaHref: "/services" }),
    products: make({ eyebrow: "Digital products for modern creators & businesses", title: "Ready-to-use resources that help work move smarter.", body: "Templates, UI kits, business resources, and productivity tools created directly by Digital Junction.", ctaLabel: "Browse all products", ctaHref: "/shop" }),
    projects: make({ eyebrow: "Featured projects", title: "Ideas we’ve turned into digital experiences.", body: "Explore selected websites, applications, business systems, and digital experiences developed by Digital Junction.", ctaLabel: "View projects", ctaHref: "/work" }),
    story: make({ eyebrow: "Our story", title: "Technology should help businesses grow—not make their lives more complicated.", body: "Digital Junction Development Co. bridges the gap between businesses and technology through practical, innovative, and accessible digital solutions.", ctaLabel: "Discover our story", ctaHref: "/about" }),
    "call-to-action": make({ eyebrow: "Start the next chapter", title: "Have an idea? Let’s turn it into something digital.", body: "Whether you need a website, business system, digital product, branding solution, or custom software, Digital Junction is ready to help bring your idea to life.", ctaLabel: "Start a project", ctaHref: "/contact" }),
  },
  shop: {
    hero: make({ eyebrow: "Digital Junction marketplace", title: "Explore products", body: "Browse digital templates, interface assets, practical business resources, and creative tools made exclusively by Digital Junction. No account is required to browse or start checkout." }),
    catalogue: make({ eyebrow: "Catalogue", title: "Products made by Digital Junction", body: "Explore the current owner-managed digital catalogue." }),
    "call-to-action": make({ eyebrow: "Guest checkout", title: "Browse and checkout as a guest.", body: "Open any live product to review its details and submit a guest checkout request—no client account required.", ctaLabel: "Need help choosing a product?", ctaHref: "/contact" }),
  },
  services: {
    hero: make({ eyebrow: "Services", title: "Digital services designed to move your work forward.", body: "Digital Junction combines technology, creative design, business systems, and practical support to help companies and creators build better digital experiences." }),
    "service-list": make({ eyebrow: "Service list", title: "Services built around practical outcomes.", body: "Explore the capabilities available from Digital Junction.", ctaLabel: "Discuss this service", ctaHref: "/contact" }),
    "call-to-action": make({ eyebrow: "Not sure where to start?", title: "The best first step is often getting clear on the right question.", ctaLabel: "Start a conversation", ctaHref: "/contact" }),
  },
  work: {
    hero: make({ eyebrow: "Selected work", title: "Work with a clear reason to exist.", body: "A focused collection of publicly shareable projects, with the context, decisions, and outcomes that made each one meaningful." }),
    projects: make({ eyebrow: "Projects", title: "Selected projects", body: "Publicly shareable Digital Junction work." }),
    "call-to-action": make({ eyebrow: "Your work could be next", title: "Bring the brief, the friction point, or the half-formed idea.", ctaLabel: "Start a project", ctaHref: "/contact" }),
  },
  about: {
    hero: make({ eyebrow: "About Digital Junction", title: "Connecting ideas. Building digital success.", body: "Digital Junction Development Co. brings software thinking, practical design, and human understanding together to make technology feel more useful." }),
    story: make({ eyebrow: "Vision", title: "A trusted partner in the work that turns possibility into progress.", body: "To empower businesses and individuals through innovative technology, creative design, and high-quality digital products that support long-term growth." }),
    "call-to-action": make({ eyebrow: "A practical next step", title: "Let’s see what a better digital experience can unlock.", ctaLabel: "Begin the conversation", ctaHref: "/contact" }),
  },
  contact: {
    hero: make({ eyebrow: "Start a project", title: "The next clear step can begin with a good conversation." }),
    "contact-details": make({ eyebrow: "Contact guidance", title: "Share the useful context.", body: "Tell us what you want to create, what is currently getting in the way, and what a helpful outcome would look like. A concise note is enough to get started." }),
    "call-to-action": make({ eyebrow: "Next step", title: "Ready to start?", body: "Tell us about the result you need and we will continue the conversation from there.", ctaLabel: "Send project inquiry", ctaHref: "/contact" }),
  },
  footer: {
    brand: make({ eyebrow: "Footer brand", title: "Digital Junction", body: "Connecting ideas with practical, thoughtful digital experiences—built for the work ahead." }),
    contact: make({ eyebrow: "Start a conversation", title: "", body: "Tell us what you are building, where you are stuck, and what success needs to look like.", ctaLabel: "Start a project", ctaHref: "/contact" }),
    social: make({ eyebrow: "Social", title: "", body: "Official social links will appear here when the company channels are ready." }),
  },
};

export function getPublicSectionDefault(page: PublicPage, section: string): PublicSectionDefault {
  return publicSectionDefaults[page][section] ?? make({});
}
