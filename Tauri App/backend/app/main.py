"""
ReefVision FastAPI Engine - Autonomous multi-model coral reef instance segmentation,
taxonomy classification, and bleaching assessment.
"""

import os
import sys
import io
import glob
import json
import base64
import time
import threading
from typing import Dict, List, Optional, Any
from pathlib import Path
from PIL import Image
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

# Ensure backend root is on sys.path so 'core' can be imported cleanly
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.device import get_device_info, get_optimal_device
from core.models import (
    check_models_download_status,
    download_all_models,
    load_coralscop_model,
    load_bioclip_model,
    load_bleaching_model,
    FOUNDATION_MODEL_SPECS,
)
from core.segmentation import run_segmentation
from core.taxonomy import enrich_masks_with_taxonomy_and_bleaching
from core.visualization import create_segmentation_overlay, generate_distinct_colors
from core.export import build_coco_json

from app.schemas import (
    DevicePreferenceRequest,
    ModelStatusResponse,
    ModelDownloadRequest,
    SegmentRequest,
    EnrichRequest,
    OverlayRequest,
    ExportCocoRequest,
    SampleItem,
)

app = FastAPI(
    title="Andromeida Reef Vision Studio API",
    version="2.0.0",
    description="FastAPI Backend for Coral Reef Segmentation, BioCLIP Taxonomy, and Bleaching Detection",
)

# Enable CORS for Tauri desktop and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for images and segmentation session cache
_IMAGE_STORE: Dict[str, Image.Image] = {}
_BASE_SEG_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_ENRICH_CACHE: Dict[str, Any] = {}
_ACTIVE_DEVICE_PREF: str = "auto"
_SEG_LOCKS: Dict[str, threading.Lock] = {}
_SEG_LOCKS_MUTEX = threading.Lock()


def _get_seg_lock(cache_key: str) -> threading.Lock:
    with _SEG_LOCKS_MUTEX:
        if cache_key not in _SEG_LOCKS:
            _SEG_LOCKS[cache_key] = threading.Lock()
        return _SEG_LOCKS[cache_key]


_DOWNLOAD_PROGRESS: Dict[str, Any] = {
    "is_downloading": False,
    "overall_pct": 0,
    "current_file": "",
    "detail": "",
}


def _resolve_demo_dirs() -> List[str]:
    """Finds demo_images directories relative to repo or backend."""
    candidates = [
        str(BACKEND_DIR / "demo_images"),
        str(BACKEND_DIR.parent.parent / "Streamlit App" / "demo_images"),
        str(BACKEND_DIR.parent / "demo_images"),
    ]
    res = []
    for c in candidates:
        if os.path.isdir(c):
            res.append(c)
            sub = os.path.join(c, "unlabeled_samples")
            if os.path.isdir(sub):
                res.append(sub)
    return res


@app.get("/api/health")
def get_health():
    """Liveness probe and active hardware acceleration provider."""
    dev_info = get_device_info(_ACTIVE_DEVICE_PREF)
    return {
        "status": "online",
        "app": "Andromeida Reef Vision Studio",
        "device": dev_info,
    }


@app.get("/api/device/info")
def get_device():
    """Returns active device information."""
    return get_device_info(_ACTIVE_DEVICE_PREF)


@app.post("/api/device/select")
def select_device(req: DevicePreferenceRequest):
    """Updates device preference (auto, cuda, cpu)."""
    global _ACTIVE_DEVICE_PREF
    _ACTIVE_DEVICE_PREF = req.preference.lower().strip()
    return get_device_info(_ACTIVE_DEVICE_PREF)


@app.get("/api/models/status")
def get_models_status():
    """Checks download and cache status of foundation models."""
    all_ready, status_list = check_models_download_status()
    dev_info = get_device_info(_ACTIVE_DEVICE_PREF)
    return {
        "all_downloaded": all_ready,
        "models": status_list,
        "active_device": dev_info.get("device", "CPUExecutionProvider"),
        "device_info": dev_info,
    }


