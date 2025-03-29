# Publishing Guide for vibe-janitor

This document outlines the process for publishing new versions of the vibe-janitor package to npm.

## Prerequisites

Before publishing, ensure you have:

1. An npm account with access to the `vibe-janitor` package namespace
2. The npm CLI installed globally (`npm install -g npm`)
3. Proper authentication with npm (`npm login`)
4. GitHub access to the vibe-janitor repository

## Manual Publishing Process

To manually publish a new version:

1. Ensure all changes are committed and pushed to the main branch
2. Update tests to ensure they pass with the new changes:
   ```bash
   npm test
   ```
3. Make sure the code meets our linting standards:
   ```bash
   npm run lint
   ```
4. Update the version number using npm's version command:
   ```bash
   # For patch releases (bug fixes)
   npm version patch
   
   # For minor releases (new features, backward compatible)
   npm version minor
   
   # For major releases (breaking changes)
   npm version major
   ```
5. This will:
   - Update the version in package.json
   - Create a git tag for the version
   - Run the format script and add files
   - Push changes and tags to GitHub

6. Publish to npm:
   ```bash
   npm publish
   ```

## Automated Publishing via GitHub Actions

This repository is set up with GitHub Actions to automatically publish to npm when a new GitHub Release is created:

1. Go to the GitHub repository page
2. Click on "Releases" in the right sidebar
3. Click "Create a new release"
4. Choose the tag version (should match the version in package.json)
5. Add a title and description for the release
6. Click "Publish release"

Once the release is published, the GitHub Action will automatically:
1. Check out the code
2. Install dependencies
3. Run tests and linting
4. Build the project
5. Publish to npm

## Required Secrets

For the automated publishing to work, make sure the following secret is set in your GitHub repository:

- `NPM_TOKEN`: An npm access token with publish permissions

To create an npm token:
1. Run `npm token create` in your terminal
2. Add this token as a secret in your GitHub repository settings

## Publishing Checklist

Before publishing a new version, ensure:

- [ ] All tests are passing
- [ ] Code has been linted
- [ ] Documentation is up to date
- [ ] CHANGELOG.md has been updated with the new changes
- [ ] The version in package.json matches the intended release
- [ ] You have committed and pushed all changes

## Accessing the Published Package

After publishing, users can install vibe-janitor using:

```bash
# Global installation
npm install -g vibe-janitor

# Local installation in a project
npm install vibe-janitor
```

## Troubleshooting

If you encounter issues during publishing:

1. Verify you have the correct npm permissions for the package
2. Check if the version already exists in npm
3. Ensure all GitHub Actions secrets are correctly set up
4. Review the GitHub Actions logs for detailed error information