import { formatDate, SlicePipe } from '@angular/common';
import { Component, Inject, LOCALE_ID, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { COMMA, CRLF, DOUBLE_QUOTATION_MARK, HORIZONTAL_TAB, LF, QUOTATION_MARK, SEMICOLON } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { ConfigurationOption } from '../../_db/configuration-option';
import { User } from '../../_db/user';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { Session } from '../../_db/session';


import { App } from '../../_enums/app.enum';

import { IEventListElement } from '../../_interfaces/i-event-list-element';
import { IEventExportElementFactory } from '../../_interfaces/i-event-export-element-factory';
import { IEventExportStyle } from '../../_interfaces/i-event-export-style';
import { IEventExportStyleFactory } from '../../_interfaces/i-event-export-style-factory';
import { IEventSelectChoice } from '../../_interfaces/i-event-select-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { UserService } from '../../_services/user.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { SafeResource } from '../../_services/safe-resource';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { CalendarService } from '../../_services/calendar.service';
import { OptionGroupEventExport } from '../../_enums/option-group-event-export.enum';

/**
 * this component exports events as csv file
 *
 * (ATTN: use case for this exported file is not really to be seen:
 * - we hova no corresüonding import for exported events as .csv
 * - using actual events whcih belong to an issue is done by issues which have their aon events array...
 * - exporting events to calenar is done by calendar export
 * )
 *
 *
 */

@Component({
  selector: 'dsy-event-export',
  templateUrl: './event-export.html',
  styleUrl: './event-export.css',
  imports: [FormsModule, SlicePipe, SafeResource]
})
export class EventExportComponent {

  public name = 'EventExportComponent';

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loaded
  public refreshSignal = signal(0);

  // we need session in html template
  session!: Session;

  // db texts
  eventtxt: { [key: string]: string } = {};

  // events are building the model
  events!: Event[];

  // events for export
  eventElements!: IEventListElement[];

  // we choose from .eventSelectOptions
  eventSelectChoices!: Array<IEventSelectChoice>;

  // all users
  users!: Array<User>;

  // all logins in case of /admin
  logins!: Array<string>;

  options!: Array<ConfigurationOption>;

  // day of event - 00:00 in browser timezone
  // if no auth eventOptions exist, we need it for default eventOptions
  eventDay!: Date;
  dateFromDisplay = '';
  dateToDisplay = '';

  // export dates are usually related to today
  isRelatedToEventDay = false;

  exportDayChoices: Array<{value: string, isRelatedToEventDay: boolean, isChecked: boolean}> = [];

  timeZoneIdentifier!: string;
  // difference of browser timezone to UTC - is used to set dates in component
  timeZoneUtcOffset!: number;

  encodedUri!: string;
  fileName!: string;
  fileExtension!: string;
  isFileExtension = false;
  fileType!: string;
  extendedFileName!: string;

  exportEvents!: Event[];
  recordCount!: number;
  // we show header and content (empty line or - if export is prepared - first line)
  // header and content array have columns as index
  showHeader: Array<string> = [];
  showContent: Array<string> = [];
  isFirstLineBuilt = false;
  isMoreFilters = false;

  isShowFilter = false;
  isShowStyle = false;
  isUpdateFileName = false;
  isUpdateFileType = false;
  isUpdateExtendedFileName = false;

  exportReadySignal = signal(0);
  exportFinishedSignal = signal(0);
  resetableSignal = signal(0);

  styleChoices!: Array<{value: number, text: string, isSelected: boolean}>;

  // the style element which contains export styles and column styles
  style!: number;

  // exportStyles are filled from style
  exportStyles!: IEventExportStyle;

  // columnStyles are filled from style for each column
  columnStyles!: Array<{ [key: string]: any }>;
  maxColumn!: number;

  documentWidth = document.documentElement.clientWidth;
  tableScrollStyle = {'width': this.documentWidth, 'overflow-x': 'scroll'};

  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private configurationService: ConfigurationService,
    private userService: UserService,
    private calendarService: CalendarService,
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthenticationService
    ) { }

 async ngOnInit() {
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      const session = this.auth.getSession(this.name);
      this.session = session ? session : this.session;
      this.loadDbTexts();
      await this.getEventOptions();
      await this.getStyles();
      // we load all option values with the default style
      this.style = 0;
      this.maxColumn = this.getMaxColumnFromStyle(this.style);
      if (this.maxColumn < 0) {
        alert(this.auth.txt['no_matching_export_field']);
      }
      this.getOptions(this.style);
      this.resetExport();
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
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
  }

  private async getStyles() {
    this.styleChoices = [];
    const options = await this.configurationService.getConfigurationOptions(this.name);
    const styles = options.
    filter(_ => _.optionArea === 'eventExport'
    && _.optionName.substring(_.optionArea.length + 4) === 'opt_style_name')
    .sort((a, b) => Number(a.optionName.substr(a.optionArea.length + 1, 2)) - Number(b.optionName.substr(b.optionArea.length + 1, 2)));
    styles.forEach(_ => {
      const styleString  = _.optionName.substr(_.optionArea.length + 1, 2);
      let styleName = '';
      styleName = this.auth.txt['style'] ? this.auth.txt['style'] : 'style';
      styleName += ': ' + styleString;
      this.styleChoices.push({
        value: Number(styleString),
        text: _.optionStringValue ? _.optionStringValue : styleName,
        isSelected: Number(styleString) === this.style
      });
    });
  }


  // check if eventOptions exist in session and build eventIssue structures in component
  private async getEventOptions() {
    const session = this.auth.getSession(this.name);
    if (session) {
      // for styles  we load options from option ressources (option.json)
      this.options = await this.configurationService.getConfigurationOptions(this.name);
      // let user choose related day
      this.exportDayChoices = [];
      const showToday = formatDate(new Date(), 'd.MM.yyyy', this.locale);
      const showEventDay = formatDate(session.calendarDay, 'd.MM.yyyy', this.locale);
      if (showToday !== showEventDay) {
        this.exportDayChoices.push({value: this.auth.txt['today'] + ': ' + showToday, isRelatedToEventDay: false, isChecked: true});
        this.exportDayChoices.push({value: this.auth.txt['calendar'] + ' ' + this.auth.txt['date'] + ': '  + showEventDay, isRelatedToEventDay: true, isChecked: false});
      }
    }

    // with buildEventSelectOptions we assure at least default eventSelectOptions and set session eventSelectOption
    this.calendarService.buildEventSelectOptions(this.name);
    // load choices from  session.eventSelectOptions
    this.eventSelectChoices = this.calendarService.getEventSelectChoices(this.isRelatedToEventDay, this.name);
    // set the choosen selectChoice (with actual eventDay => dateFrom, dateTo values) => in this.session.eventSelectOptions
    this.setEventSelectOptionSelected();
  }



  /**
   * we take choosen choice to take eventSelectOption from array of all options
   * and actualize it with choosen dateFrom and dateTo
   *
   * we actualize session.eventSelectOption with choosen option
   */
  private setEventSelectOptionSelected() {
    if (this.eventSelectChoices && this.eventSelectChoices.length > 0) {
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
         this.auth.setSessionEventSelectOption(eventSelectOption, this.name);
      }
      if (eventSelectOption && (eventSelectOption.contactNr !== 0 || eventSelectOption.userId > 0 || eventSelectOption.locationType )) {
        this.isMoreFilters = true;
      } else {
        this.isMoreFilters = false;
      }
    }
  }

  private getMaxColumnFromStyle(style: number): number {

    const area = 'eventExport';
    // no default group 100
    const isStylesHaveDefault = false;

    // for event export can be defined max 99 columns  where the option name is column1,...
    const enumStringType: { [key: string]: any } = OptionGroupEventExport;
    let columnStyles: Array <{ [key: string]: any }> = [];

    Object.keys(OptionGroupEventExport)
    .filter((k: any) => typeof OptionGroupEventExport[k] === 'number' && enumStringType[k] > 100 && enumStringType[k] < 200)
    .forEach(k => {
      const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
        enumStringType[k], isStylesHaveDefault);
      const column: number = Number(enumStringType[k]) - 100;
      if (column >= 0 && column < 100 && s !== undefined) {
        // TODO repair this 
        // columnStyles[column] = s;
      }
    });

    const exportElement = IEventExportElementFactory.empty();
    let maxColumn = -1;
    columnStyles.forEach((_, ix) => {
      if (_['columnContent'] !== undefined
      && _['columnContent'] !== null
      && _['columnContent'] !== ''
      && (exportElement.hasOwnProperty(_['columnContent']) || exportElement.event.hasOwnProperty(_['columnContent']))) {
        maxColumn = ix;
      }
    });

    return maxColumn;

  }


  /**
   * getOptions delivers the style options
   *
   * we use it as following:
   * - each single option exists as property of this component (this.styles) for use in html template
   * - each single option can have a default value in the property definition in this component
   * - each single option is read from option values in auth
   * - if an option has no value, the read call (getStyleOption...) delivers undefined. In this case we let exisiting
   *    value of the property unchanged
   * - so we can use getOptions() first for style = 0 (the default style). This sets all options on default values. Then we call
   *    getOptions() for the defined style - and all options which have values are overwritten
   * - in addition, some groups of options can have a defined default-option (last 2 digits of option group = 00)
   *    - set by a constant is XxxxHaveDefault.
   *    In this case the this.auth.get... call tries to read a default option before returning "undefined"
   *
   * @param style is the second key part of the style options key (first is area, third is optionGroup
   *  optionGroup is  defined for each option when calling this.auth.get...)
   * return true if style is able to export at least 1 field
   */
  private getOptions(style: number) {
    // option group names: see enum OptionGroupEventExport
    // option group types: see util getStyleOptionType

    const area = 'eventExport';
    // no default group 100
    const isStylesHaveDefault = false;

    this.exportStyles = IEventExportStyleFactory.default();

    const enumStringType: { [key: string]: any } = OptionGroupEventExport;
    // set this.styles from eventExport options

    /*
    // TODO repair this
    Object.keys(this.exportStyles)
    .forEach(k => {
      if (k.startsWith('is')) {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['opt_eventExport_' + k]);
        if (s !== undefined) {
          this.exportStyles[k] = s;
        }
      } else {
        const s: string = ConfigurationOptionBasicFunctions.getStyleOptionString(this.options, area, style,
          enumStringType['opt_eventExport_' + k], isStylesHaveDefault);
        if (s !== undefined && k === 'columnDelimiter') {
          switch (true) {
            case  (s.indexOf(COMMA) >= 0 || s.indexOf('comma') >= 0 ):
              this.exportStyles[k] = COMMA;
              break;
            case  (s.indexOf(SEMICOLON) >= 0 || s.indexOf('semicolon') >= 0):
              this.exportStyles[k] = SEMICOLON;
              break;
            case  (s.indexOf('TAB') >= 0):
              this.exportStyles[k] = HORIZONTAL_TAB;
              break;
            default:
              this.exportStyles[k] = COMMA;
              break;
            }
        } else if (s !== undefined && k === 'stringDelimiter') {
          switch (true) {
            case  (s.indexOf(QUOTATION_MARK) >= 0 || (s.indexOf('quotation') >= 0 && s.indexOf('double') >= 0 )):
              this.exportStyles[k] = QUOTATION_MARK;
              break;
            case  (s.indexOf(DOUBLE_QUOTATION_MARK) >= 0 || (s.indexOf('quotation') >= 0 && s.indexOf('double') === -1 )):
              this.exportStyles[k] = DOUBLE_QUOTATION_MARK;
              break;
            default:
              this.exportStyles[k] = DOUBLE_QUOTATION_MARK;
              break;
            }
        } else if (s !== undefined && k === 'rowDelimiter') {
          switch (true) {
            case  (s.indexOf('CR') >= 0):
              this.exportStyles[k] = CRLF;
              break;
            case  (s.indexOf('CR') === -1):
              this.exportStyles[k] = LF;
              break;
            default:
              this.exportStyles[k] = CRLF;
              break;
            }
        } else if (s !== undefined) {
          this.exportStyles[k] = s;
        }
      }
    });

    // we build column styles as an array where array index is the column, from 0 to 99
    // there might be empty columns !!!
    let columnStyles: Array <{ [key: string]: any }> = [];

    Object.keys(OptionGroupEventExport)
    .filter((k: any) => typeof OptionGroupEventExport[k] === 'number' && enumStringType[k] > 100 && enumStringType[k] < 200)
    .forEach(k => {
      const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
        enumStringType[k], isStylesHaveDefault);
      const column: number = Number(enumStringType[k]) - 100;
      if (column >= 0 && column < 100 && s !== undefined) {
        // TODO repair this
        // columnStyles[column] = s;
      }
    });

    this.columnStyles = columnStyles;

    */

    const exportElement = IEventExportElementFactory.default();
    this.columnStyles
    .forEach((_, ix) => {
      // console.log('key of columnStyles:', k);
      // console.log('columnStyle element:', this.columnStyles[k]);
      if (_['columnContent'] !== undefined
      && _['columnContent'] !== null
      && _['columnContent'] !== '' ) {
        this.showHeader[ix] = _['columnHeader'];
        this.showContent[ix]= this.getContent(exportElement, _);
      }
    });

  }

  /**
   * getUsers()
   *  in case of client or server events we use a list of local users
   *   (which can be only local users in case of app=local
   *   or local users and server users with an authorization in case of app=server)
   */
  private getUsers() {
    const session = this.auth.getSession(this.name);
    const allUsers =  this.userService.getUsers(this.name);
     if (session?.app === App.local) {
      this.users = allUsers.filter(_ => _.type === 1 && _.status < 9)
    } else {
      //  in case of app.admin this.users are empty
      this.users = [];
    }

  }


  /**
   * getEvents is derived directly from EventComponent
   *
   */
  private async getEvents() {
  const session = this.auth.getSession(this.name);
    if (session) {
      // get Date from, to from options (add 1 day to dateTo to get midnight of next day as upper limit)
      // TODO UTC timezone
      // const dateFromString = GlobalFunctions.getYMDHM(session.eventSelectOption.dateFrom);
      // const dateToString = GlobalFunctions.getYMDHM(session.eventSelectOption.dateTo);
      const type = (session.eventSelectOption?.isPlan === null && session.isPlan) || session.eventSelectOption?.isPlan ? 0 : 1;
      // eventSelectOption dateTo has the (start of day of) last day of range
      // therefore we must start of next day when getting events which are at last day ...
      const lastDay = GlobalFunctions.addDays(session.eventSelectOption?.dateTo ?? new Date(), 1);
      const allEvents =  this.calendarService.getEvents(this.name);
      // const allContacts = this.contactService.getContacts(this.name);
      // this.eventContacts = allContacts.filter(_ => allEvents.findIndex(event => event.contactNr === _.contactNr) >= 0);
      if (session.app === App.admin) {
        // in case of App.admin userId is not relevant
        // this.eventUsers = this.users?.filter(_ => allEvents.findIndex(event => event.userId === _.userId) >= 0);
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
    }
  }


  /**
   * filterEvents is derived from same method in event.component
   * (we use weokList there, here we use use eventExport - which is a bit different and could be enhanced
   * due to requirements of exort )
   */
  private async filterEvents() {
    const session = this.auth.getSession(this.name);
    let filterContactNr = 0;
    let filterIssueNr = 0;
    if (session && session?.eventSelectOption && session?.eventSelectOption?.contactNr > 0) {
      filterContactNr = session.eventSelectOption.contactNr;
    }
    if (session && session?.eventSelectOption && session?.eventSelectOption?.issueNr && session?.eventSelectOption?.issueNr > 0) {
      filterIssueNr = session.eventSelectOption.issueNr;
    }
  
    this.eventElements = this.calendarService.filterEvents(this.events, this.users, filterContactNr, filterIssueNr, this.name);
  }

  private headerLine (): string {
    let headerString = '';
    this.columnStyles
    .forEach((_, ix) => {
      if (_['columnContent'] !== undefined
      && _['columnContent'] !== null
      && _['columnContent'] !== ''
      ) {
        if ( _['columnHeader'] !== undefined
        && _['columnHeader']  !== null
        && _['columnHeader'] !== '') {
          headerString += this.exportStyles.stringDelimiter;
          headerString += _['columnHeader'] ;
          headerString += this.exportStyles.stringDelimiter;
        }
        if (ix < this.maxColumn) {
          headerString += this.exportStyles.columnDelimiter;
        }
      }
    });
    return headerString;
  }

  private contentLine (el: IEventListElement): string {
    let contentString = '';
    this.columnStyles
    .forEach((_, ix) => {
      if (_['columnContent'] !== undefined
      && _['columnContent'] !== null
      && _['columnContent'] !== ''
      ) {
        const content = this.getContent(el, _);
        if ( content !== '') {
          contentString += this.exportStyles.stringDelimiter;
          contentString += content;
          contentString += this.exportStyles.stringDelimiter;
          // we show first line at user view
          if (!this.isFirstLineBuilt) {
            this.showContent[ix]= content;
          }
        }
        if (ix < this.maxColumn) {
          contentString += this.exportStyles.columnDelimiter;
        }
      }
    });
    this.isFirstLineBuilt = true;
    return contentString;
  }

  private getContent(el: IEventListElement, columnStyle: { [key: string]: any } ): string {
    let content = '';
    let field;
    const columnContent = columnStyle['columnContent'];
    if (!el.hasOwnProperty(columnContent)) {
      if (!el.event || !el.event.hasOwnProperty(columnContent)) {
        return '** error **';
      } else {
        field = el.event[columnContent];
      }
    } else {
      field = el[columnContent];
    }
    // console.log ('field:', el[columnContent]);
    if (typeof field === 'string') {
      if (columnStyle['maxLength']) {
        content = field.substr(0, Number(columnStyle['maxLength']))
      } else {
        content = field;
      }
    } else if (typeof field === 'number') {
      let decimalPositions = 0;
      if (columnStyle['decimalPositions'] && Number(columnStyle['decimalPositions']) >= 0) {
        decimalPositions = Number(columnStyle['decimalPositions']);
      }
      content = field.toFixed(decimalPositions);
    // date is to be exported with formatDate(columnStyle['dateFormat'])
    } else if (typeof field === 'object' && field instanceof Date ) {
      if  (columnStyle['dateFormat']) {
        content = formatDate((field), columnStyle['dateFormat'], this.locale);
      } else {
        content = formatDate((field), 'yyyy-MM-dd HH:mm', this.locale);
      }
      // field has wrong type - for example user has entered "event" as columnContent
    } else {
      return '** error **';
    }

    return content;
  }


  // builds a line in a csv file
  private csvLine(content: string): string {
    return content + this.exportStyles.rowDelimiter;
  }

  /** --------------------------  public methods -------------------------------------------- */

  async setExportDay(event: any) {
    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    this.exportDayChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isChecked = true;
      } else {
        _.isChecked = false;
      }
    });
    if (this.exportDayChoices.filter(_ => _.isRelatedToEventDay)[0].isChecked) {
      this.isRelatedToEventDay = true;
    } else {
      this.isRelatedToEventDay = false;
    }
    await this.getEventOptions();
    this.resetExport();
  }


  // user sets filter (choosen from auth.eventOptions.eventSelectOptions - in this.eventSelectChoices)
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
      // choosen filter is fixed in auth.eventSelectOption
    await this.setEventSelectOptionSelected();
    this.resetExport();
  }

  selectStyle(event: any) {
    if (event.target.value) {
      const maxColumn = this.getMaxColumnFromStyle(Number(event.target.value));
      if (maxColumn === -1) {
        // option remains unchanged
        alert(this.auth.txt['no_matching_export_field']);
      } else {
        this.styleChoices.forEach(_ => {
          if (_.value === Number(event.target.value)) {
            _.isSelected = true;
            this.style = _.value;
          } else {
            _.isSelected = false;
          }
        });
        this.columnStyles = [];
        this.showHeader = [];
        this.showContent = [];
        // we set options of default style first
        this.getOptions(0);
        this.getOptions(this.style);
        this.resetExport();
      }
    }
  }

  resetExport() {
    // get filename  and standard extension format from option
    this.fileName = this.exportStyles.fileName;
    this.fileExtension = formatDate(new Date(), 'yyyyMMdd_HHmm', this.locale);
    this.isFileExtension = this.exportStyles.isFileExtension;
    this.fileType = this.exportStyles.fileType;
    this.extendedFileName = this.fileName + (this.isFileExtension ? '_' + this.fileExtension : '') + '.' + this.fileType;
    this.exportReadySignal.set(0);
    this.resetableSignal.set(0);
    this.exportFinishedSignal.set(0);
    this.isUpdateExtendedFileName = false;
    this.isUpdateFileName = false;
    this.isUpdateFileType = false;
    this.isFirstLineBuilt = false;
    this.refreshSignal.set(1);
  }

  setShowFilter() {
    this.isShowFilter = !this.isShowFilter;
  }

  setShowStyle() {
    this.isShowStyle = !this.isShowStyle;
  }

  setUpdateExtendedFileName() {
    this.isUpdateExtendedFileName = !this.isUpdateExtendedFileName;
  }

  setUpdateFileName() {
    this.isUpdateFileName = true;
  }

  updateFileName(name: string) {
    this.fileName = name;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileName = false;
    this.resetableSignal.set(1);
  }

  setUpdateFileType() {
    this.isUpdateFileType = true;
  }

  updateFileType(type: string) {
    this.fileType = type;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileType = false;
    this.resetableSignal.set(1);
  }

  setShowExtension(event: any) {
    this.isFileExtension = event.target.checked;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;;
    this.resetableSignal.set(1);
  }

  async prepareExport() {
    let textContent = '';
    this.recordCount = 0;
    this.getUsers();
    // we prepare events according to filter
    await this.getEvents();
    this.filterEvents();
    const today = new Date();
    if (this.exportStyles.isColumnHeaders === true) {
      textContent += this.csvLine(this.headerLine());
    }
    this.eventElements.forEach(_ => {
      textContent += this.csvLine(this.contentLine(_));
      this.recordCount++;
    });
    this.encodedUri = 'data:' + this.exportStyles.mimeType + ';charset='+ this.exportStyles.charset + ',' + encodeURIComponent(textContent);
    this.exportReadySignal.set(1);
    this.resetableSignal.set(1);
  }

  async setExportFinished() {
    this.isShowFilter = false;
    this.isShowStyle = false;
    this.exportFinishedSignal.set(1);
  }

}

