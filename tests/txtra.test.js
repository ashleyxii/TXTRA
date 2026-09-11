import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTXTRA, toCanonical, toMarkdown, toMermaid, txtra } from '../src/index.js';

const SAMPLE_TXTRA = `: Heading1
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

test('parseTXTRA: TXTRA.md の基本構文を正しく NodeTree に変換できる', () => {
  const ast = parseTXTRA(SAMPLE_TXTRA);

  assert.equal(ast.length, 5);
  assert.deepEqual(ast[0], { node: '_H1', data: ['Heading1'] });
  assert.deepEqual(ast[1], { node: '_H2', data: ['Heading2'] });
  assert.deepEqual(ast[2], { node: '_', data: ['the text'] });
  assert.deepEqual(ast[3], { node: '_', data: ['the next'] });

  const structure = ast[4];
  assert.equal(structure.node, 'Structure');
  assert.equal(structure.data.length, 6);

  // 1. description
  assert.deepEqual(structure.data[0], { node: '_', data: ['description'] });

  // 2. NODE: DATA
  assert.deepEqual(structure.data[1], { node: 'NODE', data: ['DATA'] });

  // 3. ARRAY: A    R    R    A    Y (空白4つで配列化)
  assert.deepEqual(structure.data[2], {
    node: 'ARRAY',
    data: ['A', 'R', 'R', 'A', 'Y']
  });

  // 4. Matrix: (行列要素)
  assert.equal(structure.data[3].node, 'Matrix');
  assert.deepEqual(structure.data[3].data, [
    { node: '_', data: ['M', 'A', 'T'] },
    { node: '_', data: ['R', 'I', 'X'] }
  ]);

  // 5. NODE: duplication: enable
  assert.equal(structure.data[4].node, 'NODE');
  assert.deepEqual(structure.data[4].data, [
    { node: 'duplication', data: ['enable'] }
  ]);

  // 6. .NODE: -> ref.latest.NODE
  assert.equal(structure.data[5].node, 'ref.latest.NODE');
  assert.deepEqual(structure.data[5].data, [
    { node: '_', data: ['Dot prefix means reference latest.'] }
  ]);
});

test('toCanonical: NodeTree を仕様通りの CanonicalForm に変換できる', () => {
  const ast = parseTXTRA(SAMPLE_TXTRA);
  const canonical = toCanonical(ast);

  assert.equal(canonical[0], 'nodeName, dataList');
  assert.deepEqual(canonical[1], ['_H1', 'Heading1']);
  assert.deepEqual(canonical[2], ['_H2', 'Heading2']);
  assert.deepEqual(canonical[3], ['_', 'the text']);
  assert.deepEqual(canonical[4], ['_', 'the next']);

  const structCanonical = canonical[5];
  assert.equal(structCanonical[0], 'Structure');
  assert.deepEqual(structCanonical[1], ['_', 'description']);
  assert.deepEqual(structCanonical[2], ['NODE', 'DATA']);
  assert.deepEqual(structCanonical[3], ['ARRAY', 'A', 'R', 'R', 'A', 'Y']);
  assert.deepEqual(structCanonical[4], [
    'Matrix',
    ['_', 'M', 'A', 'T'],
    ['_', 'R', 'I', 'X']
  ]);
  assert.deepEqual(structCanonical[5], [
    'NODE',
    ['duplication', 'enable']
  ]);
  assert.deepEqual(structCanonical[6], [
    'ref.latest.NODE',
    ['_', 'Dot prefix means reference latest.']
  ]);
});

test('toMarkdown: NodeTree を TXTRA.md 仕様の Markdown にレンダリングできる', () => {
  const ast = parseTXTRA(SAMPLE_TXTRA);
  const md = toMarkdown(ast);

  assert.match(md, /^# Heading1/m);
  assert.match(md, /^## Heading2/m);
  assert.match(md, /^the text {2}$/m);
  assert.match(md, /^- \*\*Structure\*\*:/m);
  assert.match(md, /^  - description$/m);
  assert.match(md, /^  - \*\*NODE\*\*: DATA$/m);
  assert.match(md, /^  - \*\*ARRAY\*\*: A {4}R {4}R {4}A {4}Y$/m);
  assert.match(md, /^  - \n {4}\| \| \| \|\n {4}\|-\|-\|-\|\n {4}\|M\|A\|T\|\n {4}\|R\|I\|X\|/m);
  assert.match(md, /^  - \*\*NODE\*\*:\n {4}- \*\*duplication\*\*: enable$/m);
  assert.match(md, /^  - \*\*ref\.latest\.NODE\*\*:\n {4}- Dot prefix means reference latest\.$/m);
});

test('toMermaid: Arrow Syntax を Mermaid フローチャートに変換できる', () => {
  const arrowText = `