@app.get("/api/models/download/progress")
def get_download_progress():
    """Pollable download progress."""
    return _DOWNLOAD_PROGRESS


@app.post("/api/models/download")
def trigger_model_download(
    background_tasks: BackgroundTasks,
    req: Optional[ModelDownloadRequest] = None,
):
    """Triggers downloading or force re-downloading foundation models in background."""
    global _DOWNLOAD_PROGRESS
    if _DOWNLOAD_PROGRESS["is_downloading"]:
        return {"status": "in_progress", "progress": _DOWNLOAD_PROGRESS}

    force = req.force if req else False
    target_filename = req.filename if req else None

    _DOWNLOAD_PROGRESS = {
        "is_downloading": True,
        "overall_pct": 0,
        "current_file": "Connecting to Hugging Face...",
        "detail": "Initializing force re-download..." if force else "Initializing download manager",
        "error": None,
    }

    def _download_task():
        global _DOWNLOAD_PROGRESS
        try:
            def _cb(info: dict):
                pct = int(info["overall_fraction"] * 100)
                curr_mb = info["file_bytes"] / (1024 * 1024)
                tot_mb = (info["file_total"] or info["file_bytes"]) / (1024 * 1024)
                _DOWNLOAD_PROGRESS.update({
                    "is_downloading": True,
                    "overall_pct": pct,
                    "current_file": f"[{info['file_index']}/{info['total_files']}] {info['name']}",
                    "detail": f"{curr_mb:.1f} MB / {tot_mb:.1f} MB ({pct}%)",
                })

            target_files = [target_filename] if target_filename else None
            download_all_models(
                progress_callback=_cb,
                force_download=force,
                target_files=target_files,
            )

            # Warm up sessions
            load_coralscop_model(device=_ACTIVE_DEVICE_PREF)
            load_bioclip_model(device=_ACTIVE_DEVICE_PREF)
            load_bleaching_model(device=_ACTIVE_DEVICE_PREF)

            _DOWNLOAD_PROGRESS.update({
                "is_downloading": False,
                "overall_pct": 100,
                "current_file": "All Models Ready",
                "detail": "Weights downloaded and inference engines initialized",
            })
        except Exception as e:
            _DOWNLOAD_PROGRESS.update({
                "is_downloading": False,
                "error": str(e),
                "detail": f"Download failed: {e}",
            })

    background_tasks.add_task(_download_task)
    return {"status": "started", "force": force}


@app.get("/api/samples")
def list_samples() -> List[Dict[str, Any]]:
    """Discovers available coral demo samples."""
    dirs = _resolve_demo_dirs()
    found = []
    seen = set()
    for sdir in dirs:
        for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
            for fp in sorted(glob.glob(os.path.join(sdir, ext))):
                fn = os.path.basename(fp)
                if fn not in seen:
                    seen.add(fn)
                    found.append({
                        "filename": fn,
                        "path": fp,
                        "size_bytes": os.path.getsize(fp),
                    })
    return found


@app.get("/api/samples/image/{filename}")
def get_sample_image(filename: str):
    """Streams a sample image file."""
    dirs = _resolve_demo_dirs()
    for sdir in dirs:
        target = os.path.join(sdir, filename)
        if os.path.isfile(target):
            with open(target, "rb") as f:
                content = f.read()
            ext = filename.rsplit(".", 1)[-1].lower()
            media_type = "image/png" if ext == "png" else "image/jpeg"
            return Response(content=content, media_type=media_type)
    raise HTTPException(status_code=404, detail=f"Sample '{filename}' not found")


@app.post("/api/images/register")
def register_image_base64(payload: Dict[str, str]):
    """Registers an image in memory via base64."""
    image_name = payload.get("filename", f"upload_{int(time.time())}.png")
    data_str = payload.get("data", "")
    if "," in data_str:
        data_str = data_str.split(",", 1)[1]
    raw_bytes = base64.b64decode(data_str)
    pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    _IMAGE_STORE[image_name] = pil_img
    return {
        "status": "registered",
        "filename": image_name,
        "width": pil_img.width,
        "height": pil_img.height,
    }


