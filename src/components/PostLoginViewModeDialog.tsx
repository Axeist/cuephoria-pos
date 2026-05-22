import React from "react";
import { Smartphone, Monitor, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewMode } from "@/context/ViewModeContext";
import { cn } from "@/lib/utils";

interface PostLoginViewModeDialogProps {
  /**
   * Optional gate: if provided, the dialog only renders when `enabled` is
   * true. Lets the caller suppress the prompt during specific flows (e.g.
   * onboarding wizard).
   */
  enabled?: boolean;
}

/**
 * One-time post-sign-in prompt. Asks the user to pick between mobile-optimized
 * and standard (desktop) view. Honors `shouldPrompt` from `ViewModeContext`
 * so it never shows twice (unless explicitly re-triggered via settings).
 *
 * Visual goal: feels like an onboarding card, not a system alert — large tap
 * targets, recommended badge on the auto-detected option.
 */
export const PostLoginViewModeDialog: React.FC<PostLoginViewModeDialogProps> = ({
  enabled = true,
}) => {
  const { shouldPrompt, autoDetected, setOverride, dismissPrompt } =
    useViewMode();

  const open = enabled && shouldPrompt;

  const choose = (mode: "mobile" | "desktop") => {
    setOverride(mode);
    dismissPrompt();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // If the user dismisses without choosing, fall back to whatever
          // auto-detection picked but stop nagging.
          setOverride(autoDetected);
          dismissPrompt();
        }
      }}
    >
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md p-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-80 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, color-mix(in oklab, var(--brand-primary-hex) 28%, transparent) 0%, transparent 60%)",
          }}
        />

        <DialogHeader className="px-6 pt-6 sm:px-7 sm:pt-7 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3 w-3" />
              New
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
            Pick your view
          </DialogTitle>
          <DialogDescription className="text-sm text-white/65">
            We detected you're on a {autoDetected === "mobile" ? "phone" : "larger screen"}. Choose
            the layout that feels best — you can change this anytime from your
            profile menu.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7 grid grid-cols-1 gap-3">
          <ViewModeOptionButton
            icon={<Smartphone className="h-5 w-5" />}
            title="Mobile-optimized"
            subtitle="Stacked layouts, sheet dialogs, thumb-reachable actions"
            recommended={autoDetected === "mobile"}
            onClick={() => choose("mobile")}
          />
          <ViewModeOptionButton
            icon={<Monitor className="h-5 w-5" />}
            title="Standard view"
            subtitle="The full desktop layout — best on tablets and larger"
            recommended={autoDetected === "desktop"}
            onClick={() => choose("desktop")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ViewModeOptionButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  recommended?: boolean;
  onClick: () => void;
}

const ViewModeOptionButton: React.FC<ViewModeOptionButtonProps> = ({
  icon,
  title,
  subtitle,
  recommended,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative flex items-center gap-3 sm:gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-200",
      "border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20",
      "active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
    )}
  >
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        "bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 text-white",
      )}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        {recommended ? (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Recommended
          </span>
        ) : null}
      </div>
      <div className="text-[12px] text-white/55 leading-snug mt-0.5">
        {subtitle}
      </div>
    </div>
  </button>
);

export default PostLoginViewModeDialog;
