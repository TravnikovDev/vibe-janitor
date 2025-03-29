## 🛠️ Implementation Plan for `vibe-janitor`

**Prepared by:** Product Management Lead  
**Goal:** Launch a production-ready CLI tool that cleans AI-generated JavaScript/TypeScript projects efficiently and intelligently.

---

### 🔄 Phase 1: Foundation & Setup 

**Objectives:** Set up project infrastructure, baseline CLI, and module scaffolding.

- [] Project initialization with TypeScript, ESLint, Prettier
- [] Set up basic CLI with Commander.js
- [] Establish file/folder structure (`/cli`, `/core`, `/utils`, `/tests`)
- [] Configure Jest for testing
- [] Set up CI (GitHub Actions or similar)
- [] Publish MVP README with project purpose and install instructions

**Deliverables:** Repo scaffold, working `npx vibe-janitor` entry point

---

### 🧼 Phase 2: Core Cleaning Modules 

**Objectives:** Implement the first wave of core functionality.

- [ ] **Unused Code Cleaner**
  - Traverse files with `fast-glob`
  - Parse with `ts-morph`
  - Remove unused variables, imports, and functions (optionally)

- [ ] **Asset Sweeper**
  - Identify unused static files (images, fonts, CSS)
  - Compare references vs presence in project folders

- [ ] **Output Summary Reporter**
  - Console-based and file-based reporting (e.g., JSON or Markdown)
  
**Deliverables:** Working cleanup modules with dry-run capability

---

### 📦 Phase 3: Dependency & Structure Analysis 

**Objectives:** Add support for structural and dependency cleanup.

- [ ] **Dependency Auditor**
  - Use `depcheck` to detect unused packages
  - Generate suggestions (e.g., replace `lodash` with native functions)

- [ ] **Circular Dependency Scanner**
  - Use `madge` to detect and report circular imports

- [ ] **Complexity Analyzer**
  - Flag large files and functions
  - Sort and rank based on size and complexity

**Deliverables:** Diagnostic modules with helpful refactor hints

---

### 🔧 Phase 4: CLI UX Polish & Option Flags 

**Objectives:** Improve CLI interface, command options, and flexibility.

- [ ] Add flags: `--deep-scrub`, `--remove-unused`, `--dry-run`, `--log`
- [ ] Unified logging system with Chalk styling
- [ ] Improve error handling and fallback behavior
- [ ] Refactor to ensure testability across all modules

**Deliverables:** Production-level CLI experience with customization support

---

### 📈 Phase 5: Reports & Extensibility

**Objectives:** Make the tool extensible and insightful for larger projects.

- [ ] Create human-readable and machine-readable reports (Markdown + JSON)
- [ ] Introduce plugin system scaffold for future extension
- [ ] Add support for custom config file (`vibe-janitor.config.ts`)

**Deliverables:** Report generation, plugin-ready foundation

---

### 🚀 Phase 6: Release & Growth 

**Objectives:** Publish, document, and gather early feedback.

- [ ] Push to npm as public CLI tool
- [ ] Add GitHub discussions or feedback form
- [ ] Launch website/docs if needed (Docusaurus or VitePress)
- [ ] Announce on Dev.to, Reddit, Twitter/X, Hacker News
- [ ] Track issues & prioritize future iterations

**Deliverables:** Public release with growing user base

---

### 📊 Success Metrics

- ⭐ 100+ GitHub stars in first month
- 🧪 90%+ test coverage on all modules
- 🧼 5+ projects confirmed cleaned via CLI in community feedback
- ⏱️ Average CLI run time under 10 seconds on medium-sized repos

---

Let me know if you'd like a visual roadmap, team role assignments, or burndown chart generation next.

