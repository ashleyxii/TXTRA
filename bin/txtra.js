#!/usr/bin/env node
/**
 * @file bin/txtra.js
 * TXTRA コマンドラインツール。
 * ファイルまたは標準入力から TXTRA を受け取り、AST / CanonicalForm / Markdown / Mermaid を標準出力します。
 */

import fs from 'node:fs';
import { txtra } from '../src/index.js';

function printHelp() {
  console.log(`
Usage: txtra [file] [options]

Options:
  --ast         NodeTree (AST) を JSON 出力
  --canonical   CanonicalForm を JSON 出力
  --markdown    Markdown に変換して出力 (デフォルト)
  --mermaid     Arrow Syntax から Mermaid を生成
  --stringify   JSON データを TXTRA テキストへ変換
  --to-txtra    Markdown テキストを TXTRA へ変換
  -h, --help    ヘルプを表示
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = args.filter(a => a.startsWith('-'));
  const files = args.filter(a => !a.startsWith('-'));

  if (options.includes('-h') || options.includes('--help')) {
    printHelp();
    return;
  }

  let input = '';
  if (files.length > 0) {
    input = fs.readFileSync(files[0], 'utf-8');
  } else {
    // 標準入力から読み込み
    input = fs.readFileSync(0, 'utf-8');
  }

  if (options.includes('--stringify')) {
    const data = JSON.parse(input);
    console.log(txtra.stringify(data));
    return;
  }

  if (options.includes('--to-txtra')) {
    console.log(txtra.fromMarkdown(input));
    return;
  }

  const doc = txtra(input);

  if (options.includes('--ast')) {
    console.log(JSON.stringify(doc.ast, null, 2));
  } else if (options.includes('--canonical')) {
    console.log(JSON.stringify(doc.toCanonical(), null, 2));
  } else if (options.includes('--mermaid')) {
    console.log(doc.toMermaid());
  } else {
    // デフォルトは Markdown
    console.log(doc.toMarkdown());
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
