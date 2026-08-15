/**
 * User trigger management.
 * TZ_OFFSET is read from UserProperties (set automatically by captureTimezone_).
 */

function setupUserTrigger_(freq, localHour, monthDay) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'eveningDigest') ScriptApp.deleteTrigger(t);
  });

  var builder  = ScriptApp.newTrigger('eveningDigest').timeBased();
  var trigger;

  if (freq === 'hourly') {
    trigger = builder.everyHours(1).create();
    Logger.log('Trigger set: eveningDigest every hour');
  } else {
    var tzOffset = parseInt(PropertiesService.getUserProperties().getProperty('TZ_OFFSET') || '0', 10);
    var utcHour  = ((localHour - Math.round(tzOffset / 60)) % 24 + 24) % 24;

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
