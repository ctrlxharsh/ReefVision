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
  Info,
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

  // Coral hover state
  const [hoveredSegment, setHoveredSegment] = useState<CoralSegment | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 1920, h: 1080 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync mode & reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveMode(secondarySrc && initialMode === "secondary" ? "secondary" : "primary");
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setHoveredSegment(null);

      // Parse resolution if available
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

  const isOverlayMode = activeMode === "secondary";

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
        {/* Header Bar */}
        <header className="lightbox-header">
          <div className="lightbox-header-info">
            <div className="lightbox-badge">{currentBadge}</div>
            <h3 className="lightbox-title">{currentTitle}</h3>
            <span className="lightbox-zoom-chip">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Simple View Switcher (Original / Overlay) */}
          {secondarySrc && (
            <div className="lightbox-mode-switch">
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "primary" ? "active" : ""}`}
                onClick={() => {
                  setActiveMode("primary");
                  setHoveredSegment(null);
                }}
                title="Original Reef Image"
              >
                <Layers size={13} />
                <span>Original</span>
              </button>
              <button
                type="button"
                className={`lightbox-switch-btn ${activeMode === "secondary" ? "active" : ""}`}
                onClick={() => setActiveMode("secondary")}
                title="Segmentation Overlay"
              >
                <Sparkles size={13} />
                <span>Overlay</span>
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
          <div
            className="lightbox-image-wrapper"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
          >
            <div className="lightbox-img-relative-box">
              <img
                ref={imgRef}
                src={currentDisplaySrc}
                alt={currentTitle}
                className="lightbox-img"
                draggable={false}
                onLoad={handleImageLoad}
              />

              {/* Interactive Coral Hover Hotspots (Overlay Mode Only) */}
              {isOverlayMode &&
                segments.map((seg) => {
                  if (!seg.centroid || seg.centroid.length < 2) return null;
                  const [cx, cy] = seg.centroid;
                  const leftPct = (cx / imgDims.w) * 100;
                  const topPct = (cy / imgDims.h) * 100;
                  const isHovered = hoveredSegment?.id === seg.id;

                  return (
                    <div
                      key={seg.id}
                      className={`coral-hotspot-pin ${isHovered ? "active" : ""}`}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        borderColor: seg.color_hex || "#38bdf8",
                      }}
                      onMouseEnter={() => setHoveredSegment(seg)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      title={`Hover to inspect coral #${seg.id}`}
                    >
                      <span className="coral-pin-label">{seg.id_str}</span>
                    </div>
                  );
                })}

              {/* Live Coral Telemetry Tooltip Card (Shown on Hover) */}
              {isOverlayMode && hoveredSegment && (
                <div
                  className="coral-detail-tooltip-card"
                  style={{
                    left: `${(hoveredSegment.centroid?.[0] ?? imgDims.w / 2) / imgDims.w * 100}%`,
                    top: `${(hoveredSegment.centroid?.[1] ?? imgDims.h / 2) / imgDims.h * 100}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="coral-tooltip-header">
                    <div className="coral-tooltip-id-badge" style={{ backgroundColor: hoveredSegment.color_hex }}>
                      {hoveredSegment.id_str}
                    </div>
                    <div className="coral-tooltip-titles">
                      <span className="coral-tooltip-genus">{hoveredSegment.genus || "Coral"}</span>
                      <span className="coral-tooltip-form">{hoveredSegment.growth_form || "Colony"}</span>
                    </div>
                  </div>

                  <div className="coral-tooltip-condition-row">
                    {hoveredSegment.condition === "Healthy" ? (
                      <span className="coral-tooltip-badge healthy">
                        <CheckCircle2 size={12} />
                        <span>Healthy ({hoveredSegment.condition_conf}%)</span>
                      </span>
                    ) : (
                      <span className="coral-tooltip-badge bleached">
                        <AlertTriangle size={12} />
                        <span>Bleached ({hoveredSegment.condition_conf}%)</span>
                      </span>
                    )}
                    <span className="coral-tooltip-conf">
                      BioCLIP: {hoveredSegment.taxon_conf}%
                    </span>
                  </div>

                  <div className="coral-tooltip-stats-grid">
                    <div className="coral-stat-item">
                      <span className="stat-label">Coverage</span>
                      <span className="stat-value">
                        {hoveredSegment.area_pct}% ({hoveredSegment.area_px.toLocaleString()} px)
                      </span>
                    </div>
                    <div className="coral-stat-item">
                      <span className="stat-label">SAM IoU</span>
                      <span className="stat-value">{hoveredSegment.predicted_iou}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Drawer: Detected Corals Quick Ribbon (Hoverable) */}
        {isOverlayMode && segments.length > 0 && (
          <div className="lightbox-corals-ribbon">
            <div className="lightbox-corals-ribbon-title">
              <Info size={13} />
              <span>Corals ({segments.length}):</span>
            </div>
            <div className="lightbox-corals-chips-scroll">
              {segments.map((seg) => {
                const isHovered = hoveredSegment?.id === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    className={`lightbox-coral-chip ${isHovered ? "active" : ""}`}
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    title={`Inspect ${seg.id_str}: ${seg.genus} (${seg.condition})`}
                  >
                    <span
                      className="coral-chip-dot"
                      style={{ backgroundColor: seg.color_hex || "#38bdf8" }}
                    />
                    <span className="coral-chip-num">{seg.id_str}</span>
                    <span className="coral-chip-name">{seg.genus}</span>
                    <span className={`coral-chip-status ${seg.condition.toLowerCase()}`}>
                      {seg.condition === "Healthy" ? "H" : "B"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            {isOverlayMode && <span>Hover coral or chip to inspect</span>}
            {isOverlayMode && <span>•</span>}
            <span>Esc to exit</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
