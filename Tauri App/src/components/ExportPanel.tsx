import React, { useState } from "react";
import { Download, FileCode, FileSpreadsheet, Image as ImageIcon, CheckCircle2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { exportCocoJson, exportCsvData } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

const isTauri = () => typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

async function saveFileNativeOrBrowser(params: {
  defaultName: string;
  filterName: string;
  extensions: string[];
  content: string;
  isBase64?: boolean;
}): Promise<SaveResult> {
  if (isTauri()) {
    try {
      return await invoke<SaveResult>("save_file_dialog", { ...params, isBase64: !!params.isBase64 });
    } catch (e) {
      console.warn("Native save fallback:", e);
    }
  }
  try {
    const a = document.createElement("a");
    if (params.isBase64) {
      a.href = params.content;
    } else {
      const mime = params.extensions[0] === "json" ? "application/json" : "text/csv";
      a.href = URL.createObjectURL(new Blob([params.content], { type: mime }));
    }
    a.download = params.defaultName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
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
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const stem = imageName.replace(/\.[^/.]+$/, "");

  const handleExport = async (
    fetcher: () => Promise<{ name: string; filter: string; ext: string[]; content: string; isBase64?: boolean }>
  ) => {
    setIsExporting(true);
    try {
      const { name, filter, ext, content, isBase64 } = await fetcher();
      const res = await saveFileNativeOrBrowser({ defaultName: name, filterName: filter, extensions: ext, content, isBase64 });
      if (res.success && res.path) {
        setFeedbackMsg(`Exported: ${res.path.split(/[/\\]/).pop()}`);
        setTimeout(() => setFeedbackMsg(null), 5000);
      } else if (res.error) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Export error: ${e?.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
      <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40">
        <CardTitle className="text-sm font-bold text-[#0f1e4a] flex items-center gap-2">
          <Download className="h-4 w-4 text-[#0d7c85]" />
          <span>Export & Data Inspector</span>
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Save COCO annotations, visual masks, and benthic data spreadsheets
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            disabled={isExporting}
            onClick={() => handleExport(async () => {
              const data = await exportCocoJson(imageName, minAreaPx);
              return { name: `${stem}_coco.json`, filter: "COCO JSON", ext: ["json"], content: JSON.stringify(data, null, 2) };
            })}
            className="h-10 bg-white border-slate-200 hover:text-[#0d7c85] text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" /> : <FileCode className="h-4 w-4 text-[#0d7c85]" />}
            <span>Export COCO JSON</span>
          </Button>

          <Button
            variant="outline"
            disabled={isExporting || !overlayDataUrl}
            onClick={() => handleExport(async () => ({
              name: `${stem}_overlay.png`, filter: "PNG Image", ext: ["png"], content: overlayDataUrl!, isBase64: true
            }))}
            className="h-10 bg-white border-slate-200 hover:text-[#0d7c85] text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" /> : <ImageIcon className="h-4 w-4 text-[#0d7c85]" />}
            <span>Export Overlay PNG</span>
          </Button>

          <Button
            variant="outline"
            disabled={isExporting || !hasSegments}
            onClick={() => handleExport(async () => {
              const csv = await exportCsvData(imageName, minAreaPx);
              return { name: `${stem}_segments.csv`, filter: "CSV", ext: ["csv"], content: csv };
            })}
            className="h-10 bg-white border-slate-200 hover:text-[#0d7c85] text-xs font-semibold gap-2 shadow-xs"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-[#0d7c85]" /> : <FileSpreadsheet className="h-4 w-4 text-[#0d7c85]" />}
            <span>Export Segments CSV</span>
          </Button>
        </div>

        {feedbackMsg && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <Accordion type="single" collapsible className="w-full border border-slate-200 rounded-lg overflow-hidden">
          <AccordionItem value="json-output" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 bg-slate-50/80 hover:bg-slate-100 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#0d7c85]" />
                <span>Raw Model Output Telemetry (JSON)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 border-t border-slate-200 bg-slate-950">
              <pre className="p-4 text-[11px] font-mono text-slate-200 max-h-80 overflow-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(rawJsonData, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
