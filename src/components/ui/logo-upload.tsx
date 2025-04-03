
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert("Die Datei ist zu groß. Maximale Größe: 500KB");
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center border-2 border-dashed rounded-md p-4 w-full h-[100px] transition-colors",
          isHovering ? "border-primary bg-primary/5" : "border-gray-300",
          value ? "bg-gray-50" : "bg-white"
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Company logo"
              className="max-h-full max-w-full object-contain mx-auto"
            />
            <button
              type="button"
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 transform translate-x-1/2 -translate-y-1/2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-gray-500">
            <Image className="h-10 w-10" />
            <span className="text-sm">Logo hier ablegen oder auswählen</span>
          </div>
        )}

        <input
          type="file"
          accept="image/png, image/jpeg, image/svg+xml"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
      </div>
      <div className="text-xs text-gray-500">
        Unterstützte Formate: PNG, JPEG, SVG (max. 500KB)
      </div>
    </div>
  );
};

export { LogoUpload };
