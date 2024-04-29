import init, * as wasm from "./kozuka.js";

const defaultPatterns = () => [
  wasm.make_pattern_input("C", "p/t/k/s/m/n"),
  wasm.make_pattern_input("V", "a/i/u"),
];
const defaultMeta = () => wasm.make_generation_meta(1, false, false);

const makeSettings = (mainPattern) =>
  wasm.make_generation_settings(defaultMeta(), [
    ...defaultPatterns(),
    wasm.make_pattern_input("main", mainPattern),
  ]);

const setupLiveExample = (root) => {
  const input = root.querySelector("input");
  const generateButton = root.querySelector("button.generate");
  const output = root.querySelector("div.output");

  generateButton.addEventListener("click", () => {
    try {
      const generationSettings = makeSettings(input.value);
      const result = wasm.generate(generationSettings);
      output.innerText = result[0];
    } catch (e) {
      console.error(e);
      output.innerText = `Error: ${e}`;
    }
  });
};

const setup = () => {
  const liveExamples = document.querySelectorAll("div.live-example");
  liveExamples.forEach(setupLiveExample);
};

init().then(setup);
