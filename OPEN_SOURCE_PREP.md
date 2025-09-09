## Open Source Preparation Notes

This document summarizes what was done to prepare the repository for open sourcing and lists recommended follow-up actions for maintainers.

## Changes Made

- Rewrote `README.md` with beginner-friendly setup for macOS/Windows/Linux
- Added `CONTRIBUTING.md` with workflow, style, linting and PR guidance
- Added `.env.example` enumerating optional environment variables
- Updated `app/components/Footer.tsx` to include an open-source notice and GitHub link

## Sensitive Data and Secrets Review

Automated scans for obvious patterns (API keys, private keys, tokens) did not reveal hardcoded secrets. Manual review highlights the following environment variables referenced in code (not checked into git):

- `ALCHEMY_API_KEY` (optional)
- `MORALIS_API_KEY` (optional)
- `OPENSEA_API_KEY` (optional)
- `ETHEREUM_RPC_URL` (optional; default fallback in code)
- `POLYGON_RPC_URL` (optional; default fallback in code)
- `APESCAN_API_KEY` (optional; only for ApeChain provider)

Other notes:

- No `.env` or `.env.local` files are committed. `.gitignore` correctly ignores them.
- `next.config.mjs` includes an `images.remotePatterns` host pointing to `r3bel-gifs-prod.s3.us-east-2.amazonaws.com`. This is a public bucket path used for images, not a secret, but confirm continued permission to reference it publicly.
- `public/metadata` contains static token metadata files for multiple collections. Confirm license/permissions to redistribute these assets.

## Action Items Before/After Making the Repo Public

1) Add a License
   - Add `LICENSE` (MIT recommended) or your preferred license.

2) Create a GitHub Repository
   - Create `https://github.com/your-org-or-user/chimp.fun` and push code.
   - Update links in `README.md` and `Footer.tsx` if the slug differs.

3) Repository Hygiene
   - Enable branch protection rules for `main` (require PR reviews, status checks).
   - Optionally add issue templates and a PR template.
   - Optionally enable GitHub Discussions.

4) Secrets Management
   - Configure repository/environment secrets in your deployment platform (e.g., Vercel):
     - `ALCHEMY_API_KEY`, `MORALIS_API_KEY`, `OPENSEA_API_KEY` as needed
     - Optional RPC URLs if not using defaults

5) Security
   - Set up Dependabot or Renovate for dependency updates.
   - Consider CodeQL or similar code scanning.

6) Documentation
   - Add screenshots/gifs of the editor, banner maker, and game to `README.md`.
   - Add a small roadmap section or GitHub Project board for tasks.

7) Community and Governance
   - Define a Code of Conduct (`CODE_OF_CONDUCT.md`) if desired.
   - Set maintainers and triage processes.

## Known External Dependencies/Services

- Alchemy, Moralis, OpenSea APIs (optional)
- Public RPC endpoints: `https://eth.llamarpc.com`, `https://polygon-rpc.com`

## Notes on Data and Assets

- Verify redistribution rights for any images under `public/` and within `public/metadata/**`.
- If any assets have restrictive licenses, move them to a separate repo/source or replace with placeholders.

