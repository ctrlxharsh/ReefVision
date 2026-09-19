import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  currentIndex: number;
  totalImages: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectPage: (index: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentIndex,
  totalImages,
  onPrev,
  onNext,
  onSelectPage,
}) => {
  if (totalImages <= 1) return null;

  return (
    <nav className="pagination-bar-wrapper" aria-label="Image Pagination">
      <button
        className="pagination-nav-btn"
        onClick={onPrev}
        disabled={currentIndex === 0}
        title="Previous Image"
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      <div className="pagination-chip-list">
        {Array.from({ length: totalImages }).map((_, i) => (
          <button
            key={i}
            className={`pagination-num-chip ${i === currentIndex ? "active" : ""}`}
            onClick={() => onSelectPage(i)}
            aria-current={i === currentIndex ? "page" : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <button
        className="pagination-nav-btn"
        onClick={onNext}
        disabled={currentIndex === totalImages - 1}
        title="Next Image"
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};
