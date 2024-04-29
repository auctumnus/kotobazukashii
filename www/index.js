import init, * as wasm from "./kozuka.js";

const checkForDuplicatePatterns = () => {
  const patternList = document.getElementById("patterns");
  const patternRows = patternList.getElementsByClassName("pattern-row");

  const patternNames = [...patternRows].map((row) => {
    return row.getElementsByClassName("name")[0].value;
  });

  const duplicates = patternNames.filter((name, index) => {
    return name !== "" && patternNames.indexOf(name) !== index;
  });

  // add .error to duplicate rows
  [...patternRows].forEach((row) => {
    const name = row.getElementsByClassName("name")[0].value;
    if (duplicates.includes(name)) {
      row.getElementsByClassName("name")[0].classList.add("error");
    } else {
      row.getElementsByClassName("name")[0].classList.remove("error");
    }
  });

  const error = document.getElementById("error");
  if (duplicates.length > 0) {
    error.hidden = false;
    error.innerText = `Duplicate pattern names: ${duplicates.join(", ")}`;
  } else {
    error.hidden = true;
  }
};

const showError = (message) => {
  const error = document.getElementById("error");
  error.hidden = false;
  error.innerText = message;
};

const collectPatterns = () => {
  const patternList = document.getElementById("patterns");
  const patternRows = patternList.getElementsByClassName("pattern-row");

  const patterns = [...patternRows].map((row) => {
    const name = row.getElementsByClassName("name")[0].value;
    const pattern = row.getElementsByClassName("pattern")[0].value;

    return { name, pattern };
  });

  const mainPattern = document.getElementById("main-pattern-input").value;
  if (mainPattern.length === 0) {
    showError("Main pattern is required.");
    throw new Error("Main pattern is required.");
  }
  patterns.push({ name: "main", pattern: mainPattern });

  return patterns;
};
// note: we can't actually filter out empty p.names, because the user might reference one of them
const getPatterns = () =>
  collectPatterns()
    .filter((p) => p.pattern)
    .map((p) => wasm.make_pattern(p.name, p.pattern));

const collectSettings = () => {
  let numWords = Number(document.getElementById("num-words").value.toString());
  if (Number.isNaN(numWords)) {
    numWords = null;
  }
  const newLineEach = document.getElementById("new-line-each").checked || false;
  const filterDuplicates =
    document.getElementById("filter-duplicates").checked || false;

  return { numWords, newLineEach, filterDuplicates };
};

const getSettings = () => {
  const { numWords, newLineEach, filterDuplicates } = collectSettings();
  if (!numWords) {
    showError("Invalid number of words.");
    throw new Error("Invalid number of words.");
  }

  return wasm.make_generation_meta(numWords, newLineEach, filterDuplicates);
};

const getInputs = () =>
  wasm.make_generation_settings(getSettings(), getPatterns());

const saveToLocalstorage = () => {
  const all = collectAll();
  const json = JSON.stringify(all);
  localStorage.setItem("kozuka", json);
};

const addPatternRow = () => {
  const patternTemplate = document.getElementById("pattern-row");
  const newPattern = patternTemplate.content.cloneNode(true);

  const nameInput =
    newPattern.firstElementChild.getElementsByClassName("name")[0];
  const patternInput =
    newPattern.firstElementChild.getElementsByClassName("pattern")[0];

  nameInput.addEventListener("input", checkForDuplicatePatterns);
  nameInput.addEventListener("input", saveToLocalstorage);
  patternInput.addEventListener("input", saveToLocalstorage);

  const patternList = document.getElementById("patterns");

  const addButton = document.getElementById("add-pattern");

  patternList.insertBefore(newPattern, addButton);
};

const generate = () => {
  const inputs = getInputs();
  const output = document.getElementById("output");
  const error = document.getElementById("error");

  error.hidden = true;
  output.innerText = "";

  try {
    const result = wasm.generate(inputs);
    const newLineEach =
      document.getElementById("new-line-each").checked || false;
    if (newLineEach) {
      output.innerText = result.join("\n");
    } else {
      output.innerText = result.join(" ");
    }
  } catch (e) {
    console.error(e);
    showError(e);
  }
};

const collectAll = () => ({
  patterns: collectPatterns(),
  settings: collectSettings(),
});

const openSaveModal = () => {
  const modal = document.getElementById("save-modal");
  modal.showModal();
  requestAnimationFrame(() => {
    modal.classList.add("open");
  });
};

