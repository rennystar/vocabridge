use crate::dict::{DictEntry, DictSource, WordEntry};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;

// ── Schema version ───────────────────────────────────────────────────

const CURRENT_SCHEMA_VERSION: u32 = 1;

// ── Public types ─────────────────────────────────────────────────────

/// A row returned by [`HistoryStore::list`] for display in the UI.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub cache_key: String,
    pub display_word: String,
    pub source: String,
    pub part_of_speech: Option<String>,
    pub definition_preview: Option<String>,
    pub lookup_count: i64,
    pub looked_up_at: String,
}

/// Supported export formats for history data.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    Csv,
    Json,
}

// ── HistoryStore ─────────────────────────────────────────────────────

/// Manages the SQLite-backed lookup history and result cache.
pub struct HistoryStore {
    conn: Connection,
}

impl HistoryStore {
    /// Open (or create) `vocabridge.db` inside `app_data_dir` and run
    /// any pending schema migrations.
    pub fn new(app_data_dir: &Path) -> Result<Self, rusqlite::Error> {
        let db_path = app_data_dir.join("vocabridge.db");
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrent read performance.
        conn.pragma_update(None, "journal_mode", "WAL")?;

        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    // ── Schema migration ─────────────────────────────────────────────

    fn migrate(&self) -> Result<(), rusqlite::Error> {
        let version: u32 = self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version < 1 {
            self.conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS history (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key         TEXT NOT NULL,
                    display_word      TEXT NOT NULL,
                    source            TEXT NOT NULL,
                    part_of_speech    TEXT,
                    definition_preview TEXT,
                    full_entry_json   TEXT NOT NULL,
                    lookup_count      INTEGER NOT NULL DEFAULT 1,
                    looked_up_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(cache_key, source)
                );
                CREATE INDEX IF NOT EXISTS idx_looked_up_at ON history(looked_up_at);",
            )?;
            self.conn
                .pragma_update(None, "user_version", CURRENT_SCHEMA_VERSION)?;
        }

        Ok(())
    }

    // ── Upsert ───────────────────────────────────────────────────────

