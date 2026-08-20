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

  // Purge excess eveningDigest triggers (keep at most 1)
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === 'eveningDigest'; })
    .slice(1)
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });

  var saved = props.getProperties();
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
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);
  var saved = props.getProperties();

  var apiKey = resolveApiKey_(e.formInput['gemini_api_key'], saved['GEMINI_API_KEY']);
  if (apiKey.missing) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Gemini API key is required.'))
      .build();
  }
  if (apiKey.value) props.setProperty('GEMINI_API_KEY', apiKey.value);

  var config = configFromForm_(e, saved);
  props.setProperties({
    'DIGEST_FREQ':   config.freq,
    'DIGEST_HOUR':   config.hour,
    'MONTH_DAY':     config.day,
    'DIGEST_LABEL':  config.label,
    'DIGEST_ACTION': config.action,
    'VIP_SENDERS':   config.vipSenders,
  });

  setupUserTrigger_(config.freq, parseInt(config.hour, 10), parseInt(config.day, 10));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .popToRoot()
      .updateCard(buildDashboardCard_(props.getProperties())))
    .setNotification(CardService.newNotification().setText('Settings saved.'))
    .build();
}


// ---------------------------------------------------------------------------
// Dashboard actions
// ---------------------------------------------------------------------------

function runNow_(e) {
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);

  if (props.getProperty('DIGEST_RUNNING') === 'true') {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('A run is already in progress.'))
      .build();
  }

  try {
    eveningDigest();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Run failed: ' + err.message))
      .build();
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildDashboardCard_(props.getProperties())))
    .setNotification(CardService.newNotification().setText('Digest complete.'))
    .build();
}


/**
 * Undoes a cleared thread: restores it to the inbox, marks it unread, and
 * removes the digest-processed label so it's picked up again next run.
 */
function restoreThread_(e) {
  var props    = PropertiesService.getUserProperties();
  var threadId = e.parameters.threadId;
  var thread   = GmailApp.getThreadById(threadId);

  if (thread) {
    thread.markUnread();
    thread.moveToInbox();
    var label = GmailApp.getUserLabelByName(getLabelName_());
    if (label) thread.removeLabel(label);
  }

  var saved = props.getProperties();
  var items = saved['LAST_RUN_CLEARED_ITEMS'] ? JSON.parse(saved['LAST_RUN_CLEARED_ITEMS']) : [];
  items = items.filter(function(item) { return item.threadId !== threadId; });
  props.setProperty('LAST_RUN_CLEARED_ITEMS', JSON.stringify(items));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildDashboardCard_(props.getProperties())))
    .setNotification(CardService.newNotification().setText('Restored to inbox.'))
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
