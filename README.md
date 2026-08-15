# Gistio

**Get the gist. Skip the noise.**

Gistio is a Gmail Add-on that uses Gemini AI to triage your inbox on a schedule. It classifies every unread email, cleans up low-priority threads (mark as read or archive), and sends you a crisp digest — so you open Gmail to signal, not noise.

---

## How it works

1. **Fetch** — reads up to 100 unread inbox threads
2. **Classify** — Gemini AI scores each thread by category and priority
3. **Clean** — low-priority threads are marked as read or archived
4. **Label** — processed threads get a `gistio/processed` label so they're skipped next run
5. **Digest** — a styled summary email lands in your inbox: what needs attention, what was cleared

Everything runs inside Google's infrastructure. Your emails never leave Google.

---

## Features

- **AI triage** — Gemini classifies emails as important, transactional, promotional, newsletter, notification, or social, with high / medium / low priority
- **Inbox cleanup** — mark low-priority threads as read, or archive them entirely
- **Scheduled runs** — hourly, daily at your chosen time, or monthly on a set day
- **Run on demand** — trigger a run instantly from the add-on panel
- **HTML digest email** — color-coded by category, clickable thread links, "Needs attention" section for high-priority emails
- **Privacy-first** — no external servers; runs entirely on Google Apps Script

---

## Setup

### 1. Get a Gemini API key

Get a free key at [Google AI Studio](https://aistudio.google.com). The free tier is sufficient for personal use.

### 2. Install the add-on

> Public Marketplace listing coming soon. For now, deploy via your own Apps Script project (see [Development](#development)).

### 3. Configure

Open the Gistio panel in Gmail, enter your Gemini API key, set your preferred schedule and inbox action, then click **Save & Activate**.

---

## Configuration

| Setting | Options | Default |
|---|---|---|
| Frequency | Hourly / Daily / Monthly | Daily |
| Time | Any hour (your local time) | 7:00 PM |
| Day of month | 1–28 | 1st |
| Gmail label | Any label name | `gistio/processed` |
| Inbox action | Mark as read / Archive | Mark as read |

---

## Triage logic

| Category | Priority | Action |
|---|---|---|
| Important | High | **Kept unread** — appears in digest under "Needs Attention" |
| Anything else | Any | Cleared (mark as read or archived per your setting) |

Medium-priority cleared emails are flagged with a `MED` badge in the digest.

---

## Privacy

- Runs entirely on **Google Apps Script** — no external servers, no third-party storage
- Your Gemini API key is stored in **your personal Script Properties**, not shared with anyone
- Email content (subject, sender, snippet) is sent to the **Gemini API** for classification
- No analytics, no tracking, no ads

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org)
- A Google account with Apps Script enabled

### Local setup

```bash
git clone https://github.com/your-username/gistio
cd gistio
npm install
npx clasp login
```

Create `.clasp.json` in the root (gitignored):

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "app-scripts"
}
```

### Deploy

```bash
npm run push          # push to Apps Script (test immediately)
git push origin main  # triggers CI deploy via GitHub Actions
```

### Project structure

```
app-scripts/
  core/
    Digest.gs        — plain text + HTML digest builders
    Pipeline.gs      — orchestration: fetch → classify → clean → label → send
  integrations/
    GeminiClient.gs  — Gemini API: model selection, batched email classification
    GmailHelper.gs   — Gmail utilities: fetch, mark read, archive, label
  ui/
    Dashboard.gs     — add-on home card: last run stats, Run Now button
    Handlers.gs      — entry points: onHomepage, saveSettings_, runNow_
    SettingsCard.gs  — settings card builder and form config helpers
    Triggers.gs      — time-based trigger setup and management
  appsscript.json    — manifest: OAuth scopes, add-on config
.github/
  workflows/
    push-apps-script.yml  — auto-deploy on push to main
```

### GitHub Actions

Pushing to `main` with changes under `app-scripts/**` automatically deploys via `clasp push`. Requires two repository secrets:

| Secret | Value |
|---|---|
| `CLASP_TOKEN` | Contents of `~/.clasprc.json` after `clasp login` |
| `CLASP_SCRIPT_ID` | The `scriptId` from `.clasp.json` |

---

## License

MIT
