import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Global Sonner styling — dark glass, soft gradients on success/error.
 * Does not depend on next-themes so it always looks correct.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      closeButton
      expand
      gap={12}
      style={{ zIndex: 260 }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast backdrop-blur-xl border border-white/[0.12] shadow-2xl shadow-black/50 " +
            "bg-[hsl(225_22%_10%/0.92)] text-white font-quicksand",
          title: "font-semibold tracking-tight",
          description: "text-gray-400 text-[13px]",
          success:
            "!border-emerald-500/35 !bg-gradient-to-br !from-emerald-950/95 !to-[hsl(225_22%_9%/0.95)] " +
            "!text-emerald-50 [&_[data-icon]]:text-emerald-400",
          error:
            "!border-rose-500/40 !bg-gradient-to-br !from-rose-950/95 !to-[hsl(225_22%_9%/0.95)] " +
            "!text-rose-50 [&_[data-icon]]:text-rose-400",
          info:
            "!border-sky-500/30 !bg-gradient-to-br !from-sky-950/90 !to-[hsl(225_22%_9%/0.95)] " +
            "!text-sky-50",
          warning:
            "!border-amber-500/35 !bg-gradient-to-br !from-amber-950/90 !to-[hsl(225_22%_9%/0.95)] " +
            "!text-amber-50",
          closeButton: "!border-white/15 !bg-white/5 hover:!bg-white/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
