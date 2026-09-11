/**
 * @file index.d.ts
 * TXTRA (txtra) の TypeScript 型定義ファイル。
 * AST、CanonicalForm、トークン、およびファサード関数の型シグネチャを提供します。
 */

/**
 * TXTRA 抽象構文木（NodeTree）の単一ノード。
 */
export interface AstNode {
  /** ノード名（例: '_H1', 'user', 'ref.latest.KEY', '_', '_CODE' 等） */
  node: string;
  /** 子ノード配列または文字列データ配列 */
  data: (string | AstNode)[];
  /** コードブロックの場合の言語識別子（任意） */
  lang?: string;
}

/**
 * 字句解析器（Lexer）によって生成される単一行トークン。
 */
export interface Token {
  /** トークン種別 */
  type: 'HEADING' | 'KEY_VALUE' | 'CONTAINER' | 'TEXT' | 'CODE_BLOCK';
  /** インデント深度（半角空白2文字またはタブ1文字 = 1） */
  depth: number;
  /** ノード名 */
  node: string;
  /** データ配列 */
  data: string[];
  /** 明示的なリスト記号 (- , *) を持つかどうか */
  isExplicitList?: boolean;
  /** ソースコード内の行番号（1-indexed） */
  line: number;
  /** コードブロックの言語指定 */
  lang?: string;
}

/**
 * インデント解析結果。
 */
export interface IndentInfo {
  /** インデント深度 */
  depth: number;
  /** 行頭空白・明示リスト記号を除去したコンテンツ文字列 */
  content: string;
  /** 明示リスト記号 (- , *) の有無 */
  isExplicitList: boolean;
}

/**
 * Markdown 変換および逆変換のオプション。
 */
export interface MarkdownOptions {
  /** Mermaid フローチャートとの相互変換を有効にするか（デフォルト: true） */
  mermaid?: boolean;
}

/**
 * CanonicalForm（標準正規形）の単一要素タプル。
 */
export type CanonicalItem = [string, ...(string | CanonicalItem)[]];

/**
 * CanonicalForm 全体配列。先頭は固定ヘッダー 'nodeName, dataList'。
 */
export type CanonicalForm = [string, ...CanonicalItem[]];

/**
 * 単一行のインデント深度と明示リスト記号を解析する。
 * @param line - 解析対象の1行文字列
 */
export function parseIndent(line: string): IndentInfo;

/**
 * 仮想改行 (.: または .:\s) を通常の改行文字 \n にプリプロセス展開する。
 * @param source - TXTRA ソーステキスト
 */
export function expandVirtualNewlines(source: string): string;

/**
 * 文字列を空白2文字以上またはタブ文字で配列に分割する。
 * @param text - 分割対象文字列
 * @param unmask - エスケープ復元関数（任意）
 */
export function splitArrayValues(text: string, unmask?: (s: string) => string): string[];

/**
 * TXTRA ソース文字列を行単位のトークン列に変換する。
 * @param source - TXTRA ソーステキスト
 */
export function tokenize(source: string): Token[];

/**
 * トークン列から階層的な抽象構文木（NodeTree）を構築する。
 * @param tokens - tokenize で生成されたトークン配列
 */
export function buildAst(tokens: Token[]): AstNode[];

/**
 * TXTRA テキストをパースして NodeTree (AST) を生成する。
 * @param source - TXTRA ソーステキスト
 */
export function parseTXTRA(source: string): AstNode[];

/**
 * NodeTree を標準正規形（CanonicalForm）配列に変換する。
 * @param nodeTree - parseTXTRA で生成された AST
 */
export function toCanonical(nodeTree: AstNode[]): CanonicalForm;

/**
 * NodeTree を TXTRA 仕様に準拠した Markdown 文字列へ変換する。
 * @param nodeTree - AST
 * @param options - 変換オプション
 */
export function toMarkdown(nodeTree: AstNode[], options?: MarkdownOptions): string;

