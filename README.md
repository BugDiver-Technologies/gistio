# Gistio

**Get the gist. Skip the noise.**

Gistio is a Gmail Add-on that uses Gemini AI to triage your inbox on a schedule. It classifies every unread email, cleans up low-priority threads (mark as read or archive), and sends you a crisp digest — so you open Gmail to signal, not noise.

This is a personal/portfolio project, not a published product — it's unlisted (no Marketplace listing), built and extended whenever the mood strikes. If you want to run it, deploy it into your own Apps Script project; see [Setup](#setup) below.

---

## How it works

1. **Fetch** — reads up to 20 unread inbox threads per run
2. **Classify** — Gemini AI scores each thread by category and priority
3. **Override** — any VIP sender/domain you've configured is forced to stay unread, regardless of what the AI decided
4. **Clean** — low-priority threads are marked as read or archived
5. **Label** — processed threads get a `gistio/processed` label so they're skipped next run
6. **Digest** — a styled summary email lands in your inbox: what needs attention, what was cleared

Everything runs inside Google's infrastructure. Your emails never leave Google.

---

## Features

- **AI triage** — Gemini classifies emails as important, transactional, promotional, newsletter, notification, or social, with high / medium / low priority
- **VIP senders** — pin specific emails or whole domains that always stay unread, no matter what the AI decides
- **Inbox cleanup** — mark low-priority threads as read, or archive them entirely
- **Undo** — restore any recently-cleared thread back to the inbox from the dashboard, one click
- **Scheduled runs** — hourly, daily at your chosen time, or monthly on a set day
- **Run on demand** — trigger a run instantly from the add-on panel
- **HTML digest email** — color-coded by category, clickable thread links, "Needs attention" section for high-priority emails
- **Run-level observability** — every run logs a correlation ID and user key, and the dashboard shows the last error with a reference code
- **Privacy-first** — no external servers; runs entirely on Google Apps Script

---

## Setup

### 1. Get a Gemini API key

Get a free key at [Google AI Studio](https://aistudio.google.com). The free tier is sufficient for personal use.

### 2. Install the add-on

There's no public Marketplace listing — this is a self-install project. Deploy it into your own Apps Script project (see [Development](#development)), then install it as a test deployment on your own Google account from the Apps Script editor (**Deploy → Test deployments → Install**).

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
| VIP senders | Emails or domains, one per line | *(none)* |

---

## Triage logic

| Category | Priority | Action |
|---|---|---|
| Important | High | **Kept unread** — appears in digest under "Needs Attention" |
| *(any — VIP sender match)* | *(any)* | **Kept unread**, tagged `VIP` — overrides the AI's own classification |
| Anything else | Any | Cleared (mark as read or archived per your setting) |

Medium-priority cleared emails are flagged with a `MED` badge in the digest. Anything cleared can be restored from the dashboard's "Recently Cleared" list.

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
git clone https://github.com/BugDiver-Technologies/gistio
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
    DigestHeader.gs  — branded email chrome (header, stat bar, rows, footer)
    VipSenders.gs    — VIP sender/domain parsing and override logic
    Pipeline.gs      — orchestration: fetch → classify → override → clean → label → send
  integrations/
    GeminiClient.gs  — Gemini API: model selection, batched email classification
    GmailHelper.gs   — Gmail utilities: fetch, mark read, archive, label
  ui/
    Dashboard.gs     — add-on home card: last run stats, Run Now button
    Handlers.gs      — entry points: onHomepage, saveSettings_, runNow_, restoreThread_
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
