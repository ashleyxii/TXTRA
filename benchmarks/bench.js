/**
 * @file benchmarks/bench.js
 * TXTRA の処理性能（スループット・所要時間）を客観的に計測するベンチマークスイート。
 * 外部依存なしで Node.js 組み込みの performance.now() を利用します。
 */

import { performance } from 'node:perf_hooks';
import { parseTXTRA } from '../src/ast.js';
import { stringifyTXTRA } from '../src/serializer.js';
import { toMarkdown } from '../src/markdown.js';
import { markdownToTXTRA } from '../src/markdownToTxtra.js';
import { toMermaid } from '../src/mermaid.js';

/**
 * ベンチマーク用の擬似 TXTRA データを生成する。
 * 通常テキスト、キーバリュー、見出し、コードブロック、エスケープ、リストを混在させる。
 * @param {number} targetLines - 生成目標行数
 * @returns {string} 生成された TXTRA テキスト
 */
function generateSampleTxtra(targetLines) {
  const lines = [];
  let current = 0;
  while (current < targetLines) {
    const idx = current++;
    const mod = idx % 10;
    if (mod === 0) {
      lines.push(`: Section Heading ${idx}`);
    } else if (mod === 1) {
      lines.push(`  user_${idx}: Alice status:active role:admin`);
    } else if (mod === 2) {
      lines.push(`  .latest_${idx}: val1    val2    val3`);
    } else if (mod === 3) {
      // エスケープやバッククオートを含む行
      lines.push(`  config_${idx}: \`const x = 10;\` \\:escaped-colon value`);
    } else if (mod === 4) {
      lines.push(`    - sub_item_${idx} detail description without colon`);
    } else if (mod === 5) {
      lines.push(`    * nested_item_${idx} another description`);
    } else if (mod === 6) {
      lines.push(`  plain text line number ${idx} with some description words`);
    } else if (mod === 7) {
      lines.push('  ```js');
      lines.push(`  console.log("hello from block ${idx}");`);
      lines.push('  ```');
      current += 2;
    } else if (mod === 8) {
      lines.push(`  Table:`);
      lines.push(`    Header1    Header2    Header3`);
      lines.push(`    valA_${idx}    valB_${idx}    valC_${idx}`);
      current += 2;
    } else {
      lines.push(`  metric_${idx}: 12345    67890`);
    }
  }
  return lines.join('\n');
}

/**
 * Mermaid 変換用の Arrow 構文サンプルテキストを生成する。
 * @param {number} count - 矢印行数
 * @returns {string}
 */
function generateArrowText(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push(`NodeA_${i} -> NodeB_${i} -> NodeC_${i}`);
    lines.push(`NodeC_${i} --label_${i}-> NodeD_${i}: description`);
  }
  return lines.join('\n');
}

/**
 * 指定した処理を複数回ウォームアップ＆計測し、平均所要時間を算出する。
 * @param {string} label - 計測ラベル
 * @param {() => void} fn - 計測対象関数
 * @param {number} iterations - 実行回数
 * @param {number} totalLines - 処理行数
 */
function runBenchmark(label, fn, iterations, totalLines) {
  // ウォームアップ（V8 JIT 最適化）
  for (let i = 0; i < Math.min(5, iterations); i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = performance.now() - start;
  const avgMs = elapsed / iterations;
  const linesPerSec = Math.round((totalLines * iterations) / (elapsed / 1000));

  console.log(
    `  ${label.padEnd(26)} | 平均: ${avgMs.toFixed(3).padStart(7)} ms | 速度: ${linesPerSec.toLocaleString().padStart(10)} lines/sec`
  );
  return { avgMs, linesPerSec };
}

console.log('================================================================');
console.log('               TXTRA パフォーマンス・ベンチマーク               ');
console.log('================================================================\n');

const testCases = [
  { name: '小規模 (100 行)', lines: 100, iterations: 100 },
  { name: '中規模 (1,000 行)', lines: 1000, iterations: 30 },
  { name: '大規模 (10,000 行)', lines: 10000, iterations: 5 }
];

for (const tc of testCases) {
  console.log(`--- [${tc.name}] (試行回数: ${tc.iterations} 回) ---`);
  const text = generateSampleTxtra(tc.lines);
  const actualLineCount = text.split('\n').length;

  let ast;
  runBenchmark('parseTXTRA', () => {
    ast = parseTXTRA(text);
  }, tc.iterations, actualLineCount);

  runBenchmark('stringifyTXTRA', () => {
    stringifyTXTRA(ast);
  }, tc.iterations, actualLineCount);

  let md;
  runBenchmark('toMarkdown', () => {
    md = toMarkdown(ast);
  }, tc.iterations, actualLineCount);

  const mdLines = md.split('\n').length;
  runBenchmark('markdownToTXTRA', () => {
    markdownToTXTRA(md);
  }, tc.iterations, mdLines);

  const arrowText = generateArrowText(Math.floor(tc.lines / 2));
  const arrowLines = arrowText.split('\n').length;
  runBenchmark('toMermaid', () => {
    toMermaid(arrowText);
  }, tc.iterations, arrowLines);

  console.log('');
}
