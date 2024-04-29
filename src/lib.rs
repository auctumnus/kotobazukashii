mod generation;
mod parsing;

use wasm_bindgen::prelude::*;


#[wasm_bindgen]
pub struct PatternInput {
    name: String,
    pattern: String
}

#[wasm_bindgen]
pub struct GenerationMeta {
    num_words: u32,
    new_line_each: bool,
    filter_duplicates: bool
}

#[wasm_bindgen]
pub struct GenerationSettings {
    settings: GenerationMeta,
    patterns: Vec<PatternInput>
}

#[wasm_bindgen]
pub fn make_pattern_input(name: String, pattern: String) -> PatternInput {
    PatternInput {
        name,
        pattern
    }
}

#[wasm_bindgen]
pub fn make_generation_meta(num_words: u32, new_line_each: bool, filter_duplicates: bool) -> GenerationMeta {
    GenerationMeta {
        num_words,
        new_line_each,
        filter_duplicates
    }
}

#[wasm_bindgen]
pub fn make_generation_settings(settings: GenerationMeta, patterns: Vec<PatternInput>) -> GenerationSettings {
    GenerationSettings {
        settings,
        patterns
    }
}

#[wasm_bindgen]
pub fn generate(settings: GenerationSettings) -> Result<Vec<String>, String> {
    let mut generation = generation::Generation::default();

    for pattern in settings.patterns {
        let parsed_pattern = parsing::parse_pattern(&pattern.pattern).unwrap();
        generation.add_pattern(pattern.name, parsed_pattern);
    }

    let mut result = Vec::with_capacity(settings.settings.num_words as usize);
    for _ in 0..settings.settings.num_words {
        let generated = generation.generate("main").map_err(|e| e.to_string())?;
        result.push(generated);
    }
    if !settings.settings.filter_duplicates {
        Ok(result)
    } else {
        let mut deduped = Vec::with_capacity(result.len());
        let mut seen = std::collections::HashSet::new();
        for word in result {
            if seen.insert(word.clone()) {
                deduped.push(word);
            }
        }
        Ok(deduped)
    }
}