@app.post("/api/images/load-sample")
def load_sample_to_store(payload: Dict[str, str]):
    """Loads a named sample image from disk into memory."""
    filename = payload.get("filename", "")
    dirs = _resolve_demo_dirs()
    for sdir in dirs:
        target = os.path.join(sdir, filename)
        if os.path.isfile(target):
            pil_img = Image.open(target).convert("RGB")
            _IMAGE_STORE[filename] = pil_img
            return {
                "status": "loaded",
                "filename": filename,
                "width": pil_img.width,
                "height": pil_img.height,
            }
    raise HTTPException(status_code=404, detail=f"Sample '{filename}' not found")


@app.post("/api/analysis/segment")
def segment_image(req: SegmentRequest):
    """Runs CoralSCOP SAM segmentation on a registered image."""
    img_name = req.image_name
    if img_name not in _IMAGE_STORE:
        # If image_base64 is provided in the request, register it automatically
        if req.image_base64:
            data_str = req.image_base64
            if "," in data_str:
                data_str = data_str.split(",", 1)[1]
            raw_bytes = base64.b64decode(data_str)
            _IMAGE_STORE[img_name] = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        else:
            # Check if it exists in demo_images
            dirs = _resolve_demo_dirs()
            found = False
            for sdir in dirs:
                target = os.path.join(sdir, img_name)
                if os.path.isfile(target):
                    _IMAGE_STORE[img_name] = Image.open(target).convert("RGB")
                    found = True
                    break
            if not found:
                raise HTTPException(status_code=404, detail=f"Image '{img_name}' not loaded in session")

    pil_img = _IMAGE_STORE[img_name]
    cache_key = f"{img_name}_{req.points_per_side}_{req.iou_thresh}_{req.stability_thresh}"

    if cache_key not in _BASE_SEG_CACHE:
        seg_lock = _get_seg_lock(cache_key)
        with seg_lock:
            if cache_key not in _BASE_SEG_CACHE:
                sam_bundle = load_coralscop_model(device=_ACTIVE_DEVICE_PREF)
                img_np = np.array(pil_img)
                masks_info, _ = run_segmentation(
                    model=sam_bundle,
                    image=img_np,
                    points_per_side=req.points_per_side,
                    pred_iou_thresh=req.iou_thresh,
                    stability_score_thresh=req.stability_thresh,
                    min_mask_region_area=0,
                )
                _BASE_SEG_CACHE[cache_key] = masks_info

    all_candidate_masks = _BASE_SEG_CACHE[cache_key]
    return {
        "status": "success",
        "cache_key": cache_key,
        "total_candidate_masks": len(all_candidate_masks),
        "image_width": pil_img.width,
        "image_height": pil_img.height,
    }


