use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct PageConfig {
    pub width: f64,
    pub height: f64,
    pub unit: String,
    pub margin_top: f64,
    pub margin_bottom: f64,
    pub margin_left: f64,
    pub margin_right: f64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn export_document(content: String, format: String) -> Result<(), String> {
    use tempfile::Builder;

    let temp_dir = Builder::new()
        .prefix("metamark_")
        .tempdir()
        .map_err(|e| e.to_string())?;
    let md_path = temp_dir.path().join("input.md");
    fs::write(&md_path, &content).map_err(|e| e.to_string())?;

    let output_ext = match format.as_str() {
        "pdf" => "pdf",
        "html" => "html",
        "word" | "docx" => "docx",
        "md" => "md",
        _ => "pdf",
    };
    let output_path = temp_dir.path().join(format!("output.{}", output_ext));

    let mut cmd = Command::new("pandoc");
    cmd.arg(&md_path).arg("-o").arg(&output_path);

    if format == "pdf" {
        cmd.arg("--pdf-engine=wkhtmltopdf");
    }

    let status = cmd.status().map_err(|e| format!("Pandoc not found: {}", e))?;

    if !status.success() {
        return Err("Pandoc conversion failed".into());
    }

    let data = fs::read(&output_path).map_err(|e| e.to_string())?;
    let _data_len = data.len();

    Ok(())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
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
            window
                .set_title("MetaMark - Markdown Editor")
                .ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            export_document,
            read_file,
            write_file,
            list_directory,
            delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
