'use strict';

describe('parseVipSenders_', () => {
  test('returns empty array for blank input', () => {
    expect(parseVipSenders_('')).toEqual([]);
    expect(parseVipSenders_(null)).toEqual([]);
    expect(parseVipSenders_(undefined)).toEqual([]);
  });

  test('splits on newlines, trims, and lowercases', () => {
    const raw = 'Boss@Company.com\n  Company.org  \n';
    expect(parseVipSenders_(raw)).toEqual(['boss@company.com', 'company.org']);
  });

  test('also splits on commas', () => {
    expect(parseVipSenders_('a@x.com, b@y.com,c@z.com')).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });

  test('drops blank lines and duplicates', () => {
    expect(parseVipSenders_('a@x.com\n\na@x.com\n  \n')).toEqual(['a@x.com']);
  });
});

describe('extractEmailAddress_', () => {
  test('extracts email from "Name <email>" format', () => {
    expect(extractEmailAddress_('Jane Doe <jane@company.com>')).toBe('jane@company.com');
  });

  test('returns bare email unchanged (lowercased)', () => {
    expect(extractEmailAddress_('Jane@Company.com')).toBe('jane@company.com');
  });

  test('returns empty string for falsy input', () => {
    expect(extractEmailAddress_('')).toBe('');
    expect(extractEmailAddress_(undefined)).toBe('');
  });
});

describe('senderMatchesVip_', () => {
  const vipList = ['boss@company.com', 'importantclient.com'];

  test('matches an exact VIP email', () => {
    expect(senderMatchesVip_('Boss <boss@company.com>', vipList)).toBe(true);
  });

  test('matches any sender on a VIP domain', () => {
    expect(senderMatchesVip_('Someone <alerts@importantclient.com>', vipList)).toBe(true);
  });

  test('does not match an unrelated sender', () => {
    expect(senderMatchesVip_('Newsletter <news@random.com>', vipList)).toBe(false);
  });

  test('does not match a similar but different email at the VIP domain-holder', () => {
    expect(senderMatchesVip_('Other <notboss@company.com>', vipList)).toBe(false);
  });

  test('returns false when the VIP list is empty', () => {
    expect(senderMatchesVip_('Boss <boss@company.com>', [])).toBe(false);
  });
});

describe('applyVipOverrides_', () => {
  const vipList = ['boss@company.com'];

  test('forces matching emails to important/high and flags vip', () => {
    const processed = [
      { threadId: '1', from: 'Boss <boss@company.com>', category: 'other', priority: 'low' },
      { threadId: '2', from: 'News <news@random.com>',  category: 'other', priority: 'low' },
    ];
    const result = applyVipOverrides_(processed, vipList);
    expect(result[0]).toMatchObject({ category: 'important', priority: 'high', vip: true });
    expect(result[1]).toEqual(processed[1]);
  });

  test('returns the original array unchanged when the VIP list is empty', () => {
    const processed = [{ threadId: '1', from: 'a@x.com', category: 'other', priority: 'low' }];
    expect(applyVipOverrides_(processed, [])).toBe(processed);
  });
});
