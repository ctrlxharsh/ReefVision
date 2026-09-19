import React, { useState } from "react";
import { Loader2, Maximize2, SplitSquareVertical, Eye } from "lucide-react";
import { ImageLightboxModal } from "./ImageLightboxModal";

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
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxMode, setLightboxMode] = useState<"primary" | "secondary" | "split">("primary");

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

  const openModal = (mode: "primary" | "secondary" | "split") => {
    setLightboxMode(mode);
    setLightboxOpen(true);
  };

  const renderOverlayContent = (showDarkBg = false) => {
    const displayImg = overlaySrc || originalSrc;

    return (
      <div className={`canvas-img-container ${showDarkBg ? "canvas-dark-bg" : ""}`}>
        {displayImg ? (
          <>
            <img
              src={displayImg}
              alt="Segmentation Overlay"
              className={`canvas-img ${isLoading ? "canvas-img-dimmed" : ""}`}
              onClick={() => openModal(overlaySrc ? "secondary" : "primary")}
            />
            {/* Hover Floating Actions */}
            <div className="canvas-hover-overlay">
              <button
                type="button"
                className="canvas-hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(overlaySrc ? "secondary" : "primary");
                }}
                title="Inspect Fullscreen (Zoom & Pan enabled)"
              >
                <Maximize2 size={13} />
                <span>Fullscreen</span>
              </button>

              {overlaySrc && (
                <button
                  type="button"
                  className="canvas-hover-btn secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal("split");
                  }}
                  title="Compare with split slider"
                >
                  <SplitSquareVertical size={13} />
                  <span>Compare</span>
                </button>
              )}
            </div>
          </>
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

  return (
    <div className="canvas-viewer-root">
      {layoutMode === "Overlay Only" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <div className="image-column-header-left">
              <span className="image-column-title">Segmentation Overlay</span>
              <span className="image-column-header-badge">FULL CANVAS</span>
            </div>
            <button
              type="button"
              className="canvas-header-action-btn"
              onClick={() => openModal("secondary")}
              title="Inspect Fullscreen"
            >
              <Maximize2 size={12} />
              <span>Inspect</span>
            </button>
          </div>
          {renderOverlayContent()}
        </div>
      )}

      {layoutMode === "Original Only" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <div className="image-column-header-left">
              <span className="image-column-title">Original Image</span>
              <span className="image-column-header-badge">SOURCE</span>
            </div>
            <button
              type="button"
              className="canvas-header-action-btn"
              onClick={() => openModal("primary")}
              title="Inspect Fullscreen"
            >
              <Maximize2 size={12} />
              <span>Inspect</span>
            </button>
          </div>
          <div className="canvas-img-container">
            <img
              src={originalSrc}
              alt="Original Reef"
              className="canvas-img"
              onClick={() => openModal("primary")}
            />
            <div className="canvas-hover-overlay">
              <button
                type="button"
                className="canvas-hover-btn"
                onClick={() => openModal("primary")}
                title="Inspect Fullscreen (Zoom & Pan enabled)"
              >
                <Maximize2 size={13} />
                <span>Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {layoutMode === "Masks on Black" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <div className="image-column-header-left">
              <span className="image-column-title">Isolated Coral Masks</span>
              <span className="image-column-header-badge">MASKS</span>
            </div>
            <button
              type="button"
              className="canvas-header-action-btn"
              onClick={() => openModal("secondary")}
              title="Inspect Fullscreen"
            >
              <Maximize2 size={12} />
              <span>Inspect</span>
            </button>
          </div>
          {renderOverlayContent(true)}
        </div>
      )}

      {/* Default Side-by-Side View */}
      {layoutMode !== "Overlay Only" &&
        layoutMode !== "Original Only" &&
        layoutMode !== "Masks on Black" && (
          <div className="canvas-side-by-side">
            {/* Left Column: Original */}
            <div className="canvas-column">
              <div className="image-column-header">
                <div className="image-column-header-left">
                  <span className="image-column-title">Original Image</span>
                  <span className="image-column-header-badge">SOURCE</span>
                </div>
                <button
                  type="button"
                  className="canvas-header-action-btn"
                  onClick={() => openModal("primary")}
                  title="Inspect Original in Fullscreen"
                >
                  <Eye size={12} />
                  <span>Inspect</span>
                </button>
              </div>
              <div className="canvas-img-container">
                <img
                  src={originalSrc}
                  alt="Original Image"
                  className="canvas-img"
                  onClick={() => openModal("primary")}
                />
                <div className="canvas-hover-overlay">
                  <button
                    type="button"
                    className="canvas-hover-btn"
                    onClick={() => openModal("primary")}
                    title="Inspect Fullscreen (Zoom & Pan enabled)"
                  >
                    <Maximize2 size={13} />
                    <span>Fullscreen</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Overlay */}
            <div className="canvas-column">
              <div className="image-column-header">
                <div className="image-column-header-left">
                  <span className="image-column-title">Segmentation Overlay</span>
                  <span className="image-column-header-badge">{getBadgeLabel()}</span>
                </div>
                <div className="image-column-header-right">
                  {overlaySrc && (
                    <button
                      type="button"
                      className="canvas-header-action-btn secondary"
                      onClick={() => openModal("split")}
                      title="Compare Original & Overlay with Slider"
                    >
                      <SplitSquareVertical size={12} />
                      <span>Compare</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="canvas-header-action-btn"
                    onClick={() => openModal("secondary")}
                    title="Inspect Overlay in Fullscreen"
                  >
                    <Maximize2 size={12} />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
              {renderOverlayContent()}
            </div>
          </div>
        )}

      {/* Lightbox Modal with Zoom, Pan, Shortcuts & Slider */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        primarySrc={originalSrc}
        primaryTitle="Original Reef Imagery"
        primaryBadge="SOURCE"
        secondarySrc={overlaySrc}
        secondaryTitle="SAM + BioCLIP Segmentation Overlay"
        secondaryBadge={getBadgeLabel()}
        initialMode={lightboxMode}
      />
    </div>
  );
};
