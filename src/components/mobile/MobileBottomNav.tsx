
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { Home, ShoppingCart, Package, Users, BarChart2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  
  const isAdmin = user?.isAdmin || false

  if (!isMobile || !user) return null

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'POS', path: '/pos' },
    { icon: Clock, label: 'Stations', path: '/stations' },
    { icon: Package, label: 'Products', path: '/products' },
    ...(isAdmin ? [{ icon: BarChart2, label: 'Reports', path: '/reports' }] : []),
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive && "text-primary"
              )} />
              <span className="text-xs font-medium truncate">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
