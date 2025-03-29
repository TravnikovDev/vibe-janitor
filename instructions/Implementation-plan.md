## 🛠️ Implementation Plan for `vibe-janitor`

**Prepared by:** Product Management Lead  
**Goal:** Launch a production-ready CLI tool that cleans AI-generated JavaScript/TypeScript projects efficiently and intelligently.

---

### 🔄 Phase 1: Foundation & Setup ✅

**Objectives:** Set up project infrastructure, baseline CLI, and module scaffolding.

- [x] Project initialization with TypeScript, ESLint, Prettier
- [x] Set up basic CLI with Commander.js
- [x] Establish file/folder structure (`/cli`, `/core`, `/utils`, `/tests`)
- [x] Configure Jest for testing
- [x] Set up CI (GitHub Actions or similar)
- [x] Publish MVP README with project purpose and install instructions

**Deliverables:** Repo scaffold, working `npx vibe-janitor` entry point

---

### 🧼 Phase 2: Core Cleaning Modules ✅

**Objectives:** Implement the first wave of core functionality.

- [x] **Unused Code Cleaner**
  - [x] Traverse files with `fast-glob`
  - [x] Parse with `ts-morph`
  - [x] Remove unused variables, imports, and functions (optionally)

- [x] **Asset Sweeper**
  - [x] Identify unused static files (images, fonts, CSS)
  - [x] Compare references vs presence in project folders

- [x] **Output Summary Reporter**
  - [x] Console-based and file-based reporting (e.g., JSON or Markdown)
  
**Deliverables:** Working cleanup modules with dry-run capability

---

### 📦 Phase 3: Dependency & Structure Analysis ✅

**Objectives:** Add support for structural and dependency cleanup.

- [x] **Dependency Auditor**
  - [x] Use `depcheck` to detect unused packages
  - [x] Generate suggestions (e.g., replace `lodash` with native functions)

- [x] **Circular Dependency Scanner**
  - [x] Use `madge` to detect and report circular imports

- [x] **Complexity Analyzer**
  - [x] Flag large files and functions
  - [x] Sort and rank based on size and complexity

**Deliverables:** Diagnostic modules with helpful refactor hints

---

### 🔧 Phase 4: CLI UX Polish & Option Flags ⏳

**Objectives:** Improve CLI interface, command options, and flexibility.

- [x] Add flags: `--deep-scrub`, `--remove-unused`, `--dry-run`, `--log`
- [x] Unified logging system with Chalk styling
- [x] Improve error handling and fallback behavior
- [ ] Refactor to ensure testability across all modules
  - [ ] Add missing test coverage for core modules
  - [ ] Implement mocking for file system operations

**Deliverables:** Production-level CLI experience with comprehensive test coverage

---

### 📈 Phase 5: Reports & Extensibility ⏳

**Objectives:** Make the tool extensible and insightful for larger projects.

- [x] Create human-readable and machine-readable reports (Markdown + JSON)

**Deliverables:** Report generation, plugin-ready foundation, custom configuration

---

### 🚀 Phase 6: Release & Growth 🔄

**Objectives:** Publish, document, and gather early feedback.

- [ ] Push to npm as public CLI tool
  - [ ] Finalize package.json with all metadata
  - [ ] Create npm publish workflow
  - [ ] Write publish documentation
- [ ] Add GitHub discussions or feedback form
- [ ] Launch documentation website
  - [ ] Set up VitePress for documentation
  - [ ] Write user guide and API documentation
  - [ ] Add examples and use cases
- [ ] Announce on Dev.to, Reddit, Twitter/X, Hacker News
- [ ] Track issues & prioritize future iterations
  - [ ] Set up issue templates
  - [ ] Create roadmap for version 1.0

**Deliverables:** Public release with growing user base and documentation

---

### 📊 Success Metrics

- ⭐ 100+ GitHub stars in first month
- 🧪 90%+ test coverage on all modules
- 🧼 5+ projects confirmed cleaned via CLI in community feedback
- ⏱️ Average CLI run time under 10 seconds on medium-sized repos
