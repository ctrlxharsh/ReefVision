import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sliders,
  Palette,
  Cpu,
  Minus,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const sidebarRef = useRef<HTMLElement>(null);
  const widthRef = useRef<number>(DEFAULT_SIDEBAR_WIDTH);
  const rafIdRef = useRef<number | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("reef_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          widthRef.current = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    widthRef.current = DEFAULT_SIDEBAR_WIDTH;
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
      widthRef.current = newWidth;

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.width = `${widthRef.current}px`;
            sidebarRef.current.style.minWidth = `${widthRef.current}px`;
            sidebarRef.current.style.maxWidth = `${widthRef.current}px`;
          }
          rafIdRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);

        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        const finalWidth = widthRef.current;
        setSidebarWidth(finalWidth);
        try {
          localStorage.setItem("reef_sidebar_width", String(finalWidth));
        } catch {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging]);

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

  const handleMinAreaStep = (delta: number) => {
    const nextVal = Math.max(10, Math.min(50000, minAreaPx + delta));
    onMinAreaPxChange(nextVal);
  };

  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleCollapse}
        title="Open Analysis Controls"
        aria-label="Open Analysis Controls"
        className="fixed top-16 left-4 z-40 h-9 w-9 rounded-lg bg-white shadow-md border-slate-200 text-slate-700 hover:text-[#0d7c85]"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <aside
      ref={sidebarRef}
      className="relative flex flex-col shrink-0 h-full border-r border-border bg-white select-none transition-all duration-75"
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        maxWidth: `${sidebarWidth}px`,
      }}
    >
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#0f1e4a]">
          <Sliders className="h-4 w-4 text-[#0d7c85]" />
          <span>Analysis Controls</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="h-7 w-7 text-slate-400 hover:text-slate-700"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Accordion Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 text-xs">
        <Accordion type="multiple" defaultValue={["params", "display", "hardware"]} className="w-full">
          {/* Section 1: Inference Parameters */}
          <AccordionItem value="params" className="border-b border-border">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Inference Parameters</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-4">
              {/* Grid Density */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>Grid Density</span>
                    <InfoTooltip content="Density of input prompt points sampled across the image grid. Higher values (24–36) detect smaller coral fragments and intricate colonies, but increase processing time." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                    {pointsPerSide}
                  </span>
                </div>
                <Slider
                  min={8}
                  max={36}
                  step={4}
                  value={[pointsPerSide]}
                  onValueChange={(vals) => onPointsPerSideChange(vals[0])}
                />
              </div>

              {/* IoU Threshold */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>IoU Threshold</span>
                    <InfoTooltip content="Predicted Intersection-over-Union (IoU) quality cutoff. Discards masks with low model confidence to eliminate false positives." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                    {iouThresh.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0.2}
                  max={0.98}
                  step={0.02}
                  value={[iouThresh]}
                  onValueChange={(vals) => onIouThreshChange(vals[0])}
                />
              </div>

              {/* Stability Threshold */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>Stability Threshold</span>
                    <InfoTooltip content="Filters masks with unstable boundaries across varying binarization cutoffs. Ensures coral outlines remain sharp and precise." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                    {stabilityThresh.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0.2}
                  max={0.99}
                  step={0.01}
                  value={[stabilityThresh]}
                  onValueChange={(vals) => onStabilityThreshChange(vals[0])}
                />
              </div>

              {/* Min Mask Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>Min Mask Area</span>
                    <InfoTooltip content="Minimum pixel count threshold for detected corals. Discards tiny noise specks and negligible debris below this size." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-600">
                    {minAreaPx} px
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-600"
                    onClick={() => handleMinAreaStep(-50)}
                    title="Decrease by 50 px"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={10}
                    max={50000}
                    step={50}
                    value={minAreaPx}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) onMinAreaPxChange(Math.max(10, Math.min(50000, val)));
                    }}
                    className="h-8 text-center font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-600"
                    onClick={() => handleMinAreaStep(50)}
                    title="Increase by 50 px"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Display Controls */}
          <AccordionItem value="display" className="border-b border-border">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Display Controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-4">
              {/* Layout Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Layout</span>
                  <InfoTooltip content="Switch between dual comparison canvas, full overlay, source image only, or isolated coral masks on black background." />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {layoutOpts.map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      variant={layoutMode === opt.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => onLayoutModeChange(opt.id)}
                      className={`h-7 px-2 text-[11px] font-medium transition-all ${
                        layoutMode === opt.id
                          ? "bg-[#0d7c85] text-white hover:bg-[#0d7c85]/90"
                          : "text-slate-600 hover:text-slate-900 bg-white"
                      }`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Color Mode</span>
                  <InfoTooltip content="Colony instances: distinct color per coral. Health condition: healthy green vs bleached red. Taxonomy: genus classification." />
                </div>
                <RadioGroup
                  value={colorMode}
                  onValueChange={onColorModeChange}
                  className="gap-2.5"
                >
                  {colorModes.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={m.id} id={`color-${m.id}`} />
                      <Label
                        htmlFor={`color-${m.id}`}
                        className="text-xs font-normal text-slate-700 cursor-pointer select-none"
                      >
                        {m.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Overlay Opacity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>Overlay Opacity</span>
                    <InfoTooltip content="Transparency of segmentation mask colors over the substrate imagery." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                    {alpha.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={[alpha]}
                  onValueChange={(vals) => onAlphaChange(vals[0])}
                />
              </div>

              {/* Annotations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Annotations</span>
                  <InfoTooltip content="Toggle visual overlay guides: boundary contours, identification tag badges, and bounding box extents." />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ann-borders"
                      checked={drawContours}
                      onCheckedChange={(c) => onDrawContoursChange(!!c)}
                    />
                    <Label htmlFor="ann-borders" className="text-xs font-normal text-slate-700 cursor-pointer">
                      Borders
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ann-labels"
                      checked={drawLabels}
                      onCheckedChange={(c) => onDrawLabelsChange(!!c)}
                    />
                    <Label htmlFor="ann-labels" className="text-xs font-normal text-slate-700 cursor-pointer">
                      ID Badges
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ann-boxes"
                      checked={drawBoxes}
                      onCheckedChange={(c) => onDrawBoxesChange(!!c)}
                    />
                    <Label htmlFor="ann-boxes" className="text-xs font-normal text-slate-700 cursor-pointer">
                      Bounding Boxes
                    </Label>
                  </div>
                </div>
              </div>

              {/* Highlight Coral */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Highlight Coral</span>
                  <InfoTooltip content="Isolate and inspect a single identified coral segment." />
                </div>
                <Select
                  value={selectedMaskId !== null ? String(selectedMaskId) : "all"}
                  onValueChange={(val) => onSelectMaskId(val === "all" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="All Corals" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="all">All Corals</SelectItem>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        Coral #{s.id} [{s.genus}] ({s.condition}, {s.area_pct}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Hardware Acceleration */}
          <AccordionItem value="hardware" className="border-b-0">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Compute Engine</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1 pb-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Device Preference</Label>
                <Select value={devicePreference} onValueChange={onDevicePreferenceChange}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="auto">
                      Auto (Recommended)
                    </SelectItem>
                    <SelectItem value="gpu" disabled={!deviceInfo?.gpu_available}>
                      {deviceInfo?.gpu_available
                        ? `GPU (${deviceInfo.gpu_name})`
                        : "GPU [Unavailable]"}
                    </SelectItem>
                    <SelectItem value="multithread_cpu">
                      Multi-Thread CPU ({deviceInfo?.cpu_count || 4} Threads)
                    </SelectItem>
                    <SelectItem value="cpu">Single-Thread CPU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {deviceInfo?.gpu_available
                  ? "Tensor operations accelerated natively via local GPU execution provider."
                  : "Parallel tensor operations accelerated across all CPU cores via ONNX Runtime."}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Drag Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#0d7c85]/40 transition-colors ${
          isDragging ? "bg-[#0d7c85] w-2" : "bg-transparent"
        }`}
        title="Drag to resize sidebar"
      />
    </aside>
  );
};
