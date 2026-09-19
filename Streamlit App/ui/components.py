"""
Reusable sidebar components and brand headers for Streamlit UI.
"""

import os
import streamlit as st
from core.device import get_device_info

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def render_sidebar_header():
    """Renders the official Andromeida gradient text logo and brand subtitle at the top of the sidebar."""
    icon_p = os.path.join(ROOT_DIR, "assets", "app_icon.png")
    c_icon, c_text = st.sidebar.columns([1, 3.2], vertical_alignment="center")
    with c_icon:
        if os.path.exists(icon_p):
            st.image(icon_p, width=44)
    with c_text:
        st.markdown(
            "<div class='sidebar-brand-container'>"
            "<div class='sidebar-logo-text'>ANDROME!DA<span class='tm'>™</span></div>"
            "<div class='sidebar-brand-sub'>Reef Vision Studio</div>"
            "</div>",
            unsafe_allow_html=True,
        )
    st.sidebar.divider()


def render_sidebar_footer():
    """Renders Hardware Acceleration neatly at the bottom of the sidebar."""
    if st.session_state.get("app_stage") != "upload":
        st.sidebar.divider()
    with st.sidebar.expander("Hardware Acceleration", icon=":material/memory:", expanded=False):
        current_pref = st.session_state.get("sel_device_pref", "auto")
        device_info = get_device_info(current_pref)
        active_provider = device_info.get("device", "CPUExecutionProvider")
        device_label = device_info.get("gpu_name", "CPU")
        mode = device_info.get("mode", "multithread_cpu")
        gpu_avail = device_info.get("gpu_available", False)
        cpu_count = device_info.get("cpu_count", 4)

        if device_info.get("device_type") == "gpu" or active_provider.startswith("CUDA"):
            st.success(f"**GPU Accelerator**: {device_label}")
        elif mode == "cpu":
            st.info(f"**Single-Threaded CPU**: {device_label}")
        else:
            st.info(f"**Multi-Threaded CPU**: {device_label}")

        def _format_dev(opt: str) -> str:
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
            format_func=_format_dev,
            help="Hardware priority: GPU -> Multi-Threaded CPU -> Single-Threaded CPU.",
        )
