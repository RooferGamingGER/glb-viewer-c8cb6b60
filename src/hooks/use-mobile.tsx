
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Check for mobile devices using matchMedia
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Check for mobile devices using user agent as a fallback
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      return mql.matches || isMobileDevice;
    };
    
    const onChange = () => {
      setIsMobile(checkIfMobile());
    }
    
    // Set initial value
    setIsMobile(checkIfMobile());
    
    // Add event listener for window resize
    mql.addEventListener("change", onChange);
    
    // Also check on orientation change for mobile devices
    window.addEventListener("orientationchange", onChange);
    
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [])

  return isMobile
}
