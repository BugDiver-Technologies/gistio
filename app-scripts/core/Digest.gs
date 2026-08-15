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
  lines.push('EMAIL DIGEST  ' + now);
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
