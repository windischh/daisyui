import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener} from '@angular/core';

import { GAINSBORO, GREEN, LIGHT_CORAL, POWDER_BLUE, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { StyleFactory } from '../../_globals/style-factory';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { GlobalFunctions } from '../../_globals/global-functions';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { OptionGroupWorkCalendar } from '../../_enums/option-group-work-calendar.enum';
import { WorkType } from '../../_enums/work-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Work } from '../../_db/work';
import { WorkFactory } from '../../_db/work-factory';
import { Session } from '../../_db/session';

import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';
import { IWorkGridElement } from '../../_interfaces/i-work-grid-element';
import { IChoice } from '../../_interfaces/i-choice';
import { NgStyle, NgClass, SlicePipe, DatePipe } from '@angular/common';



@Component({
  selector: 'dsy-calendar-day-grid-view',
  templateUrl: './calendar-day-grid-view.html',
  styleUrl: './calendar-day-grid-view.css',
  imports: [NgStyle, NgClass, SlicePipe, DatePipe]
})
export class WorkDayGridViewComponent implements OnInit {

  public name = 'WorkDayGridViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  @Input({required: true}) timeSpans: Array<Work>;
  @Input({required: true}) linkedTimeSpans: Array<Work>;

  @Input({required: true}) actualWorks: Array<Work>;
  @Input({required: true}) planWorks: Array<Work>;
  @Input({required: true}) linkedUserWorks: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;
  @Input({required: true}) timeSpanChangeCounter: number;

  @Input({required: true}) isSelecting: boolean;

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) userOpts: IUserWorkOptions;

  // categories are indexed by type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeColors: Array<{text: string, color: string}>;

  @Output() sessionPlanUpdate = new EventEmitter<Session>();

  @Output() workSelect = new EventEmitter<{isSelect: boolean, id: number}>();

  @Output() linkedUserSet = new EventEmitter<boolean>();

  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, work: Work, d: Date}>();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;

  // day of work - 00:00 in browser timezone
  // can be selected by user
  // workDay is in opts @Input({required: true}) workDay: Date;
  workDayDisplay = '';
  dateString = '';

  locationTypeEnum: typeof LocationType = LocationType;

  timeSpanGrid: Array<{recurring: IWorkGridElement, timeSpan: IWorkGridElement, linkedTimeSpan: IWorkGridElement}> = [];
  grid: Array<{actual: IWorkGridElement, plan: IWorkGridElement, linked: IWorkGridElement}> = [];

  isShowBeforeStartHour = false;
  isShowAfterLastHour = false;

  // styles are set from optionGroupWorkCalendar - here we set just the default options:
  styles = {
    // 010
    tableBgStyle:  {
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
      'verticalAlign': 'middle',
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

  workElementStyle: { [key: string]: any };
  linkedWorkElementStyle: { [key: string]: any };
  actualWorkStyle: { [key: string]: any };
  planWorkStyle: { [key: string]: any };
  linkedWorkStyle: { [key: string]: any };

  locationStyle: { [key: string]: any };
  descriptionStyle: { [key: string]: any };

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
    'margin-top': '-8px'
  }


  constructor() { }

  ngOnInit() {
    if (this.session.workDay) {
      this.loadOptions();
      if (this.actualWorks  && this.planWorks  && this.timeSpans) {
        this.buildGrids();
      }
    }
  }


  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetWorks = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts' || propKey === 'options' || propKey === 'worksChangeCounter') {
        // this.opts = propValue.currentValue;
        if (this.session.workDay && this.userOpts) {
          this.loadOptions();
          isSetWorks = true;
        }
      }
      if (propKey === 'timeSpanChangeCounter') {
        if (this.session.workDay && this.userOpts) {
          isSetWorks = true;
        }
      }
      // console.log('work-day-grid propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetWorks) {
      if (this.actualWorks  && this.planWorks  && this.timeSpans) {
        this.buildGrids();
      }
    }
  }

  /**
   * we load style options from options
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
      // we override cursor behaviour
      this.workElementStyle = {...workElementStyles, 'cursor':  'pointer'};
      this.linkedWorkElementStyle = {...workElementStyles};

      const {...workStyles} = this.styles.workStyle;
      // we override font-weight according to isPlan selected or not
      // and margin-left to shift text at the left border of element (in the moment not ative)
      // this.actualWorkStyle = this.session.isPlan? {...workStyles, 'font-weight':  'normal', 'margin-left' : '-6px'} : {...workStyles, 'font-weight':  'bold', 'margin-left' : '-6px'};
      this.actualWorkStyle = this.session.isPlan? {...workStyles, 'font-weight':  'normal'} : {...workStyles, 'font-weight':  'bold'};
      this.planWorkStyle = this.session.isPlan? {...workStyles, 'font-weight':  'bold'} : {...workStyles, 'font-weight':  'normal'};
      // we reduce font size of linkked work
      this.linkedWorkStyle = {...workStyles, 'font-size':  '80%'};

      const {...locationStyles} = this.styles.locationStyle;
      this.locationStyle =  {...locationStyles,  'margin-top': '-10px'};

      const {...descriptionStyles} = this.styles.descriptionStyle;
      this.descriptionStyle =  {...descriptionStyles,  'margin-top': '-10px'};
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
    .forEach((k: any) => {
      if (k.startsWith('is') && typeof stylesStrinKeys[k] === 'boolean') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['opt_workCalendar_' + k]);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      } else if (typeof stylesStrinKeys[k] === 'object') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_workCalendar_' + k], isStylesHaveDefault);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      }
    });
  }

  private buildGrids() {
    this.timeSpanGrid = [];
    // elStyle for time spans
    let elStyle: {};
    elStyle = {
      'background-color': WHITE_SMOKE
    };
    const recGrid = this.buildTimeSpanGrid(this.timeSpans.filter(_ => _.type <= 22),  this.session.workDay, elStyle);
    const spanGrid = this.buildTimeSpanGrid(this.timeSpans.filter(_ => _.type > 22),  this.session.workDay, elStyle);
    // style for linked time spans if not shown in detail
    if (this.session.linkedUserId > 0 && this.session.isShowLinkedUser === false) {
      elStyle = {
        'white-space': 'nowrap',
        'overflow': 'hidden',
        ...elStyle
      }
    }
    const linkedSpanGrid = this.buildTimeSpanGrid(this.linkedTimeSpans.filter(_ => _.type > 22),  this.session.workDay, elStyle);
    for (let i = 0; i < Math.max(recGrid.length, spanGrid.length, linkedSpanGrid.length); i++) {
      const recurring = i < recGrid.length ? recGrid[i] : null;
      const timeSpan = i < spanGrid.length ? spanGrid[i] : null;
      const linkedTimeSpan = i < linkedSpanGrid.length ? linkedSpanGrid[i] : null;
      this.timeSpanGrid.push({recurring, timeSpan, linkedTimeSpan});
    }
    this.grid = [];
    const actualGrid = this.buildGrid(GlobalFunctions.buildWorks(this.actualWorks,  this.session.workDay, true, false),
      this.session.workDay, this.workElementStyle);
    const planGrid = this.buildGrid(GlobalFunctions.buildWorks(this.planWorks, this.session.workDay, true, false),
      this.session.workDay, this.workElementStyle);
    const linkedGrid = this.buildGrid(GlobalFunctions.buildWorks(this.linkedUserWorks, this.session.workDay, true, false),
      this.session.workDay, this.linkedWorkElementStyle);
    // actualGrid, planGrid and linkedGrid are of same length and same time-infrastructure ....
    actualGrid.forEach((_, ix) => this.grid.push({actual: _, plan: planGrid[ix], linked: linkedGrid[ix]}) );
  }

  /**
   * buildTimeSpanGrid builds a grid for tiem spans
   * @param timeSpans array of time spans  (for week)
   * @param workDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of elements for 1 day
   */
  private buildTimeSpanGrid(works: Work[], workDay: Date, elStyle: {}): IWorkGridElement[] {
    // console.log(works, cat);
    const grid: IWorkGridElement[]= [];
    // build elements with  custOrder data, customer color, category
    works.forEach(_ => {
      if (GlobalFunctions.getDateInMinutes(_.workBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(workDay, 1))
      && GlobalFunctions.getDateInMinutes(_.workEnd) > GlobalFunctions.getDateInMinutes(workDay)  ) {
        let custIssueNr = '';
        let custIssueName = '';
        let leftCustStyle = {};
        let rightCustStyle = {};
        let workElementStyle: {} = GlobalFunctions.clone(elStyle);
        const category = this.timeSpanTypeColors[_.type % 10].text;
        const color = this.timeSpanTypeColors[_.type % 10].color;
        if ( _.customerNr && _.customerNr > 0) {
          custIssueNr = _.workInfo.customerDisplayNr;
          custIssueName = _.workInfo.customerName;
          const custStyle = StyleFactory.getBgColorStyle(_.workInfo.customerColor, 0, 0, GlobalFunctions.clone(this.styles.custStyle));
          // leftOrderStyle and rightOrderStyle define position for custOrderLabel - independent of font size, as far as possible
          leftCustStyle = {...custStyle, 'margin-right' : '5px'};
          rightCustStyle = {...custStyle, 'margin-left' : '10px'};
          workElementStyle = StyleFactory.getBgColorStyle(_.workInfo.customerColor, 90, 0, workElementStyle);
         } else if (color !== '') {
          // we set color from time span category
          workElementStyle = StyleFactory.getBgColorStyle(color, 80, 2, workElementStyle);
        }
        const element: IWorkGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, work: _,
        workBegins: true, workEnds: true, workDurationDisplay: '', workRowSpan: 0,
        custIssueNr, custIssueName, category,
        leftCustStyle, rightCustStyle, workElementStyle
        };
        grid.push(element);
      }
    })
    return grid;
  }

  /**
   * buildGrid builds a 1 day 5min grid - code is equivalent to work-day-week-view
   *
   * @param works array of works for a day
   * @param workDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(works: Array<Work>,  workDay: Date, elStyle: {}): Array<IWorkGridElement>  {
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
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5  : this.userOpts.lastHour * 60 - 5;
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
      let workElementStyle: {} = GlobalFunctions.clone(elStyle);
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
      const timeInTimeElementStyle:  { [key: string]: any } = GlobalFunctions.clone(this.styles.timeInTimeElementStyle);
      timeInTimeElementStyle['font-weight'] = i % 60 === 0 ? 'bold' : 'normal';
      const tableRowStyle:  { [key: string]: any } = GlobalFunctions.clone(this.styles.tableRowStyle);
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
      const timeUnit =  Number(this.userOpts.timeSlize) === 5 ? 15 : Number(this.userOpts.timeSlize) === 10 ? 30 : Number(this.userOpts.timeSlize);
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
    }
    return grid;
  }

   @HostListener('window:resize', ['$event'])
    onResize(event: any) {
      // console.log(event.target.innerWidth);
      this.windowWidth = event.target.innerWidth;
    }


  /** ------------------------  public methods --------------------------------------------------- */

  // set a pointer in a td element without work
  public setPointer(style: {}, isActive: boolean) {
    // console.log('setPointer: ', isActive, style);
    if (isActive) {
      let pointerStyle: {}
      if (this.windowWidth >= WINDOW_WIDTH_MOBILE) {
        pointerStyle = {...style, 'cursor':  'pointer'};
      } else {
        // in case of mobile size we planned to have have only 1 row - we place time in rows without work ...
        // pointerStyle = {...style, ...this.styles.timeInTimeElementStyle, 'cursor':  'pointer'};
        // not realized, we stay with
        pointerStyle = {...style, 'cursor':  'pointer'};
      }
      return pointerStyle;
    } else {
      return style;
    }
  }

  public togglePlan() {
    // we must clone opts to get a new object reference for this.opts in model
    const session: Session = GlobalFunctions.clone(this.session);
    if (session.isPlan) {
      session.isPlan = false;
    } else {
      session.isPlan = true;
    }
    this.sessionPlanUpdate.emit(session);
  }

  public toggleShowUser() {
    /*
    if (!this.session.isShowLinkedUser) {
      // build grids is triggered via ngOnChanges
      this.linkedUserSet.emit(!this.session.isShowLinkedUser);
    }
    else {
      // no work-day component action, we trigger build grids directly
      this.session.isShowLinkedUser = false;
      this.buildGrids();
    }
    */
   // we depend completely on session
   this.linkedUserSet.emit(!this.session.isShowLinkedUser);
  }

  // work can also be a timeSpan
  public enableWorkCard(work: Work) {
    this.cardFormViewEnabled.emit({updateType: UpdateType.update, work, d: null});
  }

  public insertTimeSpan() {
    const work = WorkFactory.empty();
    work.type = WorkType.timeSpanUndefined;
    this.cardFormViewEnabled.emit({updateType: UpdateType.insert, work,
      d: this.session.workDay});
  }

  public insertWorkCard(minutes: number) {
    // console.log('insert work card at: ', minutes);
    // we allow insert of actual works unlimited - actual is disabled at view after today !!
    if (!this.session.isPlan|| GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.workDay)) {
      let isInsertWork = true;
      const startOfPreviousMonth = GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(new Date()), -1);
      if (GlobalFunctions.getDateInMinutes(this.session.workDay) < GlobalFunctions.getDateInMinutes(startOfPreviousMonth)) {
      if (!confirm(this.txt['new_work_before_previous_month'] + '?')) {
          isInsertWork = false;
        }
      }
      if (isInsertWork) {
        // work is inserted with default type (0 = plan)
        const work = WorkFactory.empty();
        // we round to multiple of timeSlize (max. 30)
        const timeUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
        minutes = Math.round(minutes/timeUnit) * timeUnit;
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, work,
          d: GlobalFunctions.addMinutes(this.session.workDay, minutes)});
      }
    } else if (this.session.isPlan) {
      alert(this.txt['no_new_plan_past_today']);
    }
  }

  public toggleShowBeforeStartHour() {
    if (this.isShowBeforeStartHour) {
      this.isShowBeforeStartHour = false;
    } else {
      this.isShowBeforeStartHour = true;
    }
    this.buildGrids();
  }

  public toggleShowAfterLastHour() {
    if (this.isShowAfterLastHour) {
      this.isShowAfterLastHour = false;
    } else {
      this.isShowAfterLastHour = true;
    }
    this.buildGrids();
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


