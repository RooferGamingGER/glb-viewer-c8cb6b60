
import * as React from "react";
import { useIsMobile } from "./use-mobile";

type Orientation = "portrait" | "landscape" | undefined;

export function useScreenOrientation() {
  const [orientation, setOrientation] = React.useState<Orientation>(undefined);
  const isMobileOrTablet = useIsMobile(); // touch-based detection

  React.useEffect(() => {
    const update = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation("portrait");
      } else {
        setOrientation("landscape");
      }
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    if (screen.orientation) {
      screen.orientation.addEventListener("change", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", update);
      }
    };
  }, []);

  // Fallback: even on non-touch devices, if viewport is very narrow
  // and in portrait orientation, force mobile UI so the sidebar fits
  const FORCE_MOBILE_WIDTH = 600;
  const isNarrowPortrait =
    !isMobileOrTablet &&
    orientation === "portrait" &&
    window.innerWidth <= FORCE_MOBILE_WIDTH;

  const effectiveMobile = isMobileOrTablet || isNarrowPortrait;

  // Tablet: touch device with smallest side > 600px
  const isTablet =
    isMobileOrTablet &&
    Math.min(window.innerWidth, window.innerHeight) > 600;

  const isPhone = effectiveMobile && !isTablet;
  const isPortrait = orientation === "portrait";

  return {
    orientation: effectiveMobile ? orientation : "landscape",
    isPortrait: effectiveMobile && isPortrait,
    isLandscape: !effectiveMobile || !isPortrait,
    isTablet,
    isPhone,
  };
}
