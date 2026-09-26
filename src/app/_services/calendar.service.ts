import { Injectable, Inject, LOCALE_ID } from '@angular/core';

import { GlobalFunctions } from './../_globals/global-functions';
import { MAX_MONTHS } from '../_globals/constants';
import { StyleFactory } from '../_globals/style-factory';

import { Event } from '../_db/event';
import { EventFactory } from '../_db/event-factory';
import { EventRaw } from '../_db/event-raw';
import { Provider } from '../_db/provider';
import { UserData } from '../_db/user-data';
import { User } from '../_db/user';
import { EventSelectOption } from '../_db/event-select-option';
import { ContactFactory } from '../_db/contact-factory';
import { Contact } from '../_db/contact';
import { EventSelectOptionFactory } from '../_db/event-select-option-factory';

import { ProviderType } from '../_enums/provider-type.enum';
import { EventType } from '../_enums/event-type.enum';
import { EventSortCriteria } from '../_enums/event-sort-criteria.enum';
import { LocationType } from '../_enums/location-type.enum';

import { IEventsFound } from '../_interfaces/i-events-found';
import { IHoliday } from '../_interfaces/i-holiday';
import { IEventSelectChoice } from '../_interfaces/i-event-select-choice';
import { IEventInfo } from '../_interfaces/i-event-info';
import { ISortElement } from '../_interfaces/i-sort-element';
import { IEventListElement } from '../_interfaces/i-event-list-element';
import { IAuthorization } from '../_interfaces/i-authorization';
import { App } from '../_enums/app.enum';

