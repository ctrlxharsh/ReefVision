import React from "react";
import { ChevronLeft, ChevronRight, FolderOpen, FileImage } from "lucide-react";

interface PaginationBarProps {
  currentIndex: number;
  totalImages: number;
  currentImageName: string;
  onPrev: () => void;
  onNext: () => void;
  onBackToLibrary: () => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentIndex,
  totalImages,
  currentImageName,
  onPrev,
  onNext,
  onBackToLibrary,
}) => {
  return (
    <nav className="gallery-nav-bar" aria-label="Image Navigation">
      {/* Extreme Left: Back to Library & Previous Button */}
      <div className="gallery-nav-left">
        <button
          type="button"
          className="gallery-library-btn"
          onClick={onBackToLibrary}
          title="Return to image library"
        >
          <FolderOpen size={14} className="gallery-icon-library" />
          <span>Library</span>
        </button>

        {totalImages > 1 && (
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
        )}
      </div>

      {/* Center: File Name & Counter */}
      <div className="gallery-nav-center">
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
      </div>

      {/* Extreme Right: Next Button */}
      <div className="gallery-nav-right">
        {totalImages > 1 && (
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
        )}
      </div>
    </nav>
  );
};
