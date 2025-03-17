
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check for mobile devices using matchMedia
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Check for mobile devices using user agent as a fallback
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Also check screen size as an additional factor
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      
      return mql.matches || isMobileDevice || isSmallScreen;
    };
    
    const onChange = () => {
      setIsMobile(checkIfMobile());
    }
    
    // Add event listeners for both resize and orientation change
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    
    // Initial check
    setIsMobile(checkIfMobile());
    
    // Cleanup listeners on component unmount
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [])

  return !!isMobile
}
