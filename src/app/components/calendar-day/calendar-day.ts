import { Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output, signal, SimpleChange } from '@angular/core';

import { MAX_MONTHS, POWDER_BLUE, WHITE } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { ConfigurationOptionHandlingFunctions } from '../../_globals/configuration-option-handling-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { IssueFactory } from '../../_db/issue-factory';
import { ContactFactory } from '../../_db/contact-factory';
import { Contact } from '../../_db/contact';
import { Issue } from '../../_db/issue';
import { Session } from '../../_db/session';2
import { IssueSelectionFactory } from '../../_db/issue-selection-factory';
import { IssueSelection } from '../../_db/issue-selection';

import { OptionNameUserEvents } from '../../_enums/option-name-user-events.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { EventType } from '../../_enums/event-type.enum';
import { ProviderType } from '../../_enums/provider-type.enum';

import { IChoice } from '../../_interfaces/i-choice';
import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IView } from '../../_interfaces/i-view';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { EventService } from '../../_services/event.service';
import { IssueService } from '../../_services/issue.service';
import { ContactService } from '../../_services/contact.service';
import { ProviderService } from '../../_services/provider.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { UserService } from '../../_services/user.service';

import { EventDayOptionsViewComponent } from '../event-day-options-view/event-day-options-view.component';
import { EventDayIssuesViewComponent } from '../event-day-issues-view/event-day-issues-view.component';
import { EventDayGridViewComponent } from '../event-day-grid-view/event-day-grid-view.component';
import { EventDayWeekViewComponent } from '../event-day-week-view/event-day-week-view.component';
import { EventDayCardsViewComponent } from '../event-day-cards-view/event-day-cards-view.component';
import { EventDayCardFormViewComponent } from '../event-day-card-form-view/event-day-card-form-view.component';
import { EventDayTimeShiftViewComponent } from '../event-day-time-shift-view/event-day-time-shift-view.component';
import { EventDayIssueSelectViewComponent } from '../event-day-issue-select-view/event-day-issue-select-view.component';
import { EventDaySelectionBarComponent } from '../event-day-selection-bar/event-day-selection-bar.component';


@Component({
  selector: 'dsy-calendar-day',
  templateUrl: './calendar-day.html',
  styleUrl: './calendar-day.css',
  imports: [EventDaySelectionBarComponent, EventDayIssueSelectViewComponent, EventDayTimeShiftViewComponent, EventDayCardFormViewComponent, EventDayCardsViewComponent, EventDayWeekViewComponent, EventDayGridViewComponent, EventDayIssuesViewComponent, EventDayOptionsViewComponent]
})

export class EventDayComponent implements OnInit {

  @Input({required: true}) eventDayLoadCounter: number;
  @Input({required: true}) isShowEvent: boolean;
  @Input({required: true}) eventId: number;

  @Output() issueSelect = new EventEmitter<Issue>();
  @Output() sidebarHide = new EventEmitter();
  @Output() sidebarShow = new EventEmitter();
  @Output() restart = new EventEmitter();

  public name = 'EventDayComponent';

  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews: Session;

  public options: Array<ConfigurationOption>;
  public opts: IEventOptions;
  public userOpts: IUserEventOptions;

  public contacts: Array<Contact>;

  public issueSelections: Array<IssueSelection>;

  // db texts
  public eventtxt: { [key: string]: string } = {};
  public custtxt: { [key: string]: string } = {};
  public issuetxt: { [key: string]: string } = {};

  // timeSpans contain event elements of type "time span"  - for performance reason we build it for one week
  public timeSpans:  Array<Event>;
  public linkedTimeSpans:  Array<Event> = [];

  // all events for current user
  public allEvents: Array<Event>;

 // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // actualEvents are building the client model for actual event. Includes last event of previous day - if it reaches into this.eventday and first event of next day
  actualEvents: Array<Event>;
  weekActualEvents: Array<Event>;

  // planWevents are building the client model for planned event. Includes last event of previous day - if it reaches into this.eventday and first event of next day
  planEvents: Array<Event>;
  weekPlanEvents: Array<Event>;

  // references to either planEvents or actualEvents
  events: Array<Event>;
  // oldest event day
  firstEventDay: Date;

  // etag holds last etag for check at update
  private etag: string;

  // all events for linked user
  allLinkedUserEvents: Array<Event>;
  // actualized events of a linked user
  linkedUserEvents:  Array<Event>;

  // eventsChangeCounter: eventsChangeCounter as flag for the views if events has been reloaded or single event is updated, inserted
  eventsChangeCounter = 0;
  weekEventsChangeCounter = 0;
  timeSpanChangeCounter = 0;

  // is set true if events of eventDay are loaded first time
  isDayLoadedSignal = signal(0);
  // is set true if week-view is activated - week event arrays are filled
  isWeekLoadedSignal = signal(0);
  // is set true if time span arrays are filled from DB
  isTimeSpanLoadedSignal = signal(0);


  // eventContact and eventIssue are the selected contact and issue from session - adn set in session
  eventContact: Contact;
  eventIssue: Issue;
  // all issues belonging to eventContact
  eventContactIssues: Array<Issue> = [];
  // all issues belonging to eventContact and relevant at session.eventDay
  eventIssues: Array<Issue> = [];


  // eventContactRequetsed (and eventIssueRequested) are the choosen cutomer/issue in contact select (... not selected finally)
  eventContactRequested: Contact;
  eventIssueRequested: Issue;
  //  eventIssuesRequested contain all issues of the requested contact
  eventIssuesRequested: Array<Issue> = [];

  // is increased if relevant options for woork-day-selection-bar are changed
  eventDayChangeCounter = 0;

  timeZoneIdentifier: string;

  // difference of browser timezone to mandant timezone - is used to set dates in component
  timeZoneDiff: number;

  // isSelecting is true if user is enabled to select events
  isSelecting = false;
  countSelected = 0;

  // if selected events are to be shifted to another date we use targetEvents and targetEventDay
  targetEvents: Array<Event>;
  targetEventDay: Date;

  // isCreating is true if user just creates new event (in cards view) to prohibit set selecting at same time
  isCreating = false;

  // eventContainer is used when calling event-day-card-form-view
  eventContainer: {updateType: UpdateType, event: Event, d: Date};

