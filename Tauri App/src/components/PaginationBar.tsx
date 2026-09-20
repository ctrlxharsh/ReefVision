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
  const getPages = () => {
    if (totalImages <= 1) return [];
    if (totalImages <= 8) return Array.from({ length: totalImages }, (_, i) => i);
    const pages: (number | "ellipsis")[] = [0];
    const left = Math.max(1, currentIndex - 1);
    const right = Math.min(totalImages - 2, currentIndex + 1);
    if (left > 1) pages.push("ellipsis");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalImages - 2) pages.push("ellipsis");
    pages.push(totalImages - 1);
    return pages;
  };

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 px-4 py-2 rounded-xl border border-border/80 bg-card shadow-xs select-none"
      aria-label="Gallery Navigation"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 max-w-full">
        <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
        <span
          className="font-mono text-xs font-medium text-foreground truncate max-w-[280px]"
          title={currentImageName}
        >
          {currentImageName}
        </span>
        <span className="text-muted-foreground/40">•</span>
        <span className="text-xs text-muted-foreground font-medium shrink-0">
          <strong className="text-foreground font-semibold">{currentIndex + 1}</strong> of {totalImages}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {getPages().map((p, idx) =>
            p === "ellipsis" ? (
              <span key={`el-${idx}`} className="px-1 text-xs text-muted-foreground select-none font-mono">
                •••
              </span>
            ) : (
              <Button
                key={p}
                variant={p === currentIndex ? "default" : "ghost"}
                size="sm"
                onClick={() => onSelectPage(p)}
                className="h-8 w-8 p-0 font-mono text-xs font-semibold rounded-md"
              >
                {p + 1}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex >= totalImages - 1}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
