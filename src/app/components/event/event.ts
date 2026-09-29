import { ContactService } from './../../_services/contact.service';
import { Component, Inject, Input, LOCALE_ID, OnInit, signal, SimpleChange } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { formatDate, NgStyle, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { Contact } from '../../_db/contact';
import { ConfigurationOption } from '../../_db/configuration-option';
import { User } from '../../_db/user';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { EventSelectOption } from '../../_db/event-select-option';
import { Session } from '../../_db/session';
import { EventSelectOptionFactory } from '../../_db/event-select-option-factory';

import { EventSortCriteria } from '../../_enums/event-sort-criteria.enum';
import { App } from '../../_enums/app.enum';

import { IView } from '../../_interfaces/i-view';
import { IEventListElement } from '../../_interfaces/i-event-list-element';
import { IEventSelectChoice } from '../../_interfaces/i-event-select-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { UserService } from '../../_services/user.service';
import { CalendarService } from '../../_services/calendar.service';
import { ConfigurationService } from '../../_services/configuration.service';

import { EventListViewComponent } from '../event-list-view/event-list-view';
import { EventSelectFormViewComponent } from '../event-select-form-view/event-select-form-view';


@Component({
  selector: 'dsy-event',
  templateUrl: './event.html',
  styleUrl: './event.css',
  imports: [NgStyle, FormsModule, EventSelectFormViewComponent, EventListViewComponent, SlicePipe]
})
export class EventComponent implements OnInit {

  public name = 'EventComponent';

  public App: typeof App = App;

  // db texts
  eventtxt: { [key: string]: string } = {};
  optiontxt: { [key: string]: string } = {};

  // events are building the  model
  events!: Array<Event>;
  // eventsChangeCounter: eventsChangeCounter as flag for the views if events has been reloaded or single event is updated, inserted
  eventsChangeCounter = 0;
  //  signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  eventsReadySignal = signal(0);

  // 0 - list view 1 - slect form view
  selectViewSignal = signal(0);

  // events for display in event-list
  eventElements!: Array<IEventListElement>;

  // this element is used only for maintenance by event-select-form
  eventSelectOption!: EventSelectOption;
  // we choose from  user eventSelectOptions
  eventSelectChoices!: Array<IEventSelectChoice>;

  // all users
  users!: Array<User>;

  // all users with vents in case of  /admin - user itself in case of /local
  eventUsers!: Array<User>;

  // timespans for holydays in calendar in select form  ...
  timeSpans!:  Array<Event>;

  options!: Array<ConfigurationOption>;

  // session is used in template and sub-views
  session!: Session;

  // dates for display at template
  dateFromDisplay = '';
  dateToDisplay = '';

  // show dates are usually related to today - can be set to eventDay (day of Calendar view)
  isRelatedToEventDay = false;

  listDayChoices: Array<{value: string, isRelatedToEventDay: boolean, isChecked: boolean}> = [];

  timeZoneIdentifier!: string;
  // difference of browser timezone to UTC - is used to set dates in component
  timeZoneUtcOffset!: number;

  // contactStyle of auth.custOrderc -might be checked or not
  contactStyle!: {};
  contactHiddenStyle!: {};
  contactVisibleStyle!: {};
  // contactStyle of session.eventSelectOption
  eventSelectStyle!: {};
  eventSelectHiddenStyle!: {};
  eventSelectVisibleStyle!: {};

  // all contacts which are joined to any event
  eventContacts!: Array<Contact>;

  // isUpdate marks that this.session.eventSelectOption is just used as basis for update
  isUpdate = false;
  // isInsert marks that update delivers a cloned option; can only be true if isUpdate is true
  isInsert = false;

  // eventContact and eventIssueNr are the selected contact and issue, depending on session
  eventContact!: Contact;
  eventIssueNr!: number;

  // if the actual eventContact is used to filter events
  isEventContactSelected = false;
  // if the actual eventContact equals session.eventSelectOption contact
  isEventContactAutoSelected = false;

  // if the actual eventIssue is used to filter events
  isEventIssueSelected = false;
  // if the actual eventIssue equals session.eventSelectOption issue
  isEventIssueAutoSelected = false;

  // we show user in list only if more than 1 or the shown user is different from session, sort-criteria, user selected
  isShowUser = false;

  // we show locationType in list only if more than 1
  isShowLocationType = false;

  // if locationType not in sort/group an column is not shown, then total line shows it
  isLocationTypeGrouped = false;


  constructor(@Inject(LOCALE_ID) public locale: string,
    private configurationService: ConfigurationService,
    private calendarService: CalendarService,
    private contactService: ContactService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LogService,
    private message: MessageService,
    public auth: AuthenticationService) {
     }

  ngOnInit() {
    // console.log('init event component');
    this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      const session = this.auth.getSession(this.name);
      if (session) {
        this.session = session;
        this.loadDbTexts();
        this.getUsers();
        await this.getEventOptions();
        this.getTimeSpans();
        await this.getEvents();
        this.filterEvents();
      }
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
    }
  }

   private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const event = EventFactory.empty(); // just for dbtxt
    const eventSelectOption = EventSelectOptionFactory.empty(); // just for dbtxt
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
    this.optiontxt = GlobalFunctions.objText(eventSelectOption,
      'Option', this.auth.systemTexts, language,  this.name);
  }

   /**
   * getUsers()
   * s we use a list of local users
   */
   private getUsers() {
    const session = this.auth.getSession(this.name);
    const allUsers =  this.userService.getUsers(this.name);
    this.users = allUsers.filter(_ => _.type === 1 && _.status < 9)
  }


  // get options from session and build eventIssue structures in component
  private async getEventOptions() {
    const session = this.auth.getSession(this.name);
    if (session) {
      // for sub-components  we load options from option ressources (option.json)
      this.options = await this.configurationService.getConfigurationOptions(this.name);
      // we build  eventContact structures in component
      const eventContactElement = this.calendarService.getEventContact(this.name);
      if (eventContactElement) {
        this.eventContact = eventContactElement.eventContact;
        this.contactHiddenStyle = eventContactElement.contactHiddenStyle;
        this.contactVisibleStyle = eventContactElement.contactVisibleStyle;
        this.contactStyle = this.contactHiddenStyle;
      }
      // let user choose related day
      this.listDayChoices = [];
      const showToday = formatDate(new Date(), 'd.MM.yyyy', this.locale);
      const showEventDay = formatDate(session.calendarDay, 'd.MM.yyyy', this.locale);
      if (showToday !== showEventDay) {
        this.listDayChoices.push({value: this.auth.txt['today'] + ': ' + showToday, isRelatedToEventDay: false, isChecked: this.isRelatedToEventDay ? false : true});
        this.listDayChoices.push({value: this.auth.txt['calendar'] + ' ' + this.auth.txt['date'] + ': '  + showEventDay, isRelatedToEventDay: true, isChecked: this.isRelatedToEventDay ? true : false});
      }
      // with buildEventSelectOptions we assure at least default eventSelectOptions and set session eventSelectOption
      this.calendarService.buildEventSelectOptions(this.name);
      // load choices from  session.eventSelectOptions
      this.eventSelectChoices = this.calendarService.getEventSelectChoices(this.isRelatedToEventDay, this.name);
      // set the choosen selectChoice (with actual eventDay => dateFrom, dateTo values) => in this.session.eventSelectOptions
      this.setEventSelectOptionSelected();
    }
  }

  /**
   * we take choosen choice to take eventSelectOption from array of all options
   * and actualize it with choosen dateFrom and dateTo
   *
   * we actualize session.eventSelectOption with choosen option
   */
  private setEventSelectOptionSelected() {
    let session = this.auth.getSession(this.name);
    if (session && this.eventSelectChoices && this.eventSelectChoices.length > 0) {
      const choosen  = this.eventSelectChoices.filter(_ => _.isSelected)[0];
      const eventSelectOptions = this.calendarService.getEventSelectOptions(this.name);
      let eventSelectOption = eventSelectOptions?.filter(_ => _.nr === choosen?.nr)[0];
      if (eventSelectOption) {
        eventSelectOption.dateFrom = choosen.dateFrom;
        eventSelectOption.dateTo = choosen.dateTo;
         // set component display values
        this.dateFromDisplay = eventSelectOption.isCurrentDay ? formatDate(eventSelectOption.dateFrom, 'd.MM.yyyy', this.locale)
        : formatDate(eventSelectOption.dateFrom, 'd.MM', this.locale);;
        this.dateToDisplay = eventSelectOption.isCurrentDay ? ''
        : formatDate(eventSelectOption.dateTo, 'd.MM.yyyy', this.locale);
        this.eventSelectVisibleStyle = StyleFactory.getBgColorStyle(eventSelectOption.contactColor ?? '', 0);
        this.eventSelectHiddenStyle = StyleFactory.getBgColorStyle(eventSelectOption.contactColor ?? '', 90);
        this.eventSelectStyle = this.eventSelectVisibleStyle;
        // set event contact, issue as autoSelected if they are equal to option selection
        if (eventSelectOption.contactNr > 0
          && eventSelectOption.contactNr === session.contactNr) {
          this.isEventContactAutoSelected = true;
          this.contactStyle = this.contactVisibleStyle;
        } else {
          this.isEventContactAutoSelected = false;
          this.contactStyle = this.contactHiddenStyle;
        }
        if (eventSelectOption.issueNr && eventSelectOption.issueNr > 0
          && eventSelectOption.issueNr === session.issueNr) {
          this.isEventIssueAutoSelected = true;
        } else {
          this.isEventIssueAutoSelected = false;
        }
        this.isEventContactSelected = false;
        this.isEventIssueSelected = false;
        // we actualize user name - could have changed meanwhile
        if (eventSelectOption.userId > 0 && this.users.length > 0) {
          eventSelectOption.userName = this.users.filter(_ => _.userId === eventSelectOption.userId)[0].userName;
        }
        this.auth.setSessionEventSelectOption(eventSelectOption, this.name);
      }
    }
    session = this.auth.getSession(this.name);
    if (session && session?.eventSelectOption ) {
      this.eventSelectOption = session.eventSelectOption;
    }

  }

  // we need timespans for holidays in calendar of datepicker ...
  private getTimeSpans() {
    // in local storage there are recurring timeSpans for session user ....
    const recTimeSpans = this.userService.getRecurringTimeSpans(0, this.name)
    this.timeSpans = [];
    this.timeSpans = this.timeSpans.concat(recTimeSpans);
    this.timeSpans.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
  }


  /**
   * getEvents forms the basis for event-list
   *
   * we get events from eventService wtih getEventsRange() where
   *
   * main criteria is plan/actual, userId, dateFrom, dateTo.
   *  they are defined by this.session.eventSelectOptions
   * If one of this changes, getEvents()
   *  has to be called and subsequent structures are rebuilt
   *
   */
  private getEvents() {
    const session = this.auth.getSession(this.name);
    if (session) {
      this.eventsReadySignal.set(0);
      // get Date from, to from options (add 1 day to dateTo to get midnight of next day as upper limit)
      // TODO UTC timezone
      // const dateFromString = GlobalFunctions.getYMDHM(session.eventSelectOption.dateFrom);
      // const dateToString = GlobalFunctions.getYMDHM(session.eventSelectOption.dateTo);
      const type = (session.eventSelectOption?.isPlan === null && session.isPlan) || session.eventSelectOption?.isPlan ? 0 : 1;
      // eventSelectOption dateTo has the (start of day of) last day of range
      // therefore we must start of next day when getting events which are at last day ...
      const lastDay = GlobalFunctions.addDays(session.eventSelectOption?.dateTo ?? new Date(), 1);
      const allEvents =  this.calendarService.getEvents(this.name);
      const allContacts = this.contactService.getContacts(this.name);
      this.eventContacts = allContacts.filter(_ => allEvents.findIndex(event => event.contactNr === _.contactNr) >= 0);
      if (session.app === App.admin) {
        // in case of App.admin userId is not relevant
        this.eventUsers = this.users?.filter(_ => allEvents.findIndex(event => event.userId === _.userId) >= 0);
        // we get this.events as event range
        this.events = this.calendarService.getEventsRange(session.eventSelectOption?.userId ?? 0, session.eventSelectOption?.dateFrom ?? new Date(), lastDay, type,
          this.name);
      } else {
        // we get events for user of session via  userId 0
        this.events = this.calendarService.getEventsRange(0, session.eventSelectOption?.dateFrom ?? new Date(), lastDay, type,
          this.name);
      }

      if (this.events?.length > 0) for (let event of this.events) {
        // build eventInfos if contact or issue is joined (eventInfod are not persisted ...)
        // (eventInfos are rebuilt if event is updated!)
        if (!event.eventInfo && event.contactNr > 0) {
          event = this.calendarService.buildEventInfo(event, this.name);
        }
      }
      this.eventsChangeCounter += 1;
    }
  }

  private async filterEvents() {
    const session = this.auth.getSession(this.name);
    this.eventsReadySignal.set(0);
    let filterContactNr = 0;
    let filterIssueNr = 0;
    if (session && session?.eventSelectOption && session?.eventSelectOption?.contactNr > 0) {
      filterContactNr = session.eventSelectOption.contactNr;
    }
    if (session && session?.eventSelectOption && session?.eventSelectOption?.issueNr && session?.eventSelectOption?.issueNr > 0) {
      filterIssueNr = session.eventSelectOption.issueNr;
    }
    // if selected, custumer selected has priority over selectOption
    if (this.isEventContactSelected && this.eventContact?.contactNr > 0) {
      filterContactNr = this.eventContact.contactNr;
    }
    // selected issue
    if (this.isEventIssueSelected) {
      filterIssueNr = this.eventIssueNr;
    }
    if (session && session?.eventSelectOption && session.eventSelectOption?.sortCriterias?.length > 0) {
      this.isLocationTypeGrouped = session.eventSelectOption.sortCriterias.filter(_ => _.isSortCriteria && _.sortField === EventSortCriteria[4]).length > 0;
    }

    const sortElements = this.calendarService.getEventSelectOptionSortElements(this.name);
    let intermediateElements = this.calendarService.filterEvents(this.events, this.users, filterContactNr, filterIssueNr, this.name);
    if (session && session.app === App.admin) {
      if (session && session?.eventSelectOption && session.eventSelectOption.userId === 0) {
        this.isShowUser = true;
      }
    } else {
      // we show user if more than 1 or just 1 and not (session user or filtered user)
      const usersObj = intermediateElements.reduce((acc: Array<number>, el) => {
        const user = el.event.userId;
        const userCount = acc[user] ? acc[user] + 1 : 1;
        return {
          ...acc,
          [user]: userCount
        };
      }, []);
      // we show user also if we do not sort on users ...
      // if (Object.entries(usersObj).length > 1 && sortElements.filter(_ => _.key === 'userName').length === 0) {
      if (Object.entries(usersObj).length > 1) {
        this.isShowUser = true;
      } else if (Object.entries(usersObj).length === 1
        && Number(Object.entries(usersObj)[0][0]) !== session?.userId
        && Number(Object.entries(usersObj)[0][0]) !== session?.eventSelectOption?.userId) {
        this.isShowUser = true;
      }
    }

    // we show locationType if more than 1 and not in sort criteria
    const locObj = intermediateElements.reduce((acc: Array<number>, el) => {
      const locCount = acc[el.event.locationType] ? acc[el.event.locationType] + 1 : 1;
      return {
        ...acc,
        [el.event.locationType]: locCount
      };
    }, []);
    if (Object.entries(locObj).length > 1 && !this.isLocationTypeGrouped) {
      this.isShowLocationType = true;
    }
    let eventElements: Array<IEventListElement> = [];
    // we push events and group header elements to this.eventElements
    intermediateElements.forEach((_, ix) => {
      if (ix === 0) {
        const {...totalRest} = _;
        const sumTotal = intermediateElements.reduce((sum, el) => {
          return sum + el.durationMinutes;
        }, 0);
        eventElements.push({
          ...totalRest,
          isGroupElement: true,
          changedCriteria: 'total',
          sumDuration: sumTotal
        });
      }
      let isGroupChange = false;
      for (let index = 0; sortElements && index < sortElements.length; index++) {
        // for each sortCriteria (except externalId, which is first part of user criteria)
        //  which has changed we push group element which has complete content of element itself
        if ( sortElements[index].key !== 'externalId' && (ix === 0 || isGroupChange
          || (ix > 0 && GlobalFunctions.compareField(sortElements[index], _, intermediateElements[ix - 1]) !== 0))) {
          // if we detect a changing group, all superior groups also change automatically
          isGroupChange = true;
          const {...rest} = _;
          const changedCriteria = sortElements[index].sortField;
          const groupElements = sortElements.filter((s, i) => i <= index);
          const sumDuration = intermediateElements.reduce((sum, el) => {
            let duration = 0;
            // (if isSum or isSubTotal) we sum duration over all details with the same sortCriteria for
            // this sortCriteria and all above
            if (!el.isGroupElement && GlobalFunctions.compareFields(groupElements, _, el) === 0) {
              // all fields which are group elements of el must be euqal to _
              duration = el.durationMinutes;
              // console.log('sortField:', changedCriteria, 'geoup element:', _, 'sumDuration added by: ', el );
            }
            return sum + duration;
          }, 0);
          eventElements.push({
            ...rest,
            isGroupElement: true,
            changedCriteria,
            sumDuration,
            isSum: session?.eventSelectOption?.sortCriterias.filter(c => c.sortField === sortElements[index].sortField)[0].isSum,
            isSubTotal: session?.eventSelectOption?.sortCriterias.filter(c => c.sortField === sortElements[index].sortField)[0].isSubTotal
          });
        }
      }
      // finally we push intermediate element
      eventElements.push(_);
    });
    this.eventElements = eventElements;
    this.eventsReadySignal.set(1);
  }

  /** --------------------------  public methods -------------------------------------------- */

  /* there is no return in routed components (navigating to /header would not init header and therefor not activate default child view ...)
    user has to chose other component via function choice

  public return() {
    this.router.navigate(['../header'], { relativeTo: this.route.parent });
  }
  */

  async setListDay(event: any) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    this.listDayChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isChecked = true;
      } else {
        _.isChecked = false;
      }
    });
    if (this.listDayChoices.filter(_ => _.isRelatedToEventDay)[0].isChecked) {
      this.isRelatedToEventDay = true;
    } else {
      this.isRelatedToEventDay = false;
    }
    await this.getEventOptions();
    await this.getEvents();
    this.filterEvents();
  }

  setShowContact(event: any) {
    const session = this.auth.getSession(this.name);
    this.isEventContactSelected = event.target.checked;
    if (this.isEventContactSelected ) {
      this.contactStyle = this.contactVisibleStyle;
      if (session?.eventSelectOption?.contactNr !== this.eventContact?.contactNr) {
        this.eventSelectStyle = this.eventSelectHiddenStyle;
      }
    } else {
      this.contactStyle = this.contactHiddenStyle;
      this.eventSelectStyle = this.eventSelectVisibleStyle;
    }
    this.filterEvents();
  }
  async setEventSelectOption(event: any) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    await this.getEventOptions();
    this.eventSelectChoices.forEach(_ => {
      if (_.nr === Number(event.target.value)) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.setEventSelectOptionSelected();
    await this.getEvents();
    this.filterEvents();
  }


  async setUpdateEventSelectOption() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    await this.getEventOptions();
    const session = this.auth.getSession(this.name);
    // in this.eventSelectOption we store the cloned option to be maintained by form-view
    this.eventSelectOption = GlobalFunctions.clone(session?.eventSelectOption);
    this.isUpdate = true;
    this.selectViewSignal.set(1);
  }

  async setCloneEventSelectOption() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    await this.getEventOptions();
    const session = this.auth.getSession(this.name);
    const eventSelectOptions = await this.calendarService.getEventSelectOptions(this.name);
    const sortedOption = eventSelectOptions
    .sort((a, b)  => a.nr - b.nr );
    const maxNr = sortedOption[sortedOption.length - 1].nr;
    // in this.eventSelectOption we store the cloned option to be maintained by form-view
    this.eventSelectOption = GlobalFunctions.clone(session?.eventSelectOption);
    this.eventSelectOption.nr = maxNr + 1;
    this.eventSelectOption.name += ' - (' + this.auth.txt['copy'] + ')' ;
    this.isUpdate = true;
    this.isInsert = true;
    this.selectViewSignal.set(1);
  }


  /** -------------------- event-select-form-view ------------------------- */

  async updateEventSelectOption(event: EventSelectOption) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    let eventSelectOptions = this.calendarService.getEventSelectOptions(this.name);
    // console.log('we store eventSelectOption:', event);
    // when updating, first the former eventSelectOption is deleted
    if (!this.isInsert) {
      const session = this.auth.getSession(this.name);
      const ixSplice = eventSelectOptions.findIndex(_ => _.nr === session?.eventSelectOption?.nr);
      if (ixSplice >= 0) {
        eventSelectOptions.splice(ixSplice, 1);
      }
    }

    // rearrange nr's so that this eventSelectOption is stored with nr
    // and all others are shifted +1
    let extendedEventSelectOptions = eventSelectOptions.map(_ => {
      const {...rest} = _;
      return {...rest, newOption : 1};
    });
    const  {...opts} = event;
    if (extendedEventSelectOptions && extendedEventSelectOptions.length > 0) {
      extendedEventSelectOptions.push({...opts, newOption : 0 });
    } else {
      extendedEventSelectOptions = [{...opts, newOption : 0 }];
    }

    let selectNewNr = event.nr;
    // set array in eventOptions as const eventSelectOptions - including
    const sortedOptions = extendedEventSelectOptions
    .sort((a, b)  => (a.nr * 10 + a.newOption) - (b.nr * 10 + b.newOption));
    for (let i = 0; i < sortedOptions.length; i++) {
      sortedOptions[i].nr = i > 0 && sortedOptions[i].nr <= sortedOptions[i - 1].nr ? sortedOptions[i -1].nr + 1 : sortedOptions[i].nr;
      if (sortedOptions[i].newOption === 0) {
        selectNewNr = sortedOptions[i].nr ;
      }
    }
    this.calendarService.setEventSelectOptions(sortedOptions, this.name);

    // the modified or cloned option becomes the selected option
    event.nr = selectNewNr;
    this.auth.setSessionEventSelectOption(event, this.name);
    // getEventOptions sets selected and loads selections ...
    await this.getEventOptions();
    await this.getEvents();
    this.filterEvents();
    this.cancelUpdate();
  }

  async deleteEventSelectOption(event: EventSelectOption) {
    // console.log('we delete eventSelectOption:', event);
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (session) {
      let eventSelectOptions = this.calendarService.getEventSelectOptions(this.name);
      const ixSplice = eventSelectOptions.findIndex(_ => _.nr === session?.eventSelectOption?.nr);
      eventSelectOptions.splice(ixSplice, 1);
      // store eventSelectOptions at local storage
      this.calendarService.setEventSelectOptions(eventSelectOptions, this.name);
      this.auth.setSessionEventSelectOption(null, this.name);
      // re-load options to set eventSelectOption correct (there might be no option ledt ...)
      await this.getEventOptions();
      await this.getEvents();
      this.filterEvents();
    }

    this.cancelUpdate();
  }


  cancelUpdate() {
    this.isUpdate = false;
    this.isInsert = false;
    this.selectViewSignal.set(0);
  }

  /** -------------------- event-list-view ------------------------- */

  async showEvent(eventElement: IEventListElement) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (session?.app === App.local) {
      this.router.navigate([`../localShowEvent`, `${eventElement.event.eventId}`], { relativeTo: this.route.parent});
    }
  }

}

