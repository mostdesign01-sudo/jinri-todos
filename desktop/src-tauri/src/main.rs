// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// M1: a bare shell. The window (always-on-top, frameless, transparent) and the
// embedded overlay files are all declared in tauri.conf.json; there is no IPC
// yet. Collapse/expand (M2) and JSON storage (M3) will add commands here.
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running 今日待办 desktop shell");
}
