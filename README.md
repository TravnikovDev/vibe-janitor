## 🧹 `vibe-janitor`  
**"Because vibe coding leaves messes — and someone has to clean up."**

### 💡 What is this?
`vibe-janitor` is a CLI tool built for modern JavaScript and TypeScript projects. It seamlessly integrates into the Node.js ecosystem and is ideal for projects using frameworks like React, Next.js, Vue, or plain TypeScript setups.

It inspects your AI-generated codebase and scrubs out the junk:
- Unused files and components  
- Dead imports  
- Unreachable code  
- Redundant logic  
- All that leftover spaghetti from GPT’s last mood swing 🍝  

Think of it as the cleanup crew that shows up after your AI "finished" the project.

---

### 🚀 Install

```bash
npm install -g vibe-janitor
```

Or use it directly with npx:

```bash
npx vibe-janitor
```

---

### 🧼 Usage

```bash
vibe-janitor [options]

# Example
vibe-janitor ./src --deep-clean --remove-unused
```

### 🛠️ Options

| Option | Description |
|--------|-------------|
| `--deep-scrub` | Runs all available cleanup routines, including deep file analysis and dependency checks |
| `--deep-clean` | Runs a full analysis and deletes unused code |
| `--dry-run` | Show what would be removed, without deleting |
| `--remove-unused` | Remove unused files, components, and imports |
| `--log` | Outputs detailed cleanup log |
| `--quiet` | No console output, just does the job |

---

### ✨ CLI Welcome Message (when someone runs it):

```
🧹 vibe-janitor activated...
Sweeping up leftover GPT magic ✨

Scanning for:
  🚫 Unused files
  🔗 Dead imports
  🧟 Zombie components
  🐍 Spaghetti logic

Running cleanup in: ./src
(Use --dry-run to preview changes before sweeping)

Let’s make your vibe-coded mess look like a real project 👨‍💻🧼
```

---

### 🔍 What It Does

`vibe-janitor` is modular and powerful — here's what it will do (or already does, depending on your version):

#### 🧼 Unused Code & Asset Cleaner
- Detects and removes unused CSS styles
- Finds unused JS/TS functions and variables
- Identifies unreferenced images, fonts, and static assets

#### 📏 Large & Complex File Analyzer
- Flags files over a configurable line count (default: 500)
- Highlights large functions for refactoring
- Ranks the most complex files in your codebase

#### 📦 Dependency & Import Optimizer
- Identifies unused `package.json` dependencies
- Suggests lighter alternatives for heavy libraries
- Warns about unnecessary deep imports

#### 🧳 Redundant Package & Build Cleanup
- Removes stale `node_modules` packages
- Cleans up `dist/`, `build/`, or other output folders
- Suggests files to add to `.gitignore`

#### 🧠 Code Structure & Performance Auditor
- Detects circular dependencies
- Highlights modules that should be split
- Scans for lazy loading opportunities in routes/components

#### 📊 Project Complexity & Maintenance Report
- Generates a structured report of issues
- Highlights optimization/refactor candidates
- Outputs a prioritized cleanup to-do list

---

### ✅ Coming Soon
- Git hooks integration (`pre-commit` cleanup)
- VSCode extension
- "Regret Mode™" — undo accidental cleanups
- AI-guided code suggestions (post-cleanup)