const closeSaveModal = () => {
  const modal = document.getElementById("save-modal");
  modal.classList.remove("open");
  setTimeout(() => {
    document.getElementById("save-filename").classList.remove("error");
    document.getElementById("modal-error").textContent = "";
    modal.close();
  }, 100);
};

const defaults = {
  patterns: [
    { name: "V", pattern: "a/i/u" },
    { name: "C", pattern: "p/t/k/s/m/n" },
    { name: "N", pattern: "m/n" },
    { name: "main", pattern: "{C}{V}({C}{V})({N})" },
  ],
  settings: {
    numWords: 5,
    newLineEach: false,
    filterDuplicates: false,
  },
};

const save = () => {
  document.getElementById("save-filename").classList.remove("error");
  document.getElementById("modal-error").textContent = "";

  const all = collectAll();
  const json = JSON.stringify(all);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = document.getElementById("save-filename").value;
  if (!filename) {
    document.getElementById("save-filename").classList.add("error");
    document.getElementById("modal-error").textContent =
      "Filename is required.";
    return;
  }
  a.download = filename;
  a.click();

  closeSaveModal();
};

const load = (json) => {
  try {
    const all = JSON.parse(json);
    const { patterns, settings } = all;
    if (!patterns || !settings) {
      showError("JSON file is invalid: top level properties missing.");
      return;
    }
    if (!Array.isArray(patterns)) {
      showError(
        "JSON file is invalid: patterns property is of the wrong type.",
      );
      return;
    }
    if (
      !(
        typeof settings === "object" &&
        !Array.isArray(settings) &&
        settings !== null
      )
    ) {
      showError(
        "JSON file is invalid: settings property is of the wrong type.",
      );
      return;
    }

    const patternList = document.getElementById("patterns");
    const patternRows = patternList.getElementsByClassName("pattern-row");
    [...patternRows].forEach((row) => row.remove());

    patterns.forEach((p) => {
      if (typeof p.name !== "string" || typeof p.pattern !== "string") {
        showError("JSON file is invalid: One or more patterns are invalid.");
        return;
      }
      if (p.name === "main") {
        document.getElementById("main-pattern-input").value = p.pattern;
        return;
      }
      addPatternRow();
      const newPattern = patternList.querySelector(".pattern-row:last-of-type");
      newPattern.getElementsByClassName("name")[0].value = p.name;
      newPattern.getElementsByClassName("pattern")[0].value = p.pattern;
    });

    if (typeof settings.numWords !== "number") {
      showError("JSON file is invalid: numWords is not a number.");
      settings.numWords = 100;
    }

    if (typeof settings.newLineEach !== "boolean") {
      showError("JSON file is invalid: newLineEach is not a boolean.");
      settings.newLineEach = false;
    }

    if (typeof settings.filterDuplicates !== "boolean") {
      showError("JSON file is invalid: filterDuplicates is not a boolean");
      settings.filterDuplicates = false;
    }

    document.getElementById("num-words").value = settings.numWords || 100;
    document.getElementById("new-line-each").checked =
      settings.newLineEach || false;
    document.getElementById("filter-duplicates").checked =
      settings.filterDuplicates || false;
  } catch (e) {
    showError(`Error loading file: ${e}`);
  }
};

const setup = () => {
  const saved = localStorage.getItem("kozuka");
  if (saved) {
    load(saved);
  } else {
    load(JSON.stringify(defaults));
  }

  const addButton = document.getElementById("add-pattern");
  addButton.addEventListener("click", addPatternRow);

  const generateButton = document.getElementById("generate");
  generateButton.addEventListener("click", generate);

  const modal = document.getElementById("save-modal");
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSaveModal();
    }
  });

  const saveButton = document.getElementById("save");
  saveButton.addEventListener("click", openSaveModal);

  const saveFileButton = document.getElementById("save-file");
  saveFileButton.addEventListener("click", save);

  const cancelModalButton = document.getElementById("cancel");
  cancelModalButton.addEventListener("click", closeSaveModal);

  const fileInput = document.getElementById("load-file");
  const loadFileButton = document.getElementById("load");
  loadFileButton.addEventListener("click", () => {
    fileInput.click();
  });
  fileInput.addEventListener("input", () => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      load(reader.result);
    });
    reader.readAsText(file);
  });
};

init().then(setup);
