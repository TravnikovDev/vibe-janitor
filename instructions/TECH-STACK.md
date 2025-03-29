## 🧠 Tech Stack & Technical Architecture

### 🧰 Core Technologies

A carefully chosen set of libraries and tools make up the core of `vibe-janitor`, designed for performance, readability, and extensibility:

- **Node.js** – Runtime environment for executing the CLI
- **TypeScript** – Strongly typed superset of JavaScript for maintainability and better DX
- **ECMAScript Modules (ESM)** – Modern JS module system for cleaner import/export
- **Commander.js** – CLI command and option parsing
- **Chalk** – Console output styling
- **Fast-glob** – Efficient file discovery based on patterns
- **ts-morph** – TypeScript AST analysis and deep code inspection
- **depcheck** – Identifies unused dependencies in `package.json`
- **madge** – Detects circular dependencies and visualizes import graphs
- **fs-extra** – Enhanced filesystem utilities

These tools are battle-tested and suitable for static analysis, file system traversal, and scalable CLI development.

---

### 🧪 Testing

- **Jest** – A widely adopted testing framework that supports TypeScript, mock functions, and test coverage reporting.

Our test suite covers core logic in isolation and includes CLI integration tests to validate end-to-end functionality.

---

### 🏗️ Project Structure (Proposed)

```
/cli
  └── index.ts             # CLI entry point
/core
  ├── cleaner.ts           # Cleanup engine (unused code, files, assets)
  ├── analyzer.ts          # Complexity & metrics analyzer
  ├── dependency.ts        # Dependency analysis logic
  └── reporter.ts          # Summary and output logic
/utils
  └── logger.ts            # Styled logger output
/tests
  └── ...                  # Unit tests by module
```

This modular structure supports maintainability and makes it easier to onboard contributors.

---

### 🧩 Modular Design Philosophy

- **Separation of Concerns** – Each module handles a specific responsibility (e.g., scanning, analyzing, reporting).
- **Composable Core** – Modules are independent and can be reused across commands.
- **Extensible CLI** – New features (e.g., Git integration, plugins) can be added without touching existing logic.
- **Lightweight Entry Point** – The CLI layer only handles argument parsing and orchestration.

---

### 🧼 Data Flow Overview

1. **User runs CLI** → Parses input flags and target directory
2. **Core Modules execute** → Cleaning logic, analysis, and optimization
3. **Reporter summarizes** → Presents findings in a human-friendly format

Optional flags may alter behavior (e.g., `--dry-run`, `--deep-scrub`, `--log`).

---

### 🧱 Why this stack?

- ✅ Minimal dependencies for fast install and low maintenance
- ✅ Clear architectural boundaries (CLI vs logic vs output)
- ✅ TypeScript + `ts-morph` gives precise static introspection
- ✅ Tools like `depcheck` and `madge` offer insights into dependencies and structure
- ✅ Easy to extend via plugin-style modules or shared utility functions

This stack is ideal for building robust developer tooling with a focus on developer experience, code health, and performance.

