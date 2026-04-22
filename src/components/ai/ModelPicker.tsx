import React from "react";
import { Check, ChevronDown, Gauge, Sparkles, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_MODELS, type AIModelOption } from "@/services/openRouterService";

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  /** When true the trigger collapses into a compact pill for narrow bars. */
  compact?: boolean;
}

const speedIcon: Record<AIModelOption["speed"], React.ReactNode> = {
  fast: <Zap className="h-3 w-3" />,
  balanced: <Gauge className="h-3 w-3" />,
  thorough: <Sparkles className="h-3 w-3" />,
};

const tierColor: Record<AIModelOption["tier"], string> = {
  light: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  standard: "text-cuephoria-lightpurple bg-cuephoria-purple/15 border-cuephoria-purple/40",
  frontier: "text-amber-300 bg-amber-500/10 border-amber-400/30",
};

/**
 * Dropdown for choosing the OpenRouter model. Shows a short blurb + pricing
 * so operators can make an informed speed/cost/quality trade-off.
 */
export function ModelPicker({ value, onChange, compact = false }: ModelPickerProps) {
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:border-white/20 ${
            compact ? "max-w-[180px]" : ""
          }`}
          title={`${current.label} · ${current.provider}`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border ${tierColor[current.tier]}`}
          >
            {speedIcon[current.speed]}
          </span>
          <span className="truncate">{current.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[320px] bg-cuephoria-darker/95 border-white/10 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/40">
          Choose model
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        {AI_MODELS.map((m) => {
          const isActive = m.id === value;
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => onChange(m.id)}
              className={`flex flex-col items-start gap-1 rounded-md my-0.5 cursor-pointer px-2 py-2 ${
                isActive ? "bg-white/8" : "hover:bg-white/5"
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border flex-shrink-0 ${tierColor[m.tier]}`}
                >
                  {speedIcon[m.speed]}
                </span>
                <span className="font-semibold text-white/90 text-[13px]">{m.label}</span>
                <span className="text-[10px] font-mono text-white/40">
                  · {m.provider}
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/50 tabular-nums">
                  ${m.inputPer1M.toFixed(2)}/${m.outputPer1M.toFixed(2)}
                </span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-cuephoria-lightpurple" />
                )}
              </div>
              <p className="text-[11px] text-white/50 pl-7">{m.blurb}</p>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModelPicker;
