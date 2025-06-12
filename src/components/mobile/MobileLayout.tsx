
import React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileHeader } from './MobileHeader'
import { MobileBottomNav } from './MobileBottomNav'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  title: string
  headerActions?: React.ReactNode
  showUser?: boolean
  className?: string
  noPadding?: boolean
}

export function MobileLayout({ 
  children, 
  title, 
  headerActions,
  showUser = true,
  className,
  noPadding = false
}: MobileLayoutProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <div className={cn("container mx-auto", !noPadding && "px-4 py-6", className)}>
        {/* Desktop Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold gradient-text font-heading">
            {title}
          </h1>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader 
        title={title} 
        actions={headerActions}
        showUser={showUser}
      />
      
      <main className={cn(
        "pb-20", // Space for bottom nav
        !noPadding && "px-4 py-4",
        className
      )}>
        {children}
      </main>
      
      <MobileBottomNav />
    </div>
  )
}
