use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

fn is_backend_running() -> bool {
    TcpStream::connect_timeout(
        &"127.0.0.1:8000".parse().unwrap(),
        Duration::from_millis(300),
    )
    .is_ok()
}

fn get_project_root() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if dir.ends_with("src-tauri") {
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        }
    }
    dir
}

fn find_python(root: &PathBuf) -> PathBuf {
    let candidates = [
        root.join("../Streamlit App/.venv/bin/python3"),
        root.join(".venv/bin/python3"),
        root.join("../.venv/bin/python3"),
        PathBuf::from("/Users/harsh/Code/auv/coralseg/Streamlit App/.venv/bin/python3"),
    ];
    for c in &candidates {
        if c.exists() {
            return c.clone();
        }
    }
    PathBuf::from("python3")
}

fn spawn_backend(root: &PathBuf) -> Option<Child> {
    let server_script = root.join("backend/run_server.py");
    let python_bin = find_python(root);

    println!("[Tauri] Project root: {:?}", root);
    println!("[Tauri] Using Python: {:?}", python_bin);
    println!("[Tauri] Server script: {:?}", server_script);

    let child = Command::new(&python_bin)
        .current_dir(root)
        .arg(&server_script)
        .arg("--port")
        .arg("8000")
        .spawn();

    match child {
        Ok(c) => {
            println!("[Tauri] Backend spawned successfully with PID: {}", c.id());
            Some(c)
        }
        Err(e) => {
            eprintln!("[Tauri] Failed to spawn backend: {}", e);
            None
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let root = get_project_root();
            if !is_backend_running() {
                if let Some(c) = spawn_backend(&root) {
                    app.manage(BackendProcess(Mutex::new(Some(c))));
                }
            } else {
                app.manage(BackendProcess(Mutex::new(None)));
                println!("[Tauri] Backend is already running on port 8000.");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<BackendProcess>() {
                    if let Ok(mut lock) = state.0.lock() {
                        if let Some(mut child) = lock.take() {
                            println!("[Tauri] Terminating backend process...");
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
