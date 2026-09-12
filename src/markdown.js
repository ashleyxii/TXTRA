/**
 * @file markdown.js
 * NodeTree を TXTRA 仕様に準拠した Markdown 表現へ変換するレンダラー。
 * 見出し、段落改行、Table 表構文、Mermaid フローチャート、ネストしたリスト構文を忠実に再現します。
 */

import { toMermaid } from './mermaid.js';

const ARROW_DETECT_REGEX = /(?:>>|-->|-\.->|==>|->|→|⇒|--[^-=.]+->|gggt(?:[ ]{3,}|\t+))/;

/**
 * ノードのデータ配列を 4 つの空白で結合した文字列にする。
 * @param {string[]} data - データ配列
 * @returns {string}
 */
function formatData(data) {
  if (!data || data.length === 0) return '';
  return data.join('    ');
}

/**
 * Table ノードを Markdown GFM 表構文 (| ... |) へレンダリングする。
 * 1行目をヘッダーとし、2行目以降をデータ行とします。
 * @param {object} item - Table AST ノード
 * @param {number} indentLevel - ネスト深度
 * @returns {string}
 */
function renderTableNode(item, indentLevel) {
  const isMatrix = /^matrix$/i.test(item.node);
  const indent = '  '.repeat(indentLevel);
  const rows = item.data.map(child => child.data || []);
  if (rows.length < 2) {
    const children = item.data.map(c => renderNode(c, indentLevel + 1)).join('\n');
    return `${indent}- **${item.node}**:\n${children}`;
  }

  const maxCols = Math.max(...rows.map(r => r.length));
  if (maxCols === 0) return `${indent}- **${item.node}**:`;

  if (isMatrix) {
    // Matrix: ヘッダーレス GFM 表構文（TXTRA.md 仕様）
    const header = `|${Array.from({ length: maxCols }, () => ' ').join('|')}|`;
    const separator = `|${Array.from({ length: maxCols }, () => '-').join('|')}|`;
    const body = rows.map(r => {
      const padded = Array.from({ length: maxCols }, (_, i) => r[i] || '');
      return `|${padded.join('|')}|`;
    });

    const tableLines = [header, separator, ...body]
      .map(line => `${indent}  ${line}`)
      .join('\n');

    return `${indent}- \n${tableLines}`;
  }

  const formatRow = (cells) => {
    const padded = Array.from({ length: maxCols }, (_, i) => cells[i] || '');
    return `| ${padded.join(' | ')} |`;
  };

  const header = formatRow(rows[0]);
  const separator = `| ${Array.from({ length: maxCols }, () => '---').join(' | ')} |`;
  const body = rows.slice(1).map(formatRow);

  const tableLines = [header, separator, ...body]
    .map(line => `${indent}  ${line}`)
    .join('\n');

  return `${indent}- **${item.node}**:\n\n${tableLines}`;
}

/**
 * Arrow 構文を含むノードを Markdown 内の Mermaid コードブロックへレンダリングする。
 * @param {object} item - AST ノード
 * @param {number} indentLevel - ネスト深度
 * @returns {string}
 */
function renderMermaidNode(item, indentLevel) {
  const indent = '  '.repeat(indentLevel);
  const textLines = (item.data || []).map(child => {
    if (child && typeof child === 'object') {
      const dataStr = Array.isArray(child.data) ? child.data.join('    ') : String(child.data || '');
      if (child.node === '_') {
        return dataStr;
      }
      return `${child.node}: ${dataStr}`;
    }
    return String(child);
  });

  const mermaidBlock = toMermaid(textLines.join('\n'));
  if (!mermaidBlock) {
    const children = item.data.map(c => renderNode(c, indentLevel + 1)).join('\n');
    return `${indent}- **${item.node}**:\n${children}`;
  }

  return `${indent}- **${item.node}**:\n\n${mermaidBlock}`;
}

/**
 * 単一ノードを Markdown 行文字列へ再帰的にレンダリングする。
 * @param {object} item - AST ノード
 * @param {number} indentLevel - ネスト深度
 * @param {object} [options] - レンダリングオプション
 * @returns {string} Markdown 文字列
 */
function renderNode(item, indentLevel = 0, options = {}) {
  const indent = '  '.repeat(indentLevel);
  const isContainer = Array.isArray(item.data) && item.data.length > 0 && typeof item.data[0] === 'object';

  // 見出し (_H1, _H2, ...)
  const headingMatch = item.node && item.node.match(/^_H([1-6])$/);
  if (headingMatch) {
    const hashes = '#'.repeat(Number(headingMatch[1]));
    return `${hashes} ${formatData(item.data)}`;
  }

  // コードブロック (_CODE)
  if (item.node === '_CODE') {
    const lang = item.lang || '';
    const content = (item.data && item.data[0]) || '';
    return `\`\`\`${lang}\n${content}\n\`\`\``;
  }

  // 匿名テキスト・データ行 (_)
  if (item.node === '_') {
    // トップレベル段落は末尾2スペース改行
    if (indentLevel === 0) {
      return `${formatData(item.data)}  `;
    }
    if (isContainer) {
      const children = item.data.map(c => renderNode(c, indentLevel + 1, options)).join('\n');
      return `${indent}-\n${children}`;
    }
    const text = formatData(item.data);
    return `${indent}- ${text}`;
  }

  // 通常ノード（コンテナまたはキー・バリュー）
  if (isContainer) {
    // Table: または Matrix: かつ 2行以上なら Markdown 表構文としてレンダリング
    if (/^(table|matrix)$/i.test(item.node) && item.data.length >= 2) {
      return renderTableNode(item, indentLevel);
    }

    // Mermaid / Workflow ノード、または矢印記号を含むコンテナなら Mermaid コードブロックとしてレンダリング
    const isMermaidNamed = /^(workflow|flow|mermaid|graph|chart|pipeline)$/i.test(item.node);
    const hasArrowChild = item.data.some(c => {
      const text = Array.isArray(c?.data) ? c.data.join(' ') : String(c?.data || '');
      return ARROW_DETECT_REGEX.test(text);
    });

    if (isMermaidNamed || hasArrowChild) {
      return renderMermaidNode(item, indentLevel);
    }

    const children = item.data.map(c => renderNode(c, indentLevel + 1, options)).join('\n');
    return `${indent}- **${item.node}**:\n${children}`;
  }

  // キー・バリューノード
  return `${indent}- **${item.node}**: ${formatData(item.data)}`;
}

/**
 * NodeTree 全体を Markdown 文字列へレンダリングする。
 * @param {Array<object>} nodeTree - AST
 * @param {object} [options] - レンダリングオプション
 * @returns {string} Markdown 文字列
 */
export function toMarkdown(nodeTree, options = {}) {
  if (!nodeTree || nodeTree.length === 0) return '';
  return nodeTree.map(node => renderNode(node, 0, options)).join('\n');
}

export default toMarkdown;