@app.post("/api/analysis/enrich")
def enrich_image(req: EnrichRequest):
    """Enriches filtered masks with BioCLIP taxonomy and NOAA bleaching detection."""
    img_name = req.image_name
    if img_name not in _IMAGE_STORE:
        raise HTTPException(status_code=404, detail=f"Image '{img_name}' not loaded")

    pil_img = _IMAGE_STORE[img_name]
    img_h, img_w = pil_img.height, pil_img.width
    total_pixels = img_h * img_w

    # Find the most recent base seg cache key for this image
    matching_keys = [k for k in _BASE_SEG_CACHE.keys() if k.startswith(f"{img_name}_")]
    if not matching_keys:
        raise HTTPException(status_code=400, detail="Must run /segment first")
    base_cache_key = matching_keys[-1]
    all_candidate_masks = _BASE_SEG_CACHE[base_cache_key]

    # Filter masks by min_area_px
    raw_filtered = [
        m for m in all_candidate_masks
        if m.get("area_px", m.get("area", 0)) >= req.min_area_px
    ]

    distinct_colors = generate_distinct_colors(len(raw_filtered))
    filtered_masks = []
    for new_idx, m in enumerate(raw_filtered):
        m_copy = dict(m)
        m_id = new_idx + 1
        m_copy["id"] = m_id
        m_copy["segment_id"] = m_id
        m_area = m_copy.get("area_px", m_copy.get("area", 0))
        m_copy["area"] = m_area
        m_copy["area_px"] = m_area
        m_copy["area_pct"] = round((m_area / max(total_pixels, 1)) * 100.0, 2)
        c_rgb = distinct_colors[new_idx]
        m_copy["color_rgb"] = c_rgb
        m_copy["instance_color_rgb"] = c_rgb
        m_copy["color_hex"] = f"#{c_rgb[0]:02x}{c_rgb[1]:02x}{c_rgb[2]:02x}"
        m_copy["instance_color_hex"] = m_copy["color_hex"]
        filtered_masks.append(m_copy)

    enrich_cache_key = f"{base_cache_key}_{req.min_area_px}"
    if enrich_cache_key not in _ENRICH_CACHE:
        bioclip = load_bioclip_model(device=_ACTIVE_DEVICE_PREF)
        bleaching = load_bleaching_model(device=_ACTIVE_DEVICE_PREF)

        enriched_masks, full_image_eval, health_summary = enrich_masks_with_taxonomy_and_bleaching(
            image=pil_img,
            masks_info=filtered_masks,
            bioclip_bundle=bioclip,
            bleaching_model=bleaching,
        )
        _ENRICH_CACHE[enrich_cache_key] = (enriched_masks, full_image_eval, health_summary)

    masks_info, full_image_eval, health_summary = _ENRICH_CACHE[enrich_cache_key]

    # Recompute summary stats
    union_mask = np.zeros((img_h, img_w), dtype=bool)
    for m in masks_info:
        seg = m.get("mask", m.get("segmentation"))
        if seg is not None:
            union_mask = np.logical_or(union_mask, seg)

    coral_covered_pixels = int(np.sum(union_mask))
    coral_coverage_pct = round((coral_covered_pixels / max(total_pixels, 1)) * 100.0, 2)
    mean_iou = round(float(np.mean([m["predicted_iou"] for m in masks_info])), 4) if masks_info else 0.0
    mean_stability = round(float(np.mean([m["stability_score"] for m in masks_info])), 4) if masks_info else 0.0

    summary_stats = {
        "total_corals_detected": len(masks_info),
        "coral_coverage_pct": coral_coverage_pct,
        "coral_covered_pixels": coral_covered_pixels,
        "total_image_pixels": total_pixels,
        "image_resolution": f"{img_w}x{img_h}",
        "mean_iou_confidence": mean_iou,
        "mean_stability_score": mean_stability,
    }

    # Prepare lightweight serializable list for table
    table_records = []
    for m in masks_info:
        tax = m.get("taxonomy", {})
        bl = m.get("bleaching", {})
        cond_label = "Bleached" if bl.get("is_bleached") else "Healthy"
        table_records.append({
            "id": m["id"],
            "id_str": f"#{m['id']}",
            "genus": tax.get("genus", "Coral"),
            "growth_form": tax.get("growth_form", "-"),
            "taxon_conf": round(float(tax.get("confidence_pct", 0)), 1),
            "condition": cond_label,
            "condition_conf": round(float(bl.get("confidence_pct", 0)), 1),
            "area_pct": m.get("area_pct", 0.0),
            "area_px": m.get("area_px", m.get("area", 0)),
            "predicted_iou": round(float(m["predicted_iou"]), 3),
            "color_hex": m.get("color_hex", "#00cccc"),
            "centroid": [int(v) for v in m["centroid"]] if m.get("centroid") else None,
            "bbox": [int(v) for v in m["bbox"]] if m.get("bbox") else None,
        })

    return {
        "summary": summary_stats,
        "segments": table_records,
        "health_summary": health_summary,
        "scene_eval": full_image_eval,
    }


