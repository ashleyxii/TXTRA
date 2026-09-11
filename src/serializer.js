/**
 * @file serializer.js
 * AST (NodeTree)、CanonicalForm、または通常の JavaScript オブジェクトから
 * 整形された TXTRA テキストを生成するシリアライザー（Stringifier）。
 */

/**
 * CanonicalForm のタプル配列を AST 形式へ正規化する。
 * @param {Array} item
 * @returns {object}
 */
function canonicalItemToAst(item) {
  const [nodeName, ...rest] = item;
  const isContainer = rest.length > 0 && Array.isArray(rest[0]);
  if (isContainer) {
    return {
      node: nodeName,
      data: rest.map(child => canonicalItemToAst(child))
    };
  }
  return { node: nodeName, data: rest.map(String) };
}

/**
 * プレーンな JavaScript オブジェクトを AST 形式へ正規化する。
 * @param {object} obj
 * @returns {Array<object>}
 */
function objectToAst(obj) {
  if (!obj || typeof obj !== 'object') return [];
  const nodes = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      nodes.push({ node: key, data: objectToAst(val) });
    } else if (Array.isArray(val)) {
      const isNestedObj = val.length > 0 && typeof val[0] === 'object';
      if (isNestedObj) {
        nodes.push({ node: key, data: val.flatMap(v => objectToAst(v)) });
      } else {
        nodes.push({ node: key, data: val.map(String) });
      }
    } else {
      nodes.push({ node: key, data: [String(val ?? '')] });
    }
  }
  return nodes;
}

/**
 * 単一の AST ノードを TXTRA テキスト行へ再帰変換する。
 * @param {object} item - AST ノード
 * @param {number} depth - インデント深度
 * @returns {string}
 */
function renderAstItem(item, depth = 0) {
  const indent = '  '.repeat(depth);
  const isContainer = Array.isArray(item.data) && item.data.length > 0 && typeof item.data[0] === 'object';

  // 見出し (_H1, _H2, ...)
  const headingMatch = item.node && item.node.match(/^_H([1-6])$/);
  if (headingMatch) {
    const colons = ':'.repeat(Number(headingMatch[1]));
    return `${colons} ${(item.data || []).join('    ')}`;
  }

  // 匿名テキスト・データ行 (_)
  if (item.node === '_') {
    if (isContainer) {
      return item.data.map(child => renderAstItem(child, depth)).join('\n');
    }
    return `${indent}${(item.data || []).join('    ')}`;
  }

  // コードブロック (_CODE)
  if (item.node === '_CODE') {
    const lang = item.lang || '';
    const code = (item.data && item.data[0]) || '';
    return `${indent}\`\`\`${lang}\n${code}\n${indent}\`\`\``;
  }

  // ドット参照 (ref.latest.KEY)
  const isRef = item.node && item.node.startsWith('ref.latest.');
  const nodeLabel = isRef ? `.${item.node.slice('ref.latest.'.length)}` : item.node;

  // コンテナノード（子ノードを持つ親）
  if (isContainer) {
    const childrenStr = item.data.map(child => renderAstItem(child, depth + 1)).join('\n');
    return `${indent}${nodeLabel}:\n${childrenStr}`;
  }

  // キー・バリューノード
  const valStr = item.data && item.data.length > 0 ? ` ${(item.data || []).join('    ')}` : '';
  return `${indent}${nodeLabel}:${valStr}`;
}

/**
 * AST、CanonicalForm、または JS オブジェクトを TXTRA テキストへシリアライズする。
 * @param {Array|object} input - シリアライズ対象データ
 * @returns {string} TXTRA テキスト
 */
export function stringifyTXTRA(input) {
  if (!input) return '';

  let ast = input;

  // 1. CanonicalForm の判定と変換
  if (Array.isArray(input) && input[0] === 'nodeName, dataList') {
    ast = input.slice(1).map(item => canonicalItemToAst(item));
  } else if (!Array.isArray(input) && typeof input === 'object') {
    // 2. プレーンな JS オブジェクトの変換
    ast = objectToAst(input);
  }

  return (ast || []).map(node => renderAstItem(node, 0)).join('\n');
}

export default stringifyTXTRA;
