/**
 * Settings card for the Gmail Triage add-on.
 *
 * Shown on the add-on homepage and after install. Lets the user enter
 * their Gemini API key and pick a daily digest time. Settings are stored
 * in UserProperties so each installer has their own config.
 */

var DIGEST_HOURS = [
  { label: '5:30 PM IST (12:00 UTC)', value: '12' },
  { label: '6:30 PM IST (13:00 UTC)', value: '13' },
  { label: '7:30 PM IST (14:00 UTC)', value: '14' },
  { label: '8:30 PM IST (15:00 UTC)', value: '15' },
  { label: '9:30 PM IST (16:00 UTC)', value: '16' },
];

var DEFAULT_HOUR = '14'; // 7:30 PM IST


/**
 * Called automatically when the user installs the add-on.
 */
function onInstall(e) {
  onHomepage(e);
}


/**
 * Entry point for the add-on homepage card.
 */
function onHomepage(e) {
  var props = PropertiesService.getUserProperties().getProperties();
  return buildSettingsCard_(props);
}


function buildSettingsCard_(props) {
  var hasKey = !!props['GEMINI_API_KEY'];
  var savedHour = props['DIGEST_HOUR'] || DEFAULT_HOUR;

  var card = CardService.newCardBuilder()
    .setName('settings')
    .setHeader(CardService.newCardHeader().setTitle('Gmail Triage').setSubtitle('Daily email digest powered by Gemini'));

  // Status banner
  var statusText = hasKey
    ? 'Active — digest scheduled. Open this panel to change settings.'
    : 'Not configured — enter your Gemini API key to get started.';
  card.addSection(
    CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(statusText))
  );

  // Settings form
  var section = CardService.newCardSection().setHeader('Settings');

  section.addWidget(
    CardService.newTextInput()
      .setFieldName('gemini_api_key')
      .setTitle('Gemini API Key')
      .setHint(hasKey ? 'Key saved — enter a new value to update' : 'Required — get yours at aistudio.google.com')
      .setValue('')
  );

  var hourSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('digest_hour')
    .setTitle('Run daily at');

  DIGEST_HOURS.forEach(function(h) {
    hourSelect.addItem(h.label, h.value, h.value === savedHour);
  });
  section.addWidget(hourSelect);

  section.addWidget(
    CardService.newTextButton()
      .setText(hasKey ? 'Update Settings' : 'Save & Activate')
      .setOnClickAction(CardService.newAction().setFunctionName('saveSettings_'))
  );

  card.addSection(section);
  return card.build();
}


function saveSettings_(e) {
  var key = e.formInput['gemini_api_key'];
  var hour = e.formInput['digest_hour'];
  var props = PropertiesService.getUserProperties();
  var existing = props.getProperties();

  if (key && key.trim() !== '') {
    props.setProperty('GEMINI_API_KEY', key.trim());
  } else if (!existing['GEMINI_API_KEY']) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Gemini API key is required.'))
      .build();
  }

  props.setProperty('DIGEST_HOUR', hour);
  setupUserTrigger_(parseInt(hour, 10));

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Settings saved. Digest scheduled.'))
    .setStateChanged(true)
    .build();
}


/**
 * Creates (or replaces) the user's daily eveningDigest trigger.
 * Trigger ID is stored in UserProperties to allow clean replacement.
 */
function setupUserTrigger_(hour) {
  var props = PropertiesService.getUserProperties();
  var existingId = props.getProperty('TRIGGER_ID');

  // Delete the previous trigger if we have its ID
  if (existingId) {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getUniqueId() === existingId) {
        ScriptApp.deleteTrigger(t);
      }
    });
  }

  var trigger = ScriptApp.newTrigger('eveningDigest')
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  props.setProperty('TRIGGER_ID', trigger.getUniqueId());
  Logger.log('Trigger set: eveningDigest at hour ' + hour + ' UTC (trigger ID: ' + trigger.getUniqueId() + ')');
}
