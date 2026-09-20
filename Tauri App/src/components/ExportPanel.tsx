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
      alert("No segmentation overlay rendered yet to export.");
      return;
    }
    try {
      setIsExporting(true);
      setFeedbackMsg(null);

      const res = await saveFileNativeOrBrowser({
        defaultName: `${stemName}_overlay.png`,
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
        console.warn("Backend CSV export returned error, generating from client segments:", err);
      }

      if (!csvStr && rawJsonData?.segments && rawJsonData.segments.length > 0) {
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
    <div style={{ marginTop: "2rem" }}>
      <div className="section-title">
        <Download size={20} color="var(--color-navy)" />
        <span>Export & Data Inspector</span>
      </div>

      <div className="export-grid">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownloadCoco}
          disabled={isExporting}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileCode size={16} />}
          <span>Export COCO JSON</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownloadOverlay}
          disabled={isExporting || !overlayDataUrl}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          <span>Export Overlay PNG</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownloadCsv}
          disabled={isExporting || !hasSegments}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          <span>Export Segments CSV</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="export-feedback-toast">
          <CheckCircle2 size={15} color="#059669" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="sidebar-expander" style={{ marginTop: "1rem" }}>
        <div
          className="expander-header"
          onClick={() => setShowJson(!showJson)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileCode size={16} color="var(--color-teal)" />
            <span>Raw Model Output (JSON)</span>
          </div>
          {showJson ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        {showJson && (
          <div className="expander-body">
            <pre className="raw-json-box">
              {JSON.stringify(rawJsonData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
