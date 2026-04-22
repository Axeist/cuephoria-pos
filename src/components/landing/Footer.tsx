import { useNavigate } from "react-router-dom";
import {
  Code2,
  Gamepad2,
  Instagram,
  Linkedin,
  Mail,
  Sparkles,
  Twitter,
  Youtube,
} from "lucide-react";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const columns: {
    title: string;
    links: { label: string; onClick?: () => void; href?: string }[];
  }[] = [
    {
      title: "Product",
      links: [
        { label: "Modules", onClick: () => scrollTo("modules") },
        { label: "Workflow", onClick: () => scrollTo("workflow") },
        { label: "Pricing", onClick: () => scrollTo("pricing") },
        { label: "Security", onClick: () => scrollTo("trust") },
        { label: "Compare", onClick: () => navigate("/compare") },
        { label: "FAQ", onClick: () => scrollTo("faq") },
      ],
    },
    {
      title: "Portals",
      links: [
        { label: "Workspace admin", onClick: () => navigate("/login") },
        { label: "Customer", onClick: () => navigate("/customer/login") },
        { label: "Cafe", onClick: () => navigate("/cafe/login") },
        { label: "Platform admin", onClick: () => navigate("/platform/login") },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Contact", onClick: () => navigate("/contact") },
        { label: "Cuephoria Venues", href: "https://cuephoria.in" },
        { label: "Cuephoria Tech", href: "https://cuephoriatech.in" },
        { label: "Book a call", onClick: () => scrollTo("book-call") },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", onClick: () => navigate("/terms") },
        { label: "Privacy Policy", onClick: () => navigate("/privacy") },
        { label: "Refund & Cancellation", onClick: () => navigate("/refund-policy") },
        { label: "Acceptable Use", onClick: () => navigate("/acceptable-use") },
        { label: "Cookie Policy", onClick: () => navigate("/cookies") },
        { label: "Service Delivery", onClick: () => navigate("/shipping-and-delivery") },
      ],
    },
  ];

  const socials = [
    { icon: Instagram, label: "Instagram", href: "https://instagram.com/cuephoria" },
    { icon: Twitter, label: "X (Twitter)", href: "https://twitter.com/cuetronix" },
    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/company/cuephoria" },
    { icon: Youtube, label: "YouTube", href: "https://youtube.com/@cuephoria" },
    { icon: Mail, label: "Email us", href: "mailto:hello@cuetronix.com" },
  ];

  return (
    <footer className="relative z-10 mt-24 pb-6 sm:pb-8">
      {/* Ambient glow beneath the footer — bleeds into the page */}
      <div className="pointer-events-none absolute inset-x-0 -top-28 h-56 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-72 w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
          style={{
            background:
              "radial-gradient(closest-side, rgba(124,58,237,0.18), rgba(236,72,153,0.10) 45%, transparent 75%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 sm:px-5">
        {/* Advanced glass container */}
        <div
          className="relative overflow-hidden rounded-[28px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,12,38,0.55) 0%, rgba(12,7,24,0.7) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            boxShadow:
              "0 30px 80px -30px rgba(124,58,237,0.4), 0 10px 30px -10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Top shine */}
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
            }}
          />

          {/* Inner radial tints */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(800px 300px at 15% 0%, rgba(167,139,250,0.14), transparent 60%)," +
                "radial-gradient(700px 280px at 85% 100%, rgba(236,72,153,0.10), transparent 65%)",
            }}
          />

          <div className="relative px-6 sm:px-10">
            {/* Brand + link columns */}
            <div className="grid gap-10 py-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.5fr_0.6fr_0.6fr_0.6fr_0.6fr] lg:py-14">
              {/* Brand */}
              <div className="max-w-sm sm:col-span-2 md:col-span-4 lg:col-span-1">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-violet-600/40">
                    <Gamepad2 size={17} className="text-white" />
                    <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/25 to-transparent" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">
                    Cue
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      tronix
                    </span>
                  </span>
                </div>

                {/* Built-by strip — glass card with two "credits" */}
                <div
                  className="mb-5 overflow-hidden rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(236,72,153,0.10) 55%, rgba(59,130,246,0.10) 100%)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(18px) saturate(160%)",
                    WebkitBackdropFilter: "blur(18px) saturate(160%)",
                    boxShadow:
                      "0 10px 30px -14px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Engineered by */}
                  <a
                    href="https://cuephoriatech.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Engineered by Cuephoria Tech"
                    className="group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-md shadow-violet-900/40"
                      style={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
                      }}
                    >
                      <Code2 size={14} className="text-white" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        Engineered by
                      </span>
                      <span className="block text-sm font-bold tracking-tight bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                        Cuephoria&nbsp;Tech
                      </span>
                    </span>
                    <Sparkles
                      size={12}
                      className="text-fuchsia-300/70 transition-transform group-hover:scale-110"
                    />
                  </a>

                  {/* Divider */}
                  <div
                    className="mx-3.5 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                    }}
                  />

                  {/* Proven at */}
                  <a
                    href="https://cuephoria.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Proven at Cuephoria Gaming Lounge"
                    className="group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-md shadow-fuchsia-900/40"
                      style={{
                        background:
                          "linear-gradient(135deg, #ec4899 0%, #f472b6 60%, #fb7185 100%)",
                      }}
                    >
                      <Gamepad2 size={14} className="text-white" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        Proven live at
                      </span>
                      <span className="block text-sm font-bold tracking-tight text-white/90">
                        Cuephoria Gaming Lounge
                      </span>
                    </span>
                    <span className="relative flex h-2 w-2 flex-shrink-0 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                    </span>
                  </a>
                </div>

                <p className="text-sm leading-relaxed text-gray-400">
                  The billing software for snooker halls, 8-ball rooms and gaming centres.
                  Bookings, POS, loyalty, tournaments and multi-branch reports — engineered by{" "}
                  <a
                    href="https://cuephoriatech.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white"
                  >
                    Cuephoria Tech
                  </a>{" "}
                  and battle-tested at{" "}
                  <a
                    href="https://cuephoria.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white"
                  >
                    Cuephoria Gaming Lounge
                  </a>.
                </p>

                <div className="mt-5 flex items-center gap-2">
                  {socials.map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      aria-label={label}
                      className="group flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.07] hover:text-white"
                    >
                      <Icon size={14} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    {col.title}
                  </p>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.href ? (
                          <a
                            href={link.href}
                            target={link.href.startsWith("http") ? "_blank" : undefined}
                            rel={
                              link.href.startsWith("http") ? "noopener noreferrer" : undefined
                            }
                            className="text-sm text-gray-400 transition-colors hover:text-white"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={link.onClick}
                            className="text-left text-sm text-gray-400 transition-colors hover:text-white"
                          >
                            {link.label}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
              }}
            />

            {/* Legal strip */}
            <div className="flex flex-col items-start justify-between gap-3 py-5 text-sm md:flex-row md:items-center md:py-6">
              <p className="text-gray-500">
                © {new Date().getFullYear()} Cuetronix · A{" "}
                <a
                  href="https://cuephoriatech.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  Cuephoria Tech
                </a>{" "}
                product · Made in India
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="relative flex h-1.5 w-1.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                </span>
                All systems operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
