import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener} from '@angular/core';

import { GAINSBORO, GREEN, LIGHT_CORAL, POWDER_BLUE, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { StyleFactory } from '../../_globals/style-factory';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { GlobalFunctions } from '../../_globals/global-functions';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { OptionGroupEventCalendar } from '../../_enums/option-group-event-calendar.enum';
import { EventType } from '../../_enums/event-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { Session } from '../../_db/session';

import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IEventGridElement } from '../../_interfaces/i-event-grid-element';
import { IChoice } from '../../_interfaces/i-choice';
import { NgStyle, NgClass, SlicePipe, DatePipe } from '@angular/common';



@Component({
  selector: 'dsy-calendar-day-grid-view',
  templateUrl: './calendar-day-grid-view.html',
  styleUrl: './calendar-day-grid-view.css',
  imports: [NgStyle, NgClass, SlicePipe, DatePipe]
})
export class EventDayGridViewComponent implements OnInit {

  public name = 'EventDayGridViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) eventtxt: { [key: string]: string };

  @Input({required: true}) timeSpans: Array<Event>;
  @Input({required: true}) linkedTimeSpans: Array<Event>;

  @Input({required: true}) actualEvents: Array<Event>;
  @Input({required: true}) planEvents: Array<Event>;
  @Input({required: true}) linkedUserEvents: Array<Event>;
  @Input({required: true}) eventsChangeCounter: number;
  @Input({required: true}) timeSpanChangeCounter: number;

  @Input({required: true}) isSelecting: boolean;

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts: IUserEventOptions;

  // categories are indexed by type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeColors: Array<{text: string, color: string}>;

  @Output() sessionPlanUpdate = new EventEmitter<Session>();

  @Output() eventSelect = new EventEmitter<{isSelect: boolean, id: number}>();

