'use strict';

describe('configFromSaved_', () => {
  test('uses defaults when nothing is saved', () => {
    const config = configFromSaved_({});
    expect(config.hasKey).toBe(false);
    expect(config.freq).toBe('daily');
    expect(config.hour).toBe('19');
    expect(config.day).toBe('1');
    expect(config.label).toBe('gistio/processed');
  });

  test('reads saved values', () => {
    const saved = {
      GEMINI_API_KEY: 'key123',
      DIGEST_FREQ:    'hourly',
      DIGEST_HOUR:    '8',
      MONTH_DAY:      '15',
      DIGEST_LABEL:   'my/label',
    };
    const config = configFromSaved_(saved);
    expect(config.hasKey).toBe(true);
    expect(config.freq).toBe('hourly');
    expect(config.hour).toBe('8');
    expect(config.day).toBe('15');
    expect(config.label).toBe('my/label');
  });

  test('hasKey is false when API key is empty string', () => {
    expect(configFromSaved_({ GEMINI_API_KEY: '' }).hasKey).toBe(false);
  });
});


describe('configFromForm_', () => {
  const saved = {
    GEMINI_API_KEY: 'key',
    DIGEST_FREQ:    'daily',
    DIGEST_HOUR:    '19',
    MONTH_DAY:      '1',
    DIGEST_LABEL:   'gistio/processed',
  };

  test('form values take precedence over saved', () => {
    const e = { formInput: { freq: 'monthly', hour: '9', month_day: '10', label: 'custom/label' } };
    const config = configFromForm_(e, saved);
    expect(config.freq).toBe('monthly');
    expect(config.hour).toBe('9');
    expect(config.day).toBe('10');
    expect(config.label).toBe('custom/label');
  });

  test('falls back to saved values when form fields are empty', () => {
    const e = { formInput: {} };
    const config = configFromForm_(e, saved);
    expect(config.freq).toBe('daily');
    expect(config.hour).toBe('19');
  });

  test('falls back to defaults when both form and saved are empty', () => {
    const e = { formInput: {} };
    const config = configFromForm_(e, {});
    expect(config.freq).toBe('daily');
    expect(config.hour).toBe('19');
    expect(config.day).toBe('1');
    expect(config.label).toBe('gistio/processed');
  });

  test('whitespace-only label falls back to saved value, not the hardcoded default', () => {
    const e = { formInput: { label: '   ' } };
    const config = configFromForm_(e, saved);
    expect(config.label).toBe('gistio/processed');
  });
});


describe('resolveApiKey_', () => {
  test('trims and uses a newly submitted key', () => {
    expect(resolveApiKey_('  new-key  ', 'old-key')).toEqual({ value: 'new-key', missing: false });
  });

  test('keeps the existing key when the form field is left blank', () => {
    expect(resolveApiKey_('', 'old-key')).toEqual({ value: null, missing: false });
  });

  test('reports missing when there is no new key and nothing saved', () => {
    expect(resolveApiKey_('', undefined)).toEqual({ value: null, missing: true });
  });

  test('a whitespace-only submission is treated the same as blank', () => {
    expect(resolveApiKey_('   ', undefined)).toEqual({ value: null, missing: true });
  });
});
