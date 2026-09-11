# TXTRA (TXT in Readable Annotation)

[English](README.md) | [日本語 (Japanese)](README_ja.md)

> A lightweight structured text format balancing plain-text readability and deterministic tree structures.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Tests: 49 passing](https://img.shields.io/badge/tests-49%20passing-brightgreen.svg)](tests/)
[![Speed: 1.8M lines/sec](https://img.shields.io/badge/speed-1.8M%20lines%2Fsec-orange.svg)](docs/performance.md)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-blue.svg)](src/index.d.ts)

[Web Playground (Live Demo)](https://ashleyxii.github.io/TXTRA/)  
Try real-time parsing, Markdown generation, and Mermaid flowcharts directly in your browser.

---

## 1. Background & Philosophy

TXTRA is a lightweight structured text format designed for minimal environments where sophisticated editor autocompletion or live Markdown rendering cannot be expected—such as CLI terminals, smartphone notes, and LLM chat inputs.

### Philosophy
1. We seek to minimize visual noise in plain text.
2. We respect every input environment and keystroke rhythm.
3. We simply write information as readable TXT.
4. Through these principles, we reclaim our sovereignty over plain text.

- __Raw Text Readability__: Silent, unobtrusive syntax symbols that read cleanly without a preview.
- __Intuitive Grammar__: Indented nesting, multi-space separation, key-value pairs—that is all.
- __Input Ergonomics__: Alternative syntaxes optimized for smartphones and terminal shells.
- __Sustained Flow__: Append-only design allowing duplicate keys and latest-first references without rewinding thoughts.
- __Tree Compilation__: Tolerates human ambiguity and compiles deterministically into AST or JSON.

---

### Basic Syntax Preview

Write naturally like a daily note; hierarchy, tables, and lists are resolved automatically:

```txtra
: Meeting Notes
:: Agenda
Evaluate typing ergonomics in terminals and mobile devices.

Project
  status: in-progress
  members: Alice    Bob    Charlie
  tasks:
    - review syntax spec
    - run parser benchmarks

Table:
  Name        Role        Status
  Alice       Lead        Done
  Bob         Dev         In-progress

Matrix:
  1    0    0
  0    1    0
  0    0    1
```

### Format Comparison

| Aspect | JSON | YAML | Markdown | TXTRA |
|:---|:---|:---|:---|:---|
| Notation Style | Strict symbolic | Moderately strict spatial | Loose symbolic | Loose spatial |
| Syntax Rules | Extremely few | Extremely many | Moderately many | Few |
| Token Efficiency | Low | High | High | Highest (narrow margin) |
| LLM Comprehension | High | High | Highest | Moderately high |
| Extensibility | Rejected | Rejected | Allowed | Allowed |

---

## 2. Quick Start

### Installation
```bash
npm install txtra
```

### 1. JavaScript / TypeScript Usage
```javascript
import { txtra, parseTXTRA, stringifyTXTRA, toJsonWithSchema } from 'txtra';

const source = `
User
  name: Alice
  age: 25
  role: admin
  tags: dev    lead
`;

// One-stop facade
const doc = txtra(source);

console.log(doc.ast);           // Deterministic AST (NodeTree)
console.log(doc.toMarkdown());  // GitHub Flavored Markdown (GFM)
console.log(doc.toCanonical()); // Canonical tuple representation
console.log(doc.toMermaid());   // Mermaid flowchart
console.log(doc.stringify());   // Clean TXTRA text

// JSON Schema binding (type casting and object shaping)
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

### 2. CLI (Command Line) Usage
Run directly via `npx` without prior installation:

```bash
# Convert TXTRA to Markdown and print to stdout (default)
npx txtra input.txtra

# Output AST (NodeTree) as JSON
npx txtra input.txtra --ast

# Output Mermaid flowchart
npx txtra input.txtra --mermaid

# Stringify JSON data back to TXTRA
npx txtra data.json --stringify

# Convert Markdown file back to TXTRA
npx txtra document.md --to-txtra
```

---

## 3. Grammar Rules & Intent

### Basics
- __File Extension__: `.txt`
- __Encoding__: UTF-8 or ASCII

#### Document
- __Headings__: Number of colons at the start of a line (`: Level 1` to `:::::: Level 6`).
- __Lists__: Indented lines, or lines explicitly starting with `- ` or `* `.

#### Data Structure
- __Key-Value__: `Key: Value`, duplicate keys permitted.
- __Children__: Line break directly under `Key` followed by an indentation delta of 2 or more spaces, or tabs (`\t`).
- __Arrays__: Separated by 2 or more spaces or tabs. Recommended: 4 spaces.
- __Escapes__: Single character `\X`, inline `` `...` ``, block ` ```...``` ` (Markdown compatible).

### Key-Value Variations
- `Key: Value`
- `Key.. Value`

To preserve typing rhythm without forcing the Shift key (`Shift + ;`) on physical keyboards or symbol page flips on mobile devices, `Key.. Value` and `Key..` are accepted as aliases for colons. They are safely recognized only when immediately followed by whitespace or line end.

### Container Variations
- `Key:`  
  `  INDENT`
- `Key`  
  `  INDENT`
- `Key..`  
  `  INDENT`

Trailing colons on container nodes are automatically inferred, but writing `Key:` as the base grammar is recommended. It serves as a visual guide for humans to instantly distinguish "container xor value".

### Duplicate Keys & Dot References (.Key:)
In notes and thought logs, what you write later is always "the present", while previous lines are "history". Because TXTRA interprets all sibling elements at the same depth as a list, duplicate keys are naturally embraced.

To append attributes to the most recently defined scope of the same name, prefix the key with a dot: `.Key:` (or `.Key..`). It is parsed as a reference to the latest matching scope (`ref.latest.Key`), reopening the scope logically without mutating historical records.

### Table & Matrix Markdown Interpretation
- `Table:`: When containing 2 or more lines of array data, it compiles into a table (GFM Table) with row 1 as headers and subsequent rows as data.
- `Matrix:`: When containing 2 or more lines of array data, it compiles into a headerless table (GFM Table) with row 1 onwards treated as data rows.

### Virtual Newlines
`.: ` or line-ending `.:` restores newlines and indentation in single-line input environments such as chat prompts or CLI arguments.

---

## 4. Arrow Syntax (Arrow Syntax / Mermaid Flowcharts)

A syntax for visually describing relationships and process flows. When exporting to Markdown, it is automatically converted into Mermaid flowcharts.

### Standard Arrow
While TXTRA tolerates various arrow notations (`-->`, `->`, `→`, `==>`), `>>` is established as the standard, recommended syntax. This is because `>>` is the only arrow typed with two consecutive strikes of the exact same key.

```txtra
Workflow:
  Client    >>    API Gateway: HTTP Request
  API Gateway    --auth->    AuthServer: Token Verification
Fanout:
  Queue    >>    WorkerA    WorkerB    WorkerC
  WorkerA    WorkerB    WorkerC    >>    Database
```

- __Safe Node Identification__: Even if labels include spaces, brackets, colon descriptions, or Mermaid reserved words (such as `end`), unique internal node IDs are automatically assigned for safe conversion.
- __Line Continuation__: If a line begins with `>>`, it is automatically connected from the preceding node.
- __Round-trip Restoration__: `fromMarkdown()` automatically translates ` ```mermaid ` blocks in Markdown back into TXTRA Arrow syntax.

---

## 5. AI-Native & Structured Output (AI-Native)

With simple syntax instructions alone, TXTRA free-rides on LLMs' pre-trained comprehension of TSV, YAML, and Markdown syntax. As a result, the model's attention overhead remains relatively low—just as it is for humans—and outputs avoid syntax errors.

```text
Please output in the following format (TXTRA syntax):
- Indent by 2 spaces
- Key and value as "Key: Value"
- Multiple elements separated by 4 spaces or tabs

Result
  status: success
  count: 3
  items: Apple    Banana    Orange
```

1. __Token Minimization__: Eliminates repetitive braces and quotes, focusing tokens strictly on pure information.
2. __Natural Streaming Readability__: Humans can read and verify text comfortably in real-time as it streams.
3. __Deterministic Parsing__: Generated text converts instantly into an AST (anonymous nodes as `_`), CanonicalForm, JSON, or Markdown.
4. __JSON Schema Binding (`doc.toJson(schema)`)__: Concretizes type casting (integers, booleans, etc.) and object structures deterministically according to schema.

---

## 6. Performance

A zero-dependency Pure JavaScript implementation. Delivers extreme parsing speeds via linear character scanning and Fast Path architectures.

```
[npm run bench measurements (Large 10,000 lines)]
  parseTXTRA      :   5.67 ms  |  Speed:  1,763,868 lines/sec (~1.76M lines/s)
  stringifyTXTRA  :   0.64 ms  |  Speed: 15,748,607 lines/sec (~15.7M lines/s)
  toMarkdown      :   0.62 ms  |  Speed: 16,166,330 lines/sec (~16.1M lines/s)
  markdownToTXTRA :   0.55 ms  |  Speed:  1,829,228 lines/sec (~1.80M lines/s)
```

See [docs/performance.md](./docs/performance.md) for detailed analysis and design guidelines.

---

## Documentation

- [TXTRA Specification (TXTRA.md)](./TXTRA.md) — *Complete syntax spec and deterministic representations.*
- [Performance Analysis (docs/performance.md)](./docs/performance.md) — *Benchmark analysis and design principles.*
- [The Unilateral Desolation of Human Writes (docs/unilateral_desolation_of_human_writes.md)](./docs/unilateral_desolation_of_human_writes.md) — *Manifesto.*
- [Japanese Documentation (README_ja.md)](./README_ja.md)

---

## License

[0BSD License (BSD Zero Clause License)](./LICENSE) © 2026 [ibara](https://github.com/ashleyxii)  
A public-domain equivalent license free of any requirements to retain copyright notices or permission text. Free for both commercial and non-commercial use.
