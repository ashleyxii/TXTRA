# TXTRA (TXT in Readable Annotation)

[English](README.md) | [日本語 (Japanese)](README_ja.md)

> A lightweight structured text format balancing plain-text readability and deterministic tree structures.

[![npm version](https://img.shields.io/badge/npm-v1.0.1-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Tests: 49 passing](https://img.shields.io/badge/tests-49%20passing-brightgreen.svg)](tests/)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-blue.svg)](src/index.d.ts)

[Web Playground (Live Demo)](https://ashleyxii.github.io/TXTRA/)  
Try real-time parsing, Markdown generation, and Mermaid flowcharts directly in your browser.

---

## 1. Background & Concepts

TXTRA is a lightweight structured text format designed for minimal environments where sophisticated editor autocompletion or live Markdown rendering cannot be expected—such as CLI terminals, smartphone notes, and LLM chat inputs.

### Core Concepts
- __Raw Text Readability__: Unobtrusive syntax that reads cleanly as plain text without requiring a rendered preview.
- __Minimal Grammar__: Indented nesting, multi-space separation, and key-value pairs.
- __Input Ergonomics__: Alternative syntax (`..`) optimized for mobile devices and terminals without requiring `Shift`.
- __Append-only Flow__: Allows duplicate keys and latest-first references (`.Key:`) so thoughts don't need rewinding.
- __Deterministic Parsing__: Compiles unambiguously into AST, Canonical Form, JSON, or Markdown.

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
| **Primary Use** | Machine communication / API | App configuration | Human-oriented documents | **Human thought notes / LLM I/O** |
| **Raw Text Readability** | Low (Bracket & quote noise) | Medium (Indentation-dependent) | High (Preview recommended) | **High (Natural without preview)** |
| **Typing Ergonomics** | Tedious (Error-prone punctuation) | Fair (Strict indentation, no tabs) | Fair (Frequent symbol switching) | **Extremely comfortable (Minimal Shift/symbols)** |
| **Structural Determinism** | Strict (100% mechanical) | Strict (Huge specification) | Very low (Freeform, hard to extract) | **Deterministic (Direct AST / JSON mapping)** |
| **Append-only Workflow** | Overwrites or discouraged | Syntax error (Duplicate keys) | Free (No data structure) | **Allowed (Auto-list / Reference scope)** |
| **Token Efficiency** | Low (Redundant) | High | High | **High** |
| **Ecosystem & History** | Global standard | Global standard | Global standard | **Emerging (Zero-dependency parser)** |

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

## 5. Schema Validation & Type Casting (`toJsonWithSchema`)

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

## 6. Architecture & Performance

- **Zero Dependencies**: Pure JavaScript implementation with no external runtime packages.
- **Single-Pass Scanner**: Lightweight character scanning avoiding heavy regular expression backtracking.
- **Universal Runtime**: Standard ES Modules with TypeScript declarations included, running seamlessly across Node.js, browsers, and edge environments.

---

## Documentation

- [TXTRA Specification (TXTRA.md)](./TXTRA.md) — *Syntax specification and AST representations.*
- [Japanese Documentation (README_ja.md)](./README_ja.md) — *日本語ドキュメント*
- [The Unilateral Desolation of Human Writes (docs/unilateral_desolation_of_human_writes.md)](./docs/unilateral_desolation_of_human_writes.md) — *Manifesto.*

---

## License

[0BSD License (BSD Zero Clause License)](./LICENSE) © 2026 [ibara](https://github.com/ashleyxii)  
A public-domain equivalent license free of any requirements to retain copyright notices or permission text. Free for both commercial and non-commercial use.
