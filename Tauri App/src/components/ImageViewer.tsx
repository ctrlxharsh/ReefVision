import React, { useState } from "react";
import { Maximize2, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageLightboxModal } from "./ImageLightboxModal";
import { ThreeDotsLoader } from "./ThreeDotsLoader";
import { CoralSegment, AnalysisStage } from "../types";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  originalSrc: string;
  overlaySrc: string | null;
  layoutMode: string;
  colorMode: string;
  isLoading?: boolean;
  analysisStage?: AnalysisStage;
  segments?: CoralSegment[];
  imageResolution?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalSrc,
  overlaySrc,
  layoutMode,
  colorMode,
  isLoading = false,
  analysisStage = "idle",
  segments = [],
  imageResolution = "0x0",
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMode, setLightboxMode] = useState<"primary" | "secondary">("secondary");

  const openModal = (mode: "primary" | "secondary") => {
    setLightboxMode(mode);
    setLightboxOpen(true);
  };

  const getBadgeLabel = () => {
    if (colorMode === "taxonomy_condition") return "TAXONOMY + HEALTH";
    if (colorMode === "taxonomy") return "TAXONOMY";
    if (colorMode === "bleaching") return "CONDITION";
    return "INSTANCES";
  };

  const isSideBySide = layoutMode === "Side-by-Side";
  const showOriginal = isSideBySide || layoutMode === "Original Only";
  const showOverlay = isSideBySide || layoutMode === "Overlay Only" || layoutMode === "Masks on Black";
  const isDarkBg = layoutMode === "Masks on Black";

  const renderFrame = (title: string, badge: string, src: string | null, isDark: boolean, onOpen: () => void, isOverlay: boolean) => (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-xs flex flex-col group">
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-[#0d7c85]" />
          <span>{title}</span>
        </CardTitle>
        <Badge variant={isOverlay ? "coral" : "outline"} className="text-[10px] font-mono font-semibold uppercase px-2 py-0">
          {badge}
        </Badge>
      </CardHeader>
      <CardContent className={cn("p-0 relative flex items-center justify-center min-h-[320px] max-h-[500px] overflow-hidden", isDark ? "bg-black" : "bg-slate-950/[0.03]")}>
        {src ? (
          <>
            <img
              src={src}
              alt={title}
              className={cn("max-h-[500px] w-auto max-w-full object-contain cursor-pointer transition-opacity", isLoading ? "opacity-30" : "opacity-100")}
              onClick={onOpen}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="absolute top-3 right-3 h-7 px-2.5 text-xs font-medium gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-sm"
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Fullscreen</span>
            </Button>
          </>
        ) : (
          <div className="text-xs text-slate-400 font-medium py-16">No Imagery Available</div>
        )}

        {isLoading && isOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/80 backdrop-blur-xs text-center z-20">
            <ThreeDotsLoader size="lg" color="#0d7c85" />
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0d7c85] font-mono text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              <span>
                {analysisStage === "classifying" ? "Step 2 of 3 • Taxonomy & Health" : analysisStage === "rendering" ? "Step 3 of 3 • Overlay Synthesis" : "Step 1 of 3 • Segmentation"}
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-[#0f1e4a]">
              {analysisStage === "classifying" ? "Classifying Coral Taxa..." : analysisStage === "rendering" ? "Synthesizing Coral Map..." : "Segmenting Colonies..."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full">
      <div className={cn("grid gap-4", isSideBySide ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {showOriginal && renderFrame("Original Image", "SOURCE", originalSrc, false, () => openModal("primary"), false)}
        {showOverlay && renderFrame(
          layoutMode === "Masks on Black" ? "Isolated Coral Masks" : "Segmentation Overlay",
          layoutMode === "Masks on Black" ? "MASKS" : getBadgeLabel(),
          overlaySrc || originalSrc,
          isDarkBg,
          () => openModal(overlaySrc ? "secondary" : "primary"),
          true
        )}
      </div>

      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        primarySrc={originalSrc}
        primaryTitle="Original Reef Imagery"
        primaryBadge="SOURCE"
        secondarySrc={overlaySrc}
        secondaryTitle="Segmentation Overlay"
        secondaryBadge={getBadgeLabel()}
        initialMode={lightboxMode}
        segments={segments}
        imageResolution={imageResolution}
      />
    </div>
  );
};
