/**
 * @file lexer.js
 * TXTRA テキストの行単位字句解析器。
 * 仮想改行展開、インデント・タブ計算、配列セパレーター分割、行種別の判定を行います。
 */

import { maskEscapes } from './escape.js';
import { parseIndent } from './indent.js';

export { parseIndent };

const ARRAY_SPLIT_REGEX = /[ ]{3,}|\t+/;
const DOUBLE_DOT_KEY_REGEX = /^(\.?)(?![\.\/])([^\t\r\n:]*?[^\s.:])\.\.(?:[ \t]+(.*)|$)/;

/**
 * 仮想改行 (.: または .:␣) を通常の改行文字 \n にプリプロセス展開する。
 * エスケープされたインラインコード内のドットやコロンは保護されます。
 * 記号が存在しない場合は即座に元文字列を返して高速化を図ります。
 * @param {string} source - TXTRA ソースコード
 * @returns {string} 展開後の文字列
 */
export function expandVirtualNewlines(source) {
  if (!source || !source.includes('.:')) {
    return source;
  }
  const { masked, unmask } = maskEscapes(source);
  const expanded = masked.replace(/[ \t]*\.:[ \t]?/gm, '\n');
  return unmask(expanded);
}

/**
 * 文字列を空白3文字以上またはタブ文字で配列に分割する。
 * 分割不要な単一値の場合は即座に配列化して正規表現をバイパスします。
 * @param {string} text - 分割対象文字列
 * @param {(s: string) => string} unmask - エスケープ復元関数
 * @returns {string[]}
 */
export function splitArrayValues(text, unmask) {
  if (!text) return [];
  const trimmed = text.trim();
  if (trimmed === '') return [];

  // 空白3連続またはタブが含まれない場合は正規表現分割をバイパス
  if (!text.includes('   ') && !text.includes('\t')) {
    const val = unmask(trimmed);
    return val.length > 0 ? [val] : [];
  }

  return text
    .split(ARRAY_SPLIT_REGEX)
    .map(v => unmask(v.trim()))
    .filter(v => v.length > 0);
}

/**
 * 単一行の内容から TXTRA トークンを生成する。
 * 見出し・ドット参照・通常コロン・テキスト行の判定を文字走査で高速に行います。
 * @param {object} params - 行情報
 * @returns {object} トークンオブジェクト
 */
