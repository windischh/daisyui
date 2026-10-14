import { Component,  Inject,  LOCALE_ID, OnInit, signal, SimpleChange } from '@angular/core';

import { POWDER_BLUE, WHITE } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { ConfigurationOptionHandlingFunctions } from '../../_globals/configuration-option-handling-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { ContactFactory } from '../../_db/contact-factory';
import { Contact } from '../../_db/contact';
import { Session } from '../../_db/session';2

import { OptionNameUserEvents } from '../../_enums/option-name-user-events.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { EventType } from '../../_enums/event-type.enum';

import { IChoice } from '../../_interfaces/i-choice';
import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IView } from '../../_interfaces/i-view';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { CalendarService } from '../../_services/calendar.service';
import { ContactService } from '../../_services/contact.service';
import { ProviderService } from '../../_services/provider.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { UserService } from '../../_services/user.service';

import { CalendarDayOptionsViewComponent } from '../calendar-day-options-view/calendar-day-options-view';
import { CalendarDayContactsViewComponent } from '../calendar-day-contacts-view/calendar-day-contacts-view';
import { CalendarDayGridViewComponent } from '../calendar-day-grid-view/calendar-day-grid-view';
import { CalendarDayWeekViewComponent } from '../calendar-day-week-view/calendar-day-week-view';
import { CalendarDayCardsViewComponent } from '../calendar-day-cards-view/calendar-day-cards-view';
import { CalendarDayCardFormViewComponent } from '../calendar-day-card-form-view/calendar-day-card-form-view';
import { CalendarDayTimeShiftViewComponent } from '../calendar-day-time-shift-view/calendar-day-time-shift-view';
import { CalendarDaySelectionBarComponent } from '../calendar-day-selection-bar/calendar-day-selection-bar';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'dsy-calendar-day',
  templateUrl: './calendar-day.html',
  styleUrl: './calendar-day.css',
  imports: [CalendarDaySelectionBarComponent, CalendarDayTimeShiftViewComponent, CalendarDayCardFormViewComponent, CalendarDayCardsViewComponent, CalendarDayWeekViewComponent, CalendarDayGridViewComponent, CalendarDayContactsViewComponent, CalendarDayOptionsViewComponent]
})

export class CalendarDayComponent implements OnInit {

  public name = 'CalendarDayComponent';

  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews!: Session;

  public options!: Array<ConfigurationOption>;
  public opts!: IEventOptions;
  public userOpts!: IUserEventOptions;

  public contacts!: Array<Contact>;


  // db texts
  public eventtxt: { [key: string]: string } = {};
  public contacttxt: { [key: string]: string } = {};
  public issuetxt: { [key: string]: string } = {};

  // timeSpans contain event elements of type "time span"  - for performance reason we build it for one week
  public timeSpans!:  Array<Event>;
  public linkedTimeSpans:  Array<Event> = [];

  // all events for current user
  public allEvents!: Array<Event>;

 // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // actualEvents are building the client model for actual event. Includes last event of previous day - if it reaches into this.calendarday and first event of next day
  actualEvents!: Array<Event>;
  weekActualEvents!: Array<Event>;

  // planWevents are building the client model for planned event. Includes last event of previous day - if it reaches into this.celandarday and first event of next day
  planEvents!: Array<Event>;
  weekPlanEvents!: Array<Event>;

  // references to either planEvents or actualEvents
  events!: Array<Event>;
  // oldest event day
  firstCalendarDay!: Date;

  // all events for linked user
  allLinkedUserEvents!: Array<Event>;
  // actualized events of a linked user
  linkedUserEvents!:  Array<Event>;

  // eventsChangeCounter: eventsChangeCounter as flag for the views if events has been reloaded or single event is updated, inserted
  eventsChangeCounter = 0;
  weekEventsChangeCounter = 0;
  timeSpanChangeCounter = 0;

  // is set true if events of calendarDay are loaded first time
  isDayLoadedSignal = signal(0);
  // is set true if week-view is activated - week event arrays are filled
  isWeekLoadedSignal = signal(0);
  // is set true if time span arrays are filled from DB
  isTimeSpanLoadedSignal = signal(0);

  // sessionContact  from session 
  sessionContact: Contact | undefined;

  // is increased if relevant options for woork-day-selection-bar are changed
  calendarDayChangeCounter = 0;

  timeZoneIdentifier!: string;

  // difference of browser timezone to mandant timezone - is used to set dates in component
  timeZoneDiff!: number;

  // isSelecting is true if user is enabled to select events
  isSelecting = false;
  countSelected = 0;

  // if selected events are to be shifted to another date we use targetEvents and targetCalendarDay
  targetEvents: Array<Event> | null = null;
  targetCalendarDay: Date | null = null;

  // isCreating is true if user just creates new event (in cards view) to prohibit set selecting at same time
  isCreating = false;

  // eventContainer is used when calling calendar-day-card-form-view
  eventContainer!: {updateType: UpdateType, event: Event, d: Date | null};

  // types are indexed by type-part x in time spans with types 2x
  timeSpanTypeColors!: Array<{text: string, color: string}>;
  // type 21,22 is not selectable
  timeSpanTypeChoices!: Array<IChoice>;

