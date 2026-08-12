# Gmail Triage

A Google Apps Script that runs every evening, classifies your unread emails using Gemini, sends you a digest, and marks low-priority emails as read.

## How it works

1. Fetches up to 100 unread inbox emails
2. Sends them to Gemini in batches for classification
3. Emails you a digest grouped by category
4. Marks everything as read except `important` + `high priority` emails

### Categories

| Category | Description |
|----------|-------------|
| important | Personal messages or anything requiring action |
| transactional | Payment confirmations, receipts — already done |
| promotional | Marketing, deals, discount offers |
| newsletter | Subscribed digests |
| announcement | Product updates, company announcements |
| notification | OTPs, app pings, GitHub, CI alerts |
| other | Everything else |

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org)
- A [Gemini API key](https://aistudio.google.com) (free tier works)

### 2. Install and deploy

```bash
npm install
clasp login
npm run create
npm run push
```

### 3. Set the API key

In the Apps Script editor: **Project Settings → Script Properties** → add:

| Property | Value |
|----------|-------|
| `GEMINI_API_KEY` | your Gemini API key |

Optionally pin a model by adding `GEMINI_MODEL` (e.g. `gemini-2.0-flash`). If not set, the latest available flash model is picked automatically.

### 4. Set up the daily trigger

In the Apps Script editor, run `setupTrigger()`. This schedules the digest daily at ~7:30 PM IST. Only needs to be done once.

### 5. Test

Run `eveningDigest()` from the editor and check your inbox.

## GitHub Actions (auto-deploy)

Any push to `main` that changes files in `app-scripts/` automatically deploys to Apps Script.

### Required repository secrets

| Secret | Value |
|--------|-------|
| `CLASP_TOKEN` | Contents of `~/.clasprc.json` after `clasp login` |
| `CLASP_SCRIPT_ID` | The `scriptId` from `.clasp.json` |

## Project structure

```
app-scripts/
  Code.gs          # Main digest logic
  GeminiClient.gs  # Gemini API client and prompt
  GmailHelper.gs   # Gmail fetch and mark-as-read
  Setup.gs         # Trigger setup and config helpers
  appsscript.json  # Apps Script manifest
.github/
  workflows/
    push-apps-script.yml  # Auto-deploy on push
```
