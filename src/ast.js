/**
 * @file ast.js
 * トークン列から階層的な抽象構文木（NodeTree）を構築するモジュール。
 * インデントスタックおよび明示リスト記号 (- , * ) に基づき親子の階層関係を決定します。
 */

import { tokenize } from './lexer.js';

/**
 * トークン列を木構造 (NodeTree) に変換する。
 * 明示リスト記号 (- , *) がある場合、直前に親ノードがあればインデントがなくても自動的に子としてネストします。
 * @param {Array<object>} tokens - lexer で生成されたトークン配列
 * @returns {Array<object>} NodeTree
 */
export function buildAst(tokens) {
  const root = { depth: -1, isExplicitList: false, data: [] };
  const stack = [root];

  for (const token of tokens) {
    if (token.isExplicitList) {
      // 明示リストの場合: より深いノード、または同等以上の深さを持つ明示リストノードを巻き戻す
      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        if (top.depth > token.depth || (top.depth === token.depth && top.isExplicitList)) {
          stack.pop();
        } else {
          break;
        }
      }
    } else {
      // 通常ノードの場合: 自分と同等以上の深さを持つノードをすべて巻き戻す
      while (stack.length > 1 && stack[stack.length - 1].depth >= token.depth) {
        stack.pop();
      }
    }

    const parent = stack[stack.length - 1];

    // 1. コロンなしテキスト行 (_) の下に子要素がネストされた場合、node ← value 昇格を実行
    if (parent.nodeItem && parent.nodeItem.node === '_') {
      const promotedName = Array.isArray(parent.nodeItem.data) && parent.nodeItem.data.length > 0
        ? parent.nodeItem.data.join('    ')
        : parent.nodeItem.node;
      parent.nodeItem.node = promotedName;
      parent.nodeItem.data = [];
      parent.data = parent.nodeItem.data;
    } else if (parent.nodeItem && Array.isArray(parent.nodeItem.data) && parent.nodeItem.data.length > 0) {
      // 2. スカラー値付きキー (Key: Value) の下に子要素がネストされた場合、値を無名ノード (_) に昇格してコンテナ化
      const hasPrimitives = parent.nodeItem.data.some(d => typeof d !== 'object' || d === null);
      if (hasPrimitives) {
        const primitives = parent.nodeItem.data.filter(d => typeof d !== 'object' || d === null);
        const objects = parent.nodeItem.data.filter(d => typeof d === 'object' && d !== null);
        parent.nodeItem.data = [
          { node: '_', data: primitives },
          ...objects
        ];
        parent.data = parent.nodeItem.data;
      }
    }

    // 実効深さの計算:
    // 明示リストで親がルート以外なら親の深さ + 1（より深いインデントがあればそちらを尊重）
    let effectiveDepth = token.depth;
    if (token.isExplicitList && parent.depth >= 0) {
      effectiveDepth = Math.max(token.depth, parent.depth + 1);
    }

    const nodeItem = {
      node: token.node,
      data: token.data
    };

    if (token.type === 'CODE_BLOCK') {
      nodeItem.lang = token.lang;
    }

    parent.data.push(nodeItem);

    stack.push({
      depth: effectiveDepth,
      isExplicitList: Boolean(token.isExplicitList),
      data: nodeItem.data,
      nodeItem
    });
  }

  return root.data;
}

/**
 * TXTRA テキストをパースして NodeTree を返す。
 * @param {string} source - TXTRA ソーステキスト
 * @returns {Array<object>} NodeTree (AST)
 */
export function parseTXTRA(source) {
  const tokens = tokenize(source);
  return buildAst(tokens);
}
