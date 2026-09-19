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

  const renderLoadingState = (title = "Segmenting Reef Imagery...") => (
    <div className="loading-container">
      <Loader2 size={32} className="loading-spinner-ring" />
      <div className="loading-title">{title}</div>
      <div className="loading-subtitle">
        Running SAM ViT-B zero-shot mask generation & BioCLIP taxonomy classification...
      </div>
      <div className="loading-bar-track">
        <div className="loading-bar-pulse" />
      </div>
    </div>
  );

  if (layoutMode === "Overlay Only") {
    return (
      <div className="canvas-single">
        <div className="canvas-header">
          <span className="canvas-title">Segmentation Overlay</span>
          <span className="canvas-badge">{getBadgeLabel()}</span>
        </div>
        <div className="canvas-img-wrapper">
          {isLoading && overlaySrc && (
            <div className="canvas-recomputing-badge">
              <Loader2 size={12} className="spin" />
              <span>Updating...</span>
            </div>
          )}
          {overlaySrc ? (
            <img src={overlaySrc} alt="Segmentation Overlay" className="canvas-img" />
          ) : isLoading ? (
            renderLoadingState()
          ) : (
            <div className="canvas-empty">No Overlay Available</div>
          )}
        </div>
      </div>
    );
  }

  if (layoutMode === "Original Only") {
    return (
      <div className="canvas-single">
        <div className="canvas-header">
          <span className="canvas-title">Original Image</span>
          <span className="canvas-badge">SOURCE</span>
        </div>
        <div className="canvas-img-wrapper">
          <img src={originalSrc} alt="Original Coral Image" className="canvas-img" />
        </div>
      </div>
    );
  }

  if (layoutMode === "Masks on Black") {
    return (
      <div className="canvas-single">
        <div className="canvas-header">
          <span className="canvas-title">Isolated Coral Masks</span>
          <span className="canvas-badge">BLACK MASK</span>
        </div>
        <div className="canvas-img-wrapper canvas-img-dark">
          {isLoading && overlaySrc && (
            <div className="canvas-recomputing-badge">
              <Loader2 size={12} className="spin" />
              <span>Updating...</span>
            </div>
          )}
          {overlaySrc ? (
            <img src={overlaySrc} alt="Masks on Black" className="canvas-img" />
          ) : isLoading ? (
            renderLoadingState("Generating Coral Masks...")
          ) : (
            <div className="canvas-empty">No Masks Available</div>
          )}
        </div>
      </div>
    );
  }

  // Default: Side-by-Side
  return (
    <div className="canvas-grid">
      <div className="canvas-col">
        <div className="canvas-header">
          <span className="canvas-title">ORIGINAL IMAGE</span>
          <span className="canvas-badge">SOURCE</span>
        </div>
        <div className="canvas-img-wrapper">
          <img src={originalSrc} alt="Source" className="canvas-img" />
        </div>
      </div>

      <div className="canvas-col">
        <div className="canvas-header">
          <span className="canvas-title">SEGMENTATION OVERLAY</span>
          <span className="canvas-badge canvas-badge-accent">{getBadgeLabel()}</span>
        </div>
        <div className="canvas-img-wrapper">
          {isLoading && overlaySrc && (
            <div className="canvas-recomputing-badge">
              <Loader2 size={12} className="spin" />
              <span>Updating...</span>
            </div>
          )}
          {overlaySrc ? (
            <img src={overlaySrc} alt="Segmentation Overlay" className="canvas-img" />
          ) : isLoading ? (
            renderLoadingState()
          ) : (
            <div className="canvas-empty">Preparing Vision Engine...</div>
          )}
        </div>
      </div>
    </div>
  );
};
