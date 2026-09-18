fn main() {
    // tauri-build reads tauri.conf.json, embeds the `frontendDist` file list
    // (the overlay files at the repo root) and emits rerun-if-changed for them.
    tauri_build::build();
}
