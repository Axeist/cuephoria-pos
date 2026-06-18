import React, { memo, useMemo } from "react";

/**
 * Tiny, dependency-free renderer for the subset of Markdown that Cuephoria
 * AI actually produces:
 *  - ATX headings (`#`, `##`, `###`)
 *  - Unordered lists (`- `) + ordered lists (`1. `)
 *  - Triple-backtick code fences
 *  - Inline code, **bold**, *italic*
 *  - Plain URLs → clickable links
 *
 * Anything else falls through as a plain paragraph so the output never
 * looks broken even on unexpected input.
 */

interface InlineProps {
  text: string;
}

// Inline formatting: **bold**, *italic*, `code`, and raw URLs.
const INLINE_REGEX =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s)]+|₹\s?\d[\d,]*(?:\.\d+)?)/g;

function InlineMarkdown({ text }: InlineProps): React.ReactElement {
  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(INLINE_REGEX);

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        out.push(text.slice(lastIdx, match.index));
      }
      const token = match[0];

      if (token.startsWith("**") && token.endsWith("**")) {
        out.push(
          <strong key={match.index} className="font-semibold text-white">
            {token.slice(2, -2)}
          </strong>,
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        out.push(
          <em key={match.index} className="italic text-white/90">
            {token.slice(1, -1)}
          </em>,
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        out.push(
          <code
            key={match.index}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cuephoria-lightpurple"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else if (token.startsWith("http")) {
        out.push(
          <a
            key={match.index}
            href={token}
            target="_blank"
            rel="noreferrer"
            className="text-cuephoria-lightpurple underline underline-offset-2 hover:text-white"
          >
            {token}
          </a>,
        );
      } else if (token.startsWith("₹")) {
        // Highlight rupee values so currency pops in long responses.
        out.push(
          <span key={match.index} className="font-semibold text-emerald-300 tabular-nums">
            {token}
          </span>,
        );
      } else {
        out.push(token);
      }
      lastIdx = match.index + token.length;
    }
    if (lastIdx < text.length) out.push(text.slice(lastIdx));
    return out;
  }, [text]);

  return <>{parts}</>;
}

interface MessageContentProps {
  content: string;
  /** Render a blinking caret at the end — used during streaming. */
  streaming?: boolean;
}

interface Block {
  type: "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "code";
  /** For lists: array of item lines. For everything else: raw text. */
  items?: string[];
  text?: string;
  lang?: string;
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const collected: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        collected.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push({ type: "code", text: collected.join("\n"), lang });
      continue;
    }

    // Headings
    if (/^###\s+/.test(line)) {
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push({ type: "h1", text: line.replace(/^#\s+/, "") });
      i++;
      continue;
    }

    // Lists
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph — accumulate until a blank line or a new block starts.
    if (line.trim().length === 0) {
      i++;
      continue;
    }
    const collected: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].startsWith("```") &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      collected.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: collected.join(" ") });
  }

  return blocks;
}

function MessageContentInner({ content, streaming }: MessageContentProps) {
  // Only parse markdown once streaming has finished. Re-parsing every
  // single streamed token was the dominant contributor to INP jank
  // (200-300ms blocks) — the user gets the final formatted version the
  // instant streaming ends.
  const blocks = useMemo(
    () => (streaming ? null : parseBlocks(content)),
    [content, streaming],
  );

  if (streaming) {
    return (
      <div className="text-[14px] leading-relaxed text-white/90">
        <p className="whitespace-pre-wrap">{content}</p>
        <span
          aria-hidden
          className="ml-0.5 inline-block h-4 w-1.5 translate-y-[2px] rounded-[1px] bg-cuephoria-lightpurple align-middle animate-pulse"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed text-white/90">
      {(blocks ?? []).map((b, idx) => {
        switch (b.type) {
          case "h1":
            return (
              <h1 key={idx} className="text-lg font-bold text-white">
                <InlineMarkdown text={b.text ?? ""} />
              </h1>
            );
          case "h2":
            return (
              <h2 key={idx} className="text-base font-semibold text-white">
                <InlineMarkdown text={b.text ?? ""} />
              </h2>
            );
          case "h3":
            return (
              <h3 key={idx} className="text-sm font-semibold text-white/90">
                <InlineMarkdown text={b.text ?? ""} />
              </h3>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc space-y-1 pl-5 marker:text-cuephoria-lightpurple">
                {(b.items ?? []).map((item, j) => (
                  <li key={j}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={idx}
                className="list-decimal space-y-1 pl-5 marker:text-cuephoria-lightpurple marker:font-semibold"
              >
                {(b.items ?? []).map((item, j) => (
                  <li key={j}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={idx}
                className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[12.5px] font-mono text-white/90"
              >
                <code>{b.text}</code>
              </pre>
            );
          case "p":
          default:
            return (
              <p key={idx} className="whitespace-pre-wrap">
                <InlineMarkdown text={b.text ?? ""} />
              </p>
            );
        }
      })}
    </div>
  );
}

/**
 * Re-rendering the whole markdown tree on every streaming token is the
 * single biggest source of INP jank on this page. Memoise strictly on
 * (content, streaming) so bubbles whose content didn't change in this
 * frame skip rendering entirely.
 */
export const MessageContent = memo(MessageContentInner, (a, b) => {
  return a.content === b.content && a.streaming === b.streaming;
});

export default MessageContent;
