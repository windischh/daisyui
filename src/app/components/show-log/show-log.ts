import { DatePipe, SlicePipe } from '@angular/common';
import { Component, HostListener, Inject, LOCALE_ID, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AngularMyDatePickerDirective, AngularMyDatePickerModule, IAngularMyDpOptions, IMyDate, IMyDateModel, IMyDateRange, IMyInputFieldChanged } from '@nodro7/angular-mydatepicker';

import { GlobalFunctions } from '../../_globals/global-functions';

import { SessionFactory } from './../../_db/session-factory';
import { LogFactory } from '../../_db/log-factory';
import { Log, LogLevel } from '../../_db/log';
import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { UserService } from '../../_services/user.service';

import { PaginatorComponent } from '../paginator/paginator';


@Component({
  selector: 'dsy-show-log',
  imports: [FormsModule, AngularMyDatePickerModule, PaginatorComponent, SlicePipe, DatePipe],
  templateUrl: './show-log.html',
  styleUrl: './show-log.css',
})
export class ShowLogComponent {


  public name = 'ShowLogComponent';


  // publishedLogs are the various published logs (console, localStorage, webServer,...)
  logPublisher : string = '';
  logPublisherChoices: Array<IChoice> = [];

  // signal value   0 - no data loaded   1 - data loded
  public logsReadySignal = signal(0);

  // db elements with their texts from logs at webServer
  logs!: Array<Log>;
  logsUnfiltered!: Array<Log>;
  log = LogFactory.empty();
  logtxt: { [key: string]: string } = {};


  // we have a paginator - we show logs according to limit
  showLogs: Array<Log> = [];

  logLevelEnum: typeof LogLevel = LogLevel;

  // choices
  levels = '';
  logLevelChoices: Array<IChoice> = [];

  // choose review time
  reviewTime = '0';
  reviewTimeChoices: Array<IChoice> = [];

  // parameters from routes; in case of test: menu for show various parts of order table
  isParametersSet = false;
  isShowDropdown = false;

  // dateFrom is built dynamically from dateTo and review time
  dateFrom!: Date;
  // dateTo can be choosen by user
  dateTo!: Date;

  mandantFilter = '';
  userFilter = '';


  // date picker configuration
  // ViewChild static (since angular 8) not necessary cause ngxdp not used at ngOnInit
  @ViewChild('dp') ngxdp!: AngularMyDatePickerDirective;
  public dpModel!: IMyDateModel;   // not initial date set
  public dpDisabled = false;

  // disabledRanges contains eventually disabled date ranges
  disabledRanges: Array<IMyDateRange>  = [];

  // dates for holidays are shown in red color
  highlightDates: Array<IMyDate>  = [];

  public myDatepickerOptions: IAngularMyDpOptions = {
    dateRange: false,
    dateFormat: 'dd.mm.yyyy',
    // showFooterToday, todayText => depends on new angular-mydatepicker release aug.2020
    todayTxt: '',
    showFooterToday: true,
    showWeekNumbers: true
  };

  public dateOpts!: IAngularMyDpOptions;

  // variables for paginator
  total: number = 0; // total number of items
  names: Array<string> = []; // optional - names of each record, length must be 0 or === total
  abbrPlaces = 8; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page

  documentWidth = document.documentElement.clientWidth;
  // due to https://stackoverflow.com/questions/3934271/horizontal-scrollbar-on-top-and-bottom-of-table #52
  // we do not use x- and y- scrolling, so we can use this
  scrollWrapperStyle = {'width': document.documentElement.clientWidth, 'overflow-x': 'scroll', 'transform': 'rotateX(180deg)'};
  tableScrollStyle = {'transform': 'rotateX(180deg)'};


  constructor(@Inject(LOCALE_ID) public locale: string,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LogService,
    private message: MessageService,
    private user: UserService,
    public auth: AuthenticationService) { }

  ngOnInit() {
    this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.loadDbTexts();
      this.initChoices();
      this.addDpOptions();
      // get parameters
      this.getLogParameters();
      this.isParametersSet = true;
      await this.getLogs();
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
    this.logtxt = GlobalFunctions.objText(this.log,
      'Log', this.auth.systemTexts, language,  this.name);
  }

