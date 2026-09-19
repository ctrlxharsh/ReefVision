# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Specification for Andromeida Reef Vision Studio
Ultra-compact, pruned cross-platform build (macOS & Windows) without model weights.
"""

import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, copy_metadata, collect_dynamic_libs

block_cipher = None

# Base repository root directory
ROOT_DIR = os.path.abspath(os.path.dirname(SPEC))

# 1. Collect required framework data files & native binaries
binaries = []
binaries += collect_dynamic_libs('onnxruntime')
try:
    binaries += collect_dynamic_libs('pyarrow')
except Exception:
    pass

datas = []
datas += collect_data_files('streamlit')
datas += collect_data_files('onnxruntime')
datas += collect_data_files('webview')
try:
    datas += collect_data_files('pyarrow')
except Exception:
    pass

# 2. Collect package metadata for dynamic introspection
metadata_pkgs = [
    'streamlit',
    'onnxruntime',
    'pyarrow',
    'huggingface_hub',
    'pywebview',
    'tqdm',
    'filelock',
    'numpy',
    'regex',
    'requests',
    'packaging',
]
for pkg in metadata_pkgs:
    try:
        datas += copy_metadata(pkg)
    except Exception:
        pass

# 3. Bundle local project source & assets
local_datas = [
    (os.path.join(ROOT_DIR, 'app.py'), '.'),
    (os.path.join(ROOT_DIR, 'coral_engine.py'), '.'),
    (os.path.join(ROOT_DIR, 'core'), 'core'),
    (os.path.join(ROOT_DIR, 'ui'), 'ui'),
    (os.path.join(ROOT_DIR, 'style.css'), '.'),
    (os.path.join(ROOT_DIR, '.streamlit'), '.streamlit'),
]

if os.path.isdir(os.path.join(ROOT_DIR, 'assets')):
    local_datas.append((os.path.join(ROOT_DIR, 'assets'), 'assets'))
if os.path.isfile(os.path.join(ROOT_DIR, 'ANDROMEIDA logo.png')):
    local_datas.append((os.path.join(ROOT_DIR, 'ANDROMEIDA logo.png'), '.'))
if os.path.isdir(os.path.join(ROOT_DIR, 'demo_images')):
    local_datas.append((os.path.join(ROOT_DIR, 'demo_images'), 'demo_images'))

datas += local_datas

# 4. Strict Sanitization: Filter out all model weights, C++ headers, and tests
def sanitize_datas(data_list):
    clean = []
    for src, dst in data_list:
        src_lower = str(src).lower()
        # Drop model checkpoints (downloaded post-launch to user cache)
        if any(src_lower.endswith(ext) for ext in ('.pth', '.pt', '.bin', '.safetensors', '.onnx', '.h5', '.ckpt')):
            continue
        # Drop C/C++ development headers (unneeded for runtime execution)
        if any(src_lower.endswith(ext) for ext in ('.h', '.hpp', '.c', '.cpp', '.cu')):
            continue
        # Drop test folders and docs
        parts = os.path.normpath(src_lower).split(os.sep)
        if 'models' in parts or 'tests' in parts or 'testing' in parts:
            continue
        clean.append((src, dst))
    return clean

datas = sanitize_datas(datas)

# 5. Aggressive bloat exclusion list (>1.5GB saved by eliminating PyTorch & heavy frameworks)
excludes = [
    # Heavy machine learning frameworks eliminated via ONNX Runtime migration
    'torch',
    'torchvision',
    'ultralytics',
    'open_clip',
    'open_clip_torch',
    'timm',
    'segment_anything',
    'triton',
    # Heavy unimported data frameworks
    'polars',
    '_polars_runtime_32',
    'transformers',
    'sympy',
    'datasets',
    'matplotlib',
    'pydeck',
    'altair',
    # Exclude OpenCV (replaced with pure Pillow & NumPy)
    'cv2',
    'opencv',
    'opencv-python',
    'opencv-python-headless',
    # GUI & test suites
    'tkinter',
    'tcl',
    'scipy.tests',
    'numpy.tests',
    'pandas.tests',
    'pytest',
    'unittest',
    'IPython',
    'notebook',
    'docutils',
]

# 6. Resolve Application Icons
app_icon = os.path.join(ROOT_DIR, 'assets', 'app_icon.icns' if sys.platform == 'darwin' else 'app_icon.ico')
if not os.path.isfile(app_icon):
    app_icon = None

# 7. Explicit hidden imports to guarantee module resolution
hiddenimports = [
    'coral_engine',
    'core',
    'core.device',
    'core.models',
    'core.segmentation',
    'core.taxonomy',
    'core.visualization',
    'core.export',
    'ui',
    'ui.components',
    'ui.upload',
    'ui.analysis',
    'onnxruntime',
    'onnxruntime.capi._pybind_state',
    'webview',
    'webview.platforms.cocoa',
    'webview.platforms.edgechromium',
    'webview.platforms.winforms',
    'streamlit',
    'streamlit.web.cli',
    'streamlit.runtime.scriptrunner.magic_funcs',
    'streamlit.components.v1',
    'pycocotools',
    'pycocotools._mask',
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',
    'PIL.ImageFont',
    'pandas',
    'pyarrow',
    'pyarrow.vendored.version',
    'numpy',
    'objc',
    'AppKit',
    'Foundation',
    'huggingface_hub',
]

a = Analysis(
    ['run_app.py'],
    pathex=[ROOT_DIR],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Toggle between --onefile and --onedir via ONEFILE=1 environment variable
is_onefile = os.environ.get('ONEFILE', '0').lower() in ('1', 'true', 'yes')

if is_onefile:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        [],
        name='AndromeidaReefVision',
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        upx_exclude=[],
        runtime_tmpdir=None,
        console=False,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=app_icon,
    )
else:
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name='AndromeidaReefVision',
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        console=False,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=app_icon,
    )

    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name='AndromeidaReefVision',
    )

    # On macOS, package into a native .app bundle with full icon & metadata
    if sys.platform == 'darwin':
        app = BUNDLE(
            coll,
            name='AndromeidaReefVision.app',
            icon=app_icon,
            bundle_identifier='com.andromeida.reefvision',
            info_plist={
                'NSHighResolutionCapable': 'True',
                'LSBackgroundOnly': 'False',
                'CFBundleName': 'Andromeida Reef Vision',
                'CFBundleDisplayName': 'Andromeida Reef Vision',
                'CFBundleIdentifier': 'com.andromeida.reefvision',
                'CFBundleVersion': '1.0.0',
                'CFBundleShortVersionString': '1.0.0',
                'CFBundleIconFile': 'app_icon.icns',
                'NSRequiresAquaSystemAppearance': 'False',
            },
        )
