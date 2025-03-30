# vibe-janitor 🧹

<div align="center">
  <div>
    <img src="https://raw.githubusercontent.com/TravnikovDev/vibe-janitor/main/static/vibe-janitor.svg" alt="vibe-janitor mascot" width="30%" style="background: white; border-radius: 36px; padding: 15px;">
  </div>

  <div>
    <img src="https://img.shields.io/npm/v/vibe-janitor.svg" alt="npm version">
    <img src="https://img.shields.io/npm/dm/vibe-janitor.svg" alt="downloads">
    <img src="https://img.shields.io/github/license/TravnikovDev/vibe-janitor.svg" alt="license">
  </div>

  <h2>Clean up AI-generated JavaScript/TypeScript projects efficiently and intelligently</h2>
</div>

<div>
  <h2>🌟 Overview</h2>
  <p>
  AI tools like GitHub Copilot, ChatGPT, or Claude often generate code with unused imports, variables, functions, and assets. <strong>vibe-janitor</strong> automatically identifies and removes these unwanted artifacts, making your codebase cleaner and more efficient.
  </p>
</div>

## ✨ Features

- **🧹 Unused Code Cleanup**: Detect and remove unused imports, variables, and functions
- **🖼️ Asset Management**: Find and report unused static files (images, CSS, etc.)
- **📊 Complexity Analysis**: Identify overly complex files, functions, and deeply nested code
- **📦 Dependency Checking**: Discover unused packages and circular dependencies
- **🔍 Dry Run Mode**: Preview changes without modifying files
- **📝 Detailed Reports**: Get comprehensive reports of all cleaning activities

## 🚀 Installation

### Global Installation

```bash
npm install -g vibe-janitor
```

### Local Project Installation

```bash
npm install --save-dev vibe-janitor
```

### Quick Try with npx

```bash
npx vibe-janitor
```

## 💻 Usage

### Interactive Mode

By default, vibe-janitor runs in interactive mode when no options are provided:

```bash
npx vibe-janitor
```

This will prompt you with questions to configure the cleanup process:
- Clean up unused imports and code automatically? (Y/n)
- Show detailed information about issues found? (Y/n)
- Generate detailed reports? (y/N)
- Run advanced cleanup for assets, variables, and functions? (y/N)
- Analyze package dependencies? (y/N)
- Check for circular dependencies? (y/N)

To skip interactive mode, use the `--no-interactive` flag or provide specific options.

### Basic Usage

```bash
# Analyze current directory without making changes
vibe-janitor --dry-run

# Get detailed list of unused imports and other issues
vibe-janitor --list

# Remove unused imports and code
vibe-janitor --remove-unused

# Clean a specific directory
vibe-janitor ./path/to/project --remove-unused
```

### Command Options

```bash
  --deep-scrub            Run all available cleanup routines
  --dry-run               Show what would be removed without deleting anything
  --remove-unused         Remove unused files, components, and imports
  --list                  List detailed information about unused imports and other issues
  --report [path]         Generate detailed reports (JSON and Markdown)
  --analyze-complexity    Analyze code complexity
  --analyze-dependencies  Analyze package dependencies
  --check-circular        Check for circular dependencies
  --generate-graph        Generate dependency graph visualization
  --log                   Output detailed cleanup logs
  --quiet                 No console output, just do the job
  --no-progress           Disable progress bars
```

### Using in package.json scripts

```json
{
  "scripts": {
    "clean": "vibe-janitor --list",
    "clean:fix": "vibe-janitor --remove-unused",
    "clean:deep": "vibe-janitor --deep-scrub --remove-unused"
  }
}
```

## 📊 Example Output

<p align="center">
  <img width="700" src="https://raw.githubusercontent.com/TravnikovDev/vibe-janitor/main/docs/vibe-janitor-demo.png" alt="vibe-janitor demo output">
</p>

### Detailed Mode Output

With the new `--list` option, you get detailed information about what needs to be cleaned:

```
📝 Cleanup Summary:
  - Unused imports: 33 across 22 files

    📋 Unused imports details:
    - components/Header.tsx (2 unused):
      • useState
      • useEffect
    - pages/index.tsx (3 unused):
      • Image
      • Head
      • styles
    ...

    💡 To fix these issues, run: npx vibe-janitor --remove-unused
```

## 🗂️ Generated Reports

Using the `--report` option generates detailed markdown and JSON reports:

```bash
vibe-janitor --report
```

This creates reports in the `vibe-janitor-report/` directory:

- `vibe-janitor-report-main.md`: Human-readable report
- `vibe-janitor-report-main.json`: Machine-readable report
- `vibe-janitor-report-dependencies.md`: Dependency analysis
- `vibe-janitor-report-circular.md`: Circular dependency analysis

## 🛠️ Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the LICENSE file for details.

This license ensures that while the software remains open source, any derivative works must also be distributed under the same license terms, giving you as the original author more control over how your work is used and modified.

## 🙏 Acknowledgments

- The TypeScript team for the TS Compiler API
- ts-morph for making AST manipulation easier
- depcheck for dependency analysis
