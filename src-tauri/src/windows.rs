use crate::dict::{DictSource, WordEntry};
use serde::{Deserialize, Serialize};
use tauri::{
    utils::config::Color, webview::PageLoadEvent, Emitter, LogicalPosition, Manager, TitleBarStyle,
    WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

pub const MAIN_LABEL: &str = "main";
pub const SETTINGS_LABEL: &str = "settings";
pub const HISTORY_LABEL: &str = "history";
pub const HISTORY_LOOKUP_EVENT: &str = "history:lookup";
pub const HISTORY_SNAPSHOT_EVENT: &str = "history:snapshot";
pub const HISTORY_UPDATED_EVENT: &str = "history:updated";

const AUX_WINDOW_GAP: i32 = 12;
const HIDDEN_TRAFFIC_LIGHT_POSITION: f64 = -100.0;

const AUX_WINDOW_BACKGROUND_COLOR: Color = Color(13, 13, 12, 255);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryLookupRequest {
    pub word: String,
    pub source: DictSource,
    pub focus_main: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySnapshotRequest {
    pub entry: WordEntry,
    pub focus_main: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuxiliaryWindow {
    Settings,
    History,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct AuxiliaryWindowSpec {
    background_color: Color,
    decorations: bool,
    visible_on_create: bool,
    width: f64,
    height: f64,
    min_width: f64,
    min_height: f64,
    resizable: bool,
    title: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PhysicalWindowRect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PhysicalWindowSize {
    width: i32,
    height: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PhysicalWindowPosition {
    x: i32,
    y: i32,
}

pub fn aux_window_url(kind: AuxiliaryWindow) -> &'static str {
    match kind {
        AuxiliaryWindow::Settings => "index.html?window=settings",
        AuxiliaryWindow::History => "index.html?window=history",
    }
}

fn aux_window_spec(kind: AuxiliaryWindow) -> AuxiliaryWindowSpec {
    let (height, min_height, resizable, title) = match kind {
        AuxiliaryWindow::Settings => (560.0, 480.0, false, "VocaBridge Preferences"),
        AuxiliaryWindow::History => (620.0, 420.0, true, "VocaBridge History"),
    };

    AuxiliaryWindowSpec {
        background_color: AUX_WINDOW_BACKGROUND_COLOR,
        decorations: true,
        visible_on_create: false,
        width: 420.0,
        height,
        min_width: 360.0,
        min_height,
        resizable,
        title,
    }
}

fn apply_aux_window_policy<'a, R: tauri::Runtime, M: Manager<R>>(
    builder: WebviewWindowBuilder<'a, R, M>,
    kind: AuxiliaryWindow,
) -> WebviewWindowBuilder<'a, R, M> {
    let spec = aux_window_spec(kind);
    let builder = builder
        .background_color(spec.background_color)
        .decorations(spec.decorations)
        .visible(spec.visible_on_create)
        .shadow(true)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                window.show().ok();
                window.set_focus().ok();
            }
        });

    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(LogicalPosition::new(
            HIDDEN_TRAFFIC_LIGHT_POSITION,
            HIDDEN_TRAFFIC_LIGHT_POSITION,
        ));

    builder
}

fn apply_aux_window_position<'a, R: tauri::Runtime, M: Manager<R>>(
    app: &tauri::AppHandle<R>,
    builder: WebviewWindowBuilder<'a, R, M>,
    kind: AuxiliaryWindow,
) -> WebviewWindowBuilder<'a, R, M> {
    if let Some((x, y)) = aux_window_logical_position(app, kind) {
        builder.position(x, y)
    } else {
        builder.center()
    }
}

fn aux_window_logical_position<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    kind: AuxiliaryWindow,
) -> Option<(f64, f64)> {
    let main = app.get_webview_window(MAIN_LABEL)?;
    let scale_factor = main.scale_factor().ok().filter(|value| *value > 0.0)?;
    let main_position = main.outer_position().ok()?;
    let main_size = main.outer_size().ok()?;
    let spec = aux_window_spec(kind);

    let main_rect = PhysicalWindowRect {
        x: main_position.x,
        y: main_position.y,
        width: u32_to_i32(main_size.width),
        height: u32_to_i32(main_size.height),
    };
    let aux_size = PhysicalWindowSize {
        width: logical_to_physical(spec.width, scale_factor),
        height: logical_to_physical(spec.height, scale_factor),
    };
    let work_area = main.current_monitor().ok().flatten().map(|monitor| {
        let area = monitor.work_area();
        PhysicalWindowRect {
            x: area.position.x,
            y: area.position.y,
            width: u32_to_i32(area.size.width),
            height: u32_to_i32(area.size.height),
        }
    });
    let position = anchored_aux_position(main_rect, aux_size, work_area);

    Some((
        f64::from(position.x) / scale_factor,
        f64::from(position.y) / scale_factor,
    ))
}