import { LogService } from './log.service';
import { AuthenticationService } from './authentication.service';
import { FetchApiService } from './fetch-api.service';
import { ContactService } from './contact.service';
import { ProviderService } from './provider.service';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  public name = 'CalendarService';

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private logger: LogService,
    private fetch: FetchApiService,
    private providerService: ProviderService,
    private contactService: ContactService,
    private auth: AuthenticationService,
    private message: MessageService) {
   }

  /***********************************  private methods **************************************/


  /**
   * getLocalEvents()
   *  get events from local storage
   * @param userId id of user for which we get data (if 0, it is session usr ...)
   * @param comp name of calling component
   * @returns events which are stored in local storage
   */
  private getLocalEvents(userId: number, comp: string): Array<Event> {
    let localEvents: Array<Event> = [];
    const session = this.auth.getSession(comp);
    const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
    const userData = this.auth.getUserData(localUserId, 'events', comp);
    if(userData && userData.events) {
      localEvents = userData.events;
    }
    return localEvents;
  }


  /**
   * setLocalEvents()
   *  set events in local storage
   *  (is a private function - must not be used in components ... )
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param events narray of events
   * @param comp name of calling component
   */
   private setLocalEvents(userId: number, events: Array<Event>, comp: string): boolean {
    if (events) {
      const session = this.auth.getSession(comp);
      const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
      // build a user data element with events
      const userData = this.auth.getUserData(localUserId, 'events', comp);
      userData.events = events;
      this.auth.setUserData(userId, 'events', userData, comp);
    }
    return false;
   }

  

  /** ------------------------  public methods --------------------------------------------------- */



  /**
   * getEvents()
   *  get events  (from local storage with user of session)s
   * @param comp name of calling component
   * @returns events (ATTN: also disabled events are returned)
   */
  public getEvents(comp: string): Array<Event> {
    let events: Array<Event> = [];
    const session = this.auth.getSession(comp);
    if (session && session?.userId && session?.userId > 0) {
      events = this.getLocalEvents(session.userId, comp);
    }
    return events;
  }

  /**
   * getEventsRange()
   *  get eventsRange
   *  events are filtered by session user and time range
   * @param userId usually a linked user for which we want to get event data
   * @param fromDate begin of time range
   * @param toDate end of time range
   * @param type event type (0 - plan, 1 - actual ,..) - in case of type 20 all timeSpan types 20 - 29 are chosen
   * @param comp name of calling component
   * @returns events (only active events are returned)
   */
  public getEventsRange(fromDate: Date, toDate: Date, type: number, comp: string): Array<Event> {
    let events: Array<Event> = [];
    events = this.getEvents(comp);
    if (events?.length > 0) {
      events = events.filter(_ =>
        GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(fromDate)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) <= GlobalFunctions.getDateInMinutes(toDate)
        && (_.type === type || (type === EventType.timeSpanUndefined &&  _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9)) && _.status < 9);
    }
    return events;
  }

  /**
     * search Event()
     * @param searchTerm string with text to search
     * @param comp name of calling component
     * @returns events with text contained in summary or description
     */
    public searchEvent(searchTerm: string, comp: string): Array<Event> {
      const events = this.getEvents(comp);
      return events.filter(_ => _.summary.includes(searchTerm) || _.description.includes(searchTerm));
    }
  



  /**
   * getEvent()
   *  get event from events by id
   * @param eventId id of event
   * @param comp name of calling component
   * @returns event
   */
  public getEvent(eventId: number, comp: string): Event | null{
    let events: Event[] = [];
    events = this.getEvents(comp);
    const event = events.find(_ => _.eventId === eventId);
    if (event) {
      return event;
    }
    return null;
  }

  public getEventContact(comp: string): {eventContact: Contact, contactVisibleStyle: {},  contactHiddenStyle: {}} | null {
    let eventContact = ContactFactory.empty();
    let contactVisibleStyle: {} = {};
    let contactHiddenStyle: {} = {};
    const session = this.auth.getSession(comp);
    if (session) {
      let contactNr = session.contactNr ?? 0;
      // contact id is either  session.contactNr, or - if 0 - issue.contactNr
      if (contactNr > 0) {
        const contact = this.contactService.getContactNr(session?.contactNr, comp);
        if (contact) {
          eventContact = contact;
          if (contact?.contactColor) {
            contactVisibleStyle = StyleFactory.getBgColorStyle(contact.contactColor, 0);
            contactHiddenStyle = StyleFactory.getBgColorStyle(contact.contactColor, 90);
          }
        } else {
          // in case of not found contact we remember custId in displayNr ....
          eventContact.contactNr = contactNr;
          eventContact.displayNr = contactNr.toString();
          // displayNr is set to txt + contactNr - so we can differ contacts which have not been found ....
          eventContact.displayNr = (this.auth.txt['contact']) + ': ' + contactNr.toString();
        }
      }
    }
    return {eventContact, contactVisibleStyle, contactHiddenStyle};
  }


  /**
   * getEventBegin()
   *  getEvent first event(s) at or after  eventBegin (minute), with defined userId and type
   * @param eventBegin  eventBegin, as Date - minute of eventBegin is relevant
   * @param type (at type 0, 1 we await just 1 event as result)
   * @param comp name of component for logging purpose
   * @return events
   */
  public getEventBegin(eventBegin: Date, type: number, comp: string): Array<Event>  {
    let events: Event[] = [];
    events = this.getEvents(comp);
    // sort on userId, type, eventBegin
    const firstEvent = events
    .sort((a, b) => a.type !== b.type ? a.type - b.type
    : a.eventBegin.getTime() - b.eventBegin.getTime())
    .find(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(eventBegin)
      && _.type === type && _.status < 9);
    // we deliver event(s) with lowest eventBegin ....
    if (firstEvent) {
      return events.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) === GlobalFunctions.getDateInMinutes(firstEvent.eventBegin)
        && _.type === type && _.status < 9);
    } else {
      return [];
    }

  }



  /**
   * getEventSelectOptions()
   *  get eventSelectOptions (from local storage)
   * @param comp name of calling component
   * @returns event select options which are stored in local storage for the session user
   */
   public getEventSelectOptions(comp: string): Array<EventSelectOption> {
    let eventSelectOptions: EventSelectOption[] = [];
    const userData = this.auth.getUserData(0, 'eventSelectOptions', comp);
    if(userData && userData.eventSelectOptions) {
      eventSelectOptions =  userData.eventSelectOptions;
    }
    return eventSelectOptions;
  }

  /**
   * setEvents()
   *  set events at local storage
   * @param events narray of events
   * @param comp name of calling component
   */
  public setEvents(events: Array<Event>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    if (events && session && session?.userId && session?.userId > 0) {
      return this.setLocalEvents(session.userId, events, comp);
    } else {
      return false;
    }
  }



  /**
   * setEvent()
   *  set event by id at session user events (local) - we do not allow set event for other user than session user
   *  if eventId does not exist, we insert a event element with latest Id
   *  (event.eventId must be 0 or equals eventId parameter)
   * @param event new event content
   * @param comp name of calling component
   * @return inserted or updated eventId, 0 in case of failure in event file
   */
  public setEvent( event: Event, comp: string): number {
    let isSetOk = false;
    const session = this.auth.getSession(comp);
    let events: Array<Event> = [];
    events = this.getEvents(comp);
    // normal event must have duration - timeSpans can have category  3 to 9 and have eventDuration 0
    if (session && event && (event?.eventDuration > 0 || (event?.type >= EventType.timeSpanCategory3 && event?.type <= EventType.timeSpanCategory9))) {
      let ix = -1;
      if (events?.length > 0) {
        ix = events.findIndex(_ => _.eventId === event.eventId);
      } else {
        events = [];
      }
      if (event.eventId > 0 && ix >= 0) {
          // and we set update audit info
          event.updated = new Date();
          event.updatedBy = session?.userName ?? '';
          event.releaseUpdated = session?.releaseUpdated ?? 0;
          event.version++;
          events[ix] = event;
          events[ix].eventInfo = undefined;
      } else {
        // a new event is inserted at events
        // build eventId  as max of id of existing events
        let lastEventId = events?.length > 0
        ? events.reduce((a,b) => a.eventId > b.eventId ? a : b).eventId
        : 0;
        lastEventId++;
        event.eventId = lastEventId;
        event.userId = session.userId;
        event.userToken = session.userToken;
        // in case of event to issue there is already login filled
        event.login = event.login === '' ? session.userName : event.login;
        event.created = new Date();
        event.createdBy = session.userName;
        event.releaseCreated = session.releaseUpdated;
        event.updated = null;
        event.updatedBy = '';
        event.releaseUpdated = 0;
        event.version = 0;
        // console.log('eventInfo at new event ??', event.eventInfo);
        event.eventInfo = undefined;
        events.push(event);
      }
      isSetOk = this.setEvents(events, comp);
    }
    if (isSetOk) {
      return event.eventId;
    } else {
      return 0;
    }
  }


  /**
   * setEventDisabled()
   *  set event disabled in client or server events  by id
   * @param eventId id of event
   * @param comp name of calling component
   * @return true if found and disabled, false in case of failure
   */
   public setEventDisabled(eventId: number, comp: string): boolean {
    let event = this.getEvent(eventId, comp);
    if (event) {
      event.status = 90;
      const confirmedEventId = this.setEvent(event, comp);
      if (eventId === confirmedEventId) {
        return true;
      }
    }
    // event element is not found or could not be updated
    return false;
  }

  /**
   * createEvents()
   *  creates an array of events (usually got via import)
   *  events must not be issueEvents - but can have contactId; events can be timespans (can have contactId)
   *  events are inserted or (if matching uid and type) leggcy event is updated)
   * @param events Array of events
   * @param comp name of calling component
   * @returns trur if all can be stored, false if not (in this case server - or local - wors remain unchaned)
   */

  public createEvents(events: Array<Event>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    let legacyEvents: Array<Event> = [];
    let createdEvents: Array<Event> = [];
    legacyEvents = this.getEvents(comp);
    let lastEventId = 0;
    let isUpdated = false;
    if (session && events) {
      for (const event of events) {
        // console.log('event import: ', JSON.stringify(event));
        // normal event must have duration - timeSpans can have category 3 to 9 and have eventDuration 0
        if (event.eventDuration > 0 || (event.type >= EventType.timeSpanCategory3 && event.type <= EventType.timeSpanCategory9)) {
          // now update  old event with same uid ..
          const ix = legacyEvents.findIndex(_ =>
            _.type === event.type
            &&  (_.eventId.toString() + '@daisytest_' + '_' + session.userName) === event.uid
          );
          if (ix >= 0) {
            legacyEvents[ix].summary = event.summary;
            legacyEvents[ix].description = event.description;
            legacyEvents[ix].locationType = event.locationType;
            // no update of location if contactNr was set (because imported location could contain contact name, adres  ...)
            legacyEvents[ix].location = legacyEvents[ix].contactNr > 0 ? legacyEvents[ix].location : event.location;
            legacyEvents[ix].eventBegin =  event.eventBegin;
            legacyEvents[ix].eventEnd =  event.eventEnd;
            legacyEvents[ix].eventDuration = event.eventDuration;
            // and we set update audit info
            legacyEvents[ix].updated = new Date();
            legacyEvents[ix].updatedBy = session.userName;
            legacyEvents[ix].releaseUpdated = session.releaseUpdated;
            legacyEvents[ix].version++;
            isUpdated = true;
          } else {

            if (lastEventId === 0) {
              // first new event is inserted
              // build eventId  as max of id of existing events included just created events
              lastEventId = legacyEvents?.length > 0
              ? legacyEvents.reduce((a,b) => a.eventId > b.eventId ? a : b).eventId
              : 0;
            }
            lastEventId++;
            event.eventId = lastEventId;
            event.userId = session.userId;
            event.userToken = session.userToken;
            // in case of event to issue there is already login filled
            event.login = event.login === '' ? session.userName : event.login;
            event.created = new Date();
            event.createdBy = session.userName;
            event.releaseCreated = session.releaseUpdated;
            event.updated = null;
            event.updatedBy = '';
            event.releaseUpdated = 0;
            event.version = 0;
            // console.log('eventInfo at new event ??', event.eventInfo);
            event.eventInfo = undefined;
            event.uid = undefined;
            event.name = undefined;
            event.address = undefined;
            createdEvents.push(event);
          }
        }

      }
    }
    // we first store event at client or server (depending on config)
    if (lastEventId > 0 || isUpdated) {
      return this.setEvents(legacyEvents.concat(createdEvents), comp);
    } 
    return false;
  }

  public buildEventSelectOptions(comp: string) {
    const session = this.auth.getSession(comp);
    // we have an array of all eventSelectOptions where all options for event selection  are stored
    let eventSelectOptions = this.getEventSelectOptions(comp);
    //  we build 1st entry as default option
    const firstOpt = EventSelectOptionFactory.empty();
    firstOpt.name = 'default';
    if (session && session.app === App.admin) {
      firstOpt.userId = 0;
      firstOpt.userLogin = '';
      firstOpt.userName = '';
      firstOpt.isPlan = false;
    } else {
      firstOpt.userId = session?.userId ?? 0;
      firstOpt.userName = session?.userName ?? '';
      firstOpt.isPlan = null;
    }
    firstOpt.isShowDetails = true;
    firstOpt.isCurrentWeek = true;
    // default locationType null (= select all) instead of 0
    firstOpt.locationType = null;
    // if we have no select options, the default option becomes first element in list
    if (eventSelectOptions.length === 0) {
      eventSelectOptions.push(firstOpt);
      this.auth.setSessionEventSelectOption(firstOpt, comp);
    } else {
      // we have select options, and we have an "old" default - it is replaced be new default values
      // user may have changed values in default, but he must store them as a named option to keep them
      if (eventSelectOptions[0].name === 'default') {
        eventSelectOptions.splice(0, 1, firstOpt);
      // we have no old default - the new default is inserted as first option
      } else {
        eventSelectOptions.splice(0, 0, firstOpt);
      }
    }
    // we store changed eventSelectOptions in local store ...
    this.setEventSelectOptions(eventSelectOptions, comp);
  }

  public getEventSelectOptionSortElements(comp: string): Array<ISortElement> {
    const session = this.auth.getSession(comp);
    // we build sortElements from sortCriterias fo each sort field which is to be sorted, in order of appearance in array
    const sortElements: ISortElement[] = [];
    if (session && session.eventSelectOption?.sortCriterias) {
      session.eventSelectOption.sortCriterias.forEach(_ => {
        if (_.isSortCriteria) {
          switch (true) {
            // month
            case _.sortField === EventSortCriteria[0]:
              sortElements.push({sortField: _.sortField, key: 'eventBegin', object: 'event', datePart: 'M'});
              break;
            // week
            case _.sortField === EventSortCriteria[1]:
              sortElements.push({sortField: _.sortField, key: 'eventBegin', object: 'event', datePart: 'W'});
              break;
            // day
            case _.sortField === EventSortCriteria[2]:
              sortElements.push({sortField: _.sortField, key: 'eventBegin', object: 'event', datePart: 'D'});
              break;
            // user
            case _.sortField === EventSortCriteria[3]:
              sortElements.push({sortField: _.sortField, key: 'login', object: 'event'});
              sortElements.push({sortField: _.sortField, key: 'userName'});
              break;
            // locationType
            case _.sortField === EventSortCriteria[4]:
              sortElements.push({sortField: _.sortField, key: 'locationType', object: 'event'});
              break;
            // category
            case _.sortField === EventSortCriteria[5]:
              sortElements.push({sortField: _.sortField, key: 'categoryNr'});
              break;
            // contact
            case _.sortField === EventSortCriteria[6]:
              sortElements.push({sortField: _.sortField, key: 'contactDisplayNr'});
              break;
            // order
            case _.sortField === EventSortCriteria[7]:
              sortElements.push({sortField: _.sortField, key: 'issueDisplayNr'});
              break;
            default:
              break;
          }
        }
      });
    }
    return sortElements;

  }


 /**
   * stores eventSelectOptions
   * @param eventSelectOptions last event select options
   * @param comp name of calling component
   */
  public setEventSelectOptions(eventSelectOptions: Array<EventSelectOption>, comp: string): boolean | null {
    const session = this.auth.getSession(comp);
    if (session && eventSelectOptions) {
      const localUserId = session.userId;
      // we get all elements
      const userData = this.auth.getUserData(localUserId, 'eventSelectOptions', comp);
      if (userData) {
        userData.eventSelectOptions = eventSelectOptions;
        this.auth.setUserData(localUserId, 'eventSelectOptions', userData, comp);
        return true;
      }
    }
    return null;
  }


