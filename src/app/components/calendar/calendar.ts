import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'dsy-calendar',
  imports: [],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarComponent {

  public name = 'CalendarComponent';

	@Input({required: true}) calendarLoadCounter!: number;
  @Input({required: true}) isShowEvent!: boolean;
  @Input({required: true}) eventId: number | undefined;

  @Output() restart = new EventEmitter();

  

}