/**
 * Arrow Syntax を含むテキストを Mermaid フローチャートコードに変換する。
 * @param text - Arrow 構文を含む TXTRA テキスト
 * @param direction - 描画方向（'LR' または 'TD'、デフォルト: 'LR'）
 */
export function toMermaid(text: string, direction?: 'LR' | 'TD'): string;

/**
 * Mermaid コードブロック文字列を TXTRA の Arrow 記法テキストへ逆変換する。
 * @param mermaidSource - Mermaid コード
 */
export function mermaidToTXTRA(mermaidSource: string): string;

export { mermaidToTXTRA as fromMermaid };

/**
 * AST、CanonicalForm、または JS オブジェクトから TXTRA テキストをシリアライズする。
 * @param input - シリアライズ対象データ
 */
export function stringifyTXTRA(input: AstNode[] | CanonicalForm | Record<string, any>): string;

export { stringifyTXTRA as stringify };

/**
 * Markdown 文字列を TXTRA 記法テキストへ逆変換する。
 * @param markdown - Markdown 文字列
 * @param options - 変換オプション
 */
export function markdownToTXTRA(markdown: string, options?: MarkdownOptions): string;

export { markdownToTXTRA as fromMarkdown };

/**
 * JSON Schema 変換オプション。
 */
export interface JsonSchemaOptions {
  /** キー名の大文字小文字を同一視するか（デフォルト: true） */
  caseInsensitive?: boolean;
  /** 単一の親コンテナが存在する場合に自動アンラップするか（デフォルト: true） */
  unwrapRoot?: boolean;
  /** スキーマに定義されていないプロパティも含めるか（デフォルト: false） */
  additionalProperties?: boolean;
}

/**
 * TXTRA テキストまたは AST を JSON Schema に当てはめて JSON オブジェクトへ変換する。
 * @param sourceOrAst - TXTRA ソーステキストまたは AstNode 配列
 * @param schema - JSON Schema 定義
 * @param options - 変換オプション
 */
export function toJsonWithSchema<T = any>(
  sourceOrAst: string | AstNode[],
  schema: Record<string, any>,
  options?: JsonSchemaOptions
): T;

export { toJsonWithSchema as toJson };

/**
 * TXTRA ドキュメントインスタンス。各種変換メソッドをチェーン実行可能。
 */
export interface TxtraDocument {
  /** 生成された NodeTree (AST) */
  ast: AstNode[];
  /** CanonicalForm への変換 */
  toCanonical(): CanonicalForm;
  /** Markdown への変換 */
  toMarkdown(options?: MarkdownOptions): string;
  /** Mermaid フローチャートへの変換 */
  toMermaid(direction?: 'LR' | 'TD'): string;
  /** TXTRA テキストへのシリアライズ */
  stringify(): string;
  /** JSON Schema に基づく JSON への変換 */
  toJson<T = any>(schema: Record<string, any>, options?: JsonSchemaOptions): T;
}

/**
 * TXTRA ファサード関数型定義。
 */
export interface TxtraFacade {
  /** TXTRA ソーステキストを受け取り、ドキュメントオブジェクトを返す */
  (source: string): TxtraDocument;
  /** parseTXTRA へのショートカット */
  parse(source: string): AstNode[];
  /** stringifyTXTRA へのショートカット */
  stringify(input: AstNode[] | CanonicalForm | Record<string, any>): string;
  /** markdownToTXTRA へのショートカット */
  fromMarkdown(markdown: string, options?: MarkdownOptions): string;
  /** mermaidToTXTRA へのショートカット */
  fromMermaid(mermaidSource: string): string;
  /** toJsonWithSchema へのショートカット */
  toJson<T = any>(
    sourceOrAst: string | AstNode[],
    schema: Record<string, any>,
    options?: JsonSchemaOptions
  ): T;
}

/**
 * TXTRA ファサードインスタンス。
 */
export declare const txtra: TxtraFacade;

export default txtra;
