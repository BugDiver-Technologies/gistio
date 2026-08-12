var GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

var PROMPT_TEMPLATE = [
  'You are an email triage assistant. Analyze the following emails and classify each one.',
  '',
  'Categories (pick exactly one per email):',
  '- important    : personal messages or anything that requires the user to take action',
  '- transactional: payment confirmations, EMI paid, bill paid, receipts — already done',
  '- promotional  : marketing, deals, discount offers, sales',
  '- newsletter   : subscribed digest / newsletter content',
  '- announcement : product updates, company/org announcements',
  '- notification : automated alerts (OTP, app pings, social media, GitHub, CI)',
  '- other        : anything that does not fit above',
  '',
  'Priority rules — be strict:',
  '- "high"   : user MUST act soon (unpaid bill due, urgent personal email, legal notice, deadline)',
  '- "medium" : user should probably read this (personal email, package out for delivery)',
  '- "low"    : no action needed — already done or purely informational',
  '             (EMI paid, CC payment done, OTP, transaction receipt, shipping delivered)',
  '',
  'Key distinction: a PAID/COMPLETED transaction is always low priority.',
  'Only mark financial emails high/medium if an amount is still DUE or action is required.',
  '',
  'For each email return a JSON object with:',
  '  "threadId"  : the thread ID exactly as given',
  '  "category"  : one of the categories above',
  '  "priority"  : "high", "medium", or "low"',
  '  "summary"   : one concise sentence describing the email',
  '',
  'Return ONLY a valid JSON array — no markdown, no explanation.',
  '',
  'Emails to analyze:',
  '{emails}'
].join('\n');


/**
 * Returns the model to use. Checks GEMINI_MODEL Script Property first.
 * If not set, fetches available models from the API and picks the best flash model.
 */
function getModel() {
  var override = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL');
  if (override) return override;

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var response = UrlFetchApp.fetch(GEMINI_API_BASE + '?key=' + apiKey, { muteHttpExceptions: true });
  var models = JSON.parse(response.getContentText()).models || [];

  var candidates = models
    .filter(function (m) {
      return m.supportedGenerationMethods &&
             m.supportedGenerationMethods.indexOf('generateContent') !== -1 &&
             m.name.indexOf('flash') !== -1 &&
             m.name.indexOf('gemini') !== -1;
    })
    .map(function (m) { return m.name.replace('models/', ''); });

  if (candidates.length === 0) throw new Error('No suitable Gemini flash model found.');

  // Prefer newer versions: sort descending so e.g. gemini-2.0-flash > gemini-1.5-flash
  candidates.sort().reverse();
  Logger.log('Auto-selected Gemini model: ' + candidates[0]);
  return candidates[0];
}


/**
 * Sends a prompt to the Gemini API and returns the response text.
 * @param {string} prompt
 * @returns {string}
 */
function callGemini(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Script Properties.');

  var model = getModel();
  var url = GEMINI_API_BASE + '/' + model + ':generateContent?key=' + apiKey;

  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 },
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Gemini API error ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  return data.candidates[0].content.parts[0].text;
}


/**
 * Formats a batch of emails into the prompt.
 * @param {Array<Object>} emails
 * @returns {string}
 */
function formatEmailsForPrompt(emails) {
  return emails.map(function (e) {
    return [
      'Thread ID: ' + e.threadId,
      'From: ' + e.from,
      'Subject: ' + e.subject,
      'Date: ' + e.date,
      'Preview: ' + e.snippet,
    ].join('\n');
  }).join('\n\n---\n\n');
}


/**
 * Sends emails to Gemini in batches and returns categorized results.
 * @param {Array<Object>} emails
 * @param {number} batchSize
 * @returns {Array<Object>}
 */
function analyzeEmails(emails, batchSize) {
  batchSize = batchSize || 20;
  var results = [];

  for (var i = 0; i < emails.length; i += batchSize) {
    var batch = emails.slice(i, i + batchSize);
    Logger.log('Analyzing emails ' + (i + 1) + '–' + (i + batch.length) + ' with ' + getModel() + '...');

    var prompt = PROMPT_TEMPLATE.replace('{emails}', formatEmailsForPrompt(batch));
    var response = callGemini(prompt);

    // Extract JSON array from response
    var jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      Logger.log('WARN: Could not parse Gemini response for batch ' + i + ', defaulting to "other"');
      batch.forEach(function (e) {
        results.push({ threadId: e.threadId, category: 'other', priority: 'low', summary: e.subject });
      });
      continue;
    }

    try {
      var parsed = JSON.parse(jsonMatch[0]);
      var map = {};
      parsed.forEach(function (r) { map[r.threadId] = r; });

      batch.forEach(function (e) {
        var r = map[e.threadId] || {};
        results.push({
          threadId: e.threadId,
          subject: e.subject,
          from: e.from,
          category: r.category || 'other',
          priority: r.priority || 'low',
          summary: r.summary || e.subject,
        });
      });
    } catch (err) {
      Logger.log('WARN: JSON parse error: ' + err + ', defaulting batch to "other"');
      batch.forEach(function (e) {
        results.push({ threadId: e.threadId, subject: e.subject, from: e.from, category: 'other', priority: 'low', summary: e.subject });
      });
    }
  }

  return results;
}


/**
 * Logs all available Gemini models to the Apps Script console.
 * Run this manually to explore options.
 */
function listGeminiModels() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Script Properties.');

  var response = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey,
    { muteHttpExceptions: true }
  );
  var data = JSON.parse(response.getContentText());
  var models = data.models || [];

  Logger.log('Available Gemini models:');
  models.forEach(function (m) {
    Logger.log('  ' + m.name + ' — ' + (m.description || ''));
  });
}
