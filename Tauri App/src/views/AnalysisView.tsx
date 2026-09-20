import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { PaginationBar } from "../components/PaginationBar";
import { ImageViewer } from "../components/ImageViewer";
import { MetricCards } from "../components/MetricCards";
import { SegmentsTable } from "../components/SegmentsTable";
import { ExportPanel } from "../components/ExportPanel";
import {
  LoadedImage,
  DeviceInfo,
  CoralSegment,
  SummaryStats,
  HealthSummary,
  AnalysisStage,
} from "../types";
import {
  runSegmentation,
  runEnrichment,
  renderOverlay,
  getDevice,
  setDevicePreference,
} from "../services/api";

interface AnalysisViewProps {
  images: LoadedImage[];
  onBackToUpload: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  images,
  onBackToUpload,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Inference Parameters
  const [pointsPerSide, setPointsPerSide] = useState<number>(16);
  const [iouThresh, setIouThresh] = useState<number>(0.50);
  const [stabilityThresh, setStabilityThresh] = useState<number>(0.50);
  const [minAreaPx, setMinAreaPx] = useState<number>(100);

  // Display Controls
  const [layoutMode, setLayoutMode] = useState<string>("Side-by-Side");
  const [colorMode, setColorMode] = useState<string>("instance");
  const [alpha, setAlpha] = useState<number>(0.45);
  const [drawContours, setDrawContours] = useState<boolean>(true);
  const [drawLabels, setDrawLabels] = useState<boolean>(true);
  const [drawBoxes, setDrawBoxes] = useState<boolean>(false);
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null);

  // Device Info
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [devicePref, setDevicePref] = useState<string>("auto");

  // Analysis State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [segments, setSegments] = useState<CoralSegment[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    total_corals_detected: 0,
    coral_coverage_pct: 0,
    coral_covered_pixels: 0,
    total_image_pixels: 0,
    image_resolution: "0x0",
    mean_iou_confidence: 0,
    mean_stability_score: 0,
  });
  const [healthSummary, setHealthSummary] = useState<HealthSummary>({
    healthy_count: 0,
    bleached_count: 0,
    bleaching_prevalence_pct: 0,
  });
  const [sceneEval, setSceneEval] = useState<Record<string, any>>({});

  const currentImage = images[currentIndex] || images[0];

  // Fetch initial device info
  useEffect(() => {
    getDevice()
      .then(setDeviceInfo)
      .catch((e: unknown) => console.error("Device fetch failed", e));
  }, []);

  const handleDeviceChange = async (val: string) => {
    setDevicePref(val);
    try {
      const updated = await setDevicePreference(val);
      setDeviceInfo(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Reset overlay & telemetry when switching images
  useEffect(() => {
    setOverlaySrc(null);
    setSelectedMaskId(null);
    setSegments([]);
    setStats({
      total_corals_detected: 0,
      coral_coverage_pct: 0,
      coral_covered_pixels: 0,
      total_image_pixels: 0,
      image_resolution: "0x0",
      mean_iou_confidence: 0,
      mean_stability_score: 0,
    });
  }, [currentImage?.name]);

  // Run Segmentation & Enrichment when image or SAM hyperparameters change
  useEffect(() => {
    if (!currentImage) return;
    let isCancelled = false;

    const executeAnalysis = async () => {
      setIsLoading(true);
      setAnalysisError(null);
      setAnalysisStage("segmenting");
      try {
        // Step 1: Run SAM ViT-B Segmentation
        await runSegmentation(
          currentImage.name,
          pointsPerSide,
          iouThresh,
          stabilityThresh,
          currentImage.dataUrl.startsWith("data:") ? currentImage.dataUrl : undefined
        );

        if (isCancelled) return;

        // Step 2: Enrich filtered masks with BioCLIP & YOLO11
        setAnalysisStage("classifying");
        const enrichResult = await runEnrichment(currentImage.name, minAreaPx);

        if (isCancelled) return;

        setSegments(enrichResult.segments);
        setStats(enrichResult.summary);
        setHealthSummary(enrichResult.health_summary);
        setSceneEval(enrichResult.scene_eval);

        // Step 3: Render Overlay
        setAnalysisStage("rendering");
        const overlayDataUrl = await renderOverlay({
          imageName: currentImage.name,
          minAreaPx,
          alpha,
          drawContours,
          drawLabels,
          drawBoxes,
          selectedMaskId,
          colorMode,
          layoutMode,
        });

        if (isCancelled) return;
        setOverlaySrc(overlayDataUrl);
      } catch (err: any) {
        console.error("Analysis execution error:", err);
        if (!isCancelled) {
          setAnalysisError(err?.message || "Analysis execution failed");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setAnalysisStage("idle");
        }
      }
    };

    executeAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [
    currentImage?.name,
    pointsPerSide,
    iouThresh,
    stabilityThresh,
    minAreaPx,
  ]);

  // Fast re-render overlay when display controls or selection change (milliseconds!)
  useEffect(() => {
    if (!currentImage || segments.length === 0) return;
    let isCancelled = false;

    const updateOverlay = async () => {
      try {
        const overlayDataUrl = await renderOverlay({
          imageName: currentImage.name,
          minAreaPx,
          alpha,
          drawContours,
          drawLabels,
          drawBoxes,
          selectedMaskId,
          colorMode,
          layoutMode,
        });
        if (!isCancelled) {
          setOverlaySrc(overlayDataUrl);
        }
      } catch (err) {
        console.error("Overlay update failed:", err);
      }
    };

    updateOverlay();

    return () => {
      isCancelled = true;
    };
  }, [
    alpha,
    drawContours,
    drawLabels,
    drawBoxes,
    selectedMaskId,
    colorMode,
    layoutMode,
  ]);

  // Global arrow navigation between images
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [images.length]);

  return (
    <div className="analysis-layout">
      {/* Top Bar: Back, Andromeida Branding, Hardware Device */}
      <TopBar
        onBack={onBackToUpload}
        deviceInfo={deviceInfo}
      />

      {analysisError && (
        <div style={{
          background: "#fef2f2",
          borderBottom: "1px solid #fecaca",
          padding: "10px 1.5rem",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          fontWeight: 500,
          zIndex: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{analysisError}</span>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 10px", fontSize: "0.78rem", borderColor: "#fca5a5", color: "#b91c1c" }}
            onClick={onBackToUpload}
          >
            Return to Download Models
          </button>
        </div>
      )}

      {/* Analysis Studio Body */}
      <div className="analysis-body">
        {/* Collapsible Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          pointsPerSide={pointsPerSide}
          onPointsPerSideChange={setPointsPerSide}
          iouThresh={iouThresh}
          onIouThreshChange={setIouThresh}
          stabilityThresh={stabilityThresh}
          onStabilityThreshChange={setStabilityThresh}
          minAreaPx={minAreaPx}
          onMinAreaPxChange={setMinAreaPx}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          alpha={alpha}
          onAlphaChange={setAlpha}
          drawContours={drawContours}
          onDrawContoursChange={setDrawContours}
          drawLabels={drawLabels}
          onDrawLabelsChange={setDrawLabels}
          drawBoxes={drawBoxes}
          onDrawBoxesChange={setDrawBoxes}
          segments={segments}
          selectedMaskId={selectedMaskId}
          onSelectMaskId={setSelectedMaskId}
          deviceInfo={deviceInfo}
          devicePreference={devicePref}
          onDevicePreferenceChange={handleDeviceChange}
        />

        {/* Main Studio Canvas & Results */}
        <main className="main-view">
          <div className="block-container">
            {analysisError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  color: "#991b1b",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.85rem",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Gallery Navigation Toolbar: Extreme Left (Prev + Left Pages), Center (Name), Extreme Right (Right Pages + Next) */}
            <PaginationBar
              currentIndex={currentIndex}
              totalImages={images.length}
              currentImageName={currentImage.name}
              onPrev={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              onNext={() => setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1))}
              onSelectPage={(idx) => setCurrentIndex(idx)}
            />

            {/* Canvas Image Viewer with Hover Fullscreen & Coral Inspection */}
            <ImageViewer
              originalSrc={currentImage.dataUrl}
              overlaySrc={overlaySrc}
              layoutMode={layoutMode}
              colorMode={colorMode}
              isLoading={isLoading}
              analysisStage={analysisStage}
              segments={segments}
              imageResolution={stats.image_resolution}
            />

            {/* 4 KPI Summary Cards with Rich Top Color Accents */}
            <MetricCards stats={stats} isLoading={isLoading} />

            {/* Detected Coral Segments Breakdown Table */}
            <SegmentsTable
              segments={segments}
              stats={stats}
              selectedSegmentId={selectedMaskId}
              onSelectSegment={(id) => setSelectedMaskId(id)}
              isLoading={isLoading}
            />

            {/* Export & Data Inspector */}
            <ExportPanel
              imageName={currentImage.name}
              minAreaPx={minAreaPx}
              overlayDataUrl={overlaySrc}
              rawJsonData={{
                summary: stats,
                health_summary: healthSummary,
                scene_taxonomy: sceneEval?.taxonomy,
                scene_bleaching: sceneEval?.bleaching,
                segments: segments,
              }}
              hasSegments={segments.length > 0}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
