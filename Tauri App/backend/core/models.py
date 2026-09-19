"""
Model registry, artifact resolution, streaming download manager, and ONNX session loaders.
"""

import os
import sys
import threading
from typing import Dict, List, Tuple, Any, Optional, Callable
import numpy as np
import onnxruntime as ort
from tqdm.auto import tqdm
from huggingface_hub import hf_hub_download, try_to_load_from_cache

from core.device import get_optimal_device, get_device_mode, get_session_options

# Global inference lock to serialize concurrent calls
_INFERENCE_LOCK = threading.Lock()

# Official Hugging Face ONNX repository
HF_ONNX_REPO_ID = "harsh-awasthi/Andromeida-ReefVision-ONNX"
HF_REPO_ID = HF_ONNX_REPO_ID
HF_BLEACHING_FILE = "bleaching_yolo11n.onnx"
HF_BIOCLIP_FILE = "bioclip_visual.onnx"
HF_TAXONOMY_FILE = "coral_taxonomy_embeddings.npy"
HF_TEXT_EMBEDS_FILE = HF_TAXONOMY_FILE
HF_SAM_ENCODER_FILE = "sam_image_encoder.onnx"
HF_SAM_DECODER_FILE = "sam_mask_decoder.onnx"
EXPECTED_MODELS = None  # assigned below after FOUNDATION_MODEL_SPECS

# Global cached sessions
_SAM_BUNDLE: Optional[Dict[str, ort.InferenceSession]] = None
_SAM_CACHE_KEY: Optional[str] = None
_SAM_MTIME: Optional[float] = None
_BIOCLIP_BUNDLE: Optional[Dict[str, Any]] = None
_BIOCLIP_CACHE_KEY: Optional[str] = None
_BLEACHING_SESSION: Optional[ort.InferenceSession] = None
_BLEACHING_CACHE_KEY: Optional[str] = None

FOUNDATION_MODEL_SPECS = [
    {
        "filename": HF_SAM_ENCODER_FILE,
        "name": "Segmentation Model Encoder",
        "task": "Dense Instance Segmentation",
        "approx_size": 359_076_485,
    },
    {
        "filename": HF_SAM_DECODER_FILE,
        "name": "Segmentation Model Decoder",
        "task": "Dense Instance Segmentation",
        "approx_size": 23_808_270,
    },
    {
        "filename": HF_BIOCLIP_FILE,
        "name": "Taxonomical Model",
        "task": "Taxonomy & Growth Form",
        "approx_size": 345_153_901,
    },
    {
        "filename": HF_TAXONOMY_FILE,
        "name": "Taxonomical Model Embeddings",
        "task": "Precomputed Text Embeddings",
        "approx_size": 36_992,
    },
    {
        "filename": HF_BLEACHING_FILE,
        "name": "Bleach Detection Model",
        "task": "Reef Health & Bleaching",
        "approx_size": 6_147_661,
    },
]
EXPECTED_MODELS = FOUNDATION_MODEL_SPECS


def get_cached_model_path(filename: str) -> Optional[str]:
    """
    Checks candidate directories and Hugging Face cache for an existing model file.
    Returns the absolute path if found, or None if download is needed.
    """
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "onnx_models", filename),
        os.path.join(os.path.dirname(__file__), "..", "models", filename),
        os.path.join(os.path.dirname(__file__), "..", "..", "onnx_models", filename),
        os.path.join(os.path.dirname(__file__), "..", "..", "Streamlit App", "onnx_models", filename),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "Streamlit App", "onnx_models", filename),
        os.path.join(os.getcwd(), "onnx_models", filename),
        os.path.join(os.getcwd(), "models", filename),
    ]
    if getattr(sys, "frozen", False):
        exec_dir = os.path.dirname(sys.executable)
        candidates.insert(0, os.path.join(exec_dir, "models", filename))
        candidates.insert(0, os.path.join(exec_dir, "onnx_models", filename))
        if "Contents/MacOS" in exec_dir:
            bundle_dir = os.path.abspath(os.path.join(exec_dir, "../../.."))
            candidates.insert(0, os.path.join(bundle_dir, "models", filename))

    for path in candidates:
        if os.path.isfile(path):
            return path

    try:
        cached_hf = try_to_load_from_cache(HF_ONNX_REPO_ID, filename)
        if cached_hf is not None and os.path.isfile(cached_hf):
            return cached_hf
    except Exception:
        pass

    return None


