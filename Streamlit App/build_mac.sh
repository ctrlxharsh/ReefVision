#!/bin/bash
set -e

# Change to repository root
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================="
echo "  Andromeida Reef Vision Studio — macOS 1-Click Builder  "
echo "========================================================="

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "==> Python 3 not found. Checking for Homebrew..."
    if command -v brew &> /dev/null; then
        echo "==> Installing Python 3 via Homebrew..."
        brew install python@3.12
    else
        echo "Error: Python 3 is required. Please install Python 3.10+ or run 'xcode-select --install'."
        exit 1
    fi
fi

echo "==> Python detected: $(python3 --version)"

# 2. Virtual environment setup
if [ ! -d ".venv" ]; then
    echo "==> Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# 3. Upgrade pip and install requirements
echo "==> Ensuring pip is available..."
python -m ensurepip --upgrade --quiet 2>/dev/null || true

echo "==> Installing / updating dependencies..."
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt --quiet

# 4. Ensure application icon exists
if [ ! -f "assets/app_icon.icns" ] && [ -d "assets/app_icon.iconset" ]; then
    echo "==> Generating app_icon.icns..."
    iconutil -c icns assets/app_icon.iconset -o assets/app_icon.icns
fi

# 5. Compile application with PyInstaller
echo "==> Building native macOS application with PyInstaller..."
python -m PyInstaller --clean -y coralseg.spec

# 6. Package into Drag-and-Drop DMG installer
echo "==> Packaging into Drag-and-Drop DMG..."
APP_PATH="dist/AndromeidaReefVision.app"
if [ ! -d "$APP_PATH" ]; then
    echo "Error: Failed to build $APP_PATH"
    exit 1
fi

STAGING_DIR="dist/dmg_staging"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

cp -R "$APP_PATH" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

DMG_PATH="dist/AndromeidaReefVision-macOS.dmg"
rm -f "$DMG_PATH"

hdiutil create \
    -volname "Andromeida Reef Vision" \
    -srcfolder "$STAGING_DIR" \
    -ov \
    -format UDZO \
    "$DMG_PATH"

rm -rf "$STAGING_DIR"

# Clean up intermediate .app and build artifacts so ONLY the .dmg installer remains in dist/
rm -rf "$APP_PATH"
rm -rf "dist/AndromeidaReefVision"

echo "========================================================="
echo "  BUILD SUCCESSFUL! 🎉"
echo "  Installer: $DMG_PATH ($(du -sh "$DMG_PATH" | cut -f1))"
echo "========================================================="

# 7. Auto-open the DMG for instant drag-and-drop installation
echo "==> Opening DMG installer for installation..."
open "$DMG_PATH"
