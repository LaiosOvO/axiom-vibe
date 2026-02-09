// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Axiom Desktop 应用主入口
/// 
/// 这个应用创建一个 WebView 窗口，连接到本地运行的 Axiom 服务器 (http://localhost:4096)
/// Axiom 服务器通过 `axiom serve` 命令启动

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
