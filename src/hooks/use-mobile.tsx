
import * as React from "react"

/**
 * Detects whether the current device is a touch device (phone/tablet)
 * by combining multiple hardware signals and the User-Agent string.
 *
 * Returns true if the UA is clearly mobile OR at least 2 of 3 hardware
 * signals (touch points, coarse pointer, no hover) are present.
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // Signal 1: Touch points available
  const hasTouch =
    (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0) ||
    "ontouchstart" in window;

  // Signal 2: Coarse pointer (finger, not mouse)
  const hasCoarsePointer =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  // Signal 3: No hover capability
  const hasNoHover =
    window.matchMedia?.("(hover: none)")?.matches ?? false;

  // Signal 4: User-Agent
  const userAgent =
    (navigator.userAgent || (navigator as any).vendor || (window as any).opera || "").toLowerCase();
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  // Clear mobile case
  if (isMobileUA) return true;

  // At least 2 of 3 hardware signals → touch device
  let signals = 0;
  if (hasTouch) signals++;
  if (hasCoarsePointer) signals++;
  if (hasNoHover) signals++;

  return signals >= 2;
}

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => isTouchDevice())

  React.useEffect(() => {
    const update = () => {
      setIsMobile(isTouchDevice());
    };

    // Re-check on orientation change (relevant for mobile devices)
    window.addEventListener("orientationchange", update);

    // Also listen to pointer/hover media-query changes (e.g. docking a tablet)
    const pointerMql = window.matchMedia?.("(pointer: coarse)");
    const hoverMql = window.matchMedia?.("(hover: none)");

    pointerMql?.addEventListener?.("change", update);
    hoverMql?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("orientationchange", update);
      pointerMql?.removeEventListener?.("change", update);
      hoverMql?.removeEventListener?.("change", update);
    };
  }, [])

  return isMobile
}