/**
 * load choices from array of all eventSelectOptions
 * we recognize a eventually choosen option (this.session.eventSelectOption) by its nr
 * we actualize date values from eventDay and build dateFrom, dateTo in all choices
 * @param isRelatedToEventDay if true, choices are related to session eventday, if false, related to today
 * @param comp name of calling component
 * @returns event select options which are stored in local storage for the session user
 */
  public getEventSelectChoices(isRelatedToEventDay: boolean, comp: string): Array<IEventSelectChoice> {
    let eventSelectChoices: Array<IEventSelectChoice> = [];
    const session = this.auth.getSession(comp);
    if (session) {
      const nrSelected = session.eventSelectOption?.nr;
      const listDay = isRelatedToEventDay ? session.calendarDay : GlobalFunctions.getStartOfDay(new Date()) ?? new Date();
      let eventSelectOptions = this.getEventSelectOptions(comp);
      if (eventSelectOptions && eventSelectOptions.length > 0) {
        eventSelectOptions.forEach((c, ix)  => {
          let dateFrom =
            c.isPreviousDay ? GlobalFunctions.addDays(listDay, -1):
            c.isPreviousWeek ? GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(listDay), -1):
            c.isPreviousMonth ? GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(listDay) ?? listDay, -1):
            c.isCurrentDay ? listDay :
            c.isCurrentWeek ? GlobalFunctions.getStartOfWeek(listDay) :
            c.isCurrentMonth ? GlobalFunctions.getStartOfMonth(listDay) :
            c.isNextDay ? GlobalFunctions.addDays(listDay, 1):
            c.isNextWeek ? GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(listDay), 1):
            c.isNextMonth ? GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(listDay) ?? listDay, 1):
            c.isDateInterval ? GlobalFunctions.addDays(listDay, (c.showFrom ?? 0) * -1):
            c.isDateRange ? c.dateFrom :
            listDay;
          let dateTo =
            c.isPreviousDay ? GlobalFunctions.addDays(listDay, -1):
            c.isPreviousWeek ? GlobalFunctions.addDays(GlobalFunctions.getStartOfWeek(listDay), -1) :
            c.isPreviousMonth ? GlobalFunctions.addDays(GlobalFunctions.getStartOfMonth(listDay) ?? listDay, -1) :
            c.isCurrentDay ? listDay :
            c.isCurrentWeek ? GlobalFunctions.addDays(GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(listDay), 1), -1) :
            c.isCurrentMonth ? GlobalFunctions.addDays(GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(listDay) ?? listDay, 1), -1):
            c.isNextDay ? GlobalFunctions.addDays(listDay, 1):
            c.isNextWeek ? GlobalFunctions.addDays(GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(listDay), 2), -1):
            c.isNextMonth ? GlobalFunctions.addDays(GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(listDay) ?? listDay, 2), -1):
            c.isDateInterval ? GlobalFunctions.addDays(listDay, c.showTo ?? 0):
            c.isDateRange ? c.dateTo :
            listDay;
          if (!dateFrom) {
            dateFrom = listDay
          }
          if (!dateTo) {
            dateTo = listDay
          }
          // isSelected is the name of session.eventSelectOptions - if there is no, the first choice is selected
          eventSelectChoices.push({nr: c.nr, name: c.name, custIssueNr: c.custIssueNr, userName: c.userName,
            dateFrom, dateTo, isPlan: c.isPlan ?? false, isSelected: nrSelected ? nrSelected === c.nr : ix === 0});
        });
      }
    }
    return eventSelectChoices;

  }

  /**
   * builds or rebuilds eventInfo with current data
   * @param event for this event we build eventInfo
   * @param comp name of calling component
   * @returns event with renewed eventInfo
   */
   public async buildEventInfo(event: Event, comp: string): Promise<Event> {
    let eventInfo: IEventInfo = {contactNr: 0};
    if (event.eventInfo && (event.eventInfo?.contactNr > 0)) {
      // we have an existing eventInfo for this event
    } else {
      // we build an empty eventInfo
      event.eventInfo = eventInfo;
    }
    if (event.contactNr > 0) {
      const contact = await this.contactService.getContactNr(event.contactNr, comp);
      // if we find a contact with this id, we renew eventInfo data
      if (contact) {
        event.eventInfo.contactNr = contact.contactNr;
        event.eventInfo.contactDisplayNr = contact.displayNr;
        event.eventInfo.contactDisplayName = contact.displayName;
        event.eventInfo.companyName = contact.companyName;
        event.eventInfo.street = contact.contactStreet ?? contact.street;
        event.eventInfo.city = contact.contactCity ?? contact.city;
        event.eventInfo.plz = contact.contactPlz ?? contact.plz;
        event.eventInfo.contactColor = contact.contactColor;
      }
    }
    return event;
  }

  /**
   * filterEvents()
   *  filters events for list (in event component) and export (in event-export component)
   * @param events (we must assure that each event has userId according to actual server and local users ...)
   * @param users array of local and server users to get userName
   * @param filterContactnr
   * @param filterIssueNr
   * @param comp name of calling component
   * @returns array of IEventListElements
   */
  public filterEvents(events: Array<Event>, users: Array<User>, filterContactnr: number, filterIssueNr: number, comp: string): Array<IEventListElement> {
    const session = this.auth.getSession(comp);
    // we build sortElements from sortCriterias fo each sort field which is to be sorted, in order of appearance in array
    const sortElements = this.getEventSelectOptionSortElements(comp);
    let eventListElements: Array<IEventListElement> = [];
    if (session && events && events?.length > 0) {
      // we build  array of events to filter and sort event elements
      eventListElements = events
      .map(_ => {
        let userName = _.login;
        // name of user in case of server or local events
        userName = users.filter(u => u.userId === _.userId)[0]?.userName ?? '';

        return {
          timeString: '',
          event: _,
          userName,
          contactNr :  _.eventInfo?.contactNr ?? 0,
          contactDisplayNr :  _.eventInfo?.contactDisplayNr ?? '',
          contactName : _.eventInfo?.contactDisplayName ?? '',
          contactStyle : StyleFactory.getBgColorStyle(_.eventInfo?.contactColor ?? '', 0),
          issueNr :  _.eventInfo?.issueNr ?? 0,
          // rounded duration is calculated if rounding on each event
          durationMinutes: _.eventDuration,
          durationHours: _.eventDuration / 60,
          // duration in milliseconds - shows time after 1.1.1970
          durationFormatted: GlobalFunctions.getTimeFormatted(_.eventDuration),
          locationTypeText: this.auth.txt[LocationType[_.locationType]]
        };
      })
      // filter undefined elements, locationType, contact and issue
      .filter(_ => {
        if (_) {
          let isFiltered = true;
          if (session.eventSelectOption?.locationType && session.eventSelectOption?.locationType >= 0) {
            isFiltered = (_.event.locationType === session.eventSelectOption?.locationType);
          }
          if (filterContactnr > 0) {
            return _.contactNr === filterContactnr && isFiltered;
          }
          return isFiltered;
        } else {
          return false;
        }
      })
      // sort according to options
      .sort(GlobalFunctions.sortFields(sortElements));
    }

    return eventListElements;
  }