    /// Insert or update a history row for the given word entry.
    ///
    /// On conflict the lookup count is incremented, the timestamp is
    /// refreshed, and the cached JSON payload is replaced.
    pub fn upsert_with_cache_key(&self, cache_key: &str, entry: &WordEntry) {
        let display_word = &entry.word;
        let source = source_to_str(&entry.source);

        let (part_of_speech, definition_preview) = first_pos_and_preview(&entry.entries);

        let full_json = serde_json::to_string(entry).unwrap_or_default();

        let _ = self.conn.execute(
            "INSERT INTO history
                (cache_key, display_word, source, part_of_speech, definition_preview, full_entry_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(cache_key, source) DO UPDATE SET
                display_word      = excluded.display_word,
                part_of_speech    = excluded.part_of_speech,
                definition_preview = excluded.definition_preview,
                full_entry_json   = excluded.full_entry_json,
                lookup_count      = history.lookup_count + 1,
                looked_up_at      = CURRENT_TIMESTAMP",
            params![cache_key, display_word, source, part_of_speech, definition_preview, full_json],
        );
    }

    // ── Cache lookup ─────────────────────────────────────────────────

    /// Return the cached [`WordEntry`] for `cache_key` + `source` if
    /// the row exists and was looked up within the last 24 hours.
    pub fn get_cached(&self, cache_key: &str, source: &DictSource) -> Option<WordEntry> {
        let source_str = source_to_str(source);

        let result: Result<String, _> = self.conn.query_row(
            "SELECT full_entry_json
             FROM history
             WHERE cache_key = ?1
               AND source = ?2
               AND looked_up_at >= datetime('now', '-24 hours')",
            params![cache_key, source_str],
            |row| row.get(0),
        );

        match result {
            Ok(json) => {
                let _ = self.conn.execute(
                    "UPDATE history
                     SET lookup_count = lookup_count + 1,
                         looked_up_at = CURRENT_TIMESTAMP
                     WHERE cache_key = ?1 AND source = ?2",
                    params![cache_key, source_str],
                );
                serde_json::from_str::<WordEntry>(&json).ok()
            }
            Err(_) => None,
        }
    }

    // ── List ─────────────────────────────────────────────────────────

    /// Return all history rows in reverse chronological order.
    pub fn list(&self) -> Result<Vec<HistoryItem>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT cache_key, display_word, source, part_of_speech,
                    definition_preview, lookup_count, looked_up_at
             FROM history
             ORDER BY looked_up_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let stored_source: String = row.get(2)?;
            Ok(HistoryItem {
                cache_key: row.get(0)?,
                display_word: row.get(1)?,
                source: canonical_source_str(&stored_source).to_string(),
                part_of_speech: row.get(3)?,
                definition_preview: row.get(4)?,
                lookup_count: row.get(5)?,
                looked_up_at: row.get(6)?,
            })
        })?;

        rows.collect()
    }

    pub fn get_snapshot_and_record_view(
        &self,
        cache_key: &str,
        source: &DictSource,
    ) -> Result<Option<WordEntry>, rusqlite::Error> {
        let source_str = source_to_str(source);

        let result: Result<String, _> = self.conn.query_row(
            "SELECT full_entry_json
             FROM history
             WHERE cache_key = ?1
               AND source = ?2",
            params![cache_key, source_str],
            |row| row.get(0),
        );

        match result {
            Ok(json) => {
                self.conn.execute(
                    "UPDATE history
                     SET lookup_count = lookup_count + 1,
                         looked_up_at = CURRENT_TIMESTAMP
                     WHERE cache_key = ?1 AND source = ?2",
                    params![cache_key, source_str],
                )?;
                Ok(serde_json::from_str::<WordEntry>(&json).ok())
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(err) => Err(err),
        }
    }

    // ── Clear ────────────────────────────────────────────────────────

    /// Remove all lookup history and cached results.
    pub fn clear(&self) -> Result<(), rusqlite::Error> {
        self.conn.execute("DELETE FROM history", [])?;
        Ok(())
    }

    // ── Export ────────────────────────────────────────────────────────

    /// Export the full history to `path` in the requested format.
    pub fn export(
        &self,
        format: &ExportFormat,
        path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let items = self.list()?;

        match format {
            ExportFormat::Csv => {
                let mut out = String::from("word,part_of_speech,definition,source,lookup_count,date\n");
                for item in &items {
                    out.push_str(&csv_escape(&item.display_word));
                    out.push(',');
                    out.push_str(&csv_escape(
                        item.part_of_speech.as_deref().unwrap_or(""),
                    ));
                    out.push(',');
                    out.push_str(&csv_escape(
                        item.definition_preview.as_deref().unwrap_or(""),
                    ));
                    out.push(',');
                    out.push_str(&csv_escape(&item.source));
                    out.push(',');
                    out.push_str(&item.lookup_count.to_string());
                    out.push(',');
                    out.push_str(&csv_escape(&item.looked_up_at));
                    out.push('\n');
                }
                std::fs::write(path, out)?;
            }
            ExportFormat::Json => {
                let json = serde_json::to_string_pretty(&items)?;
                std::fs::write(path, json)?;
            }
        }

        Ok(())
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/// Convert a `DictSource` variant to the string stored in the `source`
/// column (matches the serde rename values).
fn source_to_str(source: &DictSource) -> &'static str {
    match source {
        DictSource::Cambridge => "cambridge",
        DictSource::FreeDictionary => "free-dict",
    }
}

fn canonical_source_str(stored_source: &str) -> &'static str {
    match stored_source {
        "cambridge" => "cambridge",
        "free-dict" | "free_dictionary" => "free_dictionary",
        _ => "free_dictionary",
    }
}

/// Extract the first part-of-speech and a definition preview (first
/// 100 characters) from the list of dictionary entries.
fn first_pos_and_preview(entries: &[DictEntry]) -> (Option<String>, Option<String>) {
    let first = match entries.first() {
        Some(e) => e,
        None => return (None, None),
    };

    let pos = first.part_of_speech.clone();

    let preview = first.senses.first().map(|s| {
        let def = &s.definition;
        if def.chars().count() > 100 {
            let mut truncated: String = def.chars().take(100).collect();
            truncated.push_str("...");
            truncated
        } else {
            def.clone()
        }
    });

    (pos, preview)
}

