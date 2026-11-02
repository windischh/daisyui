import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { DatePipe,  formatDate, NgStyle, SlicePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { DAISY_COLOR_BASE_300, MAX_CONTACT_NR, WHITE_SMOKE } from '../../_globals/constants';

import { IEventOptions } from '../../_interfaces/i-event-options';
import { Event } from '../../_db/event';
import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';

class EventExtended extends Event {contactSortNr!: number; eventDurationDisplay!: string; style!: {}};
@Component({
  selector: 'dsy-calendar-day-contacts-view',
  templateUrl: './calendar-day-contacts-view.html',
  styleUrl: './calendar-day-contacts-view.css',
  imports: [NgStyle, SlicePipe, DatePipe]
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
  @Input({required: true}) calendarDayChangeCounter!: number;

  // contact and issue which are selected for event entry
  @Input({required: true}) sessionContact!: Contact | undefined;

  MAX_CONTACT_NR = MAX_CONTACT_NR;

  eventsFiltered!: Array<EventExtended>;

  isContacts = false;

  otherDayStyle = {
    'background-color': DAISY_COLOR_BASE_300
  };

  @Output() contactSelected = new EventEmitter<number>();

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'session' || propKey === 'actualEvents' || propKey === 'planEvents'  
        || propKey === 'opts' ||  propKey === 'calendarDayChangeCounter' ||  propKey === 'sessionContact') {
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
    this.eventsFiltered = [];
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
              this.isContacts = event.contactNr > 0;
              return {...event, contactSortNr: event.contactNr > 0 ? event.contactNr  : MAX_CONTACT_NR,  
                eventDurationDisplay: '', style: {}};
            });
        }
      }
      // sort by date, contactNr, issueNr
      if (this.eventsFiltered?.length > 0) {
        this.eventsFiltered.sort((a: EventExtended, b: EventExtended) => {
          if (a.contactSortNr > b.contactSortNr) {return 1000; }
          if (a.contactSortNr < b.contactSortNr) {return -1000; }
          if (a.eventBegin > b.eventBegin ) {return 10; }
          if (a.eventBegin < b.eventBegin) {return -10; }
          return 0;
        });
        // suppress date if equal date before, also contactNr
        for (let ix = 0; ix < this.eventsFiltered.length; ix++) {
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
    } 
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setContactBgColorStyle (contactColor: string) {
    return StyleFactory.getBgColorStyle(contactColor, 0);
  }

  public setContact(contactNr: number) {
    this.contactSelected.emit(contactNr);
  }

}


