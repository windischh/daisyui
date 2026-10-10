import { Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output, signal, SimpleChange } from '@angular/core';

import { MAX_MONTHS, POWDER_BLUE, WHITE } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { ConfigurationOptionHandlingFunctions } from '../../_globals/configuration-option-handling-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Work } from '../../_db/work';
import { WorkFactory } from '../../_db/work-factory';
import { IssueFactory } from '../../_db/issue-factory';
import { CustomerFactory } from '../../_db/customer-factory';
import { Customer } from '../../_db/customer';
import { Issue } from '../../_db/issue';
import { Session } from '../../_db/session';2
import { IssueSelectionFactory } from '../../_db/issue-selection-factory';
import { IssueSelection } from '../../_db/issue-selection';

import { OptionNameUserWorks } from '../../_enums/option-name-user-works.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { WorkType } from '../../_enums/work-type.enum';
import { ProviderType } from '../../_enums/provider-type.enum';

import { IChoice } from '../../_interfaces/i-choice';
import { IWorkOptions } from '../../_interfaces/i-work-options';
import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';
import { IView } from '../../_interfaces/i-view';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { WorkService } from '../../_services/work.service';
import { IssueService } from '../../_services/issue.service';
import { CustomerService } from '../../_services/customer.service';
import { ProviderService } from '../../_services/provider.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { UserService } from '../../_services/user.service';

import { WorkDayOptionsViewComponent } from '../work-day-options-view/work-day-options-view.component';
import { WorkDayIssuesViewComponent } from '../work-day-issues-view/work-day-issues-view.component';
import { WorkDayGridViewComponent } from '../work-day-grid-view/work-day-grid-view.component';
import { WorkDayWeekViewComponent } from '../work-day-week-view/work-day-week-view.component';
import { WorkDayCardsViewComponent } from '../work-day-cards-view/work-day-cards-view.component';
import { WorkDayCardFormViewComponent } from '../work-day-card-form-view/work-day-card-form-view.component';
import { WorkDayTimeShiftViewComponent } from '../work-day-time-shift-view/work-day-time-shift-view.component';
import { WorkDayIssueSelectViewComponent } from '../work-day-issue-select-view/work-day-issue-select-view.component';
import { WorkDaySelectionBarComponent } from '../work-day-selection-bar/work-day-selection-bar.component';


@Component({
  selector: 'dsy-calendar-day',
  templateUrl: './calendar-day.html',
  styleUrl: './calendar-day.css',
  imports: [WorkDaySelectionBarComponent, WorkDayIssueSelectViewComponent, WorkDayTimeShiftViewComponent, WorkDayCardFormViewComponent, WorkDayCardsViewComponent, WorkDayWeekViewComponent, WorkDayGridViewComponent, WorkDayIssuesViewComponent, WorkDayOptionsViewComponent]
})

export class WorkDayComponent implements OnInit {

  @Input({required: true}) workDayLoadCounter: number;
  @Input({required: true}) isShowWork: boolean;
  @Input({required: true}) workId: number;

  @Output() issueSelect = new EventEmitter<Issue>();
  @Output() sidebarHide = new EventEmitter();
  @Output() sidebarShow = new EventEmitter();
  @Output() restart = new EventEmitter();

  public name = 'WorkDayComponent';

  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews: Session;

  public options: Array<ConfigurationOption>;
  public opts: IWorkOptions;
  public userOpts: IUserWorkOptions;

  public customers: Array<Customer>;

  public issueSelections: Array<IssueSelection>;

  // db texts
  public worktxt: { [key: string]: string } = {};
  public custtxt: { [key: string]: string } = {};
  public issuetxt: { [key: string]: string } = {};

  // timeSpans contain work elements of type "time span"  - for performance reason we build it for one week
  public timeSpans:  Array<Work>;
  public linkedTimeSpans:  Array<Work> = [];

  // all works for current user
  public allWorks: Array<Work>;

 // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // actualWorks are building the client model for actual work. Includes last work of previous day - if it reaches into this.workday and first work of next day
  actualWorks: Array<Work>;
  weekActualWorks: Array<Work>;

  // planWworks are building the client model for planned work. Includes last work of previous day - if it reaches into this.workday and first work of next day
  planWorks: Array<Work>;
  weekPlanWorks: Array<Work>;

  // references to either planWorks or actualWorks
  works: Array<Work>;
  // oldest work day
  firstWorkDay: Date;

  // etag holds last etag for check at update
  private etag: string;

  // all works for linked user
  allLinkedUserWorks: Array<Work>;
  // actualized works of a linked user
  linkedUserWorks:  Array<Work>;

  // worksChangeCounter: worksChangeCounter as flag for the views if works has been reloaded or single work is updated, inserted
  worksChangeCounter = 0;
  weekWorksChangeCounter = 0;
  timeSpanChangeCounter = 0;

  // is set true if works of workDay are loaded first time
  isDayLoadedSignal = signal(0);
  // is set true if week-view is activated - week work arrays are filled
  isWeekLoadedSignal = signal(0);
  // is set true if time span arrays are filled from DB
  isTimeSpanLoadedSignal = signal(0);


  // workCustomer and workIssue are the selected customer and issue from session - adn set in session
  workCustomer: Customer;
  workIssue: Issue;
  // all issues belonging to workCustomer
  workCustomerIssues: Array<Issue> = [];
  // all issues belonging to workCustomer and relevant at session.workDay
  workIssues: Array<Issue> = [];


  // workCustomerRequetsed (and workIssueRequested) are the choosen cutomer/issue in customer select (... not selected finally)
  workCustomerRequested: Customer;
  workIssueRequested: Issue;
  //  workIssuesRequested contain all issues of the requested customer
  workIssuesRequested: Array<Issue> = [];

  // is increased if relevant options for woork-day-selection-bar are changed
  workDayChangeCounter = 0;

  timeZoneIdentifier: string;

  // difference of browser timezone to mandant timezone - is used to set dates in component
  timeZoneDiff: number;

  // isSelecting is true if user is enabled to select works
  isSelecting = false;
  countSelected = 0;

  // if selected works are to be shifted to another date we use targetWorks and targetWorkDay
  targetWorks: Array<Work>;
  targetWorkDay: Date;

  // isCreating is true if user just creates new work (in cards view) to prohibit set selecting at same time
  isCreating = false;

  // workContainer is used when calling work-day-card-form-view
  workContainer: {updateType: UpdateType, work: Work, d: Date};

  // types are indexed by type-part x in time spans with types 2x
  timeSpanTypeColors: Array<{text: string, color: string}>;
  // type 21,22 is not selectable
  timeSpanTypeChoices: Array<IChoice>;

  // work-day-views - isSelectable true => visible for user selection
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
    private customerService: CustomerService,
    private providerService: ProviderService,
    private issueService: IssueService,
    private workService: WorkService,
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

