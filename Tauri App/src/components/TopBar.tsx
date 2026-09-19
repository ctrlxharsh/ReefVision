import React from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { DeviceInfo } from "../types";

interface TopBarProps {
  imageName?: string;
  currentIndex?: number;
  totalImages?: number;
  onBack: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  deviceInfo?: DeviceInfo | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  onBack,
  isSidebarCollapsed,
  onToggleSidebar,
  deviceInfo,
}) => {
  return (
    <header className="top-navbar">
      {/* Left side: Back to Selection & Sidebar Toggle (Icon-only) */}
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
          className="top-navbar-icon-btn"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Center: Andromeida Reef Vision Brand */}
      <div className="top-navbar-center">
        <BrandLogo variant="topbar" />
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