def reset_cached_sessions():
    """Clears in-memory ONNX Runtime sessions to allow fresh weight reloads."""
    global _SAM_BUNDLE, _SAM_CACHE_KEY, _SAM_MTIME
    global _BIOCLIP_BUNDLE, _BIOCLIP_CACHE_KEY
    global _BLEACHING_SESSION, _BLEACHING_CACHE_KEY
    _SAM_BUNDLE = None
    _SAM_CACHE_KEY = None
    _SAM_MTIME = None
    _BIOCLIP_BUNDLE = None
    _BIOCLIP_CACHE_KEY = None
    _BLEACHING_SESSION = None
    _BLEACHING_CACHE_KEY = None


def find_or_download_onnx_model(
    filename: str,
    cache_dir: Optional[str] = None,
    progress_callback: Optional[Callable[[int, Optional[int], str], None]] = None,
    force_download: bool = False,
) -> str:
    """
    Locates an ONNX model file on local disk or streams it on demand from Hugging Face.
    When force_download is True, bypasses local caches and fetches fresh weights.
    """
    if not force_download:
        cached_path = get_cached_model_path(filename)
        if cached_path is not None:
            if progress_callback is not None:
                size = os.path.getsize(cached_path)
                progress_callback(size, size, filename)
            return cached_path

    class CallbackTqdm(tqdm):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._cb = progress_callback
            self._fname = filename
            if self._cb and self.total:
                self._cb(self.n, self.total, self._fname)

        def update(self, n=1):
            res = super().update(n)
            if self._cb and self.total:
                self._cb(self.n, self.total, self._fname)
            return res

    original_tqdm = tqdm.auto.tqdm if hasattr(tqdm, "auto") else tqdm

    try:
        if progress_callback is not None:
            import huggingface_hub.file_download as fd
            fd.tqdm = CallbackTqdm

        local_path = hf_hub_download(
            repo_id=HF_ONNX_REPO_ID,
            filename=filename,
            cache_dir=cache_dir,
            local_files_only=False,
            force_download=force_download,
        )
        return local_path
    finally:
        if progress_callback is not None:
            import huggingface_hub.file_download as fd
            fd.tqdm = original_tqdm


