/**
 * @file indent.js
 * 行頭インデントの深度計算および明示リスト記号 (- , * ) の解析を行うモジュール。
 * 正規表現を使用せず、文字走査によりゼロアロケーションで高速に処理します。
 */

/**
 * 1行あたりのインデント深度と明示リスト記号 (- , * ) を解析する。
 * タブ文字 (\t) はインデント1レベル（空白2文字相当）として計算します。
 * @param {string} line - 解析対象の行文字列
 * @returns {{ depth: number, content: string, isExplicitList: boolean }}
 */
export function parseIndent(line) {
  let spaces = 0;
  let i = 0;
  const len = line.length;

  // 行頭の半角空白およびタブ文字を走査してインデント幅を合算
  while (i < len) {
    const ch = line.charCodeAt(i);
    if (ch === 32) { // ' '
      spaces++;
      i++;
    } else if (ch === 9) { // '\t'
      spaces += 2;
      i++;
    } else {
      break;
    }
  }

  const depth = (spaces >> 1);
  let content = i === 0 ? line : line.slice(i);

  // 明示的なリスト記号 (- または *) の検出
  let isExplicitList = false;
  if (content.length >= 2) {
    const c0 = content.charCodeAt(0);
    if (c0 === 45 || c0 === 42) { // '-' === 45, '*' === 42
      const c1 = content.charCodeAt(1);
      if (c1 === 32 || c1 === 9) {
        isExplicitList = true;
        let start = 2;
        while (start < content.length) {
          const c = content.charCodeAt(start);
          if (c === 32 || c === 9) {
            start++;
          } else {
            break;
          }
        }
        content = content.slice(start);
      }
    }
  }

  return { depth, content, isExplicitList };
}

export default parseIndent;
