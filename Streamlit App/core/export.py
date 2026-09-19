"""
COCO JSON and dataset annotation serialization for segmented coral instances.
"""

from typing import Any, Dict, List
import numpy as np
import pycocotools.mask as mask_util


def build_coco_json(
    image_name: str,
    width: int,
    height: int,
    masks_info: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Serializes detections into standard COCO JSON format."""
    images = [{
        "id": 1,
        "file_name": image_name,
        "width": width,
        "height": height,
    }]

    categories = [
        {"id": 1, "name": "Coral Instance", "supercategory": "Benthos"},
    ]

    annotations = []
    for ann_id, mask_dict in enumerate(masks_info, start=1):
        seg = mask_dict.get("mask", mask_dict.get("segmentation"))
        if seg is None:
            continue
        rle = mask_util.encode(np.asfortranarray(seg.astype(np.uint8)))
        rle["counts"] = rle["counts"].decode("utf-8")

        x, y, bw, bh = mask_dict.get("bbox", [0, 0, 1, 1])
        area = mask_dict.get("area_px", mask_dict.get("area", int(np.sum(seg))))
        iou_val = mask_dict.get("predicted_iou", 0.0)

        ann = {
            "id": mask_dict.get("id", ann_id),
            "image_id": 1,
            "category_id": 1,
            "segmentation": rle,
            "area": area,
            "bbox": [x, y, bw, bh],
            "iscrowd": 0,
            "predicted_iou": iou_val,
        }
        if "taxonomy" in mask_dict:
            ann["taxonomy"] = mask_dict["taxonomy"]["primary_label"]
            ann["genus"] = mask_dict["taxonomy"]["genus"]
        if "bleaching" in mask_dict:
            ann["bleaching_status"] = mask_dict["bleaching"]["status"]
            ann["bleached_prob"] = mask_dict["bleaching"]["bleached_prob"]

        annotations.append(ann)

    return {
        "images": images,
        "categories": categories,
        "annotations": annotations,
    }