  // calendar-day-views - isSelectable true => visible for user selection
  v: { [key: string]: IView } = {};
  // each v entry references to array element (= view object) - isSelectable elements are shown in tabular menu
  views: Array<IView> = [
  {name: 'card-form-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'time-shift-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'week-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'grid-view', displayName: '', isSelected: true, isAutoSelected: false, isSelectable: true},
  {name: 'cards-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'contacts-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'options-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true}
  ];

  // a selected (therefore selectable) view which is unselected by another select or autoselect
  formerView!: string;

  // to use GlobalFunctions in template
  GlobalFunctions: any;

  highlightStyle = {
    'background-color': POWDER_BLUE
  };

  constructor(@Inject(LOCALE_ID) public locale: string,
    private route: ActivatedRoute,
    private router: Router,
    private configurationService: ConfigurationService,
    private contactService: ContactService,
    private calendarService: CalendarService,
    private userService: UserService,
    private logger: LogService,
    private message: MessageService,
    public auth: AuthenticationService) {
      this.views.forEach(_ => {this.v[_.name] = _});
    }

  ngOnInit() {
    // activation is not done by ngOnChanges
    this.sessionActivate();
  }


  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.refreshSignal.set(0);
      this.loadViewTexts();
      this.loadDbTexts();
      await this.getContacts();
      await this.getEventOptions();
      await this.getEvents();
      await this.actualizeWeekEvents();
      await this.actualizeTimeSpans();
      const session = this.auth.getSession(this.name);
      if (session) {
        // session is set to have it available in all sub-views
        this.sessionForViews = session;
        this.eventsChangeCounter += 1;
        this.refreshSignal.set(1);
      } else {
        // session could not be activated - duration exhausted
        this.message.info(this.name +` session must be restarted`);
        this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
        this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
      }
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
    }
  }

