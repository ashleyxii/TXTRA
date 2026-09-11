/**
 * @file mermaidToTxtra.js
 * Mermaid のフローチャート構文 (flowchart / graph) を TXTRA の Arrow Syntax へ逆変換するモジュール。
 * ノードラベルのアンエスケープおよびエッジラベルの抽出を行い、クリーンな TXTRA 矢印記法を生成します。
 */

// ノード定義抽出用 (例: n0["Label"], n0[Label], n0("Label"), 単純な n0)
const NODE_PATTERN = /([a-zA-Z0-9_-]+)(?:\["?(.*?)"?\]|\("?(.*?)"?\)|\(\("?(.*?)"?\)\))?/;

// エッジ抽出用 (例: A -->|"label"| B, A -->|label| B, A -- label --> B, A --> B, A -.-> B, A ==> B)
const EDGE_REGEX = /^(.+?)\s*(?:-->|---|-.->|==>)\s*(?:\|"?(.*?)"?\|\s*)?(?:--\s*(.*?)\s*-->\s*)?(.+)$/;

/**
 * Mermaid のノード文字列から表示ラベルを抽出・アンエスケープする。
 * @param {string} rawNode - Mermaid ノード文字列
 * @returns {string} 抽出されたラベル文字列
 */
function extractLabel(rawNode) {
  const trimmed = rawNode.trim();
  const match = trimmed.match(NODE_PATTERN);
  if (!match) return trimmed;

  const label = match[2] ?? match[3] ?? match[4] ?? match[1];
  return label.replace(/#quot;/g, '"').trim();
}

/**
 * エッジラベルからコロン説明 (label (desc)) を抽出する。
 * @param {string} rawEdgeLabel - エッジラベル
 * @returns {{ label: string, desc: string | null }}
 */
function parseEdgeLabel(rawEdgeLabel) {
  if (!rawEdgeLabel) return { label: '', desc: null };
  const cleaned = rawEdgeLabel.replace(/^"|"$/g, '').trim();
  const descMatch = cleaned.match(/^(.+?)\s*\((.+)\)$/);
  if (descMatch) {
    return { label: descMatch[1].trim(), desc: descMatch[2].trim() };
  }
  return { label: cleaned, desc: null };
}

/**
 * Mermaid コードブロック文字列を TXTRA の Arrow 記法テキストへ変換する。
 * @param {string} mermaidSource - Mermaid コード（```mermaid や flowchart 宣言を含む）
 * @returns {string} TXTRA Arrow 構文テキスト
 */
export function mermaidToTXTRA(mermaidSource) {
  if (!mermaidSource) return '';

  const lines = mermaidSource.replace(/\r\n/g, '\n').split('\n');
  const arrowLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 不要行のスキップ (フェンス、ヘッダー、空行、コメント)
    if (!line || line.startsWith('```') || line.startsWith('%%')) continue;
    if (/^(flowchart|graph)\s+[A-Za-z]+/i.test(line)) continue;
    if (line.startsWith('subgraph') || line === 'end') continue;

    const edgeMatch = line.match(EDGE_REGEX);
    if (!edgeMatch) continue;

    const rawFrom = edgeMatch[1];
    const pipeLabel = edgeMatch[2];
    const dashLabel = edgeMatch[3];
    const rawTo = edgeMatch[4];

    const from = extractLabel(rawFrom);
    const to = extractLabel(rawTo);
    const rawEdge = pipeLabel || dashLabel;

    if (rawEdge) {
      const { label, desc } = parseEdgeLabel(rawEdge);
      const targetStr = desc ? `${to}: ${desc}` : to;
      arrowLines.push(`${from} --${label}-> ${targetStr}`);
    } else {
      arrowLines.push(`${from} >> ${to}`);
    }
  }

  return arrowLines.join('\n');
}

export default mermaidToTXTRA;
