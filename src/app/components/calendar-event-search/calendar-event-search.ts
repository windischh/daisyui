import { Component, OnInit, EventEmitter, Output, Input, HostListener } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';

import { CalendarEvent } from '../../_db/calendar-event';

import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { CalendarService } from '../../_services/calendar.service';


@Component({
  selector: 'dsy-calendar-event-search',
  templateUrl: './calendar-event-search.html',
  styleUrl: './calendar-event-search.css',
  imports: [NgClass, DatePipe]
})
export class CalendarEventSearchComponent implements OnInit {

  public name = 'CalendarEventSearchComponent';

  @Input({required: true}) isAllEvents!: boolean;
  // events - are necessary if isAllEvents is false
  @Input() events: CalendarEvent[] = [];

  isLoading = false;
  foundEvents: Array<CalendarEvent> = [];
  text: string = '';

  @Output() eventSelected = new EventEmitter<CalendarEvent>();


  constructor(
    private eventService: CalendarService,
    private message: MessageService,
    public auth: AuthenticationService) { }

  ngOnInit() {
  }

  findEvents(searchTerm: string) {
    this.text = searchTerm;
    let events!: Array<CalendarEvent>;
    if (this.isAllEvents ) {
      events = this.eventService.searchEvents(searchTerm, this.name);
    } else {
      events = this.events?.filter(_ =>
      _.summary?.indexOf(searchTerm) >= 0
      || _.description?.indexOf(searchTerm) >= 0
      );
    }
    // we return first 50 events ....
    this.foundEvents = events.slice(0,50);
  }

  selectEvent(event: CalendarEvent) {
    this.eventSelected.emit(event);
    this.foundEvents = [];
  }

  // reset searchTerm in html when clicking outside of input field
  @HostListener('window:click', ['$event.target'])
  onClick(target: any) {
    if (target && (target.id === 'searchContent')
      ) {
        // console.log(`click id is`, target.id);
        // console.log(`parent id is`, target.parentElement.id);
      } else {
        // console.log(`You clicked on`, target);
        this.foundEvents = [];
      }
  }

}