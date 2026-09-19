import React from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { DeviceInfo } from "../types";

interface TopBarProps {
  imageName: string;
  currentIndex: number;
  totalImages: number;
  onPrev?: () => void;
  onNext?: () => void;
  onBack: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  deviceInfo?: DeviceInfo | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  imageName,
  currentIndex,
  totalImages,
  onPrev,
  onNext,
  onBack,
  isSidebarCollapsed,
  onToggleSidebar,
  deviceInfo,
}) => {
  return (
    <header className="top-navbar">
      {/* Left side: Sidebar Toggle & Back to Selection */}
      <div className="top-navbar-left">
        <button
          className="top-navbar-btn"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className="btn-collapse-text">{isSidebarCollapsed ? "Show Controls" : "Hide Controls"}</span>
        </button>

        <div className="top-navbar-divider" />

        <button className="top-navbar-btn btn-back-selection" onClick={onBack} title="Return to image selection">
          <ArrowLeft size={15} />
          <span>Back to Selection</span>
        </button>
      </div>

      {/* Center: Integrated Image Navigation & Filename */}
      <div className="top-navbar-center">
        {onPrev && (
          <button
            className="top-navbar-nav-btn"
            onClick={onPrev}
            disabled={currentIndex === 0}
            title="Previous Image"
            aria-label="Previous Image"
          >
            <ChevronLeft size={15} />
          </button>
        )}

        <div className="top-navbar-image-info">
          <span className="top-navbar-image-name" title={imageName}>{imageName}</span>
          <span className="top-navbar-counter-badge">
            {currentIndex + 1} of {totalImages}
          </span>
        </div>

        {onNext && (
          <button
            className="top-navbar-nav-btn"
            onClick={onNext}
            disabled={currentIndex >= totalImages - 1}
            title="Next Image"
            aria-label="Next Image"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* Right side: Execution Provider Indicator */}
      <div className="top-navbar-right">
        {deviceInfo && (
          <div className="top-navbar-device-badge" title={`Execution Provider: ${deviceInfo.active_provider}`}>
            <span className="status-dot-active" />
            <span>
              {deviceInfo.device_type === "gpu" || deviceInfo.active_provider.includes("CUDA")
                ? "GPU Acceleration"
                : deviceInfo.mode === "cpu"
                ? "CPU (Single-Threaded)"
                : "Multi-Threaded CPU"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
