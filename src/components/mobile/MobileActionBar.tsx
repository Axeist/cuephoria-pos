import * as React from "react";
import { cn } from "@/lib/utils";

type MobileActionBarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Stack primary gradient buttons full-width on very narrow screens */
  stackPrimary?: boolean;
};

/**
 * Wrapping toolbar for page actions on mobile — prevents horizontal overflow.
 */
export function MobileActionBar({
  className,
  stackPrimary = false,
  children,
  ...props
}: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "mobile-action-bar",
        stackPrimary && "mobile-action-bar--stack-primary",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
