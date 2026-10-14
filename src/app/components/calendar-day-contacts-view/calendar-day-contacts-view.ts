import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { DatePipe, DecimalPipe, formatDate, NgStyle, SlicePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { MAX_CONTACT_NR, WHITE_SMOKE } from '../../_globals/constants';

import { IEventOptions } from '../../_interfaces/i-event-options';
import { Event } from '../../_db/event';
import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';

class EventExtended extends Event {contactDisplayNr!: string; eventBeginDisplay!: string; timeDisplay!: string; eventDurationDisplay!: string; style!: {}};
@Component({
  selector: 'dsy-calendar-day-contacts-view',
  templateUrl: './calendar-day-contacts-view.html',
  styleUrl: './calendar-day-contacts-view.css',
  imports: [NgStyle, SlicePipe, DatePipe, DecimalPipe]
})
export class CalendarDayContactsViewComponent implements OnInit {

  public name = 'CalendarDayContactsViewComponent';

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };
  @Input({required: true}) contacttxt!: { [key: string]: string };

  @Input({required: true}) opts!: IEventOptions;

  @Input({required: true}) actualEvents!: Array<Event>;
  @Input({required: true}) planEvents!: Array<Event>;
  @Input({required: true}) eventsChangeCounter!: number;

  // contact and issue which are selected for event entry
  @Input({required: true}) sessionContact!: Contact | undefined;

  MAX_CONTACT_NR = MAX_CONTACT_NR;

  eventsFiltered!: Array<EventExtended>;

  otherDayStyle = {
    'background-color': WHITE_SMOKE
  };

  @Output() contactSelected = new EventEmitter<number>();

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'session' || propKey === 'actualEvents' || propKey === 'planEvents'  || propKey === 'opts' ||  propKey === 'eventsChangeCounter') {
        this.filterEvents();
      }
      // console.log('event-day-orders propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
  }

  /**
   * the component shows all event of actual week
   *
   * (style and date display suppress are prepared to show more than calendarDay ....)
   *
   */
  private filterEvents() {

    if (this.session) {
      const events = this.session.isPlan ? this.planEvents : this.actualEvents;
      if (events?.length > 0) {
        // we take all events for week of calendarDay - we check again, but planEvents and actualevents are usually  prepared for this week already ..
        // weekDay is day (0 - 6) of selected calendarDay
        const calendarDay = GlobalFunctions.getWeekDay(this.session.calendarDay, 0, this.locale);
        if (calendarDay) {
          // weekBegin is the date of first day of week
          const eventBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.calendarDay), -1 * calendarDay);
          const nextWeekBegin = GlobalFunctions.addDays(eventBegin, 7);
          this.eventsFiltered = events.filter(_ =>
            GlobalFunctions.isMinuteSameOrEarlier(eventBegin, _.eventBegin)
            && GlobalFunctions.isMinuteEarlier(_.eventBegin, nextWeekBegin)
            && ( (this.session.isPlan && _.type === 0)
            || (!this.session.isPlan && _.type === 1) ))
            .map((event)  => {
              // TODO not more necessary ..
              return {...event, contactDisplayNr: MAX_CONTACT_NR.toString(),  eventBeginDisplay: '', timeDisplay: '', eventDurationDisplay: '', style: {}};
            });
          
          for (const event of this.eventsFiltered) {
            // TODO not needed - we sue date pipe instead
            event.eventBeginDisplay = formatDate(GlobalFunctions.getStartOfDay(event.eventBegin), 'd.MM.yyyy', this.locale);
            event.timeDisplay = formatDate(event.eventBegin, 'HH:mm', this.locale);
            // get contact, issue via eventInfo
            if (event.contactNr > 0) {
              event.contactDisplayNr = event.eventInfo?.contactDisplayNr ?? '';
            }
          }
        }
      }
      // sort by date, contactNr, issueNr
      if (this.eventsFiltered?.length > 0) {
        this.eventsFiltered.sort((a: EventExtended, b: EventExtended) => {
          if (a['contactDisplayNr'] > b['contactDisplayNr']) {return 1000; }
          if (a['contactDisplayNr'] < b['contactDisplayNr']) {return -1000; }
          if (a['eventBeginDisplay'] > b['eventBeginDisplay'] ) {return 10; }
          if (a['eventBeginDisplay'] < b['eventBeginDisplay'] ) {return -10; }
          if (a['timeDisplay'] > b['timeDisplay'] ) {return 1; }
          if (a['timeDisplay'] < b['timeDisplay'] ) {return -1; }
          return 0;
        });
        // suppress date if equal date before, also contactNr
        for (let ix = 0; ix < this.eventsFiltered.length; ix++) {
          if (ix > 0 && this.eventsFiltered[ix]['contactDisplayNr']  === this.eventsFiltered[ix - 1]['contactDisplayNr'] ) {
              this.eventsFiltered[ix]['contactDisplayNr']  = '';
          }
          if (ix > 0 && GlobalFunctions.getYMD(this.eventsFiltered[ix].eventBegin) === GlobalFunctions.getYMD(this.eventsFiltered[ix - 1].eventBegin) ) {
            this.eventsFiltered[ix]['eventBeginDisplay'] = '';
          }
          const worked = this.eventsFiltered[ix].eventDuration;
          let eventDurationDisplay =  GlobalFunctions.minutesDisplay(worked);
          this.eventsFiltered[ix].eventDurationDisplay = eventDurationDisplay;
          if (GlobalFunctions.getYMD(this.eventsFiltered[ix].eventBegin)  === GlobalFunctions.getYMD(this.session.calendarDay) ) {
            this.eventsFiltered[ix]['style'] = {};
          } else {
            this.eventsFiltered[ix]['style'] = this.otherDayStyle;
          }
        }
      }
    } else {
      this.eventsFiltered = [];
    }
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setContactBgColorStyle (contactColor: string) {
    return StyleFactory.getBgColorStyle(contactColor, 0);
  }

  public setContact(contactId: number) {
    this.contactSelected.emit(contactId);
  }

}


