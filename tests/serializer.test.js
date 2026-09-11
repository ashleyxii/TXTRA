import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTXTRA, toCanonical, stringifyTXTRA, txtra } from '../src/index.js';

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

test('stringifyTXTRA: AST から TXTRA テキストを正しく生成できる', () => {
  const ast = parseTXTRA(SAMPLE_TXTRA);
  const serialized = stringifyTXTRA(ast);

  assert.match(serialized, /^: Heading1/m);
  assert.match(serialized, /^:: Heading2/m);
  assert.match(serialized, /^the text$/m);
  assert.match(serialized, /^Structure:/m);
  assert.match(serialized, /^  description$/m);
  assert.match(serialized, /^  NODE: DATA$/m);
  assert.match(serialized, /^  ARRAY: A    R    R    A    Y$/m);
  assert.match(serialized, /^  Matrix:\n    M    A    T\n    R    I    X/m);
  assert.match(serialized, /^  NODE:\n    duplication: enable$/m);
  assert.match(serialized, /^  \.NODE:\n    Dot prefix means reference latest\.$/m);
});

test('stringifyTXTRA: CanonicalForm から TXTRA テキストを復元できる', () => {
  const ast = parseTXTRA(SAMPLE_TXTRA);
  const canonical = toCanonical(ast);
  const serialized = stringifyTXTRA(canonical);

  assert.match(serialized, /^: Heading1/m);
  assert.match(serialized, /^Structure:/m);
  assert.match(serialized, /^  NODE: DATA$/m);
  assert.match(serialized, /^  Matrix:/m);
});

test('stringifyTXTRA: プレーンな JS オブジェクトから TXTRA テキストを生成できる', () => {
  const data = {
    title: 'Hello TXTRA',
    server: {
      host: 'localhost',
      port: 8080
    },
    features: ['fast', 'readable', 'minimal']
  };

  const serialized = stringifyTXTRA(data);

  assert.match(serialized, /^title: Hello TXTRA/m);
  assert.match(serialized, /^server:\n  host: localhost\n  port: 8080/m);
  assert.match(serialized, /^features: fast    readable    minimal/m);
});

test('Round-trip (往復) テスト: parse -> stringify -> parse で AST が完全一致する', () => {
  const ast1 = parseTXTRA(SAMPLE_TXTRA);
  const text = stringifyTXTRA(ast1);
  const ast2 = parseTXTRA(text);

  // 往復しても AST の構造とデータが完全一致すること (MeaningPreserved = 1.0)
  assert.deepEqual(ast1, ast2);
});

test('txtra.stringify ファサード関数が動作する', () => {
  const doc = txtra(SAMPLE_TXTRA);
  assert.equal(typeof doc.stringify(), 'string');
  assert.match(doc.stringify(), /^: Heading1/m);

  assert.equal(typeof txtra.stringify(doc.ast), 'string');
});
