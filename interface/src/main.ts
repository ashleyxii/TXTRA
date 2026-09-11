import './style.css';
import { txtra } from '../../src/index.js';

let currentMode = 'markdown';

const sample = `: Heading1
:: Heading2
the text
the next
Structure:
  description
  NODE: DATA
  ARRAY: A    R    R    A    Y
  Matrix:
    M    A    T
    R    I    X
  NODE:
    duplication: enable
  .NODE:
    Dot prefix means reference latest.`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="padding: 1rem; max-width: 1200px; margin: 0 auto; font-family: sans-serif;">
    <h1>TXTRA Parser Interface</h1>
    <div id="converter-selector" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
      <button id="btn-markdown">To Markdown</button>
      <button id="btn-canonical">To Canonical</button>
      <button id="btn-ast">To AST</button>
      <button id="btn-mermaid">To Mermaid</button>
      <button id="btn-stringify">Round-trip (Stringify)</button>
      <button id="btn-from-markdown">Markdown to TXTRA</button>
    </div>
    <div style="display: flex; gap: 1rem;">
      <textarea id="editor" spellcheck="false" style="width: 50%; height: 450px; font-family: monospace; font-size: 14px; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"></textarea>
      <pre id="output" style="width: 50%; height: 450px; overflow: auto; background: #222; color: #eee; padding: 0.75rem; border-radius: 4px; box-sizing: border-box; font-family: monospace; font-size: 13px;"></pre>
    </div>
  </div>
`;

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLPreElement;

function update() {
  try {
    const doc = txtra(editor.value);
    if (currentMode === 'markdown') {
      output.textContent = doc.toMarkdown();
    } else if (currentMode === 'canonical') {
      output.textContent = JSON.stringify(doc.toCanonical(), null, 2);
    } else if (currentMode === 'ast') {
      output.textContent = JSON.stringify(doc.ast, null, 2);
    } else if (currentMode === 'mermaid') {
      output.textContent = doc.toMermaid();
    } else if (currentMode === 'stringify') {
      output.textContent = doc.stringify();
    } else if (currentMode === 'fromMarkdown') {
      output.textContent = txtra.fromMarkdown(editor.value);
    }
  } catch (err: any) {
    output.textContent = 'Error: ' + err.message;
  }
}

editor.value = sample;
editor.addEventListener('input', update);

document.getElementById('btn-markdown')!.onclick = () => { currentMode = 'markdown'; update(); };
document.getElementById('btn-canonical')!.onclick = () => { currentMode = 'canonical'; update(); };
document.getElementById('btn-ast')!.onclick = () => { currentMode = 'ast'; update(); };
document.getElementById('btn-mermaid')!.onclick = () => { currentMode = 'mermaid'; update(); };
document.getElementById('btn-stringify')!.onclick = () => { currentMode = 'stringify'; update(); };
document.getElementById('btn-from-markdown')!.onclick = () => { currentMode = 'fromMarkdown'; update(); };

update();