import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Responsive modal shell.
 *
 * Uses **viewport width** (<768px) to pick sheet vs centered dialog.
 * View-mode preference (mobile UI density) does not change modal placement —
 * otherwise desktop users in "mobile" mode get left-aligned sheets.
 *
 * - `className` / `desktopClassName` → centered dialog (desktop viewport only)
 * - `mobileClassName` → sheet / fullscreen (narrow viewport only)
 */

type MobileVariant = "sheet-bottom" | "sheet-right" | "fullscreen";

interface ResponsiveDialogContextValue {
  isMobile: boolean;
  mobileVariant: MobileVariant;
}

const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialogContext(): ResponsiveDialogContextValue {
  const ctx = React.useContext(ResponsiveDialogContext);
  if (ctx) return ctx;
  return { isMobile: false, mobileVariant: "sheet-bottom" };
}

interface ResponsiveDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileVariant?: MobileVariant;
  children: React.ReactNode;
}

const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  mobileVariant = "sheet-bottom",
  children,
  ...rootProps
}) => {
  const isMobile = useIsMobile();

  const ctx = React.useMemo<ResponsiveDialogContextValue>(
    () => ({ isMobile, mobileVariant }),
    [isMobile, mobileVariant],
  );

  const Root = isMobile ? Sheet : Dialog;

  return (
    <ResponsiveDialogContext.Provider value={ctx}>
      <Root {...rootProps}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  );
};

const ResponsiveDialogTrigger: React.FC<
  React.ComponentProps<typeof DialogTrigger>
> = (props) => {
  const { isMobile } = useResponsiveDialogContext();
  const Trigger = isMobile ? SheetTrigger : DialogTrigger;
  return <Trigger {...props} />;
};

const ResponsiveDialogClose: React.FC<
  React.ComponentProps<typeof DialogClose>
> = (props) => {
  const { isMobile } = useResponsiveDialogContext();
  const Close = isMobile ? SheetClose : DialogClose;
  return <Close {...props} />;
};

interface ResponsiveDialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  hideCloseButton?: boolean;
  mobileClassName?: string;
  desktopClassName?: string;
}

const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  ResponsiveDialogContentProps
>(
  (
    {
      className,
      mobileClassName,
      desktopClassName,
      hideCloseButton,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, mobileVariant } = useResponsiveDialogContext();

    if (!isMobile) {
      return (
        <DialogContent
          ref={ref}
          className={cn(className, desktopClassName)}
          {...props}
        >
          {children}
        </DialogContent>
      );
    }

    if (mobileVariant === "sheet-right") {
      return (
        <SheetContent
          ref={ref as React.Ref<HTMLDivElement>}
          side="right"
          className={cn(
            "w-[92vw] sm:w-[420px] sm:max-w-[92vw] p-0 flex flex-col overflow-hidden",
            "border-l border-white/10 bg-[color:hsl(var(--card))]/95 backdrop-blur-2xl",
            mobileClassName,
          )}
          {...props}
        >
          <div
            className="flex-1 overflow-y-auto"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            {children}
          </div>
        </SheetContent>
      );
    }

    if (mobileVariant === "fullscreen") {
      return (
        <SheetContent
          ref={ref as React.Ref<HTMLDivElement>}
          side="bottom"
          className={cn(
            "inset-0 top-0 h-[100dvh] w-full max-w-none rounded-none border-0 p-0",
            "bg-[color:hsl(var(--card))]/95 backdrop-blur-2xl flex flex-col overflow-hidden",
            mobileClassName,
          )}
          {...props}
        >
          <div
            className="flex-1 overflow-y-auto"
            style={{
              paddingTop: "max(0.5rem, env(safe-area-inset-top))",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            {children}
          </div>
        </SheetContent>
      );
    }

    return (
      <SheetContent
        ref={ref as React.Ref<HTMLDivElement>}
        side="bottom"
        className={cn(
          "p-0 max-h-[90dvh] flex flex-col overflow-hidden",
          "rounded-t-3xl border-t border-x border-white/10",
          "bg-[color:hsl(var(--card))]/95 backdrop-blur-2xl",
          "[&>button.absolute]:hidden",
          mobileClassName,
        )}
        {...props}
      >
        <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
          <div
            aria-hidden
            className="h-1.5 w-12 rounded-full bg-white/20"
          />
        </div>
        {!hideCloseButton ? (
          <SheetClose
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </SheetClose>
        ) : null}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </SheetContent>
    );
  },
);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

const ResponsiveDialogHeader: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const { isMobile } = useResponsiveDialogContext();
  if (!isMobile) return <DialogHeader className={className} {...props} />;
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-5 pt-5 pb-3 text-left",
        className,
      )}
      {...props}
    />
  );
};

const ResponsiveDialogFooter: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const { isMobile } = useResponsiveDialogContext();
  if (!isMobile) return <DialogFooter className={className} {...props} />;
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-2 border-t border-white/10 px-5 py-4",
        "bg-[color:hsl(var(--card))]/85 backdrop-blur-md",
        className,
      )}
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      {...props}
    />
  );
};

const ResponsiveDialogTitle: React.FC<
  React.ComponentProps<typeof DialogTitle>
> = (props) => {
  const { isMobile } = useResponsiveDialogContext();
  return isMobile ? <SheetTitle {...props} /> : <DialogTitle {...props} />;
};

const ResponsiveDialogDescription: React.FC<
  React.ComponentProps<typeof DialogDescription>
> = (props) => {
  const { isMobile } = useResponsiveDialogContext();
  return isMobile ? (
    <SheetDescription {...props} />
  ) : (
    <DialogDescription {...props} />
  );
};

const ResponsiveDialogBody: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const { isMobile } = useResponsiveDialogContext();
  return (
    <div
      className={cn(isMobile ? "px-5 pb-5" : "", className)}
      {...props}
    />
  );
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
};
