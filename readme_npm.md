# TXTRA

> **TXT in Readable Annotation** — Lightweight structured text format, parser, and converter for JavaScript & TypeScript.  
> Zero dependencies. Zero build-step required. 100% deterministic tree parsing.

[![npm version](https://img.shields.io/badge/npm-v1.0.2-cb3837.svg)](https://www.npmjs.com/package/txtra)
[![License: 0BSD](https://img.shields.io/badge/License-0BSD-blue.svg)](https://opensource.org/licenses/0BSD)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-blue.svg)](src/index.d.ts)

---

## 1. Installation & CLI

### Installation
```bash
npm install txtra
```

### CLI Usage
Execute directly with `npx` or use the global binary `txtra`:

```bash
# Convert TXTRA to Markdown (Default)
npx txtra document.txtra

# Output Abstract Syntax Tree (AST) as JSON
npx txtra document.txtra --ast

# Output Mermaid Flowchart
npx txtra document.txtra --mermaid

# Stringify JSON into TXTRA format
npx txtra data.json --stringify

# Convert Markdown to TXTRA
npx txtra notes.md --to-txtra
```

---

## 2. JavaScript / TypeScript API

### Facade Function (`txtra`)
The unified entry point for parsing and converting TXTRA documents:

```typescript
import { txtra } from 'txtra';

const doc = txtra(`
Project
  name: Orion
  tags: core    infra
  Tasks:
    - Init DB
    - Setup API
`);

// 1. Abstract Syntax Tree (NodeTree)
console.log(doc.ast);

// 2. Export to GitHub Flavored Markdown (GFM)
console.log(doc.toMarkdown());

// 3. Export to Mermaid Flowchart
console.log(doc.toMermaid());

// 4. Export to Canonical Form [ [key, val, [children]] ]
console.log(doc.toCanonical());

// 5. Serialize back to formatted TXTRA string
console.log(doc.stringify());

// 6. JSON Schema Validation & Type Casting
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } }
  }
};
console.log(doc.toJson(schema));
```

### Individual Functions

```typescript
import {
  parseTXTRA,         // (src: string) => NodeTree
  stringifyTXTRA,     // (data: NodeTree | object | CanonicalForm) => string
  toJsonWithSchema,   // (ast: NodeTree, schema: object) => object
  markdownToTXTRA,    // (markdown: string) => string
  mermaidToTXTRA      // (mermaid: string) => string
} from 'txtra';
```

---

## 3. Syntax Specification

### 3.1 Headings
Headings are indicated by leading colons (`:`) at the start of a line (equivalent to Markdown `#`). Headings act as top-level section anchors and do not form nested tree scopes.

```txtra
: Level 1 Section
:: Level 2 Subsection
::: Level 3 Heading (up to 6 colons)
```

### 3.2 Indentation & Scope Hierarchy
- Indentation unit: **2 or more spaces**, or a single tab character (`\t`).
- Indentation depth strictly determines the parent-child relationship.
- Unkeyed lines beneath a node are automatically promoted as child text leaves (`_`).

```txtra
Root
  Child A
    Grandchild
  Child B
```

### 3.3 Key-Value & Containers
- `Key: Value`: Defines an attribute node.
- `Key:`: Defines a container node expecting indented children.
- Colons on container nodes are optional but recommended for human readability.

#### Double-Dot Syntax (`Key..`)
To minimize typing overhead on mobile keyboards and terminals without `Shift`, double-dot (`..`) is a valid alias for colons:

```txtra
Config..
  port.. 8080
  host.. localhost
```
*Note: Evaluated only when immediately followed by whitespace or line end. Never conflicts with `../` (paths) or `1..10` (ranges).*

### 3.4 In-line Arrays & Delimiters
Separating elements by **3 or more spaces** (or tabs) within a single line defines an inline array. 4 spaces are recommended.

```txtra
Colors: Red    Green    Blue
Matrix:
  1    0    0
  0    1    0
  0    0    1
```

### 3.5 Duplicate Keys & Dot Reference (`.Key:`)
TXTRA treats all siblings under the same scope as list items. Duplicate keys are naturally allowed without overwriting earlier definitions.

To re-open and append attributes to the **most recently declared scope**, prefix the key with a dot:

```txtra
Task: Buy milk
  status: pending

Task: Clean desk
  status: done

.Task:
  priority: high   # Attaches to the latest "Task: Clean desk"
```

### 3.6 Tables & Matrices (GFM Markdown Mapping)
- `Table:` Container with 2 or more rows converts into a GFM Markdown Table (Row 1 = Headers, Rows 2+ = Data).
- `Matrix:` Container with 2 or more rows converts into a headerless GFM Markdown Table.

```txtra
Table:
  ID    Name     Role
  1     Alice    Admin
  2     Bob      User
```

### 3.7 Explicit Lists
Lines starting with `- ` or `* ` define list items. If preceded by a parent node, they automatically nest under that parent even without extra indentation.

```txtra
Shopping:
- Apples
- Oranges
```

### 3.8 Arrow Syntax (Mermaid Flowcharts)
TXTRA provides clean arrow notation for workflows, pipelines, and state machines. It parses to AST and serializes directly to Mermaid flowcharts (`graph TD`).

- **Recommended Arrow**: `>>` (double greater-than, effortless typing).
- **Supported Arrows**: `>>`, `->`, `-->`, `==>`, `-.->`, and physical alias `gggt` (within inline array contexts).

#### Transitions with Labels
```txtra
Workflow:
  Client    >>    Gateway: HTTP Request
  Gateway   --auth->   AuthServer: Token Verification
```

#### Chains & Continuations
```txtra
Chain:
  Step1    >>    Step2    >>    Step3

LineContinuation:
  Build
  >> Test
  >> Deploy
```

#### Fanout & Fanin
```txtra
Distribution:
  Source    >>    WorkerA    WorkerB    WorkerC
  WorkerA    WorkerB    WorkerC    >>    Sink
```

#### Feedback Loops
Combine with dot-references (`.Node`) to represent feedback loops:

```txtra
Cycle:
  Draft    --submit->    Review
  Review   --reject->    .Draft
  Review   --approve->   Publish
```

### 3.9 Virtual Newlines (`.:`)
For 1-line constrained environments (CLI arguments, single-line LLM prompts, chat inputs), `.:` functions as a virtual newline that restores hierarchy and indentation:

```txtra
App.: port: 8080.: host: localhost
```

### 3.10 Escapes
- Backslash `\`: Literal single-character escape (e.g., `\:`, `\..`).
- Inline backticks `` `...` ``: Preserves literal text including delimiters.
- Code blocks ` ```...``` ` or `,,,,... ,,,,`: Preserves multi-line raw blocks.

---

## 4. AST Schema (NodeTree)

Every parsed TXTRA document produces a deterministic AST:

```typescript
interface TXTRANode {
  type: 'node' | 'heading' | 'arrow' | 'codeblock';
  key?: string;
  value?: string | string[];
  depth: number;
  level?: number;         // For headings (: H1 to :::::: H6)
  children?: TXTRANode[];
  from?: string[];        // For arrow syntax
  to?: string[];          // For arrow syntax
  label?: string;         // For arrow syntax
}
```

---

## License

[0BSD (Zero-Clause BSD)](LICENSE) — Free for personal and commercial use without attribution requirements.
