import { IEventCardElement } from '../_interfaces/i-event-card-element';
import { IEventInfo } from '../_interfaces/i-event-info';

export class Event {
  [key: string]: any;
  constructor (
    /**
     * eventId is unique for all events for a user
     * it is used to reference event entries in the event file
     * which can be either on client or server
     */
    public eventId: number,
    public mandantId: number,
    /**
     * userId refers to id of local user
     * (when creating event - might change for server events - we must use userId of
     *   server user instead when we get events for example in event.component)
     * is not relevant at issue events
     */
    public userId: number,
    /*
     we need userToken in case of issue event where event elements of differnt client users
      (with can have same userId) are booked
    */
    public userToken: number,
    /*
     we need userToken in case of issue event where event elements of a login
     must be associated in case of renewing login user data ....
    */
    public externalUserId: string,
    public serverUserToken: string,
    /*
      nr of contact to which event belongs
      - in case of issueProvider > 0 contactNr is set
      from contactNr of issue - at the moment issue is assigned
      contact belongs to provider of issue
      (attetntion: contact with this contactNr may not exists at our contacts
        and contactNr at issue might have changed meanwhile ...)
      - in case of issueProvider === 0
      we set contactNr from a directly choosen contact
      (isContactBooking must be true)
      contact is a server contact
    */
    public contactNr: number,
    /*
    // TODO
    we implement an issueNr instead of diverse issue data later in this db description
    issueNr is taken from session when user selects a contact for this event
    user has possibility to enter an issuerNr or 0 when he selects a contact as "selected contact" for this session
    */
    public eventBegin: Date,
    public eventEnd: Date,
    /* duration of event in in minutes
      each event can reach  (beside overlap check) only to end of next day
    */
    public eventDuration: number,
    /*   summary		*/
    public summary: string,
    /* detailed  description	*/
    public description: string,
    /*   location		*/
    public location: string,
    /*   location	type
    - 0 - undefined
    - 1 - onSite
    - 2 - onTheWay
    - 3 - office
    - 4 - homeOffice
    - 5 - smartPhone
      6 - other
    */
    public locationType: number,
    /*  in case of actual event: id of planned event to which this (actual) event belongs
     		in the moment, actual event and event with planId are at the same calendarDay
      in case of planned event: id of a todo to which this (planned) event belongs
    */
    public planId: number,
    /*   id of actual event which has finished this (planned) event
		  in the moment, this event and event with doneId is at the same calendarDay
      if event is finished without a actual event, doneId is the own eventId
    */
    public doneId: number,
    /*   id of event which has been imported as basis for this event
    */
    public eventImportId: number,
    /*
    * event entries which refer to an issue
    ' must have issueProviderId > 0 (and  url, login to veriyf id!) and external id to identify issue
      issueProviderId === 0 means no issue is joined to this event
    */
    public issueProviderId: number,
    public providerUrl: string,
    public login: string,
    public nExternalIssueId: number,
    public sExternalIssueId: string,
    /*
      externalEventId exist for event which refers to an issue,  in a system where
      issue events are stored with an own id
    */
    public nExternalEventId: number,
    public sExternalEventId: string,
    /* used for event which belongs to an issue
      - set true if event  update is successfully transferred to issueProvider as issue event
      (only actual event is transferred)
    */
    public isStoredAtIssue: boolean,
    /* isExported is used at issue events
      true if event of an issue is already exported to a event collection system
      (therefor only actual event csn have this flag)
      issues where not all events are exported can not be disabed ...
      */
    public isExported: boolean,
    /* invoiceOrderNr has oserNr if this event is invoiced
      (used at events which belong to an issue)
    */
    public invoiceOrderNr: number,
    /* type 0 = planned  1 = actual, active  2 forecast (3-9 .. more forecasts) - not realized yet
      1x = special event types (future use) ...
      2x = time span (defined by begin, end, duration = 0) has no "amount of event"
      we have types 20 to 29, and 0 to 9 is the category defined by an option
      (0 = undefined, 1 = holiday, 2 = birthday, 3 = ......)
    */
    public type: number,
    /* 0 = active, 1 done (in case of a planned event),
      9 automatic disabled, 90 = manually disabled
    */
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
    /* we need UID and DB date timestamps in case of calendar export
    */
    public uid?: string,
    // public dateCreated?: Date,
    // public dateModified?: Date,
    /*
        name is used at calendar export
        and for failure description in calendar import
    */
    public name?: string,
    /*
        address is used in calendar export
    */
    public address?: string,
    /*  isSelected exists in calendar-day to mark selected events    */
    public isSelected?: boolean,
    /*  eventCardElement
      exists in calendar-day-cards-view, grid-view
    */
    public cardElement?: IEventCardElement,
    /**
     * eventInfo is created if event is joined to a contact or issue
     */
    public eventInfo?: IEventInfo,
    /* associated eventBegin, eventEnd have begin/end
      of planned event in case of actual, and of actual (or plan itself)
      which has done it, in case of plan
      assoc fields are built dynamically when get Events in calendar-day...
    */
    public assocEventBegin?: Date,
    public assocEventEnd?: Date,
    public assocDone?: boolean,
    public assocCount?: number
    ) { }
}
