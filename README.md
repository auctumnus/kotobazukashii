# kotobazukashii

Kozuka (short for kotobazukashii (<a href="https://jisho.org/word/%E8%A8%80%E8%91%89">言葉</a> 
<i>kotoba</i> + <a href="https://jisho.org/word/%E6%81%A5%E3%81%9A%E3%81%8B%E3%81%97%E3%81%84">恥ずかしい</a> 
<i>hazukashii</i>, literally "embarrassing words")) is a word-generation program for conlanging. 
The interface and pattern language are based off of
<a href="https://web.archive.org/web/20240323210408/http://akana.conlang.org/tools/awkwords/">Awkwords</a>.

## Running

`just build-wasm`, then serve the `www` subfolder. Enzure that `kozuka_bg.wasm` and `kozuka.js` are in `www`.
Specific versions and so on are as in the `shell.nix`

## Pattern language

see `help.html`

main differences from awkwords are
- references are wrapped in `{}`
- filters come after weights
- capital letters allowed in text

## License

MIT