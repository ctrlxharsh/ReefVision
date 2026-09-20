import React from "react";
import { ChevronLeft, ChevronRight, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  // Generate page numbers to display with smart windowing
  const renderPageChips = () => {
    if (totalImages <= 1) return null;

    let pages: (number | "ellipsis")[] = [];

    if (totalImages <= 8) {
      pages = Array.from({ length: totalImages }, (_, i) => i);
    } else {
      // Windowing for large datasets
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
                className="px-1 text-xs text-slate-400 select-none"
              >
                •••
              </span>
            );
          }
          const isActive = p === currentIndex;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onSelectPage(p)}
              className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                isActive
                  ? "bg-[#0d7c85] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
              title={`Go to image ${p + 1}`}
            >
              {p + 1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <nav
      className="flex items-center justify-between w-full py-1 gap-3"
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
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Previous</span>
        </Button>
      </div>

      {/* Center: Current Image Badge */}
      <div className="flex items-center justify-center min-w-0">
        <div className="inline-flex items-center gap-2 bg-card border shadow-xs px-3.5 py-1.5 rounded-full text-xs max-w-full">
          <FileImage className="h-3.5 w-3.5 text-[#0d7c85] shrink-0" />
          <span
            className="font-mono font-semibold text-[#0f1e4a] truncate max-w-[240px]"
            title={currentImageName}
          >
            {currentImageName}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground shrink-0 font-medium">
            Image <strong className="text-[#0d7c85]">{currentIndex + 1}</strong> of {totalImages}
          </span>
        </div>
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
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </nav>
  );
};
