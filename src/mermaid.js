/**
 * @file mermaid.js
 * TXTRA の Arrow Syntax を防弾（Bulletproof）な Mermaid フローチャート記法へ変換するモジュール。
 * ノードIDと表示ラベルの分離により、空白・括弧・記号・Mermaid予約語による構文エラーを完全防止します。
 */

// 矢印セパレーター正規表現 (>> , --> , -.-> , ==> , -> , → , ⇒)
const ARROW_SPLIT_REGEX = /\s*(?:>>|-->|-\.->|==>|->|→|⇒)\s*/;
const ARROW_START_REGEX = /^(?:>>|-->|-\.->|==>|->|→|⇒)/;
const LABEL_ARROW_REGEX = /^(?:(.+?)\s+)?(?:--|==|-\.)([^-=.]+)(?:->|==>|\.->)\s+(.+)$/;

/**
 * ノード名を安全な Mermaid ノード表現（id["ラベル"]）に変換するファクトリ。
 * 同一ラベルには同一の ID を割り当ててグラフの結線を保証します。
 */
function createNodeResolver() {
  const labelToId = new Map();
  return function resolve(rawLabel) {
    const label = rawLabel.trim();
    if (!labelToId.has(label)) {
      labelToId.set(label, `n${labelToId.size}`);
    }
    const id = labelToId.get(label);
    const escapedLabel = label.replace(/"/g, '#quot;');
    return `${id}["${escapedLabel}"]`;
  };
}

/**
 * ターゲットノード文字列からコロンによる説明文（B: desc）を分離する。
 * @param {string} rawTarget
 * @returns {{ target: string, edgeLabel: string|null }}
 */
function extractTargetDescription(rawTarget) {
  const match = rawTarget.match(/^([^:]+):\s*(.+)$/);
  if (match) {
    return { target: match[1].trim(), edgeLabel: match[2].trim() };
  }
  return { target: rawTarget.trim(), edgeLabel: null };
}

/**
 * Arrow Syntax を含むテキストを行単位で解析し、安全な Mermaid 記法コードを生成する。
 * @param {string} text - Arrow 構文を含む TXTRA テキスト
 * @param {'LR'|'TD'} [direction='LR'] - 描画方向
 * @returns {string} Mermaid コードブロック
 */
export function toMermaid(text, direction = 'LR') {
  const lines = text.split('\n');
  const edges = [];
  const getNode = createNodeResolver();
  let prevNode = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('------') || line.endsWith(':')) continue;

    // 1. ラベル付き矢印: [from] --label-> to (行頭省略時は直前ノードから継続)
    const labelMatch = line.match(LABEL_ARROW_REGEX);
    if (labelMatch) {
      const from = (labelMatch[1] ? labelMatch[1].trim() : prevNode) || 'Start';
      const label = labelMatch[2].trim();
      const rawTo = labelMatch[3].trim();
      const { target, edgeLabel } = extractTargetDescription(rawTo);

      const finalLabel = edgeLabel ? `${label} (${edgeLabel})` : label;
      edges.push(`${getNode(from)} -->|"${finalLabel}"| ${getNode(target)}`);
      prevNode = target;
      continue;
    }

    // 2. 矢印記号 (>> , --> , -> , → 等) によるチェーン
    if (ARROW_SPLIT_REGEX.test(line)) {
      const isStartWithArrow = ARROW_START_REGEX.test(line);
      const parts = line.split(ARROW_SPLIT_REGEX).map(p => p.trim()).filter(Boolean);

      if (isStartWithArrow && prevNode && parts.length > 0) {
        // 先頭が矢印の場合は直前ノードからの継続
        for (const rawTarget of parts) {
          const { target, edgeLabel } = extractTargetDescription(rawTarget);
          const arrow = edgeLabel ? `-->|"${edgeLabel}"|` : '-->';
          edges.push(`${getNode(prevNode)} ${arrow} ${getNode(target)}`);
          prevNode = target;
        }
        continue;
      }

      for (let i = 0; i < parts.length - 1; i++) {
        const froms = parts[i].split(/[ ]{2,}|\t+/).filter(Boolean);
        const tos = parts[i + 1].split(/[ ]{2,}|\t+/).filter(Boolean);
        for (const f of froms) {
          for (const rawT of tos) {
            const { target, edgeLabel } = extractTargetDescription(rawT);
            const arrow = edgeLabel ? `-->|"${edgeLabel}"|` : '-->';
            edges.push(`${getNode(f)} ${arrow} ${getNode(target)}`);
          }
        }
      }
      if (parts.length > 0) {
        const last = parts[parts.length - 1].split(/[ ]{2,}|\t+/).filter(Boolean).pop();
        if (last) prevNode = extractTargetDescription(last).target;
      }
      continue;
    }

    // 単一ノード行（次行の矢印継続の起点）
    if (!line.includes(':')) {
      prevNode = line;
    }
  }

  if (edges.length === 0) return '';

  const uniqueEdges = [...new Set(edges)];
  return `\`\`\`mermaid\nflowchart ${direction}\n  ${uniqueEdges.join('\n  ')}\n\`\`\``;
}

export default toMermaid;
