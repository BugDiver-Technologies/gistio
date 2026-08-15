/**
 * Add-on entry points and action callbacks.
 *
 * All callbacks receive a GAS event object (e). Timezone is captured
 * automatically from e.commonEventObject.timeZone on every interaction
 * so the dashboard always displays the user's local time.
 */

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function onInstall(e) {
  return onHomepage(e);
}

function onHomepage(e) {
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);

  var saved = props.getProperties();

  // Sync DIGEST_RUNNING with actual trigger state to recover from stale flags
  var hasRunTrigger = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'runDigestOnce_';
  });
  if (hasRunTrigger && saved['DIGEST_RUNNING'] !== 'true') {
    props.setProperty('DIGEST_RUNNING', 'true');
    saved = props.getProperties();
  } else if (!hasRunTrigger && saved['DIGEST_RUNNING'] === 'true') {
    props.deleteProperty('DIGEST_RUNNING');
    saved = props.getProperties();
  }

  return saved['GEMINI_API_KEY']
    ? buildDashboardCard_(saved)
    : buildSettingsCard_(configFromSaved_(saved));
}


// ---------------------------------------------------------------------------
// Settings callbacks
// ---------------------------------------------------------------------------

function openSettings_(e) {
  var saved = PropertiesService.getUserProperties().getProperties();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSettingsCard_(configFromSaved_(saved))))
    .build();
}

function onFrequencyChange_(e) {
  var saved   = PropertiesService.getUserProperties().getProperties();
  var config  = configFromForm_(e, saved);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard_(config)))
    .build();
}

function saveSettings_(e) {
  var fi    = e.formInput;
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);
  var saved = props.getProperties();

  var key = fi['gemini_api_key'];
  if (key && key.trim() !== '') {
    props.setProperty('GEMINI_API_KEY', key.trim());
  } else if (!saved['GEMINI_API_KEY']) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Gemini API key is required.'))
      .build();
  }

  var freq   = fi['freq']      || DEFAULT_FREQ;
  var hour   = fi['hour']      || DEFAULT_HOUR;
  var day    = fi['month_day'] || DEFAULT_DAY;
  var label  = (fi['label'] || '').trim() || DEFAULT_LABEL;
  var action = fi['action']    || DEFAULT_ACTION;

  props.setProperty('DIGEST_FREQ',   freq);
  props.setProperty('DIGEST_HOUR',   hour);
  props.setProperty('MONTH_DAY',     day);
  props.setProperty('DIGEST_LABEL',  label);
  props.setProperty('DIGEST_ACTION', action);

  setupUserTrigger_(freq, parseInt(hour, 10), parseInt(day, 10));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().pushCard(buildDashboardCard_(props.getProperties())))
    .setNotification(CardService.newNotification().setText('Settings saved.'))
    .build();
}


// ---------------------------------------------------------------------------
// Dashboard actions
// ---------------------------------------------------------------------------

function runNow_(e) {
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);

  var alreadyQueued = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'runDigestOnce_';
  });
  if (alreadyQueued) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('A run is already in progress.'))
      .build();
  }

  props.setProperty('DIGEST_RUNNING', 'true');
  ScriptApp.newTrigger('runDigestOnce_').timeBased().at(new Date(Date.now() + 30 * 1000)).create();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildDashboardCard_(props.getProperties())))
    .build();
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Saves the user's timezone from the GAS event object into UserProperties.
 * Called on every interaction so TZ_ID/TZ_OFFSET stay current.
 * @param {Object} e      GAS event object
 * @param {Object} props  UserProperties instance
 */
function captureTimezone_(e, props) {
  if (e && e.commonEventObject && e.commonEventObject.timeZone) {
    props.setProperty('TZ_ID',     e.commonEventObject.timeZone.id);
    props.setProperty('TZ_OFFSET', String(e.commonEventObject.timeZone.offset));
  }
}
