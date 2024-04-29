use chumsky::prelude::*;
use std::error::Error;
use std::fmt::Display;

use crate::generation::{Fragment, Pattern, SubpatternPart};

fn text() -> impl Parser<char, String, Error = Simple<char>> {
    one_of("/^[](){}*")
        .not()
        .repeated()
        .at_least(1)
        .map(|s| s.iter().collect::<String>())
}

fn text_part() -> impl Parser<char, SubpatternPart, Error = Simple<char>> {
    text().map(SubpatternPart::Text)
}

fn optional(
    pattern: impl Parser<char, Pattern, Error = Simple<char>>,
) -> impl Parser<char, SubpatternPart, Error = Simple<char>> {
    pattern
        .delimited_by(just('('), just(')'))
        .map(|pattern| SubpatternPart::Optional(Box::new(pattern)))
}

fn subpattern(
    pattern: impl Parser<char, Pattern, Error = Simple<char>>,
) -> impl Parser<char, SubpatternPart, Error = Simple<char>> {
    pattern
        .delimited_by(just('['), just(']'))
        .map(|pattern| SubpatternPart::Subpattern(Box::new(pattern)))
}

fn reference() -> impl Parser<char, SubpatternPart, Error = Simple<char>> {
    text()
        .delimited_by(just('{'), just('}'))
        .map(SubpatternPart::Reference)
}

fn part(
    pattern: impl Parser<char, Pattern, Error = Simple<char>> + Clone,
) -> impl Parser<char, SubpatternPart, Error = Simple<char>> {
    choice((
        text_part(),
        optional(pattern.clone()),
        subpattern(pattern),
        reference(),
    ))
}

fn filter() -> impl Parser<char, String, Error = Simple<char>> {
    just('^').ignore_then(text())
}

fn weight() -> impl Parser<char, u32, Error = Simple<char>> {
    just('*').ignore_then(text().try_map(|s, span| {
        s.parse()
            .map_err(|_| Simple::custom(span, "Invalid weight"))
    }))
}

fn meta() -> impl Parser<char, (u32, Vec<String>), Error = Simple<char>> {
    weight()
        .or_not()
        .map(|weight| weight.unwrap_or(1))
        .then(filter().repeated())
        .or(filter()
            .repeated()
            .or_not()
            .then(weight())
            .map(|(filter, weight)| (weight, filter.unwrap_or(vec![]))))
}

fn fragment(
    pattern: impl Parser<char, Pattern, Error = Simple<char>> + Clone,
) -> impl Parser<char, Fragment, Error = Simple<char>> {
    part(pattern)
        .repeated()
        .then(meta())
        .map(|(parts, (weight, filters))| Fragment::new(parts, weight, filters))
}

fn pattern() -> impl Parser<char, Pattern, Error = Simple<char>> {
    recursive(|pattern| fragment(pattern).separated_by(just('/')).map(Pattern::new))
}

#[derive(Debug)]
struct ParseError {
    errors: Vec<Simple<char>>,
}

impl Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for error in &self.errors {
            writeln!(f, "{}", error)?;
        }
        Ok(())
    }
}

impl Error for ParseError {}

pub fn parse_pattern(input: &str) -> anyhow::Result<Pattern> {
    let result = pattern()
        .parse(input)
        .map_err(|error| ParseError { errors: error })?;
    Ok(result)
}
