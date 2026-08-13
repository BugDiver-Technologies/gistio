/**
 * Settings card for the Gmail Triage add-on.
 *
 * Lets each user configure their Gemini API key, digest frequency, time,
 * timezone, and label name. All settings are stored in UserProperties.
 *
 * Trigger times are stored and fired in UTC. The user picks a local time
 * and timezone; we convert to UTC when creating the trigger.
 */

var TIMEZONES = [
  { label: 'UTC (UTC+0)',                 value: '0'    },
  { label: 'US Eastern (UTC-5)',          value: '-300' },
  { label: 'US Central (UTC-6)',          value: '-360' },
  { label: 'US Mountain (UTC-7)',         value: '-420' },
  { label: 'US Pacific (UTC-8)',          value: '-480' },
  { label: 'Brazil - Sao Paulo (UTC-3)', value: '-180' },
  { label: 'UK - London (UTC+0)',         value: '0'    },
  { label: 'Central Europe (UTC+1)',      value: '60'   },
  { label: 'Moscow (UTC+3)',              value: '180'  },
  { label: 'Gulf - Dubai (UTC+4)',        value: '240'  },
  { label: 'India (IST, UTC+5:30)',       value: '330'  },
  { label: 'Indochina - Bangkok (UTC+7)', value: '420'  },
  { label: 'Singapore / HK (UTC+8)',      value: '480'  },
  { label: 'Japan - Tokyo (UTC+9)',       value: '540'  },
  { label: 'Australia - Sydney (UTC+10)', value: '600'  },
];

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
var DEFAULT_HOUR  = '19';   // 7 PM local
var DEFAULT_TZ    = '330';  // IST (UTC+5:30)
var DEFAULT_DAY   = '1';
var DEFAULT_LABEL = 'digest/processed';


function onInstall(e) {
  onHomepage(e);
}

function onHomepage(e) {
  var saved = PropertiesService.getUserProperties().getProperties();
  return buildSettingsCard_(configFromSaved_(saved));
}


function configFromSaved_(saved) {
  return {
    hasKey: !!saved['GEMINI_API_KEY'],
    freq:   saved['DIGEST_FREQ']  || DEFAULT_FREQ,
    hour:   saved['DIGEST_HOUR']  || DEFAULT_HOUR,
    tz:     saved['TZ_OFFSET']    || DEFAULT_TZ,
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
    tz:     fi['tz_offset'] || saved['TZ_OFFSET']    || DEFAULT_TZ,
    day:    fi['month_day'] || saved['MONTH_DAY']    || DEFAULT_DAY,
    label:  fi['label']     || saved['DIGEST_LABEL'] || DEFAULT_LABEL,
  };
}


function buildSettingsCard_(config) {
  var card = CardService.newCardBuilder()
    .setName('settings')
    .setHeader(CardService.newCardHeader()
      .setTitle('Gmail Triage')
      .setSubtitle('Daily email digest powered by Gemini'));

  // Status banner
  var statusText = config.hasKey
    ? 'Active — digest scheduled. Update settings below.'
    : 'Not configured — enter your Gemini API key to get started.';
  card.addSection(
    CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(statusText))
  );

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

    var tzSelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('tz_offset')
      .setTitle('Timezone');
    TIMEZONES.forEach(function(tz) {
      tzSelect.addItem(tz.label, tz.value, tz.value === config.tz);
    });
    schedSection.addWidget(tzSelect);
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

  // Save button
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextButton()
          .setText(config.hasKey ? 'Update Settings' : 'Save & Activate')
          .setOnClickAction(CardService.newAction().setFunctionName('saveSettings_'))
      )
  );

  return card.build();
}


/**
 * Rebuilds the card when the user changes the frequency dropdown,
 * so time/timezone/day-of-month fields show or hide appropriately.
 */
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
  var tz    = fi['tz_offset'] || DEFAULT_TZ;
  var day   = fi['month_day'] || DEFAULT_DAY;
  var label = (fi['label'] || '').trim() || DEFAULT_LABEL;

  props.setProperty('DIGEST_FREQ',  freq);
  props.setProperty('DIGEST_HOUR',  hour);
  props.setProperty('TZ_OFFSET',    tz);
  props.setProperty('MONTH_DAY',    day);
  props.setProperty('DIGEST_LABEL', label);

  setupUserTrigger_(freq, parseInt(hour, 10), parseInt(tz, 10), parseInt(day, 10));

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Settings saved.'))
    .setStateChanged(true)
    .build();
}


/**
 * Converts a local hour + UTC offset (in minutes) to UTC hour for atHour().
 * Handles wraparound (e.g. UTC-8 at 1 AM → 9 AM UTC previous day → clamped).
 */
function localToUtcHour_(localHour, utcOffsetMinutes) {
  var utc = localHour - Math.round(utcOffsetMinutes / 60);
  return ((utc % 24) + 24) % 24;
}


function setupUserTrigger_(freq, localHour, utcOffsetMinutes, monthDay) {
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
    var utcHour = localToUtcHour_(localHour, utcOffsetMinutes);
    if (freq === 'monthly') {
      trigger = builder.onMonthDay(monthDay).atHour(utcHour).create();
      Logger.log('Trigger set: eveningDigest monthly on day ' + monthDay + ' at local hour ' + localHour + ' (UTC ' + utcHour + ')');
    } else {
      trigger = builder.everyDays(1).atHour(utcHour).create();
      Logger.log('Trigger set: eveningDigest daily at local hour ' + localHour + ' (UTC ' + utcHour + ')');
    }
  }

  PropertiesService.getUserProperties().setProperty('TRIGGER_ID', trigger.getUniqueId());
}
