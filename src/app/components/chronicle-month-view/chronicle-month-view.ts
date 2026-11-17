import { Component, EventEmitter, Input, Output, SimpleChange, HostListener, signal } from '@angular/core';
import { DatePipe, formatDate, NgClass, NgStyle, SlicePipe } from '@angular/common';

import { BLACK, GAINSBORO, LIGHT_CORAL, LIGHT_GREEN, LIGHT_GREY, POWDER_BLUE, RED, WHITE, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { ConfigurationOption } from '../../_db/configuration-option';
import { DocumentElement } from '../../_db/document';
import { Session } from '../../_db/session';

import { OptionGroupCalendar } from '../../_enums/option-group-calendar.enum';
import { EventType } from '../../_enums/event-type.enum';
import { LocationType } from '../../_enums/location-type.enum';

import { IEventGridElement } from '../../_interfaces/i-event-grid-element';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IChronicleElement } from '../../_interfaces/i-chronicle-element';
import { ISortElement } from '../../_interfaces/i-sort-element';

import { SafeResource } from '../../_services/safe-resource';
import { UserService } from '../../_services/user.service';
import { CalendarService } from '../../_services/calendar.service';
import { MapComponent } from '../map/map';
import { IMapMarker } from '../../_interfaces/i-map-marker';
import { CalendarEvent } from '../../_db/calendar-event';

// we need DayElements to store properties of a day
class EventExtended extends CalendarEvent {style!: {}; isMapAvailable!: boolean; isMapShown!: boolean; markers!: Array<IMapMarker>};
class DayElement {date!: Date; weekNr!: number; dayOfWeek!: number; isHoliday!: boolean; text!: string;
  documents!: Array<DocumentElement>; event!: Array<CalendarEvent>; birthdays!: Array<CalendarEvent>; timeSpans!: Array<EventExtended>;
  dayGrid!: Array<IEventGridElement>; timeSpanGrid!: Array<IEventGridElement>; documentGrid!: Array<Array<DocumentElement>>; shiftedDocuments!: Array<Array<DocumentElement>>; isGridShown!: boolean;
  firstGridHour!: number; lastGridHour!: number; isMapAvailable!: boolean; isMapShown!: boolean; markers!: Array<IMapMarker> };

@Component({
  selector: 'dsy-chronicle-month-view',
  templateUrl: './chronicle-month-view.html',
  styleUrl: './chronicle-month-view.css',
  imports: [NgStyle, NgClass, DatePipe, SafeResource, MapComponent]
})
export class ChronicleMonthViewComponent {

