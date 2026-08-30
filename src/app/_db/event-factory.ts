import { Event } from './event';
import { EventRaw } from './event-raw';

export class EventFactory {

  static empty(): Event {
    return new Event(0, 0, 0, 0, '', '', 0, new Date(), new Date(), 0,
     '', '', '', 0, 0, 0, 0,
     0, '', '', 0, '', 0, '', false, false, 0,
     0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawEvent: EventRaw): Event {
    return new Event(
      rawEvent.eventId,
      rawEvent.mandantId,
      rawEvent.userId,
      rawEvent.userToken,
      rawEvent.externalUserId,
      rawEvent.serverUserToken,
      rawEvent.contactNr,
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
      rawEvent.issueProviderId,
      rawEvent.providerUrl,
      rawEvent.login,
      rawEvent.nExternalIssueId,
      rawEvent.sExternalIssueId,
      rawEvent.nExternalEventId,
      rawEvent.sExternalEventId,
      /* used in session event for derived changes
        - true if update is  transferred to  issueProvider
      */
      rawEvent.isStoredAtIssue,
      rawEvent.isExported,
      rawEvent.invoiceOrderNr,
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
