use reqwest::Client;
use serde::Deserialize;

use super::normalize::free_dict_url_path;
use super::{DictEntry, DictSource, LookupError, Pronunciation, Sense, WordEntry};

/// Client for the free Dictionary API (<https://dictionaryapi.dev/>).
pub struct FreeDictClient {
    client: Client,
}

impl FreeDictClient {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn lookup(&self, word: &str) -> Result<WordEntry, LookupError> {
        let key = super::normalize::cache_key(word);
        let path = free_dict_url_path(&key);
        let url = format!("https://api.dictionaryapi.dev/api/v2/entries/en/{path}");

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| LookupError::NetworkError(e.to_string()))?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(LookupError::WordNotFound(key));
        }

        if !response.status().is_success() {
            return Err(LookupError::NetworkError(format!(
                "API returned status {}",
                response.status()
            )));
        }

        let api_entries: Vec<ApiEntry> = response
            .json()
            .await
            .map_err(|e| LookupError::ParseError(e.to_string()))?;

        if api_entries.is_empty() {
            return Err(LookupError::WordNotFound(key));
        }

        let headword = api_entries
            .first()
            .map(|e| e.word.clone())
            .unwrap_or_else(|| key.clone());

        let mut entries: Vec<DictEntry> = Vec::new();

        for api_entry in &api_entries {
            let pronunciations: Vec<Pronunciation> = api_entry
                .phonetics
                .iter()
                .filter(|p| p.text.is_some() || p.audio.is_some())
                .map(|p| {
                    // Infer region from audio URL when available
                    let region = p.audio.as_deref().and_then(|a| {
                        if a.contains("-us") {
                            Some("US".to_string())
                        } else if a.contains("-uk") {
                            Some("UK".to_string())
                        } else if a.contains("-au") {
                            Some("AU".to_string())
                        } else {
                            None
                        }
                    });

                    Pronunciation {
                        ipa: p.text.clone(),
                        audio_url: p.audio.clone().filter(|a| !a.is_empty()),
                        region,
                    }
                })
                .collect();

            for meaning in &api_entry.meanings {
                let senses: Vec<Sense> = meaning
                    .definitions
                    .iter()
                    .map(|d| Sense {
                        definition: d.definition.clone(),
                        examples: d.example.clone().into_iter().collect(),
                    })
                    .collect();

                if !senses.is_empty() {
                    entries.push(DictEntry {
                        part_of_speech: Some(meaning.part_of_speech.clone()),
                        pronunciations: pronunciations.clone(),
                        senses,
                    });
                }
            }
        }

        Ok(WordEntry {
            word: headword,
            source: DictSource::FreeDictionary,
            entries,
        })
    }
}

// ---------- API response shapes ----------

#[derive(Deserialize)]
struct ApiEntry {
    word: String,
    #[serde(default)]
    phonetics: Vec<ApiPhonetic>,
    #[serde(default)]
    meanings: Vec<ApiMeaning>,
}

#[derive(Deserialize)]
struct ApiPhonetic {
    text: Option<String>,
    audio: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiMeaning {
    part_of_speech: String,
    #[serde(default)]
    definitions: Vec<ApiDefinition>,
}

#[derive(Deserialize)]
struct ApiDefinition {
    definition: String,
    example: Option<String>,
}
