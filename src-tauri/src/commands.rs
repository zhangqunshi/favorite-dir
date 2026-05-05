use std::path::Path;

use tauri::Manager;

use crate::models::{AppConfig, FavoriteItem, ItemType};
use crate::storage::AppState;

#[tauri::command]
pub fn get_favorites(state: tauri::State<AppState>) -> Result<Vec<FavoriteItem>, String> {
    let favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    Ok(favorites.clone())
}

#[tauri::command]
pub fn add_favorite(state: tauri::State<AppState>, path: String) -> Result<FavoriteItem, String> {
    let mut favorites = state.favorites.lock().map_err(|e| e.to_string())?;

    // dedup
    if favorites.iter().any(|f| f.path == path) {
        return Err("该路径已存在".to_string());
    }

    let path_obj = Path::new(&path);
    let name = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&path)
        .to_string();

    let item_type = if path_obj.is_dir() {
        ItemType::Dir
    } else {
        ItemType::File
    };

    let order = favorites.iter().map(|f| f.order).max().unwrap_or(-1) + 1;
    let item = FavoriteItem::new(path, name, item_type, order);
    favorites.push(item.clone());

    drop(favorites);
    state.save_favorites()?;
    Ok(item)
}

#[tauri::command]
pub fn remove_favorite(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let mut favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    favorites.retain(|f| f.id != id);
    drop(favorites);
    state.save_favorites()
}

#[tauri::command]
pub fn update_favorite(state: tauri::State<AppState>, item: FavoriteItem) -> Result<(), String> {
    let mut favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    if let Some(idx) = favorites.iter().position(|f| f.id == item.id) {
        favorites[idx] = item;
    }
    drop(favorites);
    state.save_favorites()
}

#[tauri::command]
pub fn reorder_favorites(
    state: tauri::State<AppState>,
    items: Vec<FavoriteItem>,
) -> Result<(), String> {
    let mut favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    for (i, item) in items.iter().enumerate() {
        if let Some(idx) = favorites.iter().position(|f| f.id == item.id) {
            favorites[idx].order = i as i32;
        }
    }
    drop(favorites);
    state.save_favorites()
}

#[tauri::command]
pub fn check_exists(_state: tauri::State<AppState>, path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    let target = if cfg!(target_os = "windows") {
        path.replace('/', "\\")
    } else {
        path
    };
    std::process::Command::new(if cfg!(target_os = "windows") {
        "explorer"
    } else if cfg!(target_os = "macos") {
        "open"
    } else {
        "xdg-open"
    })
    .arg(&target)
    .spawn()
    .map_err(|e| format!("打开失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_config(state: tauri::State<AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub fn save_config(state: tauri::State<AppState>, config: AppConfig) -> Result<(), String> {
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    *current = config;
    drop(current);
    state.save_config()
}

#[tauri::command]
pub fn hide_main_show_float(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }

    let config = state.config.lock().map_err(|e| e.to_string())?;
    let float_enabled = config.float_window_enabled.unwrap_or(true);
    drop(config);

    if float_enabled {
        if let Some(float) = app.get_webview_window("float") {
            let _ = float.show();
            let _ = float.set_focus();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn show_main_hide_float(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(float) = app.get_webview_window("float") {
        let _ = float.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn get_float_position(app: tauri::AppHandle) -> Result<crate::models::Position, String> {
    if let Some(window) = app.get_webview_window("float") {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        Ok(crate::models::Position {
            x: (pos.x as f64) / scale,
            y: (pos.y as f64) / scale,
        })
    } else {
        Err("Float window not found".to_string())
    }
}

#[tauri::command]
pub fn set_float_position(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let pos = tauri::LogicalPosition::new(x, y);
        window.set_position(pos).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn save_float_position(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.float_pos = Some(crate::models::Position {
            x: (pos.x as f64) / scale,
            y: (pos.y as f64) / scale,
        });
        drop(config);
        state.save_config()?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_favorites(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&*favorites).map_err(|e| e.to_string())?;
    drop(favorites);
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_favorites(state: tauri::State<AppState>, path: String) -> Result<Vec<FavoriteItem>, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let imported: Vec<FavoriteItem> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut favorites = state.favorites.lock().map_err(|e| e.to_string())?;
    let mut next_order = favorites.iter().map(|f| f.order).max().unwrap_or(-1) + 1;

    for mut item in imported {
        if !favorites.iter().any(|f| f.path == item.path) {
            item.id = uuid::Uuid::new_v4().to_string();
            item.order = next_order;
            next_order += 1;
            favorites.push(item);
        }
    }

    let result = favorites.clone();
    drop(favorites);
    state.save_favorites()?;
    Ok(result)
}

#[tauri::command]
pub fn debug_log(message: String) {
    use std::io::Write;
    if let Ok(home) = std::env::var("HOME") {
        let log_path = std::path::Path::new(&home).join("favorite-dir-debug.log");
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let _ = writeln!(file, "{}", message);
        }
    }
}
