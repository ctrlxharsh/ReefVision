import React, { useState } from "react";
import { Sliders, Palette, Cpu, ChevronRight, ChevronDown, Minus, Plus, Check } from "lucide-react";
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

  const layoutOpts = [
    { id: "Side-by-Side", label: "Side-by-Side" },
    { id: "Overlay Only", label: "Overlay" },
    { id: "Original Only", label: "Original" },
    { id: "Masks on Black", label: "Black Masks" },
  ];

  const colorModes = [
    { id: "instance", label: "Colony Instances" },
    { id: "bleaching", label: "Condition (Healthy/Bleached)" },
    { id: "taxonomy", label: "Taxonomy (Genus)" },
    { id: "taxonomy_condition", label: "Taxon + Condition" },
  ];

  const segmentSelectOptions: UISelectOption[] = [
    { value: "all", label: "All Corals (Overview)" },
    ...segments.map((s) => ({
      value: String(s.id),
      label: `#${s.id} ${s.genus} (${s.condition}, ${s.area_pct}%)`,
    })),
  ];

  const deviceSelectOptions: UISelectOption[] = [
    {
      value: "auto",
      label: deviceInfo?.gpu_available
        ? `Auto (GPU: ${deviceInfo.gpu_name})`
        : deviceInfo?.cpu_count && deviceInfo.cpu_count > 1
        ? `Auto (Multi-Threaded CPU - ${deviceInfo.cpu_count} Threads)`
        : "Auto (CPU)",
    },
    {
      value: "gpu",
      label: `GPU Acceleration ${deviceInfo?.gpu_available ? `(${deviceInfo.gpu_name})` : "[Unavailable]"}`,
    },
    {
      value: "multithread_cpu",
      label: `Multi-Threaded CPU (${deviceInfo?.cpu_count || 4} Threads)`,
    },
    {
      value: "cpu",
      label: "Single-Threaded CPU (1 Thread)",
    },
  ];

  const handleMinAreaStep = (delta: number) => {
    const nextVal = Math.max(10, Math.min(5000, minAreaPx + delta));
    onMinAreaPxChange(nextVal);
  };

  return (
    <aside className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <BrandLogo isSidebar={true} />

      <div className="sidebar-content">
        {/* Expander 1: Inference Parameters */}
        <div className="sidebar-expander">
          <div
            className="expander-header"
            onClick={() => setParamsExpanded(!paramsExpanded)}
          >
            <div className="expander-title-group">
              <Sliders size={13} className="expander-icon" />
              <span>Inference Parameters</span>
            </div>
            {paramsExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>

          {paramsExpanded && (
            <div className="expander-body">
              {/* Points Per Side */}
              <div className="form-group" title="Higher density detects smaller coral fragments.">
                <div className="form-label-row">
                  <span className="form-label">Points Per Side</span>
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
              <div className="form-group" title="Filters out low confidence candidate masks.">
                <div className="form-label-row">
                  <span className="form-label">IoU Threshold</span>
                  <span className="form-slider-val">{iouThresh.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  value={iouThresh}
                  onChange={(e) => onIouThreshChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* Stability Threshold */}
              <div className="form-group" title="Filters masks with shifting boundary stability.">
                <div className="form-label-row">
                  <span className="form-label">Stability Threshold</span>
                  <span className="form-slider-val">{stabilityThresh.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  value={stabilityThresh}
                  onChange={(e) => onStabilityThreshChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* Min Mask Area with Stepper */}
              <div className="form-group" style={{ marginBottom: 0 }} title="Instant post-processing filter to remove tiny noisy mask fragments.">
                <div className="form-label-row">
                  <span className="form-label">Min Area (px)</span>
                  <div className="stepper-box">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleMinAreaStep(-25)}
                      title="Decrease area cutoff"
                    >
                      <Minus size={10} />
                    </button>
                    <input
                      type="number"
                      className="stepper-input"
                      min={10}
                      max={5000}
                      step={25}
                      value={minAreaPx}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) onMinAreaPxChange(Math.max(10, Math.min(5000, val)));
                      }}
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleMinAreaStep(25)}
                      title="Increase area cutoff"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={2500}
                  step={25}
                  value={Math.min(minAreaPx, 2500)}
                  onChange={(e) => onMinAreaPxChange(Number(e.target.value))}
                  className="form-slider"
                />
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
              <Palette size={13} className="expander-icon" />
              <span>Display Controls</span>
            </div>
            {displayExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>

          {displayExpanded && (
            <div className="expander-body">
              {/* Layout View Segmented Control */}
              <div className="form-group">
                <span className="form-label" style={{ marginBottom: "4px", display: "block" }}>Layout View</span>
                <div className="segmented-grid">
                  {layoutOpts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`segmented-chip ${layoutMode === opt.id ? "active" : ""}`}
                      onClick={() => onLayoutModeChange(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Color Mode Cards */}
              <div className="form-group">
                <span className="form-label" style={{ marginBottom: "4px", display: "block" }}>Color Mode</span>
                <div className="radio-card-group">
                  {colorModes.map((m) => (
                    <label
                      key={m.id}
                      className={`radio-card-item ${colorMode === m.id ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="colorMode"
                        value={m.id}
                        checked={colorMode === m.id}
                        onChange={() => onColorModeChange(m.id)}
                        className="radio-card-input"
                      />
                      <span className="radio-card-indicator" />
                      <span className="radio-card-text">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Alpha Transparency Slider */}
              <div className="form-group">
                <div className="form-label-row">
                  <span className="form-label">Overlay Alpha</span>
                  <span className="form-slider-val">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={alpha}
                  onChange={(e) => onAlphaChange(Number(e.target.value))}
                  className="form-slider"
                />
              </div>

              {/* 3-Column Toggle Chips for Overlays */}
              <div className="form-group">
                <span className="form-label" style={{ marginBottom: "4px", display: "block" }}>Features</span>
                <div className="toggle-chip-row">
                  <button
                    type="button"
                    className={`toggle-chip ${drawContours ? "active" : ""}`}
                    onClick={() => onDrawContoursChange(!drawContours)}
                    title="Toggle coral mask outlines"
                  >
                    {drawContours && <Check size={11} />}
                    <span>Borders</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-chip ${drawLabels ? "active" : ""}`}
                    onClick={() => onDrawLabelsChange(!drawLabels)}
                    title="Toggle coral index number badges"
                  >
                    {drawLabels && <Check size={11} />}
                    <span>Badges</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-chip ${drawBoxes ? "active" : ""}`}
                    onClick={() => onDrawBoxesChange(!drawBoxes)}
                    title="Toggle bounding boxes"
                  >
                    {drawBoxes && <Check size={11} />}
                    <span>Boxes</span>
                  </button>
                </div>
              </div>

              {/* Highlight Specific Segment */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label" style={{ marginBottom: "4px", display: "block" }}>Highlight Segment</span>
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
              <Cpu size={13} className="expander-icon" />
              <span>Hardware Engine</span>
            </div>
            {hwExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>

          {hwExpanded && (
            <div className="expander-body">
              {deviceInfo && (
                <div
                  className={`hw-badge ${
                    deviceInfo.device_type === "gpu" || deviceInfo.cuda_available
                      ? "cuda"
                      : deviceInfo.mode === "cpu"
                      ? "cpu-single"
                      : "cpu"
                  }`}
                  style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}
                >
                  {deviceInfo.gpu_name}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label" style={{ marginBottom: "4px", display: "block" }}>Device Preference</span>
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
    </aside>
  );
};
