# Gmail Triage — Product Roadmap

## Current Status (as of 2026-08-15)

**Type:** Gmail Add-on (not standalone script)

**Core Pipeline:** Fetch unread emails → Classify with Gemini → Send digest → Mark low-priority as read → Label processed threads

**User Configuration:**
- Gemini API key (required, per-user in UserProperties)
- Digest frequency: Hourly / Daily / Monthly
- Time & timezone: User's local time, converted to UTC for trigger
- Custom label name (default: `digest/processed`)

**Key Features Completed:**
- Dashboard card showing last run stats
- Run Digest Now button (fires in ~30 seconds via `at()` trigger)
- Settings accessible via overflow menu (⋮)
- Skip already-triaged emails (via label filter)
- Performance optimizations: thread object reuse, batch processing

---

## Known Limitations

- **Email format:** Plain text only (no HTML formatting or direct thread links)
- **Actions from digest:** User must open Gmail to act; no quick-reply or archive-from-email
- **Multi-user:** Single user per deployment; no family/team account support
- **Execution context:** `eveningDigest()` can run ~2-3 minutes; any expansion risks timeout
- **Add-on constraints:** Time-based triggers require ≥1 hour intervals for recurring, `at()` works for one-time

---

## Planned Features (Prioritized)

### Phase 1: Email UX (High Value, Medium Effort)

**1. HTML Digest Email** ✅
- Styled HTML with dark header, stats bar, category colour-coded pills
- Clickable thread links (`#all/THREADID`) for both kept and cleared emails
- MED badge for medium-priority cleared items
- Plain-text fallback retained for non-HTML clients
- Timezone fix: `useLocaleFromApp: true` + `script.locale` scope populates `e.commonEventObject.timeZone`

**2. Archive Option**
- Add UI toggle in settings: "Mark as read" vs. "Archive"
- Affects low-priority emails only (kept-unread emails always stay)
- Update `markThreadsAsRead_` or create `archiveThreads_` variant

**3. Send to Different Email**
- Settings option to send digest to an alternate address
- Useful for reading digest on phone / in a different inbox
- Store as `DIGEST_SEND_TO` in UserProperties (default: `Session.getActiveUser().getEmail()`)

### Phase 2: Power Features (Medium Value, High Effort)

**4. Custom Sender Rules**
- Whitelist: "always keep unread" (override Gemini)
- Blacklist: "always mark as read" (override Gemini)
- Store as JSON in UserProperties (e.g. `SENDER_RULES = {whitelist: [...], blacklist: [...]}`)
- Apply in `Code.gs` after Gemini analysis, before marking/labeling

**5. Unsubscribe Suggestions**
- Post-process cleared emails to detect unsubscribe links
- Show top-N promotional senders with high email volume
- Offer one-click unsubscribe (requires Gmail API integration)
- Can defer this to Phase 3 if API integration is complex

**6. Digest in Add-on Panel (Not Just Email)**
- Show last digest content in a collapsible card section
- Removes need to open email inbox to see the digest
- Requires storing digest text in UserProperties (size limit: 10MB per user, should be fine)

### Phase 3: Analytics & Flexibility (Lower Priority)

**7. Weekly/Monthly Analytics**
- Track category/sender trends over time
- Show pie charts: "X% promotional, Y% transactional, Z% personal"
- Store daily snapshots in UserProperties (or use a simple Google Sheet as backing store)

**8. Multiple Schedules**
- "Morning briefing" (light scan: last N emails) + "Evening cleanup" (full run)
- Requires tracking multiple trigger IDs and scheduling
- UI becomes more complex

**9. Multi-Model Support**
- Let users swap between Gemini, OpenAI (Claude), local models
- Add UI picker in settings
- Requires abstracting the prompt/analysis pipeline

**10. Digest Preview in Panel**
- Show last digest content inline, not just from email
- Collapsible section with "Mark all as read" button
- Requires UserProperties storage for digest content

---

## Technical Debt & Known Issues

- **Trigger cleanup:** If `runDigestOnce_` fails before `finally`, trigger orphans accumulate (mitigated by `at()` + `LockService`)
- **OAuth scope**: `gmail.addons.execute` required; `script.send_mail` requires explicit user auth
- **Rate limiting:** Gemini API quota could be hit with large inboxes; no backoff or retry logic
- **Error visibility:** No error notifications to user if digest fails silently
- **Deployment:** No versioning; all users pull latest code (no canary/staged rollouts)

---

## Test Scenarios (for QA)

- [ ] Empty inbox → no digest sent
- [ ] Large inbox (200+ emails) → stays within execution time limit
- [ ] Important+high email → stays unread, labeled, not cleared next run
- [ ] Multiple "Run Now" clicks in quick succession → deduped, no double-run
- [ ] Settings changed mid-run → respects previous config until next run
- [ ] Trigger deleted manually → "Run Now" still works (creates new trigger)
- [ ] API key expired → graceful error message in logs

---

## Next Session TODO

1. **Read this file** to understand context
2. **Pick a feature** from Phase 1 (lowest hanging fruit: HTML email + clickable links)
3. **Start with HTML template** — move `buildDigest_` output to HTML builder
4. **Add thread link generation** — use `https://mail.google.com/mail/u/0/#inbox?threadId=XXX` format
5. **Test email rendering** in Gmail inbox (Gmail supports inline HTML)

---

## Reference: Key Files

- `Settings.gs` — add-on card UI, settings save/load, trigger management
- `Code.gs` — pipeline orchestration, stats storage
- `GeminiClient.gs` — Gemini API integration, model selection
- `GmailHelper.gs` — Gmail operations (fetch, label, archive)
- `appsscript.json` — manifest, OAuth scopes, timezone (UTC)

---

## Quick Links

- **GitHub:** [gmail-triage repo](https://github.com/BugDiver/gmail-triage)
- **Deployment:** GitHub Actions auto-deploys to Apps Script on push to `main`
- **App Name (Marketplace):** "Gmail Triage" (if we go public)