/// Escape a value for CSV output.  If the value contains a comma,
/// double-quote, or newline, wrap it in double-quotes and escape inner
/// double-quotes by doubling them.
fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        let escaped = value.replace('"', "\"\"");
        format!("\"{escaped}\"")
    } else {
        value.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn upsert_uses_lookup_cache_key_not_display_word() {
        let temp_dir = unique_temp_dir("history-cache-key");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("look-up", DictSource::Cambridge);

        store.upsert_with_cache_key("look up", &entry);

        assert!(
            store.get_cached("look up", &DictSource::Cambridge).is_some(),
            "cache should be retrievable by the normalized input key"
        );
    }

    #[test]
    fn cache_hits_increment_lookup_count() {
        let temp_dir = unique_temp_dir("history-cache-hit");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("apathy", DictSource::FreeDictionary);

        store.upsert_with_cache_key("apathy", &entry);
        let before = store.list().expect("history").remove(0).lookup_count;

        let cached = store.get_cached("apathy", &DictSource::FreeDictionary);
        assert!(cached.is_some(), "expected cached result");

        let after = store.list().expect("history").remove(0).lookup_count;
        assert_eq!(before + 1, after, "cache hits should count as lookups");
    }

    #[test]
    fn list_returns_canonical_source_names() {
        let temp_dir = unique_temp_dir("history-source-name");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("apathy", DictSource::FreeDictionary);

        store.upsert_with_cache_key("apathy", &entry);

        let item = store.list().expect("history").remove(0);
        assert_eq!(item.source, "free_dictionary");
    }

    #[test]
    fn expired_cache_entries_are_ignored() {
        let temp_dir = unique_temp_dir("history-cache-expired");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("apathy", DictSource::FreeDictionary);

        store.upsert_with_cache_key("apathy", &entry);
        store
            .conn
            .execute(
                "UPDATE history SET looked_up_at = datetime('now', '-25 hours')",
                [],
            )
            .expect("expire cache entry");

        let cached = store.get_cached("apathy", &DictSource::FreeDictionary);
        assert!(cached.is_none(), "expired cache should not be reused");
    }

    #[test]
    fn snapshots_are_returned_without_cache_expiry_and_count_once() {
        let temp_dir = unique_temp_dir("history-snapshot");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("bridge", DictSource::Cambridge);

        store.upsert_with_cache_key("bridge", &entry);
        store
            .conn
            .execute(
                "UPDATE history SET looked_up_at = datetime('now', '-25 hours')",
                [],
            )
            .expect("expire cache entry");

        let snapshot = store
            .get_snapshot_and_record_view("bridge", &DictSource::Cambridge)
            .expect("snapshot lookup")
            .expect("stored snapshot");

        assert_eq!(snapshot.word, "bridge");
        assert_eq!(snapshot.source, DictSource::Cambridge);
        assert_eq!(store.list().expect("history").remove(0).lookup_count, 2);
    }

    #[test]
    fn clear_removes_all_history_rows() {
        let temp_dir = unique_temp_dir("history-clear");
        let store = HistoryStore::new(&temp_dir).expect("history store");
        let entry = sample_entry("bridge", DictSource::FreeDictionary);

        store.upsert_with_cache_key("bridge", &entry);
        assert_eq!(1, store.list().expect("history before clear").len());

        store.clear().expect("clear history");

        assert!(store.list().expect("history after clear").is_empty());
        assert!(store
            .get_cached("bridge", &DictSource::FreeDictionary)
            .is_none());
    }

    fn sample_entry(word: &str, source: DictSource) -> WordEntry {
        WordEntry {
            word: word.to_string(),
            source,
            entries: vec![DictEntry {
                part_of_speech: Some("noun".to_string()),
                pronunciations: vec![],
                senses: vec![crate::dict::Sense {
                    definition: "sample definition".to_string(),
                    examples: vec![],
                }],
            }],
        }
    }

    fn unique_temp_dir(prefix: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("vocabridge-{prefix}-{nanos}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }
}
