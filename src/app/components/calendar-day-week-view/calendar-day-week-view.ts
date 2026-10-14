import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener, signal} from '@angular/core';
import { formatDate, NgStyle, SlicePipe, DatePipe } from '@angular/common';

import { StyleFactory } from '../../_globals/style-factory';
import { GAINSBORO, GREEN, LIGHT_CORAL, LIGHT_GREY, POWDER_BLUE, RED, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { LocationType } from '../../_enums/location-type.enum';
import { OptionGroupCalendar } from '../../_enums/option-group-calendar.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { Session } from '../../_db/session';


import { IEventGridElement } from '../../_interfaces/i-event-grid-element';
import { IChoice } from '../../_interfaces/i-choice';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';



@Component({
  selector: 'dsy-calendar-day-week-view',
  templateUrl: './calendar-day-week-view.html',
  styleUrl: './calendar-day-week-view.css',
  imports: [NgStyle, SlicePipe, DatePipe]
})
export class CalendarDayWeekViewComponent implements OnInit {

  public name = 'CalendarDayWeekViewComponent';

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  @Input({required: true}) actualEvents!: Array<Event>;
  @Input({required: true}) planEvents!: Array<Event>;
  @Input({required: true}) eventsChangeCounter!: number;

  @Input({required: true}) timeSpans!: Array<Event>;
  @Input({required: true}) timeSpanChangeCounter!: number;

  // categories are indexed by type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeColors!: Array<{text: string, color: string}>;

  @Input({required: true}) isSelecting!: boolean;

  @Input({required: true}) options!: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts!: IUserEventOptions;


  @Output() calendarDayAndPlanSelected = new EventEmitter<{date: Date, isPlan: boolean}>();

  @Output() eventSelect = new EventEmitter<{isSelect: boolean, id: number}>();

  @Output() viewSelected = new EventEmitter<string>();

  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, event: Event, d: Date | null}>();
  
  locationTypeEnum: typeof LocationType = LocationType;

  // the 7 or 8 day-columns
  weekColumns: Array<{date: Date, dateDisplay: string, isToday: boolean, isCalendarDay: boolean, isPlan: boolean, isSelected: boolean}>  = [];
  // 7 week days
  weekDays: Array<{date: Date, dateDisplay: string, isToday: boolean, isCalendarDay: boolean, isPlan: boolean, isSelected: boolean}>  = [];

  // rows are time span  elements, 7 or 8 day-elements in a row
  timeSpanGrid: Array<Array<IEventGridElement | null >> = [];

  // rows are 5 minute elements, 7 or 8 day-elements in a row
  weekGrid: Array<Array<IEventGridElement>> = [];

  isShowBeforeStartHour = false;
  isShowAfterLastHour = false;

  // show plan also for days before today
  isShowPlan = false;
  isTodayInWeek = false;
  isTodayAfterWeek = false;

  public readySignal = signal(0);

  // styles are set from optionGroupEventCalendar - here we set just the default options:
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
    eventElementStyle : {
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
    eventStyle : {
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
    // attn: background-color is set from color scheme of contact
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

  eventElementStyle!: {};
  eventStyle!: {};
  choosenEventStyle!: {};

  locationStyle!: {};
  descriptionStyle!: {};

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
    let isSetEvents = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts' || propKey === 'options' || propKey === 'calendarDayChangeCounter') {
        // this.opts = propValue.currentValue;
        if (this.session.calendarDay) {
          this.loadOptions();
          isSetEvents = true;
        }
      }
      if (propKey === 'eventsChangeCounter' || propKey === 'timeSpanChangeCounter') {
        isSetEvents = true;
      }
      // console.log('event-day-week propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetEvents) {
      if (this.actualEvents  && this.planEvents  && this.timeSpans) {
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

      const {...eventElementStyles} = this.styles.eventElementStyle;
      // we override vertical align because we arrange elements in <td> vertical
      // overflow: visible to show tooltip over other table elements
      this.eventElementStyle = {...eventElementStyles,  'cursor': 'pointer', 'vertical-align':  'top', 'overflow': 'visible'};
      const {...eventStyles} = this.styles.eventStyle;
      // we override font-weight according to choosen column
      // and margin-left to shift text at the left border of element (in the moment not ative)
      // and we set font-size

      this.eventStyle = {...eventStyles, 'font-size':  '80%',  'font-weight':  'normal', 'margin-left': '-5px'};
      this.choosenEventStyle = {...eventStyles, 'font-size':  '80%', 'font-weight':  'bold', 'margin-left': '-5px'};

      // we adapt location and description styles - but we do not need them in the moment, see below ....
      const {...locationStyles} = this.styles.locationStyle;
      this.locationStyle =  {...locationStyles,  'margin-top': '-10px'};
      const {...descriptionStyles} = this.styles.descriptionStyle;
      this.descriptionStyle =  {...descriptionStyles,  'margin-top': '-10px'};

      // we show no time column, no description, no location in week-view
      // TODO check duration of eventElement and show description, location if length is enough
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
    // option group names: see enum OptionGroupEventCalendar
    // option group types: see util getStyleOptionType

    const area = 'eventCalendar';
    // no default group 100
    const isStylesHaveDefault = false;
    const enumStringType: { [key: string]: any } = OptionGroupCalendar;
    const stylesStrinKeys: { [key: string]: any } = this.styles;
    // set this.styles from eventCalendar options
    Object.keys(this.styles)
    .forEach(k => {
      //       if (k.startsWith('is') && this.styles[k] === typeof 'boolean') {
      if (k.startsWith('is') && typeof stylesStrinKeys[k] === 'boolean') {
        // console.log('type: ',  typeof this.styles[k] );
        // console.log('opt_group: ',  k, OptionGroupEventCalendar['opt_eventCalendar_' + k]);
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['opt_eventCalendar_' + k]);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      //   } else  {
      } else if (typeof stylesStrinKeys[k] === 'object') {
        // console.log('type: ',  typeof this.styles[k] );
        // console.log('opt_group',  k, OptionGroupEventCalendar['opt_eventCalendar_' + k]);
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_eventCalendar_' + k], isStylesHaveDefault);
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
    // if user has chosen plan at days before calendarDay
    if (GlobalFunctions.getDateInMinutes(this.session.calendarDay) < GlobalFunctions.getDateInMinutes(today) && this.session.isPlan) {
      this.isShowPlan = isShowPlanReset ? false : true;
    }
    // weekDay is day (0 - 6) of selected calendarDay
    const weekDay = GlobalFunctions.getWeekDay(this.session.calendarDay, 0, this.locale);
    // weekBegin is the date of first day of week
    const weekBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.calendarDay), -1 * weekDay);
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
    let isCalendarDay: boolean;
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
        isCalendarDay = weekDay === index ? true : false;
        isSelected = !this.session.isPlan;
        this.weekColumns.push({date, dateDisplay, isToday, isCalendarDay, isPlan, isSelected});
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
        // calendarDay always lies in week!!
        isCalendarDay = weekDay === index ? true : false;
        isSelected = isCalendarDay;
        isWeekDayPlan = isPlan;
      }
      this.weekColumns.push({date, dateDisplay, isToday, isCalendarDay, isPlan, isSelected});
      this.weekDays.push({date, dateDisplay, isToday, isCalendarDay, isPlan: isWeekDayPlan, isSelected: isCalendarDay});
      if (this.isShowPlan) {
        this.weekColumns = this.weekColumns.filter(_ => !_.isToday || _.isPlan);
        this.weekColumns.forEach(_ => _.isPlan = true);
        this.weekDays.forEach(_ => _.isPlan = true);
      }
    }
  }


  private buildWeekGrid() {
    // time span building searches the fitting row for each timeSpan
    // each timeSpan lays in week of this.session.calendarDay
    this.timeSpanGrid = [];
    const today = GlobalFunctions.getStartOfDay(new Date());
    // weekBegin is the date of first day of week
    const weekDay = GlobalFunctions.getWeekDay(this.session.calendarDay, 0, this.locale);
    const weekBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.calendarDay), -1 * weekDay);
    const lastWeekDay = GlobalFunctions.addDays(weekBegin, 6);
    // timeSpanElements belongs to one timeSpan
    const timeSpanElements = this.timeSpans.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(lastWeekDay, 1))
    && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(weekBegin) )
    .map(_ => {
      const {...rest} = _;
      // in the moment we cat is used just for sort
      const cat =  _.type % 10;
      // first we build  ixFrom and ixTo as the weekdays (0 to 6) where timeSpan begins and ends
      let ixFrom = GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(weekBegin)
      ? 0
      : GlobalFunctions.getWeekDay(_.eventBegin, 0, this.locale);
      let ixTo = GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(lastWeekDay)
      ? 6
      : GlobalFunctions.getWeekDay(_.eventEnd, 0, this.locale) > 0 ? GlobalFunctions.getWeekDay(_.eventEnd, 0, this.locale) - 1 : 0;
      // if today is in week, we have one column more ....
      const todayWeekDay = GlobalFunctions.getWeekDay(today, 0, this.locale);
      if (this.isTodayInWeek) {
        if (ixFrom === todayWeekDay) {
          // holidays and birthdays remain at left column of today (we need not adapt ixTo cause this timeSpans are one day spans)
          if (_.type > 22 && GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(weekBegin)) {
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
        const newRow: Array<IEventGridElement | null> = [];
        for (let newColumn = 0; newColumn < this.weekColumns.length; newColumn++) {
          newRow[newColumn] = null;
        }
        this.buildTimeSpanGrid(_, _.ixFrom, _.ixTo).forEach((element, ix) => newRow[_.ixFrom + ix] = element);
        this.timeSpanGrid.push(newRow);
      }
    });
    // grid building is analog to buildGrid in event-day-grid-view, but we build 7 or 8 grids for each day
    // according to previously built weekColumns
    this.weekGrid = [];
    const daysHours: Array<Array<IEventGridElement>> = [];
    this.weekColumns.forEach((_, index) => {
      const events = _.isPlan === true ? this.planEvents : this.actualEvents;
      daysHours[index] = this.buildGrid(GlobalFunctions.buildEvents(events, _.date, true, false), _.date);
    })
    // now we transpose the daysHours matrix to get rows for the timeSlizes and columns for the days
    this.weekGrid =  daysHours[0].map((x,i) => daysHours.map(x => x[i]));
  }


  /**
   * buildTimeSpanGrid builds a grid element for each day in day columns
   * - code is similar to event-day-grid-view
   *
   * @param event timeSpam
   * @param ixFrom  day index of begin
   * @param ixFrom  day index of end
   * @returns arrray of  elements for the days between isFrom and ixTo
   */
  private buildTimeSpanGrid(event: Event, ixFrom: number, ixTo: number): IEventGridElement[] {
    const elements: IEventGridElement[] = [];
    // we build a eventGridElement for each column
    //  in the moment they are all the same; we use just element in column ixFrom
    for (let i = ixFrom; i <= ixTo; i++) {
      let contactDisplayNr = '';
      let contactFisplayName = '';
      let leftContactStyle = {};
      let rightContactStyle = {};
      // time spans have their own eventElementStyle
      let eventElementStyle = {};
      let summaryDisplay = event.summary;
      const category = this.timeSpanTypeColors[event.type % 10].text;
      const color = this.timeSpanTypeColors[event.type % 10].color;
      // stringLength depends on viewPort size - resizing is done in html template, thus we can react on resizing event
      if (i === ixFrom && ixTo - ixFrom > 1) {
        let stringLength = 20 + (ixTo - ixFrom) * 20 - event.summary.length - category.length;
        // console.log(event.summary, ' stringLength: ', stringLength );
        if (stringLength > 0) {
          const lineString = (new Array(stringLength)).join('-');
          summaryDisplay = event.summary + '  ' + lineString;
        }
      }
      if (event.contactNr && event.contactNr > 0) {
        contactDisplayNr = event.eventInfo?.contactDisplayNr ?? '';
        contactFisplayName = event.eventInfo?.contactDisplayName ?? '';
        const contactStyle = StyleFactory.getBgColorStyle((event.eventInfo?.contactColor ?? ''), 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftContactStyle = {...contactStyle, 'margin-right' : '5px'};
        rightContactStyle = {...contactStyle, 'margin-left' : '10px'};
        eventElementStyle = StyleFactory.getBgColorStyle((event.eventInfo?.contactColor ?? ''), 90, 0, eventElementStyle);
        // we want to see tooltip, but we can set overflow only in one-column design cause it would interfere with nowrap, hidden ....
        eventElementStyle = ixFrom === ixTo ? {...eventElementStyle, 'overflow': 'visible'} : eventElementStyle;
      } else if (color !== '') {
        // we set color from time span category
        eventElementStyle = StyleFactory.getBgColorStyle(color, 80, 2, eventElementStyle);
      } else {
        eventElementStyle = {...eventElementStyle, 'background-color': WHITE_SMOKE};
      }
      eventElementStyle =  event.type > 22 ? {...eventElementStyle, 'cursor': 'pointer'} : eventElementStyle;
      const element: IEventGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, event: event,
      eventBegins: true, eventEnds: true, eventDurationDisplay: '', eventRowSpan: 0,
      contactDisplayNr: contactDisplayNr, contactDisplayName: contactFisplayName, category,
      leftCustStyle: leftContactStyle, rightCustStyle: rightContactStyle, eventElementStyle,
      summaryDisplay, ixFrom, ixTo
      };
      elements.push(element);
    }
    return elements;
  }


  /**
   * buildGrid builds a 1 day 5min grid - code is equivalent to event-day-grid-view
   *
   * @param events array of events for a day
   * @param calendarDay  day for the grid
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(events: Event[], calendarDay: Date): IEventGridElement[] {
    // we check events of this day ....

    const isEventBeforeStartHour = events?.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(calendarDay)
      && GlobalFunctions.getDateInMinutes(_.eventEnd) < GlobalFunctions.getDateInMinutes(calendarDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(calendarDay) + this.userOpts.startHour* 60).length > 0;
    const isEventAfterLastHour = events?.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(calendarDay)
      && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(calendarDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(calendarDay) + this.userOpts.lastHour * 60).length > 0;
    const styleStringKey: { [key: string]: any } = this.eventElementStyle;
    const eventColor = styleStringKey['background-color'];
    const grid: IEventGridElement[] = [];
    const gridBegin = this.isShowBeforeStartHour  ? 0 : this.userOpts.startHour * 60;
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5 : this.userOpts.lastHour * 60 -5;
    for (let i = gridBegin; i <= gridEnd; i += 5) {
      let event: Event | undefined;
      let minutesBefore: number = 0;
      let minutesAfter: number = 0;
      if (events && events.length > 0) {
        let ix: number;
        ix = events.findIndex(_ =>
          GlobalFunctions.getDateInMinutes(_.eventBegin)
            - GlobalFunctions.getDateInMinutes(calendarDay) <= i &&
          GlobalFunctions.getDateInMinutes(_.eventEnd)
            - GlobalFunctions.getDateInMinutes(calendarDay) >= (i + 5)
        );
        if (ix >= 0) {
          event = events[ix];
          if (ix > 0) {
            minutesBefore = GlobalFunctions.getDateInMinutes(events[ix - 1].eventEnd)
            - GlobalFunctions.getDateInMinutes(calendarDay);
          }
          if (ix < events.length - 1) {
            minutesAfter = GlobalFunctions.getDateInMinutes(events[ix + 1].eventBegin)
            - GlobalFunctions.getDateInMinutes(calendarDay);
          }
        }
      }
      let contactDisplayNr = '';
      let contactDisplayName = '';
      let leftContactStyle = {};
      let rightContactStyle = {};
      let eventElementStyle: {} = GlobalFunctions.clone(this.eventElementStyle);
      if (event && event?.eventInfo) {
        // we set color via custStyle - if no contact defined, style is set to light grey via StyleFactory
        const contactStyle = StyleFactory.getBgColorStyle((event.eventInfo.contactColor ?? ''), 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftContactStyle = {...contactStyle, 'margin-right' : '5px'};
        rightContactStyle = {...contactStyle, 'margin-left' : '10px'};
        eventElementStyle = StyleFactory.getBgColorStyle((event.eventInfo.contactColor ?? ''), 90, 0, eventElementStyle);
        contactDisplayName = event.eventInfo.contactDisplayName && event.eventInfo.contactDisplayName !== ''
          ? event.eventInfo.contactDisplayName
          : this.txt['contact'] + ': ' + event.eventInfo.contactNr.toString();    
        
        contactDisplayNr = event.eventInfo.contactDisplayNr && event.eventInfo.contactDisplayNr !== ''
          ? event.eventInfo.contactDisplayNr
          : event.eventInfo.contactNr.toString();
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
      const rowElementStyle = i === gridBegin && isEventBeforeStartHour && !this.isShowBeforeStartHour ? {
          'border-top-width' :  'thick',
          'border-top-style' :  'solid',
          'border-top-color' :  eventColor,
          'padding' : '0.1em'
        }
        : i === gridEnd && isEventAfterLastHour && !this.isShowAfterLastHour ? {
          'border-bottom-width' : 'thick',
          'border-bottom-style' : 'solid',
          'border-bottom-color' : eventColor,
          'padding' : '0.1em'
        }
        : {
          'border-top' : i % borderUnit === 0 ? null : 'none',
          'border-top-width' : i % 60 === 0 ?  '2px' : i % 30 === 0 && Number(this.userOpts.timeSlize) === 60  ? '1px dashed' : null,
          'padding' : '0.1em'
        };
      const timeUnit = Number(this.userOpts.timeSlize) === 5 ? 15 : Number(this.userOpts.timeSlize) === 10 ? 30 : Number(this.userOpts.timeSlize);
      let eventBegin = 0;
      let eventEnd = 0;
      let assocTxt = '';
      if (event) {
        eventBegin = GlobalFunctions.getDateInMinutes(event.eventBegin) - GlobalFunctions.getDateInMinutes(calendarDay);
        eventBegin = eventBegin < gridBegin ? gridBegin : eventBegin;
        eventEnd = GlobalFunctions.getDateInMinutes(event.eventEnd) - GlobalFunctions.getDateInMinutes(calendarDay);
        eventEnd = eventEnd > gridEnd + 5 ? gridEnd + 5 : eventEnd;
        if (event.assocEventBegin && event.assocEventEnd && (GlobalFunctions.getDateInMinutes(event.assocEventBegin) !== GlobalFunctions.getDateInMinutes(event.eventBegin)
        || GlobalFunctions.getDateInMinutes(event.assocEventEnd) !== GlobalFunctions.getDateInMinutes(event.eventEnd))) {
          assocTxt = GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(event.assocEventBegin)
          - GlobalFunctions.getDateInMinutes(calendarDay)) + ' - ' + GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(event.assocEventEnd)
          - GlobalFunctions.getDateInMinutes(calendarDay));
        }
      }
      const element: IEventGridElement = {minutes: i,
        roundedMinutes,
        timeElement: i % timeUnit === 0 ? GlobalFunctions.getTimeFormatted(i) : '',
        timeRowSpan: timeUnit / 5,
        timeBegins:  i % timeUnit === 0 ? true : false,
        event,
        eventBegins: event ? eventBegin === i : false,
        eventEnds: event ? eventEnd === i + 5 : false,
        eventDurationDisplay: event ? GlobalFunctions.minutesDisplay(event.eventDuration) : '',
        eventRowSpan:  event ? (eventEnd - i) / 5 : 0,
        contactDisplayNr,
        contactDisplayName,
        tableRowStyle,
        timeElementStyle,
        timeInTimeElementStyle,
        rowElementStyle,
        leftCustStyle: leftContactStyle,
        rightCustStyle: rightContactStyle,
        eventElementStyle,
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
      // we leave calendarDay the same, but change isPlan
      this.calendarDayAndPlanSelected.emit({date: this.session.calendarDay, isPlan: this.isShowPlan});
      this.buildWeekGrid();
    } else if (event.target.checked === false && this.isShowPlan) {
      this.isShowPlan = false;
      // we leave calendarDay the same, but change isPlan
      this.calendarDayAndPlanSelected.emit({date: this.session.calendarDay, isPlan: this.isShowPlan});
      this.buildColumns(true);
      this.buildWeekGrid();
    }
  }

  public setCalendarDay(index: number) {
    if (!this.weekDays[index].isCalendarDay) {
      // we change calendarDay AND set plan to the according value (which is shown to user)
      this.calendarDayAndPlanSelected.emit({date: this.weekDays[index].date, isPlan: this.weekDays[index].isPlan});
    }
    // we change view to grid-view (day calendar)
    if (!this.isSelecting) {
      this.viewSelected.emit('grid-view');
    }
  }

  public setHeaderDayStyle(index: number): {} {
    let style = {};
    style = index === 6 || this.timeSpans?.filter(_ => _.type === 21 && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(this.weekDays[index].date, 1) )
    && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(this.weekDays[index].date)).length > 0  ? {
      'color': RED
    } : {};
    style =  this.weekDays[index].isToday ? {...style,
      // 'text-decoration': 'underline'
      'background-color': GAINSBORO
    } : style;
    style = this.weekDays[index].isSelected ? {...this.planHeaderBoldStyle, ...style} : {...this.planHeaderNormalStyle, ...style};
    return style;
  }

  public setTimeSpanCategoryStyle(index: number, element?: IEventGridElement): {} {
    let style = {};
    style = element?.event?.type === 21 ? {
      'color': RED
    } : {};
    style = this.weekColumns[index].isSelected && (element?.event?.eventBegin ? GlobalFunctions.getDateInMinutes(element.event?.eventBegin) : 0) === GlobalFunctions.getDateInMinutes(this.weekDays[index].date) ? {...this.planHeaderBoldStyle, ...style} : {...this.planHeaderNormalStyle, ...style};
    return style;
  }

  public setTimeSpanSummaryStyle(index: number, element?: IEventGridElement): {} {
    let style = {};
    style = element?.event?.type === 21 ? {
      'color': RED
    } : {};
    style = (element?.ixTo ?? 0) - (element?.ixFrom ?? 0) > 1 ? {
      'white-space': 'nowrap',
      'overflow': 'hidden'
      , ...style
    } : style;
    return style;
  }

  public setPlan(index: number) {
  // we change calendarDay AND set plan to the according value (which is shown to user)
  // we do not check if calendarDay cause at today we use setPlan to change between actual and plan
  this.calendarDayAndPlanSelected.emit({date: this.weekColumns[index].date, isPlan: this.weekColumns[index].isPlan});
  }

  // event can also be a timeSpan
  public enableEventCard(event?: Event) {
    if (event) {
      this.cardFormViewEnabled.emit({updateType: UpdateType.update, event, d: null});
    }
  }

  public insertEventCard(minutes: number) {
    // we allow insert of actual events unlimited - actual is disabled at view after today !!
    if (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.calendarDay)) {
      let isInsertEvent = true;
      const prevMonth = GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(new Date()), -1);
      if (GlobalFunctions.getDateInMinutes(this.session.calendarDay) < GlobalFunctions.getDateInMinutes(prevMonth)) {
      if (!confirm(this.txt['new_event_before_previous_month']+ '?')) {
          isInsertEvent = false;
        }
      }
      if (isInsertEvent) {
        const event = EventFactory.empty();
        // we round to multiple of timeSlize (max. 30)
        const timeUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
        minutes = Math.round(minutes/timeUnit) * timeUnit;
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event,
          d: GlobalFunctions.addMinutes(this.session.calendarDay, minutes)});
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


  public selectEvent(event: Event) {
    if (event.isSelected) {
      event.isSelected = false;
    } else {
      event.isSelected = true;
    }
    this.eventSelect.emit({isSelect: event.isSelected, id: event.eventId});
  }

}


