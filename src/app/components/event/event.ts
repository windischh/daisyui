import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'dsy-event',
  imports: [],
  templateUrl: './event.html',
  styleUrl: './event.css',
})
export class EventComponent {

  public name = 'EventComponent';

	@Input({required: true}) eventLoadCounter!: number;
  @Input({required: true}) isShowEvent!: boolean;
  @Input({required: true}) eventId: number | undefined;

  @Output() restart = new EventEmitter();

  

}
