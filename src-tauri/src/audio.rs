use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::sync::mpsc;
use std::thread;

enum AudioCommand {
    Play(Vec<u8>),
}

/// Audio player that manages rodio on a dedicated thread.
/// rodio's OutputStream is !Send, so we keep it pinned to one thread
/// and communicate via channels.
pub struct AudioPlayer {
    tx: mpsc::Sender<AudioCommand>,
}

// Safety: AudioPlayer only holds a Sender which is Send + Sync
unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<AudioCommand>();

        thread::spawn(move || {
            let (_stream, handle) = match OutputStream::try_default() {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("audio: failed to open output device: {e}");
                    return;
                }
            };
            let mut current_sink: Option<Sink> = None;

            while let Ok(cmd) = rx.recv() {
                match cmd {
                    AudioCommand::Play(bytes) => {
                        if let Some(ref sink) = current_sink {
                            sink.stop();
                        }
                        current_sink = None;

                        let cursor = Cursor::new(bytes);
                        let source = match Decoder::new(cursor) {
                            Ok(s) => s,
                            Err(e) => {
                                eprintln!("audio: failed to decode: {e}");
                                continue;
                            }
                        };
                        match Sink::try_new(&handle) {
                            Ok(sink) => {
                                sink.append(source);
                                current_sink = Some(sink);
                            }
                            Err(e) => {
                                eprintln!("audio: failed to create sink: {e}");
                            }
                        }
                    }
                }
            }
        });

        Self { tx }
    }

    pub fn play_bytes(&self, bytes: &[u8]) -> Result<(), String> {
        self.tx.send(AudioCommand::Play(bytes.to_vec()))
            .map_err(|_| "audio thread has stopped".to_string())
    }
}
