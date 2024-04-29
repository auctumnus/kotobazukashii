use rand::{distributions::WeightedIndex, prelude::*};
use std::collections::HashMap;

const MAX_GENERATION_DEPTH: u32 = 20;

pub enum SubpatternPart {
    Text(String),
    Optional(Box<Pattern>),
    Reference(String),
    Subpattern(Box<Pattern>),
}

impl SubpatternPart {
    pub fn generate(
        &self,
        patterns: &HashMap<String, Pattern>,
        generation_depth: u32,
    ) -> anyhow::Result<String> {
        match self {
            SubpatternPart::Text(text) => Ok(text.clone()),
            SubpatternPart::Optional(pattern) => {
                let mut rng = thread_rng();
                if rng.gen_bool(0.5) {
                    pattern.generate(patterns, generation_depth + 1)
                } else {
                    Ok(String::new())
                }
                
            },
            SubpatternPart::Reference(name) => {
                if let Some(pattern) = patterns.get(name) {
                    pattern.generate(patterns, generation_depth + 1)
                } else {
                    Err(anyhow::anyhow!("Pattern not found: {}", name))
                }
            }
            SubpatternPart::Subpattern(pattern) => pattern.generate(patterns, generation_depth + 1),
        }
    }
}

pub struct Fragment {
    parts: Vec<SubpatternPart>,
    pub weight: u32,
    filters: Vec<String>,
}

impl Fragment {
    pub fn new(parts: Vec<SubpatternPart>, weight: u32, filters: Vec<String>) -> Self {
        Fragment {
            parts,
            weight,
            filters,
        }
    }

    pub fn generate(
        &self,
        patterns: &HashMap<String, Pattern>,
        generation_depth: u32,
    ) -> anyhow::Result<String> {
        if generation_depth > MAX_GENERATION_DEPTH {
            return Err(anyhow::anyhow!("Max generation depth reached"));
        }
        let mut result = String::new();
        for fragment in &self.parts {
            match fragment.generate(patterns, generation_depth + 1) {
                Ok(value) => result.push_str(&value),
                Err(error) => return Err(error),
            }
        }
        if self.filters.contains(&result) {
            self.generate(patterns, generation_depth + 1)
        } else {
            Ok(result)
        }
    }
}

pub struct Pattern {
    fragments: Vec<Fragment>,
}

impl Pattern {
    pub fn new(fragments: Vec<Fragment>) -> Self {
        Pattern { fragments }
    }

    pub fn generate(
        &self,
        patterns: &HashMap<String, Pattern>,
        generation_depth: u32,
    ) -> anyhow::Result<String> {
        if generation_depth > MAX_GENERATION_DEPTH {
            return Err(anyhow::anyhow!("Max generation depth reached"));
        }

        let mut rng = thread_rng();

        // choose weighted random from fragments
        let dist = WeightedIndex::new(self.fragments.iter().map(|fragment| fragment.weight))?;

        let fragment = &self.fragments[dist.sample(&mut rng)];
        fragment.generate(patterns, generation_depth)
    }
}

pub struct Generation {
    patterns: HashMap<String, Pattern>,
}

impl Default for Generation {
    fn default() -> Self {
        Generation {
            patterns: HashMap::new(),
        }
    }
}

impl Generation {
    pub fn new() -> Self {
        Generation::default()
    }

    pub fn add_pattern(&mut self, name: String, pattern: Pattern) {
        self.patterns.insert(name, pattern);
    }

    pub fn generate(&self, name: &str) -> anyhow::Result<String> {
        if let Some(pattern) = self.patterns.get(name) {
            pattern.generate(&self.patterns, 0)
        } else {
            Err(anyhow::anyhow!("Pattern not found: {}", name))
        }
    }
}