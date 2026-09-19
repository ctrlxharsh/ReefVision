"""
Andromeida Reef Vision Studio
Autonomous multi-model segmentation, taxonomy, and condition assessment.
"""

import os
import streamlit as st

from core import (
    get_optimal_device,
    load_coralscop_model,
    load_bioclip_model,
    load_bleaching_model,
)
from ui import (
    render_sidebar_header,
    render_sidebar_footer,
    render_upload_page,
    render_analysis_page,
)

# 1. Page Configuration
_icon_path = os.path.join(os.path.dirname(__file__), "assets", "app_icon.png")
_page_icon = _icon_path if os.path.exists(_icon_path) else ":material/waves:"

st.set_page_config(
    page_title="Andromeida Reef Vision Studio",
    page_icon=_page_icon,
    layout="wide",
    initial_sidebar_state="expanded",
)


# 2. Global Styling
def load_css(css_file: str = "style.css"):
    css_path = os.path.join(os.path.dirname(__file__), css_file)
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

load_css("style.css")


# 3. Cached Resource Loaders
@st.cache_resource(show_spinner=False)
def get_cached_model(device_preference: str = "auto", _cache_v: int = 2):
    """Loads and caches the CoralSCOP SAM model in memory."""
    device = get_optimal_device(device_preference)
    return load_coralscop_model(device=device_preference), device


@st.cache_resource(show_spinner=False)
def get_cached_bioclip_model(device_preference: str = "auto"):
    """Loads and caches the ReefNet/finetuned-bioclip model in memory."""
    return load_bioclip_model(device=device_preference)


@st.cache_resource(show_spinner=False)
def get_cached_bleaching_model(device_preference: str = "auto"):
    """Loads and caches the NMFS-OSI NOAA coral bleaching classifier."""
    return load_bleaching_model(device=device_preference)


# 4. State Management
def initialize_session_state():
    """Ensures necessary session state variables exist."""
    if "app_stage" not in st.session_state:
        st.session_state["app_stage"] = "upload"
    if "loaded_images" not in st.session_state:
        st.session_state["loaded_images"] = {}
    if "selected_img_idx" not in st.session_state:
        st.session_state["selected_img_idx"] = 0
    if "models_loaded" not in st.session_state:
        st.session_state["models_loaded"] = False


# 5. Application Lifecycle & Routing
def main():
    initialize_session_state()

    device_pref = st.session_state.get("sel_device_pref", "auto")

    if st.session_state["app_stage"] == "upload":
        render_upload_page()
    else:
        render_sidebar_header()

        with st.spinner("Preparing Vision Engines (Segmentation Model, Taxonomical Model, Bleach Detection Model)..."):
            try:
                model, _ = get_cached_model(device_pref)
                bioclip_bundle = get_cached_bioclip_model(device_pref)
                bleaching_model = get_cached_bleaching_model(device_pref)
                st.session_state["models_loaded"] = True
            except Exception as e:
                st.error(f"Failed to load AI models: {e}")
                return

        render_analysis_page(model, bioclip_bundle, bleaching_model)
        render_sidebar_footer()


if __name__ == "__main__":
    main()
