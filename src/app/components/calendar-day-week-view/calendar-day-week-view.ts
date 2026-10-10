import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener, signal} from '@angular/core';
import { formatDate, NgStyle, SlicePipe, DatePipe } from '@angular/common';

import { StyleFactory } from '../../_globals/style-factory';
import { GAINSBORO, GREEN, LIGHT_CORAL, LIGHT_GREY, POWDER_BLUE, RED, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { LocationType } from '../../_enums/location-type.enum';
import { OptionGroupWorkCalendar } from '../../_enums/option-group-work-calendar.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Work } from '../../_db/work';
import { WorkFactory } from '../../_db/work-factory';
import { Session } from '../../_db/session';


import { IWorkGridElement } from '../../_interfaces/i-work-grid-element';
import { IChoice } from '../../_interfaces/i-choice';
import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';



@Component({
  selector: 'dsy-calendar-day-week-view',
  templateUrl: './calendar-day-week-view.html',
  styleUrl: './calendar-day-week-view.css',
  imports: [NgStyle, SlicePipe, DatePipe]
})
export class WorkDayWeekViewComponent implements OnInit {

  public name = 'WorkDayWeekViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  @Input({required: true}) actualWorks: Array<Work>;
  @Input({required: true}) planWorks: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;

  @Input({required: true}) timeSpans: Array<Work>;
  @Input({required: true}) timeSpanChangeCounter: number;

  // categories are indexed by type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeColors: Array<{text: string, color: string}>;

  @Input({required: true}) isSelecting: boolean;

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) userOpts: IUserWorkOptions;


  @Output() workDayAndPlanSelected = new EventEmitter<{date: Date, isPlan: boolean}>();

  @Output() workSelect = new EventEmitter<{isSelect: boolean, id: number}>();

  @Output() viewSelected = new EventEmitter<string>();

  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, work: Work, d: Date}>();
  
  locationTypeEnum: typeof LocationType = LocationType;

  // the 7 or 8 day-columns
  weekColumns: Array<{date: Date, dateDisplay: string, isToday: boolean, isWorkDay: boolean, isPlan: boolean, isSelected: boolean}>  = [];
  // 7 week days
  weekDays: Array<{date: Date, dateDisplay: string, isToday: boolean, isWorkDay: boolean, isPlan: boolean, isSelected: boolean}>  = [];

  // rows are time span  elements, 7 or 8 day-elements in a row
  timeSpanGrid: Array<Array<IWorkGridElement>> = [];

  // rows are 5 minute elements, 7 or 8 day-elements in a row
  weekGrid: Array<Array<IWorkGridElement>> = [];

  isShowBeforeStartHour = false;
  isShowAfterLastHour = false;

  // show plan also for days before today
  isShowPlan = false;
  isTodayInWeek = false;
  isTodayAfterWeek = false;

  public readySignal = signal(0);

  // styles are set from optionGroupWorkCalendar - here we set just the default options:
  styles = {
    // 010
    tableBgStyle : {
      'width': '70%'
    },
    // 102
    tableStyle : {
    },
    // 201
    tableHeaderStyle : {
      'height': '8px',
      'verticalAlign': 'middle',
      'lineHeight': '8px'
    },
    // 202
    // line height generic
    tableRowStyle : {
      'verticalAlign': 'middle'
    },
    // 203 . not used
    tableFooterStyle : {
    },
    // 301
    timeElementStyle : {
      'background-color': POWDER_BLUE
    },
    // 302
    timeInTimeElementStyle : {
      'font-size': '70%'
    },
    // 303
    timeElementOutsideStyle : {
      'background-color': LIGHT_CORAL
    },
    // 401
    workElementStyle : {
      'background-color': POWDER_BLUE
    },
    // 402
    timeStyle : {
      'position': 'relative',
      'left': '5px',
      'font-size': '70%'
    },
    // 403
    durationStyle : {
      'font-size': '60%'
    },
    // 404
    workStyle : {
      // 'position': 'relative',
      // left margin not used, we need all space for text  'left': '30px',
      // fonr-size and font-weight not necessary, will be overwritten ...
      // 'font-size': '9%',
      // 'font-weight': 'bold'
    },
    // 405
    locationStyle : {
      'font-size': '80%',
      'font-weight': 'normal'
    },
    // 406
    descriptionStyle : {
      'font-size': '70%',
      'font-weight': 'normal'
    },
    // 407
    // attn: background-color is set from color scheme of customer
    custStyle : {
      'font-size': '50%',
      'font-weight': 'bold'
    },
    // 501 - 505
    isShowDuration: false,
    isShowLocation: false,
    isShowDescription: false,
    isShowTimeColumn: false,
    isShowCustIssueColumn: false
  };

  // component specific overrides of styles

  rowBottomNoPaddingStyle = {
    'padding-bottom': '0'
  }

  leftIconStyle =  {
    'padding-left': '0',
    'margin-left' : '-10px'
  }

  workElementStyle: {};
  workStyle: {};
  choosenWorkStyle: {};

  locationStyle: {};
  descriptionStyle: {};

  planHeaderBoldStyle = {
    'cursor':  'pointer',
    'font-weight':  'bold'
  }

  planHeaderNormalStyle = {
    'cursor':  'pointer',
    'font-weight':  'normal'
  }

  expandIconStyle = {
    'cursor':  'pointer',
    'font-size': '150%',
    'line-height': '2',
    'margin-top': '-10px'
  }

  // window width for selecting length of summaryDisplay
  windowWidth = window.innerWidth;
  windowFactor = this.windowWidth >= WINDOW_WIDTH_TABLET ? 1 : 0.7;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;

  constructor() { }

  ngOnInit() {
  }


  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetWorks = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts' || propKey === 'options' || propKey === 'workDayChangeCounter') {
        // this.opts = propValue.currentValue;
        if (this.session.workDay) {
          this.loadOptions();
          isSetWorks = true;
        }
      }
      if (propKey === 'worksChangeCounter' || propKey === 'timeSpanChangeCounter') {
        isSetWorks = true;
      }
      // console.log('work-day-week propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetWorks) {
      if (this.actualWorks  && this.planWorks  && this.timeSpans) {
        this.buildColumns();
        this.buildWeekGrid();
        this.readySignal.set(this.readySignal() + 1);
      }
    }
  }

  /**
   * we load style options from auth
   */
  private loadOptions() {
    if (this.userOpts && this.options) {
      // getting style options
      // first we load all option values with the default style
      this.getOptions(0);
      // then we take style from opts
      const style = this.userOpts.style;
      if (style === undefined || style ===  null || style <= 0 || style > 99) {
        // default option = 00 is already loaded
      } else {
        this.getOptions(style);
      }

      // we override some styles

      const {...workElementStyles} = this.styles.workElementStyle;
      // we override vertical align because we arrange elements in <td> vertical
      // overflow: visible to show tooltip over other table elements
      this.workElementStyle = {...workElementStyles,  'cursor': 'pointer', 'vertical-align':  'top', 'overflow': 'visible'};
      const {...workStyles} = this.styles.workStyle;
      // we override font-weight according to choosen column
      // and margin-left to shift text at the left border of element (in the moment not ative)
      // and we set font-size

      this.workStyle = {...workStyles, 'font-size':  '80%',  'font-weight':  'normal', 'margin-left': '-5px'};
      this.choosenWorkStyle = {...workStyles, 'font-size':  '80%', 'font-weight':  'bold', 'margin-left': '-5px'};

      // we adapt location and description styles - but we do not need them in the moment, see below ....
      const {...locationStyles} = this.styles.locationStyle;
      this.locationStyle =  {...locationStyles,  'margin-top': '-10px'};
      const {...descriptionStyles} = this.styles.descriptionStyle;
      this.descriptionStyle =  {...descriptionStyles,  'margin-top': '-10px'};

      // we show no time column, no description, no location in week-view
      // TODO check duration of workElement and show description, location if length is enough
      this.styles.isShowTimeColumn = false;
      this.styles.isShowLocation = false;
      this.styles.isShowDescription = false;
    }
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
   */
  private getOptions(style: number) {
    // option group names: see enum OptionGroupWorkCalendar
    // option group types: see util getStyleOptionType

    const area = 'workCalendar';
    // no default group 100
    const isStylesHaveDefault = false;
    const enumStringType: { [key: string]: any } = OptionGroupWorkCalendar;
    const stylesStrinKeys: { [key: string]: any } = this.styles;
    // set this.styles from workCalendar options
    Object.keys(this.styles)
    .forEach(k => {
      //       if (k.startsWith('is') && this.styles[k] === typeof 'boolean') {
      if (k.startsWith('is') && typeof stylesStrinKeys[k] === 'boolean') {
        // console.log('type: ',  typeof this.styles[k] );
        // console.log('opt_group: ',  k, OptionGroupWorkCalendar['opt_workCalendar_' + k]);
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['opt_workCalendar_' + k]);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      //   } else  {
      } else if (typeof stylesStrinKeys[k] === 'object') {
        // console.log('type: ',  typeof this.styles[k] );
        // console.log('opt_group',  k, OptionGroupWorkCalendar['opt_workCalendar_' + k]);
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_workCalendar_' + k], isStylesHaveDefault);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      }
    });
    // console.log('this.styles:', this.styles);

  }

  private buildColumns(isShowPlanReset?: boolean) {
    this.weekColumns = [];
    this.weekDays = [];
    this.isTodayInWeek = false;
    const today = GlobalFunctions.getStartOfDay(new Date());
    // if user has chosen plan at days before workDay
    if (GlobalFunctions.getDateInMinutes(this.session.workDay) < GlobalFunctions.getDateInMinutes(today) && this.session.isPlan) {
      this.isShowPlan = isShowPlanReset ? false : true;
    }
    // weekDay is day (0 - 6) of selected workDay
    const weekDay = GlobalFunctions.getWeekDay(this.session.workDay, 0, this.locale);
    // weekBegin is the date of first day of week
    const weekBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.workDay), -1 * weekDay);
    const nextWeekBegin = GlobalFunctions.addDays(weekBegin, 7);
    if (GlobalFunctions.getDateInMinutes(weekBegin) <= GlobalFunctions.getDateInMinutes(today)) {
      if (GlobalFunctions.getDateInMinutes(today) < GlobalFunctions.getDateInMinutes(nextWeekBegin)) {
        this.isTodayInWeek = true;
      } else {
        this.isTodayAfterWeek = true;
      }
    }
    // all days, starting with 0 = first day of week
    let date: Date;
    let isToday: boolean;
    let isPlan: boolean;
    let isWeekDayPlan: boolean;
    let isWorkDay: boolean;
    let isSelected: boolean;
    let dateDisplay: string;
    for (let index = 0; index <= 6; index++) {
      const todayWeekDay = GlobalFunctions.getWeekDay(today, 0, this.locale);
      if (this.isTodayInWeek && index === todayWeekDay) {
        date = today;
        dateDisplay = formatDate(date, 'EEE dd.MM', this.locale);
        isToday = true;
        // first column of today is actual column
        isPlan = false;
        isWorkDay = weekDay === index ? true : false;
        isSelected = !this.session.isPlan;
        this.weekColumns.push({date, dateDisplay, isToday, isWorkDay, isPlan, isSelected});
        // second column of today is plan column
        isPlan = true;
        isSelected = this.session.isPlan;
        isWeekDayPlan = isSelected;
      } else {
        // regular counting one column for each day
        date = GlobalFunctions.addDays(weekBegin, index);
        dateDisplay = formatDate(date, 'EEE dd.MM', this.locale);
        isToday = false;
        isPlan = GlobalFunctions.getDateInMinutes(today) < GlobalFunctions.getDateInMinutes(date)
        ? true: false;
        // workDay always lies in week!!
        isWorkDay = weekDay === index ? true : false;
        isSelected = isWorkDay;
        isWeekDayPlan = isPlan;
      }
      this.weekColumns.push({date, dateDisplay, isToday, isWorkDay, isPlan, isSelected});
      this.weekDays.push({date, dateDisplay, isToday, isWorkDay, isPlan: isWeekDayPlan, isSelected: isWorkDay});
      if (this.isShowPlan) {
        this.weekColumns = this.weekColumns.filter(_ => !_.isToday || _.isPlan);
        this.weekColumns.forEach(_ => _.isPlan = true);
        this.weekDays.forEach(_ => _.isPlan = true);
      }
    }
  }


  private buildWeekGrid() {
    // time span building searches the fitting row for each timeSpan
    // each timeSpan lays in week of this.session.workDay
    this.timeSpanGrid = [];
    const today = GlobalFunctions.getStartOfDay(new Date());
    // weekBegin is the date of first day of week
    const weekDay = GlobalFunctions.getWeekDay(this.session.workDay, 0, this.locale);
    const weekBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.workDay), -1 * weekDay);
    const lastWeekDay = GlobalFunctions.addDays(weekBegin, 6);
    // timeSpanElements belongs to one timeSpan
    const timeSpanElements = this.timeSpans.filter(_ => GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(lastWeekDay, 1))
    && GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(weekBegin) )
    .map(_ => {
      const {...rest} = _;
      // in the moment we cat is used just for sort
      const cat =  _.type % 10;
      // first we build  ixFrom and ixTo as the weekdays (0 to 6) where timeSpan begins and ends
      let ixFrom = GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(weekBegin)
      ? 0
      : GlobalFunctions.getWeekDay(_.workBegin, 0, this.locale);
      let ixTo = GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(lastWeekDay)
      ? 6
      : GlobalFunctions.getWeekDay(_.workEnd, 0, this.locale) > 0 ? GlobalFunctions.getWeekDay(_.workEnd, 0, this.locale) - 1 : 0;
      // if today is in week, we have one column more ....
      const todayWeekDay = GlobalFunctions.getWeekDay(today, 0, this.locale);
      if (this.isTodayInWeek) {
        if (ixFrom === todayWeekDay) {
          // holidays and birthdays remain at left column of today (we need not adapt ixTo cause this timeSpans are one day spans)
          if (_.type > 22 && GlobalFunctions.getDateInMinutes(_.workBegin) >= GlobalFunctions.getDateInMinutes(weekBegin)) {
            ixFrom++;
          }
          ixTo++;
        } else if (ixFrom < todayWeekDay && ixTo >= todayWeekDay) {
          ixTo++;
        } else if (ixFrom > todayWeekDay) {
          ixFrom++;
          ixTo++;
        }
      }
      return {
        ...rest, cat, ixFrom, ixTo
      }
    }).sort((a, b) => a.cat * 100 + a.ixFrom * 10 + a.ixTo - (b.cat * 100 + b.ixFrom * 10 + b.ixTo))
    .forEach(_ => {
      // first we search for an empty range in existing rows
      let emptyRow: number = -1;
      for (let row = 0; row < this.timeSpanGrid.length; row++) {
        let isEmpty = true;
        for (let column = _.ixFrom; column <= _.ixTo; column++) {
          if (this.timeSpanGrid[row][column] !== null) {
            isEmpty = false;
          }
        }
        if (isEmpty) {
          emptyRow = row;
          break;
        }
      }
      if (emptyRow >= 0) {
        this.buildTimeSpanGrid(_, _.ixFrom, _.ixTo).forEach((element, ix) => this.timeSpanGrid[emptyRow][_.ixFrom + ix] = element);
      } else {
        const newRow: IWorkGridElement[] = [];
        for (let newColumn = 0; newColumn < this.weekColumns.length; newColumn++) {
          newRow[newColumn] = null;
        }
        this.buildTimeSpanGrid(_, _.ixFrom, _.ixTo).forEach((element, ix) => newRow[_.ixFrom + ix] = element);
        this.timeSpanGrid.push(newRow);
      }
    });
    // grid building is analog to buildGrid in work-day-grid-view, but we build 7 or 8 grids for each day
    // according to previously built weekColumns
    this.weekGrid = [];
    const daysHours: Array<Array<IWorkGridElement>> = [];
    this.weekColumns.forEach((_, index) => {
      const works = _.isPlan === true ? this.planWorks : this.actualWorks;
      daysHours[index] = this.buildGrid(GlobalFunctions.buildWorks(works, _.date, true, false), _.date);
    })
    // now we transpose the daysHours matrix to get rows for the timeSlizes and columns for the days
    this.weekGrid =  daysHours[0].map((x,i) => daysHours.map(x => x[i]));
  }


  /**
   * buildTimeSpanGrid builds a grid element for each day in day columns
   * - code is similar to work-day-grid-view
   *
   * @param work timeSpam
   * @param ixFrom  day index of begin
   * @param ixFrom  day index of end
   * @returns arrray of  elements for the days between isFrom and ixTo
   */
  private buildTimeSpanGrid(work: Work, ixFrom: number, ixTo: number): IWorkGridElement[] {
    const elements: IWorkGridElement[] = [];
    // we build a workGridElement for each column
    //  in the moment they are all the same; we use just element in column ixFrom
    for (let i = ixFrom; i <= ixTo; i++) {
      let custIssueNr = '';
      let custIssueName = '';
      let leftCustStyle = {};
      let rightCustStyle = {};
      // time spans have their own workElementStyle
      let workElementStyle = {};
      let summaryDisplay = work.summary;
      const category = this.timeSpanTypeColors[work.type % 10].text;
      const color = this.timeSpanTypeColors[work.type % 10].color;
      // stringLength depends on viewPort size - resizing is done in html template, thus we can react on resizing event
      if (i === ixFrom && ixTo - ixFrom > 1) {
        let stringLength = 20 + (ixTo - ixFrom) * 20 - work.summary.length - category.length;
        // console.log(work.summary, ' stringLength: ', stringLength );
        if (stringLength > 0) {
          const lineString = (new Array(stringLength)).join('-');
          summaryDisplay = work.summary + '  ' + lineString;
        }
      }
      if (work.customerNr && work.customerNr > 0) {
        custIssueNr = work.workInfo.customerDisplayNr;
        custIssueName = work.workInfo.customerName;
        const custStyle = StyleFactory.getBgColorStyle(work.workInfo.customerColor, 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftCustStyle = {...custStyle, 'margin-right' : '5px'};
        rightCustStyle = {...custStyle, 'margin-left' : '10px'};
        workElementStyle = StyleFactory.getBgColorStyle(work.workInfo.customerColor, 90, 0, workElementStyle);
        // we want to see tooltip, but we can set overflow only in one-column design cause it would interfere with nowrap, hidden ....
        workElementStyle = ixFrom === ixTo ? {...workElementStyle, 'overflow': 'visible'} : workElementStyle;
      } else if (color !== '') {
        // we set color from time span category
        workElementStyle = StyleFactory.getBgColorStyle(color, 80, 2, workElementStyle);
      } else {
        workElementStyle = {...workElementStyle, 'background-color': WHITE_SMOKE};
      }
      workElementStyle =  work.type > 22 ? {...workElementStyle, 'cursor': 'pointer'} : workElementStyle;
      const element: IWorkGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, work: work,
      workBegins: true, workEnds: true, workDurationDisplay: '', workRowSpan: 0,
      custIssueNr, custIssueName, category,
      leftCustStyle, rightCustStyle, workElementStyle,
      summaryDisplay, ixFrom, ixTo
      };
      elements.push(element);
    }
    return elements;
  }


  /**
   * buildGrid builds a 1 day 5min grid - code is equivalent to work-day-grid-view
   *
   * @param works array of works for a day
   * @param workDay  day for the grid
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(works: Work[], workDay: Date): IWorkGridElement[] {
    // we check works of this day ....

    const isWorkBeforeStartHour = works?.filter(_ => GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(workDay)
      && GlobalFunctions.getDateInMinutes(_.workEnd) < GlobalFunctions.getDateInMinutes(workDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(workDay) + this.userOpts.startHour* 60).length > 0;
    const isWorkAfterLastHour = works?.filter(_ => GlobalFunctions.getDateInMinutes(_.workBegin) >= GlobalFunctions.getDateInMinutes(workDay)
      && GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(workDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(workDay) + this.userOpts.lastHour * 60).length > 0;
    const styleStringKey: { [key: string]: any } = this.workElementStyle;
    const workColor = styleStringKey['background-color'];
    const grid: IWorkGridElement[] = [];
    const gridBegin = this.isShowBeforeStartHour  ? 0 : this.userOpts.startHour * 60;
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5 : this.userOpts.lastHour * 60 -5;
    for (let i = gridBegin; i <= gridEnd; i += 5) {
      let work: Work;
      let minutesBefore: number;
      let minutesAfter: number;
      if (works && works.length > 0) {
        let ix: number;
        ix = works.findIndex(_ =>
          GlobalFunctions.getDateInMinutes(_.workBegin)
            - GlobalFunctions.getDateInMinutes(workDay) <= i &&
          GlobalFunctions.getDateInMinutes(_.workEnd)
            - GlobalFunctions.getDateInMinutes(workDay) >= (i + 5)
        );
        if (ix >= 0) {
          work = works[ix];
          if (ix > 0) {
            minutesBefore = GlobalFunctions.getDateInMinutes(works[ix - 1].workEnd)
            - GlobalFunctions.getDateInMinutes(workDay);
          }
          if (ix < works.length - 1) {
            minutesAfter = GlobalFunctions.getDateInMinutes(works[ix + 1].workBegin)
            - GlobalFunctions.getDateInMinutes(workDay);
          }
        }
      }
      let custIssueNr = '';
      let custIssueName = '';
      let leftCustStyle = {};
      let rightCustStyle = {};
      let workElementStyle: {} = GlobalFunctions.clone(this.workElementStyle);
      if (work && work?.workInfo) {
        // we set color via custStyle - if no customer defined, style is set to light grey via StyleFactory
        const custStyle = StyleFactory.getBgColorStyle(work.workInfo.customerColor, 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftCustStyle = {...custStyle, 'margin-right' : '5px'};
        rightCustStyle = {...custStyle, 'margin-left' : '10px'};
        workElementStyle = StyleFactory.getBgColorStyle(work.workInfo.customerColor, 90, 0, workElementStyle);
        let customerName = work.workInfo.customerName && work.workInfo.customerName !== ''
          ? work.workInfo.customerName
          : work.workInfo.customerNr > 0
            ? (this.session.serviceLevel.customer === 1 ? this.txt['contact'] : this.txt['customer']) + ': ' + work.workInfo.customerNr.toString()
            : '';
        if (work.customerNr > 0 && work.issueProviderId > 0) {
          custIssueNr =  work.workInfo.issueDisplayNr;
          custIssueName = work.workInfo.issueText?.substring(0,30) + '|' + customerName.substring(0,20);
        } else if (work.customerNr > 0) {
          custIssueNr = work.workInfo.customerDisplayNr;
          custIssueName = customerName.substring(0,30);
        } else if (work.issueProviderId > 0) {
          custIssueNr =  work.workInfo.issueDisplayNr;
          custIssueName = work.workInfo.issueText?.substring(0,30);
        }
      }
      const timeElementStyle = i < (this.userOpts.startHour * 60) || i >= (this.userOpts.lastHour * 60) ? this.styles.timeElementOutsideStyle : this.styles.timeElementStyle;
      const timeInTimeElementStyle: { [key: string]: any } = GlobalFunctions.clone(this.styles.timeInTimeElementStyle);
      timeInTimeElementStyle['font-weight'] = i % 60 === 0 ? 'bold' : 'normal';
      const tableRowStyle: { [key: string]: any }= GlobalFunctions.clone(this.styles.tableRowStyle);
      tableRowStyle['height'] = Math.floor(40/Number(Number(this.userOpts.timeSlize))).toString() + 'px';
      // semantic ui styles borders with border-top at td elements
      //   so border top must be enabled (by setting to 'none' at elements which are not multiples of timeSlize)
      //   and we must reduce padding cause semantic ui very compact table sets it to 0.4em
      const borderUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
      // we round to timeSlize (max. 30min) - if reounded value is not possible, we try the other rounded alternative ...
      let roundedMinutes = Math.round(i / borderUnit) * borderUnit;
      roundedMinutes = roundedMinutes < minutesBefore ? (roundedMinutes + borderUnit > minutesAfter ? i : roundedMinutes + borderUnit)
        : roundedMinutes > minutesAfter ? (roundedMinutes - borderUnit < minutesBefore ? i : roundedMinutes - borderUnit) : roundedMinutes;
      const rowElementStyle = i === gridBegin && isWorkBeforeStartHour && !this.isShowBeforeStartHour ? {
          'border-top-width' :  'thick',
          'border-top-style' :  'solid',
          'border-top-color' :  workColor,
          'padding' : '0.1em'
        }
        : i === gridEnd && isWorkAfterLastHour && !this.isShowAfterLastHour ? {
          'border-bottom-width' : 'thick',
          'border-bottom-style' : 'solid',
          'border-bottom-color' : workColor,
          'padding' : '0.1em'
        }
        : {
          'border-top' : i % borderUnit === 0 ? null : 'none',
          'border-top-width' : i % 60 === 0 ?  '2px' : i % 30 === 0 && Number(this.userOpts.timeSlize) === 60  ? '1px dashed' : null,
          'padding' : '0.1em'
        };
      const timeUnit = Number(this.userOpts.timeSlize) === 5 ? 15 : Number(this.userOpts.timeSlize) === 10 ? 30 : Number(this.userOpts.timeSlize);
      let workBegin = 0;
      let workEnd = 0;
      let assocTxt = '';
      if (work) {
        workBegin = GlobalFunctions.getDateInMinutes(work.workBegin) - GlobalFunctions.getDateInMinutes(workDay);
        workBegin = workBegin < gridBegin ? gridBegin : workBegin;
        workEnd = GlobalFunctions.getDateInMinutes(work.workEnd) - GlobalFunctions.getDateInMinutes(workDay);
        workEnd = workEnd > gridEnd + 5 ? gridEnd + 5 : workEnd;
        if (work.assocWorkBegin && work.assocWorkEnd && (GlobalFunctions.getDateInMinutes(work.assocWorkBegin) !== GlobalFunctions.getDateInMinutes(work.workBegin)
        || GlobalFunctions.getDateInMinutes(work.assocWorkEnd) !== GlobalFunctions.getDateInMinutes(work.workEnd))) {
          assocTxt = GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(work.assocWorkBegin)
          - GlobalFunctions.getDateInMinutes(workDay)) + ' - ' + GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(work.assocWorkEnd)
          - GlobalFunctions.getDateInMinutes(workDay));
        }
      }
      const element: IWorkGridElement = {minutes: i,
        roundedMinutes,
        timeElement: i % timeUnit === 0 ? GlobalFunctions.getTimeFormatted(i) : '',
        timeRowSpan: timeUnit / 5,
        timeBegins:  i % timeUnit === 0 ? true : false,
        work,
        workBegins: work ? workBegin === i : false,
        workEnds: work ? workEnd === i + 5 : false,
        workDurationDisplay: work ? GlobalFunctions.minutesDisplay(work.workDuration) : '',
        workRowSpan:  work ? (workEnd - i) / 5 : 0,
        custIssueNr,
        custIssueName,
        tableRowStyle,
        timeElementStyle,
        timeInTimeElementStyle,
        rowElementStyle,
        leftCustStyle,
        rightCustStyle,
        workElementStyle,
        assocTxt
        };
      grid.push(element);
      // console.log('element:', element);
    }
    return grid;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // console.log(event.target.innerWidth);
    this.windowWidth = event.target.innerWidth;
    this.windowFactor = this.windowWidth >= WINDOW_WIDTH_TABLET ? 1 : 0.8;
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setPointer(style: {}, isActive: boolean) {
    if (isActive) {
      const pointerStyle = {...style, 'cursor':  'pointer'};
      return pointerStyle;
    } else {
      return style;
    }
  }

  public toggleShowPlan(event: any) {
    if (event.target.checked === true && !this.isShowPlan) {
      this.weekColumns = this.weekColumns.filter(_ => !_.isToday || _.isPlan);
      this.weekColumns.forEach(_ => _.isPlan = true);
      this.weekDays.forEach(_ => _.isPlan = true);
      this.isShowPlan = true;
      // we leave workDay the same, but change isPlan
      this.workDayAndPlanSelected.emit({date: this.session.workDay, isPlan: this.isShowPlan});
      this.buildWeekGrid();
    } else if (event.target.checked === false && this.isShowPlan) {
      this.isShowPlan = false;
      // we leave workDay the same, but change isPlan
      this.workDayAndPlanSelected.emit({date: this.session.workDay, isPlan: this.isShowPlan});
      this.buildColumns(true);
      this.buildWeekGrid();
    }
  }

  public setWorkDay(index: number) {
    if (!this.weekDays[index].isWorkDay) {
      // we change workDay AND set plan to the according value (which is shown to user)
      this.workDayAndPlanSelected.emit({date: this.weekDays[index].date, isPlan: this.weekDays[index].isPlan});
    }
    // we change view to grid-view (day calendar)
    if (!this.isSelecting) {
      this.viewSelected.emit('grid-view');
    }
  }

  public setHeaderDayStyle(index: number): {} {
    let style = {};
    style = index === 6 || this.timeSpans?.filter(_ => _.type === 21 && GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(this.weekDays[index].date, 1) )
    && GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(this.weekDays[index].date)).length > 0  ? {
      'color': RED
    } : {};
    style =  this.weekDays[index].isToday ? {...style,
      // 'text-decoration': 'underline'
      'background-color': GAINSBORO
    } : style;
    style = this.weekDays[index].isSelected ? {...this.planHeaderBoldStyle, ...style} : {...this.planHeaderNormalStyle, ...style};
    return style;
  }

  public setTimeSpanCategoryStyle(index: number, element: IWorkGridElement): {} {
    let style = {};
    style = element.work.type === 21 ? {
      'color': RED
    } : {};
    style = this.weekColumns[index].isSelected && GlobalFunctions.getDateInMinutes(element.work.workBegin) === GlobalFunctions.getDateInMinutes(this.weekDays[index].date) ? {...this.planHeaderBoldStyle, ...style} : {...this.planHeaderNormalStyle, ...style};
    return style;
  }

  public setTimeSpanSummaryStyle(index: number, element: IWorkGridElement): {} {
    let style = {};
    style = element.work.type === 21 ? {
      'color': RED
    } : {};
    style = element.ixTo - element.ixFrom > 1 ? {
      'white-space': 'nowrap',
      'overflow': 'hidden'
      , ...style
    } : style;
    return style;
  }

  public setPlan(index: number) {
  // we change workDay AND set plan to the according value (which is shown to user)
  // we do not check if workday cause at today we use setPlan to change between actual and plan
  this.workDayAndPlanSelected.emit({date: this.weekColumns[index].date, isPlan: this.weekColumns[index].isPlan});
  }

  // work can also be a timeSpan
  public enableWorkCard(work: Work) {
    this.cardFormViewEnabled.emit({updateType: UpdateType.update, work, d: null});
  }

  public insertWorkCard(minutes: number) {
    // we allow insert of actual works unlimited - actual is disabled at view after today !!
    if (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.workDay)) {
      let isInsertWork = true;
      const prevMonth = GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(new Date()), -1);
      if (GlobalFunctions.getDateInMinutes(this.session.workDay) < GlobalFunctions.getDateInMinutes(prevMonth)) {
      if (!confirm(this.txt['new_work_before_previous_month']+ '?')) {
          isInsertWork = false;
        }
      }
      if (isInsertWork) {
        const work = WorkFactory.empty();
        // we round to multiple of timeSlize (max. 30)
        const timeUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
        minutes = Math.round(minutes/timeUnit) * timeUnit;
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, work,
          d: GlobalFunctions.addMinutes(this.session.workDay, minutes)});
      }
    }
  }

  public toggleShowBeforeStartHour() {
    if (this.isShowBeforeStartHour) {
      this.isShowBeforeStartHour = false;
    } else {
      this.isShowBeforeStartHour = true;
    }
    this.buildWeekGrid();
  }

  public toggleShowAfterLastHour() {
    if (this.isShowAfterLastHour) {
      this.isShowAfterLastHour = false;
    } else {
      this.isShowAfterLastHour = true;
    }
    this.buildWeekGrid();
  }


  public selectWork(work: Work) {
    if (work.isSelected) {
      work.isSelected = false;
    } else {
      work.isSelected = true;
    }
    this.workSelect.emit({isSelect: work.isSelected, id: work.workId});
  }

}


