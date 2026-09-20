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
    <nav className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 py-1 select-none" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#0d7c85] bg-white border-slate-200 shadow-xs"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>

      <Badge variant="outline" className="h-8 px-3.5 gap-2 bg-white text-xs border-slate-200 shadow-xs max-w-full">
        <FileImage className="h-3.5 w-3.5 text-[#0d7c85] shrink-0" />
        <span className="font-mono font-semibold text-[#0f1e4a] truncate max-w-[260px]" title={currentImageName}>
          {currentImageName}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500 font-medium shrink-0">
          Image <strong className="text-[#0d7c85]">{currentIndex + 1}</strong> of {totalImages}
        </span>
      </Badge>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {getPages().map((p, idx) =>
            p === "ellipsis" ? (
              <span key={`el-${idx}`} className="px-1 text-xs text-slate-400 select-none font-mono">•••</span>
            ) : (
              <Button
                key={p}
                variant={p === currentIndex ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectPage(p)}
                className={`h-8 w-8 p-0 font-mono text-xs font-semibold ${
                  p === currentIndex ? "bg-[#0d7c85] text-white hover:bg-[#0d7c85]/90" : "bg-white text-slate-600"
                }`}
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
          className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#0d7c85] bg-white border-slate-200 shadow-xs"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
};
