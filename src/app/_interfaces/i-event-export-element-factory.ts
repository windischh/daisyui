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
      contactNr :  0,
      contactDisplayNr :   '',
      contactName : '',
      issueNr :  0,
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
      contactNr :  0,
      contactDisplayNr :   '',
      contactName : '-- name --',
      issueNr :  0,
      durationMinutes: 0,
      durationHours: 0,
      durationFormatted: '0:00',
      locationTypeText : '-- text --'
    };
  }

}

