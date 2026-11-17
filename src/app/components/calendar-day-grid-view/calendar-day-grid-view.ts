import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener} from '@angular/core';
import { NgStyle, NgClass, SlicePipe, DatePipe } from '@angular/common';

import { WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { DAISY_COLOR_BASE_200, DAISY_COLOR_BASE_300, DAISY_COLOR_SECONDARY } from '../../_globals/constants-daisy';
import { StyleFactory } from '../../_globals/style-factory';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { GlobalFunctions } from '../../_globals/global-functions';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { OptionGroupCalendar } from '../../_enums/option-group-calendar.enum';
import { EventType } from '../../_enums/event-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { CalendarEvent } from '../../_db/calendar-event';
import { CalendarEventFactory } from '../../_db/calendar-event-factory';
import { Session } from '../../_db/session';

import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IEventGridElement } from '../../_interfaces/i-event-grid-element';
import { IChoice } from '../../_interfaces/i-choice';



@Component({
  selector: 'dsy-calendar-day-grid-view',
  templateUrl: './calendar-day-grid-view.html',
  styleUrl: './calendar-day-grid-view.css',
  imports: [NgStyle, NgClass, SlicePipe, DatePipe]
})
export class CalendarDayGridViewComponent implements OnInit {

  public name = 'CalendarDayGridViewComponent';

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  @Input({required: true}) timeSpans!: Array<CalendarEvent>;

  @Input({required: true}) actualEvents!: Array<CalendarEvent>;
  @Input({required: true}) planEvents!: Array<CalendarEvent>;
  @Input({required: true}) calendarDayChangeCounter!: number;

  @Input({required: true}) isSelecting!: boolean;

  @Input({required: true}) options!: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts!: IUserEventOptions;

  // categories are indexed by type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeColors!: Array<{text: string, backgroundColor: string, color: string}>;

  @Output() sessionPlanUpdate = new EventEmitter<Session>();

  @Output() eventSelect = new EventEmitter<{isSelect: boolean, id: number}>();

