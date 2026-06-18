/** Scoped CSS variables + utility classes for tenant-branded public pages. */

export function PublicPageBrandStyles({
  primary,
  accent,
}: {
  primary: string;
  accent: string;
}) {
  return (
    <style>{`
      .pt-page {
        --pt-primary: ${primary};
        --pt-accent: ${accent};
        --pt-primary-10: color-mix(in srgb, ${primary} 10%, transparent);
        --pt-primary-15: color-mix(in srgb, ${primary} 15%, transparent);
        --pt-primary-20: color-mix(in srgb, ${primary} 20%, transparent);
        --pt-primary-30: color-mix(in srgb, ${primary} 30%, transparent);
        --pt-primary-40: color-mix(in srgb, ${primary} 40%, transparent);
        --pt-shadow: color-mix(in srgb, ${primary} 30%, transparent);
      }
      .pt-page-bg {
        background: linear-gradient(to bottom right, #0b0b12, #000, #0b0b12);
      }
      .pt-glow {
        background: color-mix(in srgb, ${primary} 22%, transparent);
      }
      .pt-glow-accent {
        background: color-mix(in srgb, ${accent} 18%, transparent);
      }
      .pt-grad {
        background-image: linear-gradient(to right, var(--pt-primary), var(--pt-accent));
      }
      .pt-grad-text {
        background-image: linear-gradient(to right, #fff, var(--pt-primary), var(--pt-accent));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .pt-hero-title {
        background-image: linear-gradient(to right, #fff, var(--pt-primary), var(--pt-accent));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .pt-text { color: var(--pt-primary); }
      .pt-border { border-color: var(--pt-primary-30); }
      .pt-border-soft { border-color: var(--pt-primary-20); }
      .pt-border-faint { border-color: var(--pt-primary-10); }
      .pt-border-strong { border-color: var(--pt-primary-60); }
      .pt-page .hover\:pt-border-strong:hover { border-color: var(--pt-primary-60); }
      .pt-muted-bg { background-color: var(--pt-primary-20); }
      .pt-muted-bg-soft { background-color: var(--pt-primary-10); }
      .pt-muted-bg-strong { background-color: var(--pt-primary-40); }
      .pt-stat-card {
        background: linear-gradient(to bottom right, var(--pt-primary-40), var(--pt-primary-10));
        border-color: var(--pt-primary-30);
      }
      .pt-surface {
        background-color: color-mix(in srgb, #0a0a12 80%, transparent);
        border-color: var(--pt-primary-30);
      }
      .pt-card {
        background: linear-gradient(to bottom right, #0a0a12, #0a0a12, color-mix(in srgb, var(--pt-primary) 8%, #0a0a12));
        border-color: var(--pt-primary-30);
      }
      .pt-page .pt-hover-muted:hover { background-color: var(--pt-primary-20); }
      .pt-page .pt-hover-muted-soft:hover { background-color: var(--pt-primary-10); }
      .pt-page .group:hover .pt-group-hover-text { color: #fff; }
      .pt-page .group:hover .pt-group-hover-muted { background-color: var(--pt-primary-40); }
      .pt-shadow { box-shadow: 0 10px 30px -10px var(--pt-shadow); }
      .pt-spinner { border-top-color: var(--pt-primary); }
      .pt-spinner-accent { border-right-color: var(--pt-accent); }
      .pt-particle { background-color: var(--pt-primary-20); }
      .pt-shimmer {
        background: linear-gradient(to right, transparent, var(--pt-primary-10), transparent);
      }
      .pt-progress {
        background-image: linear-gradient(to right, var(--pt-primary), var(--pt-accent));
      }
      .pt-tab-active {
        background-image: linear-gradient(to right, var(--pt-primary), var(--pt-accent));
        color: #fff;
        box-shadow: 0 10px 25px -8px var(--pt-shadow);
      }
      .pt-btn-primary {
        background-image: linear-gradient(to right, var(--pt-primary), var(--pt-accent));
        color: #fff;
      }
      .pt-btn-primary:hover {
        filter: brightness(1.08);
      }
      .pt-dialog {
        background: linear-gradient(to bottom right, #0a0a12, #0a0a12, color-mix(in srgb, var(--pt-primary) 12%, #0a0a12));
        border-color: var(--pt-primary-30);
      }
      .pt-dialog-glow {
        background: linear-gradient(to right, var(--pt-primary-20), color-mix(in srgb, var(--pt-accent) 20%, transparent), var(--pt-primary-20));
      }
    `}</style>
  );
}
