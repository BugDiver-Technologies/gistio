'use strict';

// ---------------------------------------------------------------------------
// formatEmailsForPrompt_
// ---------------------------------------------------------------------------
describe('formatEmailsForPrompt_', () => {
  const email = { threadId: 'tid1', from: 'a@b.com', subject: 'Hello', date: '2026-01-01', snippet: 'Hi there' };

  test('includes all fields for a single email', () => {
    const result = formatEmailsForPrompt_([email]);
    expect(result).toContain('Thread ID: tid1');
    expect(result).toContain('From: a@b.com');
    expect(result).toContain('Subject: Hello');
    expect(result).toContain('Date: 2026-01-01');
    expect(result).toContain('Preview: Hi there');
  });

  test('separates multiple emails with ---', () => {
    const email2 = { threadId: 'tid2', from: 'x@y.com', subject: 'Bye', date: '2026-01-02', snippet: 'Bye' };
    const result = formatEmailsForPrompt_([email, email2]);
    expect(result).toContain('---');
    expect(result).toContain('tid1');
    expect(result).toContain('tid2');
  });
});


// ---------------------------------------------------------------------------
// selectBestModel_
// ---------------------------------------------------------------------------
describe('selectBestModel_', () => {
  function model(name, methods) {
    return { name: 'models/' + name, supportedGenerationMethods: methods || ['generateContent'] };
  }

  test('picks lite over regular flash', () => {
    const models = [model('gemini-2.0-flash'), model('gemini-2.0-flash-lite')];
    expect(selectBestModel_(models)).toBe('gemini-2.0-flash-lite');
  });

  test('picks highest version', () => {
    const models = [model('gemini-1.5-flash-lite'), model('gemini-2.0-flash-lite')];
    expect(selectBestModel_(models)).toBe('gemini-2.0-flash-lite');
  });

  test('excludes experimental models', () => {
    const models = [model('gemini-2.0-flash-exp'), model('gemini-1.5-flash')];
    expect(selectBestModel_(models)).toBe('gemini-1.5-flash');
  });

  test('excludes thinking models', () => {
    const models = [model('gemini-2.0-flash-thinking'), model('gemini-1.5-flash')];
    expect(selectBestModel_(models)).toBe('gemini-1.5-flash');
  });

  test('excludes preview models', () => {
    const models = [model('gemini-2.0-flash-preview'), model('gemini-1.5-flash')];
    expect(selectBestModel_(models)).toBe('gemini-1.5-flash');
  });

  test('excludes models without generateContent', () => {
    const models = [model('gemini-2.0-flash', ['embedContent']), model('gemini-1.5-flash')];
    expect(selectBestModel_(models)).toBe('gemini-1.5-flash');
  });

  test('throws when no suitable model found', () => {
    expect(() => selectBestModel_([])).toThrow('No suitable Gemini flash model found.');
    expect(() => selectBestModel_([model('gemini-2.0-flash-exp')])).toThrow();
  });

  test('strips models/ prefix from returned name', () => {
    const models = [model('gemini-2.0-flash')];
    expect(selectBestModel_(models)).toBe('gemini-2.0-flash');
    expect(selectBestModel_(models)).not.toContain('models/');
  });
});


// ---------------------------------------------------------------------------
// parseBatchResponse_
// ---------------------------------------------------------------------------
describe('parseBatchResponse_', () => {
  const batch = [
    { threadId: 't1', subject: 'Subj1', from: 'a@a.com' },
    { threadId: 't2', subject: 'Subj2', from: 'b@b.com' },
  ];

  test('parses valid JSON response and returns results', () => {
    const response = JSON.stringify([
      { threadId: 't1', category: 'important', priority: 'high',   summary: 'Urgent' },
      { threadId: 't2', category: 'promotional', priority: 'low',  summary: 'Sale'   },
    ]);
    const results = parseBatchResponse_(response, batch);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ threadId: 't1', category: 'important', priority: 'high',  summary: 'Urgent' });
    expect(results[1]).toMatchObject({ threadId: 't2', category: 'promotional', priority: 'low', summary: 'Sale'   });
  });

  test('parses JSON embedded in surrounding text (as Gemini often returns)', () => {
    const response = 'Here are the results:\n[\n{"threadId":"t1","category":"other","priority":"low","summary":"x"}\n]\nDone.';
    const results  = parseBatchResponse_(response, [batch[0]]);
    expect(results[0].category).toBe('other');
  });

  test('defaults to other/low when response has no JSON array', () => {
    const results = parseBatchResponse_('I cannot process this.', batch);
    expect(results).toHaveLength(2);
    results.forEach(r => {
      expect(r.category).toBe('other');
      expect(r.priority).toBe('low');
    });
  });

  test('defaults missing threadId results to other/low', () => {
    const response = JSON.stringify([
      { threadId: 't1', category: 'important', priority: 'high', summary: 'ok' },
      // t2 missing
    ]);
    const results = parseBatchResponse_(response, batch);
    expect(results[1].category).toBe('other');
    expect(results[1].priority).toBe('low');
    expect(results[1].subject).toBe('Subj2');
  });

  test('defaults to other/low when JSON is malformed', () => {
    const results = parseBatchResponse_('[{bad json}]', batch);
    results.forEach(r => expect(r.category).toBe('other'));
  });

  test('preserves threadId, subject, from on all results', () => {
    const results = parseBatchResponse_('no json here', batch);
    expect(results[0].threadId).toBe('t1');
    expect(results[0].subject).toBe('Subj1');
    expect(results[0].from).toBe('a@a.com');
  });
});
