
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }, index) {
        return (
          <Toast 
            key={id} 
            {...props}
            variant={variant}
            style={{
              animationDelay: `${index * 100}ms`,
              transform: `translateY(${index * 4}px) translateX(${index * -2}px) scale(${1 - index * 0.02})`,
              zIndex: 1000 - index,
            }}
            className={`
              gaming-toast animate-slide-in-right transition-all duration-300 hover:scale-105 hover:z-[1001]
              ${variant === 'destructive' ? 'border-red-500/50' : ''}
              ${variant === 'success' ? 'border-green-500/50' : ''}
              backdrop-blur-sm
            `}
          >
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="font-orbitron text-sm font-semibold text-white flex items-center gap-2">
                  {variant === 'destructive' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                  {variant === 'success' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                  {!variant && <span className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"></span>}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="font-rajdhani text-sm text-gray-300">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-gray-400 hover:text-white transition-colors" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-4 right-4 z-[1000] flex flex-col-reverse max-h-screen w-full max-w-[420px] p-4 gap-2" />
    </ToastProvider>
  )
}