  @Output() linkedUserSet = new EventEmitter<boolean>();

  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, event: Event, d: Date}>();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;

  // day of event - 00:00 in browser timezone
  // can be selected by user
  // eventDay is in opts @Input({required: true}) eventDay: Date;
  eventDayDisplay = '';
  dateString = '';

  locationTypeEnum: typeof LocationType = LocationType;

  timeSpanGrid: Array<{recurring: IEventGridElement, timeSpan: IEventGridElement, linkedTimeSpan: IEventGridElement}> = [];
  grid: Array<{actual: IEventGridElement, plan: IEventGridElement, linked: IEventGridElement}> = [];

  isShowBeforeStartHour = false;
  isShowAfterLastHour = false;

  // styles are set from optionGroupEventCalendar - here we set just the default options:
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

  eventElementStyle: { [key: string]: any };
  linkedEventElementStyle: { [key: string]: any };
  actualEventStyle: { [key: string]: any };
  planEventStyle: { [key: string]: any };
  linkedEventStyle: { [key: string]: any };

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
    if (this.session.eventDay) {
      this.loadOptions();
      if (this.actualEvents  && this.planEvents  && this.timeSpans) {
        this.buildGrids();
      }
    }
  }


  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetEvents = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts' || propKey === 'options' || propKey === 'eventsChangeCounter') {
        // this.opts = propValue.currentValue;
        if (this.session.eventDay && this.userOpts) {
          this.loadOptions();
          isSetEvents = true;
        }
      }
      if (propKey === 'timeSpanChangeCounter') {
        if (this.session.eventDay && this.userOpts) {
          isSetEvents = true;
        }
      }
      // console.log('event-day-grid propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetEvents) {
      if (this.actualEvents  && this.planEvents  && this.timeSpans) {
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

      const {...eventElementStyles} = this.styles.eventElementStyle;
      // we override cursor behaviour
      this.eventElementStyle = {...eventElementStyles, 'cursor':  'pointer'};
      this.linkedEventElementStyle = {...eventElementStyles};

      const {...eventStyles} = this.styles.eventStyle;
      // we override font-weight according to isPlan selected or not
      // and margin-left to shift text at the left border of element (in the moment not ative)
      // this.actualEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'normal', 'margin-left' : '-6px'} : {...eventStyles, 'font-weight':  'bold', 'margin-left' : '-6px'};
      this.actualEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'normal'} : {...eventStyles, 'font-weight':  'bold'};
      this.planEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'bold'} : {...eventStyles, 'font-weight':  'normal'};
      // we reduce font size of linkked event
      this.linkedEventStyle = {...eventStyles, 'font-size':  '80%'};

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
    // option group names: see enum OptionGroupEventCalendar
    // option group types: see util getStyleOptionType

    const area = 'eventCalendar';
    // no default group 100
    const isStylesHaveDefault = false;
    const enumStringType: { [key: string]: any } = OptionGroupEventCalendar;
    const stylesStrinKeys: { [key: string]: any } = this.styles;
    // set this.styles from eventCalendar options
    Object.keys(this.styles)
    .forEach((k: any) => {
      if (k.startsWith('is') && typeof stylesStrinKeys[k] === 'boolean') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['opt_eventCalendar_' + k]);
        if (s !== undefined) {
          stylesStrinKeys[k] = s;
        }
      } else if (typeof stylesStrinKeys[k] === 'object') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_eventCalendar_' + k], isStylesHaveDefault);
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
    const recGrid = this.buildTimeSpanGrid(this.timeSpans.filter(_ => _.type <= 22),  this.session.eventDay, elStyle);
    const spanGrid = this.buildTimeSpanGrid(this.timeSpans.filter(_ => _.type > 22),  this.session.eventDay, elStyle);
    // style for linked time spans if not shown in detail
    if (this.session.linkedUserId > 0 && this.session.isShowLinkedUser === false) {
      elStyle = {
        'white-space': 'nowrap',
        'overflow': 'hidden',
        ...elStyle
      }
    }
    const linkedSpanGrid = this.buildTimeSpanGrid(this.linkedTimeSpans.filter(_ => _.type > 22),  this.session.eventDay, elStyle);
    for (let i = 0; i < Math.max(recGrid.length, spanGrid.length, linkedSpanGrid.length); i++) {
      const recurring = i < recGrid.length ? recGrid[i] : null;
      const timeSpan = i < spanGrid.length ? spanGrid[i] : null;
      const linkedTimeSpan = i < linkedSpanGrid.length ? linkedSpanGrid[i] : null;
      this.timeSpanGrid.push({recurring, timeSpan, linkedTimeSpan});
    }
    this.grid = [];
    const actualGrid = this.buildGrid(GlobalFunctions.buildEvents(this.actualEvents,  this.session.eventDay, true, false),
      this.session.eventDay, this.eventElementStyle);
    const planGrid = this.buildGrid(GlobalFunctions.buildEvents(this.planEvents, this.session.eventDay, true, false),
      this.session.eventDay, this.eventElementStyle);
    const linkedGrid = this.buildGrid(GlobalFunctions.buildEvents(this.linkedUserEvents, this.session.eventDay, true, false),
      this.session.eventDay, this.linkedEventElementStyle);
    // actualGrid, planGrid and linkedGrid are of same length and same time-infrastructure ....
    actualGrid.forEach((_, ix) => this.grid.push({actual: _, plan: planGrid[ix], linked: linkedGrid[ix]}) );
  }

  /**
   * buildTimeSpanGrid builds a grid for tiem spans
   * @param timeSpans array of time spans  (for week)
   * @param eventDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of elements for 1 day
   */
  private buildTimeSpanGrid(events: Event[], eventDay: Date, elStyle: {}): IEventGridElement[] {
    // console.log(events, cat);
    const grid: IEventGridElement[]= [];
    // build elements with  custOrder data, contact color, category
    events.forEach(_ => {
      if (GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(eventDay, 1))
      && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay)  ) {
        let custIssueNr = '';
        let custIssueName = '';
        let leftCustStyle = {};
        let rightCustStyle = {};
        let eventElementStyle: {} = GlobalFunctions.clone(elStyle);
        const category = this.timeSpanTypeColors[_.type % 10].text;
        const color = this.timeSpanTypeColors[_.type % 10].color;
        if ( _.contactNr && _.contactNr > 0) {
          custIssueNr = _.eventInfo.contactDisplayNr;
          custIssueName = _.eventInfo.contactName;
          const custStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor, 0, 0, GlobalFunctions.clone(this.styles.custStyle));
          // leftOrderStyle and rightOrderStyle define position for custOrderLabel - independent of font size, as far as possible
          leftCustStyle = {...custStyle, 'margin-right' : '5px'};
          rightCustStyle = {...custStyle, 'margin-left' : '10px'};
          eventElementStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor, 90, 0, eventElementStyle);
         } else if (color !== '') {
          // we set color from time span category
          eventElementStyle = StyleFactory.getBgColorStyle(color, 80, 2, eventElementStyle);
        }
        const element: IEventGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, event: _,
        eventBegins: true, eventEnds: true, eventDurationDisplay: '', eventRowSpan: 0,
        custIssueNr, custIssueName, category,
        leftCustStyle, rightCustStyle, eventElementStyle
        };
        grid.push(element);
      }
    })
    return grid;
  }

  /**
   * buildGrid builds a 1 day 5min grid - code is equivalent to event-day-week-view
   *
   * @param events array of events for a day
   * @param eventDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(events: Array<Event>,  eventDay: Date, elStyle: {}): Array<IEventGridElement>  {
    // we check events of this day ....
    const isEventBeforeStartHour = events?.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay)
      && GlobalFunctions.getDateInMinutes(_.eventEnd) < GlobalFunctions.getDateInMinutes(eventDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(eventDay) + this.userOpts.startHour* 60).length > 0;
    const isEventAfterLastHour = events?.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(eventDay)
      && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(eventDay) + 24 * 60
      && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay) + this.userOpts.lastHour * 60).length > 0;
    const styleStringKey: { [key: string]: any } = this.eventElementStyle;
    const eventColor = styleStringKey['background-color'];
    const grid: IEventGridElement[] = [];
    const gridBegin = this.isShowBeforeStartHour  ? 0 : this.userOpts.startHour * 60;
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5  : this.userOpts.lastHour * 60 - 5;
    for (let i = gridBegin; i <= gridEnd; i += 5) {
      let event: Event;
      let minutesBefore: number;
      let minutesAfter: number;
      if (events && events.length > 0) {
        let ix: number;
        ix = events.findIndex(_ =>
          GlobalFunctions.getDateInMinutes(_.eventBegin)
            - GlobalFunctions.getDateInMinutes(eventDay) <= i &&
          GlobalFunctions.getDateInMinutes(_.eventEnd)
            - GlobalFunctions.getDateInMinutes(eventDay) >= (i + 5)
        );
        if (ix >= 0) {
          event = events[ix];
          if (ix > 0) {
            minutesBefore = GlobalFunctions.getDateInMinutes(events[ix - 1].eventEnd)
            - GlobalFunctions.getDateInMinutes(eventDay);
          }
          if (ix < events.length - 1) {
            minutesAfter = GlobalFunctions.getDateInMinutes(events[ix + 1].eventBegin)
            - GlobalFunctions.getDateInMinutes(eventDay);
          }
        }
      }
      let custIssueNr = '';
      let custIssueName = '';
      let leftCustStyle = {};
      let rightCustStyle = {};
      let eventElementStyle: {} = GlobalFunctions.clone(elStyle);
      if (event && event?.eventInfo) {
        // we set color via custStyle - if no contact defined, style is set to light grey via StyleFactory
        const custStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor, 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftCustStyle = {...custStyle, 'margin-right' : '5px'};
        rightCustStyle = {...custStyle, 'margin-left' : '10px'};
        eventElementStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor, 90, 0, eventElementStyle);
        let contactName = event.eventInfo.contactName && event.eventInfo.contactName !== ''
          ? event.eventInfo.contactName
          : event.eventInfo.contactNr > 0
            ? (this.session.serviceLevel.contact === 1 ? this.txt['contact'] : this.txt['contact']) + ': ' + event.eventInfo.contactNr.toString()
            : '';
        if (event.contactNr > 0 && event.issueProviderId > 0) {
          custIssueNr =  event.eventInfo.issueDisplayNr;
          custIssueName = event.eventInfo.issueText?.substring(0,30) + '|' + contactName.substring(0,20);
        } else if (event.contactNr > 0) {
          custIssueNr = event.eventInfo.contactDisplayNr;
          custIssueName = contactName.substring(0,30);
        } else if (event.issueProviderId > 0) {
          custIssueNr =  event.eventInfo.issueDisplayNr;
          custIssueName = event.eventInfo.issueText?.substring(0,30);
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
      const timeUnit =  Number(this.userOpts.timeSlize) === 5 ? 15 : Number(this.userOpts.timeSlize) === 10 ? 30 : Number(this.userOpts.timeSlize);
      let eventBegin = 0;
      let eventEnd = 0;
      let assocTxt = '';
      if (event) {
        eventBegin = GlobalFunctions.getDateInMinutes(event.eventBegin) - GlobalFunctions.getDateInMinutes(eventDay);
        eventBegin = eventBegin < gridBegin ? gridBegin : eventBegin;
        eventEnd = GlobalFunctions.getDateInMinutes(event.eventEnd) - GlobalFunctions.getDateInMinutes(eventDay);
        eventEnd = eventEnd > gridEnd + 5 ? gridEnd + 5 : eventEnd;
        if (event.assocEventBegin && event.assocEventEnd && (GlobalFunctions.getDateInMinutes(event.assocEventBegin) !== GlobalFunctions.getDateInMinutes(event.eventBegin)
        || GlobalFunctions.getDateInMinutes(event.assocEventEnd) !== GlobalFunctions.getDateInMinutes(event.eventEnd))) {
          assocTxt = GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(event.assocEventBegin)
          - GlobalFunctions.getDateInMinutes(eventDay)) + ' - ' + GlobalFunctions.getTimeFormatted(GlobalFunctions.getDateInMinutes(event.assocEventEnd)
          - GlobalFunctions.getDateInMinutes(eventDay));
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
        custIssueNr,
        custIssueName,
        tableRowStyle,
        timeElementStyle,
        timeInTimeElementStyle,
        rowElementStyle,
        leftCustStyle,
        rightCustStyle,
        eventElementStyle,
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

  // set a pointer in a td element without event
  public setPointer(style: {}, isActive: boolean) {
    // console.log('setPointer: ', isActive, style);
    if (isActive) {
      let pointerStyle: {}
      if (this.windowWidth >= WINDOW_WIDTH_MOBILE) {
        pointerStyle = {...style, 'cursor':  'pointer'};
      } else {
        // in case of mobile size we planned to have have only 1 row - we place time in rows without event ...
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
      // no event-day component action, we trigger build grids directly
      this.session.isShowLinkedUser = false;
      this.buildGrids();
    }
    */
   // we depend completely on session
   this.linkedUserSet.emit(!this.session.isShowLinkedUser);
  }

  // event can also be a timeSpan
  public enableEventCard(event: Event) {
    this.cardFormViewEnabled.emit({updateType: UpdateType.update, event, d: null});
  }

  public insertTimeSpan() {
    const event = EventFactory.empty();
    event.type = EventType.timeSpanUndefined;
    this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event,
      d: this.session.eventDay});
  }

  public insertEventCard(minutes: number) {
    // console.log('insert event card at: ', minutes);
    // we allow insert of actual events unlimited - actual is disabled at view after today !!
    if (!this.session.isPlan|| GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.eventDay)) {
      let isInsertEvent = true;
      const startOfPreviousMonth = GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(new Date()), -1);
      if (GlobalFunctions.getDateInMinutes(this.session.eventDay) < GlobalFunctions.getDateInMinutes(startOfPreviousMonth)) {
      if (!confirm(this.txt['new_event_before_previous_month'] + '?')) {
          isInsertEvent = false;
        }
      }
      if (isInsertEvent) {
        // event is inserted with default type (0 = plan)
        const event = EventFactory.empty();
        // we round to multiple of timeSlize (max. 30)
        const timeUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
        minutes = Math.round(minutes/timeUnit) * timeUnit;
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event,
          d: GlobalFunctions.addMinutes(this.session.eventDay, minutes)});
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


  public selectEvent(event: Event) {
    if (event.isSelected) {
      event.isSelected = false;
    } else {
      event.isSelected = true;
    }
    this.eventSelect.emit({isSelect: event.isSelected, id: event.eventId});
  }

}


