
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarGroup = ({ children, className }: SidebarGroupProps) => {
  return <div className={cn("mb-4", className)}>{children}</div>;
};

export const SidebarGroupLabel = ({ children }: { children: React.ReactNode }) => {
  return <h3 className="font-medium text-sm mb-2">{children}</h3>;
};

export const SidebarGroupContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="space-y-2">{children}</div>;
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  action?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
  action
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("border rounded-md", className)}
    >
      <div className="flex items-center w-full">
        <CollapsibleTrigger className="flex items-center justify-between flex-1 p-3 text-sm font-medium">
          <span>{title}</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "transform rotate-90"
            )}
          />
        </CollapsibleTrigger>
        {action && <div className="pr-2">{action}</div>}
      </div>
      <CollapsibleContent className="px-3 pb-3 pt-0">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
      <CollapsibleContent className="px-3 pb-3 pt-0">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleSection;
