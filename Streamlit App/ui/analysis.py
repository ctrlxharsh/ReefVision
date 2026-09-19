"""
Dedicated analysis studio: image views, parameters, overlays, KPI cards, table breakdown, and export.
"""

import os
import io
import json
from PIL import Image
import numpy as np
import pandas as pd
import streamlit as st

from core.segmentation import run_segmentation
from core.taxonomy import enrich_masks_with_taxonomy_and_bleaching
from core.visualization import create_segmentation_overlay, generate_distinct_colors
from core.export import build_coco_json


def render_analysis_page(model, bioclip_bundle=None, bleaching_model=None):
    """Screen 2: Dedicated analysis studio with clean navigation, images, and bottom breakdown table."""
    images_dict = st.session_state.get("loaded_images", {})
    if not images_dict:
        st.session_state["app_stage"] = "upload"
        st.rerun()

    image_names = list(images_dict.keys())
    total_images = len(image_names)

    if st.session_state["selected_img_idx"] >= total_images:
        st.session_state["selected_img_idx"] = 0

    cur_idx = st.session_state["selected_img_idx"]
    current_img_name = image_names[cur_idx]
    current_image = images_dict[current_img_name]

    # ------------------ TOP BAR: BACK BUTTON & TITLE ------------------
    top_c1, top_c2 = st.columns([2.2, 7.8], vertical_alignment="center")
    with top_c1:
        if st.button("Back to Selection", icon=":material/arrow_back:", width="stretch", key="btn_back_to_upload"):
            st.session_state["app_stage"] = "upload"
            st.rerun()
    with top_c2:
        st.markdown(
            f"<div class='image-title-bar'>"
            f"<span class='img-title-text'>{current_img_name}</span> "
            f"<span class='img-badge-counter'>Image {cur_idx + 1} of {total_images}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )

    # ------------------ DEDICATED PAGINATION & IMAGE SWITCHER ------------------
    if total_images > 1:
        pag_key = f"paginator_{total_images}_{cur_idx}"

        def _on_prev_click():
            if st.session_state["selected_img_idx"] > 0:
                st.session_state["selected_img_idx"] -= 1

        def _on_next_click():
            if st.session_state["selected_img_idx"] < total_images - 1:
                st.session_state["selected_img_idx"] += 1

        def _on_page_change():
            if pag_key in st.session_state:
                st.session_state["selected_img_idx"] = st.session_state[pag_key] - 1

        c_prev, c_pag, c_next = st.columns([1.5, 7, 1.5], vertical_alignment="center")
        with c_prev:
            st.button(
                "Previous",
                icon=":material/navigate_before:",
                disabled=(cur_idx == 0),
                width="stretch",
                key="btn_prev",
                on_click=_on_prev_click,
            )
        with c_pag:
            st.pagination(
                num_pages=total_images,
                default=cur_idx + 1,
                key=pag_key,
                on_change=_on_page_change,
            )
        with c_next:
            st.button(
                "Next",
                icon=":material/navigate_next:",
                disabled=(cur_idx == total_images - 1),
                width="stretch",
                key="btn_next",
                on_click=_on_next_click,
            )

    # ------------------ SIDEBAR CONTROLS & PARAMS ------------------
    with st.sidebar:
        # 1. Hyperparameters (Default: 16, 0.50, 0.50, 100)
        with st.expander("Inference Parameters", icon=":material/tune:", expanded=True):
            points_per_side = st.slider(
                "Points Per Side (Grid Density)",
                min_value=8,
                max_value=36,
                value=16,
                step=4,
                key="param_points_per_side",
                help="Higher values detect smaller coral instances but take longer to process.",
            )
            iou_thresh = st.slider(
                "IoU Confidence Threshold",
                min_value=0.20,
                max_value=0.98,
                value=0.50,
                step=0.02,
                key="param_iou_thresh",
                help="Filters masks with model predicted quality below this cutoff.",
            )
            stability_thresh = st.slider(
                "Stability Score Threshold",
                min_value=0.20,
                max_value=0.99,
                value=0.50,
                step=0.01,
                key="param_stability_thresh",
                help="Filters masks with unstable boundary thresholds.",
            )
            min_area_px = st.number_input(
                "Minimum Mask Area (px)",
                min_value=10,
                max_value=50000,
                value=100,
                step=50,
                key="param_min_area_px",
                help="Removes tiny noise fragments below this pixel count.",
            )

        # 2. Run Segmentation with Instant Area Filtering
        base_seg_cache_key = f"base_seg_{current_img_name}_{points_per_side}_{iou_thresh}_{stability_thresh}"
        if base_seg_cache_key not in st.session_state:
            with st.spinner(f"Segmenting '{current_img_name}' with Segmentation Model..."):
                img_np = np.array(current_image)
                base_masks_info, _ = run_segmentation(
                    model=model,
                    image=img_np,
                    points_per_side=points_per_side,
                    pred_iou_thresh=iou_thresh,
                    stability_score_thresh=stability_thresh,
                    min_mask_region_area=0,
                )
                st.session_state[base_seg_cache_key] = base_masks_info

        all_candidate_masks = st.session_state[base_seg_cache_key]

        img_h, img_w = current_image.height, current_image.width
        total_pixels = img_h * img_w

        # Filter out masks smaller than min_area_px
        filtered_masks = []
        raw_filtered = [
            cand for cand in all_candidate_masks
            if cand.get("area_px", cand.get("area", 0)) >= min_area_px
        ]
        distinct_colors = generate_distinct_colors(len(raw_filtered))
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

        # Enrich masks with Taxonomical Model & Bleach Detection Model
        enrich_cache_key = f"enrich_{base_seg_cache_key}_{min_area_px}"
        if enrich_cache_key not in st.session_state:
            with st.spinner("Classifying with Taxonomical Model & Bleach Detection Model..."):
                enriched_masks, full_image_eval, health_summary = enrich_masks_with_taxonomy_and_bleaching(
                    image=current_image,
                    masks_info=filtered_masks,
                    bioclip_bundle=bioclip_bundle,
                    bleaching_model=bleaching_model,
                )
                st.session_state[enrich_cache_key] = (enriched_masks, full_image_eval, health_summary)
        masks_info, full_image_eval, health_summary = st.session_state[enrich_cache_key]

        # Recompute summary stats for filtered masks
        union_mask = np.zeros((img_h, img_w), dtype=bool)
        for m in masks_info:
            seg_mask = m.get("mask", m.get("segmentation"))
            if seg_mask is not None:
                union_mask = np.logical_or(union_mask, seg_mask)

        coral_covered_pixels = int(np.sum(union_mask))
        coral_coverage_pct = round((coral_covered_pixels / total_pixels) * 100.0, 2)
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

        # 3. Display & Overlay Controls
        with st.expander("Display Controls", icon=":material/palette:", expanded=True):
            st.markdown("**Layout View**")
            layout_opts = [
                "Side-by-Side",
                "Overlay Only",
                "Original Only",
                "Masks on Black",
            ]
            view_mode = st.segmented_control(
                "Display Layout",
                options=layout_opts,
                default="Side-by-Side",
                label_visibility="collapsed",
                key="side_view_mode",
            )
            if not view_mode or view_mode not in layout_opts:
                view_mode = "Side-by-Side"

            st.markdown("**Overlay Color Mode**")
            color_mode_options = [
                "Colony Instances",
                "Condition Status (Healthy vs Bleached)",
                "Taxonomy Classification",
                "Taxonomy + Condition Status",
            ]
            color_mode_option = st.radio(
                "Color Palette",
                options=color_mode_options,
                index=0,
                key="ctrl_color_mode",
                help="Colony Instances: Unique distinct color per segment. Condition Status: Emerald green for healthy, coral red for bleached. Taxonomy: Color-coded by coral genus with coral name badges. Taxonomy + Condition: Taxonomy colors with badges showing count, coral name, and health condition.",
            )
            if "Taxonomy + Condition" in color_mode_option:
                color_mode = "taxonomy_condition"
            elif "Condition" in color_mode_option:
                color_mode = "bleaching"
            elif "Taxonomy" in color_mode_option:
                color_mode = "taxonomy"
            else:
                color_mode = "instance"

            alpha_val = st.slider(
                "Overlay Transparency (Alpha)",
                min_value=0.10,
                max_value=0.90,
                value=0.45,
                step=0.05,
                key="ctrl_alpha",
            )

            chk_c1, chk_c2 = st.columns(2)
            with chk_c1:
                draw_contours = st.checkbox(
                    "Borders",
                    value=True,
                    key="ctrl_draw_contours",
                    help="Draw sharp contour borders around corals",
                )
                draw_labels = st.checkbox(
                    "ID Badges",
                    value=True,
                    key="ctrl_draw_labels",
                    help="Display segment ID numbers at centroids",
                )
            with chk_c2:
                draw_boxes = st.checkbox(
                    "Bounding Boxes",
                    value=False,
                    key="ctrl_draw_boxes",
                    help="Show bounding box rectangles",
                )

            def _format_mask_option(m):
                gen = m.get("taxonomy", {}).get("genus", "Coral")
                bl = "Bleached" if m.get("bleaching", {}).get("is_bleached") else "Healthy"
                return f"Coral #{m['id']} [{gen}] ({bl}, {m['area_pct']}%)"

            mask_options = ["All Corals"] + [_format_mask_option(m) for m in masks_info]
            selected_mask_option = st.selectbox(
                "Highlight Specific Segment",
                options=mask_options,
                index=0,
                key=f"sel_mask_{current_img_name}",
            )
            selected_mask_id = None
            if selected_mask_option != "All Corals":
                selected_mask_id = int(selected_mask_option.split("#")[1].split(" ")[0])

    # Generate Model Overlay
    overlay_res = create_segmentation_overlay(
        image=current_image,
        masks_info=masks_info,
        alpha=alpha_val,
        draw_contours=draw_contours,
        draw_labels=draw_labels,
        draw_boxes=draw_boxes,
        selected_mask_id=selected_mask_id,
        color_mode=color_mode,
    )
    overlay_pil = overlay_res if isinstance(overlay_res, Image.Image) else Image.fromarray(overlay_res)

    # ------------------ MAIN VIEW: IMAGES (NO STRETCHING) ------------------
    if view_mode == "Side-by-Side":
        col_orig, col_seg = st.columns(2, gap="medium")
        with col_orig:
            st.markdown("<div class='image-column-header'>Original Image <span class='image-column-header-badge'>SOURCE</span></div>", unsafe_allow_html=True)
            st.image(current_image, width="stretch")
        with col_seg:
            if color_mode == "taxonomy_condition":
                mode_tag = "TAXONOMY + HEALTH"
            elif color_mode == "taxonomy":
                mode_tag = "TAXONOMY"
            elif color_mode == "bleaching":
                mode_tag = "CONDITION"
            else:
                mode_tag = "INSTANCES"
            st.markdown(f"<div class='image-column-header'>Segmentation Overlay <span class='image-column-header-badge'>{mode_tag}</span></div>", unsafe_allow_html=True)
            st.image(overlay_pil, width="stretch")

    elif view_mode == "Overlay Only":
        st.markdown("<div class='image-column-header'>Segmentation Overlay <span class='image-column-header-badge'>FULL CANVAS</span></div>", unsafe_allow_html=True)
        st.image(overlay_pil, width="stretch")

    elif view_mode == "Original Only":
        st.markdown("<div class='image-column-header'>Original Image <span class='image-column-header-badge'>SOURCE</span></div>", unsafe_allow_html=True)
        st.image(current_image, width="stretch")

    elif view_mode == "Masks on Black":
        st.markdown("<div class='image-column-header'>Isolated Coral Masks <span class='image-column-header-badge'>MASKS</span></div>", unsafe_allow_html=True)
        black_bg = np.zeros_like(np.array(current_image))
        mask_only_res = create_segmentation_overlay(
            image=black_bg,
            masks_info=masks_info,
            alpha=1.0,
            draw_contours=draw_contours,
            draw_labels=draw_labels,
            draw_boxes=draw_boxes,
            selected_mask_id=selected_mask_id,
            color_mode=color_mode,
        )
        mask_only_pil = mask_only_res if isinstance(mask_only_res, Image.Image) else Image.fromarray(mask_only_res)
        st.image(mask_only_pil, width="stretch")

    # ------------------ KPI SUMMARY CARDS WITH RICH COLOR ACCENTS ------------------
    st.divider()
    kpi_c1, kpi_c2, kpi_c3, kpi_c4 = st.columns(4)
    with kpi_c1:
        st.markdown(
            f"<div class='metric-card metric-card-1'>"
            f"<div class='metric-card-val'>{summary_stats['total_corals_detected']}</div>"
            f"<div class='metric-card-lbl'>Corals Found</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with kpi_c2:
        st.markdown(
            f"<div class='metric-card metric-card-2'>"
            f"<div class='metric-card-val' style='color:#059669;'>{summary_stats['coral_coverage_pct']}%</div>"
            f"<div class='metric-card-lbl'>Reef Coverage ({summary_stats['coral_covered_pixels']:,} px)</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with kpi_c3:
        st.markdown(
            f"<div class='metric-card metric-card-3'>"
            f"<div class='metric-card-val' style='color:#0284c7;'>{summary_stats['mean_iou_confidence']:.3f}</div>"
            f"<div class='metric-card-lbl'>Avg IoU Confidence</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with kpi_c4:
        st.markdown(
            f"<div class='metric-card metric-card-4'>"
            f"<div class='metric-card-val' style='color:#4f46e5;'>{summary_stats['mean_stability_score']:.3f}</div>"
            f"<div class='metric-card-lbl'>Avg Stability Score</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

    # ------------------ MAIN FOCUS: DETECTED CORAL SEGMENTS BREAKDOWN ------------------
    st.markdown("### :material/table_chart: Detected Coral Segments Breakdown")
    res_display = str(summary_stats.get('image_resolution', '2048x1024')).replace('x', ' × ')
    cov_pct = summary_stats.get('coral_coverage_pct', 0.0)
    cov_px = f"{summary_stats.get('coral_covered_pixels', 0):,}"
    total_inst = summary_stats.get('total_corals_detected', 0)
    st.markdown(
        f"""
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; font-size:12.5px;">
            <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 9px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
                <span style="color:#64748b; font-weight:500;">Resolution</span>
                <span style="font-family:monospace; font-weight:600; color:#1e293b;">{res_display}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 9px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
                <span style="color:#64748b; font-weight:500;">Coral Coverage</span>
                <span style="font-family:monospace; font-weight:600; color:#0d7c85;">{cov_pct}%</span>
                <span style="color:#94a3b8; font-family:monospace; font-size:11.5px;">({cov_px} px)</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 9px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
                <span style="color:#64748b; font-weight:500;">Total Instances</span>
                <span style="background:#f0fdfa; color:#0d7c85; border:1px solid #ccfbf1; padding:1px 6px; border-radius:4px; font-family:monospace; font-weight:600;">{total_inst}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if masks_info:
        df_records = []
        for m in masks_info:
            tax = m.get("taxonomy", {})
            bl = m.get("bleaching", {})
            cond_label = "Bleached" if bl.get("is_bleached") else "Healthy"
            df_records.append({
                "ID": f"#{m['id']}",
                "Taxon Genus": tax.get("genus", "Coral"),
                "Growth Form": tax.get("growth_form", "-"),
                "Taxon Conf (%)": round(float(tax.get("confidence_pct", 0)), 1),
                "Condition": cond_label,
                "Condition Conf (%)": round(float(bl.get("confidence_pct", 0)), 1),
                "Area (%)": f"{m.get('area_pct', 0.0)}%",
                "Area (px)": f"{m.get('area_px', m.get('area', 0)):,}",
                "IoU Confidence": round(float(m["predicted_iou"]), 3),
            })
        df = pd.DataFrame(df_records)
        st.dataframe(
            df,
            column_config={
                "Taxon Conf (%)": st.column_config.ProgressColumn(
                    "Taxon Conf",
                    min_value=0,
                    max_value=100,
                    format="%.1f%%",
                ),
                "Condition Conf (%)": st.column_config.ProgressColumn(
                    "Condition Conf",
                    min_value=0,
                    max_value=100,
                    format="%.1f%%",
                ),
            },
            use_container_width=True,
            hide_index=True,
            height=min(420, 50 + len(df) * 36),
        )
    else:
        st.info("No coral segments detected with current threshold settings. Try lowering the IoU or Stability threshold in the sidebar.")

    # ------------------ NEXT LINE: EXPORT & DATA INSPECTOR ------------------
    st.markdown("### :material/download: Export & Data Inspector")

    coco_dict = build_coco_json(
        image_name=current_img_name,
        width=current_image.width,
        height=current_image.height,
        masks_info=masks_info,
    )
    coco_dict["health_summary"] = health_summary
    coco_dict["full_image_taxonomy"] = full_image_eval["taxonomy"]
    coco_dict["full_image_bleaching"] = full_image_eval["bleaching"]

    coco_json_str = json.dumps(coco_dict, indent=2)

    buf = io.BytesIO()
    overlay_pil.save(buf, format="PNG")

    csv_buf = io.StringIO()
    if masks_info:
        df.to_csv(csv_buf, index=False)
    csv_str = csv_buf.getvalue()

    stem_name = os.path.splitext(current_img_name)[0]
    exp_c1, exp_c2, exp_c3 = st.columns(3)
    with exp_c1:
        st.download_button(
            label="Export COCO JSON",
            icon=":material/data_object:",
            data=coco_json_str,
            file_name=f"{stem_name}_coco.json",
            mime="application/json",
            use_container_width=True,
        )
    with exp_c2:
        st.download_button(
            label="Export Overlay PNG",
            icon=":material/image:",
            data=buf.getvalue(),
            file_name=f"{stem_name}_overlay.png",
            mime="image/png",
            use_container_width=True,
        )
    with exp_c3:
        st.download_button(
            label="Export Segments CSV",
            icon=":material/table_rows:",
            data=csv_str,
            file_name=f"{stem_name}_segments.csv",
            mime="text/csv",
            use_container_width=True,
            disabled=not bool(masks_info),
        )

    with st.expander("Raw Model Output (JSON)", icon=":material/code:", expanded=False):
        text_export = {
            "summary": summary_stats,
            "scene_taxonomy": full_image_eval["taxonomy"],
            "scene_bleaching": full_image_eval["bleaching"],
            "segments": [
                {k: v for k, v in m.items() if k not in ["mask", "segmentation", "color_rgb"]}
                for m in masks_info
            ],
        }
        st.json(text_export)
