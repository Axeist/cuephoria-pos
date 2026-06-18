
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const LARGE_MOBILE_BREAKPOINT = 480

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Initial check
    checkMobile()
    
    // Add event listener with debounce
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }
    
    checkTablet()
    
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkTablet, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return !!isTablet
}

export function useIsLargeMobile() {
  const [isLargeMobile, setIsLargeMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkLargeMobile = () => {
      setIsLargeMobile(window.innerWidth >= LARGE_MOBILE_BREAKPOINT && window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    checkLargeMobile()
    
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkLargeMobile, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return !!isLargeMobile
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
    
    checkDeviceType()
    
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkDeviceType, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return deviceType
}

// Helper function to make layout more responsive
export function useResponsiveLayout() {
  const deviceType = useDeviceType()
  const [columnCount, setColumnCount] = React.useState(3)
  const [containerWidth, setContainerWidth] = React.useState("100%")
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth
      setIsMobile(width < MOBILE_BREAKPOINT)
      
      if (width < 480) { // Small mobile
        setColumnCount(1)
        setContainerWidth("100%")
      } else if (width < 640) { // Large mobile
        setColumnCount(1)
        setContainerWidth("100%")
      } else if (width < 768) { // Small tablet
        setColumnCount(2)
        setContainerWidth("100%")
      } else if (width < 1024) { // Tablet
        setColumnCount(2)
        setContainerWidth("95%")
      } else { // Desktop
        setColumnCount(3)
        setContainerWidth("90%")
      }
    }
    
    updateLayout()
    
    // Add event listener with debounce
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateLayout, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [deviceType])
  
  return { columnCount, containerWidth, isMobile, deviceType }
}

// Hook for touch device detection
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false)

  React.useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }
    
    checkTouch()
  }, [])

  return isTouch
}

// Hook for safe area handling (notches, etc.)
export function useSafeArea() {
  const [safeArea, setSafeArea] = React.useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  })

  React.useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0')
      })
    }
    
    updateSafeArea()
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', updateSafeArea)
    return () => window.removeEventListener('orientationchange', updateSafeArea)
  }, [])

  return safeArea
}
