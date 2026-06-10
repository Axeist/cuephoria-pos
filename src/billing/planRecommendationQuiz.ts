import type { CatalogPlanTier } from "@/billing/planCatalog";
import { PLAN_MARKETING } from "@/billing/planCatalog";

type TierWeights = Record<CatalogPlanTier, number>;

export type PlanQuizOption = {
  id: string;
  label: string;
  hint?: string;
  weights: TierWeights;
  reason?: Partial<Record<CatalogPlanTier, string>>;
};

export type PlanQuizQuestion = {
  id: string;
  question: string;
  options: PlanQuizOption[];
};

export const PLAN_QUIZ_QUESTIONS: PlanQuizQuestion[] = [
  {
    id: "locations",
    question: "How many venues do you run?",
    options: [
      {
        id: "one",
        label: "One location",
        hint: "Single lounge, cafe, or gaming centre",
        weights: { starter: 3, growth: 2, pro: 0 },
        reason: { starter: "You're running a single venue — Starter covers one branch." },
      },
      {
        id: "one-growing",
        label: "One today, maybe more later",
        hint: "Planning to expand in the next year",
        weights: { starter: 1, growth: 3, pro: 2 },
        reason: { growth: "You're growing — Growth gives room before you need multi-branch." },
      },
      {
        id: "two-three",
        label: "Two or three branches",
        weights: { starter: 0, growth: 2, pro: 4 },
        reason: { pro: "Multiple branches need Pro's multi-location limits." },
      },
    ],
  },
  {
    id: "stations",
    question: "How many gaming stations do you have?",
    options: [
      {
        id: "small",
        label: "Up to 6 stations",
        hint: "PCs, consoles, pool tables, VR bays, etc.",
        weights: { starter: 4, growth: 1, pro: 0 },
        reason: { starter: "Up to 6 stations fits Starter comfortably." },
      },
      {
        id: "medium",
        label: "7 to 20 stations",
        weights: { starter: 0, growth: 4, pro: 1 },
        reason: { growth: "Your station count matches Growth (up to 20)." },
      },
      {
        id: "large",
        label: "More than 20 stations",
        weights: { starter: 0, growth: 1, pro: 4 },
        reason: { pro: "Pro removes station caps for larger floors." },
      },
    ],
  },
  {
    id: "features",
    question: "What matters most right now?",
    options: [
      {
        id: "pos-only",
        label: "Walk-in POS & billing",
        hint: "Sessions, products, receipts — no online booking yet",
        weights: { starter: 4, growth: 1, pro: 0 },
        reason: { starter: "In-store billing is Starter's sweet spot." },
      },
      {
        id: "online-community",
        label: "Online booking, tournaments & loyalty",
        hint: "Let customers book and pay before they arrive",
        weights: { starter: 0, growth: 4, pro: 1 },
        reason: { growth: "Growth unlocks booking, tournaments, and loyalty." },
      },
      {
        id: "operations",
        label: "Staff HR, analytics & custom branding",
        hint: "Attendance, deeper reports, custom domain",
        weights: { starter: 0, growth: 1, pro: 4 },
        reason: { pro: "Pro covers HR, analytics, and white-label public pages." },
      },
    ],
  },
  {
    id: "team",
    question: "How many admins will use the dashboard?",
    options: [
      {
        id: "solo",
        label: "Just me",
        weights: { starter: 3, growth: 1, pro: 0 },
        reason: { starter: "Solo operators do well on Starter's single admin seat." },
      },
      {
        id: "small-team",
        label: "2 to 5 people",
        weights: { starter: 0, growth: 4, pro: 1 },
        reason: { growth: "Growth includes up to 5 admin seats for your team." },
      },
      {
        id: "large-team",
        label: "6 or more",
        weights: { starter: 0, growth: 1, pro: 4 },
        reason: { pro: "Pro offers unlimited admin and staff seats." },
      },
    ],
  },
];

export type PlanQuizResult = {
  tier: CatalogPlanTier;
  scores: TierWeights;
  reasons: string[];
  confidence: "strong" | "close";
};

const TIER_ORDER: CatalogPlanTier[] = ["pro", "growth", "starter"];

function pickTier(scores: TierWeights): CatalogPlanTier {
  let best: CatalogPlanTier = "growth";
  let bestScore = -1;
  for (const tier of TIER_ORDER) {
    if (scores[tier] > bestScore) {
      bestScore = scores[tier];
      best = tier;
    }
  }
  return best;
}

export function scorePlanRecommendation(
  answers: Record<string, string>,
): PlanQuizResult {
  const scores: TierWeights = { starter: 0, growth: 0, pro: 0 };

  for (const q of PLAN_QUIZ_QUESTIONS) {
    const selectedId = answers[q.id];
    if (!selectedId) continue;
    const option = q.options.find((o) => o.id === selectedId);
    if (!option) continue;

    scores.starter += option.weights.starter;
    scores.growth += option.weights.growth;
    scores.pro += option.weights.pro;
  }

  const tier = pickTier(scores);
  const sorted = [...TIER_ORDER].sort((a, b) => scores[b] - scores[a]);
  const top = scores[sorted[0]!];
  const second = scores[sorted[1]!] ?? 0;
  const confidence: PlanQuizResult["confidence"] = top - second >= 3 ? "strong" : "close";

  const tierReasons: string[] = [];
  for (const q of PLAN_QUIZ_QUESTIONS) {
    const selectedId = answers[q.id];
    if (!selectedId) continue;
    const option = q.options.find((o) => o.id === selectedId);
    const reason = option?.reason?.[tier];
    if (reason) tierReasons.push(reason);
  }

  const uniqueReasons = [...new Set(tierReasons)].slice(0, 3);

  return {
    tier,
    scores,
    reasons:
      uniqueReasons.length > 0
        ? uniqueReasons
        : [PLAN_MARKETING[tier].tagline],
    confidence,
  };
}

export function tierDisplayName(tier: CatalogPlanTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
