# Codex project instructions

Read `DEVELOPMENT_HANDOFF.md` before changing this project. `README.md` is the user guide; `PRODUCT_ROADMAP.md` contains future ideas.

- This is local-first. Never clear or replace the user's IndexedDB at `http://127.0.0.1:4173/` for testing.
- Preserve IndexedDB migration and ZIP/legacy JSON restore compatibility.
- Keep question and answer masks independent while sharing the pre-erasure original image.
- Manual erase pointer-down samples color; only a real drag creates a stroke.
- Put rules in `domain.js`, mutations in `application/`, UI in pages/components/workflows, and keep `app.js` as the composition root.
- Update `dist/manual.js` and bump `MANUAL_VERSION` when user-facing instructions change.
- Run `npm run check`, `npm test`, and `npm run test:e2e` for cross-layer changes. Playwright uses isolated port 4178 data.
- Inspect `git status` and the diff before staging. Push only when the user explicitly requests it.
- Do not revive external AI handwriting removal without a new explicit request.
