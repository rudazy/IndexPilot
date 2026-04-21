export const DOC_SECTIONS = [
  { slug: "getting-started", title: "Getting Started" },
  { slug: "drift-detection", title: "How Drift Detection Works" },
  { slug: "setup-guide", title: "Setting Up Your Index" },
  { slug: "rebalance-plan", title: "Reading Your Rebalance Plan" },
  { slug: "executing-on-sodex", title: "Executing on SoDEX" },
  { slug: "faq", title: "FAQ" },
] as const;

export type DocSlug = (typeof DOC_SECTIONS)[number]["slug"];

export const DOC_SLUGS = DOC_SECTIONS.map((s) => s.slug) as readonly DocSlug[];

export function findSection(slug: string) {
  return DOC_SECTIONS.find((s) => s.slug === slug);
}

export function isDocSlug(slug: string): slug is DocSlug {
  return DOC_SLUGS.includes(slug as DocSlug);
}
