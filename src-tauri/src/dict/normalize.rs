/// Normalizes user input into a stable cache key: trimmed and lowercased.
pub fn cache_key(input: &str) -> String {
    input.trim().to_lowercase()
}

/// Converts a cache key into a URL path segment for the Cambridge Dictionary.
/// Spaces are replaced with hyphens, then the result is percent-encoded.
#[cfg(feature = "cambridge")]
pub fn cambridge_url_path(cache_key: &str) -> String {
    let hyphenated = cache_key.replace(' ', "-");
    percent_encode_path(&hyphenated)
}

/// Converts a cache key into a URL path segment for the Free Dictionary API.
/// The key is percent-encoded directly (spaces become `%20`).
pub fn free_dict_url_path(cache_key: &str) -> String {
    percent_encode_path(cache_key)
}

/// Percent-encodes a string for use in a URL path segment.
/// Unreserved characters (alphanumeric plus `-`, `_`, `.`, `~`) are left as-is;
/// everything else is encoded as `%XX`.
fn percent_encode_path(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{byte:02X}"));
            }
        }
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_key_trims_and_lowercases() {
        assert_eq!(cache_key("  Hello World  "), "hello world");
        assert_eq!(cache_key("RUST"), "rust");
        assert_eq!(cache_key("already lower"), "already lower");
    }

    #[test]
    fn cache_key_empty_and_whitespace() {
        assert_eq!(cache_key(""), "");
        assert_eq!(cache_key("   "), "");
    }

    #[test]
    fn cache_key_preserves_inner_spaces() {
        assert_eq!(cache_key("ice cream"), "ice cream");
    }

    #[cfg(feature = "cambridge")]
    #[test]
    fn cambridge_url_path_replaces_spaces_with_hyphens() {
        assert_eq!(cambridge_url_path("ice cream"), "ice-cream");
    }

    #[cfg(feature = "cambridge")]
    #[test]
    fn cambridge_url_path_encodes_special_chars() {
        // Apostrophes and other non-alphanumeric chars should be percent-encoded
        assert_eq!(cambridge_url_path("it's"), "it%27s");
    }

    #[cfg(feature = "cambridge")]
    #[test]
    fn cambridge_url_path_simple_word() {
        assert_eq!(cambridge_url_path("hello"), "hello");
    }

    #[test]
    fn free_dict_url_path_encodes_spaces() {
        assert_eq!(free_dict_url_path("ice cream"), "ice%20cream");
    }

    #[test]
    fn free_dict_url_path_simple_word() {
        assert_eq!(free_dict_url_path("hello"), "hello");
    }

    #[test]
    fn free_dict_url_path_encodes_special_chars() {
        assert_eq!(free_dict_url_path("it's"), "it%27s");
    }
}
