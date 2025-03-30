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

- [x] **Unused File Remover**
  - [x] Detect files not imported or referenced anywhere
  - [x] Provide option to automatically delete unused files
  - [x] Support safety checks before deletion
  - [x] Track file sizes and report potential space savings
  - [x] Add specific CLI flag (`--delete-unused-files`)
  - [x] Add interactive prompt with colorful warning

- [ ] **CSS/Style Cleaner**
  - [ ] Scan and analyze CSS/SCSS/LESS files
  - [ ] Identify unused classes, selectors, and styles
  - [ ] Prune unused styles from stylesheets
  - [ ] Handle both standalone and component-level styles
  
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
  - [x] Finalize package.json with all metadata
  - [x] Create npm publish workflow
  - [x] Write publish documentation (PUBLISHING.md)
  - [ ] Perform first official npm release
- [ ] Add GitHub discussions or feedback form
  - [ ] Enable Discussions tab in GitHub repository
  - [ ] Create welcome post with feedback categories
- [ ] Launch documentation website
  - [ ] Set up VitePress for documentation
  - [ ] Write user guide and API documentation
  - [ ] Add examples and use cases
  - [ ] Deploy to GitHub Pages or Netlify
- [ ] Announce on Dev.to, Reddit, Twitter/X, Hacker News
  - [ ] Create announcement posts with key features highlighted
  - [ ] Include demo GIFs/videos showing the tool in action
  - [ ] Collect links to announcements for monitoring
- [ ] Track issues & prioritize future iterations
  - [ ] Set up issue templates for bugs, features, and questions
  - [ ] Create roadmap for version 1.0
  - [ ] Establish contribution guidelines for community

**Deliverables:** Public release with growing user base and documentation

---

### 📊 Success Metrics

- ⭐ 100+ GitHub stars in first month
- 🧪 90%+ test coverage on all modules
- 🧼 5+ projects confirmed cleaned via CLI in community feedback
- ⏱️ Average CLI run time under 10 seconds on medium-sized repos
