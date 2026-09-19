import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  UploadCloud,
  FolderHeart,
  Rocket,
  DownloadCloud,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import JSZip from "jszip";
import { BrandLogo } from "../components/BrandLogo";
import { UISelect } from "../components/UISelect";
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
  setDevicePreference,
  getSamples,
  getSampleImageUrl,
  registerImage,
  loadSampleToStore,
} from "../services/api";

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

  // Trigger Download & Poll Progress
  const handleStartDownload = async () => {
    try {
      await triggerModelDownload();
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
            <div>
              <div className="models-ready-pill">✓ Foundation Models Ready</div>
              <div className="model-chips-row">
                <span className="model-chip">Segmentation Model</span>
                <span className="model-chip">Taxonomical Model</span>
                <span className="model-chip">Bleach Detection Model</span>
              </div>
            </div>
          )}

          {/* Hardware Acceleration Subcard */}
          <div className="hw-card">
            <div className="hw-box-title">Hardware Acceleration</div>
            {deviceInfo && (
              <div
                className={`hw-badge ${
                  deviceInfo.device_type === "gpu" || deviceInfo.active_provider.includes("CUDA")
                    ? "hw-cuda"
                    : deviceInfo.mode === "cpu"
                    ? "hw-cpu-single"
                    : "hw-cpu"
                }`}
              >
                {deviceInfo.device_type === "gpu" || deviceInfo.active_provider.includes("CUDA")
                  ? `GPU: ${deviceInfo.gpu_name}`
                  : deviceInfo.mode === "cpu"
                  ? `CPU (Single-Threaded): ${deviceInfo.gpu_name}`
                  : `Multi-Threaded CPU: ${deviceInfo.gpu_name}`}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.76rem" }}>
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

              {modelsList.map((m) => (
                <div key={m.filename} className="model-item">
                  <div>
                    <span className="model-name">{m.name}</span>
                    <span className="model-task">
                      {m.task} ({m.size})
                    </span>
                  </div>
                  <span
                    className={
                      m.cached ? "model-badge-cached" : "model-badge-needed"
                    }
                  >
                    {m.cached ? "Downloaded" : "Download Required"}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: "1.25rem" }}>
                <button
                  className="btn btn-primary btn-block"
                  style={{ padding: "12px" }}
                  onClick={handleStartDownload}
                  disabled={downloadProgress.is_downloading}
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
                  <div className="table-progress-bg" style={{ height: 4, borderRadius: 9999, overflow: "hidden" }}>
                    <div
                      className="table-progress-bar"
                      style={{
                        width: `${downloadProgress.overall_pct}%`,
                        background: "var(--gradient-brand)",
                        height: "100%",
                        borderRadius: 9999,
                      }}
                    />
                  </div>
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
    </div>
  );
};
