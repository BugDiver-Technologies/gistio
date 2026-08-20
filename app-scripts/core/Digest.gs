/**
 * Pure digest logic — no GAS API dependencies.
 */

function isKeptUnread_(email) {
  return email.category === 'important' && email.priority === 'high';
}

/**
 * Formats the digest email body from processed email results.
 * @param {Array<Object>} processed
 * @param {string}        timezone  IANA timezone ID for the header timestamp (e.g. 'Asia/Kolkata')
 * @returns {string}
 */
function buildDigest_(processed, timezone) {
  var now     = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' });
  var kept    = processed.filter(isKeptUnread_);
  var cleared = processed.filter(function(e) { return !isKeptUnread_(e); });

  var lines = [];
  lines.push('GISTIO DIGEST  ' + now);
  lines.push('Total: ' + processed.length + '  |  Kept unread: ' + kept.length + '  |  Cleared: ' + cleared.length);
  lines.push('='.repeat(60));

  if (kept.length > 0) {
    lines.push('\nKEPT UNREAD — NEEDS ATTENTION (' + kept.length + ')');
    lines.push('-'.repeat(40));
    kept.forEach(function(e) {
      lines.push('  ' + e.subject + (e.vip ? '  [VIP]' : ''));
      lines.push('  From   : ' + e.from);
      lines.push('  Summary: ' + e.summary);
      lines.push('');
    });
  }

  if (cleared.length > 0) {
    lines.push('\nCLEARED FROM INBOX (' + cleared.length + ')');
    lines.push('-'.repeat(40));

    var byCategory = {};
    cleared.forEach(function(e) {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    });

    Object.keys(byCategory).sort().forEach(function(cat) {
      var items = byCategory[cat];
      lines.push('  ' + cat.toUpperCase() + ' (' + items.length + ')');
      items.forEach(function(e) {
        var tag = e.priority !== 'low' ? '[' + e.priority.toUpperCase() + '] ' : '';
        lines.push('    · ' + tag + e.subject);
      });
    });
  }

  lines.push('\n' + '='.repeat(60));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML digest — uses DigestHeader.gs for chrome (header/footer/row helpers)
// ---------------------------------------------------------------------------

/** Escapes HTML special characters to prevent injection. */
function escapeHtml_(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Gmail deep-link for a thread. Works even after the thread is archived. */
function threadUrl_(threadId) {
  return 'https://mail.google.com/mail/u/0/#all/' + threadId;
}

/**
 * Builds a styled HTML digest email using the Gistio brand chrome.
 * @param {Array<Object>} processed  Array of classified email objects.
 * @returns {string} HTML suitable for MailApp htmlBody.
 */
function buildHtmlDigest_(processed) {
  var kept    = processed.filter(isKeptUnread_);
  var cleared = processed.filter(function(e) { return !isKeptUnread_(e); });

  var body = '';

  if (kept.length > 0) {
    body += digestSection_('Needs attention');
    kept.forEach(function(e) {
      var subjectLink = e.threadId
        ? '<a href="' + threadUrl_(e.threadId) + '" style="color:#111A1F;text-decoration:none">' + escapeHtml_(e.subject) + '</a>'
        : escapeHtml_(e.subject);
      body += digestRow_(
        subjectLink + '<br><span style="font-size:11px;color:#6B7280">' + escapeHtml_(e.from) + '</span>',
        e.vip ? 'VIP' : e.category,
        'attention'
      );
    });
  }

  if (cleared.length > 0) {
    var byCategory = {};
    cleared.forEach(function(e) {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    });

    body += digestSection_('Cleared');
    Object.keys(byCategory).sort().forEach(function(cat) {
      byCategory[cat].forEach(function(e) {
        var subjectLink = e.threadId
          ? '<a href="' + threadUrl_(e.threadId) + '" style="color:#1F2937;text-decoration:none">' + escapeHtml_(e.subject) + '</a>'
          : escapeHtml_(e.subject);
        var tag = cat + (e.priority === 'medium' ? ' · med' : '');
        body += digestRow_(subjectLink, tag, 'cleared');
      });
    });
  }

  return digestShellOpen_({ reviewed: processed.length, attention: kept.length, cleared: cleared.length })
    + body
    + digestShellClose_();
}
