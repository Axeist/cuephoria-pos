
import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface ResponsiveCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  footer?: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
}

export function ResponsiveCard({
  children,
  title,
  description,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName
}: ResponsiveCardProps) {
  const isMobile = useIsMobile()

  return (
    <Card className={cn(
      "w-full",
      isMobile ? "rounded-lg shadow-sm border-0 bg-card/50" : "rounded-xl shadow-md",
      className
    )}>
      {(title || description) && (
        <CardHeader className={cn(
          isMobile ? "p-4 pb-2" : "p-6 pb-3",
          headerClassName
        )}>
          {title && (
            <CardTitle className={cn(
              isMobile ? "text-lg" : "text-xl",
              "font-semibold"
            )}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={cn(
              isMobile ? "text-sm" : "text-base"
            )}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(
        isMobile ? "p-4 pt-0" : "p-6 pt-0",
        contentClassName
      )}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={cn(
          isMobile ? "p-4 pt-2" : "p-6 pt-3",
          footerClassName
        )}>
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