      if (propKey === 'workDayLoadCounter') {
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
      await this.getCustomers();
      await this.getWorkOptions();
      await this.getWorks();
      await this.actualizeWeekWorks();
      await this.actualizeTimeSpans();
      await this.getLinkedUserData();
      if (this.isShowWork) {
        // work-day was called to show a special work in card form ...
        let work = this.allWorks.filter(_ => _.workId === this.workId)[0];
        if (work) {
          await this.selectWorkDay(work.workBegin);
          const session = this.auth.getSession(this.name);
          const event = {updateType: UpdateType.update, work, d: session.workDay};
          await this.enableCardFormView(event);
        } else {
          alert('work with id: ' + this.workId + ' not found');
          // we must call sidebarShow to reset osShowWork in header
          this.sidebarShow.emit();
        }
      }
      // session is set to have it available in all sub-views
      this.sessionForViews = this.auth.getSession(this.name);
      this.worksChangeCounter += 1;
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
    const work = WorkFactory.empty(); // just for dbtxt
    const customer = CustomerFactory.empty(); // just for dbtxt
    const issue = IssueFactory.empty(); // just for dbtxt
    this.worktxt = GlobalFunctions.objText(work,
      'Work', this.auth.systemTexts, language,  this.name);
    this.custtxt = GlobalFunctions.objText(customer,
      'Customer', this.auth.systemTexts, language,  this.name);
    this.issuetxt = GlobalFunctions.objText(issue,
      'Issue', this.auth.systemTexts, language,  this.name);
  }

  private dbFailure(operation: string, message: string) {
    this.logger.error(this.auth.getSession(this.name), this.name, `${operation} failed: ${message}`);
    this.message.show(this.name + `: ${operation} failed: ${message}`);
    alert(message);
  }

  private async getCustomers() {
    this.customers = await this.customerService.getCustomers(this.name);
  }

  /**
   * we get choosen issue (and customer) and options which are relevant for work presentation
   * (we must take care to actualize them every time we enter this component)
   * workCustomer and workIssue are token from session
   * work options (can be maintained by configuaration maintenance)  are token from option file
   */
  private async getWorkOptions() {
    // we build workIssue structures in component
    const session = this.auth.getSession(this.name);
    this.workIssuesRequested = [];
    this.workIssues = [];

    // we build workIssue and workCustomer structures in component
    this.workIssue = await this.workService.getWorkIssue(this.name);
    this.workIssueRequested = this.workIssue;
    const workCustElement = await this.workService.getWorkCustomer(this.name);
    this.workCustomer = workCustElement.workCustomer;
    this.workCustomerRequested = this.workCustomer;

    // load this.workIssues - also if customerNr is 0
    let custIssues = this.issueService.getMyIssuesCust(session.customerNr, this.name);
    if (custIssues?.length > 0) {
      this.workIssuesRequested = this.selectIssuesForDate(custIssues);
      this.workCustomerIssues = custIssues;
      // if user should not choose the customer issues at his work-form, we leave workIssues empty
      const isChooseAllCustomerIssues = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_works_isChooseAllCustomerIssues') ?? false;
      if (isChooseAllCustomerIssues && session.customerNr > 0) {
        this.workIssues = this.selectIssuesForDate(this.workCustomerIssues) ?? [];
      } else {
        this.workIssues = [];
      }
    }
    // workIssue must be an element of workIssues anyway
    if (this.workIssues?.findIndex(_ => _.issueProviderId === this.workIssue.issueProviderId
      && _.nExternalIssueId === this.workIssue.nExternalIssueId
      && _.sExternalIssueId === this.workIssue.sExternalIssueId) < 0
      && this.workIssue.issueProviderId > 0) {
      this.workIssues.push(this.workIssue);
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
    this.opts = ConfigurationOptionHandlingFunctions.initializeWorkOptions(session, this.options);
    const user = this.auth.getUser(session.userId, this.name);
    if (!user.userWorkOptions) {
      // user work options are initialized with options of actual session user!!
      user.userWorkOptions = ConfigurationOptionHandlingFunctions.initializeUserWorkOptions(this.options);
      this.auth.setUserOptions(user.userWorkOptions, session.userId, this.name);
    }
    this.userOpts = user.userWorkOptions;
  }

  /**
   * selects issues to show in issue-select-view (and to have as choosable issues in work-form)
   *  we select all issues with begin date is before or at today
   *  and which are not done
   */
  private selectIssuesForDate(issues: Array<Issue>): Array<Issue> {
   // we take all issues which are not finished and have date interval starts at workDay
    const session = this.auth.getSession(this.name);
    return issues
    .filter(_ => !_.issueDateFinished
      && (!_.issueDateFrom || GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(session.workDay, 1) ) < GlobalFunctions.getDateInMinutes(_.issueDateFrom) ))
    // and sort on interval begin
    .sort((a, b) => GlobalFunctions.getDateInMinutes(a.issueDateFrom ?? session.workDay) - GlobalFunctions.getDateInMinutes(b.issueDateFrom ?? session.workDay) );
  }


  /**
   * getWorks() delivers works in this.works
   *  for workDay, isPlan of opts = session.workOptions
   * getWorks is called at init, at every change of opts = session.workOptions and at every change of a work
   */
  private async getWorks() {
    const session = this.auth.getSession(this.name);
    this.allWorks = await this.workService.getWorks(0, this.name);
    // we rebuild recurring time spans in local storage depending on latest calendar entry
    if (this.allWorks.length > 0) {
      // we search oldest
      this.firstWorkDay = this.allWorks.reduce((a,b) => a.workBegin.getTime() <  b.workBegin.getTime() ? a : b).workBegin;
      // loadRecurringTimeSpans checks if startDate is already respected ...
      await this.workService.loadRecurringTimeSpans(session.userId, this.name, this.firstWorkDay);
    }
    this.etag = this.workService.getEtag(this.name);
    this.actualWorks = await this.getWorksForDate(this.allWorks, false, session.workDay, false);
    this.planWorks = await this.getWorksForDate(this.allWorks, true, session.workDay, false);
    this.setAssocData();
    this.countSelected = 0;
    this.isSelecting = false;
    this.isCreating = false;
    this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
    this.worksChangeCounter += 1;
    this.isDayLoadedSignal.set(1);
  }

  /**
   * actualizWeekWorks() delivers week works
   *
   * if week-view or issues-view is selected
   */
  private async actualizeWeekWorks() {
    const session = this.auth.getSession(this.name);
    if (this.v['week-view'].isSelected === true || this.v['issues-view'].isSelected === true || this.isWeekLoadedSignal ) {
      this.weekActualWorks = await this.getWorksForDate(this.allWorks, false, session.workDay, true);
      this.weekPlanWorks = await this.getWorksForDate(this.allWorks, true, session.workDay, true);
      this.weekWorksChangeCounter += 1;
      this.isWeekLoadedSignal.set(1);
    }
  }

