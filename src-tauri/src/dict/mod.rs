pub mod normalize;

mod free_dict;
pub use free_dict::FreeDictClient;

#[cfg(feature = "cambridge")]
mod cambridge;
#[cfg(feature = "cambridge")]
pub use cambridge::CambridgeScraper;

use reqwest::Client;
use serde::{Deserialize, Deserializer, Serialize};
use std::fmt;
use std::time::Duration;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// Which dictionary source to query.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DictSource {
    #[serde(rename = "cambridge")]
    Cambridge,
    #[serde(rename = "free_dictionary")]
    FreeDictionary,
}

/// Top-level result returned for a word lookup.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordEntry {
    pub word: String,
    pub source: DictSource,
    pub entries: Vec<DictEntry>,
}

/// A single dictionary entry (one part-of-speech block).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictEntry {
    pub part_of_speech: Option<String>,
    pub pronunciations: Vec<Pronunciation>,
    pub senses: Vec<Sense>,
}

/// Pronunciation info: IPA text and/or an audio URL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pronunciation {
    pub ipa: Option<String>,
    pub audio_url: Option<String>,
    pub region: Option<String>,
}

/// A single definition with zero or more example sentences.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Sense {
    pub definition: String,
    pub examples: Vec<String>,
}

impl<'de> Deserialize<'de> for Sense {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct SenseWire {
            definition: String,
            #[serde(default)]
            examples: Vec<String>,
            #[serde(default)]
            example: Option<String>,
        }

        let wire = SenseWire::deserialize(deserializer)?;
        let raw_examples = if wire.examples.is_empty() {
            wire.example.into_iter().collect()
        } else {
            wire.examples
        };
        let examples = raw_examples
            .into_iter()
            .map(|example| example.trim().to_string())
            .filter(|example| !example.is_empty())
            .collect();

        Ok(Self {
            definition: wire.definition,
            examples,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::Sense;

    #[test]
    fn sense_deserializes_legacy_example_field_as_examples() {
        let sense: Sense = serde_json::from_str(
            r#"{"definition":"a sample definition","example":"A sample sentence."}"#,
        )
        .expect("legacy sense should deserialize");

        assert_eq!(sense.examples, vec!["A sample sentence."]);
    }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum LookupError {
    /// The word was not found in the dictionary.
    WordNotFound(String),
    /// The response could not be parsed.
    ParseError(String),
    /// A network-level error occurred.
    NetworkError(String),
}

impl fmt::Display for LookupError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LookupError::WordNotFound(w) => write!(f, "Word not found: {w}"),
            LookupError::ParseError(msg) => write!(f, "Parse error: {msg}"),
            LookupError::NetworkError(msg) => write!(f, "Network error: {msg}"),
        }
    }
}

impl std::error::Error for LookupError {}

// ---------------------------------------------------------------------------
// Client aggregate
// ---------------------------------------------------------------------------

const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
    AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Holds all dictionary clients, sharing a single `reqwest::Client`.
pub struct DictClients {
    http: Client,
    free_dict: FreeDictClient,
    #[cfg(feature = "cambridge")]
    cambridge: CambridgeScraper,
}

impl DictClients {
    /// Creates a new `DictClients` with a shared HTTP client configured with
    /// a browser User-Agent and a 10-second timeout.
    pub fn new() -> Self {
        let http = Client::builder()
            .user_agent(USER_AGENT)
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client");

        let free_dict = FreeDictClient::new(http.clone());

        #[cfg(feature = "cambridge")]
        let cambridge = CambridgeScraper::new(http.clone());

        Self {
            http,
            free_dict,
            #[cfg(feature = "cambridge")]
            cambridge,
        }
    }

    /// Dispatches a lookup to the correct dictionary client based on the source.
    pub async fn lookup(
        &self,
        source: DictSource,
        word: &str,
    ) -> Result<WordEntry, LookupError> {
        match source {
            DictSource::FreeDictionary => self.free_dict.lookup(word).await,
            #[cfg(feature = "cambridge")]
            DictSource::Cambridge => self.cambridge.lookup(word).await,
            #[cfg(not(feature = "cambridge"))]
            DictSource::Cambridge => Err(LookupError::NetworkError(
                "Cambridge support is not compiled in".to_string(),
            )),
        }
    }

    /// Returns a list of dictionary sources that are compiled in.
    pub fn available_sources(&self) -> Vec<DictSource> {
        #[cfg(feature = "cambridge")]
        {
            let mut sources = vec![DictSource::FreeDictionary];
            sources.push(DictSource::Cambridge);
            return sources;
        }

        #[cfg(not(feature = "cambridge"))]
        {
            vec![DictSource::FreeDictionary]
        }
    }

    /// Returns a reference to the shared `reqwest::Client`, e.g. for audio
    /// download in the audio player.
    pub fn http_client(&self) -> &Client {
        &self.http
    }
}
