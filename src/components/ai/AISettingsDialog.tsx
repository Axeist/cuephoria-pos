import React, { useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound, RefreshCw, Save, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ModelPicker } from "@/components/ai/ModelPicker";
import { useAISettings } from "@/services/aiSettings";

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for configuring the OpenRouter-backed assistant. Stores everything
 * in localStorage via `useAISettings` so the user's key never leaves the
 * browser except when actually making a chat request.
 */
export function AISettingsDialog({ open, onOpenChange }: AISettingsDialogProps) {
  const { settings, update, reset, hasUserKey } = useAISettings();

  const [keyDraft, setKeyDraft] = useState<string>(settings.apiKey);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [instructionsDraft, setInstructionsDraft] = useState<string>(
    settings.customInstructions,
  );

  // Keep local drafts in sync if the dialog reopens after an external change.
  React.useEffect(() => {
    if (open) {
      setKeyDraft(settings.apiKey);
      setInstructionsDraft(settings.customInstructions);
    }
  }, [open, settings.apiKey, settings.customInstructions]);

  const handleSave = () => {
    update({
      apiKey: keyDraft.trim(),
      customInstructions: instructionsDraft.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-cuephoria-darker/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-cuephoria-lightpurple" />
            AI Settings
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configure the model, your OpenRouter API key, and reply behaviour.
            Keys live only in your browser's local storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Model */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-white/50">
              Model
            </Label>
            <div>
              <ModelPicker
                value={settings.modelId}
                onChange={(id) => update({ modelId: id })}
              />
            </div>
          </div>

          {/* API key */}
          <div className="space-y-2">
            <Label
              htmlFor="openrouter-key"
              className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              OpenRouter API Key
            </Label>
            <div className="relative">
              <Input
                id="openrouter-key"
                type={showKey ? "text" : "password"}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="sk-or-v1-..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              {hasUserKey ? (
                <>Using your personal key. Clear the field to fall back to the project default.</>
              ) : (
                <>No personal key set — falls back to the project's <code className="text-white/60">VITE_OPENROUTER_API_KEY</code>.</>
              )}
            </p>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cuephoria-lightpurple hover:text-white transition-colors"
            >
              Get a key on openrouter.ai
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-widest text-white/50">
                Temperature
              </Label>
              <span className="text-xs font-mono text-white/70 tabular-nums">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1.2}
              step={0.05}
              value={[settings.temperature]}
              onValueChange={(v) => update({ temperature: v[0] ?? 0.3 })}
            />
            <p className="text-[11px] text-white/40">
              Lower = more deterministic / numeric. Higher = more creative.
            </p>
          </div>

          {/* Max tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-widest text-white/50">
                Max Reply Tokens
              </Label>
              <span className="text-xs font-mono text-white/70 tabular-nums">
                {settings.maxTokens}
              </span>
            </div>
            <Slider
              min={128}
              max={4096}
              step={64}
              value={[settings.maxTokens]}
              onValueChange={(v) => update({ maxTokens: v[0] ?? 800 })}
            />
            <p className="text-[11px] text-white/40">
              Caps reply length. Lower values reduce cost on long answers.
            </p>
          </div>

          {/* Custom instructions */}
          <div className="space-y-2">
            <Label
              htmlFor="ai-instructions"
              className="text-xs uppercase tracking-widest text-white/50"
            >
              Custom Instructions (optional)
            </Label>
            <Textarea
              id="ai-instructions"
              value={instructionsDraft}
              onChange={(e) => setInstructionsDraft(e.target.value)}
              placeholder="e.g. Always reply concisely. Prefer tables for multi-row comparisons."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple text-white hover:opacity-90"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AISettingsDialog;
