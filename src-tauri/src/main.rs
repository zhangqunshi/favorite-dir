// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod storage;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};

use storage::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main_hide_float(app);
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let state = AppState::new(app);
            app.manage(state);

            // Build system tray menu
            let tray_menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?,
                ],
            )?;

            // Build tray icon
            let icon = app
                .default_window_icon()
                .cloned()
                .unwrap_or_else(|| {
                    tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
                        .expect("failed to load tray icon fallback")
                });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        show_main_hide_float(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_main_hide_float(app);
                    }
                })
                .build(app)?;

            // Create float window (initially hidden)
            create_float_window(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_favorites,
            commands::add_favorite,
            commands::remove_favorite,
            commands::update_favorite,
            commands::reorder_favorites,
            commands::check_exists,
            commands::open_path,
            commands::get_config,
            commands::save_config,
            commands::hide_main_show_float,
            commands::show_main_hide_float,
            commands::quit_app,
            commands::get_float_position,
            commands::set_float_position,
            commands::save_float_position,
            commands::debug_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_float_window(app: &tauri::App) -> tauri::Result<()> {
    let config = {
        let state = app.state::<AppState>();
        let cfg = state.config.lock().map_err(|e| e.to_string()).ok();
        cfg.map(|c| c.clone())
    };

    let mut builder = WebviewWindowBuilder::new(app, "float", WebviewUrl::App("/float.html".into()))
        .title("")
        .inner_size(80.0, 80.0)
        .max_inner_size(80.0, 80.0)
        .min_inner_size(80.0, 80.0)
        .visible(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false);

    // Set position: use saved config, or default to bottom-right corner
    if let Some(ref cfg) = config {
        if let Some(ref pos) = cfg.float_pos {
            builder = builder.position(pos.x, pos.y);
        } else {
            let (default_x, default_y) = get_default_float_position(app);
            builder = builder.position(default_x, default_y);
        }
    } else {
        let (default_x, default_y) = get_default_float_position(app);
        builder = builder.position(default_x, default_y);
    }

    builder.build()?;
    Ok(())
}

fn get_default_float_position(app: &tauri::App) -> (f64, f64) {
    if let Some(main) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = main.primary_monitor() {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let logical_height = size.height as f64 / scale;
            let x = (size.width as f64) / scale - 100.0;
            let y = (logical_height - 80.0) / 2.0;
            return (x, y);
        }
    }
    (1600.0, 500.0)
}

fn show_main_hide_float(app: &tauri::AppHandle) {
    if let Some(float) = app.get_webview_window("float") {
        let _ = float.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}
