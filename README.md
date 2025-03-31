# vibe-janitor 🧹

<div align="center">
<table style="border: none; border-collapse: collapse; width: 100%; text-align: left;">
  <tr style="border: none;">
    <td align="center" width="33%" style="border: none; vertical-align: middle; padding: 20px;">
      <img src="https://raw.githubusercontent.com/TravnikovDev/vibe-janitor/main/static/vibe-janitor.svg" alt="vibe-janitor mascot" width="100%" style="background: white; border-radius: 36px; padding: 15px;">
    </td>
    <td width="66%" style="border: none; vertical-align: middle; padding-left: 20px;">
      <p>
        <img src="https://img.shields.io/npm/v/vibe-janitor.svg" alt="npm version">
        <img src="https://img.shields.io/npm/dm/vibe-janitor.svg" alt="downloads">
        <img src="https://img.shields.io/github/license/TravnikovDev/vibe-janitor.svg" alt="license">
      </p>
      <p>
        <b>Keep your vibe-coded JavaScript/TypeScript projects clean and smart</b>
      </p>
      <h3>🌟 Overview</h3>
      <p>
      When you build with tools like ChatGPT, GitHub Copilot, Claude, Cursor IDE, or Windsurf AI: LLMs can't see your whole project at once. Because of their limited context window, they might read and modify irrelevant or unused code—especially leftovers from past experiments.
    This not only creates bugs but also wastes your time and money. <strong>vibe-janitor</strong> helps you stay in control. It automatically finds and removes unused imports, variables, functions, files, and dependencies—so your codebase stays clean, minimal, and AI-friendly.
  If you're into prompt-based development, conversational coding, or just vibing with AI—this tool has your back.
      </p>
    </td>
  </tr>
</table>
</div>

## ✨ Features

- **🧹 Smart Code Cleanup**: Automatically detect and remove unused imports, variables, and functions left behind by AI tools like ChatGPT or Copilot. Keep only the code that actually matters.
- **🖼️ Asset Scanner**: Finds forgotten static files (images, fonts, CSS, etc.) that are no longer used. Great after a few wild rounds of prompt-based design changes.
- **📊 Complexity Analyzer**: Flags overly complex functions and deeply nested code—often the result of AI overthinking your prompts.
- **📦 Dependency Checker**: Detects unused npm packages and even circular dependencies introduced during AI-assisted coding sessions.
- **🔍 Dry Run Mode**: See what vibe-janitor would clean up without actually changing anything. Ideal for cautious coders and curious minds.
- **📝 Insightful Reports**: Generates human-readable and JSON reports of all cleanup actions. Perfect for reviewing the output of your AI-generated projects.

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
Big thanks to the open-source tools that make vibe-janitor possible:

- 🧠 TypeScript — for the powerful Compiler API that lets us deeply understand your code
- 🧬 ts-morph — for making AST manipulation feel almost natural
- 🧰 depcheck — for digging through dependencies like a true janitor
