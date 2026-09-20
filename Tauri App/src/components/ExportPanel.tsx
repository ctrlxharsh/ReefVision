import React, { useState } from "react";
import {
  Download,
  FileCode,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { exportCocoJson, exportCsvData } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ExportPanelProps {
  imageName: string;
  minAreaPx: number;
  overlayDataUrl: string | null;
  rawJsonData: any;
  hasSegments: boolean;
}

interface SaveResult {
  success: boolean;
  path: string | null;
  cancelled: boolean;
  error: string | null;
}

const isTauri = () =>
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

async function saveFileNativeOrBrowser(params: {
  defaultName: string;
  filterName: string;
  extensions: string[];
  content: string;
  isBase64?: boolean;
}): Promise<SaveResult> {
  if (isTauri()) {
    try {
      const res = await invoke<SaveResult>("save_file_dialog", {
        defaultName: params.defaultName,
        filterName: params.filterName,
        extensions: params.extensions,
        content: params.content,
        isBase64: !!params.isBase64,
      });
      return res;
    } catch (e: any) {
      console.warn("Tauri native save error, trying browser fallback:", e);
    }
  }

  // Browser fallback
  try {
    const a = document.createElement("a");
    if (params.isBase64) {
      a.href = params.content;
    } else {
      const mime =
        params.extensions[0] === "json" ? "application/json" : "text/csv";
      const blob = new Blob([params.content], { type: mime });
      a.href = URL.createObjectURL(blob);
    }
    a.download = params.defaultName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 200);
    return { success: true, path: params.defaultName, cancelled: false, error: null };
  } catch (e: any) {
    return { success: false, path: null, cancelled: false, error: String(e) };
  }
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  imageName,
  minAreaPx,
  overlayDataUrl,
  rawJsonData,
  hasSegments,
}) => {
  const [showJson, setShowJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const stemName = imageName.replace(/\.[^/.]+$/, "");

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  const getShortName = (fullPath: string) => {
    const parts = fullPath.split(/[/\\]/);
    return parts[parts.length - 1] || fullPath;
  };

  const handleDownloadCoco = async () => {
    try {
      setIsExporting(true);
      setFeedbackMsg(null);

      let data = null;
      try {
        data = await exportCocoJson(imageName, minAreaPx);
      } catch (err) {
        console.warn("Backend COCO export returned error, generating from client data:", err);
        data = {
          info: {
            description: "ReefVision Coral Segmentation COCO Export",
            version: "1.0",
            year: new Date().getFullYear(),
          },
          images: [
            {
              id: 1,
              file_name: imageName,
              width: 1024,
              height: 1024,
            },
          ],
          annotations: (rawJsonData?.segments || []).map((s: any, idx: number) => ({
            id: idx + 1,
            image_id: 1,
            category_id: s.id,
            category_name: s.genus || "Coral",
            growth_form: s.growth_form || "-",
            condition: s.condition || (s.is_bleached ? "Bleached" : "Healthy"),
            area: s.area_px || s.area || 0,
            confidence: s.taxon_conf || 0,
            bbox: s.bbox || [],
          })),
          summary_stats: rawJsonData?.summary,
          health_summary: rawJsonData?.health_summary,
        };
      }

      const res = await saveFileNativeOrBrowser({
        defaultName: `${stemName}_coco.json`,
        filterName: "COCO JSON Document",
        extensions: ["json"],
        content: JSON.stringify(data, null, 2),
        isBase64: false,
      });

      if (res.success && res.path) {
        showFeedback(`Exported: ${getShortName(res.path)}`);
      } else if (res.error) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e: any) {
      alert(`COCO export error: ${e.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadOverlay = async () => {
    if (!overlayDataUrl) {
      alert("No overlay available to export yet. Please wait for model analysis to complete.");
      return;
    }
    try {
      setIsExporting(true);
      setFeedbackMsg(null);

      const res = await saveFileNativeOrBrowser({
        defaultName: `${stemName}_segmentation_overlay.png`,
        filterName: "PNG Image",
        extensions: ["png"],
        content: overlayDataUrl,
        isBase64: true,
      });

      if (res.success && res.path) {
        showFeedback(`Exported: ${getShortName(res.path)}`);
      } else if (res.error) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Overlay export error: ${e.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsExporting(true);
      setFeedbackMsg(null);

      let csvStr = "";
      try {
        csvStr = await exportCsvData(imageName, minAreaPx);
      } catch (err) {
        console.warn("Backend CSV export error, falling back to client synthesis:", err);
        const headers = [
          "ID",
          "Taxon Genus",
          "Growth Form",
          "Taxon Conf (%)",
          "Condition",
          "Condition Conf (%)",
          "Area (%)",
          "Area (px)",
          "IoU Confidence",
        ];
        const rows = rawJsonData.segments.map((s: any) => [
          `#${s.id}`,
          `"${s.genus || "Coral"}"`,
          `"${s.growth_form || "-"}"`,
          (s.taxon_conf || 0).toFixed(1),
          s.is_bleached ? "Bleached" : "Healthy",
          (s.bleaching_conf || 0).toFixed(1),
          `${(s.area_pct || 0).toFixed(2)}%`,
          s.area_px || s.area || 0,
          (s.predicted_iou || s.iou || 0).toFixed(3),
        ]);
        csvStr = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      }

      if (!csvStr) {
        alert("No segment records available to export as CSV.");
        return;
      }

      const res = await saveFileNativeOrBrowser({
        defaultName: `${stemName}_segments.csv`,
        filterName: "CSV Spreadsheet",
        extensions: ["csv"],
        content: csvStr,
        isBase64: false,
      });

      if (res.success && res.path) {
        showFeedback(`Exported: ${getShortName(res.path)}`);
      } else if (res.error) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e: any) {
      alert(`CSV export error: ${e.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="shadow-xs border-slate-200/90 overflow-hidden">
      <CardHeader className="p-5 pb-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-teal-50 text-[#0d7c85] flex items-center justify-center shrink-0">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-[#0f1e4a]">
              Export & Data Inspector
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Save COCO annotations, visual masks, and benthic data spreadsheets
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCoco}
            disabled={isExporting}
            className="h-10 justify-center border-slate-200 hover:border-[#0d7c85] hover:text-[#0d7c85] hover:bg-teal-50/40 text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" />
            ) : (
              <FileCode className="h-4 w-4 text-[#0d7c85]" />
            )}
            <span>Export COCO JSON</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadOverlay}
            disabled={isExporting || !overlayDataUrl}
            className="h-10 justify-center border-slate-200 hover:border-[#0d7c85] hover:text-[#0d7c85] hover:bg-teal-50/40 text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" />
            ) : (
              <ImageIcon className="h-4 w-4 text-[#0d7c85]" />
            )}
            <span>Export Overlay PNG</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCsv}
            disabled={isExporting || !hasSegments}
            className="h-10 justify-center border-slate-200 hover:border-[#0d7c85] hover:text-[#0d7c85] hover:bg-teal-50/40 text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-[#0d7c85]" />
            )}
            <span>Export Segments CSV</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* JSON Inspector Accordion */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-100/70 text-left transition-colors"
            onClick={() => setShowJson(!showJson)}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <FileCode className="h-4 w-4 text-[#0d7c85]" />
              <span>Raw Model Output (JSON)</span>
            </div>
            {showJson ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showJson && (
            <div className="p-4 border-t border-slate-200 bg-slate-900">
              <pre className="text-[11px] font-mono text-slate-200 max-h-80 overflow-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(rawJsonData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
