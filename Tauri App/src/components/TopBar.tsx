import React from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { DeviceInfo } from "../types";

interface TopBarProps {
  imageName: string;
  currentIndex: number;
  totalImages: number;
  onBack: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  deviceInfo?: DeviceInfo | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  imageName,
  currentIndex,
  totalImages,
  onBack,
  isSidebarCollapsed,
  onToggleSidebar,
  deviceInfo,
}) => {
  return (
    <header className="top-navbar">
      {/* Left side: Back to Selection & Sidebar Toggle */}
      <div className="top-navbar-left">
        <button
          className="top-navbar-btn btn-back-selection"
          onClick={onBack}
          title="Return to image library"
        >
          <ArrowLeft size={16} />
          <span>Back to Selection</span>
        </button>

        <div className="top-navbar-divider" />

        <button
          className="top-navbar-btn"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className="btn-collapse-text">{isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}</span>
        </button>
      </div>

      {/* Center: Image Name & Pill Counter */}
      <div className="top-navbar-center">
        <div className="image-title-bar">
          <span className="img-title-text">{imageName}</span>
          <span className="img-badge-counter">
            Image {currentIndex + 1} of {totalImages}
          </span>
        </div>
      </div>

      {/* Right side: Hardware Engine Indicator */}
      <div className="top-navbar-right">
        {deviceInfo && (
          <div className="top-navbar-device-badge" title={`Active Device: ${deviceInfo.active_provider}`}>
            <span className="status-dot-active" />
            <span>
              {deviceInfo.active_provider.includes("CUDA")
                ? "NVIDIA CUDA GPU"
                : deviceInfo.active_provider.includes("CoreML")
                ? "Apple CoreML"
                : "Multi-Threaded CPU Engine"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
