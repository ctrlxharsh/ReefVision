import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  UploadCloud,
  FolderHeart,
  Rocket,
  DownloadCloud,
  AlertCircle,
  CheckCircle2,
  Check,
  Cpu,
  Zap,
  Trash2,
  X,
} from "lucide-react";
import JSZip from "jszip";
import { BrandLogo } from "../components/BrandLogo";
import { UISelect } from "../components/UISelect";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DeviceInfo,
  ModelSpec,
  SampleItem,
  LoadedImage,
  DownloadProgress,
} from "../types";
import {
  checkHealth,
  getModelsStatus,
  triggerModelDownload,
  getDownloadProgress,
  deleteModel,
  setDevicePreference,
  getSamples,
  getSampleImageUrl,
  registerImage,
  loadSampleToStore,
} from "../services/api";

interface ModelGroupDef {
  id: "sam" | "bioclip" | "bleaching";
  name: string;
  fullName: string;
  task: string;
  size: string;
  filenames: string[];
}

const MODEL_GROUPS: ModelGroupDef[] = [
  {
    id: "sam",
    name: "Segmentation Model",
    fullName: "SAM ViT-B Segmentation Model",
    task: "Dense Instance Segmentation",
    size: "~383 MB",
    filenames: ["sam_image_encoder.onnx", "sam_mask_decoder.onnx"],
  },
  {
    id: "bioclip",
    name: "Taxonomical Model",
    fullName: "BioCLIP Taxonomy Model",
    task: "Taxonomy & Growth Form",
    size: "~345 MB",
    filenames: ["bioclip_visual.onnx", "coral_taxonomy_embeddings.npy"],
  },
  {
    id: "bleaching",
    name: "Bleach Detection Model",
    fullName: "NOAA Bleach Detection Model",
    task: "Reef Health & Bleaching",
    size: "~6.1 MB",
    filenames: ["bleaching_yolo11n.onnx"],
  },
];

