/**
 * DigestHeader.gs — Gistio digest email chrome.
 *
 * Brand: Concept 04 (sweep) · Charcoal / Teal.
 * Vocabulary per BRAND.md: "digest run", "Needs attention", "Cleared".
 *
 * Usage in Code.gs → buildDigest_():
 *   var html = digestShellOpen_({ reviewed: 47, attention: 3, cleared: 44 })
 *            + body
 *            + digestShellClose_();
 *   GmailApp.sendEmail(to, digestSubject_(3), '', { htmlBody: html });
 *
 * Gmail strips <svg> and most <style> blocks, so the mark ships as a hosted
 * PNG and every rule is inline. Tables, not flexbox — same reason.
 */

var GISTIO_BRAND = {
  ink:      '#111A1F',  // header band
  surface:  '#1C2E34',  // stat bar
  teal:     '#00C9A7',  // brand accent / cleared
  amber:    '#F59E0B',  // needs attention
  page:     '#F9FAFB',
  card:     '#FFFFFF',
  text:     '#1F2937',
  muted:    '#6B7280',
  hairline: '#E5E7EB',
  logo:     'https://bugdiver.github.io/gistio/icon-128.png'
};

function digestSubject_(attentionCount) {
  if (attentionCount === 0) return 'Gistio · nothing needs you today';
  return 'Gistio · ' + attentionCount + (attentionCount === 1 ? ' thing needs you' : ' things need you');
}

/** Header band + stat bar + open card. */
function digestShellOpen_(counts) {
  var B = GISTIO_BRAND;
  var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEE · MMM d');

  return '' +
  '<div style="background:' + B.page + ';padding:24px 12px;font-family:Inter,Helvetica,Arial,sans-serif">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;border-radius:14px;overflow:hidden;border:1px solid ' + B.hairline + '">' +

    // ── Header band ─────────────────────────────────────────────
    '<tr><td style="background:' + B.ink + ';padding:18px 22px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
        '<td width="26" valign="middle" style="padding-right:12px">' +
          '<img src="' + B.logo + '" width="26" height="26" alt="Gistio" ' +
               'style="display:block;border:0;border-radius:6px">' +
        '</td>' +
        '<td valign="middle">' +
          '<div style="font-size:15px;font-weight:300;letter-spacing:.06em;color:#E8F4F2;line-height:1">gistio</div>' +
          '<div style="font-size:9px;letter-spacing:.1em;color:' + B.teal + ';padding-top:4px">DIGEST</div>' +
        '</td>' +
        '<td valign="middle" align="right" style="font-size:11px;color:#4A6B67;white-space:nowrap">' + date + '</td>' +
      '</tr></table>' +
    '</td></tr>' +

    // ── Stat bar ────────────────────────────────────────────────
    '<tr><td style="background:' + B.surface + ';padding:12px 22px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
        digestStat_(counts.reviewed,  'REVIEWED',        '#E8F4F2') +
        digestStat_(counts.attention, 'NEEDS ATTENTION', B.amber) +
        digestStat_(counts.cleared,   'CLEARED',         B.teal) +
      '</tr></table>' +
    '</td></tr>' +

    // ── Card body opens ─────────────────────────────────────────
    '<tr><td style="background:' + B.card + ';padding:20px 22px">';
}

function digestStat_(n, label, color) {
  return '<td style="padding-right:26px">' +
    '<div style="font-size:20px;font-weight:400;color:' + color + ';line-height:1.1">' + n + '</div>' +
    '<div style="font-size:9px;letter-spacing:.08em;color:#4A6B67;padding-top:3px">' + label + '</div>' +
  '</td>';
}

/** Section label inside the card. */
function digestSection_(title) {
  var B = GISTIO_BRAND;
  return '<div style="font-size:10px;font-weight:600;letter-spacing:.1em;color:' + B.muted +
         ';text-transform:uppercase;padding:14px 0 8px">' + title + '</div>';
}

/**
 * One digest row. tone: 'attention' | 'cleared' | 'neutral'
 */
function digestRow_(text, tag, tone) {
  var B = GISTIO_BRAND;
  var accent = tone === 'attention' ? B.amber : (tone === 'cleared' ? B.teal : '#D1D5DB');
  var bg     = tone === 'attention' ? '#FFFBEB' : '#F3F4F6';
  return '' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
         'style="border-collapse:collapse;margin-bottom:6px;background:' + bg + ';border-radius:8px">' +
    '<tr>' +
      '<td width="3" style="background:' + accent + ';border-radius:8px 0 0 8px">&nbsp;</td>' +
      '<td style="padding:10px 12px;font-size:13px;color:' + B.text + ';line-height:1.45">' + text + '</td>' +
      '<td align="right" style="padding:10px 12px;font-size:10px;letter-spacing:.04em;color:' + B.muted + ';white-space:nowrap">' + (tag || '') + '</td>' +
    '</tr>' +
  '</table>';
}

/** Close card + footer. */
function digestShellClose_() {
  var B = GISTIO_BRAND;
  return '' +
    '</td></tr>' +
    '<tr><td style="background:' + B.card + ';border-top:1px solid ' + B.hairline + ';padding:16px 22px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
        '<td style="font-size:11px;color:' + B.muted + '">Get the gist. Skip the noise.</td>' +
        '<td align="right" style="font-size:11px;color:' + B.muted + '">gistio</td>' +
      '</tr></table>' +
    '</td></tr>' +
  '</table></div>';
}

/** Preview helper — run from the editor to mail yourself the chrome. */
function previewDigestHeader() {
  var html = digestShellOpen_({ reviewed: 47, attention: 3, cleared: 44 })
    + digestSection_('Needs attention')
    + digestRow_('3 threads are waiting on your reply', 'Reply', 'attention')
    + digestRow_('Contract from Meridian LLC ready to sign', 'Action', 'attention')
    + digestSection_('Cleared')
    + digestRow_('44 newsletters, promos and updates', 'Cleared', 'cleared')
    + digestShellClose_();
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), digestSubject_(3), '', { htmlBody: html });
}
