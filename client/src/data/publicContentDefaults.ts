export type PublicPage = "home" | "shop" | "services" | "work" | "about" | "contact" | "footer" | "legal";

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
    "services-grid": make({ eyebrow: "Our digital services", title: "Technology and creative support for the work ahead.", body: "Professional technology and creative services designed to help businesses establish, improve, and grow their digital presence.", ctaLabel: "View all services", ctaHref: "/services" }),
    "services-grid-cards": make({ eyebrow: "Home service cards", title: "", body: "Development | Websites, web applications, and mobile experiences built for real goals.\nBusiness Systems | POS, inventory, management systems, and custom software for daily operations.\nDesign & Branding | UI/UX, logos, visual identity, and creative assets that make a business recognisable.\nDigital Products | Templates, UI kits, business resources, and productivity tools made by Digital Junction." }),
    advantages: make({ eyebrow: "Technology with purpose", title: "Thoughtful digital work, built for real progress.", body: "Modern Design | Professional, responsive, and user-focused digital experiences.\nCustom Solutions | Solutions shaped around the actual needs of each project.\nScalable Development | Clean, maintainable work designed to grow with the business.\nAffordable & Practical | Professional digital solutions without unnecessary complexity.\nReliable Support | Continued assistance beyond the initial delivery.\nInnovation First | Continuous learning and adoption of better technologies." }),
    process: make({ eyebrow: "How we work", title: "From idea to digital solution.", body: "01 Discover | Understand the idea, goals, requirements, and challenges.\n02 Plan | Define the solution, scope, features, and project direction.\n03 Design & Build | Create the experience and develop the solution.\n04 Deliver | Launch, hand over, and provide continued support when needed." }),
    partnership: make({ eyebrow: "A practical partnership", title: "Software development, creative design, and digital products in one considered direction.", body: "The company combines software development, creative design, and digital products to help businesses and individuals build better digital experiences—without unnecessary complexity." }),
  },
  shop: {
    hero: make({ eyebrow: "Digital Junction marketplace", title: "Explore products", body: "Browse digital templates, interface assets, practical business resources, and creative tools made exclusively by Digital Junction. No account is required to browse or start checkout." }),
    catalogue: make({ eyebrow: "Catalogue", title: "Products made by Digital Junction", body: "Explore the current owner-managed digital catalogue." }),
    "filter-controls": make({ eyebrow: "Catalogue controls", title: "", body: "allLabel | All products\nsearchPlaceholder | Search products\nsortLabel | Sort by\nsortNewest | Newest first\nsortPriceLow | Price: low to high\nsortPriceHigh | Price: high to low\nsortTitle | Name: A–Z\nfilterLabel | Filter\ncategoryLabel | Product category\nclearLabel | Clear\nfilterHint | Use the filters to find the right Digital Junction product.\nemptyTitle | No products are published yet.\nemptyBody | Published Digital Junction products will appear here." }),
    "call-to-action": make({ eyebrow: "Guest checkout", title: "Browse and checkout as a guest.", body: "Open any live product to review its details and submit a guest checkout request—no client account required.", ctaLabel: "Need help choosing a product?", ctaHref: "/contact" }),
  },
  services: {
    hero: make({ eyebrow: "Services", title: "Digital services designed to move your work forward.", body: "Digital Junction combines technology, creative design, business systems, and practical support to help companies and creators build better digital experiences." }),
    "service-list": make({ eyebrow: "Service list", title: "Services built around practical outcomes.", body: "Explore the capabilities available from Digital Junction.", ctaLabel: "Discuss this service", ctaHref: "/contact" }),
    "service-cards": make({ eyebrow: "Service cards", title: "", body: "Web Development | Professional, responsive, and SEO-friendly websites that make it easier for customers to understand and act. | Company websites, Landing pages, Custom web systems\nUI/UX Design | Modern, intuitive, user-centred interfaces that turn complex requirements into useful experiences. | Wireframes, High-fidelity UI, Interactive prototypes\nFull-Stack Development | Complete frontend, backend, database, and API solutions for more capable digital products. | Web applications, Databases, API integration\nMobile App Development | Cross-platform mobile applications designed around the moments when work happens away from a desk. | Business apps, Customer experiences, Mobile UI\nPOS & Inventory Systems | Business management solutions for sales, inventory, reporting, and operations. | POS workflows, Inventory tools, Management dashboards\nLogo & Branding | Professional visual identities and practical brand assets designed for businesses and growing teams. | Logo systems, Visual identity, Brand assets\nCanva Template Design | Editable templates for businesses, creators, and professionals who need a consistent visual starting point. | Social templates, Presentation assets, Marketing kits\nShort-form Video Editing | Engaging content optimised for TikTok, Facebook Reels, Instagram Reels, and YouTube Shorts. | Social edits, Reels & Shorts, Content packaging\nTechnical Support | Practical assistance for software, hardware, systems, and basic networking needs. | Software support, System setup, Basic IT guidance" }),
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
    mission: make({ eyebrow: "Mission", title: "Digital solutions should make the day-to-day more possible.", body: "We create modern, scalable, user-friendly tools; help businesses work more efficiently; and build durable relationships through honesty, practical innovation, and care." }),
    values: make({ eyebrow: "What keeps the work grounded", title: "A technology company can stay thoughtful.", body: "Innovation | We keep learning, testing, and applying technology where it has a useful role.\nIntegrity | We build trust through straight answers, transparent process, and accountability.\nExcellence | We care about the details that turn a working idea into a considered experience.\nCreativity | We use originality as a way to make a solution more clear and more memorable.\nCustomer success | We keep the practical outcome in view, not just the next visual deliverable.\nContinuous learning | We remain curious because technology and the work around it never stand still." }),
    "call-to-action": make({ eyebrow: "A practical next step", title: "Let’s see what a better digital experience can unlock.", ctaLabel: "Begin the conversation", ctaHref: "/contact" }),
  },
  contact: {
    hero: make({ eyebrow: "Start a project", title: "The next clear step can begin with a good conversation." }),
    form: make({ eyebrow: "Contact form", title: "", body: "nameLabel | Your name\nnamePlaceholder | Name\nemailLabel | Email address\nemailPlaceholder | you@example.com\ncompanyLabel | Company or organisation\ncompanyPlaceholder | Optional\ninterestLabel | What are you exploring?\ninterestPlaceholder | Select a direction\nmessageLabel | What would you like to build?\nmessagePlaceholder | A little context about the idea, the challenge, and what a good outcome could look like.\nsubmitLabel | Send project inquiry\nsuccessTitle | Thank you for reaching out.\nsuccessBody | Your note is now with Digital Junction.\nerrorBody | We could not send that message just now. Please try again in a moment." }),
    "contact-details": make({ eyebrow: "Contact guidance", title: "Share the useful context.", body: "Tell us what you want to create, what is currently getting in the way, and what a helpful outcome would look like. A concise note is enough to get started." }),
    "call-to-action": make({ eyebrow: "Next step", title: "Ready to start?", body: "Tell us about the result you need and we will continue the conversation from there.", ctaLabel: "Send project inquiry", ctaHref: "/contact" }),
  },
  footer: {
    brand: make({ eyebrow: "Footer brand", title: "Digital Junction", body: "Connecting ideas with practical, thoughtful digital experiences—built for the work ahead." }),
    contact: make({ eyebrow: "Start a conversation", title: "", body: "Tell us what you are building, where you are stuck, and what success needs to look like.", ctaLabel: "Start a project", ctaHref: "/contact" }),
    social: make({ eyebrow: "Social", title: "", body: "Official social links will appear here when the company channels are ready." }),
    navigation: make({ eyebrow: "Site navigation", title: "Company", body: "Home | /\nServices | /services\nDigital Products | /shop\nProjects | /work\nAbout | /about\nContact | /contact" }),
    "products-navigation": make({ eyebrow: "Product navigation", title: "Digital products", body: "All products | /shop\nUI kits | /shop\nBusiness resources | /shop\nGuest checkout | /shop" }),
    "help-navigation": make({ eyebrow: "Product help", title: "Product help", body: "Order questions | /contact\nDelivery support | /contact\nSupport | /contact" }),
    legal: make({ eyebrow: "Legal", title: "Legal", body: "Privacy policy | /privacy\nTerms & conditions | /terms\nRefund policy | /refunds" }),
    "contact-details": make({ eyebrow: "Contact", title: "Contact", body: "Email: official address to be confirmed\nPhone: official number to be confirmed" }),
  },
  legal: {
    privacy: make({ eyebrow: "Legal", title: "Privacy policy", body: "Privacy information will be maintained here by the owner." }),
    terms: make({ eyebrow: "Legal", title: "Terms & conditions", body: "Terms and conditions will be maintained here by the owner." }),
    refunds: make({ eyebrow: "Legal", title: "Refund policy", body: "Refund information will be maintained here by the owner." }),
  },
};

export function getPublicSectionDefault(page: PublicPage, section: string): PublicSectionDefault {
  return publicSectionDefaults[page][section] ?? make({});
}
