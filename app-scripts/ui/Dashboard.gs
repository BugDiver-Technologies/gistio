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
  if (saved['LAST_RUN_TIME']) {
    var tzId    = saved['TZ_ID'] || 'UTC';
    var timeStr = Utilities.formatDate(new Date(saved['LAST_RUN_TIME']), tzId, 'MMM d, h:mm a');

    var processed = saved['LAST_RUN_PROCESSED'] || '0';
    var kept      = saved['LAST_RUN_KEPT']      || '0';
    var cleared   = saved['LAST_RUN_CLEARED']   || '0';

    var makeStatWidget = function(emoji, count, label) {
      return CardService.newDecoratedText()
        .setText(emoji + '  ' + count)
        // Option B — always-visible label (uncomment to show permanently):
        // .setBottomLabel(label)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showStatToast_')
          .setParameters({ msg: count + ' ' + label }));
    };

    card.addSection(
      CardService.newCardSection()
        .setHeader('Last Run  \u00b7  ' + timeStr)
        .addWidget(
          CardService.newColumns()
            .addColumn(CardService.newColumn()
              .setHorizontalSizeStyle(CardService.HorizontalSizeStyle.FILL_AVAILABLE_SPACE)
              .addWidget(makeStatWidget('\uD83D\uDFE2', processed, 'processed')))
            .addColumn(CardService.newColumn()
              .setHorizontalSizeStyle(CardService.HorizontalSizeStyle.FILL_AVAILABLE_SPACE)
              .addWidget(makeStatWidget('\uD83D\uDD35', kept, 'kept unread')))
            .addColumn(CardService.newColumn()
              .setHorizontalSizeStyle(CardService.HorizontalSizeStyle.FILL_AVAILABLE_SPACE)
              .addWidget(makeStatWidget('\uD83D\uDFE0', cleared, 'cleared')))
        )
    );
  } else {
    card.addSection(
      CardService.newCardSection()
        .setHeader('Last Run')
        .addWidget(CardService.newTextParagraph()
          .setText('No runs yet. Click Run Digest Now to start.'))
    );
  }

  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextButton()
          .setText('Run Digest Now')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction().setFunctionName('runNow_'))
      )
  );

  return card.build();
}
