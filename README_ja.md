# TXTRA (TXT in Readable Annotation)

[English](README.md) | 日本語

> プレーンテキストの自然さと、決定論的な木構造を両立する軽量構造化テキストフォーマット

[![npm version](https://img.shields.io/badge/npm-v1.0.0-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Tests: 49 passing](https://img.shields.io/badge/tests-49%20passing-brightgreen.svg)](tests/)
[![Speed: 1.8M lines/sec](https://img.shields.io/badge/speed-1.8M%20lines%2Fsec-orange.svg)](docs/performance.md)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-blue.svg)](src/index.d.ts)

[Web Playground (Live Demo)](https://ashleyxii.github.io/TXTRA/)  
ブラウザ上でリアルタイム構文解析および Markdown / Mermaid 相互変換を試すことができます。

---

## 1. 背景と設計理念 (Background & Philosophy)

TXTRA は、ターミナル、スマートフォンのメモ、LLM とのチャット入力欄など、高級エディタの補完や Markdown の自動プレビューが望めない環境での使用を想定して設計された軽量構造化テキストフォーマットです。

### 理念
1. プレーンテキストの視認ノイズ最小化を希求します。
2. あらゆる入力環境と鍵打感に配慮します。
3. 情報をただの読みやすいTXTとして記述します。
4. 以上をもって、我々は我々に、プレーンテキストの主権を取り戻します。

- __生テキストの可読性__: プレビューなしでそのまま読める、静かな構文記号の選択。
- __直感的文法__: インデントネスト、複数空白でセパレート、キー: バリュー、以上。
- __入力性の追求__: スマートフォンやシェル環境でも軽快に入力するための代替構文。
- __集中持続性__: 思考を巻き戻さないための、キーの重複許容と後方優先のリスト概念。
- __木構造への整形__: 曖昧さをパーサー側で吸収し、瞬時に AST や JSON へ変換。

---

### 基本文法のイメージ

日常のメモのように書くだけで、階層構造や表、リストが自動的に確定します。

```txtra
: ノート見出し
:: 小見出し
これは通常の段落テキストです。

プロジェクト
  ステータス: 進行中
  メンバー: 田中    佐藤    鈴木
  タスク:
    - 仕様の策定
    - プロトタイプ実装

Table:
  名前      役割      進捗
  田中      設計      完了
  佐藤      開発      進行中

Matrix:
  1    0    0
  0    1    0
  0    0    1
```

### フォーマット比較

| 観点 | JSON | YAML | Markdown | TXTRA |
|:---|:---|:---|:---|:---|
| **主な用途** | 機械間通信・API | アプリの設定ファイル | 人間向け文書・記事 | **人間の思考メモ・LLM入出力** |
| **生テキストの可読性** | 低（括弧・クォートのノイズ） | 中（インデント依存） | 高（プレビュー推奨） | **高（プレビューなしで自然）** |
| **手入力・打鍵の快適さ** | 苦痛（構文ミスしやすい） | 普通（タブ不可・厳格） | 普通（記号・見出し切替あり） | **極めて快適（Shift/記号最小化）** |
| **データ構造の決定性** | 厳格（100% 機械的） | 厳格（仕様が巨大） | 極めて低い（自由文・抽出困難） | **決定論的（AST / JSON化が容易）** |
| **追記性（同名キー等）** | 上書きまたは非推奨 | 構文エラー | 自由（ただし構造化不可） | **許容（リスト化・参照スコープ）** |
| **トークン効率** | 低い（冗長） | 高い | 高い | **高い** |
| **エコシステム・実績** | 世界標準 | 世界標準 | 世界標準 | **新生（ゼロ依存の単一パーサー）** |

---

## 2. クイックスタート (Quick Start)

### インストール
```bash
npm install txtra
```

### 1. JavaScript / TypeScript での利用
```javascript
import { txtra, parseTXTRA, stringifyTXTRA, toJsonWithSchema } from 'txtra';

const source = `
User
  name: Alice
  age: 25
  role: admin
  tags: dev    lead
`;

// ワンストップファサード
const doc = txtra(source);

console.log(doc.ast);           // 決定論的 AST (NodeTree)
console.log(doc.toMarkdown());  // GitHub Flavored Markdown (GFM)
console.log(doc.toCanonical()); // 標準配列タプル (CanonicalForm)
console.log(doc.toMermaid());   // Mermaid フローチャート
console.log(doc.stringify());   // 整形 TXTRA テキスト

// JSON Schema 連動変換（型キャスト・構造化）
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    role: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } }
  }
};
console.log(doc.toJson(schema));
// => { name: 'Alice', age: 25, role: 'admin', tags: ['dev', 'lead'] }
```

### 2. CLI（コマンドライン）での利用
インストールなしで `npx` から直接実行できます：

```bash
# Markdown に変換して標準出力 (デフォルト)
npx txtra input.txtra

# AST (NodeTree) を JSON 出力
npx txtra input.txtra --ast

# Mermaid フローチャートを出力
npx txtra input.txtra --mermaid

# JSON データを TXTRA 形式へシリアライズ
npx txtra data.json --stringify

# Markdown を TXTRA へ逆変換
npx txtra document.md --to-txtra
```

---

## 3. 構文規則と設計意図 (Grammar Rules & Intent)

### 基本
- __拡張子__: `.txt`
- __エンコーディング__: UTF-8 または ASCII

#### ドキュメント
- __見出し__: 行頭のコロン数（`: レベル1` 〜 `:::::: レベル6`）。
- __リスト__: インデントのある行、あるいは明示的に行頭 `- ` または `* ` 

#### データ構造
- __キー・バリュー__: `Key: Value`、重複許容。
- __子要素__: `Key` 改行直下にインデント半角空白2文字以上の差分、またはタブ文字 (`\t`) 
- __配列__: 半角空白2文字以上またはタブ文字で分離。推奨は半角空白4文字。
- __エスケープ__: 単文字 `\X`、インライン `` `...` ``、ブロック ` ```...``` ` (Markdown互換)

### キー・バリューのバリエーション
- `Key: Value`
- `Key.. Value`
PCでの Shift キー入力（`Shift + ;`）やスマホでの記号切り替えが打鍵リズムを損ねないよう、コロンの代替エイリアスとして `Key.. Value` および `Key..` を許容します。直後が空白または行末の場合のみ安全に判定されます。

### コンテナのバリエーション
- `Key:`  
  `  INDENT`
- `Key`  
  `  INDENT`
- `Key..`  
  `  INDENT`
コンテナノードの行末コロンは自動補完されますが、基本文法として `Key:` を置くことを推奨します。人間が「コンテナ xor バリュー」を瞬時に判読するガイド記号です。

### 同名キーの重複許容とドット参照 (.Key:)
メモや思考ノートにおいて、後から書いた内容は常に「今」であり、前行は「履歴」です。TXTRA は同階層の要素を全てリストと解釈するため、同名キー重複を自然に許容します。

直前に記述した同名スコープに属性を追加したい場合は、先頭にドットを付与して `.Key:`（または `.Key..`）と記述します。直近の同名スコープへの参照（`ref.latest.Key`）として解釈され、過去の記述を破壊することなく論理的にスコープを再オープンします。

### 表 (Table) と行列 (Matrix) のMarkdown解釈
- `Table:` 配下に2行以上の配列データを持つ場合、1行目をヘッダー行、2行目以降をデータ行とする表（GFM Table）として扱われます。
- `Matrix:` 配下に2行以上の配列データを持つ場合、ヘッダーレスな、1行目以降をデータ行とする表（GFM Table）として扱われます。

### 仮想改行 (Virtual Newlines)
`.: ` または行末の `.:` でチャット欄やCLI引数などの1行入力環境で改行とインデントを復元します。
---

## 4. 矢印構文 (Arrow Syntax / Mermaid Flowcharts)

関係性や処理フローを視覚的に記述するための構文です。Markdown 出力時には自動的に Mermaid フローチャートへ変換されます。

### 標準アロー
多様な矢印記法（`-->`, `->`, `→`, `==>`）を寛容に受け入れますが、標準・推奨記法を `>>` と定めています。`>>` は唯一、同キーの2連打で入力できるからです。

```txtra
Workflow:
  Client    >>    API Gateway: HTTP Request
  API Gateway    --auth->    AuthServer: Token Verification
Fanout:
  Queue    >>    WorkerA    WorkerB    WorkerC
  WorkerA    WorkerB    WorkerC    >>    Database
```

- __安全なノード識別__: 空白、括弧、コロン説明、Mermaid 予約語（`end` 等）が含まれていても、内部ノード ID を自動割り当てして安全に変換します。
- __行頭継続__: 行頭が `>>` から始まる場合、直前ノードからの接続として補完されます。
- __双方向復元 (Round-trip)__: `fromMarkdown()` により、Markdown 内の ` ```mermaid ` ブロックを TXTRA の Arrow 記法へ自動逆変換します。

---

## 5. LLM・構造化出力での活用 (AI-Native)

TXTRA は単純な構文指示だけで、学習済みのTSV、YAML、Markdown構文の解釈能力にフリーライドできるため、
LLMのアテンションコストが人間同様に比較的低く、出力も構文エラーを起こしません。

```text
以下の形式（TXTRA 記法）で出力してください。
- インデントは半角スペース2つ
- キーと値は「キー: 値」
- 複数要素は空白4文字またはタブ区切り

Result
  status: success
  count: 3
  items: Apple    Banana    Orange
```

1. __トークン消費の最小化__: 括弧や引用符の反復を排し、純粋な情報にトークンを集中させます。
2. __ストリーミングの自然な視読__: 生成途中のテキストをそのまま人間が読解できます。
3. __決定論的パース__: 出力テキストは瞬時に AST（匿名ノードは `_`）、CanonicalForm、JSON、Markdown へ変換されます。
4. __JSON Schema 連動 (`doc.toJson(schema)`)__: スキーマに従い、型キャスト（integer, boolean 等）や構造化を決定論的に確定させます。

---

## 6. 処理性能 (Performance)

外部依存ゼロの Pure JavaScript 実装。文字コード走査と Fast Path 設計により、極限のパース速度を誇ります。

```
[npm run bench 実測値 (大規模 10,000 行)]
  parseTXTRA      :   5.67 ms  |  速度:  1,763,868 lines/sec (秒間約176万行)
  stringifyTXTRA  :   0.64 ms  |  速度: 15,748,607 lines/sec (秒間約1570万行)
  toMarkdown      :   0.62 ms  |  速度: 16,166,330 lines/sec (秒間約1610万行)
  markdownToTXTRA :   0.55 ms  |  速度:  1,829,228 lines/sec (秒間約180万行)
```

詳細な分析は [docs/performance.md](./docs/performance.md) を参照してください。

---

## ドキュメント一覧

- [TXTRA 言語仕様書 (TXTRA.md)](./TXTRA.md) — *完全な言語仕様書と決定論的内部表現。*
- [パフォーマンス分析 (docs/performance.md)](./docs/performance.md) — *ベンチマークと設計指針。*
- [世界人綴宣言 (docs/unilateral_desolation_of_human_writes.md)](./docs/unilateral_desolation_of_human_writes.md) — *マニフェスト。*
- [English Documentation (README.md)](./README.md)

---

## ライセンス

[0BSD License (BSD Zero Clause License)](./LICENSE) © 2026 [ibara](https://github.com/ashleyxii)  
著作権表示・許諾表示の保持義務も含めて免除されたパブリックドメイン相当のライセンスです。商用・非商用を問わず自由にご利用いただけます。
