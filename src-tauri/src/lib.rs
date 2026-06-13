mod audio;
mod dict;
mod history;
mod settings;
mod state;
mod windows;

use state::AppState;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn register_hotkey<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    hotkey: &str,
) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(hotkey, move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                windows::reveal_main_window(app);
            }
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lookup_word(
    state: tauri::State<'_, AppState>,
    word: String,
    source: Option<dict::DictSource>,
) -> Result<dict::WordEntry, String> {
    let source = source.unwrap_or_else(|| {
        let settings = state.settings.lock().unwrap();
        settings.get().dict_source.clone()
    });
    let cache_key = dict::normalize::cache_key(&word);
    // Check cache first
    {
        let hist = state.history.lock().unwrap();
        if let Some(cached) = hist.get_cached(&cache_key, &source) {
            return Ok(cached);
        }
    }
    // Fetch from source
    let result = state
        .clients
        .lookup(source.clone(), &word)
        .await
        .map_err(|e| e.to_string())?;
    // Save to history
    {
        let hist = state.history.lock().unwrap();
        hist.upsert_with_cache_key(&cache_key, &result);
    }
    Ok(result)
}

#[tauri::command]
async fn play_audio(state: tauri::State<'_, AppState>, url: String) -> Result<(), String> {
    let client = state.clients.http_client().clone();
    let bytes = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    state.audio_player.play_bytes(&bytes)
}

#[tauri::command]
fn get_available_sources(state: tauri::State<'_, AppState>) -> Vec<dict::DictSource> {
    state.clients.available_sources()
}

#[tauri::command]
fn get_history(state: tauri::State<'_, AppState>) -> Result<Vec<history::HistoryItem>, String> {
    let hist = state.history.lock().unwrap();
    hist.list().map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_history(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let hist = state.history.lock().unwrap();
    hist.clear().map_err(|e| e.to_string())
}

#[tauri::command]
fn export_history(
    state: tauri::State<'_, AppState>,
    format: history::ExportFormat,
    path: String,
) -> Result<(), String> {
    let hist = state.history.lock().unwrap();
    hist.export(&format, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> settings::Settings {
    let s = state.settings.lock().unwrap();
    let mut settings = s.get().clone();
    // Normalize dictSource against available sources
    let sources = state.clients.available_sources();
    if !sources.contains(&settings.dict_source) {
        settings.dict_source = sources
            .first()
            .cloned()
            .unwrap_or(dict::DictSource::FreeDictionary);
    }
    settings
}

#[tauri::command]
fn update_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    settings: settings::Settings,
) -> Result<(), String> {
    let current_hotkey = {
        let hotkey = state.current_hotkey.lock().unwrap();
        hotkey.clone()
    };

    if settings.global_hotkey != current_hotkey {
        register_hotkey(&app, &settings.global_hotkey)?;
        if !current_hotkey.is_empty() {
            app.global_shortcut()
                .unregister(current_hotkey.as_str())
                .map_err(|e| e.to_string())?;
        }
        let mut hotkey = state.current_hotkey.lock().unwrap();
        *hotkey = settings.global_hotkey.clone();
    }

    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(settings.always_on_top)
            .map_err(|e| e.to_string())?;
    }

    let mut s = state.settings.lock().unwrap();
    s.set(settings.clone()).map_err(|e| e.to_string())?;
    app.emit("settings:updated", settings)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data).ok();

            let settings_store = settings::SettingsStore::new(&app_data);
            let initial_settings = settings_store.get().clone();
            let history_store =
                history::HistoryStore::new(&app_data).expect("failed to init history db");
            let clients = dict::DictClients::new();
            let audio_player = audio::AudioPlayer::new();
            let initial_hotkey = initial_settings.global_hotkey.clone();

            let app_state = AppState {
                clients,
                history: std::sync::Mutex::new(history_store),
                settings: std::sync::Mutex::new(settings_store),
                audio_player,
                current_hotkey: std::sync::Mutex::new(initial_hotkey.clone()),
            };
            app.manage(app_state);

            if let Some(window) = app.get_webview_window("main") {
                window
                    .set_always_on_top(initial_settings.always_on_top)
                    .ok();
            }

            register_hotkey(app.handle(), &initial_hotkey)?;

            // System tray
            use tauri::menu::{MenuBuilder, MenuItemBuilder};
            use tauri::tray::TrayIconBuilder;
            let show_hide = MenuItemBuilder::with_id("show_hide", "Show/Hide").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show_hide, &quit]).build()?;
            TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show_hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                windows::hide_auxiliary_windows(app);
                                window.hide().ok();
                            } else {
                                windows::reveal_main_window(app);
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Intercept close → hide instead of quit
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        windows::hide_auxiliary_windows(&app_handle);
                        w.hide().ok();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            lookup_word,
            play_audio,
            get_available_sources,
            get_history,
            clear_history,
            export_history,
            get_settings,
            update_settings,
            set_always_on_top,
            windows::open_settings_window,
            windows::close_settings_window,
            windows::open_history_window,
            windows::close_history_window,
            windows::request_lookup_from_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
