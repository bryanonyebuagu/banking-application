export type SiteNavigationIcon = "checking" | "savings" | "card" | "home" | "auto" | "investing" | "education" | "security" | "help" | "faq" | "contact" | "privacy" | "terms" | "business" | "commercial";

export const siteNavigationGroups: Array<{ title: string; links: Array<{ label: string; href: string; icon: SiteNavigationIcon }> }> = [
  { title: "Personal", links: [
    { label: "Checking", href: "/checking", icon: "checking" },
    { label: "Savings", href: "/savings", icon: "savings" },
    { label: "Credit Cards", href: "/credit-cards", icon: "card" },
    { label: "Home Loans", href: "/mortgage", icon: "home" },
    { label: "Auto", href: "/auto-financing", icon: "auto" },
    { label: "Investing", href: "/investing", icon: "investing" },
  ] },
  { title: "Resources", links: [
    { label: "Education", href: "/education", icon: "education" },
    { label: "Security", href: "/security", icon: "security" },
    { label: "Help center", href: "/help-center", icon: "help" },
    { label: "FAQ", href: "/faq", icon: "faq" },
    { label: "Contact", href: "/contact", icon: "contact" },
  ] },
  { title: "Information", links: [
    { label: "Privacy", href: "/privacy", icon: "privacy" },
    { label: "Terms", href: "/terms", icon: "terms" },
    { label: "Business", href: "/business-banking", icon: "business" },
    { label: "Commercial", href: "/commercial", icon: "commercial" },
  ] },
];