  // session must exist to put names...
  private loadViewTexts(): void {
    this.v['week-view'].displayName = this.auth.txt['week_view'];
    this.v['grid-view'].displayName = this.auth.txt['grid_view'];
    this.v['cards-view'].displayName = this.auth.txt['cards_view'];
    this.v['contacts-view'].displayName = this.auth.txt['contacts_view'];
    this.v['options-view'].displayName = this.auth.txt['options_view'];

  }

  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const event = EventFactory.empty(); // just for dbtxt
    const contact = ContactFactory.empty(); // just for dbtxt
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
    this.contacttxt = GlobalFunctions.objText(contact,
      'Contact', this.auth.systemTexts, language,  this.name);
  }

  private dbFailure(operation: string, message: string) {
    this.logger.error(this.auth.getSession(this.name), this.name, `${operation} failed: ${message}`);
    this.message.show(this.name + `: ${operation} failed: ${message}`);
    alert(message);
  }

  private async getContacts() {
    this.contacts = await this.contactService.getContacts(this.name);
  }

  /**
   * we get sessioncontact and options which are relevant for event presentation
   * (we must take care to actualize them every time we enter this component)
   * cContact is token from session
   * event options (can be maintained by configuaration maintenance)  are token from option file
   */
  private async getEventOptions() {
    // we build  eventContact structures in component
    const eventContactElement = this.calendarService.getEventContact(this.name);
    if (eventContactElement) {
      this.sessionContact = eventContactElement.eventContact;
    }

    // for timeSpans (and for sub-components) we need texts from general options - we load them from option rsessources (option.json)
    this.options = await this.configurationService.getConfigurationOptions(this.name);
    this.timeSpanTypeColors = [];
    this.timeSpanTypeChoices = [];
    for (let i = 0; i <= 9; i++) {
      const cat = i === 0 ? 'undefined' : i === 1 ? 'holiday' : i === 2 ? 'birthday' : i.toString();
      const category = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_span_' + cat) ?? '';
      let text = category;
      let color = '';
      let style: {};
      if (category.includes('#')) {
        text = category.substring(0, category.indexOf('#'));
        color = category.substring(category.indexOf('#'));
        style = StyleFactory.getBgColorStyle(color, 80, 2);
      } else {
        style =  {'background-color': WHITE};
      }
      this.timeSpanTypeColors.push({
        text,
        color
      });
      if (i > 2) {
        this.timeSpanTypeChoices.push({
          value: i.toString(),
          text,
          style,
          isSelected: false
        });
      }
    }
    const session = this.auth.getSession(this.name);
    if (session) {
      this.opts = ConfigurationOptionHandlingFunctions.initializeEventOptions(session, this.options);
      const user = this.auth.getUser(session.userId, this.name);
      if (user) {
        if (!user.userEventOptions) {
          // user event options are initialized with options of actual session user!!
          user.userEventOptions = ConfigurationOptionHandlingFunctions.initializeUserEventOptions(this.options);
          this.auth.setUserOptions(user.userEventOptions, session.userId, this.name);
        }
        this.userOpts = user.userEventOptions;
      }
    }
  }


  /**
   * getEvents() delivers events in this.events
   *  for calendarDay, isPlan of opts = session.eventOptions
   * getEvents is called at init, at every change of opts = session.eventOptions and at every change of a event
   */
  private async getEvents() {
    const session = this.auth.getSession(this.name);
    if (session) {
      this.allEvents = this.calendarService.getEvents(this.name);
      this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.calendarDay, false);
      this.planEvents = await this.getEventsForDate(this.allEvents, true, session.calendarDay, false);
      this.setAssocData();
      this.countSelected = 0;
      this.isSelecting = false;
      this.isCreating = false;
      this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
      this.eventsChangeCounter += 1;
      this.isDayLoadedSignal.set(1);
    }
  }

  /**
   * actualizWeekEvents() delivers week events
   *
   * if week-view or contacts-view is selected
   */
  private async actualizeWeekEvents() {
    const session = this.auth.getSession(this.name);
    if (session && (this.v['week-view'].isSelected === true || this.v['contacts-view'].isSelected === true || this.isWeekLoadedSignal )) {
      this.weekActualEvents = await this.getEventsForDate(this.allEvents, false, session.calendarDay, true);
      this.weekPlanEvents = await this.getEventsForDate(this.allEvents, true, session.calendarDay, true);
      this.weekEventsChangeCounter += 1;
      this.isWeekLoadedSignal.set(1);
    }
  }

  /**
   * actualizeTimeSpans() delivers time spans for the week from DB
   *
   * if grid-view or week-view is selected
   *
   * timeSpans are events which include time-span-info
   *
   * they are built for:
   * - automatic generated holidays (time span type 21)
   * - automatic generated birthdays (time span type 22)
   * - non-recurring time spans (recurring === 0)
   *  (recurring time spans are not realized)
   *
   *
   */
  private async actualizeTimeSpans() {
    const session = this.auth.getSession(this.name);
    if (session && (this.v['grid-view'].isSelected === true || this.v['week-view'].isSelected === true || this.isTimeSpanLoadedSignal)) {
      // begin date is first day of week, we add one day to include all possible timeZones
      const weekDay = GlobalFunctions.getWeekDay(session.calendarDay, 0, this.locale);
      const diffToWeekBegin = (weekDay + 1) * -1;
      const beginDate = GlobalFunctions.addDays(session.calendarDay, diffToWeekBegin);
      // end date is last day of week, we add one day
      const diffToWeekEnd = 8 - weekDay;
      const endDate = GlobalFunctions.addDays(session.calendarDay, diffToWeekEnd);
      // recurring timeSpans come from local user data
      const recTimeSpans = await this.userService.getRecurringTimeSpanRange(0, beginDate, endDate, this.name);
      const timeSpans = this.allEvents.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) >= GlobalFunctions.getDateInMinutes(beginDate)
        && GlobalFunctions.getDateInMinutes(_.eventBegin) <= GlobalFunctions.getDateInMinutes(endDate)
        && _.type >= EventType.timeSpanUndefined
        && _.type <= EventType.timeSpanCategory9
        && _.status < 9);
      for (let span of timeSpans) {
        // build eventInfos if contact
        if ((!span.eventInfo && (span.contactNr > 0))
          || (span.eventInfo?.contactNr !== span.contactNr)) {
            span = await this.calendarService.buildEventInfo(span, this.name);
        }
      }
      // const timeSpans = await this.eventService.getTimeSpanRange(0, beginDate, endDate, this.name);
      this.timeSpans = [];
      this.timeSpans = this.timeSpans.concat(recTimeSpans);
      this.timeSpans = this.timeSpans.concat(timeSpans);
      this.timeSpans.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
      this.timeSpanChangeCounter += 1;
      this.isTimeSpanLoadedSignal.set(1);
    }
  }

  private setAssocData() {
    this.actualEvents.forEach(_ => {
      if (_.planId > 0) {
        _.assocCount = 0;
        const ix = this.planEvents.findIndex(plan => _.planId === plan.eventId);
        if (ix >= 0) {
          _.assocEventBegin = this.planEvents[ix].eventBegin;
          _.assocEventEnd = this.planEvents[ix].eventEnd;
          _.assocDone = this.planEvents[ix].assocDone;
          _.assocCount = 1;
        }
      }
    });
    this.planEvents.forEach(_ => {
      if (_.doneId === _.eventId) {
        _.assocEventBegin = _.eventBegin;
        _.assocEventEnd = _.eventEnd;
        _.assocCount = 0;
      } else {
        let assocEventBegin: Date | undefined;
        let assocEventEnd: Date | undefined;
        let assocCount = 0;
        this.actualEvents.forEach(actual => {
          if (_.eventId === actual.planId) {
            assocEventBegin = assocEventBegin === null ? actual.eventBegin : assocEventBegin;
            assocEventEnd = actual.eventEnd;
            assocCount += 1;
          }
        });
        _.assocEventBegin = assocEventBegin;
        _.assocEventEnd = assocEventEnd;
        _.assocCount = assocCount;
      }
    });
  }

  /**
   * getEventsForDate() delivers events for calendarDay for a given array of events
   * events for calendarDay optionallye include all events of week of calendarDay
   *
   * @param events- given events to select from
   * @param isPlan - true is we get planned event
   * @param calendarDay - calendarDay
   * @param isWeek - if true, we return events for week of calendarDay - otherwise for calendarDay
   * @returns event array
   */
  private async getEventsForDate(events: Array<Event>, isPlan: boolean, calendarDay: Date, isWeek: boolean): Promise<Array<Event>> {
    const type = isPlan? 0 : 1;
    const weekDay = GlobalFunctions.getWeekDay(calendarDay, 0, this.locale);
    const previous = isWeek ? weekDay + 1 : 1;
    const next = isWeek ? 7 - weekDay : 1;
    // console.log('events - previous: ', previous);
    // console.log('events - next: ', next);
    // if isWeek is false, firstDay === calendarDay and nextDay is day after calendarDay
    const firstDay = GlobalFunctions.addDays(calendarDay, (previous - 1) * -1);
    const nextDay = GlobalFunctions.addDays(calendarDay, next);
    const prevDate = GlobalFunctions.addDays(calendarDay, previous * -1);
    const nextDate = GlobalFunctions.addDays(calendarDay, next + 1);
    let selectedEvents: Event[] = [];
    const eventsPreviousToNext = events?.filter(_ =>
        GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type === type && _.status < 9);
    if (eventsPreviousToNext ?.length > 0) {
      eventsPreviousToNext.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
      // get event which reaches from prevoius to first day
      const eventPrevious = eventsPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(firstDay, _.eventEnd)
      && GlobalFunctions.isMinuteEarlier(_.eventBegin, firstDay))[0];
      if (eventPrevious) {
        selectedEvents.push(eventPrevious);
      }
      // all events which begin from nextDay 0:00 to day after, 0:00
      const eventsTodayOrWeek = eventsPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(firstDay, _.eventBegin)
      && GlobalFunctions.isMinuteEarlier(_.eventBegin, nextDay));
      if (eventsTodayOrWeek) {
        eventsTodayOrWeek.forEach(_ => selectedEvents.push(_));
      }
      // get first event on next day
      const eventNext = eventsPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(nextDay, _.eventBegin))[0];
      if (eventNext) {
        selectedEvents.push(eventNext);
      }
      for (let event of selectedEvents) {
        // build eventInfos if contactis joined (eventInfod are not persisted ...)
        // (eventInfos are rebuilt if event is updated!)
        if ((!event.eventInfo && event.contactNr > 0)
          || (!(event.eventInfo?.contactNr && event.eventInfo?.contactNr > 0) && event.contactNr > 0)) {
            event = await this.calendarService.buildEventInfo(event, this.name);
        }
      }
    }
    return (selectedEvents);
  }

  // we await updated event data, with unchanged eventId and unchanged type
  private async eventUpdate(event: Event): Promise<boolean> {
    const session = this.auth.getSession(this.name);
    const operation = 'event update';
    let message = 'error - undefined';
    if (session && session.isPlanMaint && event.eventId > 0) {
      const formerEvent: Event = GlobalFunctions.clone(this.allEvents.find(_ => _.eventId === event.eventId));
      if (formerEvent && formerEvent.type === event.type) {
        const targetCalendarDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
        const isPlan = event.type === EventType.plan;
        const targetEvents = await this.getEventsForDate(this.allEvents, isPlan, targetCalendarDay, false);
        let isUpdatePossible = false;
        isUpdatePossible = targetEvents.length === 0 || (targetEvents.length > 0 && targetEvents.filter(_ =>
          (_.eventBegin < event.eventEnd && _.eventEnd > event.eventBegin && _.eventId !== event.eventId)).length === 0);
        if (!isUpdatePossible) {
          message = 'update not possible - other event is overlapping';
          this.dbFailure(operation, message);
          return false;
        }
        let updEvent = EventFactory.empty();
        // setting event fields from event
        updEvent = this.setEventContent(event, updEvent);
        if (event.contactNr > 0) {
          updEvent = await this.setEventContactIssueContent (event, updEvent);
        }
        updEvent.eventId = event.eventId;
        updEvent.userId = event.userId;
        updEvent.userToken = event.userToken;
        updEvent.type = event.type;
        updEvent.status = event.status;
        // console.log('updEvent:', JSON.stringify(updEvent));
        const updateId = await this.calendarService.setEvent(updEvent, this.name);
        if (updateId > 0) {
          // we actualize this.allEvents immediately .... - not necessary, is done in calling procedure
          return true;
        } else if (updateId === 0) {
          message = 'error - no confirmation for updated event';
          this.dbFailure(operation, message);
        } else if (updateId === -1) {
          message = 'etag error - file was updated by another user';
          this.dbFailure(operation, message);
        }
      } else {
        message = 'error - former event fault';
        this.dbFailure(operation, message);
      }
    } // isPlanMaint
    return false;
  }

  // we await inserted event with id 0 and with type for plan/actual
  private async eventInsert(event: Event): Promise<boolean> {
    const session = this.auth.getSession(this.name);
    const operation = 'event insert';
    let message = 'error - undefined';
    if (session && session.isPlanMaint && event.eventId === 0) {
      const targetCalendarDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
      const isPlan = event.type === EventType.plan;
      const targetEvents = await this.getEventsForDate(this.allEvents, isPlan, targetCalendarDay, false);
      let isInsertPossible = false;
      isInsertPossible = targetEvents.length === 0 || (targetEvents.length > 0 && targetEvents.filter(_ =>
        (_.eventBegin < event.eventEnd && _.eventEnd > event.eventBegin)).length === 0);
      if (!isInsertPossible) {
        message = 'insert not possible - other event is overlapping';
        this.dbFailure(operation, message);
        return false;
      }
      const insertId = this.calendarService.setEvent( event, this.name);
      // we get the new eventId as result of setEvent
      if (insertId > 0) {
        // we actualize this.allEvents immediately .... - not necessary, is done in calling procedure
        return true;
      } else if (insertId === 0) {
        message = 'error - no confirmation for updated event';
        this.dbFailure(operation, message);
      } else if (insertId === -1) {
        message = 'etag error - file was updated by another user';
        this.dbFailure(operation, message);
      }
    }
    return false;
  }

  /** --------------------------  public methods -------------------------------------------- */
  /** -------------------- calendar-day-selection-bar ------------------------- */

  public async selectCalendarDay(event: Date) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    const calendarDay: Date = GlobalFunctions.getStartOfDay(event);
    if (session) {
      if (this.isSelecting || this.v['card-form-view'].isAutoSelected) {
        // we are in selection mode and user searches target date ...
        this.targetEvents = await this.getEventsForDate(this.allEvents, session.isPlan, calendarDay, false);
        this.targetCalendarDay = calendarDay;
      } else {
        // we change to days after today - only plan is possible
        if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) < GlobalFunctions.getDateInMinutes(calendarDay)
        && !session.isPlan) {
          session.isPlan = true;
          if (this.auth.setSessionCalendarDay(session, this.name)) {
            this.sessionForViews = session;
            this.calendarDayChangeCounter += 1;
          }
        }
        // we change to days before today from today or a day after today - we change to actual
        if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  > GlobalFunctions.getDateInMinutes(calendarDay)
        && GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  <= GlobalFunctions.getDateInMinutes(session.calendarDay)) {
          session.isPlan = false;
          if (this.auth.setSessionCalendarDay(session, this.name)) {
            this.sessionForViews = session;
            this.calendarDayChangeCounter += 1;
          }
        }
        if (GlobalFunctions.getDateInMinutes(calendarDay) !== GlobalFunctions.getDateInMinutes(session.calendarDay)) {
          const oldCalendarDay = session.calendarDay;
          session.calendarDay = calendarDay;
          if (this.auth.setSessionCalendarDay(session, this.name)) {
            this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.calendarDay, false);
            this.planEvents = await this.getEventsForDate(this.allEvents, true, session.calendarDay, false);
            this.setAssocData();
            this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
            this.eventsChangeCounter += 1;
            this.sessionForViews = session;
            // if we change to another week
            if (GlobalFunctions.getYW(calendarDay) !== GlobalFunctions.getYW(oldCalendarDay)) {
              await this.actualizeWeekEvents();
              await this.actualizeTimeSpans();
            }
            if (this.actualEvents.length > 0) {
              this.userService.setUserCalendarDay(session.userId, calendarDay, this.name);
            }
          }
        }
      }
    }
  }

  public viewSelected(): string {
    let selected = ''
    this.views.forEach(_ => {
      if (_.isSelected) {
        selected = _.name;
      }
    });
    return selected;
  }

  // set selected view (if it is a selectable view - can bet set by user, isSelected is set)
  // if not selectable, we assume another part of application has set the view and set isAutoselected
  public async selectView(event: string) {
    this.views.forEach(_ => {
      if (_.name === event) {
        if (_.isSelectable) {
          _.isSelected = true;
        } else {
          // if we autoselect a view on this way,  all isSelectable views will be set to false !!
          _.isAutoSelected = true;
        }
      } else {
        if (_.isSelected) {
          this.formerView = _.name;
        }
        if (_.isSelectable) {
          _.isSelected = false;
        } else {
        // there is no automatic unselect for autoSelected
        //  _.isAutoSelected = false;
        }
      }
    });
    // actualizeWeekEvents checks if week-view ...
    if (!this.isWeekLoadedSignal) { await this.actualizeWeekEvents(); }
    if (!this.isTimeSpanLoadedSignal) { await this.actualizeTimeSpans(); }
  }

  // set selection of events
  public async setSelection() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (this.isSelecting) {
      this.isSelecting = false;
      if (session?.isPlan) {
        this.planEvents.forEach(_ => _.isSelected = false);
      } else {
        this.actualEvents.forEach(_ => _.isSelected = false);
      }
      this.events = GlobalFunctions.clone(session?.isPlan ? this.planEvents : this.actualEvents);
      this.eventsChangeCounter += 1;
      this.weekEventsChangeCounter += 1;
      this.countSelected = 0;
      this.v['time-shift-view'].isAutoSelected = false;
    } else {
      this.isSelecting = true;
      this.targetEvents = null;
      this.targetCalendarDay = null;
    }
  }

  // this update sets Session from event
  // but only for changing plan to actual and vice versa
  public async updateSessionPlan(event: Session) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    let isPlan = event.isPlan;
    let isSessionUpdated = false;
    if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  < GlobalFunctions.getDateInMinutes(event.calendarDay)) {
      isPlan = true;
    }
    if (session && session.isPlan !== isPlan) {
      session.isPlan = isPlan;
      if (this.auth.setSessionCalendarDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    if (session && isSessionUpdated) {
      // we  must renew daily events
      this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.calendarDay, false);
      this.planEvents = await this.getEventsForDate(this.allEvents, true, session.calendarDay, false);
      this.setAssocData();
      this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
      this.sessionForViews = session;
      this.eventsChangeCounter += 1;
    }
  }

  /** -------------------- calendar-day-week-view ------------------------- */

  /**
   * setting calendarDay and isPlan
   * @param event date and isPlan, set by week-view - is therefore restricted on days of the chosen week
   */
   public async selectCalendarDayAndPlan(event: {date: Date, isPlan: boolean}) {
    const calendarDay: Date = GlobalFunctions.getStartOfDay(event.date);
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (session) {
      let isSessionUpdated = false;
      let isCalendarDayUpdated = false;
      if (GlobalFunctions.getDateInMinutes(calendarDay) !== GlobalFunctions.getDateInMinutes(session.calendarDay)) {
        session.calendarDay = calendarDay;
        session.isPlan = event.isPlan;
        if (this.auth.setSessionCalendarDay(session, this.name)) {
          isSessionUpdated = true;
          isCalendarDayUpdated = true;

        }
      } else if (session.isPlan !== event.isPlan) {
        session.isPlan = event.isPlan;
        if (this.auth.setSessionCalendarDay(session, this.name)) {
          isSessionUpdated = true;
        }
      }
      if (isSessionUpdated) {
        // we  must renew daily events
        this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.calendarDay, false);
        this.planEvents = await this.getEventsForDate(this.allEvents, true, session.calendarDay, false);
        this.setAssocData();
        this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
        this.sessionForViews = session;
        this.eventsChangeCounter += 1;
        if (isCalendarDayUpdated && this.actualEvents.length > 0) {
          this.userService.setUserCalendarDay(session.userId, calendarDay, this.name);
        }
      }
    }
  }


  /** --------------------  calendar-day-grid-view ------------------------- */
  /** -------------------- calendar-day-cards-view ------------------------- */

  
  public async selectEvent(event: {isSelect: boolean, id: number}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // console.log('selectEvent:', event);
    let ix = 0;
    let count = 0;
    if (session?.isPlan) {
      ix = this.planEvents.findIndex(_ => _.eventId === event.id);
      if (ix >= 0) {
        this.planEvents[ix].isSelected = event.isSelect ? true : false;
      }
      count = this.planEvents.filter(_ => _.isSelected).length;
    } else {
      ix = this.actualEvents.findIndex(_ => _.eventId === event.id);
      if (ix >= 0) {
        this.actualEvents[ix].isSelected = event.isSelect ? true : false;
      }
      count = this.actualEvents.filter(_ => _.isSelected).length;
    }
    if (count >= 0) {
      this.countSelected = count;
    }
    if (count > 0) {
      this.v['time-shift-view'].isAutoSelected = true;
    } else {
      this.v['time-shift-view'].isAutoSelected = false;
    }
    this.events = GlobalFunctions.clone(session?.isPlan ? this.planEvents : this.actualEvents);
    this.eventsChangeCounter += 1;
  }

  /**
   * enables card-form with update types insert or update
   * @param eventContainer.updateType: insert or update
   * // TODO enhance possible type: setShow (=show content without updating) - if we have the use cases for it
   *  where a user is allowed to view but not to update ... and correct the 2 other possible types to setInsert, setUpdate
   * @param eventContainer.event: in case of update the existing event to be updated,
   *   in case of insert event is empty except event.type which indicates 0 for event, 20 for time space
   * @param eventContainer.d: calendarDay and time of inserted event
   */
  public async enableCardFormView(eventContainer: {updateType: UpdateType, event: Event, d: Date | null}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // event with type >= 20 are time spans ....
    if (session && eventContainer.updateType === UpdateType.update && eventContainer.event.type < EventType.timeSpanUndefined ) {
      // in week view we allow enabling a event entry on another day as calendarDay
      const isPlan = eventContainer.event.type === EventType.plan;
      const dayOfEvent: Date = GlobalFunctions.getStartOfDay(eventContainer.event.eventBegin);
      if (GlobalFunctions.getDateInMinutes(session.calendarDay) !== GlobalFunctions.getDateInMinutes(dayOfEvent)
      || session.isPlan !== isPlan) {
        this.selectCalendarDayAndPlan({date: dayOfEvent, isPlan});
      }
    }

    // TODO build eventContainer
    this.eventContainer = eventContainer;
    this.targetCalendarDay = null;
    this.targetEvents = null;
    this.v['card-form-view'].isAutoSelected = true;
  }

  public setCreating(isCreating: boolean) {
    this.isCreating = isCreating;
  }


  /** -------------------- calendar-day-card-form-view ------------------------- */
  /** -------------------- calendar-day-cards-view ------------------------- */
  /** -------------------- calendar-day-time-shift-view ------------------------- */

  public async updateEvent(eventContainer: {updateType: UpdateType, event: Event | null, events?: Array<Event>}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, event, events} = eventContainer;
    let message = this.auth.txt['session_timed_out__new_login'];
    let operation = '';
    let targetCalendarDay = session?.calendarDay;
    switch (updateType) {
      case UpdateType.cancelUpdate:
        // cancelUpdate is useless now - we do not block activities by isUpdated
        break;
      case UpdateType.update:
        operation = 'update event';
        message = 'update not possible - internal structure error';
        if (event && session?.isPlanMaint) {
          const isUpdated = await this.eventUpdate(event);
          targetCalendarDay = GlobalFunctions.getStartOfDay(event.eventBegin);
          if (isUpdated) {
            if (GlobalFunctions.isMinuteSame(session.calendarDay, targetCalendarDay)) {
              await this.getEvents();
              this.eventsChangeCounter += 1;
              this.setAssocData();
              await this.actualizeWeekEvents();
            } else {
              await this.getEvents();
              await this.actualizeWeekEvents();
              if (event.type === EventType.actual) {
                this.userService.setUserCalendarDay(session.userId, targetCalendarDay, this.name);
              }
            }
          } else {
            await this.getEvents();
          }
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.multipleUpdate:
        // we make multiple updates based on events ...
        operation = 'update multiple events';
        message = 'update not possible - internal structure error';
        if (session && events && session?.isPlanMaint) {
          this.refreshSignal.set(0);
          for (const _ of events) {
            if (_.eventId > 0) {
              const isUpdated =  await this.eventUpdate(_);
              if (!isUpdated) {
                this.dbFailure(operation, message);
              }
            } else {
              message = 'update not possible - no eventId';
              this.dbFailure(operation, message);
            }
          }
          await this.getEvents();
          this.eventsChangeCounter += 1;
          this.setAssocData();
          await this.actualizeWeekEvents();
          this.refreshSignal.set(1);
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.insert:
        operation = 'insert event';
        message = 'error - no confirmation for posted event';
        if (event && session?.isPlanMaint) {
          let newEvent = EventFactory.empty();
          // setting event fields from event
          newEvent = this.setEventContent(event, newEvent);
          if (event.contactNr > 0) {
            newEvent = this.setEventContactIssueContent (event, newEvent);
          }
          // setting type according to session
          newEvent.type = session.isPlan ? 0 : 1;
          const isInserted = await this.eventInsert(newEvent);
          targetCalendarDay = GlobalFunctions.getStartOfDay(newEvent.eventBegin);
          if (isInserted) {
            if (GlobalFunctions.isMinuteSame(session.calendarDay, targetCalendarDay)) {
              await this.getEvents();
              this.eventsChangeCounter += 1;
              await this.actualizeWeekEvents();
            } else {
              await this.getEvents();
              await this.actualizeWeekEvents();
            }
            if (newEvent.type === EventType.actual) {
              this.userService.setUserCalendarDay(session.userId, targetCalendarDay, this.name);
            }
          } else {
            await this.getEvents();
          }
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.copyPlanToActual:
        // falls through intentionally
      case UpdateType.multipleInsert:
        // we make multiple inserts based on events ...
        operation = 'insert multiple events';
        message = 'insert not possible - internal structure error';
        if (session && events && session.isPlanMaint) {
          this.refreshSignal.set(0);
          // setting type according to session
          let targetType = session.isPlan ? 0 : 1;
          if (updateType === UpdateType.copyPlanToActual) {
            targetType = 1;
            operation = 'insert multiple actual events from plan';
          }
          let isAllInserted = true;
          for (const _ of events) {
            let newEvent = EventFactory.empty();
            // setting event fields from event
            newEvent = this.setEventContent(_, newEvent);
            if (_.contactNr > 0) {
              newEvent = await this.setEventContactIssueContent (_, newEvent);
            }
            newEvent.type = targetType;
            const isInserted = await this.eventInsert(newEvent);
            if (!isInserted)  {
              isAllInserted = false;
            }
          }
          // isAllInserted set true if all inserts are ok
          if (isAllInserted) {
            await this.getEvents();
            this.setAssocData();
            this.eventsChangeCounter += 1;
            this.actualizeWeekEvents();
            if (targetType === EventType.actual && targetCalendarDay) {
              this.userService.setUserCalendarDay(session.userId, targetCalendarDay, this.name);
            }
          } else {
            this.dbFailure(operation, message);
            // we must actualize - some inserts could have happened ...
            await this.getEvents();
            await this.actualizeWeekEvents();
          }
          this.refreshSignal.set(1);
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.delete:
        operation = 'delete (disable) event';
        message = 'error - element for disabling was not found';
        if (event && session?.isPlanMaint) {
          const isDisabled = await this.calendarService.setEventDisabled(event.eventId, this.name);
          if (isDisabled) {
            await this.getEvents();
            this.eventsChangeCounter += 1;
            // after getEvents to get the corrected time
            await this.actualizeWeekEvents();
          } else {
            this.dbFailure(operation, message);
          }
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
    }
    // after pressing one of the "update buttons" form-view is closed
    this.v['card-form-view'].isAutoSelected = false;
  }

  // updating event and also associated events
  public async updateEventAssoc(eventContainer: {updateType: UpdateType, event: Event}) {
    // first we update event
    await this.updateEvent(eventContainer);
    const {updateType, event} = eventContainer;
    // update assoc events with contactNr, issue ids if they have changed
    // after alerting user
    if (event.type === 0) {
      let isConfirmed = false;
      for (let _ of this.actualEvents) {
        if (_.planId > 0 && _.planId === event.eventId) {
          if (!isConfirmed) { isConfirmed = confirm(this.auth.txt['set'] + ' ' + this.auth.txt['all_contact_issue_relations'] + '?')}
          if (isConfirmed) {
            if (event.contactNr > 0 || event.issueNr > 0) {
              _ = this.setEventContactIssueContent (event, _);
            }
            await this.updateEvent({updateType, event: _ });
          } else {
            break;
          }
        }
      }
    }
    if (event.type === 1) {
      const ix = this.planEvents.findIndex(_ => _.eventId === event.planId);
      if (ix >= 0) {
        // update plan event
        if (confirm(this.auth.txt['set'] + ' ' + this.auth.txt['all_contact_issue_relations'] + '?')) {
          if (event.contactNr > 0 || event.issueNr > 0) {
            this.planEvents[ix] = this.setEventContactIssueContent (event, this.planEvents[ix]);
          }
          await this.updateEvent({updateType, event: this.planEvents[ix]});
          // update other actual events
          for (let _ of this.actualEvents) {
            if (_.planId > 0 && _.planId === this.planEvents[ix].eventId && _.eventId !== event.eventId) {
              if (event.contactNr > 0 || event.issueNr > 0) {
                _ = this.setEventContactIssueContent (event, _);
              }
              await this.updateEvent({updateType, event: _});
            }
          }
        }
      }
    }
  }

  /** -------------------- calendar-day-card-form-view ------------------------- */


  public cancelCardFormView() {
    this.v['card-form-view'].isAutoSelected = false;
  }

  // insert, update, delete timespan
  public async updateTimeSpan(eventContainer: {updateType: UpdateType, event: Event}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, event} = eventContainer;
    // let contactNr = event.contactNr;
    const targetCalendarDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
    switch (updateType) {
      case UpdateType.update:
        if (session?.isPlanMaint) {
          const updEvent = EventFactory.empty();
          // setting event fields from event
          this.setEventContent(event, updEvent);
          updEvent.eventId = event.eventId;
          // we must take all event fields which are set by event service at insert and shall be unchanged
          updEvent.userId = event.userId;
          updEvent.userToken = event.userToken;
          updEvent.type = event.type;
          updEvent.status = event.status;
          updEvent.contactNr = event.contactNr;
          const updateId = this.calendarService.setEvent(updEvent, this.name);
          if (updateId > 0) {
            await this.getEvents();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (updateId === 0 ) {
            const operation = 'timeSpan update';
            const message = 'error - no confirmation for updated timeSpan';
            this.dbFailure(operation, message);
          } else if (updateId === -1) {
            alert('internal error');
          }
        } // isPlanMaint
        break;
      case UpdateType.insert:
        const newEvent = EventFactory.empty();
        // setting event fields from event
        this.setEventContent(event, newEvent);
        if (session?.isPlanMaint) {
          // in case of timespan custommer and login does not come from issue
          // newEvent.contactNr = contactNr ?? 0;
          newEvent.contactNr = event.contactNr;
          newEvent.eventId = 0;
          // category defines type !!!!!
          newEvent.type = event.type;
          const insertId = this.calendarService.setEvent(newEvent, this.name);
          if (insertId > 0) {
            await this.getEvents();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (insertId === 0) {
            const operation = 'insert timeSpan';
            const message = 'error - no confirmation for inserted timeSpans';
            this.dbFailure(operation, message);
          } else if (insertId === -1) {
            alert('internal error');
          }
        } // isPlnMaint
        break;
      case UpdateType.delete:
        if (session?.isPlanMaint) {
          const isDisabled = await this.calendarService.setEventDisabled(event.eventId, this.name);
          if (isDisabled) {
            await this.getEvents();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else {
            const operation = 'delete (disable) timeSpan';
            const message = 'error - element for disabling was not found';
            this.dbFailure(operation, message);
          }
        } // isPlanMaint
      break;
    }
    // after pressing one of the "update buttons" form-view is closed
    this.v['card-form-view'].isAutoSelected = false;
  }


  /** -------------------- calendar-day-time-shift-view ------------------------- */

  public cancelTimeShiftView() {
    this.v['time-shift-view'].isAutoSelected = false;
  }


  /** --------------------  calendar-day-contacts-view ------------------------- */



  /** -------------------- calendar-day-options-view ------------------------- */


  /**
   * updating opts in session.eventOptions - user options 1 to 7
   * @param event eventOptions - basis for updates
   */
  public async updateOpts(event: IUserEventOptions) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (session) {
      const optionKeys =  Object.keys(event);
      for (let i = 0; i <= optionKeys.length; i++) {
        // console.log('optionValue:', event[optionKeys[i]]);
        // for each option of the eventOptions - which has changed - AND is a user EventOption 1 - 6
        const enumStringType: { [key: string]: any } = OptionNameUserEvents;
        if (this.userOpts[optionKeys[i]] !== event[optionKeys[i]]
        && enumStringType[optionKeys[i]] > 0
        && enumStringType[optionKeys[i]] <= 7) {
          // we store the changed option in session
          this.userOpts[optionKeys[i]] = event[optionKeys[i]];
          if (this.auth.setSessionCalendarDay(session, this.name)) {
            this.sessionForViews = session;
            this.calendarDayChangeCounter += 1;
            // if actual options signalize that every change of opts must be persisted
            if (event.isImmediatePersist || this.userOpts.isImmediatePersist) {
              this.auth.setUserOption(event, session.userId, optionKeys[i], this.name);
            }
            // actualize opts in component - not longer necessary
            // this.getEventOptions();
          }

        }
      }
    }
  }

  /**
   * userEventOptions  shall be stored permanently as user eventOptions
   */
  public async storeOpts() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    /* // TODO not longer used ...
    // we store the user options which could be modified at options-view
    const userEventOptions: typeof OptionNameUserEvents  = OptionNameUserEvents;
    // we take only the numeric values of the enum
    const userOptionKeys = Object.keys(userEventOptions).filter(_ => Number(_) >= 0);
    for (let i = 0; i < userOptionKeys.length; i++) {
      // option name from enum
      const enumStringType: { [key: string]: any } = userOptionKeys;
      const optionName =  userEventOptions[enumStringType[i]];
      this.auth.setUserOption(session.eventOptions, session.userId, optionName, this.name);
    }
    */
    if (session) this.auth.setUserOptions(this.userOpts, session.userId, this.name);
  }


  /** --------------------------  supporting functions for public methods -------------------------------------------- */

  /**
   * setEventContent - is a supprting function in updateEvent
   * sets view-relevant fields in model event element (to update model and afterwards update DB)
   * @param view event element in view
   * @param model event element in model
   */
  private setEventContent(view: Event, model: Event): Event {
    model.summary = view.summary;
    model.description = view.description;
    model.location = view.location;
    model.locationType = view.locationType;
    model.planId = view.planId;
    model.doneId = view.doneId;
    model.eventBegin =  view.eventBegin;
    model.eventEnd =  view.eventEnd;
    model.eventDuration = view.eventDuration;
    return model;
  }

  /**
   * setEventContactContent - is a supprting function in updateEvent
   * sets view-relevant fields in model event element (to update model and afterwards update DB)
   * @param view event element in view
   * @param model event element in model
   */
  private setEventContactIssueContent(view: Event, model: Event): Event {
    model.contactNr = view.contactNr;
    model.issueNr = view.issueNr;
    model.eventInfo = view.eventInfo;
    // we (re)build eventInfo with actual data
    model = this.calendarService.buildEventInfo(model, this.name);
    return model;
  }

}