Arrow Syntax:
  A    >>    B
  A    --arrow->    B
chain:
  A    >>    B    >>    C    >>    D
`;
  const mermaid = toMermaid(arrowText);
  assert.match(mermaid, /```mermaid/);
  assert.match(mermaid, /\["A"\] --> \w+\["B"\]/);
  assert.match(mermaid, /\["A"\] -->\|"arrow"\| \w+\["B"\]/);
  assert.match(mermaid, /\["B"\] --> \w+\["C"\]/);
  assert.match(mermaid, /\["C"\] --> \w+\["D"\]/);
});

test('エスケープ処理: コロンやインラインコードが誤分割されない', () => {
  const input = `
title: \`foo: bar\`
escaped: Hello\\: World
`;
  const ast = parseTXTRA(input);
  assert.deepEqual(ast[0], { node: 'title', data: ['`foo: bar`'] });
  assert.deepEqual(ast[1], { node: 'escaped', data: ['Hello: World'] });
});

test('コードブロック: ``` 内の内容がそのまま保持される', () => {
  const input = `
CodeBlock:
\`\`\`javascript
const x = 10;
console.log(x);
\`\`\`
`;
  const ast = parseTXTRA(input);
  const codeNode = ast.find(n => n.node === '_CODE');
  assert.ok(codeNode);
  assert.equal(codeNode.lang, 'javascript');
  assert.equal(codeNode.data[0], 'const x = 10;\nconsole.log(x);');

  const md = toMarkdown(ast);
  assert.match(md, /```javascript\nconst x = 10;\nconsole\.log\(x\);\n```/);
});

test('Arrow Syntax: Fanout と Union の変換', () => {
  const input = `
Fanout    >>    D    E    F
D    E    F    >>    Union
`;
  const mermaid = toMermaid(input);
  assert.match(mermaid, /\["Fanout"\] --> \w+\["D"\]/);
  assert.match(mermaid, /\["Fanout"\] --> \w+\["E"\]/);
  assert.match(mermaid, /\["Fanout"\] --> \w+\["F"\]/);
  assert.match(mermaid, /\["D"\] --> \w+\["Union"\]/);
  assert.match(mermaid, /\["E"\] --> \w+\["Union"\]/);
  assert.match(mermaid, /\["F"\] --> \w+\["Union"\]/);
});

test('txtra ファサード: 全メソッドをワンストップで利用可能', () => {
  const doc = txtra(SAMPLE_TXTRA);
  assert.ok(Array.isArray(doc.ast));
  assert.ok(Array.isArray(doc.toCanonical()));
  assert.ok(typeof doc.toMarkdown() === 'string');
});