fn anchored_aux_position(
    main: PhysicalWindowRect,
    aux: PhysicalWindowSize,
    work_area: Option<PhysicalWindowRect>,
) -> PhysicalWindowPosition {
    let right_x = main.x + main.width + AUX_WINDOW_GAP;
    let left_x = main.x - aux.width - AUX_WINDOW_GAP;

    if let Some(area) = work_area {
        let area_right = area.x + area.width;
        let x = if right_x + aux.width <= area_right {
            right_x
        } else if left_x >= area.x {
            left_x
        } else {
            clamp_axis(right_x, aux.width, area.x, area.width)
        };

        return PhysicalWindowPosition {
            x,
            y: clamp_axis(main.y, aux.height, area.y, area.height),
        };
    }

    PhysicalWindowPosition {
        x: right_x,
        y: main.y,
    }
}

fn clamp_axis(value: i32, item_size: i32, area_origin: i32, area_size: i32) -> i32 {
    let max = area_origin + area_size - item_size;
    if max <= area_origin {
        area_origin
    } else {
        value.clamp(area_origin, max)
    }
}

fn logical_to_physical(value: f64, scale_factor: f64) -> i32 {
    (value * scale_factor).round() as i32
}

fn u32_to_i32(value: u32) -> i32 {
    value.min(i32::MAX as u32) as i32
}

pub fn reveal_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        if !window.is_visible().unwrap_or(false) {
            window.show().ok();
        }
        if !window.is_focused().unwrap_or(false) {
            window.set_focus().ok();
        }
    }
}

pub fn hide_auxiliary_windows<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    hide_settings_by_handle(app).ok();
    if let Some(history) = app.get_webview_window(HISTORY_LABEL) {
        history.hide().ok();
    }
}

pub fn emit_history_updated<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    if let Some(history) = app.get_webview_window(HISTORY_LABEL) {
        history
            .emit(HISTORY_UPDATED_EVENT, ())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn emit_history_snapshot<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    entry: WordEntry,
    focus_main: bool,
) -> Result<(), String> {
    let payload = HistorySnapshotRequest { entry, focus_main };
    app.emit_to(MAIN_LABEL, HISTORY_SNAPSHOT_EVENT, payload.clone())
        .map_err(|e| e.to_string())?;
    if payload.focus_main {
        reveal_main_window(app);
    }
    Ok(())
}

fn focus_or_show(window: &WebviewWindow) {
    if !window.is_visible().unwrap_or(false) {
        window.show().ok();
    }
    window.set_focus().ok();
}

fn hide_settings_by_handle<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    if let Some(settings) = app.get_webview_window(SETTINGS_LABEL) {
        settings.hide().ok();
    }
    Ok(())
}

#[tauri::command]
pub fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings) = app.get_webview_window(SETTINGS_LABEL) {
        focus_or_show(&settings);
        return Ok(());
    }

    let kind = AuxiliaryWindow::Settings;
    let spec = aux_window_spec(kind);
    let window = apply_aux_window_position(
        &app,
        apply_aux_window_policy(
            WebviewWindowBuilder::new(
                &app,
                SETTINGS_LABEL,
                WebviewUrl::App(aux_window_url(kind).into()),
            ),
            kind,
        ),
        kind,
    )
    .title(spec.title)
    .inner_size(spec.width, spec.height)
    .min_inner_size(spec.min_width, spec.min_height)
    .resizable(spec.resizable)
    .build()
    .map_err(|e| e.to_string())?;

    let app_for_close = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            hide_settings_by_handle(&app_for_close).ok();
        }
    });

    Ok(())
}

#[tauri::command]
pub fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    hide_settings_by_handle(&app)
}

#[tauri::command]
pub fn open_history_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(history) = app.get_webview_window(HISTORY_LABEL) {
        focus_or_show(&history);
        return Ok(());
    }

    if app.get_webview_window(MAIN_LABEL).is_none() {
        return Err("main window not found".to_string());
    }

    let kind = AuxiliaryWindow::History;
    let spec = aux_window_spec(kind);
    let builder = apply_aux_window_position(
        &app,
        apply_aux_window_policy(
            WebviewWindowBuilder::new(
                &app,
                HISTORY_LABEL,
                WebviewUrl::App(aux_window_url(kind).into()),
            ),
            kind,
        ),
        kind,
    )
    .title(spec.title)
    .inner_size(spec.width, spec.height)
    .min_inner_size(spec.min_width, spec.min_height)
    .resizable(spec.resizable);

    let window = builder.build().map_err(|e| e.to_string())?;
    let window_for_close = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            window_for_close.hide().ok();
        }
    });

    Ok(())
}

