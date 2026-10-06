import React from "react";
import { ChevronLeft, ChevronRight, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  currentIndex: number;
  totalImages: number;
  currentImageName: string;
  imageNames?: string[];
  itemStatuses?: Record<string, "pending" | "processing" | "completed" | "error" | "cancelled">;
  onPrev: () => void;
  onNext: () => void;
  onSelectPage: (index: number) => void;
}

/**
 * Truncates filename in the middle with ellipsis (e.g. imgdsas....jpg)
 * preserving the file extension and prefix when it exceeds maxLen.
 */
export function truncateMiddle(filename: string, maxLen: number = 48): string {
  if (!filename || filename.length <= maxLen) return filename;

  const extIdx = filename.lastIndexOf(".");
  const ext = extIdx > 0 ? filename.slice(extIdx) : "";
  const base = extIdx > 0 ? filename.slice(0, extIdx) : filename;

  const available = maxLen - ext.length - 3; // 3 for "..."
  if (available <= 6) {
    return `${base.slice(0, 6)}...${ext}`;
  }

  const front = Math.ceil(available / 2);
  const back = Math.floor(available / 2);

  return `${base.slice(0, front)}...${base.slice(-back)}${ext}`;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentIndex,
  totalImages,
  currentImageName,
  imageNames = [],
  itemStatuses = {},
  onPrev,
  onNext,
  onSelectPage,
}) => {
  // Earlier pages before currentIndex: show all if under threshold, only collapse if very long
  const getLeftPages = (): (number | "ellipsis")[] => {
    if (currentIndex <= 0 || totalImages <= 1) return [];
    if (totalImages <= 12 || currentIndex <= 5) {
      return Array.from({ length: currentIndex }, (_, i) => i);
    }
    return [0, "ellipsis", currentIndex - 2, currentIndex - 1];
  };

  // Later pages after currentIndex: show all if under threshold, only collapse if very long
  const getRightPages = (): (number | "ellipsis")[] => {
    if (currentIndex >= totalImages - 1 || totalImages <= 1) return [];
    const remaining = totalImages - 1 - currentIndex;
    if (totalImages <= 12 || remaining <= 5) {
      return Array.from({ length: remaining }, (_, i) => currentIndex + 1 + i);
    }
    return [
      currentIndex + 1,
      currentIndex + 2,
      "ellipsis",
      totalImages - 1,
    ];
  };

  const leftPages = getLeftPages();
  const rightPages = getRightPages();

  const renderPageButton = (p: number) => {
    const imgName = imageNames[p];
    const status = imgName ? itemStatuses[imgName] : undefined;
    const isCurrent = p === currentIndex;

    return (
      <Button
        key={p}
        variant={isCurrent ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onSelectPage(p)}
        title={
          imgName
            ? `${imgName} (${status || "ready"})`
            : `Image ${p + 1}`
        }
        className={`relative h-8 min-w-8 px-1.5 font-mono text-xs font-semibold rounded-md transition-all ${
          isCurrent
            ? "bg-primary/10 text-primary border border-primary/30 shadow-2xs font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <span>{p + 1}</span>
        {status === "completed" && (
          <span
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 border border-background"
            title="Processing completed"
          />
        )}
        {status === "processing" && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
          </span>
        )}
        {status === "pending" && (
          <span
            className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-slate-300 border border-background"
            title="Queued in background"
          />
        )}
        {status === "error" && (
          <span
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-background"
            title="Inference error"
          />
        )}
      </Button>
    );
  };

  return (
    <nav
      className="relative flex items-center justify-between w-full min-h-[48px] px-4 py-2 rounded-xl border border-border/80 bg-card shadow-xs select-none"
      aria-label="Gallery Navigation"
    >
      {/* Left Section: Previous button and earlier pages */}
      <div className="flex items-center gap-1.5 z-10 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <ChevronLeft className="size-3.5" />
          <span>Previous</span>
        </Button>

        {leftPages.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`left-el-${idx}`}
              className="px-1 text-xs text-muted-foreground select-none font-mono"
            >
              •••
            </span>
          ) : (
            renderPageButton(p)
          )
        )}
      </div>

      {/* Center Section: strictly centered in the toolbar with generous width */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-1.5 rounded-lg bg-muted/60 border border-border/60 z-10 max-w-[65%] pointer-events-auto shadow-xs">
        <FileImage className="size-3.5 text-primary shrink-0" />
        <span
          className="font-mono text-xs font-medium text-foreground truncate max-w-[360px]"
          title={currentImageName}
        >
          {truncateMiddle(currentImageName, 48)}
        </span>
        <span className="text-muted-foreground/40">•</span>
        <span className="text-xs text-muted-foreground font-medium shrink-0">
          <strong className="text-foreground font-semibold">
            {currentIndex + 1}
          </strong>{" "}
          of {totalImages}
        </span>
      </div>

      {/* Right Section: later pages and Next button */}
      <div className="flex items-center gap-1.5 z-10 shrink-0">
        {rightPages.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`right-el-${idx}`}
              className="px-1 text-xs text-muted-foreground select-none font-mono"
            >
              •••
            </span>
          ) : (
            renderPageButton(p)
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex >= totalImages - 1}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <span>Next</span>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </nav>
  );
};
