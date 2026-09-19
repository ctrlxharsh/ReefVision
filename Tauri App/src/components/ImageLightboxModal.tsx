import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  SplitSquareVertical,
  Layers,
  Sparkles,
} from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  primarySrc: string;
  primaryTitle: string;
  primaryBadge?: string;
  secondarySrc?: string | null;
  secondaryTitle?: string;
  secondaryBadge?: string;
  initialMode?: "primary" | "secondary" | "split";
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  primarySrc,
  primaryTitle,
  primaryBadge = "SOURCE",
  secondarySrc,
  secondaryTitle = "Overlay",
  secondaryBadge = "OVERLAY",
  initialMode = "primary",
}) => {
  const [activeMode, setActiveMode] = useState<"primary" | "secondary" | "split">(
    secondarySrc && initialMode === "secondary" ? "secondary" : "primary"
  );
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for split slider
  const [isSplitting, setIsSplitting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Sync mode when modal opens with new initialMode
  useEffect(() => {
    if (isOpen) {
      setActiveMode(secondarySrc && initialMode === "secondary" ? "secondary" : "primary");
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSplitPos(50);
    }
  }, [isOpen, initialMode, secondarySrc]);

  // Reset zoom & pan
  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(Number((prev + 0.35).toFixed(2)), 5.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(Number((prev - 0.35).toFixed(2)), 0.6);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === "Tab" && secondarySrc) {
        e.preventDefault();
        setActiveMode((prev) => (prev === "primary" ? "secondary" : "primary"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleResetZoom, secondarySrc]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.6), 5.0);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if middle button or left button (not on slider or buttons)
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (isSplitting && splitContainerRef.current) {
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSplitPos((x / rect.width) * 100);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsSplitting(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1.2) {
      handleResetZoom();
    } else {
      setScale(2.5);
    }
  };

  if (!isOpen) return null;

  const currentDisplaySrc =
    activeMode === "secondary" && secondarySrc ? secondarySrc : primarySrc;
  const currentTitle =
    activeMode === "secondary" ? secondaryTitle : primaryTitle;
  const currentBadge =
    activeMode === "secondary" ? secondaryBadge : primaryBadge;

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        className="lightbox-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <header className="lightbox-header">
          <div className="lightbox-header-info">
            <div className="lightbox-badge">{currentBadge}</div>
            <h3 className="lightbox-title">{currentTitle}</h3>
            <span className="lightbox-zoom-chip">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Mode Switcher (if secondary overlay exists) */}
          {secondarySrc && (
            <div className="lightbox-mode-switch">
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "primary" ? "active" : ""}`}
                onClick={() => setActiveMode("primary")}
                title="View Original Reef Image"
              >
                <Layers size={13} />
                <span>Original</span>
              </button>
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "secondary" ? "active" : ""}`}
                onClick={() => setActiveMode("secondary")}
                title="View Segmentation Overlay"
              >
                <Sparkles size={13} />
                <span>Segmentation</span>
              </button>
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "split" ? "active" : ""}`}
                onClick={() => {
                  setActiveMode("split");
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                title="Compare with interactive split slider"
              >
                <SplitSquareVertical size={13} />
                <span>Compare</span>
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={onClose}
            title="Close Fullscreen (Esc)"
          >
            <X size={20} />
          </button>
        </header>

        {/* Zoomable Canvas Stage */}
        <div
          ref={containerRef}
          className={`lightbox-stage ${isDragging ? "grabbing" : scale > 1 ? "grabbable" : ""}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {activeMode === "split" && secondarySrc ? (
            /* Interactive Split-Screen Slider Mode */
            <div
              ref={splitContainerRef}
              className="lightbox-split-container"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
              }}
            >
              {/* Bottom Layer: Overlay Image */}
              <img
                src={secondarySrc}
                alt="Segmentation Overlay"
                className="lightbox-split-image"
                draggable={false}
              />
              <span className="lightbox-split-label right">OVERLAY</span>

              {/* Top Clipped Layer: Original Image */}
              <div
                className="lightbox-split-clipped"
                style={{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }}
              >
                <img
                  src={primarySrc}
                  alt="Original Image"
                  className="lightbox-split-image"
                  draggable={false}
                />
                <span className="lightbox-split-label left">ORIGINAL</span>
              </div>

              {/* Slider Divider Handle */}
              <div
                className="lightbox-split-divider"
                style={{ left: `${splitPos}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsSplitting(true);
                }}
              >
                <div className="lightbox-split-handle">
                  <div className="lightbox-split-arrows">‹ ›</div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Zoom & Pan Image Mode */
            <div
              className="lightbox-image-wrapper"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
            >
              <img
                src={currentDisplaySrc}
                alt={currentTitle}
                className="lightbox-img"
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Floating Bottom Control Dock */}
        <footer className="lightbox-footer">
          <div className="lightbox-controls-dock">
            <button
              type="button"
              className="lightbox-dock-btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              title="Zoom Out (-)"
            >
              <ZoomOut size={16} />
            </button>

            <span className="lightbox-dock-scale">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              className="lightbox-dock-btn"
              onClick={handleZoomIn}
              disabled={scale >= 5.0}
              title="Zoom In (+)"
            >
              <ZoomIn size={16} />
            </button>

            <div className="lightbox-dock-separator" />

            <button
              type="button"
              className="lightbox-dock-btn text-btn"
              onClick={handleResetZoom}
              title="Reset Zoom to Fit (R or 0)"
            >
              <RotateCcw size={14} />
              <span>Reset Fit</span>
            </button>

            {scale === 1 ? (
              <button
                type="button"
                className="lightbox-dock-btn text-btn"
                onClick={() => setScale(2.5)}
                title="Zoom to 2.5x Details"
              >
                <Maximize2 size={14} />
                <span>2.5x Detail</span>
              </button>
            ) : (
              <button
                type="button"
                className="lightbox-dock-btn text-btn"
                onClick={handleResetZoom}
                title="Fit to Screen"
              >
                <Minimize2 size={14} />
                <span>Fit</span>
              </button>
            )}
          </div>

          <div className="lightbox-dock-hints">
            <span>Scroll wheel to zoom</span>
            <span>•</span>
            <span>Drag to pan</span>
            <span>•</span>
            <span>Double click to 2.5x</span>
            <span>•</span>
            <span>Esc to exit</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
