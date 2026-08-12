/**
 * Fetches unread emails from inbox.
 * @param {number} maxResults
 * @returns {Array<Object>}
 */
function _fetchUnreadEmails(maxResults) {
  maxResults = maxResults || 100;
  const threads = GmailApp.search('is:unread in:inbox', 0, maxResults);
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

/**
 * Marks threads as read given a list of thread IDs.
 * @param {Array<string>} threadIds
 */
function _markThreadsAsRead(threadIds) {
  threadIds.forEach(function (id) {
    GmailApp.getThreadById(id).markRead();
  });
}
