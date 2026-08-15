/**
 * Settings card — shown on first run or when the user clicks "Settings".
 * Covers schedule (frequency, hour) and the processed-emails label.
 * Timezone is captured automatically from the event object; no dropdown needed.
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
  for (var i = 1; i <= 28; i++) d.push({ label: 'Day ' + i, value: String(i) });
  return d;
})();

var DEFAULT_FREQ   = 'daily';
var DEFAULT_HOUR   = '19';
var DEFAULT_DAY    = '1';
var DEFAULT_LABEL  = 'digest/processed';
var DEFAULT_ACTION = 'mark_read';


// ---------------------------------------------------------------------------
// Pure config helpers
// ---------------------------------------------------------------------------

function configFromSaved_(saved) {
  return {
    hasKey: !!saved['GEMINI_API_KEY'],
    freq:   saved['DIGEST_FREQ']   || DEFAULT_FREQ,
    hour:   saved['DIGEST_HOUR']   || DEFAULT_HOUR,
    day:    saved['MONTH_DAY']     || DEFAULT_DAY,
    label:  saved['DIGEST_LABEL']  || DEFAULT_LABEL,
    action: saved['DIGEST_ACTION'] || DEFAULT_ACTION,
  };
}

function configFromForm_(e, saved) {
  var fi = e.formInput;
  return {
    hasKey: !!saved['GEMINI_API_KEY'],
    freq:   fi['freq']      || saved['DIGEST_FREQ']   || DEFAULT_FREQ,
    hour:   fi['hour']      || saved['DIGEST_HOUR']   || DEFAULT_HOUR,
    day:    fi['month_day'] || saved['MONTH_DAY']     || DEFAULT_DAY,
    label:  fi['label']     || saved['DIGEST_LABEL']  || DEFAULT_LABEL,
    action: fi['action']    || saved['DIGEST_ACTION'] || DEFAULT_ACTION,
  };
}


// ---------------------------------------------------------------------------
// Card builder
// ---------------------------------------------------------------------------

function buildSettingsCard_(config) {
  var card = CardService.newCardBuilder()
    .setName('settings')
    .setHeader(CardService.newCardHeader()
      .setTitle('Settings')
      .setSubtitle('Customize your email digest'));

  // ── Gemini AI ─────────────────────────────────────────────────────────────
  card.addSection(
    CardService.newCardSection()
      .setHeader('Gemini AI')
      .addWidget(CardService.newTextParagraph()
        .setText(config.hasKey
          ? '🔑 API key is saved. Enter a new value below to replace it.'
          : 'A Gemini API key is required. Get yours free at Google AI Studio.'))
      .addWidget(
        CardService.newTextInput()
          .setFieldName('gemini_api_key')
          .setTitle('API Key')
          .setHint('Stored securely in your personal script properties')
          .setValue('')
      )
  );

  // ── Schedule ──────────────────────────────────────────────────────────────
  var schedSection = CardService.newCardSection()
    .setHeader('Schedule')
    .addWidget(CardService.newTextParagraph()
      .setText('When should the digest run and clean your inbox?'));

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

  // ── Email Processing ──────────────────────────────────────────────────────
  card.addSection(
    CardService.newCardSection()
      .setHeader('Email Processing')
      .addWidget(CardService.newTextInput()
        .setFieldName('label')
        .setTitle('Gmail label for processed threads')
        .setHint('Threads with this label are skipped on the next run')
        .setValue(config.label))
      .addWidget(CardService.newDecoratedText()
        .setText('Archive low-priority emails')
        .setBottomLabel('When on, removes emails from inbox instead of marking as read')
        .setSwitchControl(CardService.newSwitch()
          .setFieldName('action')
          .setValue('archive')
          .setSelected(config.action === 'archive')))
  );

  card.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(CardService.newTextButton()
        .setText('Save & Activate')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName('saveSettings_')))
  );

  return card.build();
}
