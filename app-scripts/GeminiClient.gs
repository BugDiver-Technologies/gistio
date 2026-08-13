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
function getModel_() {
  var userProps = PropertiesService.getUserProperties();
  var override = userProps.getProperty('GEMINI_MODEL');
  if (override) return override;

  var apiKey = userProps.getProperty('GEMINI_API_KEY');
  var response = UrlFetchApp.fetch(GEMINI_API_BASE + '?key=' + apiKey, { muteHttpExceptions: true });
  var models = JSON.parse(response.getContentText()).models || [];

  var EXCLUDE_PATTERNS = ['omni', 'exp', 'thinking', 'preview'];

  function isStableFlash(name) {
    if (name.indexOf('gemini') === -1 || name.indexOf('flash') === -1) return false;
    return !EXCLUDE_PATTERNS.some(function (p) { return name.indexOf(p) !== -1; });
  }

  function getVersion(name) {
    var m = name.match(/gemini-(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function sortByVersion(a, b) { return getVersion(b) - getVersion(a); }

  var allModels = models
    .filter(function (m) {
      return m.supportedGenerationMethods &&
             m.supportedGenerationMethods.indexOf('generateContent') !== -1 &&
             isStableFlash(m.name);
    })
    .map(function (m) { return m.name.replace('models/', ''); });

  // Prefer lite models (higher RPD quota), fall back to regular flash
  var lite = allModels.filter(function (n) { return n.indexOf('lite') !== -1; }).sort(sortByVersion);
  var candidates = lite.length > 0 ? lite : allModels.sort(sortByVersion);

  if (candidates.length === 0) throw new Error('No suitable Gemini flash model found.');
  Logger.log('Auto-selected Gemini model: ' + candidates[0]);
  return candidates[0];
}


/**
 * Sends a prompt to the Gemini API and returns the response text.
 * @param {string} prompt
 * @returns {string}
 */
function callGemini_(prompt) {
  var apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set. Open the Gmail Triage add-on panel to configure.');

  var model = getModel_();
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
function formatEmailsForPrompt_(emails) {
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
function analyzeEmails_(emails, batchSize) {
  batchSize = batchSize || 20;
  var results = [];

  for (var i = 0; i < emails.length; i += batchSize) {
    var batch = emails.slice(i, i + batchSize);
    Logger.log('Analyzing emails ' + (i + 1) + '–' + (i + batch.length) + ' with ' + getModel_() + '...');

    var prompt = PROMPT_TEMPLATE.replace('{emails}', formatEmailsForPrompt_(batch));
    var response = callGemini_(prompt);

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
  var apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set. Open the Gmail Triage add-on panel to configure.');

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