interface UploadViewProps {
  onLaunchStudio: (images: LoadedImage[]) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onLaunchStudio }) => {
  const [activeTab, setActiveTab] = useState<"upload" | "samples">("samples");
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(true);
  const [allDownloaded, setAllDownloaded] = useState<boolean>(true);
  const [modelsList, setModelsList] = useState<ModelSpec[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [devicePref, setDevicePref] = useState<string>("auto");

  // Download state
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    is_downloading: false,
    overall_pct: 0,
    current_file: "",
    detail: "",
  });
  const [isDeletingModel, setIsDeletingModel] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Staged upload images
  const [stagedImages, setStagedImages] = useState<LoadedImage[]>([]);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Samples
  const [availableSamples, setAvailableSamples] = useState<SampleItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("First 6 Samples");
  const [selectedSpecific, setSelectedSpecific] = useState<string[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Poll backend health and initialize with continuous heartbeat
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isSubscribed = true;

    const pingAndSync = async () => {
      try {
        const health = await checkHealth();
        if (!isSubscribed) return;
        setIsBackendConnected(true);
        setIsCheckingBackend(false);
        setDeviceInfo(health.device);

        setAvailableSamples((prev) => {
          if (prev.length === 0) {
            getSamples()
              .then((samplesRes) => {
                if (isSubscribed) {
                  setAvailableSamples(samplesRes);
                  if (samplesRes.length > 0) {
                    setSelectedSpecific(samplesRes.slice(0, 4).map((s) => s.filename));
                  }
                }
              })
              .catch(console.error);

            getModelsStatus()
              .then((modelsRes) => {
                if (isSubscribed) {
                  setAllDownloaded(modelsRes.all_downloaded);
                  setModelsList(modelsRes.models);
                  setDeviceInfo(modelsRes.device_info);
                }
              })
              .catch(console.error);
          }
          return prev;
        });

        // Heartbeat check every 3s
        timer = setTimeout(pingAndSync, 3000);
      } catch (err) {
        if (!isSubscribed) return;
        setIsBackendConnected(false);
        setIsCheckingBackend(false);
        // Retry polling every 1.5 seconds until backend is online
        timer = setTimeout(pingAndSync, 1500);
      }
    };

    pingAndSync();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, []);

  const handleManualRetry = async () => {
    setIsCheckingBackend(true);
    setLoadError(null);
    try {
      const health = await checkHealth();
      setIsBackendConnected(true);
      setDeviceInfo(health.device);

      const [modelsRes, samplesRes] = await Promise.all([
        getModelsStatus(),
        getSamples(),
      ]);
      setAllDownloaded(modelsRes.all_downloaded);
      setModelsList(modelsRes.models);
      setDeviceInfo(modelsRes.device_info);
      setAvailableSamples(samplesRes);
      if (samplesRes.length > 0) {
        setSelectedSpecific(samplesRes.slice(0, 4).map((s) => s.filename));
      }
    } catch (e) {
      setIsBackendConnected(false);
      setLoadError("Could not connect to Python backend at http://127.0.0.1:8000");
    } finally {
      setIsCheckingBackend(false);
    }
  };

  // Device preference change
  const handleDeviceChange = async (val: string) => {
    setDevicePref(val);
    try {
      const updated = await setDevicePreference(val);
      setDeviceInfo(updated);
    } catch (e) {
      console.error("Failed to update device", e);
    }
  };

  // Trigger Download & Poll Progress (Re-download removed)
  const handleStartDownload = async (target?: string | string[]) => {
    try {
      await triggerModelDownload(false, target);
      const interval = setInterval(async () => {
        try {
          const prog = await getDownloadProgress();
          setDownloadProgress(prog);
          if (!prog.is_downloading && prog.overall_pct === 100) {
            clearInterval(interval);
            const modelsRes = await getModelsStatus();
            setAllDownloaded(modelsRes.all_downloaded);
            setModelsList(modelsRes.models);
          } else if (prog.error) {
            clearInterval(interval);
          }
        } catch {
          clearInterval(interval);
        }
      }, 500);
    } catch (e) {
      alert(`Download trigger error: ${e}`);
    }
  };

  // Delete one model group or specific file
  const handleDeleteModel = async (target: string) => {
    setIsDeletingModel(target);
    setLoadError(null);
    try {
      const res = await deleteModel(target);
      setAllDownloaded(res.all_downloaded);
      setModelsList(res.models);
    } catch (e: any) {
      alert(`Failed to delete model: ${e?.message || e}`);
    } finally {
      setIsDeletingModel(null);
    }
  };

  // Check readiness of model groups
  const isGroupReady = (groupId: string): boolean => {
    if (allDownloaded) return true;
    const group = MODEL_GROUPS.find((g) => g.id === groupId);
    if (!group) return false;
    return group.filenames.every((fname) => {
      const item = modelsList.find((m) => m.filename === fname || m.filename.includes(fname));
      return item?.cached ?? false;
    });
  };

  const getEngineName = (info: DeviceInfo | null): string => {
    if (!info) return "Detecting compute hardware...";
    if (info.device_type === "gpu" || info.active_provider?.includes("CUDA")) {
      return info.gpu_name || "NVIDIA CUDA GPU";
    }
    if (info.mode === "cpu") {
      return "Single-Threaded CPU Engine (1 Thread)";
    }
    if (info.cpu_count && info.cpu_count > 1) {
      return `Multi-Threaded CPU Engine (${info.cpu_count} Threads)`;
    }
    return info.gpu_name || "CPU Engine";
  };

  // Compute active sample subset
  const sampleSubset = useMemo(() => {
    if (selectedPreset === "First 6 Samples") return availableSamples.slice(0, 6);
    if (selectedPreset === "First 12 Samples") return availableSamples.slice(0, 12);
    if (selectedPreset === "First 24 Samples") return availableSamples.slice(0, 24);
    if (selectedPreset === "All Available Samples") return availableSamples;
    return availableSamples.filter((s) => selectedSpecific.includes(s.filename));
  }, [selectedPreset, availableSamples, selectedSpecific]);

  // File Upload Handlers
  const handleFiles = async (fileList: FileList) => {
    setIsProcessingUpload(true);
    setLoadError(null);
    const newImages: LoadedImage[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const name = file.name;
      const lower = name.toLowerCase();

      if (lower.endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const entries = Object.keys(zip.files);
          for (const filename of entries) {
            const entry = zip.files[filename];
            if (entry.dir) continue;
            const baseName = filename.split("/").pop() || "";
            if (baseName.startsWith(".") || filename.includes("__MACOSX")) continue;

            const ext = baseName.split(".").pop()?.toLowerCase() || "";
            if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
              const blob = await entry.async("blob");
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              newImages.push({ name: baseName, dataUrl });
            }
          }
        } catch (err) {
          console.error(`Error reading zip ${name}:`, err);
        }
      } else {
        const ext = name.split(".").pop()?.toLowerCase() || "";
        if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newImages.push({ name, dataUrl });
        }
      }
    }

    setStagedImages((prev) => [...prev, ...newImages]);
    setIsProcessingUpload(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Launch Staged Upload Images
  const handleLaunchUploaded = async () => {
    if (stagedImages.length === 0) {
      alert("Please upload at least 1 image first.");
      return;
    }
    // Preflight verify models are downloaded
    const modelsRes = await getModelsStatus().catch(() => null);
    if (!modelsRes || !modelsRes.all_downloaded) {
      setAllDownloaded(false);
      if (modelsRes) setModelsList(modelsRes.models);
      setLoadError("Process blocked: Foundation models are missing or deleted. You must download all models before proceeding.");
      return;
    }
    setIsProcessingUpload(true);
    setLoadError(null);
    try {
      for (const img of stagedImages) {
        await registerImage(img.name, img.dataUrl);
      }
      onLaunchStudio(stagedImages);
    } catch (e) {
      setLoadError(`Failed to register images with engine: ${e}`);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Launch Sample Library Images
  const handleLaunchSamples = async () => {
    if (sampleSubset.length === 0) {
      alert("No sample images available to launch. Please select at least 1 file.");
      return;
    }
    // Preflight verify models are downloaded
    const modelsRes = await getModelsStatus().catch(() => null);
    if (!modelsRes || !modelsRes.all_downloaded) {
      setAllDownloaded(false);
      if (modelsRes) setModelsList(modelsRes.models);
      setLoadError("Process blocked: Foundation models are missing or deleted. You must download all models before proceeding.");
      return;
    }
    setIsLoadingSamples(true);
    setLoadError(null);
    try {
      // First verify backend is responsive
      await checkHealth();

      const loaded: LoadedImage[] = [];
      for (const s of sampleSubset) {
        await loadSampleToStore(s.filename);
        loaded.push({
          name: s.filename,
          dataUrl: getSampleImageUrl(s.filename),
        });
      }
      onLaunchStudio(loaded);
    } catch (e: any) {
      setIsBackendConnected(false);
      setLoadError(`Vision engine at http://127.0.0.1:8000 is unreachable: ${e?.message || e}`);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-card">
        {/* Left Column: Branding & Hardware Acceleration */}
        <div className="portal-brand-col">
          <BrandLogo />

          {/* System & Model Status Panel */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-2.5 shadow-xs mb-2.5">
            {/* Row 1: Vision Engine Connected */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isBackendConnected ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                ) : (
                  <span className={`h-2 w-2 rounded-full ${isCheckingBackend ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
                )}
                <span className="text-xs font-bold text-slate-800">Vision Engine</span>
              </div>

              {isBackendConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <Check size={10} strokeWidth={2.5} />
                  Connected
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-amber-700">
                    {isCheckingBackend ? "Connecting..." : "Offline"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-semibold border-amber-300 hover:bg-amber-50"
                    onClick={handleManualRetry}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>

            {isBackendConnected && (
              <>
                <div className="h-px bg-slate-200/70 my-2" />

                {/* Row 2: Foundation Models header + Delete/Manage Button */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {allDownloaded ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={13} className="text-amber-600" />
                    )}
                    <span className="text-xs font-bold text-slate-800">Foundation Models</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                        allDownloaded
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200/70"
                          : "text-amber-700 bg-amber-50 border-amber-200/70"
                      }`}
                    >
                      {allDownloaded ? "Ready" : "Download Required"}
                    </span>
                    {allDownloaded && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200 gap-1 rounded-md transition-colors"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={downloadProgress.is_downloading || !!isDeletingModel}
                        title="Manage and delete individual foundation models"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Manage</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 3: Models list with exact names requested by user */}
                <div className="flex flex-col gap-1">
                  {MODEL_GROUPS.map((group) => {
                    const ready = isGroupReady(group.id);
                    return (
                      <div
                        key={group.id}
                        className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-slate-200/70 text-xs hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ready ? (
                            <Check size={12} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                          ) : (
                            <AlertCircle size={12} className="text-amber-500 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-700 text-[11px] truncate" title={group.fullName}>
                            {group.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded">
                            {group.size}
                          </span>
                          {ready && (
                            <button
                              type="button"
                              className="text-slate-300 hover:text-red-500 transition-colors p-0.5 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModel(group.id);
                              }}
                              disabled={downloadProgress.is_downloading || !!isDeletingModel}
                              title={`Delete ${group.name} (${group.size})`}
                            >
                              <Trash2
                                size={11}
                                className={isDeletingModel === group.id ? "animate-spin text-red-500" : ""}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {downloadProgress.is_downloading && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-slate-200/80">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-800 mb-1">
                      <span className="truncate max-w-[200px]">{downloadProgress.current_file}</span>
                      <span className="text-teal-700 font-mono">{downloadProgress.overall_pct}%</span>
                    </div>
                    <Progress
                      value={downloadProgress.overall_pct}
                      className="h-1.5 bg-slate-100 my-1"
                      indicatorColor="bg-[#0d7c85]"
                    />
                    <div className="text-[10px] text-slate-500">{downloadProgress.detail}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hardware Acceleration Subcard */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Cpu size={14} className="text-teal-600" />
                <span className="text-[11px] font-bold text-[#0f1e4a] tracking-wider uppercase">
                  Hardware Acceleration
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                  Active
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100 mb-2">
              <span className="text-[11px] font-medium text-slate-500">Active Engine</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {deviceInfo?.device_type === "gpu" || deviceInfo?.active_provider?.includes("CUDA") ? (
                  <Zap size={11} className="text-amber-500" />
                ) : (
                  <Cpu size={11} className="text-teal-600" />
                )}
                <span className="truncate max-w-[170px]">{getEngineName(deviceInfo)}</span>
              </div>
            </div>

            <div className="mb-1.5">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Device Preference
              </label>
              <UISelect
                value={devicePref}
                onChange={handleDeviceChange}
                options={[
                  {
                    value: "auto",
                    label: deviceInfo?.gpu_available
                      ? `Auto (GPU: ${deviceInfo.gpu_name})`
                      : deviceInfo?.cpu_count && deviceInfo.cpu_count > 1
                      ? `Auto (Multi-Threaded CPU - ${deviceInfo.cpu_count} Threads)`
                      : "Auto (CPU)",
                  },
                  {
                    value: "gpu",
                    label: `GPU Acceleration ${deviceInfo?.gpu_available ? `(${deviceInfo.gpu_name})` : "[Unavailable]"}`,
                  },
                  {
                    value: "multithread_cpu",
                    label: `Multi-Threaded CPU Engine (${deviceInfo?.cpu_count || 4} Threads)`,
                  },
                  {
                    value: "cpu",
                    label: "Single-Threaded CPU Engine (1 Thread)",
                  },
                ]}
                placeholder="Select device"
              />
            </div>

            <div className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-100">
              {deviceInfo?.gpu_available
                ? "Tensor operations accelerated natively via local GPU execution provider."
                : "Parallel tensor operations accelerated across all CPU cores via ONNX Runtime."}
            </div>
          </div>
        </div>

        {/* Right Column: Download or Upload/Samples */}
        <div className="portal-content-col">
          {loadError && (
            <div className="locked-notice shrink-0" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={16} />
                <span>{loadError}</span>
              </div>
            </div>
          )}

          {!allDownloaded && isBackendConnected ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="shrink-0">
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-navy)", marginBottom: "0.5rem" }}>
                  Foundation Models Required
                </h3>
                <div className="locked-notice">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={16} />
                    <span>Action Required: Please download foundation models to unlock imagery upload & analysis.</span>
                  </div>
                </div>
              </div>

              <div className="portal-scroll-area flex-1 min-h-0">
                <div className="models-required-list">
                  {MODEL_GROUPS.map((group) => {
                    const ready = isGroupReady(group.id);
                    return (
                      <div key={group.id} className="model-item">
                        <div className="model-item-info">
                          <div className="model-name">{group.name}</div>
                          <div className="model-meta">
                            <span className="model-task">{group.task}</span>
                            <span className="model-size-badge">{group.size}</span>
                          </div>
                        </div>
                        <div className="model-item-actions">
                          <span
                            className={ready ? "model-badge-cached" : "model-badge-needed"}
                          >
                            {ready ? (
                              <>
                                <Check size={11} className="badge-icon" />
                                <span>Downloaded</span>
                              </>
                            ) : (
                              <>
                                <DownloadCloud size={11} className="badge-icon" />
                                <span>Download Required</span>
                              </>
                            )}
                          </span>
                          {ready ? (
                            <button
                              type="button"
                              className="btn-model-action danger"
                              onClick={() => handleDeleteModel(group.id)}
                              disabled={downloadProgress.is_downloading || isDeletingModel === group.id}
                              title={`Delete ${group.name}`}
                            >
                              <Trash2 size={12} className={isDeletingModel === group.id ? "spin" : ""} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-model-action primary"
                              onClick={() => handleStartDownload(group.id)}
                              disabled={downloadProgress.is_downloading || !!isDeletingModel}
                              title={`Download ${group.name}`}
                            >
                              <DownloadCloud
                                size={12}
                                className={
                                  downloadProgress.is_downloading &&
                                  downloadProgress.current_file.includes(group.name)
                                    ? "spin"
                                    : ""
                                }
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0 pt-3 mt-auto border-t border-slate-100 bg-white">
                <button
                  className="btn btn-primary btn-block"
                  style={{ padding: "12px" }}
                  onClick={() => handleStartDownload()}
                  disabled={downloadProgress.is_downloading || !!isDeletingModel}
                >
                  <DownloadCloud size={18} />
                  {downloadProgress.is_downloading
                    ? "Downloading Weights..."
                    : "Download Foundation Models Now"}
                </button>
              </div>

              {downloadProgress.is_downloading && (
                <div className="shrink-0 mt-2">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    <span>{downloadProgress.current_file}</span>
                    <span>{downloadProgress.overall_pct}%</span>
                  </div>
                  <Progress
                    value={downloadProgress.overall_pct}
                    className="h-2 bg-slate-100 my-1"
                    indicatorColor="bg-[#0d7c85]"
                  />
                  <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                    {downloadProgress.detail}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modern Segmented Tab Bar */}
              <div className="shrink-0 mb-2">
                <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 w-fit">
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "upload"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setActiveTab("upload")}
                  >
                    <UploadCloud size={14} className={activeTab === "upload" ? "text-teal-600" : ""} />
                    <span>Upload Images</span>
                    {stagedImages.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-700 font-mono">
                        {stagedImages.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "samples"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setActiveTab("samples")}
                  >
                    <FolderHeart size={14} className={activeTab === "samples" ? "text-teal-600" : ""} />
                    <span>Sample Library</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-600 font-mono">
                      {availableSamples.length || 24}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Upload */}
              {activeTab === "upload" && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="shrink-0 mb-2">
                    <h4 className="text-sm font-bold text-[#0f1e4a] tracking-tight">
                      Upload Coral Imagery
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Import underwater survey photos or a .zip archive for batch instance segmentation
                    </p>
                  </div>

                  <div className="portal-scroll-area flex-1 min-h-0">
                    <div
                      className={`dropzone ${dragActive ? "drag-active" : ""}`}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={30} className="dropzone-icon text-teal-600 mb-1.5" />
                      <div className="dropzone-text text-xs font-semibold text-slate-700">
                        Select or drag & drop coral images or a .zip archive
                      </div>
                      <div className="dropzone-hint text-[11px] text-slate-400 mt-0.5">
                        Supported formats: .jpg, .jpeg, .png, .webp, .zip
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.zip"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFiles(e.target.files);
                          }
                        }}
                      />
                    </div>

                    {stagedImages.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>{stagedImages.length} image(s) ready for analysis</span>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] font-medium text-slate-400 hover:text-red-600 transition-colors"
                            onClick={() => setStagedImages([])}
                          >
                            Clear all
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-1">
                          {stagedImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-teal-500/60 transition-all duration-200 flex flex-col"
                            >
                              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                <img
                                  src={img.dataUrl}
                                  alt={img.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                                />
                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-md text-white font-mono text-[10px] font-semibold tracking-wider shadow-xs">
                                  #{String(idx + 1).padStart(2, "0")}
                                </div>
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-xs"
                                  onClick={() => setStagedImages((prev) => prev.filter((_, i) => i !== idx))}
                                  title="Remove image"
                                >
                                  <X size={11} strokeWidth={2.5} />
                                </button>
                              </div>
                              <div className="px-2 py-1.5 bg-white flex items-center justify-between gap-1 border-t border-slate-100">
                                <span
                                  className="text-[11px] font-medium text-slate-700 truncate"
                                  title={img.name}
                                >
                                  {img.name}
                                </span>
                                <span className="text-[9px] font-mono uppercase text-slate-400 bg-slate-50 border border-slate-200/60 px-1 py-0.2 rounded shrink-0">
                                  {img.name.split(".").pop() || "IMG"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {stagedImages.length > 0 && (
                    <div className="shrink-0 pt-2.5 mt-auto border-t border-slate-100 bg-white">
                      <Button
                        type="button"
                        className="w-full h-10 text-xs font-bold tracking-wider uppercase text-white rounded-xl shadow-xs hover:shadow-md transition-all gap-2 bg-gradient-to-r from-[#0f1e4a] via-[#163e80] to-[#0d7c85] hover:opacity-95 active:scale-[0.99]"
                        onClick={handleLaunchUploaded}
                        disabled={isProcessingUpload || !isBackendConnected}
                      >
                        <Rocket size={14} className={isProcessingUpload ? "animate-bounce" : ""} />
                        <span>
                          {isProcessingUpload
                            ? "Preparing Vision Engines..."
                            : `Launch Reef Vision Studio (${stagedImages.length} Images)`}
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Samples */}
              {activeTab === "samples" && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {/* Single-line Toolbar Header */}
                  <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-[#0f1e4a] tracking-tight">
                        Select from Sample Library
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {sampleSubset.length} sample image{sampleSubset.length === 1 ? "" : "s"} selected for instance segmentation
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs font-semibold text-slate-600">Batch:</label>
                      <div className="w-48">
                        <UISelect
                          value={selectedPreset}
                          onChange={setSelectedPreset}
                          options={[
                            { value: "First 6 Samples", label: "First 6 Samples" },
                            { value: "First 12 Samples", label: "First 12 Samples" },
                            { value: "First 24 Samples", label: "First 24 Samples" },
                            { value: "All Available Samples", label: "All Available Samples" },
                            { value: "Select Specific Files", label: "Select Specific Files" },
                          ]}
                          placeholder="Select batch preset"
                        />
                      </div>
                    </div>
                  </div>

                  {selectedPreset === "Select Specific Files" && (
                    <div className="shrink-0 form-group mb-2">
                      <label className="form-label text-xs font-semibold text-slate-600">Choose Files</label>
                      <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50 space-y-1">
                        {availableSamples.map((s) => (
                          <label key={s.filename} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white p-1 rounded">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              checked={selectedSpecific.includes(s.filename)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSpecific((prev) => [...prev, s.filename]);
                                } else {
                                  setSelectedSpecific((prev) => prev.filter((fn) => fn !== s.filename));
                                }
                              }}
                            />
                            <span className="font-mono text-[11px]">{s.filename}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Imagery Container - Image Cards Grid */}
                  <div className="portal-scroll-area flex-1 min-h-0">
                    {!isBackendConnected ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs my-4">
                        Connecting to Python Vision Engine... (Please ensure backend is started)
                      </div>
                    ) : sampleSubset.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs my-4">
                        No sample images found. Please verify <code>demo_images/</code> folder.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-1">
                        {sampleSubset.map((s, idx) => (
                          <div
                            key={idx}
                            className="group relative rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-teal-500/60 transition-all duration-200 flex flex-col"
                          >
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                              <img
                                src={getSampleImageUrl(s.filename)}
                                alt={s.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23eee'/><text x='50%' y='50%' text-anchor='middle' fill='%23aaa' dy='.3em'>Image</text></svg>";
                                }}
                              />
                              {/* Floating index badge top-left */}
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-md text-white font-mono text-[10px] font-semibold tracking-wider shadow-xs">
                                #{String(idx + 1).padStart(2, "0")}
                              </div>
                              {/* Selected indicator top-right */}
                              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-xs">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            </div>

                            {/* Clean metadata caption bar */}
                            <div className="px-2 py-1.5 bg-white flex items-center justify-between gap-1 border-t border-slate-100">
                              <span
                                className="text-[11px] font-medium text-slate-700 truncate"
                                title={s.filename}
                              >
                                {s.filename}
                              </span>
                              <span className="text-[9px] font-mono uppercase text-slate-400 bg-slate-50 border border-slate-200/60 px-1 py-0.2 rounded shrink-0">
                                {s.filename.split(".").pop() || "PNG"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fixed Bottom Launch Bar - Go Button ALWAYS visible */}
                  <div className="shrink-0 pt-2.5 mt-auto border-t border-slate-100 bg-white">
                    <Button
                      type="button"
                      className="w-full h-10 text-xs font-bold tracking-wider uppercase text-white rounded-xl shadow-xs hover:shadow-md transition-all gap-2 bg-gradient-to-r from-[#0f1e4a] via-[#163e80] to-[#0d7c85] hover:opacity-95 active:scale-[0.99]"
                      onClick={handleLaunchSamples}
                      disabled={isLoadingSamples || sampleSubset.length === 0 || !isBackendConnected}
                    >
                      <Rocket size={14} className={isLoadingSamples ? "animate-bounce" : ""} />
                      <span>
                        {isLoadingSamples
                          ? "Loading Sample Images..."
                          : !isBackendConnected
                          ? "Waiting for Vision Engine..."
                          : `Launch Reef Vision Studio (${sampleSubset.length} Samples)`}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Model Management Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <DialogTitle className="text-base font-bold text-[#0f1e4a]">
                Manage Foundation Models
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Delete individual models to free disk space. You can re-download any deleted model at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 max-h-60 overflow-y-auto">
            {MODEL_GROUPS.map((group) => {
              const ready = isGroupReady(group.id);
              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{group.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>{group.task}</span>
                      <span>•</span>
                      <span>{group.size}</span>
                    </div>
                  </div>
                  <div>
                    {ready ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5 rounded-md"
                        onClick={() => handleDeleteModel(group.id)}
                        disabled={!!isDeletingModel}
                        title={`Delete ${group.name}`}
                      >
                        <Trash2 className={`h-3.5 w-3.5 ${isDeletingModel === group.id ? "animate-spin" : ""}`} />
                        <span>{isDeletingModel === group.id ? "Deleting..." : "Delete"}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5 rounded-md border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={() => {
                          handleStartDownload(group.id);
                          setShowDeleteModal(false);
                        }}
                        disabled={downloadProgress.is_downloading || !!isDeletingModel}
                        title={`Download ${group.name}`}
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={!!isDeletingModel}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
