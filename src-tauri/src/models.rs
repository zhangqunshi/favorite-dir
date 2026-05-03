use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FavoriteItem {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: ItemType,
    pub pinned: bool,
    pub order: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    File,
    Dir,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub animal: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub float_pos: Option<Position>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub main_window_size: Option<WindowSize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: f64,
    pub height: f64,
}

impl FavoriteItem {
    pub fn new(path: String, name: String, item_type: ItemType, order: i32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            path,
            item_type,
            pinned: false,
            order,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            animal: "dog".to_string(),
            float_pos: None,
            main_window_size: None,
        }
    }
}