test('仮想改行: .: または .:␣ による1行入力の改行展開', () => {
  const oneLiner = 'Title: .: - Child1 .: - Child2 .: End: OK';
  const ast = parseTXTRA(oneLiner);

  assert.equal(ast.length, 2);
  assert.equal(ast[0].node, 'Title');
  assert.equal(ast[0].data.length, 2);
  assert.deepEqual(ast[0].data[0], { node: '_', data: ['Child1'] });
  assert.deepEqual(ast[0].data[1], { node: '_', data: ['Child2'] });
  assert.deepEqual(ast[1], { node: 'End', data: ['OK'] });

  // 1行内でのスペースによる多段ネスト (親 -> 子 -> 孫)
  const nestedOneLiner = 'Parent: .:   Child: .:     GrandChild: DATA';
  const nestedAst = parseTXTRA(nestedOneLiner);
  assert.equal(nestedAst.length, 1);
  assert.equal(nestedAst[0].node, 'Parent');
  assert.equal(nestedAst[0].data[0].node, 'Child');
  assert.equal(nestedAst[0].data[0].data[0].node, 'GrandChild');
  assert.deepEqual(nestedAst[0].data[0].data[0].data, ['DATA']);
});

test('タブ文字インデント: \\t がインデント1レベルとして解釈される', () => {
  const tabInput = 'Parent:\n\tChild: Hello';
  const ast = parseTXTRA(tabInput);

  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Parent');
  assert.deepEqual(ast[0].data[0], { node: 'Child', data: ['Hello'] });
});

test('配列セパレーター: 空白2文字以上およびタブ文字（TSV）での分割', () => {
  // 空白2文字
  const twoSpaces = 'DATA: A  B  C';
  const ast1 = parseTXTRA(twoSpaces);
  assert.deepEqual(ast1[0].data, ['A', 'B', 'C']);

  // タブ文字 (TSVコピペデータ)
  const tsvInput = 'Matrix:\n  1\t2\t3\n  4\t5\t6';
  const ast2 = parseTXTRA(tsvInput);
  assert.deepEqual(ast2[0].data[0], { node: '_', data: ['1', '2', '3'] });
  assert.deepEqual(ast2[0].data[1], { node: '_', data: ['4', '5', '6'] });
});

test('明示リスト (- , *): インデントなしでも直前の親ノード下に自動ネストされる', () => {
  const input = `
Category:
- Item1
- Item2
* Item3
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Category');
  assert.equal(ast[0].data.length, 3);
  assert.deepEqual(ast[0].data[0], { node: '_', data: ['Item1'] });
  assert.deepEqual(ast[0].data[1], { node: '_', data: ['Item2'] });
  assert.deepEqual(ast[0].data[2], { node: '_', data: ['Item3'] });
});

test('明示リスト (- , *): 親ノードがない場合はトップレベルのリストとしてパースされる', () => {
  const input = `
- TopItem1
- TopItem2
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 2);
  assert.deepEqual(ast[0], { node: '_', data: ['TopItem1'] });
  assert.deepEqual(ast[1], { node: '_', data: ['TopItem2'] });
});

test('寛容な矢印記法: →, -->, ->, ==>, -.-> の解釈', () => {
  const input = `
A → B
C --> D
E -> F
G ==> H
I -.-> J
`;
  const mermaid = toMermaid(input);
  assert.match(mermaid, /\["A"\] --> \w+\["B"\]/);
  assert.match(mermaid, /\["C"\] --> \w+\["D"\]/);
  assert.match(mermaid, /\["E"\] --> \w+\["F"\]/);
  assert.match(mermaid, /\["G"\] --> \w+\["H"\]/);
  assert.match(mermaid, /\["I"\] --> \w+\["J"\]/);
});