  private initChoices() {
    const enumStringType: { [key: string]: any } = this.logLevelEnum;
    this.logLevelChoices = Object.keys(this.logLevelEnum)
    .filter(k => typeof enumStringType[k] === 'number')
    .map(_ => {
      return {value: enumStringType[_] as string, text: _};
    });
    this.logLevelChoices[0].isSelected = true;
    this.levels = this.logLevelChoices[0].value;

    this.reviewTimeChoices = [
      {value: '0', text: this.auth.txt['current_day'], isSelected: true},
      {value: '1', text: '-1 ' + this.auth.txt['day'], isSelected: false},
      {value: '2', text: '-2 ' + this.auth.txt['days'], isSelected: false},
      {value: '3', text: '-3 ' + this.auth.txt['days'], isSelected: false}
    ];

    this.dateTo = new Date();
  }

  // dateOpts are built
  private addDpOptions() {

    // utils.clone would not work
    this.dateOpts = this.getCopyOfDpOptions(this.myDatepickerOptions);

    this.dateOpts.todayTxt = this.auth.txt['today'];

    const disabled = GlobalFunctions.clone(this.disabledRanges);

    this.dateOpts.disableDateRanges = disabled;


    // only client provider (local storage) has recurring timeSpans ....
    const recTimeSpans = this.user.getRecurringTimeSpans(0, this.name)
    if (recTimeSpans?.length > 0) {
      recTimeSpans.forEach(_ => {
        if (_.type === 21) {
          const holiday = {
            year: _.eventBegin.getFullYear(), month: _.eventBegin.getMonth() + 1, day: _.eventBegin.getDate()
          }
          this.highlightDates.push(holiday);
        }
      });
    }

    this.dateOpts.highlightDates = this.highlightDates;
  }

  /**
  * we need getCopy to avoid getting just a reference with "... = this.myDatepickerOptions"
  */
  private getCopyOfDpOptions(opts: IAngularMyDpOptions): IAngularMyDpOptions {
    return JSON.parse(JSON.stringify(opts));
  }


  private showReviewTimeUnlimted() {
    if (this.mandantFilter !== '' || this.userFilter !== '') {
      if (this.reviewTimeChoices.filter(_ => _.value === '31').length === 0) {
        this.reviewTimeChoices.push({value: '7', text: '-1 ' + this.auth.txt['week'], isSelected: false});
        this.reviewTimeChoices.push({value: '31', text: '-1 ' + this.auth.txt['month'], isSelected: false});
      }
    } else {
      if (this.reviewTimeChoices.filter(_ => _.value === '31').length > 0) {
        // we delete unlimited (= 1 week or 1 month) review time from choices
        if (this.reviewTimeChoices.filter(_ => _.value === '31')[0].isSelected
        || this.reviewTimeChoices.filter(_ => _.value === '7')[0].isSelected) {
          // we set first regular choice as choosen if unlimited was set
          this.reviewTimeChoices[0].isSelected = true;
          this.reviewTime = this.reviewTimeChoices[0].value;
        }
        this.reviewTimeChoices.pop();
        this.reviewTimeChoices.pop();
      }
    }
  }

  private getLogParameters() {
    const publishedLogs = this.logger.logs().filter(_ => !_.toLowerCase().includes('api') && !_.toLowerCase().includes('console') && !_.toLowerCase().includes('directory'));
    let value = 0;
    for (const publisher of publishedLogs) {
      this.logPublisherChoices.push({value: value.toString(), text: publisher, isSelected: value === 0});
      value++;
    }
    this.logPublisher = this.logPublisherChoices.filter(_ => _.isSelected)[0].text;
    // we set dateTo on today
    const today = GlobalFunctions.getStartOfDay(new Date()) ?? new Date();
    this.dateTo = today;
  }

  /**
   * get logs from DB
   */
  private async getLogs() {
    const session = this.auth.getSession(this.name) ?? SessionFactory.empty();
    this.logsReadySignal.set(0);
    this.logsUnfiltered = [];
    this.dateFrom = GlobalFunctions.addDays(this.dateTo, -Number(this.reviewTime));
    // all logs in date interval from selectes publisher
    this.logsUnfiltered = await this.logger.getLogsRange(this.logPublisher, session, this.dateFrom,
      GlobalFunctions.addDays(this.dateTo, 1), this.name);
    this.filterLogs();
  }

  private filterLogs() {
    // filterLogs is also call directly - we must reset signal ...
    this.logsReadySignal.set(0);
    if (this.logsUnfiltered?.length > 0) {
      // filter level (level 0 means: show all log levels)
      this.logs = this.logsUnfiltered
      .filter(_ => this.logLevelChoices[0].isSelected || this.logLevelChoices.filter(c => Number(c.value) ===_.logLevel && c.isSelected).length > 0)
      .filter(_ => this.mandantFilter === '' || _.mandantName?.startsWith(this.mandantFilter) ||  _.mandantId?.toString().startsWith(this.mandantFilter))
      .filter(_ => this.userFilter === '' || _.login?.startsWith(this.userFilter) ||  _.userName?.startsWith(this.userFilter));
      // paginator - this paginator has names
      this.names = this.logs.map(_ => GlobalFunctions.getYMD(_.date)?.toString() ?? '');
      // paginator - set total records - after setting names, total triggers paginator refresh
      this.total = this.logs.length;
      if (this.total > 1000) this.limit = 20;
      this.showLogs = this.logs.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    } else {
      this.logs = [];
      this.names = [];
      this.total = 0;
      this.showLogs = [];
    }
    this.logsReadySignal.set(1);
  }

