/**
 * Fetches unread emails from inbox.
 * @param {number} maxResults
 * @returns {Array<Object>}
 */
function fetchUnreadEmails_(maxResults) {
  maxResults = maxResults || 100;
  const threads = GmailApp.search('is:unread in:inbox -label:digest/processed', 0, maxResults);
  const emails = [];

  threads.forEach(function (thread) {
    const msg = thread.getMessages()[0];
    emails.push({
      threadId: thread.getId(),
      subject: msg.getSubject() || '(no subject)',
      from: msg.getFrom(),
      date: msg.getDate().toISOString(),
      snippet: msg.getPlainBody().slice(0, 600).replace(/\s+/g, ' ').trim(),
    });
  });

  return emails;
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function applyLabelToThreads_(threadIds, labelName) {
  var label = getOrCreateLabel_(labelName);
  threadIds.forEach(function(id) {
    GmailApp.getThreadById(id).addLabel(label);
  });
}

/**
 * Marks threads as read given a list of thread IDs.
 * @param {Array<string>} threadIds
 */
function markThreadsAsRead_(threadIds) {
  threadIds.forEach(function (id) {
    GmailApp.getThreadById(id).markRead();
  });
}
