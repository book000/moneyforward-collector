# GitHub Copilot Instructions

Follow `AGENTS.md` at the repository root for the project overview, commands, structure and conventions. This file is a short checklist for code review.

## Language

- Write review comments in Japanese, with a half-width space between Japanese and alphanumeric characters.
- Deliverables (code comments, docs, commit descriptions, PR text) are Japanese; runtime messages (logs, errors) and `package.json` text are English.

## Do not flag

- Prettier, ESLint and `tsc` issues: `pnpm lint` runs in CI.
- Logic concentrated in `src/main.ts`: single-file design is intentional (only CSV/TSV handling lives in `src/csv.ts`).
- Missing tests outside CSV/TSV handling: the rest is verified manually against the real service.
- `pnpm start || true` in `entrypoint.sh`: keeps the periodic run going after a failure.
- Both `logger.error()` and `ErrorReporter.captureException()` in the same catch block: intentional (log output vs. structured report to GlitchTip when `SENTRY_DSN` is set).

## Check carefully

- Credentials, personal data or financial data in code, tests, logs, error reports or docs.
- Errors from Puppeteer operations and external pages are caught and logged, so one failure does not stop the periodic run.
- No `any` or `skipLibCheck` used to hide type errors; JSDoc is present and accurate for functions and interfaces.
- Docs (`README.md`, `AGENTS.md`) match the code when commands, config or output formats change.
