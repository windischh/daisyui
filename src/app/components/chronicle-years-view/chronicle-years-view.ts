import { Component, EventEmitter, Input, Output, SimpleChange, HostListener, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';

import { GAINSBORO, LIGHT_GREEN, LIGHT_GREY, WHITE_SMOKE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';

import { DocumentElement } from '../../_db/document';
import { Session } from '../../_db/session';
import { CalendarEvent } from '../../_db/calendar-event';
import { ConfigurationOption } from '../../_db/configuration-option';

import { IChronicleElement } from '../../_interfaces/i-chronicle-element';
import { ISortElement } from '../../_interfaces/i-sort-element';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';

import { UserService } from '../../_services/user.service';

import { PaginatorComponent } from '../paginator/paginator';
import { ChronicleMonthViewComponent } from '../chronicle-month-view/chronicle-month-view';
import { EventType } from '../../_enums/event-type.enum';


@Component({
  selector: 'dsy-chronicle-years-view',
  templateUrl: './chronicle-years-view.html',
  styleUrl: './chronicle-years-view.css',
  imports: [PaginatorComponent, FormsModule, DatePipe, NgTemplateOutlet, ChronicleMonthViewComponent]
})
export class ChronicleYearsViewComponent {

  public name = 'ChronicleYearsViewComponent';

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) yearElements!: Array<IChronicleElement>;

  @Input({required: true}) document!: DocumentElement;
  @Input({required: true}) documents!: Array<DocumentElement>;
  @Input({required: true}) event!: Array<CalendarEvent>;
  @Input({required: true}) isShowDocument!: boolean;

  @Input({required: true}) thumbnails!: { [key: number]: {content: string, width: number | undefined} };
  @Input({required: true}) images!: { [key: number]: {content: string, width: number | undefined} };

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) documenttxt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  // document category values and names
  @Input({required: true}) documentCategorys!: {[key: string]: string}

  // activate thumbnails when a month is shown ...
  @Output() documentsShown = new EventEmitter<Array<number>>();
  // activate image for a document which is shown ...
  @Output() documentShow = new EventEmitter<number>();
  // activate calendar for a event which is shown ...
  @Output() eventShow = new EventEmitter<CalendarEvent>();

  @Input({required: true}) options!: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts!: IUserEventOptions;

  // show signal triggers change detection
  public showSignal = signal(0);

  // we have a paginator - we show documents according to limit
  shownElements!: Array<IChronicleElement>;

  // variables for paginator
  total!: number; // total number of items
  names!: Array<string> // optional - names of each record, length must be 0 or === total
  abbrPlaces = 20; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page

  // header button (year, month) can be selected
  headerStyle = {'background-color': GAINSBORO};
  headerSelectedStyle = {'background-color': LIGHT_GREEN};

  // default sort direction: ascending YYYY MM
  sortDirection = 1;

  constructor(
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    // console.log('chronicle-years-view init');
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {
      // we build a new view based on year elements
      if (propKey === 'yearElements') {
        // console.log('propkey: ', propKey);
        // console.log('yearElelemnts: ', this.yearElements);
        this.sortElements();
      }
    }
  }

  private sortElements() {

    if (this.yearElements?.length > 0) {
      /* test the paginator
      for (let ix = 0; ix < 5; ix++) {
        Array.prototype.push.apply(this.filteredDocuments, this.filteredCDocuments);
      }
      */

      /*
      // LATER elements can be sorted date ascending or descending
      // must be done via intermediate allYearsElements
      const sortFields: Array<ISortElement> = this.sortDirection === 1 ? [{sortField: 'year', key: 'year'}]: [];
      
      // sort according to options
      this-aööYearsEleemts = this.yearElements.sort(GlobalFunctions.sortFields(sortFields));

      */
      
      // paginator - this paginator has names
      // we must reset selectedPage - filter can have been changed ...
      this.selectedPage = 1;
      this.names = this.yearElements.map(_ => (
         _.year.toString() + '_' + _.month.toString())); // without nr if we sort on names ....
      // paginator - set total records - after setting names, total triggers paginator refresh
      this.total = this.yearElements.length;
      if (this.total > 50) {
        this.limit = 10;
      } else if (this.total > 10) {
        this.limit = 5;
      } else {
        this.limit = 3;
      }
      // we select page if at new initialized chronicle component we have a selected eventDay
      const yearIx = this.yearElements.findIndex(_ => _.subElements?.filter(quarter => quarter.subElements?.filter(month => month.subElements?.filter(day => day.eventsCount === -1).length > 0).length > 0).length > 0);
      if (yearIx >= 0) {
        this.selectedPage = 1 + (yearIx - yearIx % this.limit) / this.limit;
      }
      this.shownElements = this.yearElements?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    } else {
      this.shownElements = [];
      this.total = 0;
    }
    this.showSignal.set(this.showSignal() + 1);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // console.log(event.target.innerWidth);
    this.windowWidth = event.target.innerWidth;
  }

  /** --------------------------  public methods -------------------------------------------- */


  // paginator - set params for actual page
  public onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // this.pageSelected.emit(pageNumber);
    // update content to view new page content
    this.shownElements = this.yearElements?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    this.showSignal.set(this.showSignal() + 1);
  }

  public sort(direction: number): void {
    this.sortDirection = direction;
    this.sortElements();
  }

  // user has selected one year, i is index of yearElements
  public toggleShowYear(i: number) {
    this.shownElements[i].isElementShown = !this.shownElements[i].isElementShown;
    this.showSignal.set(this.showSignal() + 1);
  }

  // user has selected one month - we show documents and events in detail
  public toggleShowMonth(yearIx: number, quarterIx: number, monthIx: number) {
    // month element is toggled show/not show
    this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].isElementShown = !this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].isElementShown;
    let isOneOfMonthsShown = false;
    for (const el of this.shownElements[yearIx].subElements[quarterIx].subElements) {
      if (el.isElementShown) {
        isOneOfMonthsShown = true;
      }
    }
    // if at least 1 month is shown, we  do not show quarter
    this.shownElements[yearIx].subElements[quarterIx].isElementShown = !isOneOfMonthsShown;

    if (this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].isElementShown) {
      let firstDay: Date | undefined;
      let shownDocuments = this.documents.filter(_ => {
        const documentDate = _.dateTimeOriginal ?? _.documentDate;
        const documentYearMonth  = GlobalFunctions.getYM(documentDate);
        const selectedYearMonth = this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].year * 100 + this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].month;
        return documentYearMonth  === selectedYearMonth;
      });
      let sortElements: Array<ISortElement> = [{sortField: 'dateTimeOriginal', key: 'dateTimeOriginal'}]
      if (shownDocuments?.length > 0) {
        // we set irst day
        shownDocuments = shownDocuments
        .map(_ => {
          _.dateTimeOriginal = _.dateTimeOriginal ?? _.documentDate;
          return _;
        })
        .sort(GlobalFunctions.sortFields(sortElements));
        firstDay = shownDocuments[0].dateTimeOriginal;
        // then we assure thumbnails
        // we build array of ids for the shown documents
        const ids = shownDocuments.reduce((acc: Array<number>, _) => acc.concat(_.documentId), []);
        this.documentsShown.emit(ids);
      }
      sortElements = [{sortField: 'deventBegin', key: 'eventBegin'}]
      if (this.event?.length > 0) {
        const startMonth = new Date(this.shownElements[yearIx].year, this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].month -1, 1);
        const endMonth = new Date(this.shownElements[yearIx].year, this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].month, 1);
        let monthEvents = this.event.filter(_ => GlobalFunctions.getYM(_.eventBegin) === this.shownElements[yearIx].year * 100 + this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].month);
        const timeSpans = this.event.filter(_ => GlobalFunctions.getDateInMinutes(_.eventEnd) >= GlobalFunctions.getDateInMinutes(startMonth)
          && GlobalFunctions.getDateInMinutes(_.eventBegin) <= GlobalFunctions.getDateInMinutes(endMonth)
          && _.type >= EventType.timeSpanUndefined
          && _.type <= EventType.timeSpanCategory9);
        monthEvents = monthEvents.concat(timeSpans)
        .sort(GlobalFunctions.sortFields(sortElements));
        let firstEventDay: Date;
        if (monthEvents?.length > 0) {
          firstEventDay = monthEvents[0].eventBegin;
          if (GlobalFunctions.getDateInMinutes(firstEventDay) < GlobalFunctions.getDateInMinutes(startMonth)) {
            firstEventDay = startMonth;
          }
          if (!firstDay || (firstDay && GlobalFunctions.getDateInMinutes(firstEventDay) <  GlobalFunctions.getDateInMinutes(firstDay))) {
            firstDay = firstEventDay;
          }
        }
      }  
      if (firstDay) {
        this.userService.setUserCalendarDay(this.session.userId, GlobalFunctions.getStartOfDay(firstDay), this.name);
      }
    }
    // we recalculate paginator limit
    let monthsShown = 0;
    this.shownElements.forEach(_ => _.subElements?.forEach(quarter => quarter.subElements?.forEach(month => monthsShown += month.isElementShown ? 1 : 0)));
    let newLimit = 0;
    if (monthsShown > 6) {
      if (this.total > 50) {
        newLimit = 5;
      } else {
        newLimit = 3;
      }
    }
    // we do not set back if less than 4 months are shown ...
    /*
    else  {
      if (this.total > 10) {
        newLimit = 5;
      } else if (this.total > 5) {
        newLimit = 3;
      } else {
        newLimit = 1;
      }
    }
    */
    if (newLimit > 0 && this.limit !== newLimit) {
      this.limit = newLimit;
      // we select page 
      const shownYearIx = this.yearElements.findIndex(_ => _.year === this.shownElements[yearIx].year);
      if (shownYearIx >= 0) {
        this.selectedPage = 1 + (shownYearIx  - shownYearIx % this.limit) / this.limit;
        this.shownElements = this.yearElements?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
      }
    }
    this.showSignal.set(this.showSignal() + 1);
  }

  /** ------------------------------ chronicle-month-view  ------------------------- */

  public showDay(yearMonthDay: [number, number, number]) {
    const [year, month, day] = yearMonthDay;
    if (day >= 0) {
      const yearIx = this.shownElements.findIndex(_ => _.year === year);
      if (yearIx >= 0) {
        const quarter =  (month-1 - (month-1) % 3) / 3 + 1;
        const quarterIx = this.shownElements[yearIx].subElements?.findIndex(_ => _.quarter === quarter);
        if (quarterIx >= 0)  {
          const monthIx = this.shownElements[yearIx].subElements[quarterIx].subElements?.findIndex(_ => _.month ===  month);
          if (monthIx >= 0)  {
            const dayIx = this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements?.findIndex(_ => _.day ===  day);
            if (dayIx >= 0)  {
              this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements[dayIx].isElementShown = 
              !this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements[dayIx].isElementShown;
            } else {
              if (this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements?.length > 0) {
                // there are days ..
              } else {
                this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements = [];
              }
              this.shownElements[yearIx].subElements[quarterIx].subElements[monthIx].subElements.push({
                year,
                quarter,
                month,
                day,
                // we do not need counts in the moment ...
                documentsCount: 0,
                eventsCount: 0,
                isElementShown: true,
                subElements: []
              });
            }
          }
        }
      }
    }
  }

  // user has clicked on an image
  public showDocument(id: number) {
    if (id >= 0) this.documentShow.emit(id);
  }

  // user has clicked on an event
  public showEvent(event: CalendarEvent) {
    if (event.eventId >= 0) this.eventShow.emit(event);
  }

}