def check_models_download_status() -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Evaluates whether all required ONNX weights exist locally.
    """
    status_list = []
    all_ready = True
    for spec in FOUNDATION_MODEL_SPECS:
        path = get_cached_model_path(spec["filename"])
        downloaded = path is not None and os.path.isfile(path)
        actual_size = os.path.getsize(path) if downloaded else spec["approx_size"]
        if not downloaded:
            all_ready = False
        size_str = f"{actual_size / (1024 * 1024):.1f} MB" if actual_size >= 1024 * 1024 else f"{actual_size / 1024:.1f} KB"
        status_list.append({
            "filename": spec["filename"],
            "name": spec["name"],
            "task": spec["task"],
            "approx_size": spec["approx_size"],
            "actual_size": actual_size,
            "size": size_str,
            "downloaded": downloaded,
            "cached": downloaded,
            "path": path,
        })
    return all_ready, status_list


def download_all_models(
    cache_dir: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
    force_download: bool = False,
    target_files: Optional[List[str]] = None,
) -> Dict[str, str]:
    """
    Downloads foundation models with progress callbacks.
    When force_download is True, forces fetching from Hugging Face even if cached.
    Supports either an info dictionary callback or a (filename, curr, total) callback.
    """
    if force_download:
        reset_cached_sessions()

    specs = FOUNDATION_MODEL_SPECS
    if target_files:
        filtered = [s for s in specs if s["filename"] in target_files]
        if filtered:
            specs = filtered

    downloaded_paths = {}
    total_files = len(specs)
    total_bytes_est = sum(spec["approx_size"] for spec in specs)
    completed_bytes_prior = 0

    for idx, spec in enumerate(specs):
        fname = spec["filename"]
        approx_sz = spec["approx_size"]

        def _cb(curr, total, _f=fname, _idx=idx, _spec=spec, _prior=completed_bytes_prior):
            if progress_callback:
                file_tot = total or approx_sz
                cur_overall = _prior + min(curr, file_tot)
                frac = cur_overall / max(total_bytes_est, 1)
                info = {
                    "file_index": _idx + 1,
                    "total_files": total_files,
                    "name": _spec["name"],
                    "filename": _f,
                    "file_bytes": curr,
                    "file_total": file_tot,
                    "overall_fraction": frac,
                    "status": "completed" if curr >= file_tot else "downloading",
                }
                try:
                    progress_callback(info)
                except TypeError:
                    try:
                        progress_callback(_f, curr, total)
                    except TypeError:
                        progress_callback(curr, total, _f)

        path = find_or_download_onnx_model(
            fname,
            cache_dir=cache_dir,
            progress_callback=_cb,
            force_download=force_download,
        )
        downloaded_paths[fname] = path
        completed_bytes_prior += approx_sz
    return downloaded_paths


def download_coralscop_checkpoint(cache_dir: Optional[str] = None) -> str:
    """Ensures CoralSCOP SAM encoder is available locally."""
    return find_or_download_onnx_model(HF_SAM_ENCODER_FILE, cache_dir=cache_dir)


def load_coralscop_model(
    device: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
) -> Dict[str, ort.InferenceSession]:
    """
    Loads and returns CoralSCOP SAM ViT-B ONNX sessions (Encoder & Decoder).
    """
    global _SAM_BUNDLE, _SAM_CACHE_KEY, _SAM_MTIME
    active_provider = get_optimal_device(device if device is not None else "auto")
    active_mode = get_device_mode(device if device is not None else "auto")
    sess_options = get_session_options(device if device is not None else "auto")
    cache_key = f"{active_provider}:{active_mode}"

    enc_path = find_or_download_onnx_model(HF_SAM_ENCODER_FILE, progress_callback=progress_callback)
    dec_path = find_or_download_onnx_model(HF_SAM_DECODER_FILE, progress_callback=progress_callback)
    current_mtime = os.path.getmtime(dec_path) if os.path.exists(dec_path) else 0.0

    if _SAM_BUNDLE is not None and _SAM_CACHE_KEY == cache_key and _SAM_MTIME == current_mtime:
        return _SAM_BUNDLE

    _SAM_CACHE_KEY = cache_key
    _SAM_MTIME = current_mtime
    providers = [active_provider]
    if "CPUExecutionProvider" not in providers:
        providers.append("CPUExecutionProvider")

    encoder_sess = ort.InferenceSession(enc_path, sess_options=sess_options, providers=providers)
    decoder_sess = ort.InferenceSession(dec_path, sess_options=sess_options, providers=providers)

    _SAM_BUNDLE = {
        "encoder": encoder_sess,
        "decoder": decoder_sess,
    }
    return _SAM_BUNDLE


def load_bioclip_model(
    device: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """
    Loads ReefNet BioCLIP ONNX session and pre-computed text taxonomy embeddings.
    """
    global _BIOCLIP_BUNDLE, _BIOCLIP_CACHE_KEY
    active_provider = get_optimal_device(device if device is not None else "auto")
    active_mode = get_device_mode(device if device is not None else "auto")
    sess_options = get_session_options(device if device is not None else "auto")
    cache_key = f"{active_provider}:{active_mode}"

    if _BIOCLIP_BUNDLE is not None and _BIOCLIP_CACHE_KEY == cache_key:
        return _BIOCLIP_BUNDLE

    _BIOCLIP_CACHE_KEY = cache_key
    providers = [active_provider]
    if "CPUExecutionProvider" not in providers:
        providers.append("CPUExecutionProvider")

    model_path = find_or_download_onnx_model(HF_BIOCLIP_FILE, progress_callback=progress_callback)
    embeds_path = find_or_download_onnx_model(HF_TAXONOMY_FILE, progress_callback=progress_callback)

    session = ort.InferenceSession(model_path, sess_options=sess_options, providers=providers)
    text_features = np.load(embeds_path).astype(np.float32)

    _BIOCLIP_BUNDLE = {
        "session": session,
        "text_features": text_features,
    }
    return _BIOCLIP_BUNDLE


def load_bleaching_model(
    device: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
) -> ort.InferenceSession:
    """
    Loads NMFS-OSI NOAA coral bleaching classifier ONNX session.
    Uses CUDA on NVIDIA, DirectML on Windows, or CPU fallback with configured threading.
    """
    global _BLEACHING_SESSION, _BLEACHING_CACHE_KEY
    active_provider = get_optimal_device(device if device is not None else "auto")
    active_mode = get_device_mode(device if device is not None else "auto")
    sess_options = get_session_options(device if device is not None else "auto")
    cache_key = f"{active_provider}:{active_mode}"

    if _BLEACHING_SESSION is not None and _BLEACHING_CACHE_KEY == cache_key:
        return _BLEACHING_SESSION

    _BLEACHING_CACHE_KEY = cache_key
    providers = []

    if active_provider == "CUDAExecutionProvider":
        providers.append("CUDAExecutionProvider")
    elif active_provider == "DmlExecutionProvider":
        providers.append("DmlExecutionProvider")
    providers.append("CPUExecutionProvider")

    pt_path = find_or_download_onnx_model(HF_BLEACHING_FILE, progress_callback=progress_callback)
    _BLEACHING_SESSION = ort.InferenceSession(pt_path, sess_options=sess_options, providers=providers)
    return _BLEACHING_SESSION
