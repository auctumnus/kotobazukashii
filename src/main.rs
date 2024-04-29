use generation::Generation;

use crate::parsing::parse_pattern;

mod generation;
mod parsing;

fn main() {
    let mut generation = Generation::default();
    let pattern1 = parse_pattern("{C}").unwrap();
    generation.add_pattern("A".to_owned(), pattern1);
    generation.add_pattern("C".to_owned(), parse_pattern("p/t/k").unwrap());
    print!("{:?}", generation.generate("A"));
}
