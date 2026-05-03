use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::models::{AppConfig, FavoriteItem};

pub struct AppState {
    pub data_dir: PathBuf,
    pub favorites: Mutex<Vec<FavoriteItem>>,
    pub config: Mutex<AppConfig>,
}

impl AppState {
    pub fn new(app: &tauri::App) -> Self {
        let data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
            PathBuf::from(".favorite-dir")
        });

        let _ = fs::create_dir_all(&data_dir);

        let favorites = load_json::<Vec<FavoriteItem>>(&data_dir.join("data.json")).unwrap_or_default();
        let config = load_json::<AppConfig>(&data_dir.join("config.json")).unwrap_or_default();

        Self {
            data_dir,
            favorites: Mutex::new(favorites),
            config: Mutex::new(config),
        }
    }

    pub fn save_favorites(&self) -> Result<(), String> {
        let favorites = self.favorites.lock().map_err(|e| e.to_string())?;
        save_json(&self.data_dir.join("data.json"), &*favorites)
    }

    pub fn save_config(&self) -> Result<(), String> {
        let config = self.config.lock().map_err(|e| e.to_string())?;
        save_json(&self.data_dir.join("config.json"), &*config)
    }
}

fn load_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_json<T: Serialize>(path: &PathBuf, data: &T) -> Result<(), String> {
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}
