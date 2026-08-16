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
  var props = PropertiesService.getUserProperties();

  // Set flag if not already set (runNow_ may have set it early for UI feedback)
  if (props.getProperty('DIGEST_RUNNING') !== 'true') {
    props.setProperty('DIGEST_RUNNING', 'true');
  }

  try {
    Logger.log('Fetching unread emails...');
    var emails = fetchUnreadEmails_(20);

    if (emails.length === 0) {
      Logger.log('No unread emails. All done.');
      return;
    }

    Logger.log('Found ' + emails.length + ' unread emails. Sending to Gemini...');

    var threadMap = {};
    emails.forEach(function(e) { threadMap[e.threadId] = e.thread; });

    var processed = analyzeEmails_(emails);
    var kept      = processed.filter(isKeptUnread_);

    // 1. Mark as read (or archive) low-priority threads
    var toProcess = processed
      .filter(function(e) { return !isKeptUnread_(e); })
      .map(function(e) { return threadMap[e.threadId]; });

    if (toProcess.length > 0) {
      var action = props.getProperty('DIGEST_ACTION') || 'mark_read';
      if (action === 'archive') {
        Logger.log('Archiving ' + toProcess.length + ' threads...');
        archiveThreads_(toProcess);
      } else {
        Logger.log('Marking ' + toProcess.length + ' threads as read...');
        markThreadsAsRead_(toProcess);
      }
    }

    // 2. Label
    var allThreads = processed.map(function(e) { return threadMap[e.threadId]; });
    applyLabelToThreads_(allThreads, getLabelName_());
    Logger.log('Labelled ' + allThreads.length + ' threads as ' + getLabelName_() + '.');

    // 3. Send digest (inbox already cleaned up)
    var timezone  = props.getProperty('TZ_ID') || 'UTC';
    var plain     = buildDigest_(processed, timezone);
    var htmlBody  = buildHtmlDigest_(processed);
    var userEmail = Session.getActiveUser().getEmail();
    var subject   = digestSubject_(kept.length);
    MailApp.sendEmail(userEmail, subject, plain, { htmlBody: htmlBody });
    Logger.log('Digest sent to ' + userEmail);

    // 4. Save stats + attention emails for dashboard
    props.setProperties({
      'LAST_RUN_TIME':      new Date().toISOString(),
      'LAST_RUN_PROCESSED': String(processed.length),
      'LAST_RUN_KEPT':      String(kept.length),
      'LAST_RUN_CLEARED':   String(processed.length - kept.length),
      'LAST_RUN_ATTENTION': JSON.stringify(kept.slice(0, 10).map(function(e) {
        return { subject: e.subject, threadId: e.threadId };
      })),
    });
  } finally {
    props.deleteProperty('DIGEST_RUNNING');
  }
}
