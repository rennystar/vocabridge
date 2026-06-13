use reqwest::Client;
use scraper::{Html, Selector};

use super::normalize::cambridge_url_path;
use super::{DictEntry, DictSource, LookupError, Pronunciation, Sense, WordEntry};

/// Scraper-based client for the Cambridge Dictionary website.
pub struct CambridgeScraper {
    client: Client,
}

impl CambridgeScraper {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn lookup(&self, word: &str) -> Result<WordEntry, LookupError> {
        let key = super::normalize::cache_key(word);
        let path = cambridge_url_path(&key);
        let url = format!("https://dictionary.cambridge.org/dictionary/english/{path}");

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
                "Cambridge returned status {}",
                response.status()
            )));
        }

        let html_text = response
            .text()
            .await
            .map_err(|e| LookupError::NetworkError(e.to_string()))?;

        parse_cambridge_html(&html_text, &key)
    }
}

fn parse_cambridge_html(html: &str, lookup_key: &str) -> Result<WordEntry, LookupError> {
    let document = Html::parse_document(html);

    let entry_sel = Selector::parse(".pr.entry-body__el").unwrap();
    let hw_sel = Selector::parse(".hw.dhw").unwrap();
    let pos_sel = Selector::parse(".pos.dpos").unwrap();
    let pron_sel = Selector::parse(".pron.dpron").unwrap();
    let audio_sel = Selector::parse(".dpron-i audio source[src]").unwrap();
    let region_sel = Selector::parse(".region.dreg").unwrap();
    let def_block_sel = Selector::parse(".def-block.ddef_block").unwrap();
    let def_text_sel = Selector::parse(".def.ddef_d.db").unwrap();
    let example_sel = Selector::parse(".examp.dexamp .eg.deg").unwrap();

    let entry_elements: Vec<_> = document.select(&entry_sel).collect();

    // Determine headword from first entry (fallback to lookup key)
    let headword = entry_elements
        .first()
        .and_then(|el| el.select(&hw_sel).next())
        .map(|el| collect_text(el))
        .unwrap_or_else(|| lookup_key.to_string());

    let mut entries: Vec<DictEntry> = Vec::new();
    let mut total_definitions = 0usize;

    for entry_el in &entry_elements {
        // Part of speech
        let part_of_speech = entry_el
            .select(&pos_sel)
            .next()
            .map(|el| collect_text(el));

        // Pronunciations — collect from each .dpron-i block
        let pron_block_sel = Selector::parse(".dpron-i").unwrap();
        let pron_ipa_sel = Selector::parse(".pron.dpron").unwrap();
        let pron_audio_sel = Selector::parse("audio source[src]").unwrap();
        let pron_region_sel = Selector::parse(".region.dreg").unwrap();

        let mut pronunciations: Vec<Pronunciation> = Vec::new();

        for pron_el in entry_el.select(&pron_block_sel) {
            let ipa = pron_el
                .select(&pron_ipa_sel)
                .next()
                .map(|el| collect_text(el));

            let audio_url = pron_el
                .select(&pron_audio_sel)
                .next()
                .and_then(|el| el.value().attr("src"))
                .map(|src| {
                    if src.starts_with("http") {
                        src.to_string()
                    } else {
                        format!("https://dictionary.cambridge.org{src}")
                    }
                });

            let region = pron_el
                .select(&pron_region_sel)
                .next()
                .map(|el| collect_text(el).to_uppercase());

            if ipa.is_some() || audio_url.is_some() {
                pronunciations.push(Pronunciation {
                    ipa,
                    audio_url,
                    region,
                });
            }
        }

        // If no per-block pronunciations were found, fall back to entry-level selectors
        if pronunciations.is_empty() {
            let ipa = entry_el
                .select(&pron_sel)
                .next()
                .map(|el| collect_text(el));

            let audio_url = entry_el
                .select(&audio_sel)
                .next()
                .and_then(|el| el.value().attr("src"))
                .map(|src| {
                    if src.starts_with("http") {
                        src.to_string()
                    } else {
                        format!("https://dictionary.cambridge.org{src}")
                    }
                });

            let region = entry_el
                .select(&region_sel)
                .next()
                .map(|el| collect_text(el).to_uppercase());

            if ipa.is_some() || audio_url.is_some() {
                pronunciations.push(Pronunciation {
                    ipa,
                    audio_url,
                    region,
                });
            }
        }

        // Definition blocks
        let mut senses: Vec<Sense> = Vec::new();

        for def_block in entry_el.select(&def_block_sel) {
            let definition = def_block
                .select(&def_text_sel)
                .next()
                .map(|el| {
                    let text = collect_text(el);
                    // Cambridge definitions often end with ": " — trim it
                    text.trim_end_matches(": ").trim().to_string()
                });

            if let Some(def) = definition {
                let examples = def_block
                    .select(&example_sel)
                    .map(|el| collect_text(el))
                    .filter(|example| !example.is_empty())
                    .collect();

                senses.push(Sense {
                    definition: def,
                    examples,
                });
                total_definitions += 1;
            }
        }

        if !senses.is_empty() {
            entries.push(DictEntry {
                part_of_speech,
                pronunciations,
                senses,
            });
        }
    }

    if total_definitions == 0 {
        // Distinguish between a real page with no parseable definitions (ParseError)
        // vs. a page that simply doesn't have the word (WordNotFound).
        if entry_elements.is_empty() {
            return Err(LookupError::WordNotFound(lookup_key.to_string()));
        } else {
            return Err(LookupError::ParseError(
                "Found entry elements but could not extract any definitions".to_string(),
            ));
        }
    }

    Ok(WordEntry {
        word: headword,
        source: DictSource::Cambridge,
        entries,
    })
}

/// Recursively collect all text nodes from an element, joined and trimmed.
fn collect_text(el: scraper::ElementRef) -> String {
    el.text().collect::<Vec<_>>().join("").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parser_collects_all_examples_for_a_definition() {
        let html = r#"
            <div class="pr entry-body__el">
              <span class="hw dhw">set</span>
              <span class="pos dpos">verb</span>
              <div class="def-block ddef_block">
                <div class="def ddef_d db">to put something somewhere:</div>
                <div class="examp dexamp"><span class="eg deg">Set it on the table.</span></div>
                <div class="examp dexamp"><span class="eg deg">She set the glass down.</span></div>
              </div>
            </div>
        "#;

        let entry = parse_cambridge_html(html, "set").expect("parse entry");
        let examples = &entry.entries[0].senses[0].examples;

        assert_eq!(
            examples,
            &vec![
                "Set it on the table.".to_string(),
                "She set the glass down.".to_string()
            ]
        );
    }
}
