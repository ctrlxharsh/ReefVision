import React, { useState } from "react";
import { Download, FileCode, ChevronDown, ChevronRight, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import { exportCocoJson, exportCsvData } from "../services/api";

interface ExportPanelProps {
  imageName: string;
  minAreaPx: number;
  overlayDataUrl: string | null;
  rawJsonData: any;
  hasSegments: boolean;
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

  const stemName = imageName.replace(/\.[^/.]+$/, "");

  const handleDownloadCoco = async () => {
    try {
      setIsExporting(true);
      const data = await exportCocoJson(imageName, minAreaPx);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stemName}_coco.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`COCO export failed: ${e}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadOverlay = () => {
    if (!overlayDataUrl) return;
    const a = document.createElement("a");
    a.href = overlayDataUrl;
    a.download = `${stemName}_overlay.png`;
    a.click();
  };

  const handleDownloadCsv = async () => {
    try {
      setIsExporting(true);
      const csvStr = await exportCsvData(imageName, minAreaPx);
      const blob = new Blob([csvStr], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stemName}_segments.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`CSV export failed: ${e}`);
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
          className="btn btn-secondary"
          onClick={handleDownloadCoco}
          disabled={isExporting}
        >
          <FileCode size={16} />
          Export COCO JSON
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleDownloadOverlay}
          disabled={!overlayDataUrl}
        >
          <ImageIcon size={16} />
          Export Overlay PNG
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleDownloadCsv}
          disabled={isExporting || !hasSegments}
        >
          <FileSpreadsheet size={16} />
          Export Segments CSV
        </button>
      </div>

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
