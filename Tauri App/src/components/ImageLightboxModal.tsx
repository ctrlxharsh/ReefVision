import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { CoralSegment } from "../types";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  primarySrc: string;
  primaryTitle: string;
  primaryBadge?: string;
  secondarySrc?: string | null;
  secondaryTitle?: string;
  secondaryBadge?: string;
  initialMode?: "primary" | "secondary";
  segments?: CoralSegment[];
  imageResolution?: string;
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
  initialMode = "secondary",
  segments = [],
  imageResolution = "0x0",
}) => {
  const [activeMode, setActiveMode] = useState<"primary" | "secondary">(
    secondarySrc && initialMode === "secondary" ? "secondary" : "primary"
  );
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hovered coral detected by mouse position
  const [hoveredSegment, setHoveredSegment] = useState<CoralSegment | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 1920, h: 1080 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(secondarySrc && initialMode === "secondary" ? "secondary" : "primary");
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setHoveredSegment(null);

      if (imageResolution && imageResolution.includes("x")) {
        const [rw, rh] = imageResolution.split("x").map(Number);
        if (rw > 0 && rh > 0) {
          setImgDims({ w: rw, h: rh });
        }
      }
    }
  }, [isOpen, initialMode, secondarySrc, imageResolution]);

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

  // Keyboard shortcuts
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
        setHoveredSegment(null);
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

    // Dynamic coral detection under cursor (Overlay mode only)
    if (activeMode === "secondary" && imgRef.current && segments.length > 0) {
      const rect = imgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if mouse is inside the image bounds
      if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
        // Map cursor position to original image coordinates
        const scaleX = imgDims.w / rect.width;
        const scaleY = imgDims.h / rect.height;
        const origX = mouseX * scaleX;
        const origY = mouseY * scaleY;

        // Find matching coral by bbox or centroid proximity
        let matchedSeg: CoralSegment | null = null;
        let minDistance = 50; // max pixel threshold for proximity match

        for (const seg of segments) {
          if (seg.bbox) {
            const [bx, by, bw, bh] = seg.bbox;
            if (origX >= bx && origX <= bx + bw && origY >= by && origY <= by + bh) {
              matchedSeg = seg;
              break;
            }
          } else if (seg.centroid) {
            const [cx, cy] = seg.centroid;
            const dist = Math.hypot(origX - cx, origY - cy);
            if (dist < minDistance) {
              minDistance = dist;
              matchedSeg = seg;
            }
          }
        }

        setHoveredSegment(matchedSeg);
      } else {
        setHoveredSegment(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1.2) {
      handleResetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const naturalW = e.currentTarget.naturalWidth;
    const naturalH = e.currentTarget.naturalHeight;
    if (naturalW > 0 && naturalH > 0) {
      setImgDims({ w: naturalW, h: naturalH });
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
        {/* Clean Theme Header */}
        <header className="lightbox-header">
          <div className="lightbox-header-left">
            <span className="lightbox-badge">{currentBadge}</span>
            <span className="lightbox-title">{currentTitle}</span>
            <span className="lightbox-zoom-chip">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Clean Segmented Control: Original vs Overlay */}
          {secondarySrc && (
            <div className="lightbox-mode-switch">
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "primary" ? "active" : ""}`}
                onClick={() => {
                  setActiveMode("primary");
                  setHoveredSegment(null);
                }}
              >
                <Layers size={13} />
                <span>Original</span>
              </button>
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "secondary" ? "active" : ""}`}
                onClick={() => setActiveMode("secondary")}
              >
                <Sparkles size={13} />
                <span>Overlay</span>
              </button>
            </div>
          )}

          {/* Close Button */}
          <div className="lightbox-header-right">
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={onClose}
              title="Close Fullscreen (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Clean Stage (No clutter pins or rings) */}
        <div
          ref={containerRef}
          className={`lightbox-stage ${isDragging ? "grabbing" : scale > 1 ? "grabbable" : ""}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="lightbox-image-wrapper"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
          >
            <img
              ref={imgRef}
              src={currentDisplaySrc}
              alt={currentTitle}
              className="lightbox-img"
              draggable={false}
              onLoad={handleImageLoad}
            />
          </div>

          {/* Floating Coral Telemetry HUD Card (Appears cleanly when hovering a coral) */}
          {activeMode === "secondary" && hoveredSegment && (
            <div className="coral-hud-card" onClick={(e) => e.stopPropagation()}>
              <div className="coral-hud-header">
                <div
                  className="coral-hud-id"
                  style={{ backgroundColor: hoveredSegment.color_hex || "var(--color-navy)" }}
                >
                  {hoveredSegment.id_str}
                </div>
                <div className="coral-hud-names">
                  <span className="coral-hud-genus">{hoveredSegment.genus || "Coral"}</span>
                  <span className="coral-hud-form">{hoveredSegment.growth_form || "Colony"}</span>
                </div>
              </div>

              <div className="coral-hud-body">
                <div className="coral-hud-row">
                  <span className="hud-label">Condition</span>
                  {hoveredSegment.condition === "Healthy" ? (
                    <span className="hud-pill healthy">
                      <CheckCircle2 size={11} />
                      <span>Healthy ({hoveredSegment.condition_conf}%)</span>
                    </span>
                  ) : (
                    <span className="hud-pill bleached">
                      <AlertTriangle size={11} />
                      <span>Bleached ({hoveredSegment.condition_conf}%)</span>
                    </span>
                  )}
                </div>

                <div className="coral-hud-row">
                  <span className="hud-label">Coverage</span>
                  <span className="hud-val">
                    {hoveredSegment.area_pct}% ({hoveredSegment.area_px.toLocaleString()} px)
                  </span>
                </div>

                <div className="coral-hud-row">
                  <span className="hud-label">SAM IoU</span>
                  <span className="hud-val">{hoveredSegment.predicted_iou}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Theme Footer Controls */}
        <footer className="lightbox-footer">
          <div className="lightbox-controls-dock">
            <button
              type="button"
              className="lightbox-dock-btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              title="Zoom Out (-)"
            >
              <ZoomOut size={15} />
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
              <ZoomIn size={15} />
            </button>

            <div className="lightbox-dock-separator" />

            <button
              type="button"
              className="lightbox-dock-btn text-btn"
              onClick={handleResetZoom}
              title="Reset Zoom to Fit (R or 0)"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            {scale === 1 ? (
              <button
                type="button"
                className="lightbox-dock-btn text-btn"
                onClick={() => setScale(2.5)}
                title="Zoom to 2.5x Details"
              >
                <Maximize2 size={13} />
                <span>2.5x</span>
              </button>
            ) : (
              <button
                type="button"
                className="lightbox-dock-btn text-btn"
                onClick={handleResetZoom}
                title="Fit to Screen"
              >
                <Minimize2 size={13} />
                <span>Fit</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
