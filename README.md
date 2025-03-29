# vibe-janitor 🧹

A powerful CLI tool for cleaning up AI-generated JavaScript and TypeScript projects.

## 🌟 Overview

When AI tools like GitHub Copilot, ChatGPT, or Claude generate code, they often include unused imports, variables, functions, and assets. The vibe-janitor tool automatically identifies and removes these unwanted artifacts, making your project cleaner and more efficient.

## ✨ Features

- **Unused Code Cleanup**: Detect and remove unused imports, variables, and functions
- **Asset Management**: Find and report unused static files (images, CSS, etc.)
- **Complexity Analysis**: Identify overly complex files, functions, and deeply nested code
- **Dependency Checking**: Discover unused packages and circular dependencies
- **Dry Run Mode**: Preview changes without modifying files
- **Detailed Reports**: Get comprehensive reports of all cleaning activities

## 🚀 Installation

### Global Installation

```bash
npm install -g vibe-janitor
```

### Local Project Installation

```bash
npm install --save-dev vibe-janitor
```

## 💻 Usage

### Basic Usage

```bash
# Clean current directory
vibe-janitor

# Clean a specific directory
vibe-janitor ./path/to/project
```

### Command Options

```bash
# Show what would be removed without making changes
vibe-janitor --dry-run

# Remove all unused code and assets
vibe-janitor --remove-unused 

# Run all cleanup routines (deeper analysis)
vibe-janitor --deep-scrub

# Detailed console output
vibe-janitor --log

# No console output
vibe-janitor --quiet
```

### Using in package.json scripts

```json
{
  "scripts": {
    "clean": "vibe-janitor",
    "clean:deep": "vibe-janitor --deep-scrub"
  }
}
```

## 📊 Example Output

```
🧹 vibe-janitor activated...
Sweeping up leftover GPT magic ✨

✅ Found 12 unused imports
✅ Found 8 unused variables
✅ Found 3 unused files
✅ Found 2 unused packages

📝 Summary:
  - Removed 12 unused imports across 5 files
  - Removed 8 unused variables
  - Removed 3 unused files
  - Suggested removing 2 packages from package.json

Cleanup complete! 🎉
```

## 🛠️ Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- The TypeScript team for the TS Compiler API
- ts-morph for making AST manipulation easier

