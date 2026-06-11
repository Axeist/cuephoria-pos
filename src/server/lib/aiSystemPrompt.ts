/** Server-built AI system prompt — client-supplied system messages are never trusted. */

export type AiSystemContext = {
  snapshotText?: string;
  customInstructions?: string;
  userName?: string | null;
  tenantName?: string | null;
};

export function buildAiSystemPrompt(ctx: AiSystemContext): string {
  const headline = `You are Cuetronix AI — an operational assistant for ${
    ctx.tenantName?.trim() || "a gaming-cafe / arcade"
  }. You answer questions about the business using the DATA block below.`;

  const rules = [
    "Respond in crisp, skimmable Markdown. Use headings and bullets when helpful.",
    "All currency is INR — always prefix numbers with ₹ and use Indian comma grouping.",
    "Use only numbers present in the DATA block. Do not invent or extrapolate beyond it.",
    "When asked about 'today', use the section labelled `# TODAY`.",
    "When asked about trends, compare TODAY to `WEEK.avg_daily` and `by_weekday_avg`.",
    "If the data genuinely does not answer the question, say so briefly and suggest the nearest thing we DO have.",
    "Be concise by default (≤ 6 short lines). Offer to expand if they want a deeper dive.",
  ];

  const custom = ctx.customInstructions?.trim();

  return [
    headline,
    ctx.userName ? `The staff member asking is @${ctx.userName}. Address them by name when natural.` : "",
    "",
    "# Rules",
    ...rules.map((r) => `- ${r}`),
    custom ? `\n# Operator extras\n${custom}` : "",
    "",
    "# DATA",
    ctx.snapshotText?.trim() || "(No business snapshot was provided for this request.)",
  ]
    .filter(Boolean)
    .join("\n");
}
