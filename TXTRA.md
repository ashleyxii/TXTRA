# TXTRA 言語仕様書 (Syntax Specification)
Version 1.0

## 1. 背景と設計理念 (Background & Philosophy)

TXTRA は、ターミナル、スマートフォンのメモ、LLM とのチャット入力欄など、高級エディタの補完や Markdown の自動プレビューが望めない環境での使用を想定して設計された軽量構造化テキストフォーマットです。

### 理念
1. プレーンテキストの視認ノイズ最小化を希求します。
2. あらゆる入力環境と鍵打感に配慮します。
3. 情報をただの読みやすいTXTとして記述します。
4. 以上をもって、我々は我々に、プレーンテキストの主権を取り戻します。

- 生テキストの可読性: プレビューなしでそのまま読める、静かな構文記号の選択。 
- 直感的文法: インデントによるネスト、複数空白による配列セパレート、キー: バリュー、以上。
- 入力性の追求: スマートフォンやシェル環境でも軽快に入力するための代替構文。
- 集中持続性: 思考を巻き戻さないための、キーの重複許容と後方優先のリスト概念。
- 木構造への整形: 曖昧さをパーサー側で吸収し、瞬時に AST や JSON へ変換。

---

## 2. 文法規則と設計意図 (Grammar Rules & Intent)

### 2.1 テキストエンコーディング
- 文字コード: UTF-8
- 改行コード: LF (`\n`) または CRLF (`\r\n`)

### 2.2 インデントとスコープ
- インデント単位: 半角空白2文字以上、またはタブ文字 (`\t`)
- インデント深度により親ノードと子ノードの包含関係を決定します。

### 2.3 見出し (Headings) と独立性
行頭のコロン数によって見出しレベルを表現します（Markdown の `#` に相当）。
- `: レベル1見出し` (`_H1`)
- `:: レベル2見出し` (`_H2`)
- `::: レベル3見出し` (`_H3`) （最大 `::::::` の6段階）

見出しと本文はHTMLのようにフラットな第一層の構成要素であり、ネストを形成しません。
構造体ではなくアンカーとして、セクションの区画を明瞭化し、検索性を最大限に高めます。

### 2.4 キー・バリューとコンテナ
- `Key: Value` (または `Key.. Value`): 単一の属性を定義します。
- `Key:` (または `Key..` のみ): 子ノードを包含するコンテナノードになります。

#### インデント前のコロン（Key:）の意義
TXTRA はコンテナノードの行末コロンを自動補完しますが、基本文法として `Key:` を置くことを推奨します。
これは人間が「子要素を持つKey（コンテナ）か、Valueか？」を瞬時に判読するガイドとしての記号です。

#### 二重ドット構文 (Key..)の意義
PCでの Shift キー入力（`Shift + ;`）やスマートフォンでの記号ページ切り替えが打鍵リズムを損ねないよう、コロンの代替エイリアスとして `Key.. Value` および `Key..`（コンテナ）を許容します。
なお、数値範囲（`1..10`）や相対パス（`../`）、値の中の三点リーダー（`...`）との誤爆を防ぐため、キー文字列の直後に `..` があり直後が空白または行末の場合のみ安全に判定されます。

### 2.5 配列 (Arrays) と推奨空白
同一行内で要素を区切ることで、インライン配列として認識されます。
- 構文規則: 半角空白3文字以上、またはタブ文字 (`\t`)
- 推奨記法: 半角空白4文字(見やすいため)、またはタブ文字
- 末尾の余白による空文字（`""`）は生成が抑止されます。

### 2.6 同名キーの重複許容とドット参照 (.Key:)
メモや思考ノートにおいて、後から書いた内容は常に「最新の思考」であり、前行は「過去の経緯や履歴」です。
一般的なフォーマット（JSON 等）ではキーの重複が禁止されるか上書きされますが、TXTRA では同名キーの多重定義を自然に許容します。

#### ドット参照 (`.Key:`) による最新スコープへの結合
直前に記述した同名スコープに対して属性を追加したい場合は、先頭にドットを付与して `.Key:`（または `.Key..`）と記述します。
パーサーはこれを直近の同名スコープへの参照（`ref.latest.Key`）として解釈し、過去の記述を破壊することなく論理的にスコープを再オープンします。

### 2.7 表 (Table) と行列 (Matrix)のMarkdown解釈
- `Table:`: 配下に2行以上の配列データを持つ場合、1行目をヘッダー行、2行目以降をデータ行とする表（GFM Table）として扱われます。
- `Matrix:`:配下に2行以上の配列データを持つ場合、ヘッダーレスな、1行目以降をデータ行とする表（GFM Table）として扱われます。

### 2.8 明示リスト (Explicit Lists)
行頭に `- ` または `* ` を配置して箇条書き項目を記述します。
直前に親ノードが存在する場合、インデントなしでも自動的にその親の配下にネストされます。

