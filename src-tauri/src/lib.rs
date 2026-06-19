use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map_err(|e| e.to_string())?.is_dir();
        if name.starts_with('.') {
            continue;
        }
        files.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
        });
    }
    files.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(files)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

fn pandoc_to_format(format: &str) -> &str {
    match format {
        "pdf" => "pdf",
        "html" => "html",
        "docx" => "docx",
        "odt" => "odt",
        "rtf" => "rtf",
        "epub" => "epub",
        "latex" => "latex",
        "md" => "markdown",
        _ => "html",
    }
}

#[tauri::command]
fn export_with_pandoc(content: String, path: String, format: String, pandoc_path: Option<String>, extra_args: Vec<String>) -> Result<(), String> {
    use tempfile::Builder;
    let temp_dir = Builder::new().prefix("metamark_").tempdir().map_err(|e| e.to_string())?;
    let md_path = temp_dir.path().join("input.md");
    fs::write(&md_path, &content).map_err(|e| e.to_string())?;

    let pandoc = pandoc_path.unwrap_or_else(|| "pandoc".to_string());
    let mut cmd = Command::new(&pandoc);
    cmd.arg(&md_path)
        .arg("-o")
        .arg(&path)
        .arg("--from")
        .arg("markdown")
        .arg("--to")
        .arg(pandoc_to_format(&format));

    for arg in &extra_args {
        if !arg.trim().is_empty() {
            cmd.arg(arg.trim());
        }
    }

    let status = cmd.status()
        .map_err(|e| format!("Pandoc not found at '{}': {}. Please install pandoc to export.", pandoc, e))?;

    if !status.success() {
        return Err(format!("Pandoc conversion to {} failed.", format));
    }
    Ok(())
}

#[tauri::command]
async fn print_html(_html: String) -> Result<(), String> {
    // Use Tauri's print API via JavaScript
    Ok(())
}

#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "MetaMark",
        "version": "0.1.0",
        "description": "A Typora-like Markdown editor built with Tauri 2",
        "author": "MetaMark Team",
        "tauri_version": "2.x",
        "rust_version": "1.85+"
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("MetaMark - Markdown Editor").ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            list_directory,
            delete_file,
            export_with_pandoc,
            print_html,
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