  /**
   * actualizeTimeSpans() delivers time spans for the week from DB
   *
   * if grid-view or week-view is selected
   *
   * timeSpans are works which include time-span-info
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
      const weekDay = GlobalFunctions.getWeekDay(session.workDay, 0, this.locale);
      const diffToWeekBegin = (weekDay + 1) * -1;
      const beginDate = GlobalFunctions.addDays(session.workDay, diffToWeekBegin);
      // end date is last day of week, we add one day
      const diffToWeekEnd = 8 - weekDay;
      const endDate = GlobalFunctions.addDays(session.workDay, diffToWeekEnd);
      // recurring timeSpans come from local user data
      const recTimeSpans = await this.workService.getRecurringTimeSpanRange(0,  beginDate, endDate, this.name);
      const timeSpans = this.allWorks.filter(_ => GlobalFunctions.getDateInMinutes(_.workEnd) >= GlobalFunctions.getDateInMinutes(beginDate)
        && GlobalFunctions.getDateInMinutes(_.workBegin) <= GlobalFunctions.getDateInMinutes(endDate)
        && _.type >= WorkType.timeSpanUndefined
        && _.type <= WorkType.timeSpanCategory9
        && _.status < 9);
      for (let span of timeSpans) {
        // build workInfos if customer
        if ((!span.workInfo && (span.customerNr > 0))
          || (span.workInfo?.customerNr !== span.customerNr)) {
            span = await this.workService.buildWorkInfo(span, this.name);
        }
      }
      // const timeSpans = await this.workService.getTimeSpanRange(0, beginDate, endDate, this.name);
      this.timeSpans = [];
      this.timeSpans = this.timeSpans.concat(recTimeSpans);
      this.timeSpans = this.timeSpans.concat(timeSpans);
      this.timeSpans.sort((a, b) => a.workBegin.getTime() - b.workBegin.getTime());
      this.timeSpanChangeCounter += 1;
      this.isTimeSpanLoadedSignal.set(1);
    }
  }

  private setAssocData() {
    this.actualWorks.forEach(_ => {
      if (_.planId > 0) {
        _.assocCount = 0;
        const ix = this.planWorks.findIndex(plan => _.planId === plan.workId);
        if (ix >= 0) {
          _.assocWorkBegin = this.planWorks[ix].workBegin;
          _.assocWorkEnd = this.planWorks[ix].workEnd;
          _.assocDone = this.planWorks[ix].assocDone;
          _.assocCount = 1;
        }
      }
    });
    this.planWorks.forEach(_ => {
      if (_.doneId === _.workId) {
        _.assocWorkBegin = _.workBegin;
        _.assocWorkEnd = _.workEnd;
        _.assocCount = 0;
      } else {
        let assocWorkBegin: Date = null;
        let assocWorkEnd: Date;
        let assocCount = 0;
        this.actualWorks.forEach(actual => {
          if (_.workId === actual.planId) {
            assocWorkBegin = assocWorkBegin === null ? actual.workBegin : assocWorkBegin;
            assocWorkEnd = actual.workEnd;
            assocCount += 1;
          }
        });
        _.assocWorkBegin = assocWorkBegin;
        _.assocWorkEnd = assocWorkEnd;
        _.assocCount = assocCount;
      }
    });
  }

  /**
   * getWorksForDate() delivers works for workDay for a given array of works
   * works for workDay optionallye include all works of week of workDay
   *
   * @param works- given works to select from
   * @param isPlan - true is we get planned work
   * @param workDay - workDay
   * @param isWeek - if true, we return works for week of workDay - otherwise for workDay
   * @returns work array
   */
  private async getWorksForDate(works: Array<Work>, isPlan: boolean, workDay: Date, isWeek: boolean): Promise<Array<Work>> {
    const type = isPlan? 0 : 1;
    const weekDay = GlobalFunctions.getWeekDay(workDay, 0, this.locale);
    const previous = isWeek ? weekDay + 1 : 1;
    const next = isWeek ? 7 - weekDay : 1;
    // console.log('works - previous: ', previous);
    // console.log('works - next: ', next);
    // if isWeek is false, firstDay === workDay and nextDay is day after workDay
    const firstDay = GlobalFunctions.addDays(workDay, (previous - 1) * -1);
    const nextDay = GlobalFunctions.addDays(workDay, next);
    const prevDate = GlobalFunctions.addDays(workDay, previous * -1);
    const nextDate = GlobalFunctions.addDays(workDay, next + 1);
    let selectedWorks: Work[] = [];
    const worksPreviousToNext = works?.filter(_ =>
        GlobalFunctions.getDateInMinutes(_.workBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.workEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type === type && _.status < 9);
    if (worksPreviousToNext ?.length > 0) {
      worksPreviousToNext.sort((a, b) => a.workBegin.getTime() - b.workBegin.getTime());
      // get work which reaches from prevoius to first day
      const workPrevious = worksPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(firstDay, _.workEnd)
      && GlobalFunctions.isMinuteEarlier(_.workBegin, firstDay))[0];
      if (workPrevious) {
        selectedWorks.push(workPrevious);
      }
      // all works which begin from nextDay 0:00 to day after, 0:00
      const worksTodayOrWeek = worksPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(firstDay, _.workBegin)
      && GlobalFunctions.isMinuteEarlier(_.workBegin, nextDay));
      if (worksTodayOrWeek) {
        worksTodayOrWeek.forEach(_ => selectedWorks.push(_));
      }
      // get first work on next day
      const workNext = worksPreviousToNext.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(nextDay, _.workBegin))[0];
      if (workNext) {
        selectedWorks.push(workNext);
      }
      for (let work of selectedWorks) {
        // build workInfos if customer or issue is joined (workInfod are not persisted ...)
        // (workInfos are rebuilt if work is updated!)
        if ((!work.workInfo && (work.customerNr > 0 || work.issueProviderId > 0))
          || (!(work.workInfo?.customerNr > 0) && work.customerNr > 0)
          || (!(work.workInfo?.issueProviderId > 0) && work.issueProviderId > 0)) {
            work = await this.workService.buildWorkInfo(work, this.name);
        }
      }
    }
    return (selectedWorks);
  }


  /*
  private getLinkedUser(): User {
    const session = this.auth.getSession(this.name);
    const linkedUser = this.auth.getLinkedUser(this.name);
    // first we check linked user -  we actualize data in workOptions
    if (linkedUser && linkedUser.userId > 0) {
      session.linkedUserId = linkedUser.userId;
      session.linkedUserName = linkedUser.userName;
      // TODO store linked user login (from authorizations - if linked user work is at web server)
      if (this.auth.setSessionWorkDay(session, this.name)) {
        this.sessionForViews = session;
        this.worksChangeCounter += 1;
      }
    } else {
      session.linkedUserId = 0;
      session.linkedUserName = '';
      session.isShowLinkedUser = false;
      if (this.auth.setSessionWorkDay(session, this.name)) {
        this.sessionForViews = session;
        this.worksChangeCounter += 1;
      }
    }
    return linkedUser;
  }
  */

  private async getLinkedUserData() {
    const session = this.auth.getSession(this.name);
    // we get data if session has linked userd  ...
    if (session.linkedUserId > 0) {
      this.allLinkedUserWorks = await this.workService.getWorks(session.linkedUserId, this.name);
      this.etag = this.workService.getEtag(this.name);
      await this.actualizeLinkedUserData();
    } else {
      this.linkedUserWorks = [];
      this.linkedTimeSpans = [];
    }
  }

  private async actualizeLinkedUserData() {
    const session = this.auth.getSession(this.name);
    if (session.linkedUserId > 0) {
      const prevDate: Date = GlobalFunctions.addDays(session.workDay, -1);
      const nextDate: Date = GlobalFunctions.addDays(session.workDay, 2);
      // type is 0 - we show only planned work
      this.linkedUserWorks = this.allLinkedUserWorks.filter(_ => GlobalFunctions.getDateInMinutes(_.workBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.workEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type === 0
        && _.status < 9);
      // timee spans are works with type 2x together with recurring time spans
      const linkedTimeSpans = this.allLinkedUserWorks.filter(_ => GlobalFunctions.getDateInMinutes(_.workBegin) >= GlobalFunctions.getDateInMinutes(prevDate)
        && GlobalFunctions.getDateInMinutes(_.workEnd) <= GlobalFunctions.getDateInMinutes(nextDate)
        && _.type >= WorkType.timeSpanUndefined && _.type <= WorkType.timeSpanCategory9
        && _.status < 9);
      const linkedRecurringTimeSpans = await this.workService.getRecurringTimeSpanRange( session.linkedUserId, prevDate, nextDate, this.name);
      this.etag = this.workService.getEtag(this.name);
      this.linkedTimeSpans = linkedTimeSpans.concat(linkedRecurringTimeSpans);
      this.linkedTimeSpans.sort((a, b) => a.workBegin.getTime() - b.workBegin.getTime());
      this.timeSpanChangeCounter += 1;
    }
  }

  // we await updated work data, with unchanged workId and unchanged type
  private async workUpdate(work: Work): Promise<boolean> {
    const session = this.auth.getSession(this.name);
    const operation = 'work update';
    let message = 'error - undefined';
    if (session.isPlanMaint && work.workId > 0) {
      const formerWork: Work = GlobalFunctions.clone(this.allWorks.find(_ => _.workId === work.workId));
      if (formerWork && formerWork.type === work.type) {
        const targetWorkDay: Date = GlobalFunctions.getStartOfDay(work.workBegin);
        const isPlan = work.type === WorkType.plan;
        const targetWorks = await this.getWorksForDate(this.allWorks, isPlan, targetWorkDay, false);
        let isUpdatePossible = false;
        isUpdatePossible = targetWorks.length === 0 || (targetWorks.length > 0 && targetWorks.filter(_ =>
          (_.workBegin < work.workEnd && _.workEnd > work.workBegin && _.workId !== work.workId)).length === 0);
        if (!isUpdatePossible) {
          message = 'update not possible - other work is overlapping';
          this.dbFailure(operation, message);
          return false;
        }
        let updWork = WorkFactory.empty();
        // setting work fields from work
        updWork = this.setWorkContent(work, updWork);
        if (work.customerNr > 0 || work.issueProviderId > 0) {
          updWork = await this.setWorkIssueContent (work, updWork);
        }
        updWork.workId = work.workId;
        // we must take all work fields which are set by work service at insert and shall be unchanged
        updWork.mandantId = work.mandantId;
        updWork.userId = work.userId;
        updWork.userToken = work.userToken;
        updWork.type = work.type;
        updWork.status = work.status;
        // console.log('updWork:', JSON.stringify(updWork));
        const updateId = await this.workService.setWork(work.workId, updWork, this.name, this.etag);
        if (updateId > 0) {
          // we actualize this.allWorks immediately .... - not necessary, is done in calling procedure
          // this.allWorks = await this.workService.getWorks(0, this.name);
          updWork = await this.workService.getWork(updateId, this.name);
          if (updWork.issueProviderId > 0) {
            const provider = this.providerService.getProvider(0, updWork.issueProviderId, this.name);
            if (updWork.type === 1 && !updWork.isStoredAtIssue && provider?.isStoreIssueWork && (provider?.type === ProviderType.server || (provider?.type === ProviderType.jira  && provider?.isStoreJiraIssueWorkImmediately))) {
              alert(provider.providerName + ' - ' +this.auth.txt['login_necessary']);
            }
          }
          return true;
        } else if (updateId === 0) {
          message = 'error - no confirmation for updated work';
          this.dbFailure(operation, message);
        } else if (updateId === -1) {
          message = 'etag error - file was updated by another user';
          this.dbFailure(operation, message);
        }
      } else {
        message = 'error - former work fault';
        this.dbFailure(operation, message);
      }
    } // isPlanMaint
    return false;
  }

  // we await inserted work with id 0 and with type for plan/actual
  private async workInsert(work: Work): Promise<boolean> {
    const session = this.auth.getSession(this.name);
    const operation = 'work insert';
    let message = 'error - undefined';
    if (session.isPlanMaint && work.workId === 0) {
      const targetWorkDay: Date = GlobalFunctions.getStartOfDay(work.workBegin);
      const isPlan = work.type === WorkType.plan;
      const targetWorks = await this.getWorksForDate(this.allWorks, isPlan, targetWorkDay, false);
      let isInsertPossible = false;
      isInsertPossible = targetWorks.length === 0 || (targetWorks.length > 0 && targetWorks.filter(_ =>
        (_.workBegin < work.workEnd && _.workEnd > work.workBegin)).length === 0);
      if (!isInsertPossible) {
        message = 'insert not possible - other work is overlapping';
        this.dbFailure(operation, message);
        return false;
      }
      const insertId = await this.workService.setWork(work.workId, work, this.name, this.etag);
      // we get the new workId as result of setWork
      if (insertId > 0) {
        // we actualize this.allWorks immediately .... - not necessary, is done in calling procedure
        // this.allWorks = await this.workService.getWorks(0, this.name);
        work = await this.workService.getWork(insertId, this.name);
        if (work?.issueProviderId > 0) {
          const provider = this.providerService.getProvider(0, work.issueProviderId, this.name);
          if (work.type === 1 && !work.isStoredAtIssue && provider?.isStoreIssueWork && (provider?.type === ProviderType.server || (provider?.type === ProviderType.jira  && provider?.isStoreJiraIssueWorkImmediately))) {
            alert(provider.providerName + ' - ' +this.auth.txt['login_necessary']);
          }
        }
        return true;
      } else if (insertId === 0) {
        message = 'error - no confirmation for updated work';
        this.dbFailure(operation, message);
      } else if (insertId === -1) {
        message = 'etag error - file was updated by another user';
        this.dbFailure(operation, message);
      }
    }
    return false;
  }

  /** --------------------------  public methods -------------------------------------------- */
  /** -------------------- work-day-selection-bar ------------------------- */

  public async selectWorkDay(event: Date) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    const workDay: Date = GlobalFunctions.getStartOfDay(event);
    if (this.isSelecting || this.v['card-form-view'].isAutoSelected) {
      // we are in selection mode and user searches target date ...
      this.targetWorks = await this.getWorksForDate(this.allWorks, session.isPlan, workDay, false);
      this.targetWorkDay = workDay;
    } else {
      // we change to days after today - only plan is possible
      if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) < GlobalFunctions.getDateInMinutes(workDay)
      && !session.isPlan) {
        session.isPlan = true;
        if (this.auth.setSessionWorkDay(session, this.name)) {
          this.sessionForViews = session;
          this.workDayChangeCounter += 1;
        }
      }
      // we change to days before today from today or a day after today - we change to actual
      if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  > GlobalFunctions.getDateInMinutes(workDay)
      && GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  <= GlobalFunctions.getDateInMinutes(session.workDay)) {
        session.isPlan = false;
        if (this.auth.setSessionWorkDay(session, this.name)) {
          this.sessionForViews = session;
          this.workDayChangeCounter += 1;
        }
      }
      if (GlobalFunctions.getDateInMinutes(workDay) !== GlobalFunctions.getDateInMinutes(session.workDay)) {
        const oldWorkDay = session.workDay;
        session.workDay = workDay;
        if (this.auth.setSessionWorkDay(session, this.name)) {
          // workIssues might change due to new date:
          const isChooseAllCustomerIssues = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_works_isChooseAllCustomerIssues') ?? false;
          if (isChooseAllCustomerIssues && session.customerNr > 0) {
            this.workIssues = this.selectIssuesForDate(this.workCustomerIssues) ?? [];
          }
          this.actualWorks = await this.getWorksForDate(this.allWorks, false, session.workDay, false);
          this.planWorks = await this.getWorksForDate(this.allWorks, true, session.workDay, false);
          this.setAssocData();
          this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
          this.worksChangeCounter += 1;
          this.sessionForViews = session;
          // if we change to another week
          if (GlobalFunctions.getYW(workDay) !== GlobalFunctions.getYW(oldWorkDay)) {
            await this.actualizeWeekWorks();
            await this.actualizeTimeSpans();
          }
          await this.actualizeLinkedUserData();
          if (this.actualWorks.length > 0) {
            this.userService.setUserWorkDay(session.userId, workDay, this.name);
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
    // actualizeWeekWorks checks if week-view ...
    if (!this.isWeekLoadedSignal) { await this.actualizeWeekWorks(); }
    if (!this.isTimeSpanLoadedSignal) { await this.actualizeTimeSpans(); }
  }

  // set selection of works
  public async setSelection() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (this.isSelecting) {
      this.isSelecting = false;
      if (session.isPlan) {
        this.planWorks.forEach(_ => _.isSelected = false);
      } else {
        this.actualWorks.forEach(_ => _.isSelected = false);
      }
      this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
      this.worksChangeCounter += 1;
      this.weekWorksChangeCounter += 1;
      this.countSelected = 0;
      this.v['time-shift-view'].isAutoSelected = false;
    } else {
      this.isSelecting = true;
      this.targetWorks = null;
      this.targetWorkDay = null;
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
    if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))  < GlobalFunctions.getDateInMinutes(event.workDay)) {
      isPlan = true;
    }
    if (session.isPlan !== isPlan) {
      session.isPlan = isPlan;
      if (this.auth.setSessionWorkDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    // with updateOpts it is also possible to change the user of plan
    if (session.externalUserId !== event.externalUserId) {
      session.externalUserId = event.externalUserId;
      if (this.auth.setSessionWorkDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    if (isSessionUpdated) {
      // we  must renew daily works
      this.actualWorks = await this.getWorksForDate(this.allWorks, false, session.workDay, false);
      this.planWorks = await this.getWorksForDate(this.allWorks, true, session.workDay, false);
      this.setAssocData();
      this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
      this.sessionForViews = session;
      this.worksChangeCounter += 1;
    }
  }


  /** -------------------- work-day-issue-select-view ------------------------- */


  /**
   * request customer data and all his issues
   * (... is used also by issues-view when customer is requested ...)
   *
   *  @param customerNr - this customer is set in workCustomerRequested and therefor shown in issue-select-view
   *
  */
  public async requestCustomer(customerNr: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    // console.log('get issues for custId:', customerNr);
    if (customerNr !== this.workCustomerRequested.customerNr) {
      this.workIssuesRequested = [];
      this.workCustomerRequested = CustomerFactory.empty();
      // getCustomerIssues from session delivers actual data cause we actualized them before by getIssue()
      const issues = this.issueService.getMyIssuesCust(customerNr, this.name);
      if (issues?.length > 0) {
        this.workIssuesRequested = this.selectIssuesForDate(issues);
      }
      const customer = await this.customerService.getCustomerNr(customerNr, this.name);
      if (customer) {
        this.workCustomerRequested = customer;
      } else {
        const session = this.auth.getSession(this.name);
        // in case of not found customer we remember custId in displayNr ....
        this.workCustomerRequested.customerNr = customerNr;
        this.workCustomerRequested.displayNr = customerNr.toString();
        // name is set to txt + custId  - so we can differ customers which have not been found ....
        this.workCustomerRequested.name = (session.serviceLevel.customer === 1 ? this.auth.txt['contact'] : this.auth.txt['customer']) + ': ' + customerNr.toString();
      }
    }

  }


  /**
   * issue is requested to be shown
   * so we load issue - that means, loading customer of issue as workCustomer
   *  and loading all issues of workCustomer as workIssuesRequested
   *  and indicating rewuested issue as workIssueRequested
   * @param issueId -id of issue which is choosen
   */
  public async requestIssue(issueId: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate(); }
    const issue = this.issueService.getIssue(issueId, this.name);
    if (issue?.status < 9 ) {
      this.workIssueRequested = issue;
      const customerNr = issue.customerNr ?? 0;
      await this.requestCustomer(customerNr);
    }

  }

  /**
   * rewuestWorkIssues() loads workIssuesRequested (again)
   *  is used to activate workIssuesRequested if they have not been loaded before
   *  (in case of isChooseAllCustomerIssues === false)
   * @param event.customerNr -id of customer which is choosen
   * @param event.isMyIssue - issues are assigned to me
   * @param event.isStarted - only issues have dateFrom <= workDay
   * @param event.isActive - issues which are not finished
   * @param event.isParent - issues which have subtasks
   * @param event.isSub - issues which have parent
   */
   public async requestWorkIssues(event: {customerNr: number, isMyIssue: boolean, isStarted: boolean, isActive: boolean, isParent: boolean, isSub: boolean}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate(); }
    const {customerNr: customerNr, isMyIssue, isStarted, isActive, isParent, isSub} = event;
    this.workIssuesRequested = [];
    let issues: Array<Issue>;
    // we load issues for  customeer - if isMyIssue, than only issue where user is the assignee
    if (isMyIssue) {
      issues = this.issueService.getMyIssuesCust(customerNr, this.name);
    } else {
      issues = this.issueService.getIssuesCust(customerNr, this.name);
    }
    if (issues?.length > 0) {
      const session = this.auth.getSession(this.name);
      // isStared - we select only issues which has been already started
      if (isStarted) {
        issues = issues.filter(_ => (!_.issueDateFrom || GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(session.workDay, 1) ) > GlobalFunctions.getDateInMinutes(_.issueDateFrom) ));
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
        issues.sort((a, b) => GlobalFunctions.getDateInMinutes(a.issueDateFrom ?? session.workDay) - GlobalFunctions.getDateInMinutes(b.issueDateFrom ?? session.workDay) );
        this.workIssuesRequested = issues;
      }
    }

  }


  /**
   * customerNr is defined as selectable customer in this.workCustomer and in session
   *
   * @param customerNr
   */
  public async selectCustomer(customerNr: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    if (customerNr > 0) {
      const customer = await this.customerService.getCustomerNr(customerNr, this.name);
      if (customer) {
        this.auth.setSessionIssueId(0, this.name);
        this.auth.setSessionCustomerId(customerNr, this.name);
        // we push issueSekection (check on existing selections is made by issueService)
        const issueSelected = IssueSelectionFactory.empty();
        issueSelected.customerNr = customer.customerNr;
        issueSelected.customerName = customer.name;
        issueSelected.displayNr = customer.displayNr;
        this.issueService.pushIssueSelections(issueSelected, this.name);
        await this.getWorkOptions();
        this.cancelIssueSelectView();
      }
    } else {
      // if no customer is choosen, we set back session ids
      this.auth.setSessionIssueId(0, this.name);
      this.auth.setSessionCustomerId(0, this.name);
      await this.getWorkOptions();
      this.cancelIssueSelectView();
    }
  }

