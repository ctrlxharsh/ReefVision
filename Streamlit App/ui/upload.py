"""
Landing and model management view: Google Sign-in style split card layout with dropzone and sample library.
"""

import os
import io
import time
import glob
import zipfile
from PIL import Image
import streamlit as st

from core.device import get_device_info, get_optimal_device
from core.models import (
    check_models_download_status,
    download_all_models,
    load_coralscop_model,
    load_bioclip_model,
    load_bleaching_model,
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def render_upload_page():
    """Screen 1: Google Sign-in style centered split card layout with zero sidebar."""
    # 1. Hide sidebar completely on the landing/login portal page
    st.markdown(
        """
        <style>
        section[data-testid="stSidebar"] {
            display: none !important;
        }
        div[data-testid="collapsedControl"] {
            display: none !important;
        }
        button[data-testid="stSidebarCollapseButton"] {
            display: none !important;
        }
        .block-container {
            padding-top: 2.5rem !important;
            padding-bottom: 3rem !important;
            max-width: 1300px !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        /* Pinned top alignment */
        div[data-testid="stHorizontalBlock"] {
            align-items: flex-start !important;
        }
        div[data-testid="stColumn"] {
            align-self: flex-start !important;
            justify-content: flex-start !important;
        }
        /* Portal Card */
        div.st-key-portal_card {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 20px !important;
            padding: 2.25rem 2.5rem !important;
            box-shadow: 0 10px 30px -4px rgba(15, 30, 74, 0.06), 0 2px 6px -1px rgba(15, 30, 74, 0.04) !important;
            width: 100% !important;
        }
        /* Hardware Acceleration Subcard */
        div.st-key-hw_accel_card {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 14px !important;
            padding: 1.1rem 1.25rem !important;
            margin-top: 1.25rem !important;
            box-shadow: none !important;
            width: 100% !important;
        }
        /* Spacious Upload Drag-and-Drop Area */
        div[data-testid="stFileUploaderDropzone"] {
            padding: 2.25rem 2rem !important;
            background: #f8fafc !important;
            border: 2px dashed #cbd5e1 !important;
            border-radius: 14px !important;
            min-height: 180px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            transition: all 0.2s ease-in-out;
        }
        div[data-testid="stFileUploaderDropzone"]:hover {
            border-color: #0d7c85 !important;
            background: #f0fdfa !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    all_downloaded, models_status = check_models_download_status()
    device_pref = st.session_state.get("sel_device_pref", "auto")

    # Unified Centered Studio Portal Card
    with st.container(border=True, key="portal_card"):
        col_left, col_right = st.columns([3.6, 6.4], gap="large", vertical_alignment="top")

        with col_left:
            icon_p = os.path.join(ROOT_DIR, "assets", "app_icon.png")
            if os.path.exists(icon_p):
                st.image(icon_p, width=72)
            st.markdown("<div class='andromeida-text-brand'>ANDROME!DA<span class='tm'>™</span></div>", unsafe_allow_html=True)
            st.markdown("<div class='login-title'>Reef Vision Studio</div>", unsafe_allow_html=True)
            st.markdown(
                "<div class='login-subtitle'>Autonomous multi-model coral reef instance segmentation, taxonomy, and condition assessment.</div>",
                unsafe_allow_html=True,
            )

            if all_downloaded:
                st.markdown("<div class='models-ready-pill' style='margin-bottom: 0.6rem;'>✓ Foundation Models Ready</div>", unsafe_allow_html=True)

                st.markdown(
                    "<div class='model-chips-row' style='margin-bottom: 1rem;'>"
                    "<span class='model-chip ready'>✓ Segmentation Model</span>"
                    "<span class='model-chip ready'>✓ Taxonomical Model</span>"
                    "<span class='model-chip ready'>✓ Bleach Detection Model</span>"
                    "</div>",
                    unsafe_allow_html=True,
                )

            # Hardware Acceleration Subcard
            with st.container(border=True, key="hw_accel_card"):
                st.markdown("<div class='hw-box-title'>Hardware Acceleration</div>", unsafe_allow_html=True)
                current_pref = st.session_state.get("sel_device_pref", "auto")
                device_info = get_device_info(current_pref)
                active_provider = device_info.get("device", "CPUExecutionProvider")
                device_label = device_info.get("gpu_name", "CPU")

                mode = device_info.get("mode", "multithread_cpu")
                gpu_avail = device_info.get("gpu_available", False)
                cpu_count = device_info.get("cpu_count", 4)

                if device_info.get("device_type") == "gpu" or active_provider.startswith("CUDA"):
                    st.markdown(f"<div class='hw-badge hw-cuda'>GPU: {device_label}</div>", unsafe_allow_html=True)
                elif mode == "cpu":
                    st.markdown("<div class='hw-badge hw-cpu-single'>Single-Threaded CPU Engine (1 Thread)</div>", unsafe_allow_html=True)
                else:
                    engine_display = device_label if "Engine" in device_label else f"Multi-Threaded CPU ({cpu_count} Threads)"
                    st.markdown(f"<div class='hw-badge hw-cpu'>{engine_display}</div>", unsafe_allow_html=True)

                def _format_dev_upload(opt: str) -> str:
                    if opt == "auto":
                        if gpu_avail:
                            return f"Auto (GPU: {device_label})"
                        elif cpu_count > 1:
                            return f"Auto (Multi-Threaded CPU - {cpu_count} Threads)"
                        return "Auto (CPU)"
                    elif opt in ("gpu", "cuda"):
                        return f"GPU Acceleration {f'({device_label})' if gpu_avail else '[Unavailable]'}"
                    elif opt in ("multithread_cpu", "multithread"):
                        return f"Multi-Threaded CPU Engine ({cpu_count} Threads)"
                    elif opt == "cpu":
                        return "Single-Threaded CPU Engine (1 Thread)"
                    return opt

                st.selectbox(
                    "Device Preference",
                    options=["auto", "gpu", "multithread_cpu", "cpu"],
                    index=0,
                    key="sel_device_pref",
                    format_func=_format_dev_upload,
                    help="Hardware priority: GPU -> Multi-Threaded CPU -> Single-Threaded CPU.",
                )

        with col_right:
            if not all_downloaded:
                # SECTION 1: DOWNLOAD MODELS (PROHIBIT USER FROM PROCEEDING)
                st.markdown("#### Foundation Models Required")
                st.markdown(
                    "<div class='locked-notice'>Action Required: Please download foundation models to unlock imagery upload & analysis.</div>",
                    unsafe_allow_html=True,
                )
                st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)

                for m in models_status:
                    is_cached = m.get("cached", m.get("downloaded", False))
                    cache_label = "Downloaded" if is_cached else "Download Required"
                    cache_badge_class = "model-badge-cached" if is_cached else "model-badge-needed"
                    size_str = m.get("size")
                    if not size_str:
                        bytes_val = m.get("actual_size") or m.get("approx_size", 0)
                        size_str = f"{bytes_val / (1024 * 1024):.1f} MB" if bytes_val >= 1024 * 1024 else f"{bytes_val / 1024:.1f} KB"
                    st.markdown(
                        f"<div class='model-item'>"
                        f"<div><span class='model-name'>{m['name']}</span> <span class='model-task'>{m['task']} ({size_str})</span></div>"
                        f"<span class='{cache_badge_class}'>{cache_label}</span>"
                        f"</div>",
                        unsafe_allow_html=True,
                    )

                if st.button("Download Foundation Models Now", icon=":material/download:", type="primary", width="stretch"):
                    progress_container = st.container()
                    with progress_container:
                        progress_bar = st.progress(0.0, text="Connecting to Hugging Face...")
                        status_text = st.empty()

                        last_update_time = [0.0]
                        last_pct = [-1]

                        def on_download_progress(info: dict):
                            now = time.time()
                            overall_pct = int(info["overall_fraction"] * 100)

                            if (now - last_update_time[0] < 0.08) and (overall_pct == last_pct[0]) and info["status"] != "completed":
                                return

                            last_update_time[0] = now
                            last_pct[0] = overall_pct

                            curr_mb = info["file_bytes"] / (1024 * 1024)
                            tot_mb = (info["file_total"] or info["file_bytes"]) / (1024 * 1024)

                            file_header = f"[{info['file_index']}/{info['total_files']}] {info['name']}"
                            detail = f"{curr_mb:.1f} MB / {tot_mb:.1f} MB"
                            progress_bar.progress(
                                min(max(info["overall_fraction"], 0.0), 1.0),
                                text=f"{file_header}: {detail} ({overall_pct}%)",
                            )
                            status_text.caption(
                                f"Downloading weights from Hugging Face ({info['filename']}) • Total progress: {overall_pct}%"
                            )

                        try:
                            download_all_models(progress_callback=on_download_progress)
                            progress_bar.progress(1.0, text="Weights downloaded! Initializing ONNX runtime sessions...")
                            status_text.caption("Warming up inference engine...")

                            dev = get_optimal_device(device_pref)
                            load_coralscop_model(dev)
                            load_bioclip_model(dev)
                            load_bleaching_model(dev)

                            st.session_state["models_loaded"] = True
                            st.toast("All foundation models downloaded & ready!", icon=":material/verified:")
                            time.sleep(0.5)
                            st.rerun()
                        except Exception as e:
                            st.error(f"Download error: {e}")

                st.markdown(
                    "<div style='margin-top: 1.5rem; color: #94a3b8; font-size: 0.82rem;'>"
                    "Upload and Sample Library will unlock once models are downloaded."
                    "</div>",
                    unsafe_allow_html=True,
                )

            else:
                # MODELS ARE DOWNLOADED! SHOW REFINED TABS
                tab_upload, tab_samples = st.tabs([
                    ":material/upload_file: Upload Images",
                    ":material/photo_library: Sample Library",
                ])

                with tab_upload:
                    st.markdown("##### Upload Coral Imagery")
                    uploaded_files = st.file_uploader(
                        "Select one or more images or a .zip archive (.jpg, .jpeg, .png, .tif, .webp, .zip)",
                        type=["jpg", "jpeg", "png", "tif", "tiff", "webp", "zip"],
                        accept_multiple_files=True,
                        help="Upload coral quadrat photos or a .zip archive of images for multi-model processing.",
                        key="login_file_uploader",
                    )

                    staged_upload_images = {}
                    if uploaded_files:
                        for uf in uploaded_files:
                            if uf.name.lower().endswith(".zip"):
                                try:
                                    with zipfile.ZipFile(uf) as z:
                                        zip_extracted_count = 0
                                        for info in z.infolist():
                                            if info.is_dir():
                                                continue
                                            clean_path = info.filename.replace("\\", "/")
                                            base_fn = os.path.basename(clean_path)
                                            if base_fn.startswith(".") or "__MACOSX" in clean_path:
                                                continue
                                            ext = base_fn.rsplit(".", 1)[-1].lower() if "." in base_fn else ""
                                            if ext in ("jpg", "jpeg", "png", "tif", "tiff", "webp"):
                                                img_key = base_fn
                                                if img_key in staged_upload_images:
                                                    img_key = clean_path
                                                try:
                                                    with z.open(info) as zf:
                                                        staged_upload_images[img_key] = Image.open(io.BytesIO(zf.read())).convert("RGB")
                                                        zip_extracted_count += 1
                                                except Exception as img_err:
                                                    st.warning(f"Could not read '{base_fn}' in {uf.name}: {img_err}")
                                        if zip_extracted_count == 0:
                                            st.warning(f"No supported images found inside archive '{uf.name}'.")
                                except Exception as ex:
                                    st.error(f"Error extracting {uf.name}: {ex}")
                            else:
                                try:
                                    staged_upload_images[uf.name] = Image.open(uf).convert("RGB")
                                except Exception as ex:
                                    st.error(f"Error reading {uf.name}: {ex}")

                        st.success(f"{len(staged_upload_images)} image(s) ready for analysis.")
                        preview_cols = st.columns(min(max(len(staged_upload_images), 1), 3))
                        for i, (fn, img) in enumerate(list(staged_upload_images.items())[:6]):
                            with preview_cols[i % len(preview_cols)]:
                                st.image(img, caption=fn[:20], width="stretch")

                        if st.button(
                            f"Launch Reef Vision Studio ({len(staged_upload_images)} Images)",
                            type="primary",
                            width="stretch",
                            icon=":material/rocket_launch:",
                            key="btn_launch_uploaded",
                        ):
                            st.session_state["loaded_images"] = staged_upload_images
                            st.session_state["selected_img_idx"] = 0
                            st.session_state["app_stage"] = "analysis"
                            st.rerun()

                with tab_samples:
                    st.markdown("##### Select from Sample Library")
                    search_dirs = [
                        os.path.join(ROOT_DIR, "demo_images"),
                        os.path.join(ROOT_DIR, "demo_images", "unlabeled_samples"),
                    ]

                    found_samples = []
                    seen_names = set()
                    for sdir in search_dirs:
                        if os.path.isdir(sdir):
                            for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
                                for fp in sorted(glob.glob(os.path.join(sdir, ext))):
                                    fn = os.path.basename(fp)
                                    if fn not in seen_names:
                                        seen_names.add(fn)
                                        found_samples.append({"filename": fn, "path": fp})

                    if found_samples:
                        preset_options = ["First 6 Samples", "First 12 Samples", "First 24 Samples", "All Available Samples", "Select Specific Files"]
                        selected_preset = st.selectbox("Batch Selection", options=preset_options, index=0, key="sample_preset")

                        sample_subset = []
                        if selected_preset == "First 6 Samples":
                            sample_subset = found_samples[:6]
                        elif selected_preset == "First 12 Samples":
                            sample_subset = found_samples[:12]
                        elif selected_preset == "First 24 Samples":
                            sample_subset = found_samples[:24]
                        elif selected_preset == "All Available Samples":
                            sample_subset = found_samples[:100]
                        else:
                            chosen_names = st.multiselect(
                                "Choose Specific Sample Images",
                                options=[s["filename"] for s in found_samples],
                                default=[s["filename"] for s in found_samples[:4]],
                                key="specific_samples_select",
                            )
                            sample_subset = [s for s in found_samples if s["filename"] in chosen_names]

                        if sample_subset:
                            preview_cols = st.columns(min(max(len(sample_subset), 1), 3))
                            for i, s in enumerate(sample_subset[:6]):
                                with preview_cols[i % len(preview_cols)]:
                                    raw_img = Image.open(s["path"])
                                    st.image(raw_img, caption=f"#{i+1}: {s['filename'][:20]}", width="stretch")

                            if st.button(
                                f"Launch Reef Vision Studio ({len(sample_subset)} Samples)",
                                type="primary",
                                width="stretch",
                                icon=":material/rocket_launch:",
                                key="btn_launch_samples",
                            ):
                                staged_samples = {}
                                for s in sample_subset:
                                    staged_samples[s["filename"]] = Image.open(s["path"]).convert("RGB")
                                st.session_state["loaded_images"] = staged_samples
                                st.session_state["selected_img_idx"] = 0
                                st.session_state["app_stage"] = "analysis"
                                st.rerun()
                    else:
                        st.info("No local sample images found in demo_images/.")
