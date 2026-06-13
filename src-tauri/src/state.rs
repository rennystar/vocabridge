use std::sync::Mutex;
use crate::audio::AudioPlayer;
use crate::dict::DictClients;
use crate::history::HistoryStore;
use crate::settings::SettingsStore;

pub struct AppState {
    pub clients: DictClients,
    pub history: Mutex<HistoryStore>,
    pub settings: Mutex<SettingsStore>,
    pub audio_player: AudioPlayer,
    pub current_hotkey: Mutex<String>,
}
