import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { CatalogPlanTier } from "@/billing/planCatalog";
import { PLAN_MARKETING } from "@/billing/planCatalog";
import {
  PLAN_QUIZ_QUESTIONS,
  scorePlanRecommendation,
  tierDisplayName,
} from "@/billing/planRecommendationQuiz";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Step = "intro" | "question" | "result";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan?: (tier: CatalogPlanTier) => void;
  organizationName?: string;
};

const TIER_ICONS: Record<CatalogPlanTier, React.ComponentType<{ className?: string }>> = {
  starter: Zap,
  growth: TrendingUp,
  pro: Crown,
};

export default function PlanRecommendationQuizDialog({
  open,
  onOpenChange,
  onSelectPlan,
  organizationName,
}: Props) {
  const [step, setStep] = React.useState<Step>("intro");
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const reset = React.useCallback(() => {
    setStep("intro");
    setQuestionIndex(0);
    setAnswers({});
  }, []);

  React.useEffect(() => {
    if (!open) {
      const t = window.setTimeout(reset, 200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, reset]);

  const currentQuestion = PLAN_QUIZ_QUESTIONS[questionIndex];
  const totalQuestions = PLAN_QUIZ_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progress =
    step === "intro"
      ? 0
      : step === "result"
        ? 100
        : Math.round(((questionIndex + (answers[currentQuestion?.id ?? ""] ? 1 : 0)) / totalQuestions) * 100);

  const result = React.useMemo(
    () => (step === "result" ? scorePlanRecommendation(answers) : null),
    [step, answers],
  );

  const pickOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const goNext = () => {
    if (step === "intro") {
      setStep("question");
      return;
    }
    if (step === "question") {
      if (questionIndex < totalQuestions - 1) {
        setQuestionIndex((i) => i + 1);
      } else {
        setStep("result");
      }
    }
  };

  const goBack = () => {
    if (step === "result") {
      setStep("question");
      setQuestionIndex(totalQuestions - 1);
      return;
    }
    if (step === "question" && questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
      return;
    }
    if (step === "question" && questionIndex === 0) {
      setStep("intro");
    }
  };

  const currentAnswerId = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canAdvance =
    step === "intro" || (step === "question" && !!currentAnswerId) || step === "result";

  const recommended = result?.tier ?? "growth";
  const marketing = PLAN_MARKETING[recommended];
  const RecommendedIcon = TIER_ICONS[recommended];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="border-white/10 text-white sm:max-w-lg"
        style={{
          background:
            "linear-gradient(165deg, color-mix(in oklab, var(--brand-primary-hex) 16%, rgba(255,255,255,0.045)) 0%, rgba(8,5,18,0.97) 100%)",
          backdropFilter: "blur(20px) saturate(140%)",
        }}
      >
        <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--brand-primary-hex), var(--brand-accent-hex))",
            }}
          />
        </div>

        {step === "intro" && (
          <>
            <DialogHeader className="text-left">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Sparkles className="h-5 w-5 text-[color:var(--brand-accent-hex)]" />
              </div>
              <DialogTitle className="text-xl text-white">Find your best plan</DialogTitle>
              <DialogDescription className="text-white/65 text-sm leading-relaxed">
                {organizationName ? (
                  <>
                    Four quick questions about <strong className="text-white/90">{organizationName}</strong> — we&apos;ll
                    suggest Starter, Growth, or Pro.
                  </>
                ) : (
                  <>Four quick questions — we&apos;ll suggest Starter, Growth, or Pro for your venue.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-xs text-white/55">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Takes under a minute
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> No payment — just a recommendation
              </li>
            </ul>
          </>
        )}

        {step === "question" && currentQuestion && (
          <>
            <DialogHeader className="text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Question {questionIndex + 1} of {totalQuestions}
              </p>
              <DialogTitle className="text-lg text-white leading-snug">{currentQuestion.question}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const selected = currentAnswerId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => pickOption(currentQuestion.id, option.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition",
                      selected
                        ? "border-[color:var(--brand-accent-hex)]/60 bg-[color:var(--brand-accent-hex)]/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 grid place-items-center",
                          selected ? "border-[color:var(--brand-accent-hex)]" : "border-white/30",
                        )}
                      >
                        {selected ? (
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--brand-accent-hex)" }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{option.label}</div>
                        {option.hint ? (
                          <div className="text-xs text-white/50 mt-0.5">{option.hint}</div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <DialogHeader className="text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
                Our recommendation
              </p>
              <DialogTitle className="text-xl text-white flex items-center gap-2">
                <RecommendedIcon className="h-5 w-5 text-[color:var(--brand-accent-hex)]" />
                {tierDisplayName(recommended)} plan
              </DialogTitle>
              <DialogDescription className="text-white/65">{marketing.tagline}</DialogDescription>
            </DialogHeader>

            <div
              className="rounded-xl border p-4 space-y-3"
              style={{
                borderColor: "color-mix(in oklab, var(--brand-accent-hex) 40%, transparent)",
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--brand-accent-hex) 12%, transparent) 0%, rgba(255,255,255,0.02) 100%)",
              }}
            >
              {result.confidence === "close" ? (
                <p className="text-xs text-white/55">
                  Growth and {recommended === "pro" ? "Starter" : "Pro"} were close — {recommended} still fits best
                  based on your answers.
                </p>
              ) : null}
              <ul className="space-y-2">
                {result.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-xs text-white/80">
                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-white/40">
              {(["starter", "growth", "pro"] as const).map((tier) => (
                <span
                  key={tier}
                  className={cn(
                    "rounded-full px-2 py-0.5 border",
                    tier === recommended
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                      : "border-white/10",
                  )}
                >
                  {tierDisplayName(tier)}: {result.scores[tier]} pts
                </span>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex gap-2">
            {step !== "intro" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white/55 hover:text-white hover:bg-white/10"
              >
                Maybe later
              </Button>
            )}
          </div>

          {step === "result" ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                className="border-white/20 bg-transparent text-white/80 hover:bg-white/10"
              >
                Retake quiz
              </Button>
              <Button
                type="button"
                size="sm"
                className="btn-gradient text-white"
                onClick={() => {
                  onSelectPlan?.(recommended);
                  onOpenChange(false);
                }}
              >
                {marketing.ctaLabel}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="btn-gradient text-white"
              disabled={!canAdvance}
              onClick={goNext}
            >
              {step === "intro" ? "Start" : questionIndex === totalQuestions - 1 ? "See recommendation" : "Next"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>

        {step === "question" && answeredCount > 0 ? (
          <p className="text-[10px] text-center text-white/35 -mt-1">
            {answeredCount} of {totalQuestions} answered
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
