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
    var emails = fetchUnreadEmails_(100);

    if (emails.length === 0) {
      Logger.log('No unread emails. All done.');
      return;
    }

    Logger.log('Found ' + emails.length + ' unread emails. Sending to Gemini...');

    var threadMap = {};
    emails.forEach(function(e) { threadMap[e.threadId] = e.thread; });

    var processed = analyzeEmails_(emails);
    var kept      = processed.filter(isKeptUnread_);

    // 1. Mark as read
    var toMark = processed
      .filter(function(e) { return !isKeptUnread_(e); })
      .map(function(e) { return threadMap[e.threadId]; });

    if (toMark.length > 0) {
      Logger.log('Marking ' + toMark.length + ' threads as read...');
      markThreadsAsRead_(toMark);
    }

    // 2. Label
    var allThreads = processed.map(function(e) { return threadMap[e.threadId]; });
    applyLabelToThreads_(allThreads, getLabelName_());
    Logger.log('Labelled ' + allThreads.length + ' threads as ' + getLabelName_() + '.');

    // 3. Send digest (inbox already cleaned up)
    var timezone = props.getProperty('TZ_ID') || 'UTC';
    var digest   = buildDigest_(processed, timezone);
    var userEmail = Session.getActiveUser().getEmail();
    var subject   = 'Email Digest — ' + new Date().toLocaleDateString('en-US', { timeZone: timezone });
    MailApp.sendEmail(userEmail, subject, digest);
    Logger.log('Digest sent to ' + userEmail);

    // 4. Save stats
    props.setProperties({
      'LAST_RUN_TIME':      new Date().toISOString(),
      'LAST_RUN_PROCESSED': String(processed.length),
      'LAST_RUN_KEPT':      String(kept.length),
      'LAST_RUN_CLEARED':   String(processed.length - kept.length),
    });
  } finally {
    props.deleteProperty('DIGEST_RUNNING');
  }
}