function classifyLineToken({ depth, content, isExplicitList, lineIndex }) {
  const hasEscape = content.includes('`') || content.includes('\\');
  const { masked, unmask } = hasEscape ? maskEscapes(content) : { masked: content, unmask: (s) => s };

  const colonIndex = masked.indexOf(':');
  if (colonIndex !== -1) {
    const firstChar = masked.charCodeAt(0);

    // 1. 見出し行 (: Heading, :: SubHeading) - 先頭文字が ':'
    if (firstChar === 58) {
      let level = 0;
      while (level < 6 && masked.charCodeAt(level) === 58) {
        level++;
      }
      let afterColons = level;
      while (afterColons < masked.length && (masked.charCodeAt(afterColons) === 32 || masked.charCodeAt(afterColons) === 9)) {
        afterColons++;
      }
      const titleStr = masked.slice(afterColons).trim();
      if (level >= 1 && level <= 6 && afterColons > level && titleStr.length > 0) {
        return {
          type: 'HEADING',
          depth,
          node: `_H${level}`,
          data: [unmask(titleStr)],
          isExplicitList,
          line: lineIndex + 1
        };
      }
    } else {
      // 構造化コロン (:␣ または :行末) を探索 (13:54 や URL 等の誤爆を防止)
      let targetColonIndex = -1;
      let searchFrom = 0;
      while (true) {
        const idx = masked.indexOf(':', searchFrom);
        if (idx === -1) break;
        if (idx === masked.length - 1 || masked.charCodeAt(idx + 1) === 32 || masked.charCodeAt(idx + 1) === 9) {
          targetColonIndex = idx;
          break;
        }
        searchFrom = idx + 1;
      }

      if (targetColonIndex !== -1) {
        // 2. ドット参照構文 (.NODE: or .NODE: data) - 先頭文字が '.'
        if (firstChar === 46 && targetColonIndex > 1) {
          const rawKey = masked.slice(1, targetColonIndex).trim();
          if (rawKey.length > 0) {
            const nodeName = `ref.latest.${unmask(rawKey)}`;
            const rest = masked.slice(targetColonIndex + 1).trim();
            const data = rest ? splitArrayValues(rest, unmask) : [];
            return {
              type: rest ? 'KEY_VALUE' : 'CONTAINER',
              depth,
              node: nodeName,
              data,
              isExplicitList,
              line: lineIndex + 1
            };
          }
        }

        // 3. 通常のコロン構文 (KEY: or KEY: DATA) - 先頭以外にコロンがある
        if (firstChar !== 46 && targetColonIndex > 0) {
          const rawKey = masked.slice(0, targetColonIndex).trim();
          if (rawKey.length > 0) {
            const nodeName = unmask(rawKey);
            const rest = masked.slice(targetColonIndex + 1).trim();
            const data = rest ? splitArrayValues(rest, unmask) : [];
            return {
              type: rest ? 'KEY_VALUE' : 'CONTAINER',
              depth,
              node: nodeName,
              data,
              isExplicitList,
              line: lineIndex + 1
            };
          }
        }
      }
    }
  }

  // 4. 打鍵感・モバイル入力向け二重ドット構文 (KEY.. or KEY.. DATA) - コロンの代替エイリアス
  if (masked.includes('..')) {
    const doubleDotMatch = masked.match(DOUBLE_DOT_KEY_REGEX);
    if (doubleDotMatch) {
      const isDotRef = Boolean(doubleDotMatch[1]);
      const rawKey = doubleDotMatch[2].trim();
      if (rawKey.length > 0) {
        const nodeName = isDotRef ? `ref.latest.${unmask(rawKey)}` : unmask(rawKey);
        const rest = doubleDotMatch[3] !== undefined ? doubleDotMatch[3].trim() : '';
        const data = rest ? splitArrayValues(rest, unmask) : [];
        return {
          type: rest ? 'KEY_VALUE' : 'CONTAINER',
          depth,
          node: nodeName,
          data,
          isExplicitList,
          line: lineIndex + 1
        };
      }
    }
  }

  // 5. コロンなしテキスト行（汎用テキスト・データ行は一律 '_'）
  const values = splitArrayValues(masked, unmask);
  const nodeName = '_';
  return {
    type: 'TEXT',
    depth,
    node: nodeName,
    data: values.length > 0 ? values : [unmask(content)],
    isExplicitList,
    line: lineIndex + 1
  };
}

/**
 * TXTRA ソース文字列を行単位のトークン列に変換する。
 * @param {string} source - TXTRA ソースコード
 * @returns {Array<object>} トークン配列
 */
export function tokenize(source) {
  const normalizedSource = expandVirtualNewlines(source);
  const cleanSource = normalizedSource.includes('\r')
    ? normalizedSource.replace(/\r\n/g, '\n')
    : normalizedSource;
  const lines = cleanSource.split('\n');
  const tokens = [];

  let inCodeBlock = false;
  let codeFenceType = null;
  let codeFenceLang = '';
  let codeBlockBuffer = [];
  let codeBlockDepth = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];

    // コードフェンスおよびブロックエイリアスの判定 (``` または ,,,,)
    if (!inCodeBlock) {
      if (rawLine.includes('```') || rawLine.includes(',,,,')) {
        const fenceMatch = rawLine.match(/^(\s*)(```|,{4,})(.*)$/);
        if (fenceMatch) {
          inCodeBlock = true;
          codeFenceType = fenceMatch[2].startsWith('`') ? '```' : ',,,,';
          codeBlockDepth = Math.floor(fenceMatch[1].replace(/\t/g, '  ').length / 2);
          codeFenceLang = fenceMatch[3].trim();
          codeBlockBuffer = [];
          continue;
        }
      }
    } else {
      // 終了フェンスの判定: 開始と同じ種類のフェンス記号で閉じる
      const isCloseFence = codeFenceType === '```'
        ? /^(\s*)```(.*)$/.test(rawLine)
        : /^(\s*),{4,}(.*)$/.test(rawLine);

      if (isCloseFence) {
        inCodeBlock = false;
        codeFenceType = null;
        tokens.push({
          type: 'CODE_BLOCK',
          node: '_CODE',
          depth: codeBlockDepth,
          lang: codeFenceLang,
          data: [codeBlockBuffer.join('\n')],
          line: lineIndex + 1
        });
        continue;
      }
      codeBlockBuffer.push(rawLine);
      continue;
    }

    if (rawLine.trim() === '') continue;

    const { depth, content, isExplicitList } = parseIndent(rawLine);
    tokens.push(classifyLineToken({ depth, content, isExplicitList, lineIndex }));
  }

  return tokens;
}
