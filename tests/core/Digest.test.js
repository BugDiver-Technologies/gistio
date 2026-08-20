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

  test('appends [VIP] tag for VIP-overridden kept emails', () => {
    const vip = { ...kept, vip: true };
    const result = buildDigest_([vip], 'UTC');
    expect(result).toContain('Urgent bill  [VIP]');
  });

  test('does not append [VIP] tag for non-VIP kept emails', () => {
    const result = buildDigest_([kept], 'UTC');
    expect(result).not.toContain('[VIP]');
  });
});


describe('buildHtmlDigest_', () => {
  const kept = { threadId: 'tid1', category: 'important', priority: 'high',   subject: 'Urgent bill', from: 'bank@example.com', summary: 'Your bill is due.' };
  const low  = { threadId: 'tid2', category: 'promotional', priority: 'low',  subject: 'Sale today',  from: 'shop@example.com', summary: 'Big sale.' };
  const med  = { threadId: 'tid3', category: 'notification', priority: 'medium', subject: 'PR review', from: 'gh@example.com', summary: 'Needs review.' };

  test('returns a non-empty HTML string', () => {
    const result = buildHtmlDigest_([kept, low]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes stat counts in header', () => {
    const result = buildHtmlDigest_([kept, low, med]);
    expect(result).toContain('>3<');   // reviewed
    expect(result).toContain('>REVIEWED<');
    expect(result).toContain('>1<');   // attention
    expect(result).toContain('>NEEDS ATTENTION<');
    expect(result).toContain('>2<');   // cleared
    expect(result).toContain('>CLEARED<');
  });

  test('includes subject in kept section with thread link', () => {
    const result = buildHtmlDigest_([kept]);
    expect(result).toContain('Urgent bill');
    expect(result).toContain('https://mail.google.com/mail/u/0/#all/tid1');
  });

  test('includes subject in cleared section with thread link', () => {
    const result = buildHtmlDigest_([low]);
    expect(result).toContain('Sale today');
    expect(result).toContain('https://mail.google.com/mail/u/0/#all/tid2');
  });

  test('includes medium priority tag for medium-priority cleared emails', () => {
    const result = buildHtmlDigest_([med]);
    expect(result).toContain('· med');
  });

  test('does not include medium tag for low-priority cleared emails', () => {
    const result = buildHtmlDigest_([low]);
    expect(result).not.toContain('· med');
  });

  test('omits needs-attention section when no kept emails', () => {
    const result = buildHtmlDigest_([low]);
    expect(result).not.toContain('Needs attention');
  });

  test('omits cleared section when no cleared emails', () => {
    const result = buildHtmlDigest_([kept]);
    expect(result).not.toContain('>Cleared<');
  });

  test('escapes HTML special characters in subject', () => {
    const xss = { threadId: 'xss1', category: 'promotional', priority: 'low',
                  subject: '<script>alert("xss")</script>', from: 'x@x.com', summary: 'x' };
    const result = buildHtmlDigest_([xss]);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  test('escapes HTML special characters in sender (kept section)', () => {
    const xss = { threadId: 'xss2', category: 'important', priority: 'high',
                  subject: 'Hi', from: 'a&b@c.com', summary: 'x' };
    const result = buildHtmlDigest_([xss]);
    expect(result).toContain('a&amp;b@c.com');
  });

  test('works correctly with an empty processed list', () => {
    const result = buildHtmlDigest_([]);
    expect(typeof result).toBe('string');
    expect(result).toContain('>0<');
    expect(result).not.toContain('Needs attention');
  });

  test('tags a VIP-overridden kept email with VIP instead of its category', () => {
    const vip = { ...kept, vip: true };
    const result = buildHtmlDigest_([vip]);
    expect(result).toContain('>VIP<');
  });

  test('tags a normal kept email with its category, not VIP', () => {
    const result = buildHtmlDigest_([kept]);
    expect(result).not.toContain('>VIP<');
    expect(result).toContain('>important<');
  });
});
