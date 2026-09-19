import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sliders, Palette, Cpu, ChevronRight, ChevronDown, Minus, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { UISelect, UISelectOption } from "./UISelect";
import { InfoTooltip } from "./InfoTooltip";
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
  onToggleCollapse,
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
    { id: "Side-by-Side", label: "Side-by-Side" },
    { id: "Overlay Only", label: "Overlay" },
    { id: "Original Only", label: "Original" },
    { id: "Masks on Black", label: "Masks on Black" },
  ];

  const colorModes = [
    { id: "instance", label: "Colony Instances" },
    { id: "bleaching", label: "Health Condition" },
    { id: "taxonomy", label: "Taxonomy" },
    { id: "taxonomy_condition", label: "Taxonomy + Health" },
  ];

  const segmentSelectOptions: UISelectOption[] = [
    { value: "all", label: "All Corals" },
    ...segments.map((s) => ({
      value: String(s.id),
      label: `Coral #${s.id} [${s.genus}] (${s.condition}, ${s.area_pct}%)`,
    })),
  ];

  const deviceSelectOptions: UISelectOption[] = [
    { value: "auto", label: "Auto (Recommended)" },
    {
      value: "gpu",
      label: deviceInfo?.gpu_available
        ? `GPU (${deviceInfo.gpu_name})`
        : "GPU [Unavailable]",
    },
    {
      value: "multithread_cpu",
      label: `Multi-Thread CPU (${deviceInfo?.cpu_count || 4} Threads)`,
    },
    {
      value: "cpu",
      label: "Single-Thread CPU",
    },
  ];

  const handleMinAreaStep = (delta: number) => {
    const nextVal = Math.max(10, Math.min(50000, minAreaPx + delta));
    onMinAreaPxChange(nextVal);
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="sidebar-floating-expand-btn"
        onClick={onToggleCollapse}
        title="Open Analysis Controls"
        aria-label="Open Analysis Controls"
      >
        <PanelLeftOpen size={16} />
      </button>
    );
  }

  const dynamicWidth = sidebarWidth;

  return (
    <aside
      className="app-sidebar"
      style={{
        width: `${dynamicWidth}px`,
        minWidth: `${dynamicWidth}px`,
        maxWidth: `${dynamicWidth}px`,
      }}
    >
      {/* Sidebar Header Title & Collapse Button */}
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <Sliders size={16} className="sidebar-header-icon" />
          <span className="sidebar-header-title">Analysis Controls</span>
        </div>
        <button
          type="button"
          className="sidebar-collapse-icon-btn"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

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
              {/* Grid Density */}
              <div className="form-group">
                <div className="form-label-row">
                  <div className="form-label-with-info">
                    <span className="form-label">Grid Density</span>
                    <InfoTooltip content="Density of input prompt points sampled across the image grid (points per side). Higher values (24–36) detect smaller coral fragments and intricate colonies, but increase processing time." />
                  </div>
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

              {/* IoU Threshold */}
              <div className="form-group">
                <div className="form-label-row">
                  <div className="form-label-with-info">
                    <span className="form-label">IoU Threshold</span>
                    <InfoTooltip content="Predicted Intersection-over-Union (IoU) quality cutoff. Discards masks with low model confidence to eliminate false positives." />
                  </div>
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

              {/* Stability Threshold */}
              <div className="form-group">
                <div className="form-label-row">
                  <div className="form-label-with-info">
                    <span className="form-label">Stability Threshold</span>
                    <InfoTooltip content="Filters masks with unstable boundaries across varying binarization cutoffs. Ensures coral outlines remain sharp and precise." />
                  </div>
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

              {/* Min Mask Area */}
              <div className="form-group form-group-last">
                <div className="form-label-row">
                  <div className="form-label-with-info">
                    <span className="form-label">Min Mask Area</span>
                    <InfoTooltip content="Minimum pixel count threshold for detected corals. Discards tiny noise specks and negligible debris below this size." />
                  </div>
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
                <div className="form-category-header-row">
                  <span className="form-category-header">LAYOUT</span>
                  <InfoTooltip content="Switch between dual comparison canvas, full overlay, source image only, or isolated coral masks on black background." />
                </div>
                <div className="segmented-control">
                  {layoutOpts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`segmented-button ${layoutMode === opt.id ? "active" : ""}`}
                      onClick={() => onLayoutModeChange(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Color Mode: Clean Radio List */}
              <div className="form-group">
                <div className="form-category-header-row">
                  <span className="form-category-header">COLOR MODE</span>
                  <InfoTooltip content="Colony instances: distinct color per coral. Health condition: healthy green vs bleached red. Taxonomy: genus classification." />
                </div>
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

              {/* Overlay Opacity */}
              <div className="form-group">
                <div className="form-label-row">
                  <div className="form-label-with-info">
                    <span className="form-label">Overlay Opacity</span>
                    <InfoTooltip content="Blends mask colors over the original underwater photograph. Lower values reveal texture; higher values emphasize segmentation." />
                  </div>
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
                <div className="form-category-header-row">
                  <span className="form-category-header">ANNOTATIONS</span>
                  <InfoTooltip content="Toggle visual annotations: sharp contour borders, colony centroid ID badges, and bounding boxes." />
                </div>
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
              <div className="form-group form-group-last">
                <div className="form-category-header-row">
                  <span className="form-category-header">HIGHLIGHT CORAL</span>
                  <InfoTooltip content="Dim all other coral colonies to isolate and inspect a specific detected segment." />
                </div>
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
              <div className="form-group form-group-last">
                <div className="form-category-header-row">
                  <span className="form-category-header">COMPUTE DEVICE</span>
                  <InfoTooltip content="Choose compute hardware engine: GPU acceleration or Multi-Threaded CPU." />
                </div>
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
