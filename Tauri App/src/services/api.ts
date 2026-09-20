import {
  DeviceInfo,
  ModelStatusResponse,
  ModelDeleteResponse,
  DownloadProgress,
  SampleItem,
  AnalysisData,
} from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function checkHealth(): Promise<{ status: string; device: DeviceInfo }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend offline");
  return res.json();
}

export async function getDevice(): Promise<DeviceInfo> {
  const res = await fetch(`${API_BASE}/device/info`);
  if (!res.ok) throw new Error("Failed to fetch device info");
  return res.json();
}

export async function getModelsStatus(): Promise<ModelStatusResponse> {
  const res = await fetch(`${API_BASE}/models/status`);
  if (!res.ok) throw new Error("Failed to fetch models status");
  return res.json();
}

export async function triggerModelDownload(
  force: boolean = false,
  target?: string | string[]
): Promise<void> {
  const body: any = { force };
  if (Array.isArray(target)) {
    body.filenames = target;
  } else if (target) {
    body.filename = target;
  }
  const res = await fetch(`${API_BASE}/models/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to start model download");
}

export async function deleteModel(
  target?: string | string[]
): Promise<ModelDeleteResponse> {
  let body: any;
  if (!target) {
    body = { all: true };
  } else if (Array.isArray(target)) {
    body = { filenames: target, all: false };
  } else {
    body = { filename: target, all: false };
  }
  const res = await fetch(`${API_BASE}/models/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete model");
  }
  return res.json();
}

export async function getDownloadProgress(): Promise<DownloadProgress> {
  const res = await fetch(`${API_BASE}/models/download/progress`);
  if (!res.ok) throw new Error("Failed to get download progress");
  return res.json();
}

export async function setDevicePreference(preference: string): Promise<DeviceInfo> {
  const res = await fetch(`${API_BASE}/device/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preference }),
  });
  if (!res.ok) throw new Error("Failed to set device preference");
  return res.json();
}

export async function getSamples(): Promise<SampleItem[]> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error("Failed to fetch sample images");
  return res.json();
}

export function getSampleImageUrl(filename: string): string {
  return `${API_BASE}/samples/image/${encodeURIComponent(filename)}`;
}

export async function registerImage(filename: string, dataUrl: string): Promise<any> {
  const res = await fetch(`${API_BASE}/images/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, data: dataUrl }),
  });
  if (!res.ok) throw new Error("Failed to register image");
  return res.json();
}

export async function loadSampleToStore(filename: string): Promise<any> {
  const res = await fetch(`${API_BASE}/images/load-sample`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) throw new Error("Failed to load sample to store");
  return res.json();
}

export async function runSegmentation(
  imageName: string,
  pointsPerSide: number,
  iouThresh: number,
  stabilityThresh: number,
  imageBase64?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/analysis/segment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: imageName,
      points_per_side: pointsPerSide,
      iou_thresh: iouThresh,
      stability_thresh: stabilityThresh,
      image_base64: imageBase64,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Segmentation failed");
  }
  return res.json();
}

export async function runEnrichment(
  imageName: string,
  minAreaPx: number
): Promise<AnalysisData> {
  const res = await fetch(`${API_BASE}/analysis/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: imageName,
      min_area_px: minAreaPx,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Enrichment failed");
  }
  return res.json();
}

export async function renderOverlay(params: {
  imageName: string;
  minAreaPx: number;
  alpha: number;
  drawContours: boolean;
  drawLabels: boolean;
  drawBoxes: boolean;
  selectedMaskId?: number | null;
  colorMode: string;
  layoutMode: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/analysis/overlay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: params.imageName,
      min_area_px: params.minAreaPx,
      alpha: params.alpha,
      draw_contours: params.drawContours,
      draw_labels: params.drawLabels,
      draw_boxes: params.drawBoxes,
      selected_mask_id: params.selectedMaskId,
      color_mode: params.colorMode,
      layout_mode: params.layoutMode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Overlay render failed");
  }
  const data = await res.json();
  return data.overlay_base64;
}

export async function exportCocoJson(imageName: string, minAreaPx: number): Promise<any> {
  const res = await fetch(`${API_BASE}/analysis/export/coco`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: imageName,
      min_area_px: minAreaPx,
    }),
  });
  if (!res.ok) throw new Error("COCO export failed");
  return res.json();
}

export async function exportCsvData(imageName: string, minAreaPx: number): Promise<string> {
  const res = await fetch(`${API_BASE}/analysis/export/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: imageName,
      min_area_px: minAreaPx,
    }),
  });
  if (!res.ok) throw new Error("CSV export failed");
  return res.text();
}
