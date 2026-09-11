import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTXTRA, toMarkdown, markdownToTXTRA } from '../src/index.js';

test('Matrix: かつ 2行以上の場合、ヘッダーレス Markdown GFM 表構文としてレンダリングされる', () => {
  const input = `
Matrix:
  M    A    T
  R    I    X
`;
  const ast = parseTXTRA(input);
  const md = toMarkdown(ast);

  // 空ヘッダー行、区切り線、および全データ行が出力されること
  assert.match(md, /- \n {2}\| \| \| \|\n {2}\|-\|-\|-\|\n {2}\|M\|A\|T\|\n {2}\|R\|I\|X\|/);
});

test('Matrix: が 2行未満（1行のみ）の場合、通常のリスト形式にフォールバックする', () => {
  const input = `
Matrix:
  OnlyOneRow    A    B
`;
  const ast = parseTXTRA(input);
  const md = toMarkdown(ast);

  assert.match(md, /- \*\*Matrix\*\*:\n {2}- OnlyOneRow {4}A {4}B/);
  assert.doesNotMatch(md, /\|-\|/);
});

test('Table: かつ 2行以上の場合、Markdown GFM 表構文としてレンダリングされる', () => {
  const input = `
Table:
  Name    Age    Role
  Alice   24     Admin
  Bob     30     User
`;
  const ast = parseTXTRA(input);
  const md = toMarkdown(ast);

  // Table 表構文が生成されること
  assert.match(md, /- \*\*Table\*\*:/);
  assert.match(md, /\|\s*Name\s*\|\s*Age\s*\|\s*Role\s*\|/);
  assert.match(md, /\|\s*---\s*\|\s*---\s*\|\s*---\s*\|/);
  assert.match(md, /\|\s*Alice\s*\|\s*24\s*\|\s*Admin\s*\|/);
  assert.match(md, /\|\s*Bob\s*\|\s*30\s*\|\s*User\s*\|/);
});

test('Table: が 2行未満（1行のみ）の場合、通常のリスト形式にフォールバックする', () => {
  const input = `
Table:
  OnlyOneRow    A    B
`;
  const ast = parseTXTRA(input);
  const md = toMarkdown(ast);

  assert.match(md, /- \*\*Table\*\*:\n {2}- OnlyOneRow {4}A {4}B/);
  assert.doesNotMatch(md, /\|---\|/);
});

test('Markdown Table から TXTRA Table: への逆変換 (Round-trip)', () => {
  const md = `- **Table**:

  | Name | Age | Role |
  |---|---|---|
  | Alice | 24 | Admin |
  | Bob | 30 | User |`;

  const txtraText = markdownToTXTRA(md);
  assert.match(txtraText, /^Table:/m);
  assert.match(txtraText, /^ {2}Name {4}Age {4}Role/m);
  assert.match(txtraText, /^ {2}Alice {4}24 {4}Admin/m);

  // 逆変換後の TXTRA をパースして AST を確認
  const ast = parseTXTRA(txtraText);
  assert.equal(ast[0].node, 'Table');
  assert.equal(ast[0].data.length, 3);
  assert.deepEqual(ast[0].data[0].data, ['Name', 'Age', 'Role']);
  assert.deepEqual(ast[0].data[1].data, ['Alice', '24', 'Admin']);
  assert.deepEqual(ast[0].data[2].data, ['Bob', '30', 'User']);
});

test('Markdown ヘッダーレス Table から TXTRA Matrix: への逆変換 (Round-trip)', () => {
  const md = `- 
  | | | |
  |-|-|-|
  | M | A | T |
  | R | I | X |`;

  const txtraText = markdownToTXTRA(md);
  assert.match(txtraText, /^Matrix:/m);
  assert.match(txtraText, /^ {2}M {4}A {4}T/m);
  assert.match(txtraText, /^ {2}R {4}I {4}X/m);

  const ast = parseTXTRA(txtraText);
  assert.equal(ast[0].node, 'Matrix');
  assert.equal(ast[0].data.length, 2);
  assert.deepEqual(ast[0].data[0].data, ['M', 'A', 'T']);
  assert.deepEqual(ast[0].data[1].data, ['R', 'I', 'X']);
});
