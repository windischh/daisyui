import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange } from '@angular/core';
import { formatDate, NgStyle, NgClass } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';

import { UpdateType } from '../../_enums/update-type.enum';
import { EventType } from '../../_enums/event-type.enum';

import { Event } from '../../_db/event';
import { Session } from '../../_db/session';

import { IUserEventOptions } from '../../_interfaces/i-user-event-options';

@Component({
  selector: 'dsy-calendar-day-time-shift-view',
  templateUrl: './calendar-day-time-shift-view.html',
  styleUrl: './calendar-day-time-shift-view.css',
  imports: [NgStyle, NgClass]
})
export class CalendarDayTimeShiftViewComponent implements OnInit {

  public name = 'CalendarDayTimeShiftViewComponent';

  @Input({required: true}) session!: Session;

  // in the moment locale is irrelevant for time formatting
  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) eventtxt!: { [key: string]: string };

  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) userOpts!: IUserEventOptions;

  @Input({required: true}) timeZoneIdentifier!: string;

  // day of event - 00:00 in browser timezone
  // can be selected by user
  // calendarDay is in opts @Input({required: true}) calendarDay: Date;
  calendarDayDisplay = '';
  dateString = '';

  isAfterToday = false;
  isBeforeToday = false;
  isBeforeYesterday = false;

  // all events of event-day - dependent of opts.isPlan. Selected events have isSelected = true
  @Input({required: true}) events!: Array<Event>;
  @Input({required: true}) eventsChangeCounter!: number;


  // independent of opts.isPlan we get actualEvents to check the function copyPlanToEvent
  @Input({required: true}) actualEvents!: Array<Event>;

  // if selected events are to be shifted to another date we use targetEvents and targetCalendarDay
  @Input({required: true}) targetEvents!: Array<Event> | null;
  @Input({required: true}) targetCalendarDay!: Date | null;

  @Output() timeShiftCancel = new EventEmitter();
  // in case of shift to another day we update only event begin, event end - in case of copyToActual we transfer whole information
  @Output() eventUpdate = new EventEmitter<{updateType: UpdateType, event: Event | null, events?: Array<Event>}>();

  @Output() selectionSet = new EventEmitter();

  directSpaceBefore!: number;
  directSpaceAfter!: number;
  shiftSpaceBefore!: number;
  shiftSpaceAfter!: number;

  isCopyToActual!: boolean;
  isNoneDone!: boolean;
  isAllDone!: boolean;

  shiftActualDisplay = '';
  shiftPlanDisplay = '';
  copyPlanDisplay = '';
  targetCalendarDayDisplay = '';

  rowTopNoPaddingStyle = {
    'padding-top': '0'
  }

  constructor() {
   }

  ngOnInit(): void {
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'events' || propKey === 'actualEvents' || propKey === 'targetCalendarDay'  || propKey === 'eventsChangeCounter') {
        if (this.events && this.events.length > 0) {
          this.buildShiftChoices();
        }
      }
    }
  }

  private buildShiftChoices() {
    const today = GlobalFunctions.getStartOfDay(new Date());
    const tomorrow = GlobalFunctions.addDays(today, 1);
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.session.calendarDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
    // in the moment we do not use isBeforeToday
    this.isBeforeToday = GlobalFunctions.getDateInMinutes(this.session.calendarDay) < GlobalFunctions.getDateInMinutes(today);
    // in the moment we use isBeforeYesterday to prohibit shifting planEvents
    // TODO days before might be based on a new option
    const yesterday = GlobalFunctions.addDays(today, -1);
    this.isBeforeYesterday = GlobalFunctions.getDateInMinutes(this.session.calendarDay) < GlobalFunctions.getDateInMinutes(yesterday);
    this.shiftActualDisplay = this.targetCalendarDay ? formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale) : this.txt['no_date_selected'];
    this.shiftPlanDisplay = this.targetCalendarDay ? formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale) :
      GlobalFunctions.isMinuteSame(today, this.session.calendarDay) ? this.txt['to_tomorrow'] : this.txt['no_date_selected'];
    this.copyPlanDisplay = this.targetCalendarDay ? formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale) :
      GlobalFunctions.isMinuteSame(today, this.session.calendarDay) ? this.txt['to_today'] : this.txt['no_date_selected'];
    let rangeBegin: Date | undefined;
    let spaceBefore: number = 0;
    let rangeEnd: Date | undefined;
    let spaceAfter: number = 0;
    // we assure that events  consists only of event of day before, which reaches into this day,
    // and first event on next day
    const allEvents = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, true, true);
    allEvents.forEach(_ => {
      if (_.isSelected && !rangeBegin) {
        rangeBegin = _.eventBegin;
        spaceBefore = GlobalFunctions.getSpaceBefore(_.eventBegin, allEvents, this.session.calendarDay);
      }
      if (_.isSelected && rangeBegin) {
        rangeEnd = _.eventEnd;
        // if there is no event after, spaceAfter is calculated as end of this day + MAX_INTERVAL_SIZE
        spaceAfter = GlobalFunctions.getSpaceAfter(_.eventEnd, allEvents, this.session.calendarDay);
        const minuteBegin =  GlobalFunctions.getDateInMinutes(_.eventBegin) - GlobalFunctions.getDateInMinutes(this.session.calendarDay);
        // if we shift, if eventEnd is already at next day, the sapce must not lead to eventBegin at next day
        //  else (eventend is at this day) eventEnd must stay at this day
        spaceAfter = minuteBegin + _.eventDuration <= 24 * 60 && minuteBegin + _.eventDuration + spaceAfter >  24 * 60
        ? 24 * 60 - minuteBegin - _.eventDuration
        : minuteBegin + spaceAfter > 24 * 60
        ? 24 * 60 - minuteBegin
        : spaceAfter;
      }
    })
    // console.log('rangeBegin', rangeBegin);
    // console.log('rangeEnd', rangeEnd);
    // console.log('spaceBefore event:', spaceBefore);
    // console.log('spaceAfter event:', spaceAfter);

    if (rangeBegin && rangeEnd) {
      const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);

      const beginAfterStartHour = GlobalFunctions.getDateInMinutes(rangeBegin)
      - GlobalFunctions.getDateInMinutes(this.session.calendarDay) - this.userOpts.startHour * 60;
      const endAfterLastHour = GlobalFunctions.getDateInMinutes(rangeEnd)
      - GlobalFunctions.getDateInMinutes(this.session.calendarDay) - this.userOpts.lastHour * 60;

      // for shifting earlier:
      // we shift end to lastHour if end is after it, then begin to startHour if begin is after it
      this.directSpaceBefore = (endAfterLastHour > 0 && endAfterLastHour - spaceBefore > 0) || endAfterLastHour <= 0
      ? (
        (beginAfterStartHour > 0 && beginAfterStartHour - spaceBefore > 0) || beginAfterStartHour <= 0
        ? spaceBefore : beginAfterStartHour
        )
      : endAfterLastHour;
      // console.log('directSpaceBefore:', this.directSpaceBefore);

      // for shifting later:
      // we shift then begin to startHour if begin is before it, then end to lastHour if end is before it
      this.directSpaceAfter = (beginAfterStartHour < 0  && beginAfterStartHour + spaceAfter < 0) || beginAfterStartHour >= 0
      ? (
        (endAfterLastHour < 0  && endAfterLastHour + spaceAfter < 0) || endAfterLastHour >= 0
        ? spaceAfter : endAfterLastHour * -1
      )
    : beginAfterStartHour * -1;
      // console.log('directSpaceAfter', this.directSpaceAfter);

      // for shift before (= before event which is before selected events)
      const earlierBegin = GlobalFunctions.getPreviousBegin(rangeBegin, rangeDuration, allEvents, this.session.calendarDay);
      this.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(rangeBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
      // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

      // for shift after (= after event which is after selected events)
      const laterBegin = GlobalFunctions.getNextBegin(rangeBegin, rangeDuration, allEvents, this.session.calendarDay);
      this.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(rangeBegin) : 0;
      // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

      // checking copy plan to actual
      this.isCopyToActual = this.events.filter(_ => _.isSelected
        // copying is managed correctly by copy plan to actual and eventually not all can be copied.
      ).length > 0;

      // isNoneDone - none of the selected events is done shift not possible if planEvent is done
      this.isNoneDone = this.events.filter(_ => _.isSelected && _.doneId > 0).length === 0;
      this.isAllDone = this.events.filter(_ => _.isSelected && _.doneId === 0).length === 0;
    }
  }

  // returns minutes later (pr earlier, if negative) for a begin (relative to rangeBegin) in targetEvents
  // returns 0 if rangeBegin is unchanged, return null if no begin is possible
  private searchTargetBegin(): number | null {
    // ramgBegin rangeEnd are begin and end of range at target day
    let rangeBegin: Date | undefined;
    let lastElementBegin: Date | undefined;
    let rangeEnd: Date | undefined;
    // we take begin and end at source day
    const allEvents = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, true, false);
    allEvents.forEach(_ => {
      if (_.isSelected && !rangeBegin) {
        rangeBegin = _.eventBegin;
      }
      if (_.isSelected && rangeBegin) {
        lastElementBegin = _.eventBegin;
        rangeEnd = _.eventEnd;
      }
    })
    if (this.targetCalendarDay && this.targetEvents && rangeBegin  && rangeEnd && lastElementBegin) {
      let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetCalendarDay) - GlobalFunctions.getDateInMinutes(this.session.calendarDay);
      // now we have begin and end at target day
      rangeBegin = GlobalFunctions.addMinutes(rangeBegin, minutesDiff);
      rangeEnd = GlobalFunctions.addMinutes(rangeEnd, minutesDiff);
      lastElementBegin = GlobalFunctions.addMinutes(lastElementBegin, minutesDiff);
      const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
      const begin = rangeBegin;
      const end = rangeEnd;
      // 1. we check if we can leave begin unchanged
      if (this.targetEvents.filter(_ => _.eventBegin <= begin && _.eventEnd > begin).length === 0
        && this.targetEvents.filter(_ => _.eventBegin < end && _.eventEnd >= end).length === 0
        && this.targetEvents.filter(_ => _.eventBegin > begin && _.eventEnd < end).length === 0) {
        return 0;
      }
      // 2. we check if the space  before and after begin is enough to place whole range
      // so we would get earlier begin - this we do before we check later begin, bu not if we copy at today
      const spaceBefore = GlobalFunctions.getSpaceBefore(rangeBegin,this.targetEvents,this.targetCalendarDay);
      const spaceAfter = GlobalFunctions.getSpaceAfter(rangeBegin,this.targetEvents,this.targetCalendarDay);
      if (spaceBefore + spaceAfter >= rangeDuration
        && !GlobalFunctions.isMinuteSame(this.targetCalendarDay, this.session.calendarDay)) {
        // we need no check for same/next day bacause here we get earlier
          return spaceAfter - rangeDuration;
      } else {
        // 3. if  begin is covered by a event, we try if spaceAfter end of this event is OK
        const eventAtBegin = this.targetEvents.find(_ => _.eventBegin <= begin && _.eventEnd > begin);
        if (eventAtBegin) {
          const spaceAfterEventAtBegin = GlobalFunctions.getSpaceAfter(eventAtBegin.eventEnd, this.targetEvents,this.targetCalendarDay);
          const shiftAtBegin = GlobalFunctions.getDateInMinutes(eventAtBegin.eventEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
          if (spaceAfterEventAtBegin >= rangeDuration
          && GlobalFunctions.getDateInMinutes(lastElementBegin) - GlobalFunctions.getDateInMinutes(this.targetCalendarDay) + shiftAtBegin < 24 * 60) {
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


  public shiftBefore() {
    this.shiftEventsBefore(this.shiftSpaceBefore);
  }

  public shiftAfter() {
    this.shiftEventsAfter(this.shiftSpaceAfter);
  }

  public shiftEarlier() {
    this.shiftEventsBefore(this.directSpaceBefore);
  }

  public shiftLater() {
    this.shiftEventsAfter(this.directSpaceAfter);
  }

  public copyToActual() {
    let plannedEventBegin = this.events[0].eventBegin;
    let isAllPlannedCopied = true;
    const copiedEvents: Array<Event> = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
    let newEvents: Array<Event> = [];
    for (const _ of copiedEvents) {
      if (isAllPlannedCopied) {
        const eventCanBegin = GlobalFunctions.getDateInMinutes(plannedEventBegin) > GlobalFunctions.getDateInMinutes(_.eventBegin)
        ? plannedEventBegin
        : _.eventBegin;
        // check if there is no other actual event overlapping eventBegin of (eventually) generated new actual
        if (this.actualEvents.filter(actual => actual.eventBegin <= eventCanBegin && actual.eventEnd > eventCanBegin).length === 0) {
          let newEventDuration = 0;
          // spaceAfter is the max. length for copied event
          const spaceAfter = GlobalFunctions.getSpaceAfter(eventCanBegin, this.actualEvents, this.session.calendarDay);
          newEventDuration = spaceAfter > _.eventDuration ? _.eventDuration : spaceAfter;
          if (newEventDuration >= 5) {
            const newEvent: Event = GlobalFunctions.clone(_);
            // new copied event starts at same time as planned event or directly after lat copied event
            newEvent.eventId = 0;
            newEvent.eventBegin = eventCanBegin;
            newEvent.eventDuration = newEventDuration;
            newEvent.type = EventType.actual;
            newEvent.doneId = 0;
            newEvent.planId = _.eventId;
            newEvent.eventEnd = GlobalFunctions.addMinutes(newEvent.eventBegin, newEventDuration);
            newEvents.push(newEvent);
            // next copied event can begin here
            plannedEventBegin = newEvent.eventEnd;
          } else {
            isAllPlannedCopied = false;
          }
        // there is event which overlaps begin
        } else {
          // we fix the actual event which overlaps planned eventBegin
          let newEventDuration = 0;
          let actualEvent = GlobalFunctions.getPreviousEvent(this.actualEvents, eventCanBegin);
          if (!actualEvent) {
            actualEvent = GlobalFunctions.getNextEvent(this.actualEvents, eventCanBegin);
          }
          // previousActualEvent is checked to assure previousActualEvent ....
          if (actualEvent && GlobalFunctions.getDateInMinutes(actualEvent.eventBegin) <= GlobalFunctions.getDateInMinutes(_.eventBegin)) {
            let isSearchNext = true;
            const actual = actualEvent;
            for (let index = 0; isSearchNext; index++) {
              let spaceAfter = GlobalFunctions.getSpaceAfter(actual.eventEnd, this.actualEvents, this.session.calendarDay);
              // it is possible that spaceAfter is 0, due to directly follwing next event ...
              if (spaceAfter >= 5) {
                isSearchNext = false;
                newEventDuration = spaceAfter > _.eventDuration ? _.eventDuration : spaceAfter;
              } else {
                actualEvent = GlobalFunctions.getNextEvent(this.actualEvents, actual.eventEnd);
                if (!actualEvent || index > 100) {
                  isSearchNext = false;
                }
              }
            }
          }
          // min. timeSlize in our system is 5 min
          if (actualEvent && newEventDuration >= 5  ) {
            const newEvent: Event = GlobalFunctions.clone(_);
            newEvent.eventId = 0;
            newEvent.eventDuration = newEventDuration;
            newEvent.type = EventType.actual;
            newEvent.planId = _.eventId;
            newEvent.doneId = 0;
            newEvent.eventBegin = actualEvent.eventEnd;
            newEvent.eventEnd = GlobalFunctions.addMinutes(newEvent.eventBegin, newEventDuration);
            newEvents.push(newEvent);
            // next copied event can begin here
            plannedEventBegin = newEvent.eventEnd;
          } else {
            isAllPlannedCopied = false;
          }
        }
      }
    }
    if (isAllPlannedCopied) {
      this.eventUpdate.emit({updateType: UpdateType.copyPlanToActual, event: null, events: newEvents});
    } else {
      alert(this.txt['not'] + ' ' + this.txt['all_are_copied']  + '!')
    }
    // after copying we end selection
    this.selectionSet.emit();
  }

  public copyPlan() {
    if (this.targetCalendarDay) {
      this.targetCalendarDayDisplay = formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale);
    }
    // if no target, and we are at today, we use today if we plan for today
    if (!this.targetCalendarDay && GlobalFunctions.isMinuteSame(GlobalFunctions.getStartOfDay(new Date()), this.session.calendarDay)) {
      this.targetCalendarDay = this.session.calendarDay;
      this.targetEvents = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, true, false);
      this.targetCalendarDayDisplay = this.txt['today'] + ', ' + formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale);
    }
    // we search a possible target range
    // if target not possible for interval, alert user 'copyNotPossible'
    if (this.targetCalendarDay) {
      const shiftMinutes = this.searchTargetBegin();
      if (shiftMinutes !== undefined && shiftMinutes !== null) {
        let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetCalendarDay) - GlobalFunctions.getDateInMinutes(this.session.calendarDay);
        let copiedEvents: Event[] = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
        let targetBegin = GlobalFunctions.addMinutes(copiedEvents[0].eventBegin, minutesDiff + shiftMinutes);
        if (confirm(this.txt['copy_events_to']  + ': ' + this.targetCalendarDayDisplay + ' - ' + formatDate(targetBegin, 'H:mm', this.locale)
        + (shiftMinutes > 0 ? ' ( + ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )': shiftMinutes < 0 ? ' ( - ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )' : '') +'?')) {
          copiedEvents.forEach(_ => {
            _.eventId = 0;
            _.eventBegin = GlobalFunctions.addMinutes(_.eventBegin, minutesDiff + shiftMinutes);
            _.eventEnd = GlobalFunctions.addMinutes(_.eventEnd, minutesDiff + shiftMinutes);
            _.doneId = 0;
          });
        }
        this.eventUpdate.emit({updateType: UpdateType.multipleInsert, event: null, events: copiedEvents});
        // after copying we end selection
        this.selectionSet.emit();
      } else {
        alert(this.txt['notPossible']  + '!')
      }
    } else {
      alert(this.txt['no_date_selected']  + '!')
    }
  }

  public shiftAnotherDay() {
    // first we accept shift if interval is possible at minute of range
    // if target not possible for interval, alert user 'shiftNotPossible'
    if (this.targetCalendarDay) {
      this.targetCalendarDayDisplay = formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale);
    }
    // if no targetCalendarDay and we are planning for today, we suggest tomorrow for shift
    if (!this.targetCalendarDay && this.session.isPlan && GlobalFunctions.isMinuteSame(GlobalFunctions.getStartOfDay(new Date()), this.session.calendarDay) ) {
      const nextDay = GlobalFunctions.addDays(this.session.calendarDay, 1);
      this.targetCalendarDay = nextDay;
      this.targetEvents = GlobalFunctions.buildEvents(this.events, nextDay, false, false);
      this.targetCalendarDayDisplay = this.txt['tomorrow'] + ', ' + formatDate(this.targetCalendarDay, 'EEE d.MM.yyyy', this.locale);
    }
    if (this.targetCalendarDay) {
      const shiftMinutes = this.searchTargetBegin();
      if (shiftMinutes !== undefined && shiftMinutes !== null) {
        let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetCalendarDay) - GlobalFunctions.getDateInMinutes(this.session.calendarDay);
        let shiftedEvents: Event[] = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
        let targetBegin = GlobalFunctions.addMinutes(shiftedEvents[0].eventBegin, minutesDiff + shiftMinutes);
        if (confirm(this.txt['shift_events_to']  + ': ' + this.targetCalendarDayDisplay + ' - ' + formatDate(targetBegin, 'H:mm', this.locale)
        + (shiftMinutes > 0 ? ' ( ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )' : shiftMinutes < 0 ? ' ( - ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )': '') +'?')) {
          shiftedEvents.forEach(_ => {
            _.eventBegin = GlobalFunctions.addMinutes(_.eventBegin, minutesDiff + shiftMinutes,);
            _.eventEnd = GlobalFunctions.addMinutes(_.eventEnd, minutesDiff + shiftMinutes);
          });
        }
        this.eventUpdate.emit({updateType: UpdateType.multipleUpdate, event: null, events: shiftedEvents});
        // after shifting we end selection
        this.selectionSet.emit();
      } else {
        alert(this.txt['notPossible']  + '!')
      }
    } else {
      alert(this.txt['no_date_selected']  + '!')
    }
  }

  public setDone() {
    let doneEvents: Event[] = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
    doneEvents.forEach(_ => {
      if (this.isAllDone) {
        _.doneId = 0;
      } else {
        _.doneId = _.eventId;
      }
    })
    this.eventUpdate.emit({updateType: UpdateType.multipleUpdate, event: null, events: doneEvents});
    // after selecting we end selection
    this.selectionSet.emit();
  }

  /** --------------------------  supporting functions for public methods -------------------------------------------- */


  private shiftEventsBefore(minutes: number) {
    let shiftedEvents: Event[] = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
    shiftedEvents.forEach(_ => {
        _.eventBegin = GlobalFunctions.addMinutes( _.eventBegin, -1 * minutes);
        _.eventEnd = GlobalFunctions.addMinutes(_.eventEnd, -1 * minutes);
    });
    this.eventUpdate.emit({updateType: UpdateType.multipleUpdate, event: null, events: shiftedEvents});
    // after shifting we end selection
    this.selectionSet.emit();
  }

  private shiftEventsAfter(minutes: number) {
    let eventsReverse: Event[] = GlobalFunctions.buildEvents(this.events, this.session.calendarDay, false, false).filter(_ => _.isSelected);
    eventsReverse.reverse().forEach(_ => {
      _.eventBegin = GlobalFunctions.addMinutes(_.eventBegin, minutes);
      _.eventEnd = GlobalFunctions.addMinutes(_.eventEnd, minutes);
    });
    this.eventUpdate.emit({updateType: UpdateType.multipleUpdate, event: null, events: eventsReverse});
    // after shifting we end selection
    this.selectionSet.emit();
  }

}


