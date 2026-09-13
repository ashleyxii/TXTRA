# TXTRA (TXT in Readable Annotation)

[English](README.md) | [日本語 (Japanese)](README_ja.md)

> A lightweight structured text format balancing plain-text readability and deterministic tree structures.

[![npm version](https://img.shields.io/badge/npm-v1.0.3-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
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

---

## 2. Quick Start

### Installation
```bash
npm install txtra
```

### 2.1. JavaScript / TypeScript Usage
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

### 2.2. CLI (Command Line) Usage
Run directly via `npx` without prior installation:

```bash
# Convert TXTRA to Markdown and print to stdout (default)
npx txtra input.txt

# Output AST (NodeTree) as JSON
npx txtra input.txt --ast

# Output CanonicalForm tuple array as JSON
npx txtra input.txt --canonical

# Output Mermaid flowchart
npx txtra input.txt --mermaid

# Stringify JSON data back to TXTRA
npx txtra data.json --stringify

# Convert Markdown file back to TXTRA
npx txtra document.md --to-txtra

# Also accepts piped input from stdin
cat notes.txt | npx txtra --mermaid
```

---

## 3. Grammar Rules

### Basics
- __File Extension__: `.txt`
- __Encoding__: UTF-8 or ASCII

#### Document
- __Headings__: Number of colons at the start of a line (`: Level 1` to `:::::: Level 6`).
- __Lists__: Every line is implicitly a list item. Alternatively, lines starting explicitly with `- ` or `* `.

#### Data Structure
- __Key-Value__: `Key: Value`, duplicate keys permitted.
- __Children__: A line break directly under `Key` or `Key:` (recommended) followed by an indentation delta of 2+ spaces, or a tab character (`\t`).
- __Arrays__: Separated by 3 or more spaces or tabs. Recommended: 4 spaces.
- __Escapes__: Single character `\X`, inline `` `...` ``, block ` ```...``` ` (Markdown compatible).

### Interpretive Syntaxes
Mechanisms triggered during specific interpretations.

#### Table & Matrix Markdown Interpretation
- `Table:`: When containing 2 or more lines of array data, it compiles into a table (GFM Table) with row 1 as headers and subsequent rows as data.
- `Matrix:`: When containing 2 or more lines of array data, it compiles into a headerless table (GFM Table) with row 1 onwards treated as data rows.

#### Duplicate Keys & Dot References (.Key:)
In notes and thought logs, what you write later is always "the present", while previous lines are "history". TXTRA internally interprets every line as a headed list, naturally embracing duplicate keys.

If you want to append attributes to the immediately preceding scope of the same name, prefix the key with a dot: `.Key:`. It is parsed as a reference to the latest matching scope (`ref.latest.Key`), reopening the scope logically without mutating historical records.

Combining these unifies interpretations for latest extraction, diff extraction, and multiple extraction.

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

## 5. Physical Grammar
Born from the desire not to break typing rhythm—avoiding `Shift + ;` on keyboards, symbol page flips on smartphones, or awkward reaches on 60% keyboards. This concept is embodied as "physical grammar", and input-first implementations as physical aliases. Since it degrades visual aesthetics quite a bit, normalizing it before saving is recommended.

#### Colon Alias
```
Key.. Value
Key.. 
  Children
```
`Key.. ` is supported as an alternative alias for syntax colons. Safely detected only when not a triple-dot and immediately followed by whitespace or line end. In normal usage without colons, parent keys are determined solely by indentation anyway.

### Block Alias
```
,,,,
block
,,,,
```
Born for 65% keyboardists. Physical alias for inline escapes was intentionally dropped (TXTRA already tolerates plenty of symbols in plain text, and anything more would just pollute the prose).

### Virtual Newlines
`.: ` or line-ending `.:` restores newlines and indentation in single-line environments where sending and Enter cannot be distinguished, like chat prompts or CLI arguments.

### Arrow Alias
```
gggt 
```
For those who find even `>>` a hassle, feel free to use `gggt`.
Exclusively supported within inline array contexts followed by 3+ spaces or a tab.

## 6. Schema Validation & Type Casting (`toJsonWithSchema`)

TXTRA parses raw text into string-based AST trees by default. When structured types (integers, booleans, arrays of objects) are required—such as when parsing LLM outputs or configuration files—`doc.toJson(schema)` validates and casts nodes according to a standard JSON Schema definition.

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

## 7. Architecture & Performance

- **Zero Dependencies**: Pure JavaScript implementation with no external runtime packages.
- **Single-Pass Scanner**: Lightweight character scanning avoiding heavy regular expression backtracking.
- **Universal Runtime**: Standard ES Modules with TypeScript declarations included, running seamlessly across Node.js, browsers, and edge environments.

---

## Documentation

- [TXTRA Specification (TXTRA.md)](./TXTRA.md) — *Syntax specification and AST representations.*
- [Japanese Documentation (README_ja.md)](./README_ja.md) — *日本語ドキュメント*
- [The Universal Declaration of Human Writes (docs/UDHW.md)](./docs/UDHW.md) — *Manifesto.*

---

## Changelog

- **v1.0.3**: fix: prevent colon false-positives (times/URLs/ports) and support auto-promotion of scalar keys to containers
- **v1.0.2**: feat: add physical grammar aliases (colon `..`, block `,,,,`, arrow `gggt`) and update array delimiter to 3+ spaces
- **v1.0.1**: docs: refine format comparison and prune package files
- **v1.0.0**: feat: initial release of TXTRA format, parser, and converters

---

## License

[0BSD License (BSD Zero Clause License)](./LICENSE) © 2026 [ashleyxii](https://github.com/ashleyxii)  
A public-domain equivalent license free of any requirements to retain copyright notices or permission text. Free for both commercial and non-commercial use.
