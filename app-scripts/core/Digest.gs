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
      lines.push('  ' + e.subject);
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
// HTML digest
// ---------------------------------------------------------------------------

/** @type {Object.<string, string>} Category → accent colour (hex). */
var CATEGORY_COLORS_ = {
  important:     '#e65c00',
  transactional: '#1a73e8',
  promotional:   '#0f9d58',
  newsletter:    '#7b1fa2',
  notification:  '#00acc1',
  social:        '#e91e63',
};

/** Returns the accent colour for a category, or a neutral default. */
function categoryColor_(cat) {
  return CATEGORY_COLORS_[cat] || '#607d8b';
}

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
 * Builds a styled HTML digest email.
 * @param {Array<Object>} processed  Array of classified email objects.
 * @param {string}        timezone   IANA timezone ID for the timestamp.
 * @returns {string} Complete HTML document suitable for MailApp htmlBody.
 */
function buildHtmlDigest_(processed, timezone) {
  var now     = new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC', dateStyle: 'full', timeStyle: 'short' });
  var kept    = processed.filter(isKeptUnread_);
  var cleared = processed.filter(function(e) { return !isKeptUnread_(e); });

  var html = [];

  // ── Outer wrapper ──────────────────────────────────────────────────────────
  html.push(
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '</head>',
    '<body style="margin:0;padding:0;background:#f1f3f4;font-family:Roboto,Arial,sans-serif;color:#202124;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f4;padding:24px 8px;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;',
    'border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">'
  );

  // ── Header ─────────────────────────────────────────────────────────────────
  html.push(
    '<tr><td style="background:#202124;padding:24px 32px;">',
    '<p style="margin:0;color:#ffffff;font-size:22px;font-weight:500;letter-spacing:.5px;">Gistio</p>',
    '<p style="margin:6px 0 0;color:#9aa0a6;font-size:13px;">' + escapeHtml_(now) + '</p>',
    '</td></tr>'
  );

  // ── Stats bar ──────────────────────────────────────────────────────────────
  html.push(
    '<tr><td style="background:#e8f0fe;padding:12px 32px;font-size:13px;color:#1a73e8;">',
    '<b>' + processed.length + '</b> processed &nbsp;·&nbsp; ',
    '<b>' + kept.length + '</b> kept unread &nbsp;·&nbsp; ',
    '<b>' + cleared.length + '</b> cleared',
    '</td></tr>'
  );

  // ── Kept unread section ───────────────────────────────────────────────────
  if (kept.length > 0) {
    html.push(
      '<tr><td style="padding:24px 32px 8px;">',
      '<p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;',
      'letter-spacing:.8px;color:#e65c00;">Needs attention (' + kept.length + ')</p>',
      '</td></tr>'
    );

    kept.forEach(function(e) {
      var link = e.threadId ? threadUrl_(e.threadId) : null;
      var subjectHtml = link
        ? '<a href="' + link + '" style="color:#202124;text-decoration:none;font-weight:500;font-size:15px;">' + escapeHtml_(e.subject) + '</a>'
        : '<span style="font-weight:500;font-size:15px;">' + escapeHtml_(e.subject) + '</span>';

      html.push(
        '<tr><td style="padding:0 32px 16px;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #e65c00;padding-left:12px;">',
        '<tr><td>', subjectHtml, '</td></tr>',
        '<tr><td style="padding:3px 0;font-size:12px;color:#5f6368;">' + escapeHtml_(e.from) + '</td></tr>',
        '<tr><td style="padding:4px 0 0;font-size:13px;color:#3c4043;">' + escapeHtml_(e.summary) + '</td></tr>',
        '</table>',
        '</td></tr>'
      );
    });
  }

  // ── Cleared section ────────────────────────────────────────────────────────
  if (cleared.length > 0) {
    html.push(
      '<tr><td style="padding:' + (kept.length > 0 ? '8' : '24') + 'px 32px 8px;">',
      '<p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;',
      'letter-spacing:.8px;color:#5f6368;">Cleared from inbox (' + cleared.length + ')</p>',
      '</td></tr>'
    );

    var byCategory = {};
    cleared.forEach(function(e) {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    });

    Object.keys(byCategory).sort().forEach(function(cat) {
      var color = categoryColor_(cat);
      var items = byCategory[cat];

      html.push(
        '<tr><td style="padding:0 32px 4px;">',
        '<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:' + color + '22;',
        'color:' + color + ';font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">',
        escapeHtml_(cat), ' (', items.length, ')',
        '</span>',
        '</td></tr>'
      );

      items.forEach(function(e) {
        var link = e.threadId ? threadUrl_(e.threadId) : null;
        var subjectHtml = link
          ? '<a href="' + link + '" style="color:#3c4043;text-decoration:none;font-size:13px;">' + escapeHtml_(e.subject) + '</a>'
          : '<span style="font-size:13px;">' + escapeHtml_(e.subject) + '</span>';

        var priorityBadge = (e.priority === 'medium')
          ? '<span style="display:inline-block;padding:1px 6px;border-radius:8px;background:#f9ab00;color:#fff;' +
            'font-size:10px;font-weight:700;margin-right:6px;vertical-align:middle;">MED</span>'
          : '';

        html.push(
          '<tr><td style="padding:3px 32px 3px 40px;line-height:1.5;">',
          '<span style="color:#9aa0a6;margin-right:6px;">&middot;</span>',
          priorityBadge,
          subjectHtml,
          '</td></tr>'
        );
      });

      html.push('<tr><td style="padding:6px 0;"></td></tr>');
    });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  html.push(
    '<tr><td style="padding:20px 32px;border-top:1px solid #e0e0e0;font-size:11px;color:#9aa0a6;text-align:center;">',
    'Gistio &nbsp;&middot;&nbsp; Get the gist. Skip the noise.',
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>'
  );

  return html.join('');
}