  public name = 'ChronicleMonthViewComponent';

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) monthElement!: IChronicleElement;

  @Input({required: true}) documents!: Array<DocumentElement>;
  @Input({required: true}) event!: Array<CalendarEvent>;

  @Input({required: true}) document!: DocumentElement;

  @Input({required: true}) thumbnails!: { [key: number]: {content: string, width: number | undefined} };
  @Input({required: true}) images!: { [key: number]: {content: string, width: number | undefined} };

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) documenttxt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  // document category values and names
  @Input({required: true}) documentCategorys!: {[key: string]: string}

  @Input({required: true}) options!: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts!: IUserEventOptions;

  // activate image for a document which is shown ...
  @Output() documentShow = new EventEmitter<number>();
  // activate calendar for a event which is shown ...
  @Output() eventShow = new EventEmitter<CalendarEvent>();

  @Output() showDay = new EventEmitter<[number, number, number]>();

  // show signal triggers change detection
  public showSignal = signal(0);

  public monthDocuments!: Array<DocumentElement>;
  public monthEvent!: Array<CalendarEvent>;
  public dayElements: Array<DayElement> = [];

  locationTypeEnum: typeof LocationType = LocationType;

  public recurringTimeSpans!: Array<CalendarEvent>;
  public timeSpans!: Array<EventExtended>;;
  public timeSpanTypeColors!: Array<{text: string, color: string}>;

  public isFirstViewBuild = true;

  // we allow only 1 map to be shown
  public isMapShown = false;

  // we build complete grid, so this must be set true ...
  isShowBeforeStartHour = true;
  isShowAfterLastHour = true;


  // date  buttonstyle
  dateStyle = {'background-color': LIGHT_GREEN};
  defaultStyle = {};

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

  constructor(
    private userService: UserService,
    private calendarService: CalendarService) {}

  async ngOnInit() {
    // console.log('chronicle-month-view init');
    await this.buildElements();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {
      // console.log('propkey: ', propKey);
      // we  build elements at initialization of an month element by years view
      // but this view is initialzed new anyway, so we build elements at ngOnInit
      if (propKey === 'document') {
        // console.log('document propkey: ', propKey);
        // this.positionViewport();
      }
    }
  }



  /**
   * we load style options from auth
   */
  private async loadOptions() {
    this.getTimeSpanCategories();
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


      // we override some styles (as in event-day-grid-view)

      const {...eventElementStyles} = this.styles.eventElementStyle;
      // we override cursor behaviour
      this.eventElementStyle = {...eventElementStyles, 'cursor':  'pointer'};

      const {...eventStyles} = this.styles.eventStyle;
      // we reduce margin left
      this.eventStyle =  {...eventStyles, 'font-weight':  'normal', 'margin-left': '-10px'} ;


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

  private getTimeSpanCategories() {
    this.timeSpanTypeColors = [];
    for (let i = 0; i <= 9; i++) {
      const cat = i === 0 ? 'undefined' : i === 1 ? 'holiday' : i === 2 ? 'birthday' : i.toString();
      const category = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_span_' + cat) ?? '';
      let text = category;
      let color = '';
      if (category.includes('#')) {
        text = category.substring(0, category.indexOf('#'));
        color = category.substring(category.indexOf('#'))
      }
      this.timeSpanTypeColors.push({
        text,
        color
      });
    }
  }

  // this is the main procedure of this component ....
  private async buildElements() {
    await this.loadOptions();
    await this.buildRecurringTimeSpans();
    if (this.documents?.length > 0) {
      // console.log(`number of documents: `, documents?.length);
      const sortElements: Array<ISortElement> = [{sortField: 'dateTimeOriginal', key: 'dateTimeOriginal'}, {sortField: 'documentSubDirectory', key: 'documentSubDirectory'}, {sortField: 'documentName', key: 'documentName'}];
      this.monthDocuments = this.documents
      .map(_ => {
        _.dateTimeOriginal = _.dateTimeOriginal ?? _.documentDate;
        return _;
      })
      .filter(_ => {
        const startMonth = new Date(this.monthElement.year, this.monthElement.month -1, 1);
        const endMonth = new Date(this.monthElement.year, this.monthElement.month, 1);
        return (startMonth.getTime() <= _.dateTimeOriginal?.getTime()
          && endMonth.getTime()  > _.dateTimeOriginal?.getTime()
        );
      })
      .sort(GlobalFunctions.sortFields(sortElements));
    } else {
      this.monthDocuments = [];
    }
    if (this.event?.length > 0) {
      const startMonth = new Date(this.monthElement.year, this.monthElement.month -1, 1);
      const endMonth = new Date(this.monthElement.year, this.monthElement.month, 1);
      const sortElements: Array<ISortElement> = [{sortField: 'eventBegin', key: 'eventBegin'}]
      this.monthEvent = this.event
      .filter(_ => {
        return (startMonth.getTime() <= _.eventEnd?.getTime()
          && endMonth.getTime() > _.eventBegin?.getTime()
          && _.type === EventType.actual
        );
      })
      .sort(GlobalFunctions.sortFields(sortElements));
      for (let _ of this.monthEvent) {
        // build eventInfos if contact or issue is joined (eventInfod are not persisted ...)
        if (!_.eventInfo && (_.contactNr > 0 )) {
            _ = await this.calendarService.buildEventInfo(_, this.name);
        }
      }
      //  extract timespans:
      const timeSpans = this.event.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) >= GlobalFunctions.getDateInMinutes(startMonth)
        && GlobalFunctions.getDateInMinutes(_.eventBegin) <= GlobalFunctions.getDateInMinutes(endMonth)
        && _.type >= EventType.timeSpanUndefined
        && _.type <= EventType.timeSpanCategory9);
      for (let timeSpan of timeSpans) {
        // build eventInfos if contact or issue is joined (eventInfod are not persisted ...)
        if (!timeSpan.eventInfo && timeSpan.contactNr > 0) {
            timeSpan = this.calendarService.buildEventInfo(timeSpan, this.name);
        }
      }
      this.timeSpans = timeSpans
      .map(timeSpan => {
        const {...rest} = timeSpan;
        const style = StyleFactory.getBgColorStyle(this.timeSpanTypeColors[timeSpan.type % 10].color, 80, 2, {'background-color': WHITE_SMOKE});
        // we build markers for timeSpan (if there are documents at any day of timesSpan with location)
        const documents = this.monthDocuments.filter(_ => GlobalFunctions.getStartOfDay(timeSpan.eventBegin).getTime() <= _.dateTimeOriginal.getTime()
        && GlobalFunctions.getEndOfDay(timeSpan.eventEnd).getTime() >= _.dateTimeOriginal.getTime());
        let markers: Array<IMapMarker> = [];
        documents.forEach(_ => {
          const location = GlobalFunctions.getLocation(_.imageLocation);
          const [lat, long, alt] = location;
          if (lat !== 0 || long !== 0) {
            const tooltip = formatDate(_.dateTimeOriginal, 'EEE d.MM.yyyy HH:mm', this.locale);
            markers.push({marker: location, tooltip});
          }
        });
        return {
          ...rest,
          style,
          isMapAvailable: markers?.length > 0,
          isMapShown: false,
          markers
        }
      })
      .sort(GlobalFunctions.sortFields(sortElements));
    } else {
      this.monthEvent = [];
      this.timeSpans = [];
    }
    if (this.monthElement) {
      // month is "next month" for date constructor ...with day 0 we got last day of previous month ...
      const lastDay = new Date(this.monthElement.year, this.monthElement.month, 0).getDate();
      let positionedDay = 0;
      for (let day = 0; day < lastDay; day++) {
        const date = new Date(this.monthElement.year, this.monthElement.month - 1, day + 1);
        const recIx = this.recurringTimeSpans?.findIndex(_ => _.type === EventType.timeSpanCategory1 && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.getEndOfDay(date) )
          && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(date)));
        let text = '';
        let isHoliday = false;
        if (recIx >= 0) {
          isHoliday = true;
          text = this.recurringTimeSpans[recIx].summary;
        }
        // we build markers for day element (if there are documents at this day with location)
        const documents = this.monthDocuments.filter(_ => GlobalFunctions.getStartOfDay(date).getTime() <= _.dateTimeOriginal.getTime()
          && GlobalFunctions.getEndOfDay(date).getTime() >= _.dateTimeOriginal.getTime());
        let markers: Array<IMapMarker> = [];
        documents.forEach(_ => {
          const location = GlobalFunctions.getLocation(_.imageLocation);
          const [lat, long, alt] = location;
          if (lat !== 0 || long !== 0) {
            const tooltip = formatDate(_.dateTimeOriginal, 'HH:mm', this.locale);
            markers.push({marker: location, tooltip});
          }
        });
        const eventDay = GlobalFunctions.getStartOfDay(date);
        const nextDay = GlobalFunctions.addDays(eventDay, 1);
        const event = this.monthEvent.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(nextDay)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay));
        // spans for grid are birthdays (of recurring timespans) and all other timespans which are valid at this day
        const birthdays = this.recurringTimeSpans.filter(_ =>  _.type === EventType.timeSpanCategory2
        && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(nextDay)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay));
        // we take timeSpans array from all timespans and clone timeSpans which belong to this day
        const timeSpans = this.timeSpans
        .filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(nextDay)
        && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay))
        .map(_ => {
          const clonedTimeSpan: EventExtended = GlobalFunctions.clone(_);
          return clonedTimeSpan;
        });
        const spansForGrid = birthdays.concat(timeSpans);
        const elStyle = {
          'background-color': WHITE_SMOKE
        };
        let timeSpanGrid: Array<IEventGridElement> = [];
        let dayGrid: Array<IEventGridElement> = [];
        let documentGrid: Array<Array<DocumentElement>> = [];
        let shiftedDocuments: Array<Array<DocumentElement>> = [];
        let shiftDocuments: Array<DocumentElement> = [];
        // we need firstGridHour and lastGridHour cause we have no choice to show hours before bein and hours after end ...
        let firstGridHour: number = 0;
        let lastGridHour: number = 0;
        // adjust grid and fill grid with documents if event or documents exist for this day
        if (event.length > 0 || documents.length > 0 || timeSpans.length > 0) {
          timeSpanGrid = this.buildTimeSpanGrid(spansForGrid, date, elStyle);
          dayGrid = this.buildGrid(event, date);
          for (let index = 0; index < dayGrid.length; index++) {
            // we push an empty array to have an element for this index
            documentGrid.push([]);
            shiftedDocuments.push([]);
            // we build first and last hour
            if (dayGrid[index].event) {
              if (!(firstGridHour > 0)) {
                firstGridHour = Math.floor(dayGrid[index].minutes / 60);
              }
              lastGridHour = Math.floor(dayGrid[index].minutes / 60) + 1;
            }
            // we build documents for the time interval when time begins = begin of an hour
            if (dayGrid[index].minutes % 60 === 0 && documents.length > 0) {
              // all documents of this time and at first element - also before
              const documentsInTime = documents.filter(_ => (_.dateTimeOriginal.getHours() * 60 + _.dateTimeOriginal.getMinutes() >= dayGrid[index].minutes
                || (_.dateTimeOriginal.getHours() * 60 + _.dateTimeOriginal.getMinutes() < dayGrid[index].minutes && index === 0) )
                && _.dateTimeOriginal.getHours() * 60 +  _.dateTimeOriginal.getMinutes() < dayGrid[index].minutes + 60);
              if (documentsInTime?.length > 0) {
                documentGrid[index] = documentsInTime;
                shiftDocuments = shiftDocuments.concat(documentsInTime);
                if (!(firstGridHour > 0)) {
                  firstGridHour = Math.floor(dayGrid[index].minutes / 60);
                }
                lastGridHour = Math.floor(dayGrid[index].minutes / 60) + 1;
              }
            }
            // if there is no event or at last element, we place all shift documents here ...
            if ((!dayGrid[index].event || index < dayGrid.length - 1) && shiftDocuments.length > 0) {
              shiftedDocuments[index] = shiftDocuments;
              shiftDocuments = [];
            }
          }
        }
        // find day element in month (here day is 0 based index, so we must add 1)
        const dayIx = this.monthElement.subElements?.findIndex(_ => _.day ===  day + 1);
        this.dayElements.push(
          {
            date,
            weekNr: GlobalFunctions.getWeek(date) ?? 0,
            dayOfWeek: GlobalFunctions.getWeekDay(date),
            isHoliday,
            text,
            documents,
            event,
            birthdays,
            timeSpans,
            dayGrid,
            timeSpanGrid,
            documentGrid,
            shiftedDocuments,
            isGridShown: dayIx >= 0 ? this.monthElement.subElements[dayIx].isElementShown : false,
            firstGridHour: firstGridHour >= 0 && firstGridHour <  this.userOpts.startHour? firstGridHour : this.userOpts.startHour,
            lastGridHour: lastGridHour >= 0 && lastGridHour >  this.userOpts.lastHour? lastGridHour : this.userOpts.lastHour,
            isMapAvailable: markers?.length > 0,
            isMapShown: false,
            markers
          }
        );
        if (dayIx >= 0 && this.monthElement.subElements[dayIx].eventsCount === -1) {
          // we reset trigger for day positioning
          this.monthElement.subElements[dayIx].eventsCount = 0;
          positionedDay = day + 1;
        }
      }
      this.positionViewport(positionedDay);
      this.showSignal.set(this.showSignal() + 1);
      // console.log('showSignal', this.showSignal());
      // console.log('dayElements', this.dayElements);
    }

  }

  /**
   * positionViewport
   * is called from buildElements - this can happen in one of 3 scenarios:
   * - chronicle-years-view was called first time and this instance of month-view is called.
   *    That means that user-worlDay lies in this month, we position to user-worlDay
   * - chronicle-years-view was called after showing an document - all month instances for months which were open before are initialized
   *    In that case we must check if this.document lies in this month and position to remembered scroll position
   * - this instance of month-view was opened by call of user. In this case we must not change scroll position
   *
   */
  private positionViewport(day: number) {
    let isPositioned = false;
    // position to thumbnail of just viewed document
    if (this.document?.documentId > 0 && this.dayElements?.length > 0) {
      const index = this.dayElements.findIndex(_ => _.documents.filter(doc => doc.documentId === this.document?.documentId).length > 0);
      if (index >= 0) {
         // go to remembered position        /*
        const savedPosition = localStorage.getItem('scrollPosition');
        if (savedPosition) {
          // after 100 milliseconds elements should be rendered ...
          const duration = 100;
          setTimeout(() => {
            window.scrollTo(0, parseInt(savedPosition, 10));
            // console.log('savedPosition', savedPosition);
            isPositioned = true;
            localStorage.removeItem('scrollPosition');
          }, duration);
        }
      }
    }
    if (!isPositioned && day > 0) {
      const index = this.dayElements.findIndex(_ => _.date.getDate() === day);
      if (index >= 0) {
        const id = this.dayElements[index].date.getDate().toString();
        let element = document.getElementById(id);
        if (element) {
          // after 100 milliseconds elements should be rendered ...
          const duration = 100;
          setTimeout(() => {
            element.scrollIntoView({ block: "start" });
            window.scrollBy(0,-200);
          }, duration);
        }
        
      }
    }

  }

  /**
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
  private async buildRecurringTimeSpans() {
    if (this.monthElement) {
      const startMonth = new Date(this.monthElement.year, this.monthElement.month -1, 1);
      const endMonth = new Date(this.monthElement.year, this.monthElement.month, 1);
      // recurring timeSpans come from local user data
      this.recurringTimeSpans = await this.userService.getRecurringTimeSpanRange(0,  startMonth, endMonth, this.name);
      this.recurringTimeSpans.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
    }
  }

  /**
   * buildTimeSpanGrid builds a grid for tiem spans - code is equivalent to event-day-grid-view,
   * @param timeSpans array of time spans
   * @param eventDay  day for the grid
   * @param elStyle  style object which should by adjected to the elemnts built
   * @returns arrray of elements for 1 day
   */
  private buildTimeSpanGrid(events: CalendarEvent[], eventDay: Date, elStyle: {}): Array<IEventGridElement> {
    // console.log(events, cat);
    const grid: IEventGridElement[]= [];
    // build elements with  custOrder data, contact color, category
    events.forEach(_ => {
      if (GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(eventDay, 1))
      && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(eventDay)  ) {
        let contactDisplayNr = '';
        let contactDisplayName = '';
        let leftContactStyle = {};
        let rightContactStyle = {};
        let eventElementStyle: {} = GlobalFunctions.clone(elStyle);
        const category = this.timeSpanTypeColors[_.type % 10].text;
        const color = this.timeSpanTypeColors[_.type % 10].color;
        if ( _.contactNr && _.contactNr > 0 && _.eventInfo) {
          contactDisplayNr = _.eventInfo.contactDisplayNr ?? '';
          contactDisplayName = _.eventInfo.contactDisplayName ?? '';
          const custStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor ?? '', 0, 0, GlobalFunctions.clone(this.styles.custStyle));
          // leftOrderStyle and rightOrderStyle define position for custOrderLabel - independent of font size, as far as possible
          leftContactStyle = {...custStyle, 'margin-right' : '5px'};
          rightContactStyle = {...custStyle, 'margin-left' : '10px'};
          eventElementStyle = StyleFactory.getBgColorStyle(_.eventInfo.contactColor ?? '', 90, 0, eventElementStyle);
        } else if (color !== '') {
          // we set color from time span category
          eventElementStyle = StyleFactory.getBgColorStyle(color, 80, 2, eventElementStyle);
        }
        const element: IEventGridElement = {minutes: 0, roundedMinutes: 0, timeElement: '', timeBegins: true, timeRowSpan: 0, event: _,
        eventBegins: true, eventEnds: true, eventDurationDisplay: '', eventRowSpan: 0,
        contactDisplayNr, contactDisplayName, category,
        leftContactStyle, rightContactStyle, eventElementStyle
        };
        grid.push(element);
      } else {
        // console.log('timespan: ', _, 'outside eventDay: ', eventDay );
      }
    })
    return grid;
  }


  /**
   * buildGrid builds a 1 day 5min grid - code is equivalent to event-day-grid-view, event-day-week-viewe
   *
   * @param events array of events for a day
   * @param eventDay  day for the grid
   * @returns arrray of 5min elements for 1 day
   */
  private buildGrid(events: Array<CalendarEvent>, eventDay: Date): Array<IEventGridElement> {
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
    const gridEnd = this.isShowAfterLastHour  ? 24 * 60 - 5 : this.userOpts.lastHour * 60 -5;
    for (let i = gridBegin; i <= gridEnd; i += 5) {
      let event: CalendarEvent | undefined;
      let minutesBefore: number = 0;
      let minutesAfter: number = 0;
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
      let contactDisplayNr = '';
      let contactDisplayName = '';
      let leftContactStyle = {};
      let rightContactStyle = {};
      let eventElementStyle: {} = GlobalFunctions.clone(this.eventElementStyle);
      if (event && event?.eventInfo) {
        // we set color via custStyle - if no contact defined, style is set to light grey via StyleFactory
        const contactStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor ?? '', 0, 0, GlobalFunctions.clone(this.styles.custStyle));
        // leftCustStyle and rightCustStyle define position for custIssueLabel - independent of font size, as far as possible
        leftContactStyle = {...contactStyle, 'margin-right' : '5px'};
        rightContactStyle = {...contactStyle, 'margin-left' : '10px'};
        eventElementStyle = StyleFactory.getBgColorStyle(event.eventInfo.contactColor?? '', 90, 0, eventElementStyle);
        let contactDisplayName = event.eventInfo.contactDisplayName && event.eventInfo.contactDisplayName !== ''
          ? event.eventInfo.contactDisplayName
          : event.eventInfo.contactNr > 0
            ? (this.txt['contact']) + ': ' + event.eventInfo.contactNr.toString()
            : '';
        if (event.contactNr > 0) {
          contactDisplayNr = event.eventInfo.contactDisplayNr ?? '';
          contactDisplayName = contactDisplayName.substring(0,30);
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
      // console.log('element:', element);
    }
    // after building grid, we must adjust eventRowSpans
    for (let index = 0; index < grid.length; index++) {
      // standard grid has eventRowSpan only for time intervals with event
      // we need eventrowspan at each timeBegins - if no event - until next eventBegins
      if (!grid[index].event) {
        if (grid[index].timeBegins || (index > 0 && grid[index -1].event)) {
          // this element is at time begin or after a event segment - we calculate rowspan
          const nextEventOrTimeIx = grid.findIndex((_, ix) => ix > index && (_.event || _.timeBegins));
          if (nextEventOrTimeIx > index) {
            grid[index].eventRowSpan = nextEventOrTimeIx - index;
          } else {
            // at last interval we must consider end of array ....
            if (index >= grid.length - this.userOpts.timeSlize / 5) {
              grid[index].eventRowSpan = grid.length - index;
            }
          }
        }
      }
    }
    return grid;
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // console.log(event.target.innerWidth);
    this.windowWidth = event.target.innerWidth;
  }

  // needed only for debugging
  @HostListener('window:scroll')
  onWindowScroll() {
    // console.log('currentScrollPosition', window.scrollY);
  }

 
  /** --------------------------  public methods -------------------------------------------- */


  public toggleDayGrid(element: DayElement) {
    element.isGridShown = !element.isGridShown;
    this.showDay.emit([element.date.getFullYear(), element.date.getMonth() + 1, element.date.getDate()])
    this.showSignal.set(this.showSignal() + 1);
  }

  public toggleMap(element: DayElement) {
    element.isMapShown = !element.isMapShown;
    this.isMapShown = element.isMapShown;
    this.showSignal.set(this.showSignal() + 1);
  }

  public toggleTimeSpanMap(timeSpan: EventExtended) {
    timeSpan.isMapShown = !timeSpan.isMapShown;
    this.isMapShown = timeSpan.isMapShown;
    this.showSignal.set(this.showSignal() + 1);
  }

  // set height in a event element
  public setEventHeight(style: {}, element: IEventGridElement) {
    // console.log('setPointer: ', isActive, style);
    if (this.windowWidth >= WINDOW_WIDTH_MOBILE) {
      return style;
    } else {
      // in case of mobile size we use eventRowSpan as height
      return {...style,  'height':  (element.eventRowSpan > 6 ? 8 * element.eventRowSpan : 48).toString() + 'px', 'vertical-align': 'middle'};
    }
  }

  // set atime style into a 1 row element without event
    public setTimeStyle(style: {}) {
      let timeStyle: {}
      if (this.windowWidth >= WINDOW_WIDTH_MOBILE) {
        timeStyle = {...style};
      } else {
        // in case of mobile size we planned to have have only 1 row - we place time in rows without event ...
        timeStyle = {...style, ...this.styles.timeInTimeElementStyle};
      }
      return timeStyle;
    }



  // user hasclicked on an image
  public show(id: number) {
    // remember scroll position
    const scrollPosition = window.scrollY;
    // console.log('scrollPosition', scrollPosition);
    localStorage.setItem('scrollPosition', scrollPosition.toString());
    if (id >= 0) this.documentShow.emit(id);
  }

  // user has clicked on an event
  public showEvent(event: CalendarEvent) {
    this.userService.setUserCalendarDay(this.session.userId, GlobalFunctions.getStartOfDay(event.eventBegin), this.name);
    if (confirm(this.txt['event'] + ' ' + this.txt['show'] + ' - ' + this.txt['change_to_calendar'] +'?')) {
      if (event.eventId >= 0) this.eventShow.emit(event);
    }
  }

}

