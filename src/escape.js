/**
 * @file escape.js
 * エスケープ処理およびインラインコード保護ユーティリティ。
 * コロンや空白セパレータの誤判定を防ぐため、一時的にプレースホルダーへ退避・復元します。
 */

const identity = (str) => str;
const UNMASK_REGEX = /\x01(?:CODE|ESC)_\d+\x02/g;

/**
 * テキスト内のエスケープ文字およびインラインコードブロックを退避する。
 * 対象記号（バッククオートやバックスラッシュ）が存在しない場合は完全バイパスし、
 * 復元時は単一正規表現マッチによる O(N) 1パス置換を行います。
 * @param {string} text - 対象文字列
 * @returns {{ masked: string, unmask: (str: string) => string }}
 */
export function maskEscapes(text) {
  if (!text || (!text.includes('`') && !text.includes('\\'))) {
    return { masked: text, unmask: identity };
  }

  const store = new Map();
  let counter = 0;

  // 1. バッククオートで囲まれたインラインコード `...` を保護
  let masked = text.replace(/`([^`]+)`/g, (_, code) => {
    const key = `\x01CODE_${counter++}\x02`;
    store.set(key, `\`${code}\``);
    return key;
  });

  // 2. バックスラッシュによる単文字エスケープ \X を保護
  masked = masked.replace(/\\(.)/g, (_, char) => {
    const key = `\x01ESC_${counter++}\x02`;
    store.set(key, char);
    return key;
  });

  if (store.size === 0) {
    return { masked: text, unmask: identity };
  }

  const unmask = (str) => {
    if (!str || !str.includes('\x01')) return str;
    return str.replace(UNMASK_REGEX, (match) => store.get(match) ?? match);
  };

  return { masked, unmask };
}
