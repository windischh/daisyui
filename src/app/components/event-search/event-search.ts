import { Component, OnInit, EventEmitter, Output, Input, HostListener } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';

import { Event } from '../../_db/event';

import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { CalendarService } from '../../_services/calendar.service';


@Component({
  selector: 'dsy-event-search',
  templateUrl: './event-search.html',
  styleUrl: './event-search.css',
  imports: [NgClass, DatePipe]
})
export class EventSearchComponent implements OnInit {

  public name = 'EventSearchComponent';

  @Input({required: true}) isAllEvents!: boolean;
  // events - are necessary if isAllEvents is false
  @Input() events: Event[] = [];

  isLoading = false;
  foundEvents: Array<Event> = [];
  text: string = '';

  @Output() eventSelected = new EventEmitter<Event>();


  constructor(
    private eventService: CalendarService,
    private message: MessageService,
    public auth: AuthenticationService) { }

  ngOnInit() {
  }

  findEvents(searchTerm: string) {
    this.text = searchTerm;
    let events!: Array<Event>;
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

  selectEvent(event: Event) {
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