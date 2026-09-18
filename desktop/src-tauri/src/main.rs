// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! M2 shell: the window starts as a short "capsule" and grows into the full
//! overlay on demand. Rust owns the collapsed/expanded state and the native
//! window size; the webview only asks for a state and mirrors whatever the
//! `jinri-collapsed` event tells it.

use std::sync::Mutex;

use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, State, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

const MAIN_WINDOW: &str = "main";
const COLLAPSED_EVENT: &str = "jinri-collapsed";

/// Size of the collapsed capsule (matches `.capsule` in ui/desktop.css).
const CAPSULE_SIZE: LogicalSize<f64> = LogicalSize {
    width: 240.0,
    height: 44.0,
};
const EXPANDED_DEFAULT: LogicalSize<f64> = LogicalSize {
    width: 380.0,
    height: 560.0,
};
const EXPANDED_MIN: LogicalSize<f64> = LogicalSize {
    width: 320.0,
    height: 240.0,
};
const EXPANDED_MAX: LogicalSize<f64> = LogicalSize {
    width: 480.0,
    height: 2000.0,
};

/// ⌥Space on macOS (Alt+Space elsewhere). Change here if it clashes with an IME
/// or another app; the README documents this spot.
const TOGGLE_MODIFIERS: Modifiers = Modifiers::ALT;
const TOGGLE_KEY: Code = Code::Space;

struct Shell {
    collapsed: Mutex<bool>,
    /// Last size the user had while expanded, restored on the next expand.
    expanded_size: Mutex<LogicalSize<f64>>,
}

impl Default for Shell {
    fn default() -> Self {
        Self {
            collapsed: Mutex::new(true),
            expanded_size: Mutex::new(EXPANDED_DEFAULT),
        }
    }
}

fn apply_collapsed(window: &WebviewWindow, shell: &Shell, collapsed: bool) -> tauri::Result<()> {
    let mut current = shell.collapsed.lock().unwrap();
    if *current != collapsed {
        if collapsed {
            let scale = window.scale_factor()?;
            let size = window.inner_size()?.to_logical::<f64>(scale);
            if size.width >= EXPANDED_MIN.width && size.height >= EXPANDED_MIN.height {
                *shell.expanded_size.lock().unwrap() = size;
            }
            // Pin min == max instead of `set_resizable(false)`: GTK sizes a
            // non-resizable window to the webview's natural (~200px) height.
            window.set_min_size(Some(CAPSULE_SIZE))?;
            window.set_max_size(Some(CAPSULE_SIZE))?;
            window.set_size(CAPSULE_SIZE)?;
        } else {
            let size = *shell.expanded_size.lock().unwrap();
            window.set_min_size(Some(EXPANDED_MIN))?;
            window.set_max_size(Some(EXPANDED_MAX))?;
            window.set_size(size)?;
            keep_on_screen(window)?;
            window.set_focus()?;
        }
        *current = collapsed;
    }
    drop(current);
    window.emit(COLLAPSED_EVENT, collapsed)?;
    Ok(())
}

/// Growing from a capsule parked near the bottom/right edge would push the
/// list off-screen; nudge the window back inside the monitor's work area.
fn keep_on_screen(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };
    let area = monitor.work_area();
    let pos = window.outer_position()?;
    let size = window.outer_size()?;
    let max_x = area.position.x + area.size.width as i32 - size.width as i32;
    let max_y = area.position.y + area.size.height as i32 - size.height as i32;
    let x = pos.x.min(max_x).max(area.position.x);
    let y = pos.y.min(max_y).max(area.position.y);
    if (x, y) != (pos.x, pos.y) {
        window.set_position(PhysicalPosition { x, y })?;
    }
    Ok(())
}

fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let shell = app.state::<Shell>();
    let next = !*shell.collapsed.lock().unwrap();
    if let Err(err) = apply_collapsed(&window, &shell, next) {
        eprintln!("jinri: toggle failed: {err}");
    }
}

#[tauri::command]
fn set_collapsed(
    window: WebviewWindow,
    shell: State<'_, Shell>,
    collapsed: bool,
) -> Result<(), String> {
    apply_collapsed(&window, &shell, collapsed).map_err(|e| e.to_string())
}

#[tauri::command]
fn is_collapsed(shell: State<'_, Shell>) -> bool {
    *shell.collapsed.lock().unwrap()
}

/// Desktop-only UI layer injected before the page's own scripts run. Nothing in
/// the shared PWA files references it, so GitHub Pages stays untouched.
fn desktop_init_script() -> String {
    let css = serde_json::to_string(include_str!("../../ui/desktop.css"))
        .expect("desktop.css is valid UTF-8");
    format!(
        "window.__JINRI_DESKTOP_CSS__ = {css};\n{}",
        include_str!("../../ui/desktop.js")
    )
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Shell::default())
        .invoke_handler(tauri::generate_handler![set_collapsed, is_collapsed])
        .setup(|app| {
            let config = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == MAIN_WINDOW)
                .cloned()
                .expect("tauri.conf.json declares the `main` window");
            let window = WebviewWindowBuilder::from_config(app.handle(), &config)?
                .initialization_script(desktop_init_script())
                .build()?;

            // The window-state plugin persists on RunEvent::Exit, but when the
            // exit is caused by this window closing the handle is already gone
            // and the write is skipped. Save while the window is still alive.
            let handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    if let Err(err) = handle.save_window_state(StateFlags::POSITION) {
                        eprintln!("jinri: could not save window position: {err}");
                    }
                }
            });

            let shortcut = Shortcut::new(Some(TOGGLE_MODIFIERS), TOGGLE_KEY);
            if let Err(err) = app.global_shortcut().on_shortcut(shortcut, |app, _, event| {
                if event.state() == ShortcutState::Pressed {
                    toggle(app);
                }
            }) {
                // Another app may own the key; the capsule still works by click.
                eprintln!("jinri: could not register ⌥Space: {err}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running 今日待办 desktop shell");
}
