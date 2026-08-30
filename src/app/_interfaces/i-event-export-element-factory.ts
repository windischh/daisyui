import { EventFactory } from './../_db/event-factory';
import { IEventListElement } from './i-event-list-element';

/**
 * IEventExportElementFactory
 * used in EventExport to produce an EventListElement which is containing a event
 */

export class IEventExportElementFactory {

  static empty(): IEventListElement {
    return {
      timeString: '',
      event: EventFactory.empty(),
      userName : '',
      userExternalId: '',
      contactNr :  0,
      contactDisplayNr :   '',
      contactName : '',
      contactExternalId : '',
      issueProviderId :  0,
      nExternalIssueId : 0,
      sExternalIssueId : '',
      issueDisplayNr :  '',
      issueText : '',
      issueDescription : '',
      categoryNr: 0,
      durationMinutes: 0,
      durationHours: 0,
      durationFormatted: '',
      locationTypeText : ''
    };
  }

  static default(): IEventListElement {
    const event = EventFactory.empty();
    event.summary = '-- text --';
    event.description = '-- text --';
    event.location = '-- text --';
    return {
      timeString: '',
      event,
      userName : '-- name --',
      userExternalId: '-- ext. --',
      contactNr :  0,
      contactDisplayNr :   '',
      contactName : '-- name --',
      contactExternalId : '-- ext. --',
      issueProviderId :  0,
      nExternalIssueId : 0,
      sExternalIssueId : '-- ext. --',
      issueDisplayNr :  '',
      issueText : '-- text --',
      issueDescription : '-- text --',
      categoryNr: 0,
      durationMinutes: 0,
      durationHours: 0,
      durationFormatted: '0:00',
      locationTypeText : '-- text --'
    };
  }

}