  @Output() linkedUserSet = new EventEmitter<boolean>();

  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, event: CalendarEvent, d: Date | null}>();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;

  // day of event - 00:00 in browser timezone
  // can be selected by user
  // calendarDay is in opts @Input({required: true}) calendarDay: Date;
  calendarDayDisplay = '';
  dateString = '';

  locationTypeEnum: typeof LocationType = LocationType;

  timeSpanGrid: Array<IEventGridElement> = [];
  grid: Array<{actual: IEventGridElement, plan: IEventGridElement}> = [];

  isShowBeforeStartHour = false;
  isShowAfterLastHour = false;

  // configurableStyles are set from optionGroupcalendar - here we set just the default options:
  configurableStyles = {
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
      'background-color': DAISY_COLOR_BASE_300
    },
    // 302
    timeInTimeElementStyle : {
      'font-size': '70%'
    },
    // 303
    timeElementOutsideStyle : {
      'background-color': DAISY_COLOR_SECONDARY
    },
    // 401
    eventElementStyle : {
      'background-color': DAISY_COLOR_BASE_200
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
    // is style for event text nside eevent element
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
    contactStyle : {
      'font-size': '80%',
      'font-weight': 'bold'
    },
    // 501 - 505
    isShowDuration: false,
    isShowLocation: false,
    isShowDescription: false,
    isShowTimeColumn: false,
    isShowContactColumn: false
  };

  // component specific overrides of styles

  eventElementStyle!: { [key: string]: any };
  actualEventStyle!: { [key: string]: any };
  planEventStyle!: { [key: string]: any };

  locationStyle!: { [key: string]: any };
  descriptionStyle!: { [key: string]: any };


  // this is the basic style - width is recalculated depending on timeSlize
  eventElementBorderTopSytle = {
    'border-top-width' :  'thick',
    'border-top-style' :  'solid',
    'padding' : '0.1em'
  }

  eventElementBorderBottomSytle = {
    'border-bottom-width' :  'thick',
    'border-bottom-style' :  'solid',
    'padding' : '0.1em'
  }

  leftIconStyle =  {
    'padding-left': '0',
    'margin-left' : '-10px'
  }

  expandIconStyle = {
    'font-size': '150%',
    'line-height': '2',
    'margin-top': '-8px'
  }


  constructor() { }

  ngOnInit() {
    if (this.session.calendarDay) {
      this.loadOptions();
      if (this.actualEvents  && this.planEvents  && this.timeSpans) {
        this.buildGrids();
      }
    }
  }


  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetEvents = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts' || propKey === 'options' || propKey === 'calendarDayChangeCounter') {
        // this.opts = propValue.currentValue;
        if (this.session.calendarDay && this.userOpts) {
          this.loadOptions();
          if (this.actualEvents  && this.planEvents  && this.timeSpans) {
             this.buildGrids();
          }
        }
      }
      // console.log('event-day-grid propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
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

      // we enhance some styles

      this.eventElementStyle = this.configurableStyles.eventElementStyle;

      const {...eventStyles} = this.configurableStyles.eventStyle;
      // we override font-weight according to isPlan selected or not
      // and margin-left to shift text at the left border of element (in the moment not ative)
      // this.actualEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'normal', 'margin-left' : '-6px'} : {...eventStyles, 'font-weight':  'bold', 'margin-left' : '-6px'};
      this.actualEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'normal'} : {...eventStyles, 'font-weight':  'bold'};
      this.planEventStyle = this.session.isPlan? {...eventStyles, 'font-weight':  'bold'} : {...eventStyles, 'font-weight':  'normal'};

      const {...locationStyles} = this.configurableStyles.locationStyle;
      this.locationStyle =  {...locationStyles,  'margin-top': '-10px'};

      const {...descriptionStyles} = this.configurableStyles.descriptionStyle;
      this.descriptionStyle =  {...descriptionStyles,  'margin-top': '-10px'};
    }
  }

  /**
   * getOptions delivers the style options
   *
   * we use it as following:
   * - each single option exists as property of this component (this.configurableStyles) for use in html template
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
    // option group names: see enum OptionGroupcalendar
    // option group types: see util getStyleOptionType

    const area = 'calendar';
    // no default group 100
    const isStylesHaveDefault = false;
    const enumStringType: { [key: string]: any } = OptionGroupCalendar;
     // with stypeStringKeys we modify elements of this.configurableAtyles ...
    const stylesStrinKeys: { [key: string]: any } = this.configurableStyles;
    // set this.configurableStyles from calendar options
    Object.keys(this.configurableStyles)
    .forEach((k: any) => {
      if (k.startsWith('is') && typeof stylesStrinKeys[k] === 'boolean') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionBoolean(this.options, area, style,
          enumStringType['calendar_' + k]);
        if (s !== undefined && s !== null) {
          stylesStrinKeys[k] = s;
        }
      } else if (typeof stylesStrinKeys[k] === 'object') {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['calendar_' + k], isStylesHaveDefault);
        // console.log('option seq found: ', k);
        if (s !== undefined && s !== null) {
          stylesStrinKeys[k] = s;
          // console.log('set to: ', stylesStrinKeys[k]);
        }
      }
    });
  }

  private buildGrids() {
    this.timeSpanGrid = this.buildTimeSpanGrid(this.timeSpans, this.session.calendarDay);
    this.grid = [];
    const actualGrid = this.buildGrid(GlobalFunctions.buildEvents(this.actualEvents,  this.session.calendarDay, true, false),
      this.session.calendarDay, this.eventElementStyle);
    const planGrid = this.buildGrid(GlobalFunctions.buildEvents(this.planEvents, this.session.calendarDay, true, false),
      this.session.calendarDay, this.eventElementStyle);
    // actualGrid, planGrid and linkedGrid are of same length and same time-infrastructure ....
    actualGrid.forEach((_, ix) => this.grid.push({actual: _, plan: planGrid[ix]}) );
  }

  /**
   * buildTimeSpanGrid builds a grid for timeSpans
   * @param timeSpans array of time spans  (for week)
   * @param calendarDay  day for the grid
   * @returns arrray of elements for 1 day
   */
  private buildTimeSpanGrid(events: CalendarEvent[], calendarDay: Date): IEventGridElement[] {
    // console.log(events, cat);
    const grid: IEventGridElement[]= [];
    // build elements with  custOrder data, contact color, category
    events.forEach(_ => {
      if (GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(calendarDay, 1))
      && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(calendarDay)  ) {
        let contactDisplayNr = '';
        let contactDisplayName = '';
        let leftContactStyle = {};
        let rightContactStyle = {};
        let eventElementStyle = {};
        const category = this.timeSpanTypeColors[_.type % 10].text;
        const backgroundColor = this.timeSpanTypeColors[_.type % 10].backgroundColor;
        const color = this.timeSpanTypeColors[_.type % 10].color;
        if ( _.contactNr && _.contactNr > 0) {
          contactDisplayNr = _.eventInfo?.contactDisplayNr ?? '';
          contactDisplayName = _.eventInfo?.contactDisplayName ?? '';
          let contactStyle = {};
          if (_.eventInfo?.contactColor) {
            contactStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor, 0, 0, GlobalFunctions.clone(this.configurableStyles.contactStyle));
            // leftContactStyle and rightContactStyle are not needed for timeSpan
            eventElementStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor, 90, 0, eventElementStyle);
          }
        } else {
          // we set color from time span category
          eventElementStyle = {'background-color': backgroundColor, 'color': color};
        }
        const element: IEventGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, event: _,
        eventBegins: true, eventEnds: true, eventDurationDisplay: '', eventRowSpan: 0,
        contactDisplayNr, contactDisplayName, category,
        leftContactStyle, rightContactStyle, eventElementStyle
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
   * @param calendarDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(events: Array<CalendarEvent>,  calendarDay: Date, elStyle: {}): Array<IEventGridElement>  {
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
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5  : this.userOpts.lastHour * 60 - 5;
    for (let i = gridBegin; i <= gridEnd; i += 5) {
      let event: CalendarEvent | undefined;
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
      let eventElementStyle: {} = GlobalFunctions.clone(elStyle);
      if (event && event?.eventInfo) {
        if (event.eventInfo.contactColor) {
          // we set color via contactStyle - if no contact defined, style is set to light grey via StyleFactory
          const contactStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor, 0, 0, GlobalFunctions.clone(this.configurableStyles.contactStyle));
          // leftCtyle and rightCtStyle define position for contactLabel - independent of font size, as far as possible
          leftContactStyle = {...contactStyle, 'margin-right' : '5px'};
          rightContactStyle = {...contactStyle, 'margin-left' : '10px'};
          eventElementStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor, 90, 0, eventElementStyle);
        }
        contactDisplayName = event.eventInfo.contactDisplayName && event.eventInfo.contactDisplayName !== ''
          ? event.eventInfo.contactDisplayName
          : '';
        contactDisplayNr = event.eventInfo.contactDisplayNr && event.eventInfo.contactDisplayNr !== ''
          ? event.eventInfo.contactDisplayNr
          : event.eventInfo.contactNr > 0
            ? this.txt['contact'] + ': ' + event.eventInfo.contactNr.toString()
            : '';
      }
      const timeElementStyle = i < (this.userOpts.startHour * 60) || i >= (this.userOpts.lastHour * 60) ? this.configurableStyles.timeElementOutsideStyle : this.configurableStyles.timeElementStyle;
      const timeInTimeElementStyle:  { [key: string]: any } = GlobalFunctions.clone(this.configurableStyles.timeInTimeElementStyle);
      if (timeInTimeElementStyle && timeInTimeElementStyle['font-weight']) timeInTimeElementStyle['font-weight']  = (i % 60 === 0 ? 'bold' : 'normal');
      const tableRowStyle:  { [key: string]: any } = GlobalFunctions.clone(this.configurableStyles.tableRowStyle);
      if (tableRowStyle && tableRowStyle['height']) tableRowStyle['height']  = Math.floor(40/Number(Number(this.userOpts.timeSlize))).toString() + 'px';
      // borderUnit is timeSlize, but max. 3ß
      const borderUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
      const rowElementStyle = i === gridBegin && isEventBeforeStartHour && !this.isShowBeforeStartHour ? {
          ...this.eventElementBorderTopSytle,
          'border-top-color' :  eventColor
        }
        : i === gridEnd && isEventAfterLastHour && !this.isShowAfterLastHour ? {
          ...this.eventElementBorderBottomSytle,
          'border-bottom-color' : eventColor
        }
        : {
          ...this.eventElementBorderTopSytle,
          'border-top-style' : i % 30 === 0 && Number(this.userOpts.timeSlize) === 60  ? 'dotted' : null,
          'border-top-width' : i % 60 === 0 ?  'thin' : i % 30 === 0 && Number(this.userOpts.timeSlize) === 60  ? '1px' : null
        };
      // we round to timeSlize (max. 30min) - if reounded value is not possible, we try the other rounded alternative ...
      let roundedMinutes = Math.round(i / borderUnit) * borderUnit;
      roundedMinutes = roundedMinutes < minutesBefore ? (roundedMinutes + borderUnit > minutesAfter ? i : roundedMinutes + borderUnit)
        : roundedMinutes > minutesAfter ? (roundedMinutes - borderUnit < minutesBefore ? i : roundedMinutes - borderUnit) : roundedMinutes;
      const timeUnit =  Number(this.userOpts.timeSlize) === 5 ? 15 : Number(this.userOpts.timeSlize) === 10 ? 30 : Number(this.userOpts.timeSlize);
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
        leftContactStyle,
        rightContactStyle,
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

  // event can also be a timeSpan
  public enableEventCard(event: CalendarEvent) {
    const updateType = (this.session.isPlan && event.type === EventType.plan)
    || (!this.session.isPlan && event.type === EventType.actual)
    || event.type >= EventType.timeSpanUndefined
    ? UpdateType.update
    : UpdateType.setShow;
    this.cardFormViewEnabled.emit({updateType, event, d: null});
  }

  public insertTimeSpan() {
    const event = CalendarEventFactory.empty();
    event.type = EventType.timeSpanUndefined;
    this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event,
      d: this.session.calendarDay});
  }

  public insertEventCard(minutes: number) {
    // console.log('insert event card at: ', minutes);
    // we allow insert of actual events unlimited - actual is disabled at view after today !!
    if (!this.session.isPlan|| GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.calendarDay)) {
      let isInsertEvent = true;
      const startOfPreviousMonth = GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(new Date()), -1);
      if (GlobalFunctions.getDateInMinutes(this.session.calendarDay) < GlobalFunctions.getDateInMinutes(startOfPreviousMonth)) {
      if (!confirm(this.txt['new_event_before_previous_month'] + '?')) {
          isInsertEvent = false;
        }
      }
      if (isInsertEvent) {
        // event is inserted with default type (0 = plan)
        const event = CalendarEventFactory.empty();
        // we round to multiple of timeSlize (max. 30)
        const timeUnit = Number(this.userOpts.timeSlize) > 30 ? 30 : Number(this.userOpts.timeSlize);
        minutes = Math.round(minutes/timeUnit) * timeUnit;
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event,
          d: GlobalFunctions.addMinutes(this.session.calendarDay, minutes)});
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


  public selectEvent(event: CalendarEvent) {
    if (event.isSelected) {
      event.isSelected = false;
    } else {
      event.isSelected = true;
    }
    this.eventSelect.emit({isSelect: event.isSelected, id: event.eventId});
  }

}


