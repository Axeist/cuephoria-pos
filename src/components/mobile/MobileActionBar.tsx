import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MobileActionBarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Stack primary gradient buttons full-width on very narrow screens */
  stackPrimary?: boolean;
  /**
   * When set, visible children count is limited; extras render in an overflow menu.
   * Pass action elements with `data-mobile-action-label` for menu text.
   */
  maxVisible?: number;
  overflowItems?: React.ReactNode;
};

/**
 * Wrapping toolbar for page actions on mobile — prevents horizontal overflow.
 */
export function MobileActionBar({
  className,
  stackPrimary = false,
  maxVisible,
  overflowItems,
  children,
  ...props
}: MobileActionBarProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);
  const hasOverflow =
    (maxVisible != null && childArray.length > maxVisible) || overflowItems;

  const visible =
    maxVisible != null ? childArray.slice(0, maxVisible) : childArray;
  const hidden =
    maxVisible != null ? childArray.slice(maxVisible) : [];

  return (
    <div
      className={cn(
        "mobile-action-bar",
        stackPrimary && "mobile-action-bar--stack-primary",
        className,
      )}
      {...props}
    >
      {visible}
      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 touch-manipulation"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="flex flex-col gap-1 min-w-[10rem] p-2"
          >
            {hidden}
            {overflowItems}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
