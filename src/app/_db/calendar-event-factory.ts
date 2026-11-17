import { CalendarEvent } from './calendar-event';
import { CalendarEventRaw } from './calendar-event-raw';

export class CalendarEventFactory {

  static empty(): CalendarEvent {
    return new CalendarEvent(0, 0, 0, 0, 0, new Date(), new Date(), 0,
     '', '', '', 0, 0, 0, 0, false,
     0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawEvent: CalendarEventRaw): CalendarEvent {
    return new CalendarEvent(
      rawEvent.eventId,
      rawEvent.userId,
      rawEvent.userToken,
      rawEvent.contactNr,
      rawEvent.issueNr,
      typeof(rawEvent.eventBegin) === 'string' ?
      new Date(rawEvent.eventBegin) : rawEvent.eventBegin,
      typeof(rawEvent.eventEnd) === 'string' ?
      new Date(rawEvent.eventEnd) : rawEvent.eventEnd,
      rawEvent.eventDuration,
      rawEvent.summary,
      rawEvent.description,
      rawEvent.location,
      rawEvent.locationType,
      rawEvent.planId,
      rawEvent.doneId,
      rawEvent.eventImportId,
      rawEvent.isExported,
      rawEvent.type,
      rawEvent.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawEvent.created) === 'string' ?
      new Date(rawEvent.created) : rawEvent.created,
      rawEvent.createdBy,
      rawEvent.releaseCreated,
      typeof(rawEvent.updated) === 'string' ?
      new Date(rawEvent.updated) : rawEvent.updated,
      rawEvent.updatedBy,
      rawEvent.releaseUpdated,
      rawEvent.version
    );
  }

}
