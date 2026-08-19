/**
 * Dashboard card — shown when the add-on is configured.
 * Displays last-run stats, running status, and the Run Now action.
 */

function buildDashboardCard_(saved) {
  var card = CardService.newCardBuilder()
    .setName('dashboard')
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

  if (saved['LAST_RUN_ERROR']) {
    var errorSection = CardService.newCardSection()
      .setHeader('⚠️ Last Run Failed')
      .addWidget(CardService.newTextParagraph()
        .setText(saved['LAST_RUN_ERROR']));
    if (saved['LAST_RUN_REF']) {
      errorSection
        .addWidget(CardService.newDecoratedText()
          .setText(saved['LAST_RUN_REF'])
          .setBottomLabel('Share this reference with support to diagnose the issue'));
    }
    card.addSection(errorSection);
  }

  // Last run summary
  if (saved['LAST_RUN_TIME']) {
    var tzId    = saved['TZ_ID'] || 'UTC';
    var timeStr = Utilities.formatDate(new Date(saved['LAST_RUN_TIME']), tzId, 'MMM d, h:mm a');

    var processed   = saved['LAST_RUN_PROCESSED'] || '0';
    var kept        = saved['LAST_RUN_KEPT']      || '0';
    var cleared     = saved['LAST_RUN_CLEARED']   || '0';
    var clearLabel  = saved['DIGEST_ACTION'] === 'archive' ? 'Archived' : 'Cleared';

    // Header row
    var headerSection = CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setText('Last Run  \u00b7  ' + timeStr)
        .setButton(CardService.newImageButton()
          .setIconUrl('https://www.gstatic.com/images/icons/material/system/2x/refresh_googblue_48dp.png')
          .setAltText('Run digest now')
          .setOnClickAction(CardService.newAction().setFunctionName('runNow_'))))
      .addWidget(CardService.newTextParagraph()
        .setText('\uD83D\uDD34 ' + kept + ' Needs attention\u2003\u2003\u26AB ' + cleared + ' ' + clearLabel));
    card.addSection(headerSection);

    // Needs attention emails
    var attentionJson = saved['LAST_RUN_ATTENTION'];
    var attentionEmails = attentionJson ? JSON.parse(attentionJson) : [];
    if (attentionEmails.length > 0) {
      var attentionSection = CardService.newCardSection().setHeader('Needs Attention');
      attentionEmails.forEach(function(email) {
        var url = 'https://mail.google.com/mail/u/0/#all/' + email.threadId;
        attentionSection.addWidget(CardService.newDecoratedText()
          .setText(email.subject)
          .setButton(CardService.newImageButton()
            .setIconUrl('https://www.gstatic.com/images/icons/material/system/2x/open_in_new_googblue_48dp.png')
            .setAltText('Open thread')
            .setOpenLink(CardService.newOpenLink().setUrl(url))));
      });
      card.addSection(attentionSection);
    }

    // View digest link
    card.addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('View Digest Email')
          .setOpenLink(CardService.newOpenLink()
            .setUrl('https://mail.google.com/mail/u/0/#search/subject%3A%22Gistio+Digest%22')))
    );
  } else {
    card.addSection(
      CardService.newCardSection()
        .addWidget(CardService.newDecoratedText()
          .setText('No runs yet')
          .setButton(CardService.newImageButton()
            .setIconUrl('https://www.gstatic.com/images/icons/material/system/2x/refresh_googblue_48dp.png')
            .setAltText('Run digest now')
            .setOnClickAction(CardService.newAction().setFunctionName('runNow_'))))
    );
  }

  return card.build();
}
