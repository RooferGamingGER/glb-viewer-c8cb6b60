
import * as React from "react";
import { useIsMobile } from "./use-mobile";

type Orientation = "portrait" | "landscape" | undefined;

const TABLET_MAX_WIDTH = 1024;

export function useScreenOrientation() {
  const [orientation, setOrientation] = React.useState<Orientation>(undefined);
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);
  const isMobileUA = useIsMobile();

  React.useEffect(() => {
    const update = () => {
      setWindowWidth(window.innerWidth);
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

  // Treat as mobile/tablet if either UA says mobile OR viewport is narrow enough (≤1024px)
  const isNarrowViewport = windowWidth <= TABLET_MAX_WIDTH;
  const isMobileOrTablet = isMobileUA || isNarrowViewport;

  // Tablet: narrow viewport between 601-1024px, or UA-detected mobile with min dimension > 600
  const isTablet = isMobileOrTablet && (
    (!isMobileUA && isNarrowViewport && windowWidth > 600) ||
    (isMobileUA && Math.min(window.innerWidth, window.innerHeight) > 600)
  );

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
