import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  UploadCloud,
  FolderHeart,
  Rocket,
  DownloadCloud,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Check,
  Cpu,
  Zap,
  Trash2,
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

  const getEngineBadgeClass = (info: DeviceInfo | null): string => {
    if (!info) return "cpu";
    if (info.device_type === "gpu" || info.active_provider?.includes("CUDA")) return "cuda";
    if (info.active_provider?.includes("CoreML") || info.active_provider?.includes("DirectML")) return "coreml";
    if (info.mode === "cpu") return "cpu-single";
    return "cpu";
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

          {/* Backend connection pill */}
          <div style={{ marginBottom: "1rem" }}>
            {isBackendConnected ? (
              <div className="models-ready-pill" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}>
                <CheckCircle2 size={14} />
                <span>Vision Engine Connected</span>
              </div>
            ) : (
              <div
                className="locked-notice"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0, padding: "8px 12px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} className={isCheckingBackend ? "spin" : ""} />
                  <span style={{ fontSize: "0.78rem" }}>
                    {isCheckingBackend ? "Connecting to Python Backend..." : "Backend Offline (Port 8000)"}
                  </span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                  onClick={handleManualRetry}
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {allDownloaded && isBackendConnected && (
            <div className="models-status-container">
              <div className="models-status-header">
                <div className="models-ready-pill">
                  <CheckCircle2 size={13} className="ready-icon" />
                  <span>Foundation Models Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={downloadProgress.is_downloading || !!isDeletingModel}
                    title="Manage and delete individual foundation models"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              <div className="model-chips-row">
                {MODEL_GROUPS.map((group) => {
                  const ready = isGroupReady(group.id);
                  return (
                    <span
                      key={group.id}
                      className={`model-chip ${ready ? "ready" : "needed"}`}
                      title={`${group.fullName} (${group.size}) - ${ready ? "Ready" : "Download Required"}`}
                    >
                      {ready ? (
                        <Check size={11} className="chip-check" />
                      ) : (
                        <AlertCircle size={11} />
                      )}
                      <span>{group.name}</span>
                      {ready && (
                        <button
                          type="button"
                          className="chip-delete-btn"
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
                    </span>
                  );
                })}
              </div>

              {downloadProgress.is_downloading && (
                <div className="redownload-progress-box">
                  <div className="progress-info-row">
                    <span className="progress-filename">{downloadProgress.current_file}</span>
                    <span className="progress-pct">{downloadProgress.overall_pct}%</span>
                  </div>
                  <Progress
                    value={downloadProgress.overall_pct}
                    className="h-2 bg-teal-950/20 my-1"
                    indicatorColor="bg-[#0d7c85]"
                  />
                  <div className="progress-detail">{downloadProgress.detail}</div>
                </div>
              )}
            </div>
          )}

          {/* Hardware Acceleration Subcard */}
          <div className="hw-card">
            <div className="hw-card-header">
              <div className="hw-title-group">
                <Cpu size={14} className="hw-icon" />
                <span className="hw-box-title">HARDWARE ACCELERATION</span>
              </div>
              <div className="hw-live-status">
                <span className="hw-live-dot" />
                <span className="hw-live-text">Active</span>
              </div>
            </div>

            <div className="hw-active-row">
              <span className="hw-field-label">Active Engine</span>
              <div className={`hw-badge ${getEngineBadgeClass(deviceInfo)}`}>
                {deviceInfo?.device_type === "gpu" || deviceInfo?.active_provider?.includes("CUDA") ? (
                  <Zap size={11} className="hw-badge-icon" />
                ) : (
                  <Cpu size={11} className="hw-badge-icon" />
                )}
                <span>{getEngineName(deviceInfo)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0, marginTop: "0.85rem" }}>
              <label className="form-label hw-select-label">
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

            <div className="hw-footer-note">
              {deviceInfo?.gpu_available
                ? "Tensor operations accelerated natively via local GPU execution provider."
                : "Parallel tensor operations accelerated across all CPU cores via ONNX Runtime."}
            </div>
          </div>
        </div>

        {/* Right Column: Download or Upload/Samples */}
        <div>
          {loadError && (
            <div className="locked-notice" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={16} />
                <span>{loadError}</span>
              </div>
            </div>
          )}

          {!allDownloaded && isBackendConnected ? (
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-navy)", marginBottom: "0.5rem" }}>
                Foundation Models Required
              </h3>
              <div className="locked-notice">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={16} />
                  <span>Action Required: Please download foundation models to unlock imagery upload & analysis.</span>
                </div>
              </div>

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

              <div style={{ marginTop: "1.25rem" }}>
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
                <div style={{ marginTop: "1rem" }}>
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
            <div>
              {/* Tabs */}
              <div className="portal-tabs">
                <div
                  className={`portal-tab ${activeTab === "upload" ? "active" : ""}`}
                  onClick={() => setActiveTab("upload")}
                >
                  <UploadCloud size={18} />
                  <span>Upload Images</span>
                </div>
                <div
                  className={`portal-tab ${activeTab === "samples" ? "active" : ""}`}
                  onClick={() => setActiveTab("samples")}
                >
                  <FolderHeart size={18} />
                  <span>Sample Library</span>
                </div>
              </div>

              {/* Tab 1: Upload */}
              {activeTab === "upload" && (
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-navy)", marginBottom: "0.75rem" }}>
                    Upload Coral Imagery
                  </h4>
                  <div
                    className={`dropzone ${dragActive ? "drag-active" : ""}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={36} className="dropzone-icon" />
                    <div className="dropzone-text">
                      Select or drag & drop coral images or a .zip archive
                    </div>
                    <div className="dropzone-hint">
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
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-success)" }}>
                        ✓ {stagedImages.length} image(s) ready for analysis.
                      </div>
                      <div className="preview-grid">
                        {stagedImages.slice(0, 6).map((img, idx) => (
                          <div key={idx} className="preview-card">
                            <img src={img.dataUrl} alt={img.name} className="preview-img" />
                            <div className="preview-caption">{img.name}</div>
                          </div>
                        ))}
                      </div>

                      <button
                        className="btn btn-primary btn-block"
                        style={{ padding: "12px", marginTop: "1rem" }}
                        onClick={handleLaunchUploaded}
                        disabled={isProcessingUpload || !isBackendConnected}
                      >
                        <Rocket size={18} />
                        {isProcessingUpload
                          ? "Preparing Vision Engines..."
                          : `Launch Reef Vision Studio (${stagedImages.length} Images)`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Samples */}
              {activeTab === "samples" && (
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-navy)", marginBottom: "0.75rem" }}>
                    Select from Sample Library
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Batch Selection</label>
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

                  {selectedPreset === "Select Specific Files" && (
                    <div className="form-group">
                      <label className="form-label">Choose Files</label>
                      <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8, padding: 8 }}>
                        {availableSamples.map((s) => (
                          <label key={s.filename} className="checkbox-label" style={{ marginBottom: 4 }}>
                            <input
                              type="checkbox"
                              checked={selectedSpecific.includes(s.filename)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSpecific((prev) => [...prev, s.filename]);
                                } else {
                                  setSelectedSpecific((prev) => prev.filter((fn) => fn !== s.filename));
                                }
                              }}
                            />
                            <span>{s.filename}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thumbnail Preview Grid */}
                  {!isBackendConnected ? (
                    <div style={{ padding: "2rem", textAlign: "center", background: "var(--color-surface-subtle)", borderRadius: 10, border: "1px dashed var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                      Connecting to Python Vision Engine... (Please ensure backend is started)
                    </div>
                  ) : sampleSubset.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", background: "var(--color-surface-subtle)", borderRadius: 10, border: "1px dashed var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                      No sample images found. Please verify <code>demo_images/</code> folder.
                    </div>
                  ) : (
                    <div className="preview-grid">
                      {sampleSubset.slice(0, 6).map((s, idx) => (
                        <div key={idx} className="preview-card">
                          <img
                            src={getSampleImageUrl(s.filename)}
                            alt={s.filename}
                            className="preview-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23eee'/><text x='50%' y='50%' text-anchor='middle' fill='%23aaa' dy='.3em'>Image</text></svg>";
                            }}
                          />
                          <div className="preview-caption">#{idx + 1}: {s.filename.slice(0, 18)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-block"
                    style={{ padding: "12px", marginTop: "1rem" }}
                    onClick={handleLaunchSamples}
                    disabled={isLoadingSamples || sampleSubset.length === 0 || !isBackendConnected}
                  >
                    <Rocket size={18} />
                    {isLoadingSamples
                      ? "Loading Sample Images..."
                      : !isBackendConnected
                      ? "Waiting for Vision Engine..."
                      : `Launch Reef Vision Studio (${sampleSubset.length} Samples)`}
                  </button>
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
