/**
 * Dashboard card — shown when the add-on is configured.
 * Displays last-run stats, running status, and the Run Now action.
 */

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

  if (saved['DIGEST_RUNNING'] === 'true') {
    card.addSection(
      CardService.newCardSection()
        .setHeader('Status')
        .addWidget(CardService.newTextParagraph()
          .setText('Digest is running in the background. This usually takes 1\u20132 minutes. Use the refresh option in the menu to check when done.'))
    );
    return card.build();
  }

  // Last run summary
  var lastRunSection = CardService.newCardSection().setHeader('Last Run');
  if (saved['LAST_RUN_TIME']) {
    var tzId    = saved['TZ_ID'] || 'UTC';
    var timeStr = Utilities.formatDate(new Date(saved['LAST_RUN_TIME']), tzId, 'MMM d, yyyy, h:mm:ss a');
    lastRunSection.addWidget(
      CardService.newDecoratedText().setTopLabel('Time').setText(timeStr)
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

  return card.build();
}
