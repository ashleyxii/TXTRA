/**
 * @file tests/mermaidMarkdown.test.js
 * TXTRA Arrow Syntax と Markdown 内 Mermaid フローチャートの相互変換テスト。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { txtra, parseTXTRA, toMarkdown, markdownToTXTRA, mermaidToTXTRA, toMermaid } from '../src/index.js';

test('mermaidToTXTRA: Mermaid flowchart を TXTRA Arrow 記法へ正しく変換できる', () => {
  const mermaid = `\`\`\`mermaid
flowchart LR
  n0["Client"] --> n1["API Gateway"]
  n1["API Gateway"] -->|"auth"| n2["Microservice"]
  n2["Microservice"] -->|"verify (token)"| n3["AuthServer"]
\`\`\``;

  const txtraArrow = mermaidToTXTRA(mermaid);
  const lines = txtraArrow.split('\n');

  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Client >> API Gateway');
  assert.equal(lines[1], 'API Gateway --auth-> Microservice');
  assert.equal(lines[2], 'Microservice --verify-> AuthServer: token');
});

test('toMarkdown: Arrow 構文を含むコンテナが Markdown 内の Mermaid ブロックとして展開される', () => {
  const input = `
Workflow:
  Client    >>    API Gateway
  API Gateway    --auth->    Microservice
`;

  const ast = parseTXTRA(input);
  const md = toMarkdown(ast);

  assert.match(md, /- \*\*Workflow\*\*:/);
  assert.match(md, /```mermaid/);
  assert.match(md, /flowchart LR/);
  assert.match(md, /Client/);
  assert.match(md, /API Gateway/);
  assert.match(md, /Microservice/);
});

test('markdownToTXTRA: Markdown 内の Mermaid コードブロックが TXTRA Arrow 構文へ自動逆変換される', () => {
  const md = `- **Workflow**:

\`\`\`mermaid
flowchart LR
  n0["Client"] --> n1["API Gateway"]
  n1["API Gateway"] -->|"auth"| n2["Microservice"]
\`\`\``;

  const txt = markdownToTXTRA(md);
  const ast = parseTXTRA(txt);

  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Workflow');
  assert.equal(ast[0].data.length, 2);
  assert.match(ast[0].data[0].data[0], /Client/);
  assert.match(ast[0].data[1].data[0], /API Gateway/);
});

test('Round-trip (往復) 検証: TXTRA -> Markdown with Mermaid -> TXTRA で木構造が維持される', () => {
  const originalTxtra = `Workflow:
  Client    >>    API Gateway
  API Gateway    >>    Microservice`;

  // 1. TXTRA -> Markdown (Mermaid ブロック埋め込み)
  const ast1 = parseTXTRA(originalTxtra);
  const md = toMarkdown(ast1);

  // 2. Markdown -> TXTRA (Mermaid ブロックを Arrow 構文へ復元)
  const restoredTxtra = markdownToTXTRA(md);
  const ast2 = parseTXTRA(restoredTxtra);

  assert.equal(ast2.length, 1);
  assert.equal(ast2[0].node, 'Workflow');
  assert.equal(ast2[0].data.length, 2);
  assert.match(ast2[0].data[0].data[0], /Client/);
  assert.match(ast2[0].data[0].data[0], /API Gateway/);
  assert.match(ast2[0].data[1].data[0], /Microservice/);
});

test('txtra ファサード: fromMermaid ショートカットが動作する', () => {
  const mermaid = `flowchart LR\n  n0["A"] --> n1["B"]`;
  const result = txtra.fromMermaid(mermaid);
  assert.equal(result.trim(), 'A >> B');
});
