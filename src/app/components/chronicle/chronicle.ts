import { Component, HostListener, Inject, LOCALE_ID, signal } from '@angular/core';
import { DatePipe, DecimalPipe, formatDate, NgClass, SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { GlobalFunctions } from '../../_globals/global-functions';
import { THUMBNAIL_WIDTH } from '../../_globals/constants';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { ConfigurationOptionHandlingFunctions } from '../../_globals/configuration-option-handling-functions';

import { DocumentElement } from '../../_db/document';
import { DocumentFactory } from '../../_db/document-factory';
import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';
import { CalendarEventFactory } from '../../_db/calendar-event-factory';
import { CalendarEvent } from '../../_db/calendar-event';
import { User } from './../../_db/user';

import { OptionNameDocumentCategory } from '../../_enums/option-name-document-category';
import { App } from '../../_enums/app.enum';
import { EventType } from '../../_enums/event-type.enum';

import { ISortElement } from '../../_interfaces/i-sort-element';
import { IChoice } from '../../_interfaces/i-choice';
import { IChronicleElement } from '../../_interfaces/i-chronicle-element';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';

import { AuthenticationService } from '../../_services/authentication.service';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { CalendarService } from '../../_services/calendar.service';
import { DocumentService } from '../../_services/document.service';
import { SafeResource } from '../../_services/safe-resource';

import { ChronicleYearsViewComponent } from '../chronicle-years-view/chronicle-years-view';
import { CanComponentDeactivate } from '../../_guards/unsaved-changes.guard';
import { CalendarEventSearchComponent } from '../calendar-event-search/calendar-event-search';
import { UserService } from '../../_services/user.service';
import { MapComponent } from '../map/map';
import { IMapMarker } from '../../_interfaces/i-map-marker';



@Component({
  selector: 'dsy-chronicle',
  templateUrl: './chronicle.html',
  styleUrl: './chronicle.css',
  imports: [ NgClass, SlicePipe, DatePipe, DecimalPipe, SafeResource, CalendarEventSearchComponent, ChronicleYearsViewComponent, MapComponent]
})
export class ChronicleComponent implements CanComponentDeactivate{

  public name = 'ChronicleComponent';

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  public App: typeof App = App;

  // window height to show image in viewport
  windowHeight = window.innerHeight;

  // we need options to build choices
  public options!: Array<ConfigurationOption>;
  public userOpts!: IUserEventOptions;

  // document for show full screen // TODO maybe we show direct from sub components ...
  public document!: DocumentElement;
  public isPreviousDocument = false;
  public isNextDocument = false;
  public previousSubdirectory!: string;
  public nextSubdirectory!: string;


  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews: Session | null = null;

  // db texts
  public documenttxt: { [key: string]: string } = {};
  public eventtxt: { [key: string]: string } = {};

  // documents from db
  public documents: Array<DocumentElement> = [];

  // event from db
  public event: Array<CalendarEvent> = [];

  // chronicle elements
  public yearElements: Array<IChronicleElement> = [];

  // isShowYears is true to show years view
  public showYearsSignal = signal(0);

  // isShowDocument - we show document full-screen
  public showDocumentCounterSignal = signal(0);

  // isShowDocumentDetails - we show document details
  public showDocumentDetailsSignal = signal(0);

  // isShowMap - we show map
  public showMapSignal = signal(0);
  public mapMarkers!:  Array<IMapMarker>;
  public mapCenter!:  [number, number, number?];

  // which elements are shown in chronicle
  public elementChoices!: Array<IChoice>;

  // default value is ALL, so we shall see documents
  public isDocumentsSelected = true;

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // document category values and names - all possible categorys
  documentCategorys!: {[key: string]: string};
  // choice includes all categories
  categoryChoices!: Array<IChoice>;
  // user can see selected categorys - selected category names are shown
  selectedCategorys!: Array<string>;

  // TODO eventually later we can select time spans
  dateFrom: Date = new Date();
  isDateFromEntered = false;
  dateTo: Date = new Date();
  isDateToEntered = false;

  // documents can be filtered by user
  filteredDocuments!: Array<DocumentElement>;

  // event can be filtered by user
  filteredEvents!: Array<CalendarEvent>;

  isShowDropdown!: boolean;

  // popup properties - we use popup here, as this component is selfstanding
  // public popupClass = 'ui flowing popup hidden';
  public popupSignal = signal(0);
  public popupHeaderText = '';
  public popupContentText = '';
  public popupConfirmText = '';
  public popupConfirmClass = 'ui green label';


  // images content for documents, filled  when document detail is shown or for filtered documents
  // we use images content also (as thumnails) in document list template if no thumbnail content
  public images: { [key: number]: {content: string, width: number | undefined}} = {};
  // thumbnails are loaded for documents which are filtered in document list
  public thumbnails: { [key: number]: {content: string, width: number | undefined} } = {};

  // to get touch events ...
  public defaultTouch = { x: 0, y: 0, time: 0 };

  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private configurationService: ConfigurationService,
    private documentService: DocumentService,
    private calendarService: CalendarService,
    public auth: AuthenticationService) {
    }

  async ngOnInit() {
    await this.sessionActivate();
  }


  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.sessionForViews  = this.auth.getSession(this.name);
      this.loadDbTexts();
      this.options = await this.configurationService.getConfigurationOptions(this.name);
      if (this.sessionForViews) {
        const opts = ConfigurationOptionHandlingFunctions.initializeEventOptions(this.options);
        const user = this.auth.getUser(this.sessionForViews.userId, this.name);
        if (user) {
          if (!user.userEventOptions) {
            // user event options are initialized with options of actual session user!!
            user.userEventOptions = ConfigurationOptionHandlingFunctions.initializeUserEventOptions(this.options);
            this.auth.setUserOptions(user.userEventOptions, this.sessionForViews.userId, this.name);
          }
          this.userOpts = user?.userEventOptions;
        }
      }
      
      this.initChoices(true);
      // this.refreshSignal.set(0);
      await this.getElements();
      // this.refreshSignal.set(1);
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
    const document = DocumentFactory.empty();
    this.documenttxt = GlobalFunctions.objText(document,
      'Document', this.auth.systemTexts, language,  this.name);
    const event = CalendarEventFactory.empty();
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
  }

  // with isAll true we set selected choice to all, otherwise to undefined
  private initChoices(isAll: boolean) {
    this.documentCategorys = {};
    // first we build  all category values from enum to get a category header even if no category exists- except for category 0 = undefined ....
    const categorys: Array<number> = Object.keys(OptionNameDocumentCategory)
    // only document categories where optioan has a name !== ''
    .filter((k: any) => typeof OptionNameDocumentCategory[k] === 'string' && ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_document_' + k) !== '')
    .map(_ => Number(_));
    for (const cat of categorys) {
      this.documentCategorys[cat] = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_document_' + cat) ?? '';
    }
    this.categoryChoices = [];
    this.categoryChoices = Object.keys(this.documentCategorys)
    .map(_ => {
      // const enumStringType: { [key: string]: any } = this.documentCategorys;
      let isSelected = !isAll ? true : false;
      return {value: _, text: this.documentCategorys[_], isSelected};
    });
    this.categoryChoices.splice(0, 0, {value: '', text: this.auth.txt['all'],
      isSelected: isAll ? true : false});
    this.selectedCategorys = this.categoryChoices.filter(_ => _.isSelected).map(_ => _.text);

    this.elementChoices = [
      {value: '0', text: this.auth.txt['all'], isSelected: true},
      {value: 'W', text: this.auth.txt['events'], isSelected: false},
      {value: 'D', text: this.auth.txt['documents'], isSelected: false}
    ];
  }

  /**
  * getElements()
  *  get elements which are to be shown in chronicle
  */
  private async getElements() {
    // all documents and event are loaded once at init of component ....
    await this.getDocuments();
    this.getEvent();
    
    this.filterElements();
  }

  private filterElements() {
    this.filterDocuments();
    this.filterEvent();
    const documentElements = this.filteredDocuments
    .reduce((acc: { [key: string]: number}, _) => {
      const documentDate = _.dateTimeOriginal ?? _.documentDate;
      const month = GlobalFunctions.getYM(documentDate)?.toString() ?? '';
      const monthCount = acc[month] ? acc[month] + 1 : 1;
      return {
        ...acc,
        [month]: monthCount
      };
    }, {});
    let elements = Object.entries(documentElements).map(([key, value]) => {
      const month = Number(key.substring(4,6));
      const quarter = (month-1 - (month-1) % 3) / 3 + 1;
      const element: IChronicleElement =  {
        year: Number(key.substring(0,4)),
        quarter,
        month,
        day: 0,
        documentsCount: value,
        eventsCount: 0,
        isElementShown: false,
        subElements: []
      }
      return element;
    });
    for (const event of this.filteredEvents) {
      const yearMonth = GlobalFunctions.getYM(event.eventBegin)?.toString() ?? '';
      elements = this.addEventToMonthElement(yearMonth, elements);
      //  timeSpans are counted at month where they begin and where they end
      const yearMonthEndEvent = GlobalFunctions.getYM(event.eventEnd)?.toString() ?? '';
      if (yearMonth !== yearMonthEndEvent) {
        elements = this.addEventToMonthElement(yearMonthEndEvent, elements);
      }
    }
    // this algorithm events because elements are sorted asccending year month AND there is only 1 element per year/month
    elements = elements.sort((a, b) => a.year * 1000 + a.month - (b.year * 1000 + b.month));
    // build year and quarter elements
    this.yearElements = [];

    for (const el of elements) {
      let yearIx = this.yearElements.findIndex(_ => _.year === el.year);
      if (yearIx < 0) {
        // year elemnts have first month which occurs as month
        let yearEl: IChronicleElement = GlobalFunctions.clone(el);
        yearEl.documentsCount = 0;
        yearEl.eventsCount = 0;
        this.yearElements.push(yearEl);
      }
      yearIx = this.yearElements.findIndex(_ => _.year === el.year);
      this.yearElements[yearIx].documentsCount += el.documentsCount;
      this.yearElements[yearIx].eventsCount += el.eventsCount;
      let quarterIx = -1;
      // subEelemnts are quarters - which have first month of quarter as month
      quarterIx = this.yearElements[yearIx].subElements.findIndex(_ => _.year === el.year && _.quarter === el.quarter);
      if (quarterIx < 0) {
        // quarter elemnts have first month which occurs as month and have all 3 month elements empty
        let quarterEl: IChronicleElement = GlobalFunctions.clone(el);
        quarterEl.documentsCount = 0;
        quarterEl.eventsCount = 0;
        // quartel element is shown if it exists - except one month is shown or at smartphone view ....
        quarterEl.isElementShown = true;
        let emptyMonthEl = GlobalFunctions.clone(el);
        emptyMonthEl.documentsCount = 0;
        emptyMonthEl.eventsCount = 0;
        // we prepare all 3 months of a quarter with an empty month element
        for (let m = 0; m < 3; m++) {
          let monthEl = GlobalFunctions.clone(emptyMonthEl);
          monthEl.month = monthEl.quarter * 3 - 2 + m;
          if (m === 0) {
            quarterEl.subElements = [monthEl];
          } else {
            quarterEl.subElements.push(monthEl);
          }
        }
        if (this.yearElements[yearIx].subElements) {
          this.yearElements[yearIx].subElements.push(quarterEl);
        } else {
          this.yearElements[yearIx].subElements = [quarterEl];
        }
      }
      quarterIx = this.yearElements[yearIx].subElements.findIndex(_ => _.year === el.year && _.quarter === el.quarter);
      if (quarterIx >= 0) {
        this.yearElements[yearIx].subElements[quarterIx].documentsCount += el.documentsCount;
        this.yearElements[yearIx].subElements[quarterIx].eventsCount += el.eventsCount;
        // each month should already exist ...
        const monthIx = this.yearElements[yearIx].subElements[quarterIx].subElements.findIndex(_ => _.year === el.year && _.month === el.month);
        if (monthIx >= 0) {
          let monthEl = this.yearElements[yearIx].subElements[quarterIx].subElements[monthIx];
          monthEl.documentsCount += el.documentsCount;
          monthEl.eventsCount += el.eventsCount;
          // we need user to check if calendartDay shall be activated to show
          if (this.sessionForViews) {
            const user = this.auth.getUser(this.sessionForViews.userId, this.name);
            // we toggle this month to be shown
            if (user?.calendarDay && user.calendarDay?.getFullYear() === monthEl.year && user.calendarDay?.getMonth() + 1 === monthEl.month) {
              monthEl.subElements = [{
                year: monthEl.year,
                quarter: monthEl.quarter,
                month: monthEl.month,
                day: user.calendarDay.getDate(),
                // we do not need counts in the moment ...
                documentsCount: 0,
                // we use eventsCount to trigger position to this day ...
                eventsCount: -1,
                // we direct to this day, but calendar grid should not be open automatically, so isElementShown is flase
                isElementShown: false,
                subElements: []
              }];
              this.yearElements[yearIx].isElementShown = true;
              this.yearElements[yearIx].subElements[quarterIx].isElementShown = false;
              monthEl.isElementShown = true;
              const shownDocuments = this.documents.filter(_ => {
                const documentDate = _.dateTimeOriginal ?? _.documentDate;
                const documentYearMonth  = GlobalFunctions.getYM(documentDate);
                const selectedYearMonth = monthEl.year * 100 + monthEl.month;
                return documentYearMonth  === selectedYearMonth;
              });
              // we build array of ids for the shown documents
              const ids = shownDocuments.reduce((acc: Array<number>, _) => acc.concat(_.documentId), []);
              this.getFilteredThumbnails(ids);
            }
          }
          this.yearElements[yearIx].subElements[quarterIx].subElements[monthIx] = monthEl;
        } else {
          // should not occur - must be a program bug ...
          console.log ('yearElements months structure error');
        }
      } else {
        // should not occur - must be a program bug ...
        console.log ('yearElements quarters structure error');
      }
    }
    this.showYearsSignal.set(1);
  }

  private addEventToMonthElement(yearMonth: string, elements: Array<IChronicleElement>): Array<IChronicleElement>{
    const year = Number(yearMonth.substring(0,4));
      const month = Number(yearMonth.substring(4,6));
      const quarter = (month-1 - (month-1) % 3) / 3 + 1;
      const ix = elements.findIndex(_ => _.year === year && _.month === month);
      if (ix >= 0) {
        elements[ix].eventsCount++;
      } else {
        elements.push({
          year,
          quarter,
          month,
          day: 0,
          documentsCount: 0,
          eventsCount: 1,
          isElementShown: false,
          subElements: []
        })
      }
      return elements;

  }

  /**
   * getDocuments()
   *  delivers all active documents
   */
  private async getDocuments() {
    let documents: Array<DocumentElement>;
    // public documents for chronicle - not used, because user  with own documents shall see his documents also in chronicle
    // documents = await this.documentService.getPublicDocuments(this.name);
    documents = await this.documentService.getDocuments(this.name);
    if (documents?.length > 0) {
      // console.log(`number of documents: `, documents?.length);
      // sub directory and name because at scanned photos we have much with same date/time ...
      const sortElements: Array<ISortElement> = [{sortField: 'dateTimeOriginal', key: 'dateTimeOriginal'}, {sortField: 'documentSubDirectory', key: 'documentSubDirectory'}, {sortField: 'documentName', key: 'documentName'}];
      this.documents = documents
      .filter(_ => _.status < 9)
      .map(_ => {
          _.dateTimeOriginal = _.dateTimeOriginal ?? _.documentDate;
          return _;
        })
      .sort(GlobalFunctions.sortFields(sortElements));
    } else {
      this.filteredDocuments = [];
    }
  }

  /**
   * getEvent()
   *  delivers all event with type actual
   */
  private getEvent() {
    let event: Array<CalendarEvent>;
    event = this.calendarService.getEvents(this.name);
    if (event?.length > 0) {
      // console.log(`number of documents: `, documents?.length);
      const sortElements: Array<ISortElement> = [{sortField: 'eventBegin', key: 'eventBegin'}, {sortField: 'eventEnd', key: 'eventEnd', order: 'desc'}];
      this.event = event
      .sort(GlobalFunctions.sortFields(sortElements));
    } else {
      this.filteredEvents = [];
    }
  }

  private filterDocuments() {
    if (this.documents?.length > 0) {
      this.filteredDocuments = this.documents.filter(_ => {
        // would not be necessary - dateTimeOriginal is already mapped at getDocuments()
        const documentDate = _.dateTimeOriginal ?? _.documentDate;
        return (this.isDocumentsSelected
        && (!this.dateFrom || this.dateFrom.getTime() < documentDate?.getTime() )
        && (!this.dateTo || this.dateTo.getTime() > documentDate?.getTime() )
        && (this.categoryChoices[0].isSelected
          || (this.categoryChoices[this.categoryChoices.length -1].isSelected && !_.documentCategory)
          || this.categoryChoices.filter(cat => cat.isSelected && _.documentCategory === Number(cat.value)).length > 0)
        );
      });
    }
    if (this.filteredDocuments?.filter(_ => _.documentId === this.document?.documentId)?.length > 0) {
      // document has remained in list ...
    } else {
      this.document = DocumentFactory.empty();
    }
  }

  private filterEvent() {
    if (this.event?.length > 0) {
      this.filteredEvents = this.event.filter(_ => {
        return ((this.elementChoices.find(_ => _.value === 'W')?.isSelected
        || this.elementChoices.find(_ => _.value === '0')?.isSelected)
        &&  (!this.dateFrom || this.dateFrom.getTime() < _.eventEnd?.getTime() )
        && (!this.dateTo || this.dateTo.getTime() > _.eventBegin?.getTime() )
        // filter only actual event and timespans which are not holidays and birthdays ...
        // (holidays and birthdays are built from localStore for each user - we filter incorrect imported or manipulated data ...)
        && (_.type === EventType.actual || (_.type >= EventType.timeSpanCategory3 && _.type <= EventType.timeSpanCategory9))
        && _.status < 9
        );
      });
    }
  }


  /**
   * getDocumentContent()
   *  fetch content and calculate width
   *  (we proceed this also if images entry already exists - document.imageWidth could  be changed by another user ...)
   *  stores content from document directory in images key/value structure
   * @param document: element of documents database for whichwe get content
   */
  private async getDocumentContent(document: DocumentElement) {
    // first we check if we shoul load image from file content
    if (document.documentDirectory && document.documentDirectory !== '' && !this.images[document.documentId]) {
      const isGetThumbnail = false;
      // TODO content must come from immich service

      const documentString = '';
      // const documentString = this.documentService.getDocumentFileContent( document, isGetThumbnail, this.name);

      if (documentString !== '') {
        // first we have no width.
        this.images[document.documentId] = {content: documentString, width: undefined};
      }
    }
    // anyway we recalculate width ,,,
    this.calcImageWidth(document);
    this.calcThumbnailWidth(document);
  }

  private calcImageWidth(document: DocumentElement) {
    if (this.images[document.documentId] && this.images[document.documentId]?.content !== '') {
      let width =  parseInt(document.imageWidth);
      if (width > 0) {
        // we calculate width indepentent of existing of stored thumbnail
        this.images[document.documentId].width = width > 600 ? (600 + width/10) : width;
      } else {
        // if no width we let browser do ...
        this.images[document.documentId].width = undefined;
      }
    }
  }


  private calcThumbnailWidth(document: DocumentElement) {
    if (this.thumbnails[document.documentId]) {
      let width =  parseInt(document.imageWidth);
      if (width > 0) {
        // we calculate thumbnailWidth indepentent of existing of stored thumbnail
        this.thumbnails[document.documentId].width = width > THUMBNAIL_WIDTH - 10 ? (THUMBNAIL_WIDTH - 10 + width/100) : width;
      } else {
        this.thumbnails[document.documentId].width = THUMBNAIL_WIDTH;
      }
    }
  }

  /**
   * showPopup()
   * // TODO not appropriate here - could be shown outsie viewport ...
   * @param header header text
   * @param isPositiveConfirmed if is false, color changes from green to red
   * @param confirm text we show to confirm
   * @param content detail text
   * @param duration in milliseconds
   */
  private showPopup(header: string, isPositiveConfirmed?: boolean, confirm?: string, content?: string, duration?: number)  {
    if (!duration || isNaN(duration)) {
      duration = 2000;
    }
    this.popupHeaderText = header;
    if (content) {
      this.popupContentText = content;
    } else {
      this.popupContentText = '';
    }
    if (!isPositiveConfirmed) {
      this.popupConfirmClass = this.popupConfirmClass.replace('green', 'red');
    } else {
      this.popupConfirmClass = this.popupConfirmClass.replace('red', 'green');
    }
    if (confirm) {
      this.popupConfirmText = confirm;
    } else {
      this.popupConfirmText = '';
    }
    // this.popupClass = this.popupClass.replace('hidden', 'visible');
    this.popupSignal.set(1);
    setTimeout(() => {
      this.popupSignal.set(0);
      // this.popupClass = this.popupClass.replace('visible', 'hidden');
    }, duration);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // console.log(event.target.innerWidth);
    this.windowHeight = event.target.innerHeight;
  }

  // we do not need check of state - we prevent back button handling via canDeactivate guard
  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    this.message.info(this.name + ': host listener recognizes back button');
    // console.log('host listener recognizes back button', 'event: ',  event);
  } 

  @HostListener('touchstart', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  handleTouch(event: any) {
    let touch = event.touches[0] || event.changedTouches[0];
    // check the events
    if (event.type === 'touchstart') {
      this.defaultTouch.x = touch.pageX;
      this.defaultTouch.y = touch.pageY;
      this.defaultTouch.time = event.timeStamp;
    } else if (event.type === 'touchend') {
      let deltaX = touch.pageX - this.defaultTouch.x;
      let deltaY = touch.pageY - this.defaultTouch.y;
      let deltaTime = event.timeStamp - this.defaultTouch.time;

      // swipe -> less than 500 ms and more than 60 px
      if (deltaTime < 500) {
        if (this.showDocumentCounterSignal() > 0) {
          this.showDocumentCounterSignal.set(this.showDocumentCounterSignal() + 1);
        }
        // touch movement lasted less than 500 ms
        if (Math.abs(deltaX) > 60) {
          // delta x is at least 60 pixels
          if (deltaX > 0) {
            this.doSwipeRight(event);
          } else {
            this.doSwipeLeft(event);
          }
        }

        if (Math.abs(deltaY) > 60) {
          // delta y is at least 60 pixels
          if (deltaY > 0) {
            this.doSwipeDown(event);
          } else {
            this.doSwipeUp(event);
          }
        }
      }
    }
  }

  async doSwipeLeft(event: any) {
    // console.log('swipe left', event);
    await this.nextDocument();
  }

  async doSwipeRight(event: any) {
    // console.log('swipe right', event);
    await this.previousDocument();
  }

  doSwipeUp(event: any) {
    // console.log('swipe up', event);
  }

  doSwipeDown(event: any) {
    // console.log('swipe down', event);
  }
  


  /** --------------------------  public methods -------------------------------------------- */

   // guard to prevent leaving this component (by back button,...)
  public canDeactivate(): Observable<boolean> | boolean {
    if (this.showDocumentCounterSignal() === 0) {
      return true; // we do not show a document - any navigation is allowed ...
    } else {
      this.showDocumentCounterSignal.set(0); // we close document image showing ...
      return false;
    }
  }
  
  public setElements(event: any) {
    this.elementChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.isDocumentsSelected = (this.elementChoices.find(_ => _.value === 'D')?.isSelected
        || this.elementChoices.find(_ => _.value === '0')?.isSelected) ?? false;
    // we do not show events - we reset user eventday
    if (this.elementChoices.find(_ => _.value === 'D')?.isSelected) {
      const session = this.auth.getSession(this.name);
      if (session) {
        this.userService.setUserCalendarDay(session.userId, null, this.name);
      }
    }
    this.filterElements();
  }

  // user has pressed "show event" button
  public showSearched(event: CalendarEvent) {
    const ix = this.filteredEvents.findIndex(_ => _.eventId === event.eventId);
    if (ix >= 0) {
      const session = this.auth.getSession(this.name);
      if (session) {
        this.userService.setUserCalendarDay(session.userId, GlobalFunctions.getStartOfDay(event.eventBegin), this.name);
      }
      this.filterElements();
    }
  }


  public selectCategory(event: any) {
    this.selectedCategorys = [];
    // all was not set and is now set
    if (Number(event.target.value) === 0 && event.target.checked) {
      this.initChoices(true);
    } else {
      this.categoryChoices.forEach(_ => {
        if (Number(_.value) === Number(event.target.value)) {
          if (event.target.checked) {
          _.isSelected = true;
          } else {
            _.isSelected = false;
          }
        }
      });
      this.categoryChoices[0].isSelected = false;
    }
    // no category is selected, we init with all
    if (this.categoryChoices.filter(_ => _.isSelected).length === 0) {
      this.initChoices(true);
    }
    this.selectedCategorys = this.categoryChoices.filter(_ => _.isSelected).map(_ => _.text);
    this.filterElements();
  }

  public toggleCategoryMenu() {
    this.isShowDropdown = !this.isShowDropdown;
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


  public setDateFromEntered(dateString: string) {
    this.isDateFromEntered = dateString !== '' ? true : false;
  }

  public setDateFrom(dateString: string) {
    let dateFrom = GlobalFunctions.parseDMYtoDate(dateString);
    if (dateFrom && (!this.dateTo || this.dateTo?.getTime() > dateFrom.getTime())) {
      this.dateFrom = dateFrom;
    } else {
      this.dateFrom = new Date();
    }
    if (this.dateFrom) {
      const session = this.auth.getSession(this.name);
      if (session) {
        const user = this.auth.getUser(session.userId, this.name);
        if (user?.calendarDay && user.calendarDay.getTime() < this.dateFrom.getTime()) {
          this.userService.setUserCalendarDay(session.userId, null, this.name);
        }
      } 
    }
    this.filterElements();
    this.isDateFromEntered = false;
  }

  public setDateToEntered(dateString: string) {
    this.isDateToEntered = dateString !== '' ? true : false;
  }

  public setDateTo(dateString: string) {
    let dateTo = GlobalFunctions.parseDMYtoDate(dateString);
    if (dateTo && dateString.length === 4) {
      dateTo = GlobalFunctions.addYears(dateTo, 1);
      dateTo = GlobalFunctions.addDays(dateTo, -1);
    }
    if (dateTo && (!this.dateFrom || dateTo.getTime() > this.dateFrom?.getTime())) {
      this.dateTo = dateTo;
    } else {
      this.dateTo = new Date();
    }
    if (this.dateTo) {
      const session = this.auth.getSession(this.name);
      if (session) {
        const user = this.auth.getUser(session.userId, this.name);
        if (user?.calendarDay && user.calendarDay.getTime() > this.dateTo.getTime() + 24*60*60*1000) {
          this.userService.setUserCalendarDay(session.userId, null, this.name);
        }
      }
      
    }
    this.filterElements();
    this.isDateToEntered = false;
  }

  public closePopUp() {
    // this.popupClass = this.popupClass.replace('visible', 'hidden');
    this.popupSignal.set(0);
  }

  /** ----------------------- ------- chronicle-years-view ------------------------- */


  // fetch thumbnails for filtered documents (if thumbnail is already in key/value structure, there is no need to fetch again...)
  public async getFilteredThumbnails(ids: Array<number>) {
    // this.isThumbnailsLoaded = false;
    if (ids?.length > 0) {
      for await (const id of ids) {
        const document = this.documents.find(_ => _.documentId === id);
        // first we check if we should load thumbnail from file content
        if (document?.thumbnailDirectory && document?.thumbnailDirectory !== '' && !this.thumbnails[id]) {
          const isGetThumbnail = true;
          
          // TODO
          const documentString = '';
          
          //const documentString = await this.documentService.getDocumentFileContent(document, isGetThumbnail, this.name);
          if (documentString !== '') {
            // first we have no width.
            this.thumbnails[id] = {content: documentString, width: undefined};
            this.calcThumbnailWidth(document);
          }
        }
        // we load document content to build thumbnail if no thumbnail content is available
        if (document && !this.thumbnails[id]) {
          // thumbnail width wil be calculated in getDocumentContent()
          this.thumbnails[id] = {content: '', width: undefined};
          await this.getDocumentContent(document);
        }
      }
    }

  }

  // show of document is triggered from a view
  public async showDocument(id: number) {
    this.isPreviousDocument = false;
    this.isNextDocument = false;
    this.previousSubdirectory = '';
    this.nextSubdirectory = '';
    const document = this.documents.find(_ => _.documentId === id);
    if (document) {
      this.document = document;
      // getting content anyway - at least to recalc width
      await this.getDocumentContent(this.document);
      if (this.images[this.document.documentId]?.content) {
        const ix = this.filteredDocuments.findIndex(_ => _.documentId === this.document.documentId)
        if (ix > 0) {
          // we show previous document if same day or same sub dir
          if (GlobalFunctions.getStartOfDay(this.filteredDocuments[ix - 1].dateTimeOriginal)?.getTime() >= GlobalFunctions.getStartOfDay(this.document.dateTimeOriginal)?.getTime()
          || this.filteredDocuments[ix - 1].documentSubDirectory === this.document.documentSubDirectory) {
            this.isPreviousDocument = true;
          } else {
            this.previousSubdirectory = this.filteredDocuments[ix - 1].documentSubDirectory;
          }
        }
        if (ix >= 0 && ix < this.documents.length - 1) {
          if (GlobalFunctions.getStartOfDay(this.filteredDocuments[ix + 1].dateTimeOriginal)?.getTime() <= GlobalFunctions.getEndOfDay(this.document.dateTimeOriginal)?.getTime()
          || this.filteredDocuments[ix + 1].documentSubDirectory === this.document.documentSubDirectory) {
            this.isNextDocument = true;
          } else {
            this.nextSubdirectory = this.filteredDocuments[ix + 1].documentSubDirectory;
          }
        }
      } else {
        // poUp will not be visible because because of scrolling ...
        this.showPopup(this.auth.txt['image'] + ' ' +  this.auth.txt['not_found']);
        // WE log and show user message also ...
        const message = this.auth.txt['image'] + ' ' +  this.auth.txt['not_found'];
        this.logger.error(this.auth.getSession(this.name), this.name, this.auth.txt['system_error'] + `: ${message}`);
        this.message.show(`${this.name}: `  + this.auth.txt['system_error'] + `: ${message}`);
      }
      const duration = 100;
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, duration);
      this.showDocumentCounterSignal.set(this.showDocumentCounterSignal() + 1);
      this.showDocumentDetailsSignal.set(0);
      this.showMapSignal.set(0);
    }
  }

  public hideDocument(counter?: number) {

    if (counter === undefined) {
      this.showDocumentCounterSignal.set(0);
    } else if (counter === this.showDocumentCounterSignal()) {
      // if there was no swipe event between ...
      if (confirm(this.auth.txt['leave_display'] + '?')) {
        this.showDocumentCounterSignal.set(0);
      }
    }
  }

  public showDocumentDetails() {
    this.showDocumentDetailsSignal.set(1);
  }

  public showMap() {
    const location = GlobalFunctions.getLocation(this.document?.imageLocation);
    const [lat, long, alt] = location;
    if (lat === 0 && long === 0 && alt === 0) {
      this.showMapSignal.set(0);
    } else {
      // for debugging position algorithm: this.mapMarkers = [location, [48, 16], [48.5, 17]];
      const tooltip = formatDate(this.document.dateTimeOriginal, 'EEE d.MM.yyyy HH:mm', this.locale);
      this.mapMarkers = [{marker: location, tooltip}];
      this.mapCenter = GlobalFunctions.getMapCenter(this.mapMarkers);
      this.showMapSignal.set(1);
    }
  }

  public async previousDocument() {
    const ix = this.filteredDocuments.findIndex(_ => _.documentId === this.document.documentId);
    if (ix > 0) {
      if (this.isPreviousDocument) {
        await this.showDocument(this.filteredDocuments[ix - 1].documentId);
      } else if (confirm(this.auth.txt['switch_to'] + ' ' + this.previousSubdirectory + '?')) {
        await this.showDocument(this.filteredDocuments[ix - 1].documentId);
      }
    }
  }

  public async nextDocument() {
    const ix = this.filteredDocuments.findIndex(_ => _.documentId === this.document.documentId);
    if (ix >= 0 && ix < this.documents.length - 1) {
      if (this.isNextDocument) {
        await this.showDocument(this.filteredDocuments[ix + 1].documentId);
      } else if (confirm(this.auth.txt['switch_to'] + ' ' + this.nextSubdirectory + '?')) {
        await this.showDocument(this.filteredDocuments[ix + 1].documentId);
      }
    }
  }


  public async showEvent(event: CalendarEvent) {

    if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    const session = this.auth.getSession(this.name);
    if (session?.app === App.local) {
      // TODO we call calendar-day-card-form with type=show as sub-somponent
      this.router.navigate([`../localShowEvent`, `${event.eventId}`], { relativeTo: this.route.parent});
    }
  }

}

