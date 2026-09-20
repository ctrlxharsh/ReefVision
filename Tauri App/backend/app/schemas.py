from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DevicePreferenceRequest(BaseModel):
    preference: str = Field(default="auto", description="Device preference: auto, cuda, cpu")


class DeviceInfoResponse(BaseModel):
    device: str
    device_type: str
    cuda_available: bool
    dml_available: bool
    gpu_name: str
    active_provider: str


class ModelSpec(BaseModel):
    filename: str
    name: str
    task: str
    size: str
    downloaded: bool
    cached: bool
    approx_size: int
    actual_size: int
    path: Optional[str] = None


class ModelStatusResponse(BaseModel):
    all_downloaded: bool
    models: List[ModelSpec]
    active_device: str
    device_info: Dict[str, Any]


class ModelDownloadRequest(BaseModel):
    force: bool = Field(default=False, description="Force re-download from Hugging Face even if cached")
    filename: Optional[str] = Field(default=None, description="Specific model filename or None for all models")


class ModelDeleteRequest(BaseModel):
    filename: Optional[str] = Field(default=None, description="Specific model filename to delete, or None to delete all")
    all: bool = Field(default=False, description="Whether to delete all models")


class ModelDeleteResponse(BaseModel):
    status: str
    message: str
    deleted_files: List[str]
    freed_bytes: int
    all_downloaded: bool
    models: List[ModelSpec]


class SegmentRequest(BaseModel):
    image_name: str
    image_base64: Optional[str] = None
    points_per_side: int = Field(default=16, ge=8, le=36)
    iou_thresh: float = Field(default=0.50, ge=0.20, le=0.98)
    stability_thresh: float = Field(default=0.50, ge=0.20, le=0.99)


class EnrichRequest(BaseModel):
    image_name: str
    min_area_px: int = Field(default=100, ge=10, le=50000)


class OverlayRequest(BaseModel):
    image_name: str
    min_area_px: int = Field(default=100, ge=10, le=50000)
    alpha: float = Field(default=0.45, ge=0.10, le=0.90)
    draw_contours: bool = True
    draw_labels: bool = True
    draw_boxes: bool = False
    selected_mask_id: Optional[int] = None
    color_mode: str = Field(default="instance", description="instance | bleaching | taxonomy | taxonomy_condition")
    layout_mode: str = Field(default="Side-by-Side", description="Side-by-Side | Overlay Only | Original Only | Masks on Black")


class ExportCocoRequest(BaseModel):
    image_name: str
    min_area_px: int = Field(default=100, ge=10, le=50000)


class SampleItem(BaseModel):
    filename: str
    path: str
    size_bytes: int
