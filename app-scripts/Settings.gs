/**
 * Settings card for the Gmail Triage add-on.
 *
 * Two-card design:
 *  - Dashboard card: shown when configured. Displays last run stats and actions.
 *  - Settings card:  shown on first run, or when the user clicks "Edit Settings".
 *
 * All user config is stored in UserProperties.
 */


var FREQUENCIES = [
  { label: 'Hourly',  value: 'hourly'  },
  { label: 'Daily',   value: 'daily'   },
  { label: 'Monthly', value: 'monthly' },
];

var HOURS = (function() {
  var h = [];
  for (var i = 0; i < 24; i++) {
    var label;
    if (i === 0)       label = '12:00 AM';
    else if (i < 12)   label = i + ':00 AM';
    else if (i === 12) label = '12:00 PM';
    else               label = (i - 12) + ':00 PM';
    h.push({ label: label, value: String(i) });
  }
  return h;
})();

var DAYS = (function() {
  var d = [];
  for (var i = 1; i <= 28; i++) {
    d.push({ label: 'Day ' + i, value: String(i) });
  }
  return d;
})();

var DEFAULT_FREQ  = 'daily';
var DEFAULT_HOUR  = '19';
var DEFAULT_DAY   = '1';
var DEFAULT_LABEL = 'digest/processed';


// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function onInstall(e) {
  return onHomepage(e);
}

function captureTimezone_(e, props) {
  if (e && e.commonEventObject && e.commonEventObject.timeZone) {
    props.setProperty('TZ_ID',     e.commonEventObject.timeZone.id);
    props.setProperty('TZ_OFFSET', String(e.commonEventObject.timeZone.offset));
  }
}

function onHomepage(e) {
  var props = PropertiesService.getUserProperties();
  captureTimezone_(e, props);

  var saved = props.getProperties();

  // Sync DIGEST_RUNNING with actual trigger state
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
// Dashboard card
// ---------------------------------------------------------------------------

function buildDashboardCard_(saved) {
  var card = CardService.newCardBuilder()
    .setName('dashboard')
    .setHeader(CardService.newCardHeader()
      .setTitle('Gmail Triage')
      .setSubtitle('Email digest powered by Gemini'))
    .addCardAction(
      CardService.newCardAction()
        .setText('Settings')
        .setOnClickAction(CardService.newAction().setFunctionName('openSettings_'))
    );

  var isRunning = saved['DIGEST_RUNNING'] === 'true';

  if (isRunning) {
    card.addSection(
      CardService.newCardSection()
        .setHeader('Status')
        .addWidget(CardService.newTextParagraph()
          .setText('Digest is running in the background. This usually takes 1\u20132 minutes. Use the refresh option in the menu to check when done.'))
    );
  } else {
    // Last run summary
    var lastRunSection = CardService.newCardSection().setHeader('Last Run');
    if (saved['LAST_RUN_TIME']) {
      var tzId = saved['TZ_ID'] || 'UTC';
      var timeStr = Utilities.formatDate(new Date(saved['LAST_RUN_TIME']), tzId, 'MMM d, yyyy, h:mm:ss a');
      lastRunSection.addWidget(
        CardService.newDecoratedText()
          .setTopLabel('Time')
          .setText(timeStr)
      );
      lastRunSection.addWidget(
        CardService.newDecoratedText()
          .setTopLabel('Emails')
          .setText(
            saved['LAST_RUN_PROCESSED'] + ' processed  \u00b7  ' +
            saved['LAST_RUN_KEPT']      + ' kept unread  \u00b7  ' +
            saved['LAST_RUN_CLEARED']   + ' cleared'
          )
      );
    } else {
      lastRunSection.addWidget(
        CardService.newTextParagraph().setText('No runs yet. Click Run Digest Now to start.')
      );
    }
    card.addSection(lastRunSection);

    // Actions
    card.addSection(
      CardService.newCardSection()
        .setHeader('Actions')
        .addWidget(
          CardService.newTextButton()
            .setText('Run Digest Now')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(CardService.newAction().setFunctionName('runNow_'))
        )
    );
  }

  return card.build();
}


// ---------------------------------------------------------------------------
// Settings card
// ---------------------------------------------------------------------------

function configFromSaved_(saved) {
  return {
    hasKey: !!saved['GEMINI_API_KEY'],
    freq:   saved['DIGEST_FREQ']  || DEFAULT_FREQ,
    hour:   saved['DIGEST_HOUR']  || DEFAULT_HOUR,
    day:    saved['MONTH_DAY']    || DEFAULT_DAY,
    label:  saved['DIGEST_LABEL'] || DEFAULT_LABEL,
  };
}

function configFromForm_(e, saved) {
  var fi = e.formInput;
  return {
    hasKey: !!saved['GEMINI_API_KEY'],
    freq:   fi['freq']      || saved['DIGEST_FREQ']  || DEFAULT_FREQ,
    hour:   fi['hour']      || saved['DIGEST_HOUR']  || DEFAULT_HOUR,
    day:    fi['month_day'] || saved['MONTH_DAY']    || DEFAULT_DAY,
    label:  fi['label']     || saved['DIGEST_LABEL'] || DEFAULT_LABEL,
  };
}

function buildSettingsCard_(config) {
  var card = CardService.newCardBuilder()
    .setName('settings')
    .setHeader(CardService.newCardHeader()
      .setTitle('Settings')
      .setSubtitle('Gmail Triage'));

  // API key
  card.addSection(
    CardService.newCardSection()
      .setHeader('Gemini API Key')
      .addWidget(
        CardService.newTextInput()
          .setFieldName('gemini_api_key')
          .setTitle('API Key')
          .setHint(config.hasKey
            ? 'Key saved — enter a new value to update'
            : 'Required — get yours at aistudio.google.com')
          .setValue('')
      )
  );

  // Schedule
  var schedSection = CardService.newCardSection().setHeader('Schedule');

  var freqSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('freq')
    .setTitle('Frequency')
    .setOnChangeAction(CardService.newAction().setFunctionName('onFrequencyChange_'));
  FREQUENCIES.forEach(function(f) {
    freqSelect.addItem(f.label, f.value, f.value === config.freq);
  });
  schedSection.addWidget(freqSelect);

  if (config.freq !== 'hourly') {
    var hourSelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('hour')
      .setTitle('Time');
    HOURS.forEach(function(h) {
      hourSelect.addItem(h.label, h.value, h.value === config.hour);
    });
    schedSection.addWidget(hourSelect);
  }

  if (config.freq === 'monthly') {
    var daySelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('month_day')
      .setTitle('Day of month');
    DAYS.forEach(function(d) {
      daySelect.addItem(d.label, d.value, d.value === config.day);
    });
    schedSection.addWidget(daySelect);
  }

  card.addSection(schedSection);

  // Label
  card.addSection(
    CardService.newCardSection()
      .setHeader('Label')
      .addWidget(
        CardService.newTextInput()
          .setFieldName('label')
          .setTitle('Processed emails label')
          .setHint('Labelled emails are skipped on the next run')
          .setValue(config.label)
      )
  );

  // Save
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextButton()
          .setText('Save & Activate')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction().setFunctionName('saveSettings_'))
      )
  );

  return card.build();
}


// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

function openSettings_(e) {
  var saved = PropertiesService.getUserProperties().getProperties();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSettingsCard_(configFromSaved_(saved))))
    .build();
}

function onFrequencyChange_(e) {
  var saved = PropertiesService.getUserProperties().getProperties();
  var config = configFromForm_(e, saved);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard_(config)))
    .build();
}

function saveSettings_(e) {
  var fi = e.formInput;
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

  var freq  = fi['freq']      || DEFAULT_FREQ;
  var hour  = fi['hour']      || DEFAULT_HOUR;
  var day   = fi['month_day'] || DEFAULT_DAY;
  var label = (fi['label'] || '').trim() || DEFAULT_LABEL;

  props.setProperty('DIGEST_FREQ',  freq);
  props.setProperty('DIGEST_HOUR',  hour);
  props.setProperty('MONTH_DAY',    day);
  props.setProperty('DIGEST_LABEL', label);

  setupUserTrigger_(freq, parseInt(hour, 10), parseInt(day, 10));

  var dashboard = buildDashboardCard_(props.getProperties());
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().pushCard(dashboard))
    .setNotification(CardService.newNotification().setText('Settings saved.'))
    .build();
}

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

  ScriptApp.newTrigger('runDigestOnce_')
    .timeBased()
    .at(new Date(Date.now() + 30 * 1000))
    .create();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildDashboardCard_(props.getProperties())))
    .build();
}



// ---------------------------------------------------------------------------
// Trigger management
// ---------------------------------------------------------------------------

function setupUserTrigger_(freq, localHour, monthDay) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'eveningDigest') {
      ScriptApp.deleteTrigger(t);
    }
  });

  var builder = ScriptApp.newTrigger('eveningDigest').timeBased();
  var trigger;

  if (freq === 'hourly') {
    trigger = builder.everyHours(1).create();
    Logger.log('Trigger set: eveningDigest every hour');
  } else {
    var tzOffset = parseInt(PropertiesService.getUserProperties().getProperty('TZ_OFFSET') || '0', 10);
    var utcHour = ((localHour - Math.round(tzOffset / 60)) % 24 + 24) % 24;
    if (freq === 'monthly') {
      trigger = builder.onMonthDay(monthDay).atHour(utcHour).create();
      Logger.log('Trigger set: monthly on day ' + monthDay + ' at local hour ' + localHour + ' (UTC ' + utcHour + ')');
    } else {
      trigger = builder.everyDays(1).atHour(utcHour).create();
      Logger.log('Trigger set: daily at local hour ' + localHour + ' (UTC ' + utcHour + ')');
    }
  }

  PropertiesService.getUserProperties().setProperty('TRIGGER_ID', trigger.getUniqueId());
}
