import React from "react";
import { ChevronLeft, ChevronRight, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaginationBarProps {
  currentIndex: number;
  totalImages: number;
  currentImageName: string;
  onPrev: () => void;
  onNext: () => void;
  onSelectPage: (index: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentIndex,
  totalImages,
  currentImageName,
  onPrev,
  onNext,
  onSelectPage,
}) => {
  const renderPageChips = () => {
    if (totalImages <= 1) return null;

    let pages: (number | "ellipsis")[] = [];

    if (totalImages <= 8) {
      pages = Array.from({ length: totalImages }, (_, i) => i);
    } else {
      const left = Math.max(0, currentIndex - 2);
      const right = Math.min(totalImages - 1, currentIndex + 2);

      pages.push(0);
      if (left > 1) pages.push("ellipsis");

      for (let i = Math.max(1, left); i <= Math.min(totalImages - 2, right); i++) {
        pages.push(i);
      }

      if (right < totalImages - 2) pages.push("ellipsis");
      pages.push(totalImages - 1);
    }

    return (
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 text-xs text-slate-400 select-none font-mono"
              >
                •••
              </span>
            );
          }
          const isActive = p === currentIndex;
          return (
            <Button
              key={p}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPage(p)}
              className={`h-8 w-8 p-0 font-mono text-xs font-semibold ${
                isActive
                  ? "bg-[#0d7c85] text-white hover:bg-[#0d7c85]/90 shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
              title={`Go to image ${p + 1}`}
            >
              {p + 1}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <nav
      className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 py-1 select-none"
      aria-label="Image Navigation"
    >
      {/* Left: Previous Button */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
          title="Previous image (←)"
          className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#0d7c85] bg-white border-slate-200 shadow-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
      </div>

      {/* Center: Current Image Badge */}
      <div className="flex items-center justify-center min-w-0">
        <Badge
          variant="outline"
          className="h-8 px-3.5 py-0 gap-2 bg-white text-xs border-slate-200 shadow-xs max-w-full"
        >
          <FileImage className="h-3.5 w-3.5 text-[#0d7c85] shrink-0" />
          <span
            className="font-mono font-semibold text-[#0f1e4a] truncate max-w-[260px]"
            title={currentImageName}
          >
            {currentImageName}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium shrink-0">
            Image <strong className="text-[#0d7c85]">{currentIndex + 1}</strong> of {totalImages}
          </span>
        </Badge>
      </div>

      {/* Right: Page Chips + Next Button */}
      <div className="flex items-center gap-2">
        {renderPageChips()}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex >= totalImages - 1}
          title="Next image (→)"
          className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#0d7c85] bg-white border-slate-200 shadow-xs"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
};
