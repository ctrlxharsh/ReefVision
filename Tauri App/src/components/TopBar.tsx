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

export const TopBar: React.FC<TopBarProps> = ({ onBack, deviceInfo }) => {
  const isGpu =
    deviceInfo?.device_type === "gpu" ||
    deviceInfo?.active_provider?.includes("CUDA");

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-white px-5 shadow-xs">
      {/* Left: Back to Selection */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          title="Return to image library"
          className="h-8 gap-2 text-xs font-semibold text-slate-700 hover:text-[#0d7c85] hover:border-[#0d7c85] hover:bg-teal-50/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Selection</span>
        </Button>
      </div>

      {/* Center: Brand Identity */}
      <div className="flex items-center justify-center">
        <BrandLogo variant="topbar" />
      </div>

      {/* Right: Hardware Acceleration Badge */}
      <div className="flex items-center gap-3">
        {deviceInfo && (
          <Badge
            variant="outline"
            className="h-8 gap-2 px-3 py-1 font-mono text-[11px] font-medium text-slate-700 bg-slate-50/60 border-slate-200"
            title={`Active Provider: ${deviceInfo.active_provider}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isGpu ? (
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Cpu className="h-3.5 w-3.5 text-[#0d7c85]" />
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
