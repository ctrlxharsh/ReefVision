import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sliders, Palette, Cpu, ChevronRight, ChevronDown, Minus, Plus } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { UISelect, UISelectOption } from "./UISelect";
import { DeviceInfo, CoralSegment } from "../types";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Inference Parameters
  pointsPerSide: number;
  onPointsPerSideChange: (val: number) => void;
  iouThresh: number;
  onIouThreshChange: (val: number) => void;
  stabilityThresh: number;
  onStabilityThreshChange: (val: number) => void;
  minAreaPx: number;
  onMinAreaPxChange: (val: number) => void;
  // Display Controls
  layoutMode: string;
  onLayoutModeChange: (val: string) => void;
  colorMode: string;
  onColorModeChange: (val: string) => void;
  alpha: number;
  onAlphaChange: (val: number) => void;
  drawContours: boolean;
  onDrawContoursChange: (val: boolean) => void;
  drawLabels: boolean;
  onDrawLabelsChange: (val: boolean) => void;
  drawBoxes: boolean;
  onDrawBoxesChange: (val: boolean) => void;
  segments: CoralSegment[];
  selectedMaskId: number | null;
  onSelectMaskId: (id: number | null) => void;
  // Hardware Acceleration
  deviceInfo: DeviceInfo | null;
  devicePreference: string;
  onDevicePreferenceChange: (val: string) => void;
}

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 540;

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  pointsPerSide,
  onPointsPerSideChange,
  iouThresh,
  onIouThreshChange,
  stabilityThresh,
  onStabilityThreshChange,
  minAreaPx,
  onMinAreaPxChange,
  layoutMode,
  onLayoutModeChange,
  colorMode,
  onColorModeChange,
  alpha,
  onAlphaChange,
  drawContours,
  onDrawContoursChange,
  drawLabels,
  onDrawLabelsChange,
  drawBoxes,
  onDrawBoxesChange,
  segments,
  selectedMaskId,
  onSelectMaskId,
  deviceInfo,
  devicePreference,
  onDevicePreferenceChange,
}) => {
  const [paramsExpanded, setParamsExpanded] = useState(true);
  const [displayExpanded, setDisplayExpanded] = useState(true);
  const [hwExpanded, setHwExpanded] = useState(false);

  // Adjustable Sidebar Width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("reef_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
  }, []);

  const resetWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem("reef_sidebar_width", String(DEFAULT_SIDEBAR_WIDTH));
    } catch {}
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        try {
          localStorage.setItem("reef_sidebar_width", String(sidebarWidth));
        } catch {}
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, sidebarWidth]);

  const layoutOpts = [
    "Side-by-Side",
    "Overlay Only",
    "Original Only",
    "Masks on Black",
  ];

  const colorModes = [
    { id: "instance", label: "Colony Instances" },
    { id: "bleaching", label: "Condition Status (Healthy vs Bleached)" },
    { id: "taxonomy", label: "Taxonomy Classification" },
    { id: "taxonomy_condition", label: "Taxonomy + Condition Status" },
  ];

  const segmentSelectOptions: UISelectOption[] = [
    { value: "all", label: "All Corals" },
    ...segments.map((s) => ({
      value: String(s.id),
      label: `Coral #${s.id} [${s.genus}] (${s.condition}, ${s.area_pct}%)`,
    })),
  ];

  const deviceSelectOptions: UISelectOption[] = [
    { value: "auto", label: "Auto (CUDA if available)" },
    { value: "cuda", label: "NVIDIA CUDA GPU" },
    { value: "cpu", label: "Multi-Threaded CPU Engine" },
  ];

  const handleMinAreaStep = (delta: number) => {
    const nextVal = Math.max(10, Math.min(50000, minAreaPx + delta));
    onMinAreaPxChange(nextVal);
  };

  const dynamicWidth = isCollapsed ? 0 : sidebarWidth;

  return (
    <aside
      className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}
      style={{
        width: `${dynamicWidth}px`,
        minWidth: `${dynamicWidth}px`,
        maxWidth: `${dynamicWidth}px`,
      }}
    >
      {/* Brand Header */}
      <BrandLogo isSidebar={true} />

      <div className="sidebar-content">
        {/* Expander 1: Inference Parameters */}
        <div className="sidebar-expander">
          <div
            className="expander-header"
            onClick={() => setParamsExpanded(!paramsExpanded)}
          >
            <div className="expander-title-group">
              <Sliders size={14} className="expander-icon" />
              <span className="expander-title">Inference Parameters</span>
            </div>
            {paramsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {paramsExpanded && (
            <div className="expander-body">
              {/* Points Per Side */}
              <div className="form-group" title="Higher values detect smaller coral instances but take longer to process.">
                <div className="form-label-row">
                  <span className="form-label">Points Per Side (Grid Density)</span>
                  <span className="form-slider-val">{pointsPerSide}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={36}
                  step={4}
                  value={pointsPerSide}
                  onChange={(e) => onPointsPerSideChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* IoU Confidence Threshold */}
              <div className="form-group" title="Filters masks with model predicted quality below this cutoff.">
                <div className="form-label-row">
                  <span className="form-label">IoU Confidence Threshold</span>
                  <span className="form-slider-val">{iouThresh.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.20}
                  max={0.98}
                  step={0.02}
                  value={iouThresh}
                  onChange={(e) => onIouThreshChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* Stability Score Threshold */}
              <div className="form-group" title="Filters masks with unstable boundary thresholds.">
                <div className="form-label-row">
                  <span className="form-label">Stability Score Threshold</span>
                  <span className="form-slider-val">{stabilityThresh.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.20}
                  max={0.99}
                  step={0.01}
                  value={stabilityThresh}
                  onChange={(e) => onStabilityThreshChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* Minimum Mask Area (px) - Solid Stepper */}
              <div className="form-group" style={{ marginBottom: 0 }} title="Removes tiny noise fragments below this pixel count.">
                <div className="form-label-row" style={{ marginBottom: "6px" }}>
                  <span className="form-label">Minimum Mask Area (px)</span>
                  <span className="form-slider-val">{minAreaPx} px</span>
                </div>
                <div className="stepper-box">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleMinAreaStep(-50)}
                    title="Decrease by 50 px"
                    aria-label="Decrease mask area"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    min={10}
                    max={50000}
                    step={50}
                    value={minAreaPx}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) onMinAreaPxChange(Math.max(10, Math.min(50000, val)));
                    }}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleMinAreaStep(50)}
                    title="Increase by 50 px"
                    aria-label="Increase mask area"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expander 2: Display Controls */}
        <div className="sidebar-expander">
          <div
            className="expander-header"
            onClick={() => setDisplayExpanded(!displayExpanded)}
          >
            <div className="expander-title-group">
              <Palette size={14} className="expander-icon" />
              <span className="expander-title">Display Controls</span>
            </div>
            {displayExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {displayExpanded && (
            <div className="expander-body">
              {/* Layout View: Segmented Control */}
              <div className="form-group">
                <span className="form-category-header">LAYOUT VIEW</span>
                <div className="segmented-control">
                  {layoutOpts.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`segmented-button ${layoutMode === opt ? "active" : ""}`}
                      onClick={() => onLayoutModeChange(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Color Mode: Clean Radio List */}
              <div className="form-group">
                <span className="form-category-header">OVERLAY COLOR MODE</span>
                <div className="radio-list">
                  {colorModes.map((m) => (
                    <label key={m.id} className={`radio-item ${colorMode === m.id ? "checked" : ""}`}>
                      <input
                        type="radio"
                        name="colorMode"
                        value={m.id}
                        checked={colorMode === m.id}
                        onChange={() => onColorModeChange(m.id)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Overlay Transparency (Alpha) */}
              <div className="form-group">
                <div className="form-label-row">
                  <span className="form-label">Overlay Transparency (Alpha)</span>
                  <span className="form-slider-val">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.10}
                  max={0.90}
                  step={0.05}
                  value={alpha}
                  onChange={(e) => onAlphaChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* Two Column Checkboxes */}
              <div className="form-group">
                <span className="form-category-header">ANNOTATION OVERLAYS</span>
                <div className="checkbox-columns">
                  <div className="checkbox-col">
                    <label className="checkbox-item" title="Draw sharp contour borders around corals">
                      <input
                        type="checkbox"
                        checked={drawContours}
                        onChange={(e) => onDrawContoursChange(e.target.checked)}
                      />
                      <span>Borders</span>
                    </label>
                    <label className="checkbox-item" title="Display segment ID numbers at centroids">
                      <input
                        type="checkbox"
                        checked={drawLabels}
                        onChange={(e) => onDrawLabelsChange(e.target.checked)}
                      />
                      <span>ID Badges</span>
                    </label>
                  </div>
                  <div className="checkbox-col">
                    <label className="checkbox-item" title="Show bounding box rectangles">
                      <input
                        type="checkbox"
                        checked={drawBoxes}
                        onChange={(e) => onDrawBoxesChange(e.target.checked)}
                      />
                      <span>Bounding Boxes</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Highlight Specific Segment */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-category-header">HIGHLIGHT SEGMENT</span>
                <UISelect
                  value={selectedMaskId === null ? "all" : String(selectedMaskId)}
                  onChange={(val) => onSelectMaskId(val === "all" ? null : Number(val))}
                  options={segmentSelectOptions}
                  placeholder="Select coral"
                />
              </div>
            </div>
          )}
        </div>

        {/* Expander 3: Hardware Acceleration */}
        <div className="sidebar-expander">
          <div
            className="expander-header"
            onClick={() => setHwExpanded(!hwExpanded)}
          >
            <div className="expander-title-group">
              <Cpu size={14} className="expander-icon" />
              <span className="expander-title">Hardware Acceleration</span>
            </div>
            {hwExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {hwExpanded && (
            <div className="expander-body">
              {deviceInfo && (
                <div
                  className={`hw-badge ${
                    deviceInfo.cuda_available
                      ? "cuda"
                      : deviceInfo.active_provider.includes("CoreML")
                      ? "coreml"
                      : "cpu"
                  }`}
                  style={{ width: "100%", justifyContent: "center", marginBottom: "0.75rem" }}
                >
                  {deviceInfo.gpu_name}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-category-header">DEVICE PREFERENCE</span>
                <UISelect
                  value={devicePreference}
                  onChange={onDevicePreferenceChange}
                  options={deviceSelectOptions}
                  placeholder="Select device"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resizer Handle on Right Edge */}
      {!isCollapsed && (
        <div
          className={`sidebar-resizer ${isDragging ? "active" : ""}`}
          onMouseDown={startResizing}
          onDoubleClick={resetWidth}
          title="Drag to resize sidebar • Double-click to reset (320px)"
        />
      )}
    </aside>
  );
};