#[tauri::command]
pub fn close_history_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(history) = app.get_webview_window(HISTORY_LABEL) {
        history.hide().ok();
    }
    Ok(())
}

#[tauri::command]
pub fn request_lookup_from_history(
    app: tauri::AppHandle,
    word: String,
    source: DictSource,
    focus_main: bool,
) -> Result<(), String> {
    let payload = HistoryLookupRequest {
        word,
        source,
        focus_main,
    };
    app.emit_to(MAIN_LABEL, HISTORY_LOOKUP_EVENT, payload.clone())
        .map_err(|e| e.to_string())?;
    if payload.focus_main {
        reveal_main_window(&app);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auxiliary_urls_route_to_window_roots() {
        assert_eq!(
            aux_window_url(AuxiliaryWindow::Settings),
            "index.html?window=settings"
        );
        assert_eq!(
            aux_window_url(AuxiliaryWindow::History),
            "index.html?window=history"
        );
    }

    #[test]
    fn settings_window_uses_utility_chrome_and_app_background() {
        let spec = aux_window_spec(AuxiliaryWindow::Settings);

        assert_eq!(spec.background_color, AUX_WINDOW_BACKGROUND_COLOR);
        assert!(spec.decorations);
        assert!(!spec.visible_on_create);
    }

    #[test]
    fn history_window_uses_utility_chrome_and_app_background() {
        let spec = aux_window_spec(AuxiliaryWindow::History);

        assert_eq!(spec.background_color, AUX_WINDOW_BACKGROUND_COLOR);
        assert!(spec.decorations);
        assert!(!spec.visible_on_create);
    }

    #[test]
    fn auxiliary_window_position_prefers_right_of_main_window() {
        let position = anchored_aux_position(
            PhysicalWindowRect {
                x: 100,
                y: 80,
                width: 500,
                height: 600,
            },
            PhysicalWindowSize {
                width: 420,
                height: 560,
            },
            Some(PhysicalWindowRect {
                x: 0,
                y: 0,
                width: 1600,
                height: 1000,
            }),
        );

        assert_eq!(position.x, 612);
        assert_eq!(position.y, 80);
    }

    #[test]
    fn auxiliary_window_position_falls_back_to_left_when_right_side_is_crowded() {
        let position = anchored_aux_position(
            PhysicalWindowRect {
                x: 1000,
                y: 80,
                width: 500,
                height: 600,
            },
            PhysicalWindowSize {
                width: 420,
                height: 560,
            },
            Some(PhysicalWindowRect {
                x: 0,
                y: 0,
                width: 1440,
                height: 1000,
            }),
        );

        assert_eq!(position.x, 568);
        assert_eq!(position.y, 80);
    }

    #[test]
    fn auxiliary_window_position_keeps_window_inside_vertical_work_area() {
        let position = anchored_aux_position(
            PhysicalWindowRect {
                x: 100,
                y: 760,
                width: 500,
                height: 160,
            },
            PhysicalWindowSize {
                width: 420,
                height: 300,
            },
            Some(PhysicalWindowRect {
                x: 0,
                y: 0,
                width: 1600,
                height: 900,
            }),
        );

        assert_eq!(position.x, 612);
        assert_eq!(position.y, 600);
    }

    #[test]
    fn history_lookup_payload_uses_camel_case_focus_flag() {
        let payload = HistoryLookupRequest {
            word: "bridge".to_string(),
            source: DictSource::FreeDictionary,
            focus_main: true,
        };
        let json = serde_json::to_string(&payload).expect("serialize payload");
        assert_eq!(
            json,
            r#"{"word":"bridge","source":"free_dictionary","focusMain":true}"#
        );
    }

    #[test]
    fn history_snapshot_payload_uses_camel_case_focus_flag() {
        let payload = HistorySnapshotRequest {
            entry: crate::dict::WordEntry {
                word: "bridge".to_string(),
                source: DictSource::Cambridge,
                entries: vec![],
            },
            focus_main: true,
        };
        let json = serde_json::to_string(&payload).expect("serialize payload");
        assert_eq!(
            json,
            r#"{"entry":{"word":"bridge","source":"cambridge","entries":[]},"focusMain":true}"#
        );
    }
}
