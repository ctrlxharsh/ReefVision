---
license: apache-2.0
tags:
- onnx
- onnxruntime
- coral-reef
- marine-biology
- computer-vision
- segmentation
- sam
- zero-shot
- bioclip
- yolo11
pipeline_tag: image-segmentation
---

# 🪸 Andromeida Reef Vision - ONNX Model Suite

This repository hosts optimized **ONNX (Open Neural Network Exchange)** weights for **[Andromeida Reef Vision Studio](https://github.com/ctrlxharsh/coralseg)**, enabling high-speed, ultra-lightweight desktop and edge inference via **ONNX Runtime** without requiring PyTorch or heavy CUDA drivers.

---

## 📦 Models Included

| File Name | Architecture | Task | Source Checkpoint | Size |
| :--- | :--- | :--- | :--- | :--- |
| **`sam_image_encoder.onnx`** | Vision Transformer (ViT-B) | Deep Image Embedding extraction | `reefsupport/CoralSCOP` | 342 MB |
| **`sam_mask_decoder.onnx`** | SAM Lightweight Mask Decoder | Instance Mask Generation & IoU Prediction | `reefsupport/CoralSCOP` | 16 MB |
| **`bioclip_visual.onnx`** | ViT-B/16 Vision Transformer | Zero-Shot Coral Taxonomy Features | `ReefNet/finetuned-bioclip` | 329 MB |
| **`coral_taxonomy_embeddings.npy`** | Pre-computed cosine text matrix | 18 Benthic Coral Taxa embeddings | Pre-encoded with BioCLIP | 36 KB |
| **`bleaching_yolo11n.onnx`** | YOLO11n Classification | Coral Bleaching Condition Assessment | `NMFS-OSI/yolo11n-cls-noaa-esd-coral-bleaching` | 5.9 MB |

---

## 🙏 Credits & Author Attributions

We give full credit to the original research teams and institutions whose open-source foundation models power this suite:

### 1. CoralSCOP SAM ViT-B
- **Model Card / Repo**: [`reefsupport/CoralSCOP`](https://huggingface.co/reefsupport/CoralSCOP)
- **Developed by**: Reef Support B.V. & EPFL Environmental Computational Science and Earth Observation Laboratory (ECEO).
- **Base Architecture**: Meta AI Segment Anything (`segment-anything` by Kirillov et al., ICCV 2023).
- **License**: Apache 2.0 / Meta SAM Research License.

### 2. ReefNet Fine-Tuned BioCLIP
- **Model Card / Repo**: [`ReefNet/finetuned-bioclip`](https://huggingface.co/ReefNet/finetuned-bioclip)
- **Developed by**: ReefNet Marine Vision Team.
- **Base Architecture**: BioCLIP (*"BioCLIP: A Vision Foundation Model for the Tree of Life"*, Stevens et al., CVPR 2024 / Imageomics Institute).
- **License**: MIT License.

### 3. NOAA ESD Coral Bleaching Classifier
- **Model Card / Repo**: [`NMFS-OSI/yolo11n-cls-noaa-esd-coral-bleaching`](https://huggingface.co/NMFS-OSI/yolo11n-cls-noaa-esd-coral-bleaching)
- **Developed by**: National Oceanic and Atmospheric Administration (NOAA) Fisheries, Ecosystem Sciences Division (ESD).
- **Base Architecture**: Ultralytics YOLO11n Classifier.
- **License**: AGPL-3.0 / Open Government Work.

---

## 🚀 Quickstart with ONNX Runtime

```python
import onnxruntime as ort
import numpy as np
from huggingface_hub import hf_hub_download

# Download and run Bleaching Classifier
model_path = hf_hub_download(
    repo_id="harsh-awasthi/Andromeida-ReefVision-ONNX",
    filename="bleaching_yolo11n.onnx"
)
session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
dummy_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
output = session.run(None, {"images": dummy_input})
print("Bleaching probabilities (Healthy vs Bleached):", output[0])
```

---

## 🛡️ License
The ONNX weights provided here inherit the respective open-source licenses from their original creators. Please refer to the upstream repositories for commercial use and scientific citation guidelines.
