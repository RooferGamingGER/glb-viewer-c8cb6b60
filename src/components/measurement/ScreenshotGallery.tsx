
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, MoveUp, MoveDown } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScreenshotGalleryProps {
  screenshots: string[];
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({
  screenshots,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  if (screenshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground italic">
        Keine Screenshots vorhanden
      </div>
    );
  }

  return (
    <ScrollArea className="h-60 w-full">
      <div className="grid grid-cols-1 gap-3 p-1">
        {screenshots.map((screenshot, index) => (
          <div 
            key={index} 
            className="relative group border rounded-md overflow-hidden"
          >
            <img 
              src={screenshot} 
              alt={`Screenshot ${index + 1}`} 
              className="w-full object-cover h-32"
            />
            
            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => onDelete(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Löschen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {index > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => onMoveUp(index)}
                      >
                        <MoveUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nach oben</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {index < screenshots.length - 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => onMoveDown(index)}
                      >
                        <MoveDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nach unten</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ScreenshotGallery;
