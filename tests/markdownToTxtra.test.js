import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTXTRA, toMarkdown, markdownToTXTRA, txtra } from '../src/index.js';

const SAMPLE_MARKDOWN = `# Heading1
## Heading2
the text  
the next  
- **Structure**:
  - description  
  - **NODE**: DATA
  - **ARRAY**: A    R    R    A    Y
  - **Matrix**:
    - M    A    T
    - R    I    X
  - **NODE**:
    - **duplication**: enable
  - **ref.latest.NODE**:
    - Dot prefix means reference latest.`;

test('markdownToTXTRA: Markdown から TXTRA 構文へ正しく変換できる', () => {
  const converted = markdownToTXTRA(SAMPLE_MARKDOWN);

  assert.match(converted, /^: Heading1/m);
  assert.match(converted, /^:: Heading2/m);
  assert.match(converted, /^the text$/m);
  assert.match(converted, /^the next$/m);
  assert.match(converted, /^Structure:/m);
  assert.match(converted, /^  description$/m);
  assert.match(converted, /^  NODE: DATA$/m);
  assert.match(converted, /^  ARRAY: A    R    R    A    Y$/m);
  assert.match(converted, /^  Matrix:\n    M    A    T\n    R    I    X/m);
  assert.match(converted, /^  NODE:\n    duplication: enable$/m);
  assert.match(converted, /^  \.NODE:\n    Dot prefix means reference latest\.$/m);
});

test('Round-trip (往復) テスト: TXTRA -> Markdown -> TXTRA -> AST で木構造が完全一致する', () => {
  const originalTxtra = `: Heading1
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

  const astOriginal = parseTXTRA(originalTxtra);
  const md = toMarkdown(astOriginal);
  const restoredTxtra = markdownToTXTRA(md);
  const astRestored = parseTXTRA(restoredTxtra);

  // Markdown 経由で復元しても AST が完全一致すること
  assert.deepEqual(astOriginal, astRestored);
});

test('コードブロックと水平線の変換', () => {
  const md = `
# Code Example
---
\`\`\`python
print("Hello World")
\`\`\`
`;
  const txtraText = markdownToTXTRA(md);
  assert.match(txtraText, /^: Code Example/m);
  assert.match(txtraText, /^------/m);
  assert.match(txtraText, /```python\nprint\("Hello World"\)\n```/m);
});

test('txtra.fromMarkdown ファサード関数が動作する', () => {
  const result = txtra.fromMarkdown('# Title\n- **key**: value');
  assert.match(result, /^: Title/m);
  assert.match(result, /^key: value/m);
});
