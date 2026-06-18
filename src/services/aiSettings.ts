/**
 * Local-storage backed settings for the Cuephoria AI assistant.
 *
 * We intentionally store only the bits the user should be able to override
 * from the in-app settings dialog:
 *  - their personal OpenRouter API key (preferred over the env fallback)
 *  - the model they prefer
 *  - reply temperature + max tokens (power-user knobs)
 *
 * Nothing here is sent outside the browser except when the values are
 * actively used to build a request to OpenRouter.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_MODEL_ID } from "./openRouterService";

const STORAGE_KEY = "cuephoria.ai.settings.v1";

export interface AISettings {
  apiKey: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  /** Extra bespoke guidance appended to the system prompt. */
  customInstructions: string;
}

const DEFAULTS: AISettings = {
  apiKey: "",
  modelId: DEFAULT_MODEL_ID,
  temperature: 0.3,
  maxTokens: 800,
  customInstructions: "",
};

function readFromStorage(): AISettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : DEFAULTS.apiKey,
      modelId: typeof parsed.modelId === "string" ? parsed.modelId : DEFAULTS.modelId,
      temperature:
        typeof parsed.temperature === "number" && parsed.temperature >= 0 && parsed.temperature <= 2
          ? parsed.temperature
          : DEFAULTS.temperature,
      maxTokens:
        typeof parsed.maxTokens === "number" && parsed.maxTokens >= 64 && parsed.maxTokens <= 8192
          ? parsed.maxTokens
          : DEFAULTS.maxTokens,
      customInstructions:
        typeof parsed.customInstructions === "string"
          ? parsed.customInstructions
          : DEFAULTS.customInstructions,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeToStorage(next: AISettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Let other tabs / the popout window react immediately.
    window.dispatchEvent(new CustomEvent("cuephoria:ai-settings"));
  } catch {
    /* storage full or disabled — best-effort only */
  }
}

/**
 * Read the current AI settings synchronously (e.g. before firing a request
 * outside of React component scope).
 */
export function getAISettings(): AISettings {
  return readFromStorage();
}

/**
 * React hook exposing the settings with a stable `update` function. Syncs
 * across tabs via the storage event AND across the same tab via a custom
 * `cuephoria:ai-settings` event fired by `writeToStorage`.
 */
export function useAISettings(): {
  settings: AISettings;
  update: (partial: Partial<AISettings>) => void;
  reset: () => void;
  hasUserKey: boolean;
} {
  const [settings, setSettings] = useState<AISettings>(() => readFromStorage());

  useEffect(() => {
    const sync = () => setSettings(readFromStorage());
    window.addEventListener("storage", sync);
    window.addEventListener("cuephoria:ai-settings", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cuephoria:ai-settings", sync as EventListener);
    };
  }, []);

  const update = useCallback((partial: Partial<AISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      writeToStorage(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writeToStorage(DEFAULTS);
    setSettings(DEFAULTS);
  }, []);

  const hasUserKey = useMemo(() => settings.apiKey.trim().length > 0, [settings.apiKey]);

  return { settings, update, reset, hasUserKey };
}