### 2.9 仮想改行 (Virtual Newlines)
チャット入力欄やコマンドライン引数など、物理改行が困難な1行入力環境のための記法です。
- `.: ` または行末の `.:`
- パーサーはこれを物理改行およびインデント復元として展開します。

### 2.10 エスケープ (Escapes)
- 単文字エスケープ: `\X`（記号の構文解釈を無効化）
- インラインエスケープ: `` `...` ``（バッククオート内の文字列をリテラルとして保護）
- ブロックエスケープ: ` ```...``` ` または `,,,,...,,,,`（複数行のコードやリテラルブロックを保護）

---

## 3. 矢印構文 (Arrow Syntax / Mermaid Flowcharts)

関係性や処理フローを自然に記述するための構文です。Markdown 出力時には自動的に Mermaid フローチャートへ変換されます。

#### 標準アロー
TXTRA は `-->`, `->`, `→`, `==>` など多様な矢印記法を寛容に受け入れますが、標準・推奨記法を `>>` と定めています。
`>>` は唯一、同キーの2連打で入力できるからです。また、配列セパレーター環境下での入力エイリアスとして `gggt` もサポートします。

### 3.1 基本遷移とラベル
```txtra
Workflow:
  Client    >>    API Gateway: HTTP Request
  API Gateway    --auth->    AuthServer: Token Verification
```

### 3.2 連続接続 (Chain)
同一行内で `>>` を連続して記述することで、直列フローを表現できます。
```txtra
Chain:
  Step1    >>    Step2    >>    Step3    >>    Finish
```

### 3.3 行頭継続
行頭を `>>` で開始した場合、直前に出現したノードからの継続接続として補完されます。
```txtra
TaskA
>>    TaskB
>>    TaskC
```

### 3.4 ファンアウトとファンイン (Fanout / Fanin)
複数ノードを配列（4文字空白）で並べることで、一括分岐・合流を簡潔に表現できます。
```txtra
Distribution:
  Queue    >>    WorkerA    WorkerB    WorkerC
  WorkerA    WorkerB    WorkerC    >>    Database
```

### 3.5 参照とフィードバックループ
ドット参照記法と組み合わせることで、直前ノードへのフィードバックループを表現できます。
```txtra
ReviewCycle:
  Draft    --submit->    Review
  Review    --reject->    .Draft
  Review    --approve->   Publish
```

---

## 4. 入出力と内部表現の対応 (Representations)

単一の TXTRA テキストが、内部でどのように決定論的に変換されるかを示します。

### 入力テキスト (TXTRA)
```txtra
: Heading1
:: Heading2
the text
the next
Structure:
  description
  NODE: DATA
  ARRAY: A    R    R    A    Y
  Matrix:
    M    A    T
    R    I    X
  NODE:
    duplication: enable 
  .NODE:
    Dot prefix means reference latest.
```

### 抽象構文木 (NodeTree AST)
```json
[
  {"node":"_H1","data":["Heading1"]},
  {"node":"_H2","data":["Heading2"]},
  {"node":"_","data":["the text"]},
  {"node":"_","data":["the next"]},
  {"node":"Structure","data":[
    {"node":"_","data":["description"]},
    {"node":"NODE","data":["DATA"]},
    {"node":"ARRAY","data":["A","R","R","A","Y"]},
    {"node":"Matrix","data":[
      {"node":"_","data":["M","A","T"]},
      {"node":"_","data":["R","I","X"]}
    ]},
    {"node":"NODE","data":[
      {"node":"duplication","data":["enable"]}
    ]},
    {"node":"ref.latest.NODE","data":[
      {"node":"_","data":["Dot prefix means reference latest."]}
    ]}
  ]}
]
```

### 標準タプル表現 (CanonicalForm)
```json
[
  ["_H1","Heading1"],
  ["_H2","Heading2"],
  ["_","the text"],
  ["_","the next"],
  ["Structure",
    ["_","description"],
    ["NODE","DATA"],
    ["ARRAY","A","R","R","A","Y"],
    ["Matrix",
      ["_","M","A","T"],
      ["_","R","I","X"]
    ],
    ["NODE",
      ["duplication","enable"]
    ],
    ["ref.latest.NODE",
      ["_","Dot prefix means reference latest."]
    ]
  ]
]
```

### Markdown 変換結果
```markdown
# Heading1
## Heading2
the text  
the next  
- Structure:
  - description  
  - NODE: DATA
  - ARRAY: A    R    R    A    Y
  - 
    | | | |
    |-|-|-|
    |M|A|T|
    |R|I|X|
  - NODE:
    - duplication: enable 
  - ref.latest.NODE:
    - Dot prefix means reference latest.
```
