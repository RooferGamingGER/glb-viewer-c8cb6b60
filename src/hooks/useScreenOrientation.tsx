
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

  // Tablet: touch device with smallest side > 600px
  const isTablet =
    isMobileOrTablet &&
    Math.min(window.innerWidth, window.innerHeight) > 600;

  const isPhone = isMobileOrTablet && !isTablet;
  const isPortrait = orientation === "portrait";

  return {
    orientation: isMobileOrTablet ? orientation : "landscape",
    isPortrait: isMobileOrTablet && isPortrait,
    isLandscape: !isMobileOrTablet || !isPortrait,
    isTablet,
    isPhone,
  };
}
