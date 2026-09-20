import React from "react";
import { Sliders, Palette, Cpu, Minus, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InfoTooltip } from "./InfoTooltip";
import { DeviceInfo, CoralSegment } from "../types";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pointsPerSide: number;
  onPointsPerSideChange: (val: number) => void;
  iouThresh: number;
  onIouThreshChange: (val: number) => void;
  stabilityThresh: number;
  onStabilityThreshChange: (val: number) => void;
  minAreaPx: number;
  onMinAreaPxChange: (val: number) => void;
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
  deviceInfo: DeviceInfo | null;
  devicePreference: string;
  onDevicePreferenceChange: (val: string) => void;
}

const LAYOUT_OPTIONS = ["Side-by-Side", "Overlay Only", "Original Only", "Masks on Black"];
const COLOR_MODES = [
  { id: "instance", label: "Colony Instances" },
  { id: "bleaching", label: "Health Condition" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "taxonomy_condition", label: "Taxonomy + Health" },
];

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
  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleCollapse}
        title="Open Analysis Controls"
        className="fixed top-16 left-4 z-40 h-9 w-9 rounded-lg bg-white shadow-md border-slate-200 text-slate-700 hover:text-[#0d7c85]"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
    );
  }

  const inferenceSliders = [
    { label: "Grid Density", value: pointsPerSide, min: 8, max: 36, step: 4, onChange: onPointsPerSideChange, format: (v: number) => `${v}`, tip: "Density of input prompt points sampled across the image grid." },
    { label: "IoU Threshold", value: iouThresh, min: 0.2, max: 0.98, step: 0.02, onChange: onIouThreshChange, format: (v: number) => v.toFixed(2), tip: "Cutoff for predicted Intersection-over-Union quality." },
    { label: "Stability Threshold", value: stabilityThresh, min: 0.2, max: 0.99, step: 0.01, onChange: onStabilityThreshChange, format: (v: number) => v.toFixed(2), tip: "Filters masks with unstable boundaries across binarization thresholds." },
  ];

  return (
    <aside className="w-80 shrink-0 h-full border-r border-border bg-white flex flex-col select-none">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#0f1e4a]">
          <Sliders className="h-4 w-4 text-[#0d7c85]" />
          <span>Analysis Controls</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-7 w-7 text-slate-400 hover:text-slate-700"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Accordion Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-2 text-xs">
        <Accordion type="multiple" defaultValue={["params", "display", "hardware"]} className="w-full">
          {/* 1. Inference Parameters */}
          <AccordionItem value="params" className="border-b border-border">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Inference Parameters</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pt-1 pb-4">
              {inferenceSliders.map((s) => (
                <div key={s.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span>{s.label}</span>
                      <InfoTooltip content={s.tip} />
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                      {s.format(s.value)}
                    </span>
                  </div>
                  <Slider
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={[s.value]}
                    onValueChange={(vals) => s.onChange(vals[0])}
                  />
                </div>
              ))}

              {/* Min Mask Area */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span>Min Mask Area</span>
                    <InfoTooltip content="Minimum pixel count threshold for detected corals." />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-600">{minAreaPx} px</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-600"
                    onClick={() => onMinAreaPxChange(Math.max(10, minAreaPx - 50))}
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
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) onMinAreaPxChange(Math.max(10, Math.min(50000, v)));
                    }}
                    className="h-8 text-center font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-600"
                    onClick={() => onMinAreaPxChange(Math.min(50000, minAreaPx + 50))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Display Controls */}
          <AccordionItem value="display" className="border-b border-border">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Display Controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pt-1 pb-4">
              {/* Layout Mode */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Layout</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {LAYOUT_OPTIONS.map((id) => (
                    <Button
                      key={id}
                      type="button"
                      variant={layoutMode === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => onLayoutModeChange(id)}
                      className={`h-7 px-2 text-[11px] font-medium ${
                        layoutMode === id ? "bg-[#0d7c85] text-white hover:bg-[#0d7c85]/90" : "bg-white text-slate-600"
                      }`}
                    >
                      {id.replace(" Only", "")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Color Mode */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Color Mode</div>
                <RadioGroup value={colorMode} onValueChange={onColorModeChange} className="flex flex-col gap-2">
                  {COLOR_MODES.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={m.id} id={`color-${m.id}`} />
                      <Label htmlFor={`color-${m.id}`} className="text-xs font-normal text-slate-700 cursor-pointer">
                        {m.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Overlay Opacity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>Overlay Opacity</span>
                  <span className="font-mono text-[11px] font-semibold text-[#0d7c85] bg-teal-50 px-1.5 py-0.5 rounded">
                    {alpha.toFixed(2)}
                  </span>
                </div>
                <Slider min={0.05} max={1.0} step={0.05} value={[alpha]} onValueChange={(vals) => onAlphaChange(vals[0])} />
              </div>

              {/* Annotations */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Annotations</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="ann-borders" checked={drawContours} onCheckedChange={(c) => onDrawContoursChange(!!c)} />
                    <Label htmlFor="ann-borders" className="text-xs font-normal text-slate-700 cursor-pointer">Borders</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="ann-labels" checked={drawLabels} onCheckedChange={(c) => onDrawLabelsChange(!!c)} />
                    <Label htmlFor="ann-labels" className="text-xs font-normal text-slate-700 cursor-pointer">ID Badges</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="ann-boxes" checked={drawBoxes} onCheckedChange={(c) => onDrawBoxesChange(!!c)} />
                    <Label htmlFor="ann-boxes" className="text-xs font-normal text-slate-700 cursor-pointer">Bounding Boxes</Label>
                  </div>
                </div>
              </div>

              {/* Highlight Coral */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Highlight Coral</div>
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

          {/* 3. Compute Engine */}
          <AccordionItem value="hardware" className="border-b-0">
            <AccordionTrigger className="py-3 text-xs font-semibold text-slate-800 hover:text-[#0d7c85]">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[#0d7c85]" />
                <span>Compute Engine</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3 pt-1 pb-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-slate-600 font-medium">Device Preference</Label>
                <Select value={devicePreference} onValueChange={onDevicePreferenceChange}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="gpu" disabled={!deviceInfo?.gpu_available}>
                      {deviceInfo?.gpu_available ? `GPU (${deviceInfo.gpu_name})` : "GPU [Unavailable]"}
                    </SelectItem>
                    <SelectItem value="multithread_cpu">
                      Multi-Thread CPU ({deviceInfo?.cpu_count || 4} Threads)
                    </SelectItem>
                    <SelectItem value="cpu">Single-Thread CPU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
};