/* *****************************************  local file functions start here **************** */


  /***********************************  private methods **************************************/

  private async getEventsFromFile(file: File, comp: string): Promise<Array<Event> | null> {
    const fileString = await this.getFileAsDataURL(file, comp);
    const rawEvents: Array<EventRaw> = JSON.parse(fileString);
    if (rawEvents?.length > 0) {
      // TODO do we need filter here?
      const filteredEvents = rawEvents;
      return filteredEvents.map(rawEvent => EventFactory.fromObject(rawEvent));
    } else {
      return null;
    }
  }

  /**
   * getFileAsDataURL delivers file as data url
   * @param file local file
   * @param comp component name
   */
   private getFileAsDataURL(file: File, comp: string): Promise<string> {
    const op = 'read file: ';
    const url = file.name;
    return this.fetch.getReadRequest(file)
      .catch((error: any) : any => {
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
        return null;
      });
  }



  /* *****************************************  http functions start here **************** */


  /***********************************  private methods **************************************/

  /**
   * fetchEvent()
   *  fetch event from file
   * @param url URL of event file
   * @param comp name of calling component
   * @returns array of events from file, if any - otherwise null
   */
   private async fetchEvent(url: string, comp: string): Promise<Array<Event> | null > {
    const op = 'fetch event';
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    const mode: RequestMode = 'no-cors';

    const rawEvents: EventRaw[] = await this.fetch.get<EventRaw[]>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
      return null;
    });
    if (rawEvents) {
      return rawEvents.map(rawEvent => EventFactory.fromObject(rawEvent));
    } else {
      return null;
    }
  }


}
