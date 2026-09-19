import React, { useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";
import { ImageLightboxModal } from "./ImageLightboxModal";
import { CoralSegment } from "../types";

interface ImageViewerProps {
  originalSrc: string;
  overlaySrc: string | null;
  layoutMode: string;
  colorMode: string;
  isLoading?: boolean;
  segments?: CoralSegment[];
  imageResolution?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalSrc,
  overlaySrc,
  layoutMode,
  colorMode,
  isLoading = false,
  segments = [],
  imageResolution = "0x0",
}) => {
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxMode, setLightboxMode] = useState<"primary" | "secondary">("secondary");

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

  const openModal = (mode: "primary" | "secondary") => {
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
            {/* Clean hover-only Fullscreen button */}
            <div className="canvas-hover-overlay">
              <button
                type="button"
                className="canvas-hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(overlaySrc ? "secondary" : "primary");
                }}
                title="Fullscreen (Zoom enabled)"
              >
                <Maximize2 size={13} />
                <span>Fullscreen</span>
              </button>
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
      {/* Single View: Overlay Only */}
      {layoutMode === "Overlay Only" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <span className="image-column-title">Segmentation Overlay</span>
            <span className="image-column-header-badge">FULL CANVAS</span>
          </div>
          {renderOverlayContent()}
        </div>
      )}

      {/* Single View: Original Only */}
      {layoutMode === "Original Only" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <span className="image-column-title">Original Image</span>
            <span className="image-column-header-badge">SOURCE</span>
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
                title="Fullscreen (Zoom enabled)"
              >
                <Maximize2 size={13} />
                <span>Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single View: Masks on Black */}
      {layoutMode === "Masks on Black" && (
        <div className="canvas-single-wrapper">
          <div className="image-column-header">
            <span className="image-column-title">Isolated Coral Masks</span>
            <span className="image-column-header-badge">MASKS</span>
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
                <span className="image-column-title">Original Image</span>
                <span className="image-column-header-badge">SOURCE</span>
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
                    title="Fullscreen (Zoom enabled)"
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
                <span className="image-column-title">Segmentation Overlay</span>
                <span className="image-column-header-badge">{getBadgeLabel()}</span>
              </div>
              {renderOverlayContent()}
            </div>
          </div>
        )}

      {/* Fullscreen Modal with Zoom, Pan, and Coral Hover Inspection */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        primarySrc={originalSrc}
        primaryTitle="Original Reef Imagery"
        primaryBadge="SOURCE"
        secondarySrc={overlaySrc}
        secondaryTitle="Segmentation Overlay"
        secondaryBadge={getBadgeLabel()}
        initialMode={lightboxMode}
        segments={segments}
        imageResolution={imageResolution}
      />
    </div>
  );
};
