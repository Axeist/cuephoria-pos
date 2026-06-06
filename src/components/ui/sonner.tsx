import type { ComponentProps } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      expand={false}
      visibleToasts={4}
      gap={10}
      offset={{ top: 72, right: 16 }}
      style={{ zIndex: 9999 }}
      toastOptions={{
        duration: 3800,
        classNames: {
          toast:
            "group toast w-[min(100vw-2rem,20rem)] rounded-xl backdrop-blur-2xl " +
            "border border-white/[0.08] shadow-[0_8px_32px_-6px_rgba(0,0,0,0.5)] " +
            "bg-[linear-gradient(165deg,color-mix(in_oklab,var(--brand-primary-hex)_16%,rgba(255,255,255,0.05))_0%,rgba(6,4,14,0.95)_100%)] " +
            "text-zinc-50 font-quicksand !p-3 !pl-3.5 !pr-9 relative animate-notification-pop",
          title: "font-semibold text-[13px] tracking-tight text-white leading-snug font-heading",
          description: "text-zinc-400 text-[12px] leading-relaxed mt-0.5",
          success:
            "!border-emerald-500/25 !bg-[linear-gradient(165deg,color-mix(in_oklab,#10b981_14%,rgba(255,255,255,0.04))_0%,rgba(6,4,14,0.95)_100%)] " +
            "!text-emerald-50 [&_[data-icon]]:!text-emerald-400",
          error:
            "!border-rose-500/25 !bg-[linear-gradient(165deg,color-mix(in_oklab,#f43f5e_14%,rgba(255,255,255,0.04))_0%,rgba(6,4,14,0.95)_100%)] " +
            "!text-rose-50 [&_[data-icon]]:!text-rose-400",
          info:
            "!border-cuephoria-lightpurple/25 !bg-[linear-gradient(165deg,color-mix(in_oklab,var(--brand-primary-hex)_18%,rgba(255,255,255,0.05))_0%,rgba(6,4,14,0.95)_100%)] " +
            "!text-sky-50",
          warning:
            "!border-amber-400/25 !bg-[linear-gradient(165deg,color-mix(in_oklab,#f59e0b_14%,rgba(255,255,255,0.04))_0%,rgba(6,4,14,0.95)_100%)] " +
            "!text-amber-50",
          closeButton:
            "!static !ml-auto !mt-0 !-mr-5 shrink-0 !border-0 !bg-transparent !text-zinc-500 " +
            "hover:!text-white !rounded-md !h-5 !w-5 !right-2.5 !top-2.5 !absolute",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
