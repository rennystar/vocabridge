use crate::dict::DictSource;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

// ── Default value functions ──────────────────────────────────────────

fn default_search_delay() -> u64 {
    1000
}
fn default_clear_delay() -> u64 {
    3000
}
fn default_display_size() -> DisplaySize {
    DisplaySize::Default
}
#[cfg(feature = "cambridge")]
fn default_dict_source() -> DictSource {
    DictSource::Cambridge
}

#[cfg(not(feature = "cambridge"))]
fn default_dict_source() -> DictSource {
    DictSource::FreeDictionary
}
fn default_example_display() -> ExampleDisplay {
    ExampleDisplay::All
}
fn default_collapse_examples() -> bool {
    false
}
fn default_highlight_example_terms() -> bool {
    true
}
fn default_convert_korean_input() -> bool {
    true
}
fn default_always_on_top() -> bool {
    false
}
fn default_global_hotkey() -> String {
    "CmdOrCtrl+Shift+D".to_string()
}
fn default_auto_play_audio() -> bool {
    true
}
fn default_preferred_region() -> String {
    "uk".to_string()
}
fn default_history_click_behavior() -> HistoryClickBehavior {
    HistoryClickBehavior::SavedSnapshot
}

// ── Example display enum ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DisplaySize {
    Compact,
    Default,
    Large,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ExampleDisplay {
    All,
    FirstPerMeaning,
    Hidden,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum HistoryClickBehavior {
    SavedSnapshot,
    RefreshFromDictionary,
}

// ── Settings struct ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_display_size")]
    pub display_size: DisplaySize,

    #[serde(default = "default_search_delay")]
    pub search_delay: u64,

    #[serde(default = "default_clear_delay")]
    pub clear_delay: u64,

    #[serde(default = "default_dict_source")]
    pub dict_source: DictSource,

    #[serde(default = "default_history_click_behavior")]
    pub history_click_behavior: HistoryClickBehavior,

    #[serde(default = "default_example_display")]
    pub example_display: ExampleDisplay,

    #[serde(default = "default_collapse_examples")]
    pub collapse_examples: bool,

    #[serde(default = "default_highlight_example_terms")]
    pub highlight_example_terms: bool,

    #[serde(default = "default_convert_korean_input")]
    pub convert_korean_input: bool,

    #[serde(default = "default_always_on_top")]
    pub always_on_top: bool,

    #[serde(default = "default_global_hotkey")]
    pub global_hotkey: String,

    #[serde(default = "default_auto_play_audio")]
    pub auto_play_audio: bool,

    #[serde(default = "default_preferred_region")]
    pub preferred_region: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            display_size: default_display_size(),
            search_delay: default_search_delay(),
            clear_delay: default_clear_delay(),
            dict_source: default_dict_source(),
            history_click_behavior: default_history_click_behavior(),
            example_display: default_example_display(),
            collapse_examples: default_collapse_examples(),
            highlight_example_terms: default_highlight_example_terms(),
            convert_korean_input: default_convert_korean_input(),
            always_on_top: default_always_on_top(),
            global_hotkey: default_global_hotkey(),
            auto_play_audio: default_auto_play_audio(),
            preferred_region: default_preferred_region(),
        }
    }
}

// ── SettingsStore ────────────────────────────────────────────────────

/// Manages persistence of user settings to a JSON file on disk.
pub struct SettingsStore {
    path: PathBuf,
    settings: Settings,
}

impl SettingsStore {
    /// Load settings from `<app_data_dir>/settings.json`.  If the file
    /// does not exist or is malformed, fall back to defaults.  Unknown
    /// fields are silently ignored and missing fields receive their
    /// default values thanks to `serde(default)`.
    pub fn new(app_data_dir: &Path) -> Self {
        let path = app_data_dir.join("settings.json");
        let settings = if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(contents) => {
                    serde_json::from_str::<Settings>(&contents).unwrap_or_default()
                }
                Err(_) => Settings::default(),
            }
        } else {
            Settings::default()
        };

        Self { path, settings }
    }

    /// Return a reference to the current in-memory settings.
    pub fn get(&self) -> &Settings {
        &self.settings
    }

    /// Replace the in-memory settings and persist them to disk.
    pub fn set(&mut self, settings: Settings) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(&self.path, json)?;
        self.settings = settings;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{DisplaySize, ExampleDisplay, HistoryClickBehavior, Settings};

    #[test]
    fn legacy_example_settings_use_new_defaults() {
        let settings: Settings = serde_json::from_str(
            r#"{"detailLevel":"full","maxExamples":5}"#,
        )
        .expect("legacy settings should deserialize");

        assert_eq!(settings.example_display, ExampleDisplay::All);
        assert_eq!(settings.display_size, DisplaySize::Default);
        assert!(!settings.collapse_examples);
        assert!(settings.highlight_example_terms);
        assert!(settings.convert_korean_input);
        assert_eq!(
            settings.history_click_behavior,
            HistoryClickBehavior::SavedSnapshot
        );
    }
}
