/**
 * @file index.js
 * TXTRA パーサー・コンバーターのエントリーポイント。
 * parseTXTRA, toCanonical, toMarkdown, toMermaid, mermaidToTXTRA を提供します。
 */

export { parseTXTRA, buildAst } from './ast.js';
export { tokenize, parseIndent, splitArrayValues } from './lexer.js';
export { toCanonical } from './canonical.js';
export { toMarkdown } from './markdown.js';
export { toMermaid } from './mermaid.js';
export { mermaidToTXTRA, default as fromMermaid } from './mermaidToTxtra.js';
export { stringifyTXTRA, default as stringify } from './serializer.js';
export { markdownToTXTRA, default as fromMarkdown } from './markdownToTxtra.js';
export { toJsonWithSchema, default as toJson } from './schema.js';

import { parseTXTRA } from './ast.js';
import { toCanonical } from './canonical.js';
import { toMarkdown } from './markdown.js';
import { toMermaid } from './mermaid.js';
import { mermaidToTXTRA } from './mermaidToTxtra.js';
import { stringifyTXTRA } from './serializer.js';
import { markdownToTXTRA } from './markdownToTxtra.js';
import { toJsonWithSchema } from './schema.js';

/**
 * TXTRA テキストを一括変換するファサードオブジェクト。
 * @param {string} source - TXTRA ソーステキスト
 */
export function txtra(source) {
  const ast = parseTXTRA(source);
  return {
    ast,
    toCanonical: () => toCanonical(ast),
    toMarkdown: (options) => toMarkdown(ast, options),
    toMermaid: (dir) => toMermaid(source, dir),
    stringify: () => stringifyTXTRA(ast),
    toJson: (schema, options) => toJsonWithSchema(ast, schema, options)
  };
}

txtra.parse = parseTXTRA;
txtra.stringify = stringifyTXTRA;
txtra.fromMarkdown = markdownToTXTRA;
txtra.fromMermaid = mermaidToTXTRA;
txtra.toJson = toJsonWithSchema;

export default txtra;
