# Contributing to CAS AI

Thank you for your interest in contributing to CAS AI.

## Getting Started

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/cas_ai.git
   cd cas_ai
   ```
3. Create a branch for your work:
   ```bash
   git checkout -b feat/short-feature-name
   ```
4. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
5. Create environment files from examples and run both apps locally.

## Development Workflow

1. Keep changes focused to a single feature or fix.
2. Follow existing folder structure and naming conventions.
3. Update docs if behavior or setup changes.
4. Run the app and verify your changes before opening PR.

## Code Style Rules

- Use clear and descriptive names.
- Keep functions small and single-purpose.
- Prefer readable code over clever shortcuts.
- Reuse existing patterns in the codebase.
- Do not commit secrets, `.env` files, or generated artifacts.
- Keep UI changes responsive for desktop and mobile.

## Commit Guidelines

Use meaningful commit messages.

Suggested format:

```text
type(scope): short description
```

Examples:

- `feat(dashboard): add risk trend card`
- `fix(socket): handle reconnect state`
- `docs(readme): update setup section`

## Pull Request Guidelines

1. Ensure your branch is up to date with `main`.
2. Provide a clear PR title and description.
3. Explain what changed and why.
4. Add screenshots for UI changes.
5. Link related issues (example: `Closes #12`).
6. Keep PRs small and reviewable.

## Reporting Issues

Use the issue templates under `.github/ISSUE_TEMPLATE`:

- Bug report
- Feature request

## Code of Conduct

Be respectful and constructive in discussions and reviews.

Thanks for helping improve CAS AI.
