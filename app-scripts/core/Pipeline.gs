/**
 * Evening Email Digest — orchestration layer.
 *
 * Runs on schedule (eveningDigest) or on demand via the add-on panel
 * (runDigestOnce_). All business logic lives in core/Digest.gs,
 * integrations/GeminiClient.gs, and integrations/GmailHelper.gs.
 *
 * Data never leaves Google's infrastructure.
 */

function runDigestOnce_() {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(0)) return;
  try {
    eveningDigest();
  } finally {
    // eveningDigest's finally block clears DIGEST_RUNNING
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'runDigestOnce_') ScriptApp.deleteTrigger(t);
    });
    lock.releaseLock();
  }
}

function eveningDigest() {
  var props   = PropertiesService.getUserProperties();
  var runId   = Utilities.getUuid().substring(0, 8);
  var userKey = Session.getTemporaryActiveUserKey().substring(0, 6);
  var prefix  = '[user:' + userKey + '] [run:' + runId + '] ';

  if (props.getProperty('DIGEST_RUNNING') !== 'true') {
    props.setProperty('DIGEST_RUNNING', 'true');
  }
  props.deleteProperty('LAST_RUN_ERROR');
  props.deleteProperty('LAST_RUN_REF');

  try {
    console.log(prefix + 'Digest started');
    var emails = fetchUnreadEmails_(20);

    if (emails.length === 0) {
      console.log(prefix + 'No unread emails');
      return;
    }

    console.log(prefix + 'Fetched ' + emails.length + ' emails');

    var threadMap = {};
    emails.forEach(function(e) { threadMap[e.threadId] = e.thread; });

    var processed = analyzeEmails_(emails, runId);

    var vipList = parseVipSenders_(props.getProperty('VIP_SENDERS') || '');
    if (vipList.length > 0) {
      processed = applyVipOverrides_(processed, vipList);
      console.log(prefix + 'VIP overrides applied: ' + processed.filter(function(e) { return e.vip; }).length);
    }

    var kept    = processed.filter(isKeptUnread_);
    var cleared = processed.filter(function(e) { return !isKeptUnread_(e); });

    // 1. Mark as read (or archive) low-priority threads
    var toProcess = cleared.map(function(e) { return threadMap[e.threadId]; });
    var action    = props.getProperty('DIGEST_ACTION') || 'mark_read';

    if (toProcess.length > 0) {
      if (action === 'archive') {
        archiveThreads_(toProcess);
        console.log(prefix + 'Archived ' + toProcess.length + ' threads');
      } else {
        markThreadsAsRead_(toProcess);
        console.log(prefix + 'Marked ' + toProcess.length + ' threads as read');
      }
    }

    // 2. Label
    var allThreads = processed.map(function(e) { return threadMap[e.threadId]; });
    applyLabelToThreads_(allThreads, getLabelName_());
    console.log(prefix + 'Labelled ' + allThreads.length + ' threads');

    // 3. Send digest (inbox already cleaned up)
    var timezone  = props.getProperty('TZ_ID') || 'UTC';
    var plain     = buildDigest_(processed, timezone);
    var htmlBody  = buildHtmlDigest_(processed);
    var userEmail = Session.getActiveUser().getEmail();
    MailApp.sendEmail(userEmail, digestSubject_(kept.length), plain, { htmlBody: htmlBody });
    console.log(prefix + 'Digest sent');

    // 4. Save stats + attention emails for dashboard
    props.setProperties({
      'LAST_RUN_TIME':      new Date().toISOString(),
      'LAST_RUN_PROCESSED': String(processed.length),
      'LAST_RUN_KEPT':      String(kept.length),
      'LAST_RUN_CLEARED':   String(processed.length - kept.length),
      'LAST_RUN_ATTENTION': JSON.stringify(kept.slice(0, 10).map(function(e) {
        return { subject: e.subject, threadId: e.threadId };
      })),
      'LAST_RUN_CLEARED_ITEMS': JSON.stringify(cleared.slice(0, 15).map(function(e) {
        return { subject: e.subject, threadId: e.threadId, category: e.category };
      })),
    });
    console.log(prefix + 'Done');
  } catch (err) {
    console.error(prefix + 'Error: ' + err.message);
    props.setProperty('LAST_RUN_ERROR', err.message);
    props.setProperty('LAST_RUN_REF',   'run:' + runId + '  user:' + userKey);
    throw err;
  } finally {
    props.deleteProperty('DIGEST_RUNNING');
  }
}
