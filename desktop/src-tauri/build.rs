fn main() {
    // tauri-build reads tauri.conf.json, embeds the `frontendDist` file list
    // (the overlay files at the repo root) and emits rerun-if-changed for them.
    // Listing the invoke commands autogenerates `allow-set-collapsed` and
    // `allow-is-collapsed`, which capabilities/default.json grants to the webview.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["set_collapsed", "is_collapsed"]),
        ),
    )
    .expect("failed to run tauri-build");
}
