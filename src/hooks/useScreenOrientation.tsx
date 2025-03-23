
import * as React from "react";
import { useIsMobile } from "./use-mobile";

type Orientation = "portrait" | "landscape" | undefined;

export function useScreenOrientation() {
  const [orientation, setOrientation] = React.useState<Orientation>(undefined);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    const updateOrientation = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation("portrait");
      } else {
        setOrientation("landscape");
      }
    };

    // Set initial orientation
    updateOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    // Add event listener for screen orientation API if available
    if (screen.orientation) {
      screen.orientation.addEventListener("change", updateOrientation);
    }

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", updateOrientation);
      }
    };
  }, []);

  // Only return orientation status if it's a mobile device
  return {
    orientation: isMobile ? orientation : "landscape",
    isPortrait: isMobile && orientation === "portrait",
    isLandscape: !isMobile || orientation === "landscape",
  };
}
