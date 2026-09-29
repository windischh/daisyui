import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { GlobalFunctions } from '../../_globals/global-functions';

import { Session } from '../../_db/session';
import { EventSelectOption } from '../../_db/event-select-option';

import { LocationType } from '../../_enums/location-type.enum';
import { App } from '../../_enums/app.enum';

import { IEventListElement } from '../../_interfaces/i-event-list-element';
import { NgStyle, SlicePipe, DatePipe } from '@angular/common';


@Component({
  selector: 'dsy-event-list-view',
  templateUrl: './event-list-view.html',
  styleUrl: './event-list-view.css',
  imports: [NgStyle, SlicePipe, DatePipe]
})
export class EventListViewComponent implements OnInit {

  public name = 'EventListViewComponent';

  @Input({required: true}) txt?: { [key: string]: string };
  @Input({required: true}) eventtxt: { [key: string]: string } = {};

  @Input({required: true}) session!: Session;
  @Input({required: true}) isShowUser!: boolean;
  @Input({required: true}) isShowLocationType!: boolean;
  @Input({required: true}) isLocationTypeGrouped!: boolean;
  @Input({required: true}) isEventIssueSelected!: boolean;
  @Input({required: true}) eventSelectOption!: EventSelectOption;

  @Input({required: true}) eventElements!: IEventListElement[];

  @Output() eventShow = new EventEmitter<IEventListElement>();

  locationTypeEnum: typeof LocationType = LocationType;

  App: typeof App = App;

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  constructor() { }

  ngOnInit(): void {
  }

  /** --------------------------  public methods -------------------------------------------- */

  show(eventElement: IEventListElement): void {
    this.eventShow.emit(eventElement);
  }

}