  // ellipsis icon dropdown menu only for test purpose
  @HostListener('window:click', ['$event.target'])
  onClick(target: any) {
    if (target && (target.id === 'dropdownButton' || target.id === 'checkbox' || target.id === 'checkboxInput'
      || target.parentElement?.id ===  'dropdownButton' || target.parentElement?.id === 'checkbox')) {
        // console.log(`click id is`, target.id);
        // console.log(`parent id is`, target.parentElement.id);
      } else {
        // console.log(`You clicked on`, target);
        this.isShowDropdown = false;
      }
  }


  /** ------------------------  public methods --------------------------------------------------- */


  selectLogPublisher(event: any): void {
    this.logPublisherChoices.forEach(_ => {
      if (_.value === event.target.value) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.logPublisher = this.logPublisherChoices.filter(_ => _.isSelected)[0].text;
    this.getLogs();
  }


  async clearLog(publishedLog: string) {
    if (confirm(this.auth.txt['clear_log'] + '?')) {
      const session = this.auth.getSession(this.name) ?? SessionFactory.empty();
      const logCleared = await this.logger.clearLog(publishedLog, session);
      if (logCleared) {
        alert('log: ' + `${publishedLog}` + ' ' + this.auth.txt['cleared'] );
        if (publishedLog.toLowerCase()  === 'webserver') {
          await this.getLogs();
        }
      } else  {
        alert('log: ' + `${publishedLog}` + ' ' + this.auth.txt['could_not_be_cleared'] );
      }
    }
  }

  setReviewTime(event: any) {
    this.reviewTimeChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.reviewTime = this.reviewTimeChoices.filter(_ => _.isSelected)[0].value;
    this.getLogs();
  }

  clearDate(): void {
    this.ngxdp.clearDate();
  }

  // if type of angular-mydatepicker is hidden, this function is obsolete
  onInputFieldChanged(event: IMyInputFieldChanged): void {
    // console.log('onInputFieldChanged(): Value: ', event.value, ' - dateFormat: ', event.dateFormat, ' - valid: ', event.valid);
  }

  onDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    // in this surrounding we do not set isRange
    if (!event.isRange) {
      const choosenDate = event.singleDate?.jsDate ?? new Date();
      if (GlobalFunctions.getDateInMinutes(choosenDate) !== GlobalFunctions.getDateInMinutes(this.dateTo)) {
        this.dateTo = choosenDate;
        this.getLogs();
      }
    }
  }


  // mandant filter
  // up to now we use no extra button to start filter operation
  setMandantFilter(filterTerm: string) {
    this.mandantFilter = filterTerm;
    this.showReviewTimeUnlimted();
    this.filterLogs();
    // console.log('filter: ', this.filterTerm);
  }

  // mandant filter
  // up to now we use no extra button to start filter operation
  setUserFilter(filterTerm: string) {
    this.userFilter = filterTerm;
    this.showReviewTimeUnlimted();
    this.filterLogs();
    // console.log('filter: ', this.filterTerm);
  }

  toggleMenu(): void {
    this.isShowDropdown = this.isShowDropdown ? false : true;
    // default duration 10 sec. user has time to choose 1 ore more categories
    const duration = 10000;
    // user has toggled dropdown visible
    if (this.isShowDropdown) {
      // after duration we automatic toggle to hidden
      setTimeout(() => {
        this.isShowDropdown = false;
      }, duration);
    }
  }

  setLevel(event: any): void {
    this.levels = '';
    if (this.logsUnfiltered) {
      this.logLevelChoices.forEach(_ => {
        if (Number(_.value) === Number(event.target.value)) {
          if (event.target.checked) {
            _.isSelected= true;
          } else {
            _.isSelected = false;
          }
        }
        if (_.isSelected) {
          this.levels += this.levels === '' ? _.value : ', ' +  _.value;
        }
      });
      this.filterLogs();
    }
  }

  // paginator - set params for actual page
  onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // update content to view new page content
    this.showLogs = this.logs.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }


}

