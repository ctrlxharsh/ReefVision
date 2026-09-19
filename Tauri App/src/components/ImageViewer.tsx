import React from "react";
import { Loader2 } from "lucide-react";

interface ImageViewerProps {
  originalSrc: string;
  overlaySrc: string | null;
  layoutMode: string;
  colorMode: string;
  isLoading?: boolean;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalSrc,
  overlaySrc,
  layoutMode,
  colorMode,
  isLoading = false,
}) => {
  const getBadgeLabel = () => {
    switch (colorMode) {
      case "taxonomy_condition":
        return "TAXONOMY + HEALTH";
      case "taxonomy":
        return "TAXONOMY";
      case "bleaching":
        return "CONDITION";
      default:
        return "INSTANCES";
    }
  };

  const renderOverlayContent = (showDarkBg = false) => {
    const displayImg = overlaySrc || originalSrc;

    return (
      <div className={`canvas-img-container ${showDarkBg ? "canvas-dark-bg" : ""}`}>
        {displayImg ? (
          <img
            src={displayImg}
            alt="Segmentation Overlay"
            className={`canvas-img ${isLoading ? "canvas-img-dimmed" : ""}`}
          />
        ) : (
          <div className="canvas-empty-state">No Imagery Available</div>
        )}

        {isLoading && (
          <div className="canvas-processing-overlay">
            <Loader2 size={32} className="canvas-spinner" />
            <div className="canvas-processing-title">Segmenting Reef Imagery...</div>
            <div className="canvas-processing-subtitle">
              Running SAM ViT-B mask generation & BioCLIP taxonomy classification...
            </div>
            <div className="canvas-progress-track">
              <div className="canvas-progress-bar" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (layoutMode === "Overlay Only") {
    return (
      <div className="canvas-single-wrapper">
        <div className="image-column-header">
          <span>Segmentation Overlay</span>
          <span className="image-column-header-badge">FULL CANVAS</span>
        </div>
        {renderOverlayContent()}
      </div>
    );
  }

  if (layoutMode === "Original Only") {
    return (
      <div className="canvas-single-wrapper">
        <div className="image-column-header">
          <span>Original Image</span>
          <span className="image-column-header-badge">SOURCE</span>
        </div>
        <div className="canvas-img-container">
          <img src={originalSrc} alt="Original Reef" className="canvas-img" />
        </div>
      </div>
    );
  }

  if (layoutMode === "Masks on Black") {
    return (
      <div className="canvas-single-wrapper">
        <div className="image-column-header">
          <span>Isolated Coral Masks</span>
          <span className="image-column-header-badge">MASKS</span>
        </div>
        {renderOverlayContent(true)}
      </div>
    );
  }

  // Default: Side-by-Side (Matching Streamlit 2-Column Exact Layout)
  return (
    <div className="canvas-side-by-side">
      <div className="canvas-column">
        <div className="image-column-header">
          <span>Original Image</span>
          <span className="image-column-header-badge">SOURCE</span>
        </div>
        <div className="canvas-img-container">
          <img src={originalSrc} alt="Original Image" className="canvas-img" />
        </div>
      </div>

      <div className="canvas-column">
        <div className="image-column-header">
          <span>Segmentation Overlay</span>
          <span className="image-column-header-badge">{getBadgeLabel()}</span>
        </div>
        {renderOverlayContent()}
      </div>
    </div>
  );
};
