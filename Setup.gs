/**
 * Run setupTrigger() once manually from the Apps Script editor to schedule
 * the evening digest at 7:30 PM IST every day.
 *
 * Run setGeminiApiKey() once to store your API key securely in Script Properties.
 */


/**
 * Creates a daily time-based trigger for eveningDigest at 7:30 PM IST.
 * Safe to run multiple times — removes any existing digest triggers first.
 */
function setupTrigger() {
  // Remove existing triggers for eveningDigest to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'eveningDigest') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Apps Script time triggers use the project timezone.
  // Make sure your project timezone is set to Asia/Kolkata (IST) in:
  //   File → Project Settings → Time zone
  ScriptApp.newTrigger('eveningDigest')
    .timeBased()
    .everyDays(1)
    .atHour(19)          // 7 PM — Apps Script triggers within an hour window,
    .nearMinute(30)      // so this fires between 19:00 and 20:00 IST
    .create();

  Logger.log('Trigger created: eveningDigest runs daily around 7:30 PM IST.');
  Logger.log('NOTE: Set project timezone to Asia/Kolkata in File → Project Settings.');
}


/**
 * Stores your Gemini API key securely in Script Properties.
 * Replace the placeholder before running.
 */
function setGeminiApiKey() {
  var key = 'PASTE_YOUR_GEMINI_API_KEY_HERE';
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  Logger.log('GEMINI_API_KEY saved to Script Properties.');
}


/**
 * Optionally pin a specific Gemini model (default: gemini-1.5-flash).
 * Run listGeminiModels() in GeminiClient.gs to see options.
 */
function setGeminiModel() {
  var model = 'gemini-1.5-flash'; // e.g. 'gemini-1.5-pro'
  PropertiesService.getScriptProperties().setProperty('GEMINI_MODEL', model);
  Logger.log('GEMINI_MODEL set to ' + model);
}


/**
 * Prints current Script Properties (for debugging, does not log the key value).
 */
function checkConfig() {
  var props = PropertiesService.getScriptProperties().getProperties();
  Logger.log('GEMINI_API_KEY set: ' + (!!props['GEMINI_API_KEY']));
  Logger.log('GEMINI_MODEL: ' + (props['GEMINI_MODEL'] || 'not set (default: gemini-1.5-flash)'));

  var triggers = ScriptApp.getProjectTriggers();
  Logger.log('Active triggers: ' + triggers.length);
  triggers.forEach(function (t) {
    Logger.log('  → ' + t.getHandlerFunction() + ' (' + t.getEventType() + ')');
  });
}
