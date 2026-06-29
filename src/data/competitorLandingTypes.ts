/**
 * Shared types for SEO comparison landing pages (/cuebook-alternative, etc.).
 * Full feature matrices live at /vs/:slug.
 */

export interface CompetitorLandingSection {
  title: string;
  bullets: string[];
}

export interface CompetitorLandingMyth {
  myth: string;
  fact: string;
}

export interface CompetitorLandingFaq {
  q: string;
  a: string;
}

export interface CompetitorLandingPage {
  path: string;
  /** Routes to /vs/:slug */
  competitorSlug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  badge: string;
  headline: string;
  deck: string;
  sections: CompetitorLandingSection[];
  myths?: CompetitorLandingMyth[];
  mythsSectionTitle?: string;
  faqs: CompetitorLandingFaq[];
  relatedPaths: string[];
  sitemapPriority: number;
}

export const competitorLandingLabel = (slug: string): string => {
  const labels: Record<string, string> = {
    cueflow: "CueFlow",
    cuebook: "CueBook",
    clubsync: "Club Sync India",
  };
  return labels[slug] ?? slug;
};

export const competitorFullComparePath = (slug: string): string => `/vs/${slug}`;