/**
 *  selectIssue()
 *  (... is used also by issues-view ...)
 *  a new session issue  is built with the selected issue
 *  all isssue (workIssue,....) and customer dependent data are renewed by this.getWorkOptions();
 * @param issueId is the id of selected issue
 *
 */
  public async selectIssue(issueId: number) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (issueId !== this.workIssue.issueId) {
      const issue = this.issueService.getIssue(issueId, this.name);
      if (issue) {
        const provider = this.providerService.getProvider(0, issue.issueProviderId, this.name);
        let customerName = '';
        if (issue.customerNr > 0) {
          const customer = await this.customerService.getCustomerNr(issue.customerNr, this.name);
          if (customer) {
            customerName = customer.name;
          }
        }
        // we push issueSekection (check on existing selections is made by issueService)
        const issueSelected = IssueSelectionFactory.empty();
        issueSelected.customerNr = issue.customerNr ?? 0;
        issueSelected.customerName = customerName;
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
        const customerNr = issue.customerNr ?? 0;
        // session customer id set to id, even if we have not found a customer for it
        this.auth.setSessionCustomerId(customerNr, this.name);
        await this.getWorkOptions();
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
    // we set status in both issue lists and in workIssue ..
    // TODO we must check issueProvider - set status is allowed only for client, server
    // for providers with configuration for status update we must map status done to provider rules ....
    if (id === this.workIssue.issueId) {
      this.workIssue.status = status;
    }
    ix = this.workIssuesRequested.findIndex(_ => _.issueId === id);
    if (ix >= 0) {
      this.workIssuesRequested[ix] = this.issueService.getIssue(id, this.name);
      const issueEtag = this.issueService.getEtag(this.name);
      this.workIssuesRequested[ix].status = status;
      // we set issue without isUpdatingIssueWork flag - status might be updated only if user has serviceLevel.maint > 0
      await this.issueService.setIssue(this.workIssuesRequested[ix], this.name, issueEtag);
    }
    iy = this.workIssues.findIndex(_ => _.issueId === id);
    if (iy >= 0) {
      this.workIssues[iy] = this.issueService.getIssue(id, this.name);
      const issueEtag = this.issueService.getEtag(this.name);
      this.workIssues[iy].status = status;
      // we set issue without isUpdatingIssueWork flag - status might be updated only if user has serviceLevel.maint > 0
      await this.issueService.setIssue(this.workIssues[iy], this.name, issueEtag);
    }
  }

  public async cancelIssueSelectView() {
    await this.getWorkOptions();
    if ( this.v['issue-select-view'].isAutoSelected) {
      this.v['issue-select-view'].isAutoSelected = false;
      this.v[this.formerView].isSelected = true;
    }
  }

  /** -------------------- work-day-week-view ------------------------- */

  /**
   * setting workDay and isPlan
   * @param event date and isPlan, set by week-view - is therefore restricted on days of the chosen week
   */
   public async selectWorkDayAndPlan(event: {date: Date, isPlan: boolean}) {
    const workDay: Date = GlobalFunctions.getStartOfDay(event.date);
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    let isSessionUpdated = false;
    let isWorkDayUpdated = false;
    if (GlobalFunctions.getDateInMinutes(workDay) !== GlobalFunctions.getDateInMinutes(session.workDay)) {
      session.workDay = workDay;
      session.isPlan = event.isPlan;
      if (this.auth.setSessionWorkDay(session, this.name)) {
        isSessionUpdated = true;
        isWorkDayUpdated = true;

      }
    } else if (session.isPlan !== event.isPlan) {
      session.isPlan = event.isPlan;
      if (this.auth.setSessionWorkDay(session, this.name)) {
        isSessionUpdated = true;
      }
    }
    if (isSessionUpdated) {
      // we  must renew daily works
      this.actualWorks = await this.getWorksForDate(this.allWorks, false, session.workDay, false);
      this.planWorks = await this.getWorksForDate(this.allWorks, true, session.workDay, false);
      this.setAssocData();
      this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
      this.sessionForViews = session;
      this.worksChangeCounter += 1;
      if (isWorkDayUpdated && this.actualWorks.length > 0) {
        this.userService.setUserWorkDay(session.userId, workDay, this.name);
      }
    }
  }


  /** --------------------  work-day-grid-view ------------------------- */
  /** -------------------- work-day-cards-view ------------------------- */

  public async setLinkedUser(event: boolean) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (event === true && session.linkedUserId > 0) {
      session.isShowLinkedUser = true;
      /*
      data for linked user are loaded anyway ...
      if (this.auth.setSessionWorkDay(session, this.name)) {
        this.sessionForViews = session;
        // in order to change view in view ...
        this.worksChangeCounter += 1;
        this.getLinkedUserData();
      }
      */
    } else {
      session.isShowLinkedUser = false;
    }
    this.auth.setSessionWorkDay(session, this.name);
    this.sessionForViews = session;
    // in order to change view in view ...
    this.worksChangeCounter += 1;
  }

  public async selectWork(event: {isSelect: boolean, id: number}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // console.log('selectWork:', event);
    let ix = 0;
    let count = 0;
    if (session.isPlan) {
      ix = this.planWorks.findIndex(_ => _.workId === event.id);
      if (ix >= 0) {
        this.planWorks[ix].isSelected = event.isSelect ? true : false;
      }
      count = this.planWorks.filter(_ => _.isSelected).length;
    } else {
      ix = this.actualWorks.findIndex(_ => _.workId === event.id);
      if (ix >= 0) {
        this.actualWorks[ix].isSelected = event.isSelect ? true : false;
      }
      count = this.actualWorks.filter(_ => _.isSelected).length;
    }
    if (count >= 0) {
      this.countSelected = count;
    }
    if (count > 0) {
      this.v['time-shift-view'].isAutoSelected = true;
    } else {
      this.v['time-shift-view'].isAutoSelected = false;
    }
    this.works = GlobalFunctions.clone(session.isPlan ? this.planWorks : this.actualWorks);
    this.worksChangeCounter += 1;
  }

  /**
   * enables card-form with update types insert or update
   * @param event.updateType: insert or update
   * // TODO enhance possible type: setShow (=show content without updating) - if we have the use cases for it
   *  where a user is allowed to view but not to update ... and correct the 2 other possible types to setInsert, setUpdate
   * @param event.work: in case of update the existing work to be updated,
   *   in case of insert work is empty except work.type which indicates 0 for work, 20 for time space
   * @param event.d: workDay and time of inserted work
   */
  public async enableCardFormView(event: {updateType: UpdateType, work: Work, d: Date}) {
    // we start with hiding sidebar to assure that sidebar is already hidden when  card form is activated
    this.sidebarHide.emit();
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // work with type >= 20 are time spans ....
    if (event.updateType === UpdateType.update && event.work.type < WorkType.timeSpanUndefined ) {
      // in week view we allow enabling a work entry on another day as workDay
      const isPlan = event.work.type === WorkType.plan;
      const dayOfWork: Date = GlobalFunctions.getStartOfDay(event.work.workBegin);
      if (GlobalFunctions.getDateInMinutes(session.workDay) !== GlobalFunctions.getDateInMinutes(dayOfWork)
      || session.isPlan !== isPlan) {
        this.selectWorkDayAndPlan({date: dayOfWork, isPlan});
      }
    }

    // TODO build workContainer
    this.workContainer = event;
    this.targetWorkDay = null;
    this.targetWorks = null;
    this.v['card-form-view'].isAutoSelected = true;
  }

  public setCreating(isCreating: boolean) {
    this.isCreating = isCreating;
  }


  /** -------------------- work-day-card-form-view ------------------------- */
  /** -------------------- work-day-cards-view ------------------------- */
  /** -------------------- work-day-time-shift-view ------------------------- */

  public async updateWork(event: {updateType: UpdateType, work: Work, works?: Array<Work>}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, work, works} = event;
    let message = this.auth.txt['session_timed_out__new_login'];
    let operation = '';
    let targetWorkDay = session.workDay;
    switch (updateType) {
      case UpdateType.cancelUpdate:
        // cancelUpdate is useless now - we do not block activities by isUpdated
        break;
      case UpdateType.update:
        operation = 'update work';
        message = 'update not possible - internal structure error';
        if (session.isPlanMaint) {
          const isUpdated = await this.workUpdate(work);
          targetWorkDay = GlobalFunctions.getStartOfDay(work.workBegin);
          if (isUpdated) {
            if (GlobalFunctions.isMinuteSame(session.workDay, targetWorkDay)) {
              await this.getWorks();
              this.worksChangeCounter += 1;
              this.setAssocData();
              await this.actualizeWeekWorks();
            } else {
              await this.getWorks();
              await this.actualizeWeekWorks();
              if (work.type === WorkType.actual) {
                this.userService.setUserWorkDay(session.userId, targetWorkDay, this.name);
              }
            }
          } else {
            await this.getWorks();
          }
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.multipleUpdate:
        // we make multiple updates based on works ...
        operation = 'update multiple works';
        message = 'update not possible - internal structure error';
        if (session.isPlanMaint) {
          this.refreshSignal.set(0);
          for (const _ of works) {
            if (_.workId > 0) {
              const isUpdated =  await this.workUpdate(_);
              // in a series of updates we must actualize etag in between ...
              // (in other updates this is done in this.getWorks())
              this.etag = this.workService.getEtag(this.name);
              if (!isUpdated) {
                this.dbFailure(operation, message);
              }
            } else {
              message = 'update not possible - no workId';
              this.dbFailure(operation, message);
            }
          }
          await this.getWorks();
          this.worksChangeCounter += 1;
          this.setAssocData();
          await this.actualizeWeekWorks();
          this.refreshSignal.set(1);
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.insert:
        operation = 'insert work';
        message = 'error - no confirmation for posted work';
        if (session.isPlanMaint) {
          let newWork = WorkFactory.empty();
          // setting work fields from work
          newWork = this.setWorkContent(work, newWork);
          if (work.customerNr > 0 || work.issueProviderId > 0) {
            newWork = await this.setWorkIssueContent (work, newWork);
          }
          // setting type according to session
          newWork.type = session.isPlan ? 0 : 1;
          const isInserted = await this.workInsert(newWork);
          targetWorkDay = GlobalFunctions.getStartOfDay(newWork.workBegin);
          if (isInserted) {
            if (GlobalFunctions.isMinuteSame(session.workDay, targetWorkDay)) {
              await this.getWorks();
              this.worksChangeCounter += 1;
              await this.actualizeWeekWorks();
            } else {
              await this.getWorks();
              await this.actualizeWeekWorks();
            }
            if (newWork.type === WorkType.actual) {
              this.userService.setUserWorkDay(session.userId, targetWorkDay, this.name);
            }
          } else {
            await this.getWorks();
          }
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.copyPlanToActual:
        // falls through intentionally
      case UpdateType.multipleInsert:
        // we make multiple inserts based on works ...
        operation = 'insert multiple works';
        message = 'insert not possible - internal structure error';
        if (session.isPlanMaint) {
          this.refreshSignal.set(0);
          // setting type according to session
          let targetType = session.isPlan ? 0 : 1;
          if (updateType === UpdateType.copyPlanToActual) {
            targetType = 1;
            operation = 'insert multiple actual works from plan';
          }
          let isAllInserted = true;
          for (const _ of works) {
            let newWork = WorkFactory.empty();
            // setting work fields from work
            newWork = this.setWorkContent(_, newWork);
            if (_.customerNr > 0 || _.issueProviderId > 0) {
              newWork = await this.setWorkIssueContent (_, newWork);
            }
            newWork.type = targetType;
            const isInserted = await this.workInsert(newWork);
            // in a series of updates we must actualize etag in between ...
            // (in other updates this is done in this.getWorks())
            this.etag = this.workService.getEtag(this.name);
            if (!isInserted)  {
              isAllInserted = false;
            }
          }
          // isAllInserted set true if all inserts are ok
          if (isAllInserted) {
            await this.getWorks();
            this.setAssocData();
            this.worksChangeCounter += 1;
            this.actualizeWeekWorks();
            if (targetType === WorkType.actual) {
              this.userService.setUserWorkDay(session.userId, targetWorkDay, this.name);
            }
          } else {
            this.dbFailure(operation, message);
            // we must actualize - some inserts could have happened ...
            await this.getWorks();
            await this.actualizeWeekWorks();
          }
          this.refreshSignal.set(1);
        } else {
          message = 'not allowed due to user rights';
          this.dbFailure(operation, message);
        }
        break;
      case UpdateType.delete:
        operation = 'delete (disable) work';
        message = 'error - element for disabling was not found';
        if (session.isPlanMaint) {
          const isDisabled = await this.workService.setWorkDisabled(work.workId, this.name, this.etag);
          if (isDisabled) {
            await this.getWorks();
            this.worksChangeCounter += 1;
            // after getWorks to get the corrected time
            await this.actualizeWeekWorks();
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

  // updating work and also associated works
  public async updateWorkAssoc(event: {updateType: UpdateType, work: Work}) {
    // first we update work
    await this.updateWork(event);
    const {updateType, work} = event;
    // update assoc works with customerNr, issue ids if they have changed
    // after alerting user
    if (work.type === 0) {
      let isConfirmed = false;
      for (let _ of this.actualWorks) {
        if (_.planId > 0 && _.planId === work.workId) {
          if (!isConfirmed) { isConfirmed = confirm(this.auth.txt['set'] + ' ' + this.auth.txt['all_customer_issue_relations'] + '?')}
          if (isConfirmed) {
            if (work.customerNr > 0 || work.issueProviderId > 0) {
              _ = await this.setWorkIssueContent (work, _);
            }
            await this.updateWork({updateType, work: _ });
          } else {
            break;
          }
        }
      }
    }
    if (work.type === 1) {
      const ix = this.planWorks.findIndex(_ => _.workId === work.planId);
      if (ix >= 0) {
        // update plan work
        if (confirm(this.auth.txt['set'] + ' ' + this.auth.txt['all_customer_issue_relations'] + '?')) {
          if (work.customerNr > 0 || work.issueProviderId > 0) {
            this.planWorks[ix] = await this.setWorkIssueContent (work, this.planWorks[ix]);
          }
          await this.updateWork({updateType, work: this.planWorks[ix]});
          // update other actual works
          for (let _ of this.actualWorks) {
            if (_.planId > 0 && _.planId === this.planWorks[ix].workId && _.workId !== work.workId) {
              if (work.customerNr > 0 || work.issueProviderId > 0) {
                _ = await this.setWorkIssueContent (work, _);
              }
              await this.updateWork({updateType, work: _});
            }
          }
        }
      }
    }
  }

  /** -------------------- work-day-card-form-view ------------------------- */


  public cancelCardFormView() {
    this.v['card-form-view'].isAutoSelected = false;
    this.sidebarShow.emit();
  }

  // insert, update, delete timespan
  public async updateTimeSpan(event: {updateType: UpdateType, work: Work}) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    // let ix: number;
    const {updateType, work} = event;
    // let customerNr = event.customerNr;
    const targetWorkDay: Date = GlobalFunctions.getStartOfDay(work.workBegin);
    switch (updateType) {
      case UpdateType.update:
        if (session.isPlanMaint) {
          const updWork = WorkFactory.empty();
          // setting work fields from work
          this.setWorkContent(work, updWork);
          updWork.workId = work.workId;
          // we must take all work fields which are set by work service at insert and shall be unchanged
          updWork.mandantId = work.mandantId;
          updWork.userId = work.userId;
          updWork.userToken = work.userToken;
          updWork.type = work.type;
          updWork.status = work.status;
          // and we must take customer and login info
          // updWork.customerNr = customerNr ?? 0;
          updWork.customerNr = work.customerNr;
          updWork.login = work.login;
          const updateId = await this.workService.setWork(updWork.workId, updWork, this.name, this.etag);
          if (updateId > 0) {
            await this.getWorks();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (updateId === 0 ) {
            const operation = 'timeSpan update';
            const message = 'error - no confirmation for updated timeSpan';
            this.dbFailure(operation, message);
          } else if (updateId === -1) {
            alert('etag error - file was updated by another user');
            this.etag = this.workService.getEtag(this.name);
          }
        } // isPlanMaint
        break;
      case UpdateType.insert:
        const newWork = WorkFactory.empty();
        // setting work fields from work
        this.setWorkContent(work, newWork);
        if (session.isPlanMaint) {
          // in case of timespan custommer and login does not come from issue
          // newWork.customerNr = customerNr ?? 0;
          newWork.customerNr = work.customerNr;
          newWork.workId = 0;
          // category defines type !!!!!
          newWork.type = work.type;
          const insertId = await this.workService.setWork(newWork.workId, newWork, this.name, this.etag);
          if (insertId > 0) {
            await this.getWorks();
            this.timeSpanChangeCounter += 1;
            await this.actualizeTimeSpans();
          } else if (insertId === 0) {
            const operation = 'insert timeSpan';
            const message = 'error - no confirmation for inserted timeSpans';
            this.dbFailure(operation, message);
          } else if (insertId === -1) {
            alert('etag error - file was updated by another user');
            this.etag = this.workService.getEtag(this.name);
          }
        } // isPlnMaint
        break;
      case UpdateType.delete:
        if (session.isPlanMaint) {
          const isDisabled = await this.workService.setWorkDisabled(work.workId, this.name, this.etag);
          if (isDisabled) {
            await this.getWorks();
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


  /** -------------------- work-day-time-shift-view ------------------------- */

  public cancelTimeShiftView() {
    this.v['time-shift-view'].isAutoSelected = false;
  }


  /** --------------------  work-day-issues-view ------------------------- */

  // event = workId
  public async selectIssueOfWork(event: number) {
    const ix = this.allWorks.findIndex(_ => _.workId === event);
    if (ix >= 0) {
      const issue = await this.issueService.getIssueByExternalId(this.allWorks[ix].issueProviderId, this.allWorks[ix].nExternalIssueId, this.allWorks[ix].sExternalIssueId, this.name)
      if (issue) {
        await this.selectIssue(issue.issueId);
      }
    }
  }

  /** -------------------- work-day-options-view ------------------------- */


  /**
   * updating opts in session.workOptions - user options 1 to 7
   * @param event workOptions - basis for updates
   */
  public async updateOpts(event: IUserWorkOptions) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    const optionKeys =  Object.keys(event);
    for (let i = 0; i <= optionKeys.length; i++) {
      // console.log('optionValue:', event[optionKeys[i]]);
      // for each option of the workOptions - which has changed - AND is a user WorkOption 1 - 6
      const enumStringType: { [key: string]: any } = OptionNameUserWorks;
      if (this.userOpts[optionKeys[i]] !== event[optionKeys[i]]
      && enumStringType[optionKeys[i]] > 0
      && enumStringType[optionKeys[i]] <= 7) {
        // we store the changed option in session
        this.userOpts[optionKeys[i]] = event[optionKeys[i]];
        if (this.auth.setSessionWorkDay(session, this.name)) {
          this.sessionForViews = session;
          this.workDayChangeCounter += 1;
          // if actual options signalize that every change of opts must be persisted
          if (event.isImmediatePersist || this.userOpts.isImmediatePersist) {
            this.auth.setUserOption(event, session.userId, optionKeys[i], this.name);
          }
          // actualize opts in component - not longer necessary
          // this.getWorkOptions();
        }

      }
    }

  }

  /**
   * userWorkOptions  shall be stored permanently as user workOptions
   */
  public async storeOpts() {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    /* // TODO not longer used ...
    // we store the user options which could be modified at options-view
    const userWorkOptions: typeof OptionNameUserWorks  = OptionNameUserWorks;
    // we take only the numeric values of the enum
    const userOptionKeys = Object.keys(userWorkOptions).filter(_ => Number(_) >= 0);
    for (let i = 0; i < userOptionKeys.length; i++) {
      // option name from enum
      const enumStringType: { [key: string]: any } = userOptionKeys;
      const optionName =  userWorkOptions[enumStringType[i]];
      this.auth.setUserOption(session.workOptions, session.userId, optionName, this.name);
    }
    */
    this.auth.setUserOptions(this.userOpts, session.userId, this.name);
  }


  /** --------------------------  supporting functions for public methods -------------------------------------------- */

  /**
   * setWorkContent - is a supprting function in updateWork
   * sets view-relevant fields in model work element (to update model and afterwards update DB)
   * @param view work element in view
   * @param model work element in model
   */
  private setWorkContent(view: Work, model: Work): Work {
    model.summary = view.summary;
    model.description = view.description;
    model.location = view.location;
    model.locationType = view.locationType;
    model.planId = view.planId;
    model.doneId = view.doneId;
    model.workBegin =  view.workBegin;
    model.workEnd =  view.workEnd;
    model.workDuration = view.workDuration;
    return model;
  }

  /**
   * setWorkIssueContent - is a supprting function in updateWork
   * sets view-relevant fields in model work element (to update model and afterwards update DB)
   * @param view work element in view
   * @param model work element in model
   */
  private async setWorkIssueContent(view: Work, model: Work): Promise<Work> {
    model.customerNr = view.customerNr;
    model.issueProviderId = view.issueProviderId;
    model.nExternalIssueId = view.nExternalIssueId;
    model.sExternalIssueId = view.sExternalIssueId;
    model.providerUrl = view.providerUrl;
    model.login = view.login;
    model.workInfo = view.workInfo;
    // we (re)build workInfo with actual data
    model = await this.workService.buildWorkInfo(model, this.name);
    return model;
  }

}


