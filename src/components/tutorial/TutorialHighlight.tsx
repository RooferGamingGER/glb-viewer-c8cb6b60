
import React from 'react';
import { cn } from '@/lib/utils';

interface TutorialHighlightProps {
  targetRef: React.RefObject<HTMLElement>;
  active: boolean;
  children?: React.ReactNode;
  className?: string;
}

const TutorialHighlight: React.FC<TutorialHighlightProps> = ({ 
  targetRef,
  active,
  children,
  className
}) => {
  const [position, setPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0
  });

  React.useEffect(() => {
    if (!active || !targetRef.current) return;

    const updatePosition = () => {
      if (!targetRef.current) return;
      
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [active, targetRef]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "fixed z-[60] pointer-events-none",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        height: `${position.height}px`
      }}
    >
      <div className="absolute inset-0 border-2 border-primary rounded animate-pulse" />
      {children}
    </div>
  );
};

export default TutorialHighlight;
