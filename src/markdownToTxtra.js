/**
 * @file markdownToTxtra.js
 * Markdown 形式のテキストを TXTRA 記法へ変換するコンバーター。
 * 見出し、太字キー付きリスト、GFM テーブル構文、Mermaid コードブロック等を TXTRA 構文へマッピングします。
 */

import { mermaidToTXTRA } from './mermaidToTxtra.js';

export { mermaidToTXTRA };

/**
 * Markdown の1行を TXTRA の行表現へ変換する。
 * @param {string} rawLine - Markdown の1行文字列
 * @returns {string|null} 変換後の TXTRA 行（null の場合は行をスキップ）
 */
function convertLine(rawLine) {
  // 空行はそのまま
  if (rawLine.trim() === '') return '';

  // 1. テーブル区切り線 (|---|---|) はスキップ
  if (/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(rawLine)) {
    return null;
  }

  // 2. テーブルデータ行 (| cell1 | cell2 |)
  const tableMatch = rawLine.match(/^(\s*)\|(.*)\|\s*$/);
  if (tableMatch) {
    const indent = tableMatch[1];
    const cells = tableMatch[2].split('|').map(c => c.trim());
    return `${indent}${cells.join('    ')}`;
  }

  // 3. 見出し (# Heading -> : Heading)
  const headingMatch = rawLine.match(/^(\s*)(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const indent = headingMatch[1];
    const level = headingMatch[2].length;
    const title = headingMatch[3].trim();
    return `${indent}${':'.repeat(level)} ${title}`;
  }

  // 4. 水平線 (--- or *** -> ------)
  if (/^(\s*)(?:---|---|\*\*\*)\s*$/.test(rawLine)) {
    return '------';
  }

  // 5. リスト項目 (- または * または +)
  const listMatch = rawLine.match(/^(\s*)[-*+]\s+(.*)$/);
  if (listMatch) {
    const indent = listMatch[1];
    const body = listMatch[2];

    // 5a. 太字キー + ドット参照 (- **ref.latest.KEY**: value or - **ref.latest.KEY**:)
    const refKeyMatch = body.match(/^\*\*ref\.latest\.([^*]+)\*\*:\s*(.*)$/);
    if (refKeyMatch) {
      const key = refKeyMatch[1].trim();
      const val = refKeyMatch[2].trim();
      return `${indent}.${key}:${val ? ' ' + val : ''}`;
    }

    // 5b. 太字キー (- **KEY**: value or - **KEY**:)
    const keyMatch = body.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1].trim();
      const val = keyMatch[2].trim();
      return `${indent}${key}:${val ? ' ' + val : ''}`;
    }

    // 5c. 通常リスト項目 (- description) -> インデント内テキスト
    const cleanText = body.replace(/\s{2,}$/, '');
    return `${indent}${cleanText}`;
  }

  // 6. 通常の段落行（末尾の改行用スペースを整理）
  return rawLine.replace(/\s{2,}$/, '');
}

/**
 * Markdown 全体を TXTRA テキストへ変換する。
 * Mermaid コードブロック (```mermaid) は TXTRA の Arrow 記法へ自動復元されます。
 * @param {string} markdown - Markdown 文字列
 * @param {object} [options] - 変換オプション
 * @returns {string} TXTRA テキスト
 */
export function markdownToTXTRA(markdown, options = {}) {
  if (!markdown) return '';

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeFenceLang = '';
  let codeBlockBuffer = [];
  let currentContainerIndent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // コードブロック判定
    if (/^\s*```/.test(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFenceLang = line.replace(/^\s*```/, '').trim().toLowerCase();
        codeBlockBuffer = [line];
        continue;
      } else {
        inCodeBlock = false;
        codeBlockBuffer.push(line);

        // Mermaid コードブロックの逆変換（オプションで無効化されていない場合）
        if (codeFenceLang === 'mermaid' && options.mermaid !== false) {
          const mermaidSource = codeBlockBuffer.join('\n');
          const arrowLines = mermaidToTXTRA(mermaidSource);
          if (arrowLines) {
            // 直前にコンテナキーがある場合は子要素としてインデントを適用
            const indent = currentContainerIndent !== null ? `${currentContainerIndent}  ` : '';
            const indentedArrows = arrowLines
              .split('\n')
              .map(l => `${indent}${l}`)
              .join('\n');
            result.push(indentedArrows);
            continue;
          }
        }

        // 通常コードブロックはそのまま保持
        result.push(...codeBlockBuffer);
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // テーブル空ヘッダー行（| | | |）の検出による Matrix: コンテナの復元
    const tableMatch = line.match(/^(\s*)\|(.*)\|\s*$/);
    if (tableMatch && !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line)) {
      const cells = tableMatch[2].split('|').map(c => c.trim());
      if (cells.length > 0 && cells.every(c => c === '')) {
        // 直前の行が空リスト行（- のみ）の場合、Matrix: に置換
        const lastIdx = result.length - 1;
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (lastIdx >= 0 && /^\s*$/.test(result[lastIdx]) && /^\s*[-*+]\s*$/.test(prevLine)) {
          const listIndentMatch = prevLine.match(/^(\s*)/);
          const listIndent = listIndentMatch ? listIndentMatch[1] : '';
          result[lastIdx] = `${listIndent}Matrix:`;
          currentContainerIndent = listIndent;
        } else if (lastIdx < 0 || !/^\s*Matrix:\s*$/.test(result[lastIdx])) {
          const headerIndent = tableMatch[1].length >= 2 ? tableMatch[1].slice(2) : '';
          result.push(`${headerIndent}Matrix:`);
          currentContainerIndent = headerIndent;
        }
        continue;
      }
    }

    const converted = convertLine(line);
    if (converted !== null) {
      // 直前のコンテナキー（例: Workflow:）のインデントを記録
      if (converted.endsWith(':')) {
        const indentMatch = converted.match(/^(\s*)/);
        currentContainerIndent = indentMatch ? indentMatch[1] : '';
      } else if (converted.trim() !== '') {
        // キー以外の実コンテンツ行が来たらコンテナ記憶を解除
        currentContainerIndent = null;
      }
      result.push(converted);
    }
  }

  return result.join('\n');
}

export default markdownToTXTRA;
