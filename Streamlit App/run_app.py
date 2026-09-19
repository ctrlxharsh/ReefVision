"""
Andromeida Reef Vision Studio - Standalone Desktop Launcher
Runs Streamlit on an internal localhost port and embeds it inside a native desktop window (pywebview).
No external web browser is opened.
"""

import os
import sys
import time
import socket
import threading
import urllib.request
import multiprocessing
from pathlib import Path


def get_base_dir() -> Path:
    """Returns the base directory containing the application and assets."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def find_free_port() -> int:
    """Finds an unused ephemeral port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_for_server(url: str, timeout: float = 20.0) -> bool:
    """Polls the Streamlit health endpoint until the server is ready."""
    start = time.time()
    health_url = f"{url.rstrip('/')}/_stcore/health"
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(health_url, timeout=1) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False


def start_streamlit_server(app_script: str, port: int):
    """Executes Streamlit server inside a background thread with signal handler bypass."""
    import streamlit.web.bootstrap as bootstrap
    import streamlit.web.cli as stcli

    # Disable signal handlers inside background worker thread
    bootstrap._set_up_signal_handler = lambda server: None

    cli_args = [
        "streamlit",
        "run",
        app_script,
        "--global.developmentMode=false",
        "--server.headless=true",
        "--server.address=127.0.0.1",
        f"--server.port={port}",
    ]
    sys.argv = cli_args
    stcli.main()


def patch_cocoa_download_handler():
    """
    On macOS (WebKit/Cocoa), pywebview's DownloadDelegate invokes the WKDownload
    completionHandler directly as a Python callable: completionHandler(url).
    Because PyObjC lacks a block signature for this native WebKit block, it throws:
        TypeError: cannot call block without a signature
    This patch wraps the completionHandler invocation using the block's native C function pointer
    via ctypes, enabling seamless native Save As dialogs for Streamlit file downloads (PNG, CSV, JSON).
    """
    if sys.platform != "darwin":
        return

    try:
        import ctypes
        import objc
        import AppKit
        import Foundation
        from webview.platforms import cocoa

        def _safe_call_block(block_obj, url_obj):
            if block_obj is None:
                return
            block_ptr = objc.pyobjc_id(block_obj)
            # In Apple Blocks ABI, invoke function pointer is at offset 16 (isa: 8 bytes, flags: 4, reserved: 4)
            invoke_ptr = ctypes.c_void_p.from_address(block_ptr + 16).value
            func = ctypes.CFUNCTYPE(None, ctypes.c_void_p, ctypes.c_void_p)(invoke_ptr)
            url_ptr = objc.pyobjc_id(url_obj) if url_obj is not None else 0
            func(block_ptr, url_ptr)

        def _patched_decide_destination(
            self, download, decideDestinationUsingResponse, suggestedFilename, completionHandler
        ):
            save_dlg = AppKit.NSSavePanel.savePanel()
            save_dlg.setTitle_("Save File")
            directory = Foundation.NSSearchPathForDirectoriesInDomains(
                Foundation.NSDownloadsDirectory, Foundation.NSUserDomainMask, True
            )[0]
            save_dlg.setDirectoryURL_(Foundation.NSURL.fileURLWithPath_(directory))
            if suggestedFilename:
                save_dlg.setNameFieldStringValue_(suggestedFilename)

            AppKit.NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
            if save_dlg.runModal() == AppKit.NSFileHandlingPanelOKButton:
                filename = (
                    str(save_dlg.URL().path())
                    if hasattr(save_dlg, "URL") and save_dlg.URL()
                    else str(save_dlg.filename())
                )
                if os.path.exists(filename):
                    try:
                        os.remove(filename)
                    except OSError:
                        pass
                url = Foundation.NSURL.fileURLWithPath_(filename)
                _safe_call_block(completionHandler, url)
            else:
                _safe_call_block(completionHandler, None)

        cocoa.BrowserView.DownloadDelegate.download_decideDestinationUsingResponse_suggestedFilename_completionHandler_ = (
            _patched_decide_destination
        )
    except Exception as e:
        print(f"Warning: Could not patch pywebview Cocoa download handler: {e}", file=sys.stderr)


def main():
    # Freeze support is mandatory for PyInstaller on Windows & macOS
    multiprocessing.freeze_support()

    base_dir = get_base_dir()
    app_script = str(base_dir / "app.py")

    # Ensure base_dir is on sys.path
    if str(base_dir) not in sys.path:
        sys.path.insert(0, str(base_dir))

    # Support optional --browser flag for developers / headless servers
    if "--browser" in sys.argv:
        import streamlit.web.cli as stcli
        cli_args = [
            "streamlit",
            "run",
            app_script,
            "--global.developmentMode=false",
            "--server.headless=false",
        ]
        filtered_argv = [a for a in sys.argv if a != "--browser"]
        if len(filtered_argv) > 1:
            cli_args.extend(filtered_argv[1:])
        sys.argv = cli_args
        sys.exit(stcli.main())

    # Default: Native Standalone Desktop Window
    port = find_free_port()
    server_url = f"http://127.0.0.1:{port}"

    server_thread = threading.Thread(
        target=start_streamlit_server,
        args=(app_script, port),
        daemon=True,
    )
    server_thread.start()

    if not wait_for_server(server_url, timeout=20.0):
        print(f"Error: Failed to connect to Streamlit runtime at {server_url}", file=sys.stderr)
        sys.exit(1)

    # Launch native desktop webview
    import webview

    # Enable native file downloads across macOS (WKWebView) and Windows (WebView2)
    webview.settings["ALLOW_DOWNLOADS"] = True
    patch_cocoa_download_handler()

    window = webview.create_window(
        title="Andromeida Reef Vision Studio",
        url=server_url,
        width=1420,
        height=920,
        min_size=(1080, 720),
        confirm_close=False,
        text_select=True,
    )

    webview.start()

    # Once window closes, exit process cleanly
    os._exit(0)


if __name__ == "__main__":
    main()
