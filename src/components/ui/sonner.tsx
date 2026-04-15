import type { ComponentProps } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

/**
 * Global Sonner — bottom-left, glass surfaces, soft semantic gradients.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-left"
      closeButton
      expand
      visibleToasts={5}
      gap={10}
      offset={20}
      style={{ zIndex: 260 }}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "group toast w-[min(100vw-2rem,22rem)] rounded-2xl backdrop-blur-2xl " +
            "border border-white/[0.1] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] " +
            "bg-[linear-gradient(145deg,hsl(222_22%_11%/0.96),hsl(222_25%_8%/0.98))] text-zinc-50 font-quicksand p-4",
          title: "font-semibold text-[15px] tracking-tight text-white leading-snug",
          description: "text-zinc-400 text-[13px] leading-relaxed mt-0.5",
          success:
            "!border-emerald-400/25 !bg-[linear-gradient(145deg,hsl(155_35%_12%/0.97),hsl(222_25%_8%/0.98))] " +
            "!text-emerald-50 [&_[data-icon]]:!text-emerald-400",
          error:
            "!border-rose-400/30 !bg-[linear-gradient(145deg,hsl(350_40%_14%/0.97),hsl(222_25%_8%/0.98))] " +
            "!text-rose-50 [&_[data-icon]]:!text-rose-400",
          info:
            "!border-sky-400/25 !bg-[linear-gradient(145deg,hsl(200_40%_14%/0.95),hsl(222_25%_8%/0.98))] " +
            "!text-sky-50",
          warning:
            "!border-amber-400/30 !bg-[linear-gradient(145deg,hsl(38_45%_14%/0.95),hsl(222_25%_8%/0.98))] " +
            "!text-amber-50",
          closeButton:
            "!left-auto !right-3 !top-3 !border-white/10 !bg-black/20 !text-zinc-400 hover:!bg-white/10 hover:!text-white rounded-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