  // types are indexed by type-part x in time spans with types 2x
  timeSpanTypeColors: Array<{text: string, color: string}>;
  // type 21,22 is not selectable
  timeSpanTypeChoices: Array<IChoice>;

  // event-day-views - isSelectable true => visible for user selection
  v: { [key: string]: IView } = {};
  // each v entry references to array element (= view object) - isSelectable elements are shown in tabular menu
  views: Array<IView> = [
  {name: 'issue-select-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'card-form-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'time-shift-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'week-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'grid-view', displayName: '', isSelected: true, isAutoSelected: false, isSelectable: true},
  {name: 'cards-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'issues-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true},
  {name: 'options-view', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: true}
  ];

  // a selected (therefore selectable) view which is unselected by another select or autoselect
  formerView: string;

  // to use GlobalFunctions in template
  GlobalFunctions: any;

  highlightStyle = {
    'background-color': POWDER_BLUE
  };

  constructor(@Inject(LOCALE_ID) public locale: string,
    private configurationService: ConfigurationService,
    private contactService: ContactService,
    private providerService: ProviderService,
    private issueService: IssueService,
    private eventService: EventService,
    private userService: UserService,
    private logger: LogService,
    private message: MessageService,
    public auth: AuthenticationService) {
      this.views.forEach(_ => {this.v[_.name] = _});
    }

  ngOnInit() {
    // activation is done by ngOnChanges
    // this.sessionActivate();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
     first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {

      if (propKey === 'eventDayLoadCounter') {
        this.sessionActivate();
      }
      // console.log('menu-item propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }

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
      await this.getLinkedUserData();
      if (this.isShowEvent) {
        // event-day was called to show a special event in card form ...
        let event = this.allEvents.filter(_ => _.eventId === this.eventId)[0];
        if (event) {
          await this.selectEventDay(event.eventBegin);
          const session = this.auth.getSession(this.name);
          const event = {updateType: UpdateType.update, event, d: session.eventDay};
          await this.enableCardFormView(event);
        } else {
          alert('event with id: ' + this.eventId + ' not found');
          // we must call sidebarShow to reset osShowEvent in header
          this.sidebarShow.emit();
        }
      }
      // session is set to have it available in all sub-views
      this.sessionForViews = this.auth.getSession(this.name);
      this.eventsChangeCounter += 1;
      this.refreshSignal.set(1);
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      // this component is default for several user types - we  restart via emit
      this.restart.emit();
    }
  }

  // session must exist to put names...
  private loadViewTexts(): void {
    this.v['week-view'].displayName = this.auth.txt['week_view'];
    this.v['grid-view'].displayName = this.auth.txt['grid_view'];
    this.v['cards-view'].displayName = this.auth.txt['cards_view'];
    this.v['issues-view'].displayName = this.auth.txt['issues_view'];
    this.v['options-view'].displayName = this.auth.txt['options_view'];

  }

  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const event = EventFactory.empty(); // just for dbtxt
    const contact = ContactFactory.empty(); // just for dbtxt
    const issue = IssueFactory.empty(); // just for dbtxt
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
    this.custtxt = GlobalFunctions.objText(contact,
      'Contact', this.auth.systemTexts, language,  this.name);
    this.issuetxt = GlobalFunctions.objText(issue,
      'Issue', this.auth.systemTexts, language,  this.name);
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
   * we get choosen issue (and contact) and options which are relevant for event presentation
   * (we must take care to actualize them every time we enter this component)
   * eventContact and eventIssue are token from session
   * event options (can be maintained by configuaration maintenance)  are token from option file
   */
  private async getEventOptions() {
    // we build eventIssue structures in component
    const session = this.auth.getSession(this.name);
    this.eventIssuesRequested = [];
    this.eventIssues = [];

    // we build eventIssue and eventContact structures in component
    this.eventIssue = await this.eventService.getEventIssue(this.name);
    this.eventIssueRequested = this.eventIssue;
    const eventCustElement = await this.eventService.getEventContact(this.name);
    this.eventContact = eventCustElement.eventContact;
    this.eventContactRequested = this.eventContact;

    // load this.eventIssues - also if contactNr is 0
    let custIssues = this.issueService.getMyIssuesCust(session.contactNr, this.name);
    if (custIssues?.length > 0) {
      this.eventIssuesRequested = this.selectIssuesForDate(custIssues);
      this.eventContactIssues = custIssues;
      // if user should not choose the contact issues at his event-form, we leave eventIssues empty
      const isChooseAllContactIssues = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_events_isChooseAllContactIssues') ?? false;
      if (isChooseAllContactIssues && session.contactNr > 0) {
        this.eventIssues = this.selectIssuesForDate(this.eventContactIssues) ?? [];
      } else {
        this.eventIssues = [];
      }
    }
    // eventIssue must be an element of eventIssues anyway
    if (this.eventIssues?.findIndex(_ => _.issueProviderId === this.eventIssue.issueProviderId
      && _.nExternalIssueId === this.eventIssue.nExternalIssueId
      && _.sExternalIssueId === this.eventIssue.sExternalIssueId) < 0
      && this.eventIssue.issueProviderId > 0) {
      this.eventIssues.push(this.eventIssue);
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
    this.issueSelections = await this.issueService.getIssueSelections(this.name);
    this.opts = ConfigurationOptionHandlingFunctions.initializeEventOptions(session, this.options);
    const user = this.auth.getUser(session.userId, this.name);
    if (!user.userEventOptions) {
      // user event options are initialized with options of actual session user!!
      user.userEventOptions = ConfigurationOptionHandlingFunctions.initializeUserEventOptions(this.options);
      this.auth.setUserOptions(user.userEventOptions, session.userId, this.name);
    }
    this.userOpts = user.userEventOptions;
  }

  /**
   * selects issues to show in issue-select-view (and to have as choosable issues in event-form)
   *  we select all issues with begin date is before or at today
   *  and which are not done
   */
  private selectIssuesForDate(issues: Array<Issue>): Array<Issue> {
   // we take all issues which are not finished and have date interval starts at eventDay
    const session = this.auth.getSession(this.name);
    return issues
    .filter(_ => !_.issueDateFinished
      && (!_.issueDateFrom || GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(session.eventDay, 1) ) < GlobalFunctions.getDateInMinutes(_.issueDateFrom) ))
    // and sort on interval begin
    .sort((a, b) => GlobalFunctions.getDateInMinutes(a.issueDateFrom ?? session.eventDay) - GlobalFunctions.getDateInMinutes(b.issueDateFrom ?? session.eventDay) );
  }


