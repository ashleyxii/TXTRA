/**
 * @file canonical.js
 * NodeTree から標準正規形（CanonicalForm）への変換モジュール。
 * 配列ベースのタプル表現 [ "nodeName, dataList", ... ] を生成します。
 */

/**
 * 単一の AST ノードを CanonicalForm の配列に再帰変換する。
 * @param {object} item - AST ノード
 * @returns {Array} Canonical 要素
 */
function nodeToCanonical(item) {
  const isContainer = Array.isArray(item.data) && item.data.length > 0 && typeof item.data[0] === 'object';
  if (isContainer) {
    return [item.node, ...item.data.map(child => nodeToCanonical(child))];
  }
  return [item.node, ...(item.data || [])];
}

/**
 * NodeTree 全体を CanonicalForm に変換する。
 * @param {Array<object>} nodeTree - parseTXTRA で生成された AST
 * @returns {Array} CanonicalForm 配列
 */
export function toCanonical(nodeTree) {
  const header = 'nodeName, dataList';
  const body = (nodeTree || []).map(node => nodeToCanonical(node));
  return [header, ...body];
}
