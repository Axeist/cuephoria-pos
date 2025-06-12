
import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  title: string
  actions?: React.ReactNode
  showUser?: boolean
}

export function MobileHeader({ title, actions, showUser = true }: MobileHeaderProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  return (
    <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold gradient-text font-heading">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {actions && (
            <div className="flex items-center gap-1">
              {actions}
            </div>
          )}
          
          {showUser && user && (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
              {user.isAdmin ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{user.username}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
