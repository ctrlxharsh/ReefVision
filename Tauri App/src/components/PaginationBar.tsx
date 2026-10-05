import React from "react";
import { ChevronLeft, ChevronRight, FileImage } from "lucide-react";

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
  // Preceding pages (indices strictly before currentIndex)
  const prevPages = Array.from({ length: currentIndex }, (_, i) => i);

  // Succeeding pages (indices strictly after currentIndex)
  const nextPages = Array.from(
    { length: Math.max(0, totalImages - currentIndex - 1) },
    (_, i) => currentIndex + 1 + i
  );

  const renderChips = (pages: number[], isLeading: boolean) => {
    if (pages.length <= 5) {
      return pages.map((pageIdx) => (
        <button
          key={pageIdx}
          type="button"
          className="gallery-page-chip"
          onClick={() => onSelectPage(pageIdx)}
          title={`Go to image ${pageIdx + 1}`}
        >
          {pageIdx + 1}
        </button>
      ));
    }

    // If more than 5 pages, use windowing with ellipsis
    if (isLeading) {
      const first = pages[0];
      const tail = pages.slice(-2);
      return (
        <>
          <button
            type="button"
            className="gallery-page-chip"
            onClick={() => onSelectPage(first)}
            title={`Go to image ${first + 1}`}
          >
            {first + 1}
          </button>
          <span className="gallery-page-ellipsis">•••</span>
          {tail.map((pageIdx) => (
            <button
              key={pageIdx}
              type="button"
              className="gallery-page-chip"
              onClick={() => onSelectPage(pageIdx)}
              title={`Go to image ${pageIdx + 1}`}
            >
              {pageIdx + 1}
            </button>
          ))}
        </>
      );
    } else {
      const head = pages.slice(0, 2);
      const last = pages[pages.length - 1];
      return (
        <>
          {head.map((pageIdx) => (
            <button
              key={pageIdx}
              type="button"
              className="gallery-page-chip"
              onClick={() => onSelectPage(pageIdx)}
              title={`Go to image ${pageIdx + 1}`}
            >
              {pageIdx + 1}
            </button>
          ))}
          <span className="gallery-page-ellipsis">•••</span>
          <button
            type="button"
            className="gallery-page-chip"
            onClick={() => onSelectPage(last)}
            title={`Go to image ${last + 1}`}
          >
            {last + 1}
          </button>
        </>
      );
    }
  };

  return (
    <nav className="gallery-nav-bar" aria-label="Image Navigation">
      {/* Left Wing: Extreme Previous Button */}
      <div className="gallery-nav-wing left">
        <button
          type="button"
          className="gallery-nav-btn prev"
          onClick={onPrev}
          disabled={currentIndex === 0}
          title="Previous image (←)"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
      </div>

      {/* Center: Preceding Page Chips + Current Image Breadcrumb + Succeeding Page Chips */}
      <div className="gallery-nav-center">
        {prevPages.length > 0 && (
          <div className="gallery-chips-group leading">
            {renderChips(prevPages, true)}
          </div>
        )}

        <div className="gallery-file-pill">
          <FileImage size={14} className="gallery-file-icon" />
          <span className="gallery-filename" title={currentImageName}>
            {currentImageName}
          </span>
          <span className="gallery-divider">•</span>
          <span className="gallery-counter">
            Image <strong>{currentIndex + 1}</strong> of {totalImages}
          </span>
        </div>

        {nextPages.length > 0 && (
          <div className="gallery-chips-group trailing">
            {renderChips(nextPages, false)}
          </div>
        )}
      </div>

      {/* Right Wing: Extreme Next Button */}
      <div className="gallery-nav-wing right">
        <button
          type="button"
          className="gallery-nav-btn next"
          onClick={onNext}
          disabled={currentIndex === totalImages - 1}
          title="Next image (→)"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};
