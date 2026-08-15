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
