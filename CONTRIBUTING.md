## Contributing to CHIMP.FUN

Thanks for your interest in contributing! This document explains how to set up your environment, our preferred workflow, code style, and how to submit changes.

## Getting Started

1) Fork the repository on GitHub and clone your fork.
2) Create a feature branch:

```bash
git checkout -b feat/your-feature-name
```

3) Install dependencies:

```bash
npm install
```

4) Copy and edit environment variables:

```bash
cp .env.example .env.local
# edit .env.local as needed
```

5) Run the dev server:

```bash
npm run dev
```

## Branching and Commit Style

- Use short, descriptive branches: `feat/`, `fix/`, `docs/`, `chore/`.
- Write clear commit messages using imperative mood:
  - "Add footer GitHub link" (not "Added" or "Adding").

## Code Style

- TypeScript strict mode is enabled; avoid `any` unless necessary.
- Prefer meaningful names and early returns.
- Format code with Prettier:

```bash
npx prettier --write .
```

## Linting

Run ESLint (Next.js config):

```bash
npm run lint
```

Fix issues where possible. Avoid disabling rules unless there is a clear justification.

## Testing and Manual Verification

- Ensure the app builds and boots:

```bash
npm run build && npm start
```

- Manually verify core flows:
  - Home page loads
  - Editor loads and renders an NFT preview (use cached or random IDs)
  - Banner and collage pages load

## Submitting a Pull Request

1) Rebase on latest `main` and resolve conflicts.
2) Push your branch and open a PR.
3) Fill in the PR template (what/why/how to test).
4) PR review requires at least one approval.

## Environment Variables

See `.env.example` for all supported variables. Do NOT commit real secrets. Use `.env.local` for local development.

## Security and Responsible Disclosure

If you find a security issue, please open a private report via GitHub Security Advisories or contact the maintainers directly. Do not open a public issue for sensitive vulnerabilities.

## License and CLA

By contributing, you agree that your contributions will be licensed under the repository's license. If a Contributor License Agreement (CLA) is introduced in the future, you may be asked to sign it for substantial contributions.

