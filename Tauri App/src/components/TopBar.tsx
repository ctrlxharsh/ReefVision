import React from "react";
import { ArrowLeft, Cpu, Zap } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeviceInfo } from "../types";

interface TopBarProps {
  imageName?: string;
  currentIndex?: number;
  totalImages?: number;
  onBack: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  deviceInfo?: DeviceInfo | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  onBack,
  deviceInfo,
}) => {
  const isGpu =
    deviceInfo?.device_type === "gpu" ||
    deviceInfo?.active_provider?.includes("CUDA");

  return (
    <header className="top-navbar">
      {/* Left side: Back to Selection */}
      <div className="top-navbar-left">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          title="Return to image library"
          className="border-slate-200 text-slate-700 hover:border-[#0d7c85] hover:text-[#0d7c85] hover:bg-teal-50/50 transition-all font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Selection</span>
        </Button>
      </div>

      {/* Center: Andromeida Reef Vision Brand */}
      <div className="top-navbar-center">
        <BrandLogo variant="topbar" />
      </div>

      {/* Right side: Hardware Engine Indicator */}
      <div className="top-navbar-right">
        {deviceInfo && (
          <Badge
            variant="outline"
            className="border-slate-200 bg-white shadow-xs px-3 py-1 font-mono text-[11px] text-slate-700 gap-1.5"
            title={`Active Device: ${deviceInfo.active_provider}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isGpu ? (
              <Zap className="h-3 w-3 text-amber-500 inline" />
            ) : (
              <Cpu className="h-3 w-3 text-[#0d7c85] inline" />
            )}
            <span>
              {deviceInfo.active_provider.includes("CUDA")
                ? "NVIDIA CUDA GPU"
                : deviceInfo.active_provider.includes("CoreML")
                ? "Apple CoreML"
                : "Multi-Threaded CPU Engine"}
            </span>
          </Badge>
        )}
      </div>
    </header>
  );
};
