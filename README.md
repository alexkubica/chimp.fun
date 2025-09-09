## CHIMP.FUN — Open Source

Welcome! This is the source code for CHIMP.FUN, an NFT tools playground (editor, banner maker, collage generator, and mini game). The project is now open source. Contributions are welcome—see `CONTRIBUTING.md`.

Repository: `https://github.com/your-org-or-user/chimp.fun`

## Quick Start

- macOS, Windows, Linux are supported.
- You will install Node.js and a code editor, clone the repo, install dependencies, create a `.env.local`, and run the dev server.

### 1) Install Required Software

- Node.js LTS (20+ recommended):
  - macOS: Install via `https://nodejs.org` (pkg) or Homebrew: `brew install node`
  - Windows: Installer from `https://nodejs.org` (choose LTS)
  - Linux: Use your package manager or `nvm`:
    - Install nvm: `https://github.com/nvm-sh/nvm`
    - Then: `nvm install --lts && nvm use --lts`
- Git: `https://git-scm.com/downloads`
- Editor (optional but recommended):
  - Cursor: `https://cursor.sh` (AI-powered editor)
  - or VS Code: `https://code.visualstudio.com`

### 2) Clone the Repository

```bash
git clone https://github.com/your-org-or-user/chimp.fun.git
cd chimp.fun
```

### 3) Install Dependencies

```bash
npm install
# or: pnpm install / yarn install / bun install
```

### 4) Configure Environment Variables

Create `.env.local` in the project root. Use `.env.example` as a template.

```bash
cp .env.example .env.local
```

Edit `.env.local` and provide values if you have API keys. The app can run without keys using public RPCs, but certain features (like wallet NFT fetching) work best with keys.

Common variables:

- `ALCHEMY_API_KEY` (optional, for NFT fetching)
- `MORALIS_API_KEY` (optional)
- `OPENSEA_API_KEY` (optional)
- `ETHEREUM_RPC_URL` (optional; defaults to `https://eth.llamarpc.com`)
- `POLYGON_RPC_URL` (optional; defaults to `https://polygon-rpc.com`)
- `APESCAN_API_KEY` (optional; only if you use ApeChain provider)

### 5) Run the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 6) Build for Production (optional)

```bash
npm run build
npm start
```

## Project Structure

- `app/` — Next.js App Router pages and API routes
- `app/editor/` — NFT editor UI and logic
- `app/api/` — serverless routes for NFT fetching and proxying
- `public/` — static assets and cached metadata
- `scripts/` — utilities to cache metadata and generate speech bubbles
- `consts/`, `utils/`, `types/` — shared code

## Environment Variables and Privacy

No secrets are committed to this repository. See `.env.example` for all keys the app can read. If you fork this repo or deploy, configure your own keys as needed.

## Contributing

Please read `CONTRIBUTING.md` for guidelines on branching, code style, and pull requests.

## License

MIT (proposed). If the license file is missing, consider adding one before broader distribution.
