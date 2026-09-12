# TXTRA (TXT in Readable Annotation)

[English](README.md) | 日本語

> プレーンテキストの自然さと、決定論的な木構造を両立する軽量構造化テキストフォーマット

[![npm version](https://img.shields.io/badge/npm-v1.0.2-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Tests: 51 passing](https://img.shields.io/badge/tests-51%20passing-brightgreen.svg)](tests/)
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
4. 以上をもって、我々は我々に、プレーンテキストの主権を取り戻します。[宣言](/docs/UDHW.md)

### 設計
- __生テキストの可読性__: プレビューなしでそのまま読める、静かな構文記号の選択。
- __直感的文法__: インデントネスト、複数空白セパレート、キー: バリュー、以上。
- __入力性の追求__: スマートフォンや片手環境でも軽快に入力するための代替構文。
- __集中持続性__: 思考を巻き戻さないための、キーの重複許容と後方優先のリスト概念。
- __木構造への整形__: 曖昧さをパーサー側で吸収し、瞬時に AST や JSON へ変換。


### 基本文法

日常のメモのように書くだけで、階層構造や表、リストが自動的に確定します。

```txtra
: ノート見出し
:: 小見出し
これは通常の段落テキストです。

プロジェクト
  ステータス: 進行中
  メンバー: 田中    佐藤    鈴木
  タスク:
    仕様の策定
    プロトタイプ実装

Table:
  名前      役割      進捗
  田中      設計      完了
  佐藤      開発      進行中

Matrix:
  1    0    0
  0    1    0
  0    0    1
```

---

## 2. クイックスタート (Quick Start)

### インストール
```bash
npm install txtra
```

### 2.1. JavaScript / TypeScript での利用
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

### 2.2. CLI（コマンドライン）での利用
インストールなしで `npx` から直接実行できます：

```bash
# Markdown に変換して標準出力 (デフォルト)
npx txtra input.txt

# AST (NodeTree) を JSON 出力
npx txtra input.txt --ast

# Mermaid フローチャートを出力
npx txtra input.txt --mermaid

# JSON データを TXTRA 形式へシリアライズ
npx txtra data.json --stringify

# Markdown を TXTRA へ逆変換
npx txtra document.md --to-txtra
```

---

## 3. 構文規則

### 基本
- __拡張子__: `.txt`
- __エンコーディング__: UTF-8 または ASCII

#### ドキュメント
- __見出し__: 行頭のコロン数（`: レベル1` 〜 `:::::: レベル6`）。
- __リスト__: 全ての行は暗黙的にリストです。あるいは明示的に行頭 `- ` または `* ` 

#### データ構造
- __キー・バリュー__: `Key: Value`、重複許容。 
- __子要素__: `Key`+改行 または`Key:`+改行(推奨) 直下にインデント半角空白2文字以上の差分、またはタブ文字 (`\t`) 
- __配列__: 半角空白3文字以上またはタブ文字で分離。推奨は半角空白4文字。(update 1.0.2: 2+ →3+)
- __エスケープ__: 単文字 `\X`、インライン `` `...` ``、ブロック ` ```...``` ` (Markdown互換)

### 解釈構文
限定的な解釈時に発露する機構です。

#### 表 (Table) と行列 (Matrix) のMarkdown解釈
- `Table:` 配下に2行以上の配列データを持つ場合、1行目をヘッダー行、2行目以降をデータ行とする表（GFM Table）として扱われます。
- `Matrix:` 配下に2行以上の配列データを持つ場合、ヘッダーレスな、1行目以降をデータ行とする表（GFM Table）として扱われます。

#### 同名キーとドット参照 (.Key:)
メモや思考ノートにおいて、後から書いた内容は常に「今」であり、前行は「履歴」です。TXTRA は内部的に全行をヘッダー付きリストと解釈するため、同名キー重複を自然に許容します。

直前に記述した同名スコープに属性を追加したい場合は、先頭にドットを付与して `.Key:`と記述します。直近の同名スコープへの参照（`ref.latest.Key`）として解釈され、過去の記述を破壊することなく論理的にスコープを再オープンします。

これらの組み合わせによって、最新抽出、更新差分抽出、複数抽出等の解釈を一致させます。

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

## 5. フィジカル文法(new 1.0.2)
PCでの Shift キー入力（`Shift + ;`）やスマホでの記号切り替え、60%キーボード環境等でも打鍵リズムを損ねたくない、という概念をフィジカル文法として、入力優位の実装をフィジカルエイリアスとして体現しました。見た目がそれなりに悪化するため、正規化されることを推奨します。

#### コロン エイリアス
```
Key.. Value
Key.. 
  Children
```
構文コロンの代替エイリアスとして`Key.. ` を設定します。非3連符かつ直後が空白または行末の場合のみ安全に判定されます。通常でも親Keyの場合はインデントのみで判定します。

### ブロックエイリアス(new 1.0.2)
```
,,,,
block
,,,,
```
65%キーボーディストのために生まれました。インラインエスケープのフィジカル実装は見送ります。(既にかなりの記号を地の文で許容しており、これ以上はテキストが汚れるため)

### 仮想改行 (Virtual Newlines)
`.: ` または行末の `.:` でチャット欄やCLI引数など、送信とEnterが区別出来ない入力環境で、改行とインデントを復元します。

### アローエイリアス(new 1.0.2)
```
gggt 
```
最早 >> すら面倒くさい人は gggt を使用して下さい。
gggt+後方にスペース3以上またはタブ文字の、配列時限定仕様です。 

## 6. スキーマ検証と型キャスト (`toJsonWithSchema`)

TXTRA は生テキストを文字列ベースの AST ツリーとして解釈します。LLM の出力テキストや設定ファイルなどから厳密なデータ構造（数値、真偽値、オブジェクト配列など）を取り出したい場合、`doc.toJson(schema)` に標準的な JSON Schema を渡すことで、決定論的に型キャストおよび構造化を行えます。

```typescript
const doc = txtra(`
Result
  status: success
  count: 3
  items: Apple    Banana    Orange
`);

const schema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    count: { type: 'integer' },
    items: { type: 'array', items: { type: 'string' } }
  }
};

console.log(doc.toJson(schema));
// => { status: 'success', count: 3, items: ['Apple', 'Banana', 'Orange'] }
```

---

## 7. 設計方針とアーキテクチャ

- **依存パッケージゼロ**: 外部ランタイムライブラリを一切使わない Pure JavaScript 実装。
- **1パス逐次走査**: 重い正規表現バックトラックを排した、高速で軽量な構文解析。
- **ユニバーサル対応**: TypeScript 型定義を完全同梱し、Node.js、ブラウザ、Edge 環境のどこでもそのまま動作。

---

## ドキュメント一覧

- [TXTRA 言語仕様書 (TXTRA.md)](./TXTRA.md) — *言語仕様書と AST 内部表現。*
- [English Documentation (README.md)](./README.md) — *英語ドキュメント*
- [世界人綴宣言 (docs/UDHW.md)](./docs/UDHW.md) — *マニフェスト。*

---

## ライセンス

[0BSD License (BSD Zero Clause License)](./LICENSE) © 2026 [ashleyxii](https://github.com/ashleyxii)  
著作権表示・許諾表示の保持義務も含めて免除されたパブリックドメイン相当のライセンスです。商用・非商用を問わず自由にご利用いただけます。
