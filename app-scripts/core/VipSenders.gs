/**
 * VIP sender overrides — pure logic, no GAS API dependencies.
 *
 * Lets a user pin specific email addresses or whole domains that should
 * always stay unread, regardless of what the AI classifies them as. This
 * is the escape hatch for "what if it buries something important" — it
 * runs as a final override pass after Gemini's classification.
 */

/**
 * Parses the raw VIP senders textarea into a normalized list.
 * Accepts one entry per line (or comma-separated); trims, lowercases,
 * and drops blanks/duplicates. Entries are either a full email address
 * ("boss@company.com") or a bare domain ("company.com").
 * @param {string} raw
 * @returns {Array<string>}
 */
function parseVipSenders_(raw) {
  if (!raw) return [];
  var seen = {};
  return raw
    .split(/[\n,]/)
    .map(function(s) { return s.trim().toLowerCase(); })
    .filter(function(s) {
      if (s === '' || seen[s]) return false;
      seen[s] = true;
      return true;
    });
}

/**
 * Extracts the bare email address from a From header.
 * Handles both "Name <email@domain.com>" and plain "email@domain.com".
 * @param {string} fromHeader
 * @returns {string} lowercase email address, or '' if none found
 */
function extractEmailAddress_(fromHeader) {
  if (!fromHeader) return '';
  var match = fromHeader.match(/<([^>]+)>/);
  var email = match ? match[1] : fromHeader;
  return email.trim().toLowerCase();
}

/**
 * Checks whether a From header matches any entry in the VIP list —
 * either an exact email match or a domain match.
 * @param {string}        fromHeader
 * @param {Array<string>} vipList  Normalized list from parseVipSenders_
 * @returns {boolean}
 */
function senderMatchesVip_(fromHeader, vipList) {
  if (!vipList || vipList.length === 0) return false;
  var email  = extractEmailAddress_(fromHeader);
  var domain = email.split('@')[1] || '';

  return vipList.some(function(entry) {
    if (entry.indexOf('@') !== -1) return entry === email;
    return entry !== '' && domain === entry;
  });
}

/**
 * Applies VIP overrides to a batch of classified emails. Matching emails
 * are forced to 'important' + 'high' (so isKeptUnread_ keeps them unread)
 * and flagged with vip: true for digest display. Non-matches pass through
 * unchanged.
 * @param {Array<Object>} processed  Output of analyzeEmails_
 * @param {Array<string>} vipList    Normalized list from parseVipSenders_
 * @returns {Array<Object>}
 */
function applyVipOverrides_(processed, vipList) {
  if (!vipList || vipList.length === 0) return processed;

  return processed.map(function(e) {
    if (!senderMatchesVip_(e.from, vipList)) return e;
    return Object.assign({}, e, { category: 'important', priority: 'high', vip: true });
  });
}
