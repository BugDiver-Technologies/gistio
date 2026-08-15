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
  '{emails}',
].join('\n');


// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------

/**
 * Formats a batch of email objects into the text block sent to Gemini.
 * @param {Array<Object>} emails
 * @returns {string}
 */
function formatEmailsForPrompt_(emails) {
  return emails.map(function(e) {
    return [
      'Thread ID: ' + e.threadId,
      'From: '      + e.from,
      'Subject: '   + e.subject,
      'Date: '      + e.date,
      'Preview: '   + e.snippet,
    ].join('\n');
  }).join('\n\n---\n\n');
}

/**
 * Picks the best Gemini flash model from a raw /models API response.
 * Prefers stable lite models (higher RPD quota); falls back to regular flash.
 * Excludes experimental, thinking, omni, and preview variants.
 * @param {Array<Object>} models  Raw model objects from the Gemini /models endpoint.
 * @returns {string}  Model name without the 'models/' prefix.
 */
function selectBestModel_(models) {
  var EXCLUDE = ['omni', 'exp', 'thinking', 'preview'];

  function isStableFlash(name) {
    return name.indexOf('gemini') !== -1 &&
           name.indexOf('flash')  !== -1 &&
           !EXCLUDE.some(function(p) { return name.indexOf(p) !== -1; });
  }

  function getVersion(name) {
    var m = name.match(/gemini-(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  var candidates = models
    .filter(function(m) {
      return m.supportedGenerationMethods &&
             m.supportedGenerationMethods.indexOf('generateContent') !== -1 &&
             isStableFlash(m.name);
    })
    .map(function(m) { return m.name.replace('models/', ''); })
    .sort(function(a, b) { return getVersion(b) - getVersion(a); });

  var lite   = candidates.filter(function(n) { return n.indexOf('lite') !== -1; });
  var result = lite.length > 0 ? lite : candidates;

  if (result.length === 0) throw new Error('No suitable Gemini flash model found.');
  return result[0];
}

/**
 * Parses a Gemini JSON response for one batch and merges with the original emails.
 * Returns a safe default ('other', 'low') for any email that cannot be parsed.
 * @param {string}        responseText  Raw text from the Gemini API.
 * @param {Array<Object>} batch         Email objects sent in this batch.
 * @returns {Array<Object>}
 */
function parseBatchResponse_(responseText, batch) {
  var fallback = batch.map(function(e) {
    return { threadId: e.threadId, subject: e.subject, from: e.from, category: 'other', priority: 'low', summary: e.subject };
  });

  var jsonMatch = responseText.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    Logger.log('WARN: Could not parse Gemini response for batch, defaulting to "other"');
    return fallback;
  }

  try {
    var map = {};
    JSON.parse(jsonMatch[0]).forEach(function(r) { map[r.threadId] = r; });

    return batch.map(function(e) {
      var r = map[e.threadId] || {};
      return {
        threadId: e.threadId,
        subject:  e.subject,
        from:     e.from,
        category: r.category || 'other',
        priority: r.priority || 'low',
        summary:  r.summary  || e.subject,
      };
    });
  } catch (err) {
    Logger.log('WARN: JSON parse error: ' + err + ', defaulting batch to "other"');
    return fallback;
  }
}


// ---------------------------------------------------------------------------
// GAS API calls
// ---------------------------------------------------------------------------

/**
 * Returns the model to use. Checks GEMINI_MODEL user property first.
 * If not set, fetches available models from the API and auto-selects.
 */
function getModel_() {
  var userProps = PropertiesService.getUserProperties();
  var override  = userProps.getProperty('GEMINI_MODEL');
  if (override) return override;

  var apiKey   = userProps.getProperty('GEMINI_API_KEY');
  var response = UrlFetchApp.fetch(GEMINI_API_BASE + '?key=' + apiKey, { muteHttpExceptions: true });
  var models   = JSON.parse(response.getContentText()).models || [];
  var model    = selectBestModel_(models);
  Logger.log('Auto-selected Gemini model: ' + model);
  return model;
}

/**
 * Sends a prompt to the Gemini API and returns the response text.
 */
function callGemini_(prompt, model) {
  var apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set. Open the Gmail Triage add-on panel to configure.');

  model = model || getModel_();
  var url = GEMINI_API_BASE + '/' + model + ':generateContent?key=' + apiKey;

  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Gemini API error ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  return JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
}

/**
 * Sends emails to Gemini in batches and returns categorized results.
 */
function analyzeEmails_(emails, batchSize) {
  batchSize = batchSize || 20;
  var results = [];
  var model   = getModel_();

  for (var i = 0; i < emails.length; i += batchSize) {
    var batch  = emails.slice(i, i + batchSize);
    Logger.log('Analyzing emails ' + (i + 1) + '–' + (i + batch.length) + ' with ' + model + '...');
    var prompt = PROMPT_TEMPLATE.replace('{emails}', formatEmailsForPrompt_(batch));
    results    = results.concat(parseBatchResponse_(callGemini_(prompt, model), batch));
  }

  return results;
}

/**
 * Logs all available Gemini models. Run manually to explore options.
 */
function listGeminiModels() {
  var apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set. Open the Gmail Triage add-on panel to configure.');

  var response = UrlFetchApp.fetch(GEMINI_API_BASE + '?key=' + apiKey, { muteHttpExceptions: true });
  var models   = JSON.parse(response.getContentText()).models || [];

  Logger.log('Available Gemini models:');
  models.forEach(function(m) { Logger.log('  ' + m.name + ' — ' + (m.description || '')); });
}