  /**
   * getEvents() delivers events in this.events
   *  for eventDay, isPlan of opts = session.eventOptions
   * getEvents is called at init, at every change of opts = session.eventOptions and at every change of a event
   */
  private async getEvents() {
    const session = this.auth.getSession(this.name);
    this.allEvents = await this.eventService.getEvents(0, this.name);
    // we rebuild recurring time spans in local storage depending on latest calendar entry
    if (this.allEvents.length > 0) {
      // we search oldest
      this.firstEventDay = this.allEvents.reduce((a,b) => a.eventBegin.getTime() <  b.eventBegin.getTime() ? a : b).eventBegin;
      // loadRecurringTimeSpans checks if startDate is already respected ...
      await this.eventService.loadRecurringTimeSpans(session.userId, this.name, this.firstEventDay);
    }
    this.etag = this.eventService.getEtag(this.name);
    this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.eventDay, false);
    this.planEvents = await this.getEventsForDate(this.allEvents, true, session.eventDay, false);
    this.setAssocData();
    this.countSelected = 0;
    this.isSelecting = false;
    this.isCreating = false;
    this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
    this.eventsChangeCounter += 1;
    this.isDayLoadedSignal.set(1);
  }

  /**
   * actualizWeekEvents() delivers week events
   *
   * if week-view or issues-view is selected
   */
  private async actualizeWeekEvents() {
    const session = this.auth.getSession(this.name);
    if (this.v['week-view'].isSelected === true || this.v['issues-view'].isSelected === true || this.isWeekLoadedSignal ) {
      this.weekActualEvents = await this.getEventsForDate(this.allEvents, false, session.eventDay, true);
      this.weekPlanEvents = await this.getEventsForDate(this.allEvents, true, session.eventDay, true);
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
    if (this.v['grid-view'].isSelected === true || this.v['week-view'].isSelected === true || this.isTimeSpanLoadedSignal) {
      // begin date is first day of week, we add one day to include all possible timeZones
      const weekDay = GlobalFunctions.getWeekDay(session.eventDay, 0, this.locale);
      const diffToWeekBegin = (weekDay + 1) * -1;
      const beginDate = GlobalFunctions.addDays(session.eventDay, diffToWeekBegin);
      // end date is last day of week, we add one day
      const diffToWeekEnd = 8 - weekDay;
      const endDate = GlobalFunctions.addDays(session.eventDay, diffToWeekEnd);
      // recurring timeSpans come from local user data
      const recTimeSpans = await this.eventService.getRecurringTimeSpanRange(0,  beginDate, endDate, this.name);
      const timeSpans = this.allEvents.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) >= GlobalFunctions.getDateInMinutes(beginDate)
        && GlobalFunctions.getDateInMinutes(_.eventBegin) <= GlobalFunctions.getDateInMinutes(endDate)
        && _.type >= EventType.timeSpanUndefined
        && _.type <= EventType.timeSpanCategory9
        && _.status < 9);
      for (let span of timeSpans) {
        // build eventInfos if contact
        if ((!span.eventInfo && (span.contactNr > 0))
          || (span.eventInfo?.contactNr !== span.contactNr)) {
            span = await this.eventService.buildEventInfo(span, this.name);
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
        let assocEventBegin: Date = null;
        let assocEventEnd: Date;
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
   * getEventsForDate() delivers events for eventDay for a given array of events
   * events for eventDay optionallye include all events of week of eventDay
   *
   * @param events- given events to select from
   * @param isPlan - true is we get planned event
   * @param eventDay - eventDay
   * @param isWeek - if true, we return events for week of eventDay - otherwise for eventDay
   * @returns event array
   */
  private async getEventsForDate(events: Array<Event>, isPlan: boolean, eventDay: Date, isWeek: boolean): Promise<Array<Event>> {
    const type = isPlan? 0 : 1;
    const weekDay = GlobalFunctions.getWeekDay(eventDay, 0, this.locale);
    const previous = isWeek ? weekDay + 1 : 1;
    const next = isWeek ? 7 - weekDay : 1;
    // console.log('events - previous: ', previous);
    // console.log('events - next: ', next);
    // if isWeek is false, firstDay === eventDay and nextDay is day after eventDay
    const firstDay = GlobalFunctions.addDays(eventDay, (previous - 1) * -1);
    const nextDay = GlobalFunctions.addDays(eventDay, next);
    const prevDate = GlobalFunctions.addDays(eventDay, previous * -1);
    const nextDate = GlobalFunctions.addDays(eventDay, next + 1);
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
        // build eventInfos if contact or issue is joined (eventInfod are not persisted ...)
        // (eventInfos are rebuilt if event is updated!)
        if ((!event.eventInfo && (event.contactNr > 0 || event.issueProviderId > 0))
          || (!(event.eventInfo?.contactNr > 0) && event.contactNr > 0)
          || (!(event.eventInfo?.issueProviderId > 0) && event.issueProviderId > 0)) {
            event = await this.eventService.buildEventInfo(event, this.name);
        }
      }
    }
    return (selectedEvents);
  }


  /*
  private getLinkedUser(): User {
    const session = this.auth.getSession(this.name);
    const linkedUser = this.auth.getLinkedUser(this.name);
    // first we check linked user -  we actualize data in eventOptions
    if (linkedUser && linkedUser.userId > 0) {
      session.linkedUserId = linkedUser.userId;
      session.linkedUserName = linkedUser.userName;
      // TODO store linked user login (from authorizations - if linked user event is at web server)
      if (this.auth.setSessionEventDay(session, this.name)) {
        this.sessionForViews = session;
        this.eventsChangeCounter += 1;
      }
    } else {
      session.linkedUserId = 0;
      session.linkedUserName = '';
      session.isShowLinkedUser = false;
      if (this.auth.setSessionEventDay(session, this.name)) {
        this.sessionForViews = session;
        this.eventsChangeCounter += 1;
      }
    }
    return linkedUser;
  }
  */

  private async getLinkedUserData() {
    const session = this.auth.getSession(this.name);
    // we get data if session has linked userd  ...
    if (session.linkedUserId > 0) {
      this.allLinkedUserEvents = await this.eventService.getEvents(session.linkedUserId, this.name);
      this.etag = this.eventService.getEtag(this.name);
      await this.actualizeLinkedUserData();
    } else {
      this.linkedUserEvents = [];
      this.linkedTimeSpans = [];
    }
  }

  private async actualizeLinkedUserData() {
    const session = this.auth.getSession(this.name);
    if (session.linkedUserId > 0) {
      const prevDate: Date = GlobalFunctions.addDays(session.eventDay, -1);
      const nextDate: Date = GlobalFunctions.addDays(session.eventDay, 2);
      // type is 0 - we show only planned event
      this.linkedUserEvents = this.allLinkedUserEvents.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type === 0
        && _.status < 9);
      // timee spans are events with type 2x together with recurring time spans
      const linkedTimeSpans = this.allLinkedUserEvents.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9
        && _.status < 9);
      const linkedRecurringTimeSpans = await this.eventService.getRecurringTimeSpanRange( session.linkedUserId, prevDate, nextDate, this.name);
      this.etag = this.eventService.getEtag(this.name);
      this.linkedTimeSpans = linkedTimeSpans.concat(linkedRecurringTimeSpans);
      this.linkedTimeSpans.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
      this.timeSpanChangeCounter += 1;
    }
  }

  // we await updated event data, with unchanged eventId and unchanged type
  private async eventUpdate(event: Event): Promise<boolean> {
    const session = this.auth.getSession(this.name);
    const operation = 'event update';
    let message = 'error - undefined';
    if (session.isPlanMaint && event.eventId > 0) {
      const formerEvent: Event = GlobalFunctions.clone(this.allEvents.find(_ => _.eventId === event.eventId));
      if (formerEvent && formerEvent.type === event.type) {
        const targetEventDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
        const isPlan = event.type === EventType.plan;
        const targetEvents = await this.getEventsForDate(this.allEvents, isPlan, targetEventDay, false);
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
        if (event.contactNr > 0 || event.issueProviderId > 0) {
          updEvent = await this.setEventIssueContent (event, updEvent);
        }
        updEvent.eventId = event.eventId;
        // we must take all event fields which are set by event service at insert and shall be unchanged
        updEvent.mandantId = event.mandantId;
        updEvent.userId = event.userId;
        updEvent.userToken = event.userToken;
        updEvent.type = event.type;
        updEvent.status = event.status;
        // console.log('updEvent:', JSON.stringify(updEvent));
        const updateId = await this.eventService.setEvent(event.eventId, updEvent, this.name, this.etag);
        if (updateId > 0) {
          // we actualize this.allEvents immediately .... - not necessary, is done in calling procedure
          // this.allEvents = await this.eventService.getEvents(0, this.name);
          updEvent = await this.eventService.getEvent(updateId, this.name);
          if (updEvent.issueProviderId > 0) {
            const provider = this.providerService.getProvider(0, updEvent.issueProviderId, this.name);
            if (updEvent.type === 1 && !updEvent.isStoredAtIssue && provider?.isStoreIssueEvent && (provider?.type === ProviderType.server || (provider?.type === ProviderType.jira  && provider?.isStoreJiraIssueEventImmediately))) {
              alert(provider.providerName + ' - ' +this.auth.txt['login_necessary']);
            }
          }
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
    if (session.isPlanMaint && event.eventId === 0) {
      const targetEventDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
      const isPlan = event.type === EventType.plan;
      const targetEvents = await this.getEventsForDate(this.allEvents, isPlan, targetEventDay, false);
      let isInsertPossible = false;
      isInsertPossible = targetEvents.length === 0 || (targetEvents.length > 0 && targetEvents.filter(_ =>
        (_.eventBegin < event.eventEnd && _.eventEnd > event.eventBegin)).length === 0);
      if (!isInsertPossible) {
        message = 'insert not possible - other event is overlapping';
        this.dbFailure(operation, message);
        return false;
      }
      const insertId = await this.eventService.setEvent(event.eventId, event, this.name, this.etag);
      // we get the new eventId as result of setEvent
      if (insertId > 0) {
        // we actualize this.allEvents immediately .... - not necessary, is done in calling procedure
        // this.allEvents = await this.eventService.getEvents(0, this.name);
        event = await this.eventService.getEvent(insertId, this.name);
        if (event?.issueProviderId > 0) {
          const provider = this.providerService.getProvider(0, event.issueProviderId, this.name);
          if (event.type === 1 && !event.isStoredAtIssue && provider?.isStoreIssueEvent && (provider?.type === ProviderType.server || (provider?.type === ProviderType.jira  && provider?.isStoreJiraIssueEventImmediately))) {
            alert(provider.providerName + ' - ' +this.auth.txt['login_necessary']);
          }
        }
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
  /** -------------------- event-day-selection-bar ------------------------- */

  public async selectEventDay(event: Date) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    const eventDay: Date = GlobalFunctions.getStartOfDay(event);
    if (this.isSelecting || this.v['card-form-view'].isAutoSelected) {
      // we are in selection mode and user searches target date ...
      this.targetEvents = await this.getEventsForDate(this.allEvents, session.isPlan, eventDay, false);
      this.targetEventDay = eventDay;
    } else {
      // we change to days after today - only plan is possible
      if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) < GlobalFunctions.getDateInMinutes(eventDay)
      && !session.isPlan) {
        session.isPlan = true;
        if (this.auth.setSessionEventDay(session, this.name)) {
          this.sessionForViews = session;
          this.eventDayChangeCounter += 1;
        }
      }
      // we change to days before today from today or a day after today - we change to actual
      if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  > GlobalFunctions.getDateInMinutes(eventDay)
      && GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  <= GlobalFunctions.getDateInMinutes(session.eventDay)) {
        session.isPlan = false;
        if (this.auth.setSessionEventDay(session, this.name)) {
          this.sessionForViews = session;
          this.eventDayChangeCounter += 1;
        }
      }
      if (GlobalFunctions.getDateInMinutes(eventDay) !== GlobalFunctions.getDateInMinutes(session.eventDay)) {
        const oldEventDay = session.eventDay;
        session.eventDay = eventDay;
        if (this.auth.setSessionEventDay(session, this.name)) {
          // eventIssues might change due to new date:
          const isChooseAllContactIssues = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_events_isChooseAllContactIssues') ?? false;
          if (isChooseAllContactIssues && session.contactNr > 0) {
            this.eventIssues = this.selectIssuesForDate(this.eventContactIssues) ?? [];
          }
          this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.eventDay, false);
          this.planEvents = await this.getEventsForDate(this.allEvents, true, session.eventDay, false);
          this.setAssocData();
          this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
          this.eventsChangeCounter += 1;
          this.sessionForViews = session;
          // if we change to another week
          if (GlobalFunctions.getYW(eventDay) !== GlobalFunctions.getYW(oldEventDay)) {
            await this.actualizeWeekEvents();
            await this.actualizeTimeSpans();
          }
          await this.actualizeLinkedUserData();
          if (this.actualEvents.length > 0) {
            this.userService.setUserEventDay(session.userId, eventDay, this.name);
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
      if (session.isPlan) {
        this.planEvents.forEach(_ => _.isSelected = false);
      } else {
        this.actualEvents.forEach(_ => _.isSelected = false);
      }
      this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
      this.eventsChangeCounter += 1;
      this.weekEventsChangeCounter += 1;
      this.countSelected = 0;
      this.v['time-shift-view'].isAutoSelected = false;
    } else {
      this.isSelecting = true;
      this.targetEvents = null;
      this.targetEventDay = null;
      if (this.v['issue-select-view'].isAutoSelected === true) {
        this.cancelIssueSelectView();
      }
    }
  }

  // this update sets Session from event
  // but only for changing plan to actual and vice versa
  public async updateSessionPlan(event: Session) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    let isPlan = event.isPlan;
    let isSessionUpdated = false;
    if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  < GlobalFunctions.getDateInMinutes(event.eventDay)) {
      isPlan = true;
    }
    if (session.isPlan !== isPlan) {
      session.isPlan = isPlan;
      if (this.auth.setSessionEventDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    // with updateOpts it is also possible to change the user of plan
    if (session.externalUserId !== event.externalUserId) {
      session.externalUserId = event.externalUserId;
      if (this.auth.setSessionEventDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    if (isSessionUpdated) {
      // we  must renew daily events
      this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.eventDay, false);
      this.planEvents = await this.getEventsForDate(this.allEvents, true, session.eventDay, false);
      this.setAssocData();
      this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
      this.sessionForViews = session;
      this.eventsChangeCounter += 1;
    }
  }


  /** -------------------- event-day-issue-select-view ------------------------- */


  /**
   * request contact data and all his issues
   * (... is used also by issues-view when contact is requested ...)
   *
   *  @param contactNr - this contact is set in eventContactRequested and therefor shown in issue-select-view
   *
  */
  public async requestContact(contactNr: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    // console.log('get issues for custId:', contactNr);
    if (contactNr !== this.eventContactRequested.contactNr) {
      this.eventIssuesRequested = [];
      this.eventContactRequested = ContactFactory.empty();
      // getContactIssues from session delivers actual data cause we actualized them before by getIssue()
      const issues = this.issueService.getMyIssuesCust(contactNr, this.name);
      if (issues?.length > 0) {
        this.eventIssuesRequested = this.selectIssuesForDate(issues);
      }
      const contact = await this.contactService.getContactNr(contactNr, this.name);
      if (contact) {
        this.eventContactRequested = contact;
      } else {
        const session = this.auth.getSession(this.name);
        // in case of not found contact we remember custId in displayNr ....
        this.eventContactRequested.contactNr = contactNr;
        this.eventContactRequested.displayNr = contactNr.toString();
        // name is set to txt + custId  - so we can differ contacts which have not been found ....
        this.eventContactRequested.name = (session.serviceLevel.contact === 1 ? this.auth.txt['contact'] : this.auth.txt['contact']) + ': ' + contactNr.toString();
      }
    }

  }


  /**
   * issue is requested to be shown
   * so we load issue - that means, loading contact of issue as eventContact
   *  and loading all issues of eventContact as eventIssuesRequested
   *  and indicating rewuested issue as eventIssueRequested
   * @param issueId -id of issue which is choosen
   */
  public async requestIssue(issueId: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate(); }
    const issue = this.issueService.getIssue(issueId, this.name);
    if (issue?.status < 9 ) {
      this.eventIssueRequested = issue;
      const contactNr = issue.contactNr ?? 0;
      await this.requestContact(contactNr);
    }

  }

  /**
   * rewuestEventIssues() loads eventIssuesRequested (again)
   *  is used to activate eventIssuesRequested if they have not been loaded before
   *  (in case of isChooseAllContactIssues === false)
   * @param event.contactNr -id of contact which is choosen
   * @param event.isMyIssue - issues are assigned to me
   * @param event.isStarted - only issues have dateFrom <= eventDay
   * @param event.isActive - issues which are not finished
   * @param event.isParent - issues which have subtasks
   * @param event.isSub - issues which have parent
   */
   public async requestEventIssues(event: {contactNr: number, isMyIssue: boolean, isStarted: boolean, isActive: boolean, isParent: boolean, isSub: boolean}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate(); }
    const {contactNr: contactNr, isMyIssue, isStarted, isActive, isParent, isSub} = event;
    this.eventIssuesRequested = [];
    let issues: Array<Issue>;
    // we load issues for  customeer - if isMyIssue, than only issue where user is the assignee
    if (isMyIssue) {
      issues = this.issueService.getMyIssuesCust(contactNr, this.name);
    } else {
      issues = this.issueService.getIssuesCust(contactNr, this.name);
    }
    if (issues?.length > 0) {
      const session = this.auth.getSession(this.name);
      // isStared - we select only issues which has been already started
      if (isStarted) {
        issues = issues.filter(_ => (!_.issueDateFrom || GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(session.eventDay, 1) ) > GlobalFunctions.getDateInMinutes(_.issueDateFrom) ));
      }
      // isActive - we exclude finished issues
      if (isActive) {
        issues = issues.filter(_ => !_.issueDateFinished);
      }
      // !isParent - we exclude all issues which have subtasks
      if (!isParent) {
        issues = issues.filter(_ => {
          const subtasks = _.getSubtasks();
          return subtasks?.length === 0;
        });
      }
      // !isSub - we exclude issues which are subtasks
      if (!isSub) {
        issues = issues.filter(_ => !_.hasParent);
      }
      if (issues?.length > 0) {
        // and sort on interval begin
        issues.sort((a, b) => GlobalFunctions.getDateInMinutes(a.issueDateFrom ?? session.eventDay) - GlobalFunctions.getDateInMinutes(b.issueDateFrom ?? session.eventDay) );
        this.eventIssuesRequested = issues;
      }
    }

  }


  /**
   * contactNr is defined as selectable contact in this.eventContact and in session
   *
   * @param contactNr
   */
  public async selectContact(contactNr: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    if (contactNr > 0) {
      const contact = await this.contactService.getContactNr(contactNr, this.name);
      if (contact) {
        this.auth.setSessionIssueId(0, this.name);
        this.auth.setSessionContactId(contactNr, this.name);
        // we push issueSekection (check on existing selections is made by issueService)
        const issueSelected = IssueSelectionFactory.empty();
        issueSelected.contactNr = contact.contactNr;
        issueSelected.contactName = contact.name;
        issueSelected.displayNr = contact.displayNr;
        this.issueService.pushIssueSelections(issueSelected, this.name);
        await this.getEventOptions();
        this.cancelIssueSelectView();
      }
    } else {
      // if no contact is choosen, we set back session ids
      this.auth.setSessionIssueId(0, this.name);
      this.auth.setSessionContactId(0, this.name);
      await this.getEventOptions();
      this.cancelIssueSelectView();
    }
  }

/**
 *  selectIssue()
 *  (... is used also by issues-view ...)
 *  a new session issue  is built with the selected issue
 *  all isssue (eventIssue,....) and contact dependent data are renewed by this.getEventOptions();
 * @param issueId is the id of selected issue
 *
 */
  public async selectIssue(issueId: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (issueId !== this.eventIssue.issueId) {
      const issue = this.issueService.getIssue(issueId, this.name);
      if (issue) {
        const provider = this.providerService.getProvider(0, issue.issueProviderId, this.name);
        let contactName = '';
        if (issue.contactNr > 0) {
          const contact = await this.contactService.getContactNr(issue.contactNr, this.name);
          if (contact) {
            contactName = contact.name;
          }
        }
        // we push issueSekection (check on existing selections is made by issueService)
        const issueSelected = IssueSelectionFactory.empty();
        issueSelected.contactNr = issue.contactNr ?? 0;
        issueSelected.contactName = contactName;
        issueSelected.displayNr = issue.displayNr;
        issueSelected.issueProviderId = issue.issueProviderId;
        issueSelected.providerUrl = provider.providerUrl;
        issueSelected.login = issue.login;
        issueSelected.nExternalIssueId = issue.nExternalIssueId;
        issueSelected.sExternalIssueId = issue.sExternalIssueId;
        issueSelected.issueText = issue.summary;
        issueSelected.dateFrom = issue.issueDateFrom;
        issueSelected.dateTo = issue.issueDateTo;
        this.issueService.pushIssueSelections(issueSelected, this.name);
        // we actualize session independent of emitted event to have the latest session date for
        this.auth.setSessionIssueId(issue.issueId, this.name);
        const contactNr = issue.contactNr ?? 0;
        // session contact id set to id, even if we have not found a contact for it
        this.auth.setSessionContactId(contactNr, this.name);
        await this.getEventOptions();
        this.issueSelect.emit(issue);
        // issueSelect can come from issues-view also, but in this case we leave the view visible ...
        this.cancelIssueSelectView();
      }
    }
  }

  public async updateIssueStatus(event: {status: number, id: number}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    let ix: number;
    let iy: number;
    const {status, id} = event;
    // we set status in both issue lists and in eventIssue ..
    // TODO we must check issueProvider - set status is allowed only for client, server
    // for providers with configuration for status update we must map status done to provider rules ....
    if (id === this.eventIssue.issueId) {
      this.eventIssue.status = status;
    }
    ix = this.eventIssuesRequested.findIndex(_ => _.issueId === id);
    if (ix >= 0) {
      this.eventIssuesRequested[ix] = this.issueService.getIssue(id, this.name);
      const issueEtag = this.issueService.getEtag(this.name);
      this.eventIssuesRequested[ix].status = status;
      // we set issue without isUpdatingIssueEvent flag - status might be updated only if user has serviceLevel.maint > 0
      await this.issueService.setIssue(this.eventIssuesRequested[ix], this.name, issueEtag);
    }
    iy = this.eventIssues.findIndex(_ => _.issueId === id);
    if (iy >= 0) {
      this.eventIssues[iy] = this.issueService.getIssue(id, this.name);
      const issueEtag = this.issueService.getEtag(this.name);
      this.eventIssues[iy].status = status;
      // we set issue without isUpdatingIssueEvent flag - status might be updated only if user has serviceLevel.maint > 0
      await this.issueService.setIssue(this.eventIssues[iy], this.name, issueEtag);
    }
  }

  public async cancelIssueSelectView() {
    await this.getEventOptions();
    if ( this.v['issue-select-view'].isAutoSelected) {
      this.v['issue-select-view'].isAutoSelected = false;
      this.v[this.formerView].isSelected = true;
    }
  }

  /** -------------------- event-day-week-view ------------------------- */

  /**
   * setting eventDay and isPlan
   * @param event date and isPlan, set by week-view - is therefore restricted on days of the chosen week
   */
   public async selectEventDayAndPlan(event: {date: Date, isPlan: boolean}) {
    const eventDay: Date = GlobalFunctions.getStartOfDay(event.date);
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    let isSessionUpdated = false;
    let isEventDayUpdated = false;
    if (GlobalFunctions.getDateInMinutes(eventDay) !== GlobalFunctions.getDateInMinutes(session.eventDay)) {
      session.eventDay = eventDay;
      session.isPlan = event.isPlan;
      if (this.auth.setSessionEventDay(session, this.name)) {
        isSessionUpdated = true;
        isEventDayUpdated = true;

      }
    } else if (session.isPlan !== event.isPlan) {
      session.isPlan = event.isPlan;
      if (this.auth.setSessionEventDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    if (isSessionUpdated) {
      // we  must renew daily events
      this.actualEvents = await this.getEventsForDate(this.allEvents, false, session.eventDay, false);
      this.planEvents = await this.getEventsForDate(this.allEvents, true, session.eventDay, false);
      this.setAssocData();
      this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
      this.sessionForViews = session;
      this.eventsChangeCounter += 1;
      if (isEventDayUpdated && this.actualEvents.length > 0) {
        this.userService.setUserEventDay(session.userId, eventDay, this.name);
      }
    }
  }


  /** --------------------  event-day-grid-view ------------------------- */
  /** -------------------- event-day-cards-view ------------------------- */

  public async setLinkedUser(event: boolean) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (event === true && session.linkedUserId > 0) {
      session.isShowLinkedUser = true;
      /*
      data for linked user are loaded anyway ...
      if (this.auth.setSessionEventDay(session, this.name)) {
        this.sessionForViews = session;
        // in order to change view in view ...
        this.eventsChangeCounter += 1;
        this.getLinkedUserData();
      }
      */
    } else {
      session.isShowLinkedUser = false;
    }
    this.auth.setSessionEventDay(session, this.name);
    this.sessionForViews = session;
    // in order to change view in view ...
    this.eventsChangeCounter += 1;
  }

  public async selectEvent(event: {isSelect: boolean, id: number}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // console.log('selectEvent:', event);
    let ix = 0;
    let count = 0;
    if (session.isPlan) {
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
    this.events = GlobalFunctions.clone(session.isPlan ? this.planEvents : this.actualEvents);
    this.eventsChangeCounter += 1;
  }

  /**
   * enables card-form with update types insert or update
   * @param event.updateType: insert or update
   * // TODO enhance possible type: setShow (=show content without updating) - if we have the use cases for it
   *  where a user is allowed to view but not to update ... and correct the 2 other possible types to setInsert, setUpdate
   * @param event.event: in case of update the existing event to be updated,
   *   in case of insert event is empty except event.type which indicates 0 for event, 20 for time space
   * @param event.d: eventDay and time of inserted event
   */
  public async enableCardFormView(event: {updateType: UpdateType, event: Event, d: Date}) {
    // we start with hiding sidebar to assure that sidebar is already hidden when  card form is activated
    this.sidebarHide.emit();
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // event with type >= 20 are time spans ....
    if (event.updateType === UpdateType.update && event.event.type < EventType.timeSpanUndefined ) {
      // in week view we allow enabling a event entry on another day as eventDay
      const isPlan = event.event.type === EventType.plan;
      const dayOfEvent: Date = GlobalFunctions.getStartOfDay(event.event.eventBegin);
      if (GlobalFunctions.getDateInMinutes(session.eventDay) !== GlobalFunctions.getDateInMinutes(dayOfEvent)
      || session.isPlan !== isPlan) {
        this.selectEventDayAndPlan({date: dayOfEvent, isPlan});
      }
    }

    // TODO build eventContainer
    this.eventContainer = event;
    this.targetEventDay = null;
    this.targetEvents = null;
    this.v['card-form-view'].isAutoSelected = true;
  }

  public setCreating(isCreating: boolean) {
    this.isCreating = isCreating;
  }


  /** -------------------- event-day-card-form-view ------------------------- */
  /** -------------------- event-day-cards-view ------------------------- */
  /** -------------------- event-day-time-shift-view ------------------------- */

  public async updateEvent(event: {updateType: UpdateType, event: Event, events?: Array<Event>}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, event, events} = event;
    let message = this.auth.txt['session_timed_out__new_login'];
    let operation = '';
    let targetEventDay = session.eventDay;
    switch (updateType) {
      case UpdateType.cancelUpdate:
        // cancelUpdate is useless now - we do not block activities by isUpdated
        break;
      case UpdateType.update:
        operation = 'update event';
        message = 'update not possible - internal structure error';
        if (session.isPlanMaint) {
          const isUpdated = await this.eventUpdate(event);
          targetEventDay = GlobalFunctions.getStartOfDay(event.eventBegin);
          if (isUpdated) {
            if (GlobalFunctions.isMinuteSame(session.eventDay, targetEventDay)) {
              await this.getEvents();
              this.eventsChangeCounter += 1;
              this.setAssocData();
              await this.actualizeWeekEvents();
            } else {
              await this.getEvents();
              await this.actualizeWeekEvents();
              if (event.type === EventType.actual) {
                this.userService.setUserEventDay(session.userId, targetEventDay, this.name);
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
        if (session.isPlanMaint) {
          this.refreshSignal.set(0);
          for (const _ of events) {
            if (_.eventId > 0) {
              const isUpdated =  await this.eventUpdate(_);
              // in a series of updates we must actualize etag in between ...
              // (in other updates this is done in this.getEvents())
              this.etag = this.eventService.getEtag(this.name);
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
        if (session.isPlanMaint) {
          let newEvent = EventFactory.empty();
          // setting event fields from event
          newEvent = this.setEventContent(event, newEvent);
          if (event.contactNr > 0 || event.issueProviderId > 0) {
            newEvent = await this.setEventIssueContent (event, newEvent);
          }
          // setting type according to session
          newEvent.type = session.isPlan ? 0 : 1;
          const isInserted = await this.eventInsert(newEvent);
          targetEventDay = GlobalFunctions.getStartOfDay(newEvent.eventBegin);
          if (isInserted) {
            if (GlobalFunctions.isMinuteSame(session.eventDay, targetEventDay)) {
              await this.getEvents();
              this.eventsChangeCounter += 1;
              await this.actualizeWeekEvents();
            } else {
              await this.getEvents();
              await this.actualizeWeekEvents();
            }
            if (newEvent.type === EventType.actual) {
              this.userService.setUserEventDay(session.userId, targetEventDay, this.name);
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
        if (session.isPlanMaint) {
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
            if (_.contactNr > 0 || _.issueProviderId > 0) {
              newEvent = await this.setEventIssueContent (_, newEvent);
            }
            newEvent.type = targetType;
            const isInserted = await this.eventInsert(newEvent);
            // in a series of updates we must actualize etag in between ...
            // (in other updates this is done in this.getEvents())
            this.etag = this.eventService.getEtag(this.name);
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
            if (targetType === EventType.actual) {
              this.userService.setUserEventDay(session.userId, targetEventDay, this.name);
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
        if (session.isPlanMaint) {
          const isDisabled = await this.eventService.setEventDisabled(event.eventId, this.name, this.etag);
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
    this.sidebarShow.emit();
  }

  // updating event and also associated events
  public async updateEventAssoc(event: {updateType: UpdateType, event: Event}) {
    // first we update event
    await this.updateEvent(event);
    const {updateType, event} = event;
    // update assoc events with contactNr, issue ids if they have changed
    // after alerting user
    if (event.type === 0) {
      let isConfirmed = false;
      for (let _ of this.actualEvents) {
        if (_.planId > 0 && _.planId === event.eventId) {
          if (!isConfirmed) { isConfirmed = confirm(this.auth.txt['set'] + ' ' + this.auth.txt['all_contact_issue_relations'] + '?')}
          if (isConfirmed) {
            if (event.contactNr > 0 || event.issueProviderId > 0) {
              _ = await this.setEventIssueContent (event, _);
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
          if (event.contactNr > 0 || event.issueProviderId > 0) {
            this.planEvents[ix] = await this.setEventIssueContent (event, this.planEvents[ix]);
          }
          await this.updateEvent({updateType, event: this.planEvents[ix]});
          // update other actual events
          for (let _ of this.actualEvents) {
            if (_.planId > 0 && _.planId === this.planEvents[ix].eventId && _.eventId !== event.eventId) {
              if (event.contactNr > 0 || event.issueProviderId > 0) {
                _ = await this.setEventIssueContent (event, _);
              }
              await this.updateEvent({updateType, event: _});
            }
          }
        }
      }
    }
  }

  /** -------------------- event-day-card-form-view ------------------------- */


  public cancelCardFormView() {
    this.v['card-form-view'].isAutoSelected = false;
    this.sidebarShow.emit();
  }

  // insert, update, delete timespan
  public async updateTimeSpan(event: {updateType: UpdateType, event: Event}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, event} = event;
    // let contactNr = event.contactNr;
    const targetEventDay: Date = GlobalFunctions.getStartOfDay(event.eventBegin);
    switch (updateType) {
      case UpdateType.update:
        if (session.isPlanMaint) {
          const updEvent = EventFactory.empty();
          // setting event fields from event
          this.setEventContent(event, updEvent);
          updEvent.eventId = event.eventId;
          // we must take all event fields which are set by event service at insert and shall be unchanged
          updEvent.mandantId = event.mandantId;
          updEvent.userId = event.userId;
          updEvent.userToken = event.userToken;
          updEvent.type = event.type;
          updEvent.status = event.status;
          // and we must take contact and login info
          // updEvent.contactNr = contactNr ?? 0;
          updEvent.contactNr = event.contactNr;
          updEvent.login = event.login;
          const updateId = await this.eventService.setEvent(updEvent.eventId, updEvent, this.name, this.etag);
          if (updateId > 0) {
            await this.getEvents();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (updateId === 0 ) {
            const operation = 'timeSpan update';
            const message = 'error - no confirmation for updated timeSpan';
            this.dbFailure(operation, message);
          } else if (updateId === -1) {
            alert('etag error - file was updated by another user');
            this.etag = this.eventService.getEtag(this.name);
          }
        } // isPlanMaint
        break;
      case UpdateType.insert:
        const newEvent = EventFactory.empty();
        // setting event fields from event
        this.setEventContent(event, newEvent);
        if (session.isPlanMaint) {
          // in case of timespan custommer and login does not come from issue
          // newEvent.contactNr = contactNr ?? 0;
          newEvent.contactNr = event.contactNr;
          newEvent.eventId = 0;
          // category defines type !!!!!
          newEvent.type = event.type;
          const insertId = await this.eventService.setEvent(newEvent.eventId, newEvent, this.name, this.etag);
          if (insertId > 0) {
            await this.getEvents();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (insertId === 0) {
            const operation = 'insert timeSpan';
            const message = 'error - no confirmation for inserted timeSpans';
            this.dbFailure(operation, message);
          } else if (insertId === -1) {
            alert('etag error - file was updated by another user');
            this.etag = this.eventService.getEtag(this.name);
          }
        } // isPlnMaint
        break;
      case UpdateType.delete:
        if (session.isPlanMaint) {
          const isDisabled = await this.eventService.setEventDisabled(event.eventId, this.name, this.etag);
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
    this.sidebarShow.emit();
  }


  /** -------------------- event-day-time-shift-view ------------------------- */

  public cancelTimeShiftView() {
    this.v['time-shift-view'].isAutoSelected = false;
  }


  /** --------------------  event-day-issues-view ------------------------- */

  // event = eventId
  public async selectIssueOfEvent(event: number) {
    const ix = this.allEvents.findIndex(_ => _.eventId === event);
    if (ix >= 0) {
      const issue = await this.issueService.getIssueByExternalId(this.allEvents[ix].issueProviderId, this.allEvents[ix].nExternalIssueId, this.allEvents[ix].sExternalIssueId, this.name)
      if (issue) {
        await this.selectIssue(issue.issueId);
      }
    }
  }

  /** -------------------- event-day-options-view ------------------------- */


  /**
   * updating opts in session.eventOptions - user options 1 to 7
   * @param event eventOptions - basis for updates
   */
  public async updateOpts(event: IUserEventOptions) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
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
        if (this.auth.setSessionEventDay(session, this.name)) {
          this.sessionForViews = session;
          this.eventDayChangeCounter += 1;
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
    this.auth.setUserOptions(this.userOpts, session.userId, this.name);
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
   * setEventIssueContent - is a supprting function in updateEvent
   * sets view-relevant fields in model event element (to update model and afterwards update DB)
   * @param view event element in view
   * @param model event element in model
   */
  private async setEventIssueContent(view: Event, model: Event): Promise<Event> {
    model.contactNr = view.contactNr;
    model.issueProviderId = view.issueProviderId;
    model.nExternalIssueId = view.nExternalIssueId;
    model.sExternalIssueId = view.sExternalIssueId;
    model.providerUrl = view.providerUrl;
    model.login = view.login;
    model.eventInfo = view.eventInfo;
    // we (re)build eventInfo with actual data
    model = await this.eventService.buildEventInfo(model, this.name);
    return model;
  }

}


