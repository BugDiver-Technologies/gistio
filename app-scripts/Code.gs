/**
 * Evening Email Digest
 *
 * Runs at 7:30 PM IST every day (configured via Setup.gs).
 * Fetches unread emails, classifies them with Gemini, sends a digest
 * email to yourself, and marks low-priority emails as read.
 *
 * Data never leaves Google's infrastructure.
 */


function isKeptUnread_(email) {
  return email.category === 'important' && email.priority === 'high';
}


function buildDigest_(processed) {
  var now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  var kept   = processed.filter(isKeptUnread_);
  var cleared = processed.filter(function (e) { return !isKeptUnread_(e); });

  var lines = [];
  lines.push('EMAIL DIGEST  ' + now);
  lines.push('Total: ' + processed.length + '  |  Kept unread: ' + kept.length + '  |  Cleared: ' + cleared.length);
  lines.push('='.repeat(60));

  if (kept.length > 0) {
    lines.push('\nKEPT UNREAD — NEEDS ATTENTION (' + kept.length + ')');
    lines.push('-'.repeat(40));
    kept.forEach(function (e) {
      lines.push('  ' + e.subject);
      lines.push('  From   : ' + e.from);
      lines.push('  Summary: ' + e.summary);
      lines.push('');
    });
  }

  if (cleared.length > 0) {
    lines.push('\nCLEARED FROM INBOX (' + cleared.length + ')');
    lines.push('-'.repeat(40));

    // Group by category
    var byCategory = {};
    cleared.forEach(function (e) {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    });

    Object.keys(byCategory).sort().forEach(function (cat) {
      var items = byCategory[cat];
      lines.push('  ' + cat.toUpperCase() + ' (' + items.length + ')');
      items.forEach(function (e) {
        var tag = e.priority !== 'low' ? '[' + e.priority.toUpperCase() + '] ' : '';
        lines.push('    · ' + tag + e.subject);
      });
    });
  }

  lines.push('\n' + '='.repeat(60));
  return lines.join('\n');
}


function eveningDigest() {
  Logger.log('Fetching unread emails...');
  var emails = fetchUnreadEmails_(100);

  if (emails.length === 0) {
    Logger.log('No unread emails. All done.');
    return;
  }

  Logger.log('Found ' + emails.length + ' unread emails. Sending to Gemini...');
  var processed = analyzeEmails_(emails);

  var digest = buildDigest_(processed);
  Logger.log(digest);

  // Email the digest to yourself
  var userEmail = Session.getActiveUser().getEmail();
  var subject = 'Evening Email Digest — ' + new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  GmailApp.sendEmail(userEmail, subject, digest);
  Logger.log('Digest sent to ' + userEmail);

  // Mark everything as read except important+high
  var toMark = processed
    .filter(function (e) { return !isKeptUnread_(e); })
    .map(function (e) { return e.threadId; });

  if (toMark.length > 0) {
    Logger.log('Marking ' + toMark.length + ' threads as read...');
    markThreadsAsRead_(toMark);
    Logger.log('Done.');
  }

  // Label all processed threads so they're skipped on the next run
  var allThreadIds = processed.map(function(e) { return e.threadId; });
  applyLabelToThreads_(allThreadIds, getLabelName_());
  Logger.log('Labelled ' + allThreadIds.length + ' threads as ' + getLabelName_() + '.');
}
