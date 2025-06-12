
import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

export function ResponsiveGrid({ 
  children, 
  className, 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 4, tablet: 6, desktop: 6 }
}: ResponsiveGridProps) {
  const isMobile = useIsMobile()

  const gridClasses = cn(
    "grid w-full",
    // Mobile first approach
    `grid-cols-${cols.mobile || 1}`,
    `gap-${gap.mobile || 4}`,
    // Tablet
    `md:grid-cols-${cols.tablet || 2}`,
    `md:gap-${gap.tablet || 6}`,
    // Desktop
    `lg:grid-cols-${cols.desktop || 3}`,
    `lg:gap-${gap.desktop || 6}`,
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: boolean
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = "2xl",
  padding = true
}: ResponsiveContainerProps) {
  const isMobile = useIsMobile()

  const containerClasses = cn(
    "w-full mx-auto",
    maxWidth === "sm" && "max-w-sm",
    maxWidth === "md" && "max-w-md",
    maxWidth === "lg" && "max-w-lg",
    maxWidth === "xl" && "max-w-xl",
    maxWidth === "2xl" && "max-w-2xl",
    maxWidth === "full" && "max-w-full",
    padding && (isMobile ? "px-4 py-4" : "px-6 py-6"),
    className
  )

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}
