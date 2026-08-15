'use strict';

describe('isKeptUnread_', () => {
  test('returns true only for important + high', () => {
    expect(isKeptUnread_({ category: 'important', priority: 'high' })).toBe(true);
  });

  test.each([
    { category: 'important', priority: 'medium' },
    { category: 'important', priority: 'low' },
    { category: 'promotional', priority: 'high' },
    { category: 'notification', priority: 'low' },
  ])('returns false for %o', (email) => {
    expect(isKeptUnread_(email)).toBe(false);
  });
});


describe('buildDigest_', () => {
  const kept = { category: 'important', priority: 'high',   subject: 'Urgent bill', from: 'bank@example.com', summary: 'Your bill is due.' };
  const low  = { category: 'promotional', priority: 'low',  subject: 'Sale today',  from: 'shop@example.com', summary: 'Big sale.' };
  const med  = { category: 'notification', priority: 'medium', subject: 'PR review', from: 'gh@example.com', summary: 'Needs review.' };

  test('includes summary counts in header', () => {
    const result = buildDigest_([kept, low, med], 'UTC');
    expect(result).toContain('Total: 3  |  Kept unread: 1  |  Cleared: 2');
  });

  test('includes KEPT UNREAD section with email details', () => {
    const result = buildDigest_([kept, low], 'UTC');
    expect(result).toContain('KEPT UNREAD — NEEDS ATTENTION (1)');
    expect(result).toContain('Urgent bill');
    expect(result).toContain('bank@example.com');
    expect(result).toContain('Your bill is due.');
  });

  test('includes CLEARED FROM INBOX section', () => {
    const result = buildDigest_([kept, low], 'UTC');
    expect(result).toContain('CLEARED FROM INBOX (1)');
    expect(result).toContain('Sale today');
  });

  test('groups cleared emails by category', () => {
    const promo = { category: 'promotional', priority: 'low', subject: 'Promo', from: 'a@a.com', summary: 's' };
    const notif = { category: 'notification', priority: 'low', subject: 'Alert', from: 'b@b.com', summary: 's' };
    const result = buildDigest_([promo, notif], 'UTC');
    const notifIdx  = result.indexOf('NOTIFICATION');
    const promoIdx  = result.indexOf('PROMOTIONAL');
    // sorted alphabetically: notification before promotional
    expect(notifIdx).toBeLessThan(promoIdx);
  });

  test('prepends [MEDIUM] tag for medium-priority cleared emails', () => {
    const result = buildDigest_([med], 'UTC');
    expect(result).toContain('[MEDIUM] PR review');
  });

  test('does not prepend tag for low-priority cleared emails', () => {
    const result = buildDigest_([low], 'UTC');
    expect(result).not.toMatch(/\[LOW\]/);
    expect(result).toContain('Sale today');
  });

  test('omits KEPT section when there are none', () => {
    const result = buildDigest_([low], 'UTC');
    expect(result).not.toContain('KEPT UNREAD');
  });

  test('omits CLEARED section when there are none', () => {
    const result = buildDigest_([kept], 'UTC');
    expect(result).not.toContain('CLEARED FROM INBOX');
  });

  test('returns a non-empty string for an empty processed list', () => {
    const result = buildDigest_([], 'UTC');
    expect(typeof result).toBe('string');
    expect(result).toContain('Total: 0');
  });
});


describe('buildHtmlDigest_', () => {
  const kept = { threadId: 'tid1', category: 'important', priority: 'high',   subject: 'Urgent bill', from: 'bank@example.com', summary: 'Your bill is due.' };
  const low  = { threadId: 'tid2', category: 'promotional', priority: 'low',  subject: 'Sale today',  from: 'shop@example.com', summary: 'Big sale.' };
  const med  = { threadId: 'tid3', category: 'notification', priority: 'medium', subject: 'PR review', from: 'gh@example.com', summary: 'Needs review.' };

  test('returns a valid HTML string', () => {
    const result = buildHtmlDigest_([kept, low], 'UTC');
    expect(result).toMatch(/^<!DOCTYPE html>/);
    expect(result).toContain('</html>');
  });

  test('includes stats counts', () => {
    const result = buildHtmlDigest_([kept, low, med], 'UTC');
    expect(result).toContain('<b>3</b> processed');
    expect(result).toContain('<b>1</b> kept unread');
    expect(result).toContain('<b>2</b> cleared');
  });

  test('includes subject in kept section with thread link', () => {
    const result = buildHtmlDigest_([kept], 'UTC');
    expect(result).toContain('Urgent bill');
    expect(result).toContain('https://mail.google.com/mail/u/0/#all/tid1');
  });

  test('includes subject in cleared section with thread link', () => {
    const result = buildHtmlDigest_([low], 'UTC');
    expect(result).toContain('Sale today');
    expect(result).toContain('https://mail.google.com/mail/u/0/#all/tid2');
  });

  test('includes MED badge for medium-priority cleared emails', () => {
    const result = buildHtmlDigest_([med], 'UTC');
    expect(result).toContain('>MED<');
  });

  test('does not include MED badge for low-priority cleared emails', () => {
    const result = buildHtmlDigest_([low], 'UTC');
    expect(result).not.toContain('>MED<');
  });

  test('omits needs-attention section when no kept emails', () => {
    const result = buildHtmlDigest_([low], 'UTC');
    expect(result).not.toContain('Needs attention');
  });

  test('omits cleared section when no cleared emails', () => {
    const result = buildHtmlDigest_([kept], 'UTC');
    expect(result).not.toContain('Cleared from inbox');
  });

  test('escapes HTML special characters in subject', () => {
    const xss = { threadId: 'xss1', category: 'promotional', priority: 'low',
                  subject: '<script>alert("xss")</script>', from: 'x@x.com', summary: 'x' };
    const result = buildHtmlDigest_([xss], 'UTC');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  test('escapes HTML special characters in sender (kept section)', () => {
    const xss = { threadId: 'xss2', category: 'important', priority: 'high',
                  subject: 'Hi', from: 'a&b@c.com', summary: 'x' };
    const result = buildHtmlDigest_([xss], 'UTC');
    expect(result).toContain('a&amp;b@c.com');
  });

  test('works correctly with an empty processed list', () => {
    const result = buildHtmlDigest_([], 'UTC');
    expect(result).toContain('<b>0</b> processed');
    expect(result).not.toContain('Needs attention');
    expect(result).not.toContain('Cleared from inbox');
  });
});
