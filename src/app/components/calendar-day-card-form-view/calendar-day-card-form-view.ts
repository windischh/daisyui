import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { formatDate, NgClass, NgTemplateOutlet, NgStyle, SlicePipe, DatePipe } from '@angular/common';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { MAX_MONTHS, MAX_INTERVAL_LENGTH, POWDER_BLUE } from '../../_globals/constants';

import { Event } from '../../_db/event';
import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';

import { ConfigurationOption } from '../../_db/configuration-option';

import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IChoice } from '../../_interfaces/i-choice';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { EventType } from '../../_enums/event-type.enum';


import { ErrorMessage } from '../../_validators/error-message';

import { IAngularMyDpOptions, IMyDate, IMyDateModel, IMyDateRange, IMyInputFieldChanged, AngularMyDatePickerDirective, AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { CalendarDayTimeChangeComponent } from '../calendar-day-time-change/calendar-day-time-change';
import { INumChoice } from '../../_interfaces/i-num-choice';



@Component({
  selector: 'dsy-calendar-day-card-form-view',
  templateUrl: './calendar-day-card-form-view.html',
  styleUrl: './calendar-day-card-form-view.css',
  imports: [FormsModule, ReactiveFormsModule, NgClass, AngularMyDatePickerModule, CalendarDayTimeChangeComponent, NgTemplateOutlet, NgStyle, DatePipe]
})
export class CalendarDayCardFormViewComponent implements OnInit {

  public name = 'CalendarDayCardFormViewComponent';

  @Input({required: true}) session!: Session;

  // we need locale for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) contacttxt!: { [key: string]: string };
  @Input({required: true}) issuetxt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  @Input({required: true}) timeSpans!: Array<Event>;

  @Input({required: true}) options!: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) opts!: IEventOptions;
  @Input({required: true}) userOpts!: IUserEventOptions;

  // contact and issue which are selected for event entry
  @Input({required: true}) sessionContact!: Contact | undefined;

  // eventContainer is the container (event itself,  date) for the event which is to be updated
  @Input({required: true}) eventContainer!: {updateType: UpdateType, event: Event, d: Date | null};

  @Input({required: true}) events!: Array<Event>;
  @Input({required: true}) eventsChangeCounter!: number;

  // if event is to be shifted to another date we use targetEvents and targetCalendarDay
  @Input({required: true}) targetEvents!: Array<Event> | null;
  @Input({required: true}) targetCalendarDay!: Date | null;

  // categories are type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeChoices!: Array<IChoice>;


  @Output() calendarDaySelected = new EventEmitter<Date>();
  @Output() timeSpanUpdate = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() eventUpdate = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() eventUpdateAssoc = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() cardFormCancel = new EventEmitter();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  EventType: typeof EventType = EventType;
  UpdateType: typeof UpdateType = UpdateType;

  // day of event - 00:00 in browser timezone
  // calendarDay comes first from opts
  calendarDay!: Date;
  calendarDayDisplay = '';
  dateString = '';

  // in case of time spans:
  beginDisplay = '';
  endDisplay = '';
  days!: number;

  isAfterToday = false;
  isContactInfo = false;

  // event contains a new event object (in case of insert) or cloned from eventContainer.event
  event!: Event;
  // if event is timeSpan, it may have a style
  style!: {};
  // cardFormEvents are surroundingevents on calendarDay (or targetCalendarDay, if choosen), built from this.events or this.targetEvents
  cardFormEvents!: Array<Event>;

  contactChoices!: Array<INumChoice>;
  // ixSet is the contactChoices array index of the element which is actually joined to event
  ixSet!: number;
  // isSelected is the contactChoices array index of the element which is shown as selected element
  ixSelected!: number;

  updateTypeEnum: typeof UpdateType = UpdateType;
  locationTypeEnum: typeof LocationType = LocationType;
  locationTypeChoices!: Array<IChoice>;

  // which time should be updated 1 begin, 2 end, 3 duration
  changeType!: number;

  thisForm!: FormGroup;
  errors: { [key: string]: string } = {};
  thisFormErrorMessages!: ErrorMessage[];

  // date picker configuration
  // ViewChild static (since angular 8) not necessary cause ngxdp not used at ngOnInit
  @ViewChild('dp') ngxdp!: AngularMyDatePickerDirective;
  public dpModel!: IMyDateModel;   // not initial date set
  public dpDisabled = false;
  public dpEndModel!: IMyDateModel;   // not initial date set
  public dpEndDisabled = false;

  // disabledRanges contains eventually disabled date ranges
  disabledRanges: Array<IMyDateRange>  = [];

  // dates for holidays are shown in red color
  highlightDates: Array<IMyDate>  = [];

  public myDatepickerOptions: IAngularMyDpOptions = {
    dateRange: false,
    dateFormat: 'dd.mm.yyyy',
    // showFooterToday, todayText => depends on new angular-mydatepicker release aug.2020
    todayTxt: '',
    showFooterToday: true,
    showWeekNumbers: true
  };

  public dateOpts!: IAngularMyDpOptions;
  public dateEndOpts!: IAngularMyDpOptions;

  constructor(private fb: FormBuilder) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit() {
    this.getEventParameters();
    this.setLocationTypeChoices();
    this.setContactChoices();
    const {updateType, event, d} = this.eventContainer;
    if (event.type < EventType.timeSpanUndefined) {
      // we assure that only events of this day, previous day, reaching to this day and first event of next day are in allEvents
      this.cardFormEvents = GlobalFunctions.buildEvents(this.events, this.calendarDay, true, true);
    }
    // console.log('event-container', this.eventContainer);
    switch (updateType) {
      case UpdateType.update:
        this.prepareUpdate(event);
        break;
      case UpdateType.insert:
        if (d) this.prepareInsert(event, d);
        break;
    }
    this.loadErrorMessages();
    this.initThisForm();
    this.positionViewport();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isNewTarget = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'events') {
        const {updateType, event, d} = this.eventContainer;
        if (event.type < EventType.timeSpanUndefined && this.calendarDay) {
          // we assure that only events of this day, previous day, reaching to this day and first event of next day are in allEvents
          this.cardFormEvents = GlobalFunctions.buildEvents(this.events, this.calendarDay, true, true);
        }
      }
      if (propKey === 'targetCalendarDay' || propKey === 'targetEvents') {
        // console.log('targetCalendarDay: ', this.targetCalendarDay);
        // console.log('tminutes: ', GlobalFunctions.getDateInMinutes(this.targetCalendarDay));
        // console.log('targetevents: ', this.targetEvents);
        isNewTarget = true;
      }
    }
    if (isNewTarget && this.targetCalendarDay && this.eventContainer.event.type < EventType.timeSpanUndefined
    && GlobalFunctions.getDateInMinutes(this.targetCalendarDay) > 0 && this.eventContainer?.updateType === this.updateTypeEnum.update
    && GlobalFunctions.getDateInMinutes(this.calendarDay) > 0
    && GlobalFunctions.getDateInMinutes(this.calendarDay) !== GlobalFunctions.getDateInMinutes(this.targetCalendarDay)
    && this.targetEvents !== undefined && this.targetEvents !== null) {
      this.prepareUpdateForTarget();
    }
  }

  private getEventParameters() {
    // defaultIntervlLength is taken from opts in "prepareInsert()"
    this.calendarDay = this.session.calendarDay;
    this.calendarDayDisplay = formatDate(this.calendarDay, 'EEE d.MM.yyyy', this.locale);
    const today = GlobalFunctions.getStartOfDay(new Date());
    const tomorrow = GlobalFunctions.addDays(today, 1);;
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.calendarDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
    // in case of plan and actual we must check event-day
    const {updateType, event, d} = this.eventContainer;
    this.addDpOptions(event);
  }

  // dateOpts are built
  private addDpOptions(event: Event) {

    // utils.clone would not event
    this.dateOpts = this.getCopyOfDpOptions(this.myDatepickerOptions);

    this.dateOpts.todayTxt = this.txt['today'];

    const disabled: IMyDateRange[] = GlobalFunctions.clone(this.disabledRanges);

    this.dateOpts.disableDateRanges = disabled;

    // we limit date entry to MAX_MONTHS before today and to MAX_MONTHS after today
    // (it is necessary to enter a disable entry in all cases if it has been entered in 1 case
    // cause component would not reset option otherwise)
    let disableSince = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS);
    let disableUntil = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS * -1);

    if (event?.type === EventType.actual) {
      disableSince = GlobalFunctions.addDays(this.calendarDay, 1);
    } else if (event?.type === EventType.plan) {
      disableUntil = GlobalFunctions.addDays(this.calendarDay, -1);;
    } else {
      disableSince = event?.eventEnd;
    }

    this.dateOpts.disableSince = {
      year: disableSince.getFullYear(), month: disableSince.getMonth() + 1, day: disableSince.getDate()
    }
    this.dateOpts.disableUntil = {
      year: disableUntil.getFullYear(), month: disableUntil.getMonth() + 1, day: disableUntil.getDate()
    }

    if (this.timeSpans?.length > 0) {
      this.timeSpans.forEach(_ => {
        if (_.type === 21) {
          const holiday = {
            year: _.eventBegin.getFullYear(), month: _.eventBegin.getMonth() + 1, day: _.eventBegin.getDate()
          }
          this.highlightDates.push(holiday);
        }
      });
    }

    this.dateOpts.highlightDates = this.highlightDates;

    // we need dateEndOpts only in case of time spans ...
    this.dateEndOpts = this.getCopyOfDpOptions(this.dateOpts);

    disableSince = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS);
    disableUntil = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(event?.eventBegin), -1);

    this.dateEndOpts.disableSince = {
      year: disableSince.getFullYear(), month: disableSince.getMonth() + 1, day: disableSince.getDate()
    }
    this.dateEndOpts.disableUntil = {
      year: disableUntil.getFullYear(), month: disableUntil.getMonth() + 1, day: disableUntil.getDate()
    }
  }

  /**
  * we need getCopy to avoid getting just a reference with "... = this.myDatepickerOptions"
  */
  private getCopyOfDpOptions(opts: IAngularMyDpOptions): IAngularMyDpOptions {
    return JSON.parse(JSON.stringify(opts));
  }


  private setLocationTypeChoices() {
    const enumStringType: { [key: string]: any } = this.locationTypeEnum;
    this.locationTypeChoices = Object.keys(this.locationTypeEnum)
    .filter(k => typeof enumStringType[k] === 'number')
    .map(_ => {
      return {value: enumStringType[_] as string, text: this.txt[_]};
    });
  }

  private setContactChoices() {
    this.contactChoices = [];
    this.ixSelected = -1;
    this.ixSet = 0;
    const {updateType, event, d} = this.eventContainer;
    // choice value 0 is event is not assigned exists anyway
    this.contactChoices.push({value: 0, 
    isSelected: false, text: this.txt['not_assigned']});
    // next choice is contact of event, if event is assigned to contact
    if (event.contactNr > 0 ) {
      this.contactChoices.push({value: event.contactNr,
        text: event.eventInfo?.contactDisplayName?.substring(0,50) ?? ``, 
        isSelected: !this.sessionContact || this.sessionContact?.contactNr === 0 || this.sessionContact.contactNr === event.contactNr
      });
      // ixSet is set to the legacy joined contact
      this.ixSet = 1;
    }

    // choice  contact selected in this session - if not already shown as contact
    if (this.sessionContact && this.sessionContact?.contactNr > 0 && this.sessionContact.contactNr !== event.contactNr) {
      this.contactChoices.push({value: this.sessionContact.contactNr,
        text: this.sessionContact.displayName?.substring(0,30) ?? ``, isSelected: true
      });
    } // end check eventIssues length

    if (this.contactChoices[this.contactChoices.length - 1].isSelected) {
        this.ixSelected = this.contactChoices.length - 1;
    }
    if (this.ixSelected < 0 && this.contactChoices.length > 0 && UpdateType.update) {
      this.ixSelected = 0;
    }
  }



  /**
   * prepareUpdate - first preparation of original event which is beeing updated
   * @param event (from eventContainer), is cloned to have a new object for updating the model
   *   special handling if event.type >= EventType.timeSpanUndefined (time span, without begin time and end time)
   */
   private prepareUpdate(event: Event) {
    this.event = GlobalFunctions.clone(event);
    let spaceBefore = 0;
    let spaceAfter = 0;
    const eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
    if (event.type < EventType.timeSpanUndefined) {
      spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,  this.calendarDay, this.event.eventId);
      spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,  this.calendarDay, this.event.eventId);
    } else {
      this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
      this.beginDisplay = formatDate(this.event.eventBegin, 'EEE d.MM.yyyy', this.locale);
      this.endDisplay = formatDate(GlobalFunctions.addDays(this.event.eventEnd, -1), 'EEE d.MM.yyyy', this.locale);
      this.addDpOptions(event);
    }
    this.event.cardElement = {spaceBefore, spaceAfter,
       isTemporary: false, isSummaryUpdated: false, eventDurationDisplay, contactDisplayNr: '', contactDisplayName: ''};
    if (event.type < EventType.timeSpanUndefined) {
      this.buildShiftChoices();
    } else {
      const category = event.type % 10;
      const ix = this.timeSpanTypeChoices.findIndex(_ => Number(_.value) === category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style ?? {};
      } else {
        this.style = {};
      }
    }
  }

  /**
   * prepareInsert
   * @param event (from eventContainer - can contain summary, locationType from entries in other views ...)
   *   special handling if event.type >= EventType.timeSpanUndefined (time span, without begin time and end time)
   * @param d date and time for insertion of new event, entered in other views ...
   */
  private prepareInsert(event: Event, d: Date) {
    this.event = event;
    if (this.event.type < EventType.timeSpanUndefined) {
      // if we have empty event from grid or temporary inserted event from eventCard
      if (this.event.eventDuration === undefined || event.eventDuration === null || event.eventDuration === 0) {
        this.event.type = this.session.isPlan ? EventType.plan : EventType.actual;
        this.event.eventBegin = d;
        this.event.eventDuration = this.opts.defaultIntervalLength;
        this.event.eventEnd = GlobalFunctions.addMinutes(this.event.eventBegin, this.event.eventDuration);
      }
      const nextEvent: Event | null = GlobalFunctions.getNextEvent(this.cardFormEvents, this.event.eventBegin);
      if (nextEvent && GlobalFunctions.isMinuteEarlier(nextEvent.eventBegin, this.event.eventEnd )) {
        this.event.eventEnd = nextEvent.eventBegin;
      }
      this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
      - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
      // @deprecated this.event.isUpdated = true;
      const eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
      const spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,  this.calendarDay);
      const spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,  this.calendarDay);
      this.event.cardElement = {isTemporary: false, isSummaryUpdated: false, spaceBefore, spaceAfter, eventDurationDisplay,
        contactDisplayNr: '', contactDisplayName: ''};
    } else {
      this.event.eventBegin = GlobalFunctions.getStartOfDay(d);
      // duration in time span is built dynamically - event.eventDuration is set to 0
      this.event.eventDuration = 0;
      // end is set to begin of next day
      this.event.eventEnd = GlobalFunctions.addDays(this.event.eventBegin, 1);
      this.beginDisplay = formatDate(this.event.eventBegin, 'EEE d.MM.yyyy', this.locale);
      this.days = 1;
      const eventDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.event.eventEnd) - GlobalFunctions.getDateInMinutes(this.event.eventBegin));
      this.event.cardElement = {isTemporary: false, isSummaryUpdated: false, spaceBefore: 0, spaceAfter: 0, eventDurationDisplay,
        contactDisplayNr: '', contactDisplayName: ''};
      this.addDpOptions(event);
    }
  }

  // only used at real events to have choices when shifting this events
  private buildShiftChoices() {
    if (this.event.cardElement) {
      // for shift before (= before event which is before selected events)
      const earlierBegin = GlobalFunctions.getPreviousBegin(this.event.eventBegin, this.event.eventDuration, this.cardFormEvents, this.calendarDay);
      this.event.cardElement.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(this.event.eventBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
      // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

      // for shift after (= after event which is after selected events)
      const laterBegin = GlobalFunctions.getNextBegin(this.event.eventBegin, this.event.eventDuration, this.cardFormEvents, this.calendarDay);
      this.event.cardElement.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(this.event.eventBegin) : 0;
      // console.log('shiftSpaceAfter', this.shiftSpaceAfter);
    }

  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('bodyGroup.summary', 'required',  this.eventtxt['summary'] + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('bodyGroup.summary', 'minlength', this.eventtxt['summary']
      + ' ' + this.txt['must_have_at_least'] + ' 1 ' + this.txt['positions_containing']),
      new ErrorMessage('bodyGroup.summary', 'maxlength', this.eventtxt['summary']
      + ' ' + this.txt['must_have_not_more'] + ' 255 ' + this.txt['positions_containing']),
      new ErrorMessage('bodyGroup.location', 'maxlength', this.eventtxt['location']
      + ' ' + this.txt['must_have_not_more'] + ' 255 ' + this.txt['positions_containing'])
    ];
  }


  /**
    * form handling
    * initThisForm prepares form for update body
    *
    */
   private initThisForm() {
    this.thisForm = this.fb.group({
      bodyGroup: this.fb.group({
        // summary: [this.eventContainer.updateType === UpdateType.insert ? '' : this.event.summary, [
        summary: [this.event?.summary, [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(255)
          ]
        ],
        locationType: [this.event?.locationType],
        description: [this.eventContainer.updateType === UpdateType.insert ? '' : this.event.description],
        location: [this.eventContainer.updateType === UpdateType.insert ? '' : this.event.location, [
          Validators.maxLength(255)
          ]
        ],
        category: [this.event?.type >= EventType.timeSpanUndefined ? (this.event.type % 10).toString() : '']
      })
    });
    this.onChangesEventType();
    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
  }

private onChangesEventType() {
    this.thisForm.get('bodyGroup.category')?.valueChanges
    .subscribe(category => {
      const ix = this.timeSpanTypeChoices.findIndex(_ => _.value === category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style ?? {};
      } else {
        this.style = {};
      }
    });
  }


  private positionViewport() {
    let element = document.getElementById('cardForm');
    // scrollIntoView is not implemented in jsdom...
    window.HTMLElement.prototype.scrollIntoView = function() {};
    element?.scrollIntoView();
  }


  /**
   * when time is updated, we must check if another event is after and end time has to be adjusted
   * - events must not overlap
   *
   * @param begin new begin time
   * @param end new end time
   * @param eventId id of processed event
   * @returns eventually corrected end time
   */
  private getNewEnd(begin: Date, end: Date, eventId: number): Date {
    let nextEvent: Event | null = GlobalFunctions.getNextEvent(this.cardFormEvents, begin);
    // if we get this processed event as next event we search for real next event
    if (nextEvent && eventId === nextEvent.eventId) {
      nextEvent = GlobalFunctions.getNextEvent(this.cardFormEvents, GlobalFunctions.addMinutes(nextEvent.eventBegin, 1));
    }
    // if overlapping, eventEnd is set to begin of next event, duration is shortened
    if (nextEvent && GlobalFunctions.isMinuteEarlier(nextEvent.eventBegin, end )) {
      end = nextEvent.eventBegin;
    }
    // duration must not exceed this.opts.maxIntervalLength
    if (GlobalFunctions.isMinuteEarlier(GlobalFunctions.addMinutes(begin, this.opts.maxIntervalLength), end)) {
      end = GlobalFunctions.addMinutes(begin, this.opts.maxIntervalLength);
    }
    return end;
  }


  /**
   * prepareUpdateForTarget -  preparation of original event for a target date
   */
   private prepareUpdateForTarget() {
    const shiftMinutes = this.searchTargetBegin();
    if (this.targetCalendarDay && this.targetEvents && this.event.cardElement && shiftMinutes !== undefined && shiftMinutes !== null) {
      let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetCalendarDay) - GlobalFunctions.getDateInMinutes(this.calendarDay);
      // no shift or user accepts shifted begin
      if (shiftMinutes === 0 || confirm(this.txt['event_shifted_to']  + ' '
      + formatDate(GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff + shiftMinutes), 'HH:mm', this.locale) + '?')) {
        // we set the surrounding events to targetEvents
        this.cardFormEvents = GlobalFunctions.buildEvents(this.targetEvents, this.targetCalendarDay, true, true);
        // we set new eventBegin and eventEnd
        this.event.eventBegin = GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff + shiftMinutes);
        this.event.eventEnd = GlobalFunctions.addMinutes(this.event.eventEnd, minutesDiff + shiftMinutes);
        this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
          this.targetCalendarDay, this.event.eventId);
        this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
          this.targetCalendarDay, this.event.eventId);
        // now we set this calendarDay
        this.calendarDay = this.targetCalendarDay;
        // we build shiftChices for target calendarDay
        this.buildShiftChoices();
        this.calendarDayDisplay = formatDate(this.calendarDay, 'EEE d.MM.yyyy', this.locale);
        const today = GlobalFunctions.getStartOfDay(new Date());
        const tomorrow = GlobalFunctions.addDays(today, 1);;
        this.isAfterToday = GlobalFunctions.getDateInMinutes(this.calendarDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
      }
    } else {
      alert(this.txt['notPossible']  + '!');
    }
  }


  // returns minutes later (pr earlier, if negative) for a begin (relative to rangeBegin) in targetEvents
  // returns 0 if rangeBegin is unchanged, return null if no begin is possible
  private searchTargetBegin(): number | null {
    if (this.targetCalendarDay && this.targetEvents) {
      // ramgBegin rangeEnd are begin and end of range at target day
      let rangeBegin: Date;
      let rangeEnd: Date;
      let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetCalendarDay) - GlobalFunctions.getDateInMinutes(this.calendarDay);
      // now we have begin and end at target day
      rangeBegin = GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff);
      rangeEnd = GlobalFunctions.addMinutes(this.event.eventEnd, minutesDiff);
      const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
      // 1. we check if we can leave begin unchanged
      if (this.targetEvents && this.targetEvents.filter(_ => _.eventBegin <= rangeBegin && _.eventEnd > rangeBegin).length === 0
        && this.targetEvents.filter(_ => _.eventBegin < rangeEnd && _.eventEnd >= rangeEnd).length === 0
        && this.targetEvents.filter(_ => _.eventBegin > rangeBegin && _.eventEnd < rangeEnd).length === 0) {
        return 0;
      }
      // 2. we check if the space  before and after begin is enough to place whole range
      // so we would get earlier begin - this we do before we check later begin, bu not if we copy at today
      const spaceBefore = GlobalFunctions.getSpaceBefore(rangeBegin,this.targetEvents,this.targetCalendarDay);
      const spaceAfter = GlobalFunctions.getSpaceAfter(rangeBegin,this.targetEvents,this.targetCalendarDay);
      if (spaceBefore + spaceAfter >= rangeDuration
        && !GlobalFunctions.isMinuteSame(this.targetCalendarDay, this.calendarDay)) {
        // we need no check for same/next day bacause here we get earlier
          return spaceAfter - rangeDuration;
      } else {
        // 3. if  begin is covered by a event, we try if spaceAfter end of this event is OK
        const eventAtBegin = this.targetEvents.find(_ => _.eventBegin <= rangeBegin && _.eventEnd > rangeBegin);
        if (eventAtBegin) {
          const spaceAfterEventAtBegin = GlobalFunctions.getSpaceAfter(eventAtBegin.eventEnd, this.targetEvents,this.targetCalendarDay);
          const shiftAtBegin = GlobalFunctions.getDateInMinutes(eventAtBegin.eventEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
          if (spaceAfterEventAtBegin >= rangeDuration
          && GlobalFunctions.getDateInMinutes(rangeBegin) - GlobalFunctions.getDateInMinutes(this.targetCalendarDay) + shiftAtBegin < 24 * 60) {
            return shiftAtBegin;
          }
        }
        // 4. if not, maybe we can shift after a next event
        const laterDate = GlobalFunctions.getNextBegin(rangeBegin, rangeDuration, this.targetEvents,this.targetCalendarDay);
        if (laterDate) {
          return GlobalFunctions.getDateInMinutes(laterDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
        }
      }
      // 5. here we are if we must shift earlier - first we try method 2. at calendarDay
      if (spaceBefore + spaceAfter >= rangeDuration) {
          return spaceAfter - rangeDuration;
      }
      // 6. if not, maybe we can shift before a previous event
      const earlierDate = GlobalFunctions.getPreviousBegin(rangeBegin, rangeDuration, this.targetEvents,this.targetCalendarDay);
      if (earlierDate) {
        return GlobalFunctions.getDateInMinutes(earlierDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
      }
    }
    // 7. no possibilty to place range at target
    return null;
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setContactBgColorStyle (contactColor: string) {
    return StyleFactory.getBgColorStyle(contactColor, 0);
  }

  public shiftBefore() {
    if (this.event.cardElement) {
      this.event.eventBegin = GlobalFunctions.addMinutes(new Date(this.event.eventBegin), (this.event.cardElement.shiftSpaceBefore ?? 0) * -1);
      this.event.eventEnd = GlobalFunctions.addMinutes(new Date(this.event.eventEnd), (this.event.cardElement.shiftSpaceBefore ?? 0) * -1);
      this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
        this.calendarDay, this.event.eventId);
      this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
      this.calendarDay, this.event.eventId);
      this.buildShiftChoices();
    }
  }

  public shiftAfter() {
    if (this.event.cardElement) {
      this.event.eventBegin = GlobalFunctions.addMinutes(this.event.eventBegin, this.event.cardElement.shiftSpaceAfter ?? 0);
      this.event.eventEnd = GlobalFunctions.addMinutes(this.event.eventEnd, this.event.cardElement.shiftSpaceAfter ?? 0);
      this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
        this.calendarDay, this.event.eventId);
      this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
      this.calendarDay, this.event.eventId);
      this.buildShiftChoices();
    }
  }

  public setShowTimeChange(type: number) {
    this.changeType = type;
    if (this.event.cardElement) {
      this.event.cardElement.isShowTimeChange = true;
    }
  }

  public timeUpdate(event: {updateType: UpdateType, event: Event, id: number}) {
    this.event = event.event;
    if (this.event.cardElement) {
      this.event.eventEnd = this.getNewEnd(event.event.eventBegin, event.event.eventEnd, event.event.eventId);
      // it could happen that we get new end due to a following event - we must update duration
      this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
      - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
      this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
      // this.event.eventId can be 0 in case of insert ....
      this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
        this.calendarDay, this.event.eventId);
      this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
        this.calendarDay, this.event.eventId);
      this.event.cardElement.isShowTimeChange = false;
    }
  }

  public cancelTimeChangeView(event: {updateType: UpdateType, event: Event, id: number}) {
    if (this.event.cardElement) {
      this.event.cardElement.isShowTimeChange = false;
    }
  }


  public setContactInfo() {
    this.isContactInfo = !this.isContactInfo;
  }



  // if type of angular-mydatepicker is hidden, this function is obsolete
  public onInputFieldChanged(event: IMyInputFieldChanged): void {
    // console.log('onInputFieldChanged(): Value: ', event.value, ' - dateFormat: ', event.dateFormat, ' - valid: ', event.valid);
  }

  public onDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    if (this.event.type < EventType.timeSpanUndefined) {
      // in this surrounding we do not set isRange
      if (!event.isRange && this.eventContainer.updateType !== UpdateType.insert) {
        const choosenDate = event.singleDate?.jsDate;
        if (choosenDate && GlobalFunctions.getDateInMinutes(this.calendarDay) !== GlobalFunctions.getDateInMinutes(choosenDate)) {
          this.calendarDaySelected.emit(choosenDate);
        }
        // we need no delay - we process targetCalendarDay at ngOnChange
        // setTimeout(() => {console.log('1 second finished!')}, 1000);
      }
    } else {
      const choosenDate = event.singleDate?.jsDate;
      if (choosenDate && this.event.cardElement) {
        this.event.eventBegin = GlobalFunctions.getStartOfDay(choosenDate);
        this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
        this.beginDisplay = formatDate(this.event.eventBegin, 'EEE d.MM.yyyy', this.locale);
        this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.event.eventEnd) - GlobalFunctions.getDateInMinutes(this.event.eventBegin));
        this.addDpOptions(this.event);
      }
    }
  }

   // if type of angular-mydatepicker is hidden, this function is obsolete
   public onEndInputFieldChanged(event: IMyInputFieldChanged): void {
    // console.log('onInputFieldChanged(): Value: ', event.value, ' - dateFormat: ', event.dateFormat, ' - valid: ', event.valid);
  }


  public onEndDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    if (this.event.type < EventType.timeSpanUndefined) {
      // not possible - end date is defined automatically
    } else {
      const choosenDate = event.singleDate?.jsDate;
      if (choosenDate && this.event.cardElement) {
        // user choses date as last day of the time span - we store start of next day as eventEnd
        this.event.eventEnd = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(choosenDate), 1);
        this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
        this.endDisplay = formatDate(GlobalFunctions.addDays(this.event.eventEnd, -1), 'EEE d.MM.yyyy', this.locale);
        this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.event.eventEnd) - GlobalFunctions.getDateInMinutes(this.event.eventBegin));
        this.addDpOptions(this.event);
      }
    }
  }

  public selectAnotherContact(event: any) {
    if (event.target.value && Number(event.target.value) >= 0) {
      this.ixSelected = this.contactChoices.findIndex(_ => _.value === Number(event.target.value));
    }
  }

  public setAnotherContact() {
    this.ixSet = this.ixSelected >= 0 ? this.ixSelected : this.ixSet;
  }


  public submitForm() {
    this.event.summary = this.thisForm.value.bodyGroup.summary;
    this.event.locationType = Number(this.thisForm.value.bodyGroup.locationType);
    this.event.description = this.thisForm.value.bodyGroup.description;
    this.event.location = this.thisForm.value.bodyGroup.location;
    this.event.contactNr = this.contactChoices[this.ixSet].value
    if (this.event.type < EventType.timeSpanUndefined) {
      // when updating real events (type < EventType.timeSpanUndefined) it might be that there are associated events where contact, issue should also be updated
      if (this.eventContainer.updateType !== UpdateType.insert
        && this.event.contactNr !== this.eventContainer.event.contactNr) {
        this.eventUpdateAssoc.emit({updateType: this.eventContainer.updateType, event: this.event});
      } else {
        this.eventUpdate.emit({updateType: this.eventContainer.updateType, event: this.event});
      }
    } else {
      let category = Number(this.thisForm.value.bodyGroup.category);
      if (category === 0 && this.timeSpanTypeChoices.length > 0) {
        category = Number(this.timeSpanTypeChoices[0].value);
      }
      this.event.type = EventType.timeSpanUndefined + category;
      const ix = this.timeSpanTypeChoices.findIndex(_ => _.value === this.thisForm.value.bodyGroup.category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style ?? {};
      } else {
        this.style = {};
      }
      this.timeSpanUpdate.emit({updateType: this.eventContainer.updateType, event: this.event});
    }

  }

  public setDone(): void {
    /*
    if (this.event.doneId > 0 && confirm(this.txt['reset'] + ' ' + this.txt['done'] + '?')) {
      this.event.doneId = 0;
      this.submitForm();
    } else if (!(this.event.doneId > 0)) {
      if (this.isAfterToday) {
        alert(this.txt['set_to'] + ' ' + this.txt['done'] + ' ' + this.txt['not_allowed']);
      } else if (confirm(this.txt['set_to'] + ' ' + this.txt['done'] + '?')) {
        this.event.doneId = this.event.eventId;
        this.submitForm();
      }
    }
    */
    if (this.event.doneId > 0) {
      this.event.doneId = 0;
    }  else if (!(this.event.doneId > 0)) {
      if (this.isAfterToday) {
        alert(this.txt['set_to'] + ' ' + this.txt['done'] + ' ' + this.txt['not_allowed']);
      } else {
        this.event.doneId = this.event.eventId;
      }
    }
  }

  public setDelete(): void {
    if (this.event.type < EventType.timeSpanUndefined) {
      if (confirm(this.txt['event_disable'] + '?')) {
        if (this.eventContainer.updateType === UpdateType.update) {
          this.eventUpdate.emit({updateType: UpdateType.delete, event: this.event});
        }
      }
    } else {
      if (confirm(this.txt['time_span_disable'] + '?')) {
        if (this.eventContainer.updateType === UpdateType.update) {
          this.timeSpanUpdate.emit({updateType: UpdateType.delete, event: this.event});
        }
      }
    }

  }

  public cancelUpdates(): void {
    if (this.eventContainer.updateType !== UpdateType.insert) {
      this.eventUpdate.emit({updateType: UpdateType.cancelUpdate, event: this.event});
    } else {
      this.cardFormCancel.emit();
    }
  }

  /** ---------------------------- form handling methods  ---------------------------------- */


  /**
    * update form error messages
    */
   private updateErrorMessages() {
    this.errors = {};
    for (const message of this.thisFormErrorMessages) {
      const control = this.thisForm.get(message.forControl);
      /**
        * we build errors key-value
        */
      if (control &&
          control.dirty &&
          control.invalid &&
          control.errors &&
          control.errors[message.forValidator] &&
          !this.errors[message.forControl]) {
        // for testing:
        // console.log('control:', `${message.forControl}`, 'validator:', `${message.forValidator}`, `${message.text}`);
        this.errors[message.forControl] = message.text;
      }
    }
  }

}