test('防弾 Mermaid: 空白、括弧、コロン説明、行頭継続、予約語が安全に変換される', () => {
  const input = `
Arrow Syntax:
  User (Web)    >>    Auth Service[OAuth]
  Auth Service[OAuth]    >>    DB: primary storage
  A    --toAnother->    A
  --toJustBeforeReference->   .A
chain:
  start    >>    process    >>    end
`;
  const mermaid = toMermaid(input);

  // 1. 括弧や空白を含んでいても id["..."] で安全化されている
  assert.match(mermaid, /\["User \(Web\)"\] --> \w+\["Auth Service\[OAuth\]"\]/);
  // 2. コロン説明が矢印ラベルになっている
  assert.match(mermaid, /-->\|"primary storage"\| \w+\["DB"\]/);
  // 3. 行頭からの矢印継続が直前ノードから繋がっている
  assert.match(mermaid, /\["A"\] -->\|"toJustBeforeReference"\| \w+\["\.A"\]/);
  // 4. 予約語 end も安全なノードとして処理される
  assert.match(mermaid, /\["process"\] --> \w+\["end"\]/);
});

test('コロンなしインデント: node ← value の昇格によるコンテナ化とネスト', () => {
  const input = `
Fruits
  apple
  banana
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Fruits');
  assert.deepEqual(ast[0].data, [
    { node: '_', data: ['apple'] },
    { node: '_', data: ['banana'] }
  ]);
});

test('コロンなしインデント: 多段ネスト（親 → 子 → 孫）の自動昇格', () => {
  const input = `
Universe
  Galaxy
    SolarSystem
      Earth
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Universe');
  assert.equal(ast[0].data[0].node, 'Galaxy');
  assert.equal(ast[0].data[0].data[0].node, 'SolarSystem');
  assert.deepEqual(ast[0].data[0].data[0].data[0], { node: '_', data: ['Earth'] });
});

test('コロンなしインデント: 明示リスト (- , *) による昇格', () => {
  const input = `
Categories
- Books
- Games
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Categories');
  assert.deepEqual(ast[0].data, [
    { node: '_', data: ['Books'] },
    { node: '_', data: ['Games'] }
  ]);
});

test('末尾空白: 行末スペースによる空文字 ("") の配列化が発生しないこと', () => {
  // 1. テキスト行末尾に空白2つ
  const ast1 = parseTXTRA('item  ');
  assert.deepEqual(ast1[0].data, ['item']);

  // 2. キーバリュー末尾に空白2つ
  const ast2 = parseTXTRA('key: value  ');
  assert.deepEqual(ast2[0].data, ['value']);

  // 3. 配列セパレーター末尾に空白2つ
  const ast3 = parseTXTRA('key: A  B  ');
  assert.deepEqual(ast3[0].data, ['A', 'B']);

  // 4. TSV / 複数スペース末尾
  const ast4 = parseTXTRA('col1\tcol2\t  ');
  assert.deepEqual(ast4[0].data, ['col1', 'col2']);
});

test('二重ドット (..) 構文: コロンの代替エイリアスとして KEY.. と KEY.. VALUE が正しくパースされる', () => {
  const input = `
User..
  name.. Alice
  age.. 25
  tags.. dev    lead
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'User');
  assert.deepEqual(ast[0].data, [
    { node: 'name', data: ['Alice'] },
    { node: 'age', data: ['25'] },
    { node: 'tags', data: ['dev', 'lead'] }
  ]);
});

test('二重ドット (..) 構文: ドット参照 .KEY.. が正しく ref.latest.KEY としてパースされる', () => {
  const input = `
Server..
  host.. localhost
.Server..
  port.. 8080
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 2);
  assert.equal(ast[0].node, 'Server');
  assert.equal(ast[1].node, 'ref.latest.Server');
  assert.deepEqual(ast[1].data, [
    { node: 'port', data: ['8080'] }
  ]);
});

test('二重ドット (..) 構文: 相対パス (../)、数値範囲 (1..10)、三点リーダー (...) との衝突・誤爆がないこと', () => {
  const input = `
Config..
  path.. ../src/index.js
  range.. 1..10
  status.. wait...
`;
  const ast = parseTXTRA(input);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].node, 'Config');
  assert.deepEqual(ast[0].data, [
    { node: 'path', data: ['../src/index.js'] },
    { node: 'range', data: ['1..10'] },
    { node: 'status', data: ['wait...'] }
  ]);
});
