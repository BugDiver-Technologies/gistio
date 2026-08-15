# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment workflow

1. Make code changes
2. Run `npm run push` to deploy to Apps Script immediately (for testing)
3. Ask the user if things work
4. If confirmed, `git commit` then `git push` to main

GitHub Actions also auto-deploys on push to `main` (for `app-scripts/**` changes), but `npm run push` is used first for quick iteration.

## Architecture

This is a Google Apps Script project that runs a daily email digest powered by Gemini AI. All code lives in `app-scripts/` and runs entirely within Google's infrastructure.

**Flow:** `eveningDigest()` (Code.gs) → `fetchUnreadEmails_()` (GmailHelper.gs) → `analyzeEmails_()` (GeminiClient.gs) → sends digest email → marks low-priority threads as read.

### Files

- **Code.gs** — entry point: `eveningDigest()` orchestrates the full pipeline; `buildDigest_()` formats the output
- **GeminiClient.gs** — Gemini API integration: model auto-selection, batched email analysis (20 per batch), prompt template
- **GmailHelper.gs** — Gmail utilities: fetch unread inbox emails, mark threads as read
- **Setup.gs** — one-time setup: `setupTrigger()` creates the daily 7:30 PM IST trigger; `checkConfig()` validates Script Properties
- **appsscript.json** — manifest: timezone `Asia/Kolkata`, V8 runtime, OAuth scopes

### Configuration (set in Apps Script editor → Project Settings → Script Properties)

- `GEMINI_API_KEY` — required; Gemini API key
- `GEMINI_MODEL` — optional; overrides auto-selected model (default: best available `gemini-*-flash-lite` or `gemini-*-flash`)

### Trigger setup

Run `setupTrigger()` once manually from the Apps Script editor. The project timezone must be set to `Asia/Kolkata` in File → Project Settings.

### Triage logic

Emails classified as `important` + `high` priority are kept unread. All others are marked as read. The digest groups cleared emails by category and flags medium-priority items.

### Internal conventions

Functions suffixed with `_` are internal helpers hidden from the Apps Script Run menu (e.g. `fetchUnreadEmails_`, `buildDigest_`). Public entry points have no suffix.
