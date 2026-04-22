/**
 * ChatBubble — an animated speech bubble for one turn of the conversation.
 *
 * Entry is a soft spring slide-up + scale. User bubbles lean right with a
 * brand gradient; assistant bubbles lean left with a glassy translucent
 * surface. While the assistant is still streaming we show the
 * `TypingIndicator` until real content arrives, then a subtle pulsing
 * caret follows the last character.
 *
 * Everything uses the active tenant's CSS tokens (`--primary`,
 * `--brand-primary-hex`, …) so re-branding propagates instantly.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { MessageContent } from "./MessageContent";
import { TypingIndicator } from "./TypingIndicator";

export interface ChatBubbleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
  error?: boolean;
}

interface ChatBubbleProps {
  message: ChatBubbleMessage;
  userInitial: string;
  onCopy: (id: string, text: string) => void;
  copied: boolean;
}

const bubbleMotion = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

const bubbleSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 22,
  mass: 0.9,
};

const ChatBubbleInner: React.FC<ChatBubbleProps> = ({
  message,
  userInitial,
  onCopy,
  copied,
}) => {
  const isUser = message.role === "user";
  const hasContent = message.content.trim().length > 0;

  // ---- User bubble ----
  if (isUser) {
    return (
      <motion.div
        initial={bubbleMotion.initial}
        animate={bubbleMotion.animate}
        exit={bubbleMotion.exit}
        transition={bubbleSpring}
        className="flex justify-end gap-2.5"
      >
        <div className="relative max-w-[85%] sm:max-w-[78%]">
          <div
            className="relative rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
              boxShadow:
                "0 10px 30px -8px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <span className="mt-1 block text-right text-[10px] uppercase tracking-wider text-white/70">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, ...bubbleSpring }}
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 120%)",
            boxShadow:
              "0 6px 16px -4px hsl(var(--accent) / 0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <span className="text-xs font-bold">{userInitial}</span>
        </motion.div>
      </motion.div>
    );
  }

  // ---- Assistant bubble ----
  const isStreamingEmpty = !!message.streaming && !hasContent;
  const isError = !!message.error;

  return (
    <motion.div
      initial={bubbleMotion.initial}
      animate={bubbleMotion.animate}
      exit={bubbleMotion.exit}
      transition={bubbleSpring}
      className="flex justify-start gap-2.5"
    >
      {/* Assistant avatar — breathing glow uses opacity on a pseudo
          layer instead of animating box-shadow every frame (shadow
          animation forces paint on the entire card). */}
      <div
        className="mt-0.5 relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 120%)",
          boxShadow:
            "0 6px 20px -6px hsl(var(--primary) / 0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {message.streaming && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[-3px] rounded-full animate-pulse"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, transparent 70%)",
              willChange: "opacity",
            }}
          />
        )}
        <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M16 7a5 5 0 1 0 0 10"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="relative max-w-[90%] sm:max-w-[82%]">
        <div
          className={`relative rounded-2xl rounded-tl-md px-4 py-3 backdrop-blur-xl ${
            isError
              ? "border border-red-500/40 bg-red-500/10 text-red-100"
              : "border border-white/10 bg-white/[0.045] text-white/90"
          }`}
          style={
            isError
              ? undefined
              : {
                  boxShadow:
                    "0 12px 30px -14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                }
          }
        >
          {/* Top-edge highlight for that 3D glass feel */}
          {!isError && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.35) 50%, transparent 100%)",
              }}
            />
          )}

          {isStreamingEmpty ? (
            <div className="py-1">
              <TypingIndicator />
            </div>
          ) : (
            <MessageContent content={message.content || "…"} streaming={message.streaming} />
          )}

          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider opacity-60">
            <span>
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {hasContent && !message.streaming && (
              <button
                onClick={() => onCopy(message.id, message.content)}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/5 hover:text-white"
                title="Copy"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" /> copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> copy
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Memoised bubble. Without this, a single streaming delta re-renders
 * every previously-completed bubble in the thread, which was the
 * headline cause of the 200-300ms INP blocks.
 */
export const ChatBubble = memo(ChatBubbleInner, (prev, next) => {
  const m1 = prev.message;
  const m2 = next.message;
  return (
    m1.id === m2.id &&
    m1.content === m2.content &&
    m1.streaming === m2.streaming &&
    m1.error === m2.error &&
    prev.userInitial === next.userInitial &&
    prev.copied === next.copied &&
    prev.onCopy === next.onCopy
  );
});

export default ChatBubble;