@app.post("/api/analysis/overlay")
def render_overlay(req: OverlayRequest):
    """Renders high-contrast segmentation overlay on image canvas."""
    img_name = req.image_name
    if img_name not in _IMAGE_STORE:
        raise HTTPException(status_code=404, detail=f"Image '{img_name}' not loaded")

    pil_img = _IMAGE_STORE[img_name]

    # Find enriched masks
    matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_") and k.endswith(f"_{req.min_area_px}")]
    if not matching_keys:
        # Fallback to any enriched cache for this image
        matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_")]
    if not matching_keys:
        raise HTTPException(status_code=400, detail="Must run /enrich first")

    enrich_cache_key = matching_keys[-1]
    masks_info, _, _ = _ENRICH_CACHE[enrich_cache_key]

    base_image = pil_img
    if req.layout_mode == "Masks on Black":
        base_image = np.zeros_like(np.array(pil_img))

    overlay_res = create_segmentation_overlay(
        image=base_image,
        masks_info=masks_info,
        alpha=req.alpha,
        draw_contours=req.draw_contours,
        draw_labels=req.draw_labels,
        draw_boxes=req.draw_boxes,
        selected_mask_id=req.selected_mask_id,
        color_mode=req.color_mode,
    )

    overlay_pil = overlay_res if isinstance(overlay_res, Image.Image) else Image.fromarray(overlay_res)

    buf = io.BytesIO()
    overlay_pil.save(buf, format="PNG")
    buf.seek(0)
    base64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "overlay_base64": f"data:image/png;base64,{base64_str}",
        "width": overlay_pil.width,
        "height": overlay_pil.height,
    }


@app.post("/api/analysis/export/coco")
def export_coco(req: ExportCocoRequest):
    """Builds and returns standard COCO JSON format."""
    img_name = req.image_name
    if img_name not in _IMAGE_STORE:
        raise HTTPException(status_code=404, detail=f"Image '{img_name}' not loaded")

    pil_img = _IMAGE_STORE[img_name]
    matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_") and k.endswith(f"_{req.min_area_px}")]
    if not matching_keys:
        matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_")]
    if not matching_keys:
        raise HTTPException(status_code=400, detail="Must run /enrich first")

    enrich_cache_key = matching_keys[-1]
    masks_info, full_image_eval, health_summary = _ENRICH_CACHE[enrich_cache_key]

    coco_dict = build_coco_json(
        image_name=img_name,
        width=pil_img.width,
        height=pil_img.height,
        masks_info=masks_info,
    )
    coco_dict["health_summary"] = health_summary
    coco_dict["full_image_taxonomy"] = full_image_eval.get("taxonomy")
    coco_dict["full_image_bleaching"] = full_image_eval.get("bleaching")

    return JSONResponse(content=coco_dict)


@app.post("/api/analysis/export/csv")
def export_csv(req: ExportCocoRequest):
    """Exports segments table as CSV text."""
    img_name = req.image_name
    matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_") and k.endswith(f"_{req.min_area_px}")]
    if not matching_keys:
        matching_keys = [k for k in _ENRICH_CACHE.keys() if k.startswith(f"{img_name}_")]
    if not matching_keys:
        raise HTTPException(status_code=400, detail="Must run /enrich first")

    enrich_cache_key = matching_keys[-1]
    masks_info, _, _ = _ENRICH_CACHE[enrich_cache_key]

    df_records = []
    for m in masks_info:
        tax = m.get("taxonomy", {})
        bl = m.get("bleaching", {})
        df_records.append({
            "ID": f"#{m['id']}",
            "Taxon Genus": tax.get("genus", "Coral"),
            "Growth Form": tax.get("growth_form", "-"),
            "Taxon Conf (%)": round(float(tax.get("confidence_pct", 0)), 1),
            "Condition": "Bleached" if bl.get("is_bleached") else "Healthy",
            "Condition Conf (%)": round(float(bl.get("confidence_pct", 0)), 1),
            "Area (%)": f"{m.get('area_pct', 0.0)}%",
            "Area (px)": m.get("area_px", m.get("area", 0)),
            "IoU Confidence": round(float(m["predicted_iou"]), 3),
        })

    df = pd.DataFrame(df_records)
    csv_str = df.to_csv(index=False)
    return Response(content=csv_str, media_type="text/csv")
