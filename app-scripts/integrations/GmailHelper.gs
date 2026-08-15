/**
 * Gmail utilities — thin wrappers around the GmailApp API.
 */

/**
 * Fetches unread emails from the inbox, skipping already-processed threads.
 * @param {number} maxResults
 * @returns {Array<Object>}
 */
function fetchUnreadEmails_(maxResults) {
  maxResults    = maxResults || 100;
  var threads   = GmailApp.search('is:unread in:inbox -label:' + getLabelName_(), 0, maxResults);
  var emails    = [];

  threads.forEach(function(thread) {
    var msg = thread.getMessages()[0];
    emails.push({
      threadId: thread.getId(),
      thread:   thread,
      subject:  msg.getSubject() || '(no subject)',
      from:     msg.getFrom(),
      date:     msg.getDate().toISOString(),
      snippet:  msg.getPlainBody().slice(0, 600).replace(/\s+/g, ' ').trim(),
    });
  });

  return emails;
}

function getLabelName_() {
  return PropertiesService.getUserProperties().getProperty('DIGEST_LABEL') || 'digest/processed';
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function applyLabelToThreads_(threads, labelName) {
  var label = getOrCreateLabel_(labelName);
  threads.forEach(function(thread) { thread.addLabel(label); });
}

function markThreadsAsRead_(threads) {
  threads.forEach(function(thread) { thread.markRead(); });
}
