import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter} from '@angular/core';

import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { LIGHT_CORAL } from '../../_globals/constants';

import { OptionGroupEventCalendar } from '../../_enums/option-group-event-calendar.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Event } from '../../_db/event';
import { Session } from '../../_db/session';

import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { INumChoice } from '../../_interfaces/i-num-choice';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';



@Component({
  selector: 'dsy-calendar-day-time-change',
  templateUrl: './calendar-day-time-change.html',
  styleUrl: './calendar-day-time-change.css',
  imports: [FormsModule, NgStyle]
})
export class EventDayTimeChangeComponent implements OnInit {

  public name = 'EventDayTimeChangeComponent';

  @Input({required: true}) session: Session;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) eventtxt: { [key: string]: string };

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) opts: IEventOptions;
  @Input({required: true}) userOpts: IUserEventOptions;

  // eventDay can be differnt from opts.eventDay
  @Input({required: true}) eventDay: Date;

  // this is the event the time of which is beeing updated
  @Input({required: true}) event: Event;
  // which time should be updated 1 begin, 2 end, 3 duration
  @Input({required: true}) changeType: number;

  // this view updates only begin, end
  @Output() timeUpdate = new EventEmitter<{updateType: UpdateType, event: Event, id: number}>();
  @Output() cancelTimeChangeView = new EventEmitter<{updateType: UpdateType, event: Event, id: number}>();

  styles: {[key: string]: any} = {};

  constructor(
    private logger: LogService,
    private message: MessageService) { }

  ngOnInit(): void {
    this.loadOptions();
    this.buildTimeChoices();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts') {
        this.buildTimeChoices();
      }
      // console.log('event-day-cards propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }

  }

  /**
   * we load style options
   */
  private loadOptions() {

    this.styles = {
      timeElementOutsideStyle : {
        'background-color': LIGHT_CORAL
      }
    };
    if (this.userOpts && this.options) {
      const area = 'eventCalendar';
      const k = 'timeElementOutsideStyle';
      const isStylesHaveDefault = false;
      // getting style options
      // first we load all option values with the default style
      const enumStringType: { [key: string]: any } = OptionGroupEventCalendar;
      const def = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, 0,
        enumStringType['opt_eventCalendar_' + k], isStylesHaveDefault);
      if (def !== undefined) {
        this.styles[k] = def;
      }
      // then we take style from opts
      const style = this.userOpts.style;
      if (style === undefined || style ===  null || style <= 0 || style > 99) {
        // default option = 00 is already loaded
      } else {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_eventCalendar_' + k], isStylesHaveDefault);
        if (s !== undefined) {
          this.styles[k] = s;
        }
      }
    }
  }

  private dbFailure(operation: string, message: string) {
    this.logger.error(this.session, this.name, `${operation} failed: ${message}`);
    this.message.show(this.name + `: ${operation} failed: ${message}`);
    alert(message);
  }


  private buildTimeChoices() {

    // eventBegin equals eventEnd - should not occur here ...
    if (!GlobalFunctions.isMinuteSame(this.event.eventBegin, this.event.eventEnd)) {
      this.event.cardElement.isEndOnNextDay = this.event.eventEnd.getTime() >= GlobalFunctions.addDays(this.session.eventDay, 1).getTime();
      this.event.cardElement.beginTimeChoices = this.buildBeginTimeChoices(this.event);
      this.event.cardElement.endTimeChoices = this.buildEndTimeChoices(this.event);
      // we auto-correct wrong duration entries in event
      if (this.event.eventDuration !== GlobalFunctions.getDateInMinutes(this.event.eventEnd)
      - GlobalFunctions.getDateInMinutes(this.event.eventBegin)) {
        const operation = 'buildTimeChoices';
        const error = 'duration was invalid in database - corrected';
        this.dbFailure(operation, error);
        this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
        - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
        this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
        this.timeUpdate.emit({updateType: UpdateType.update, event: this.event, id: this.event.eventId});
      }
      this.event.cardElement.durationChoices = this.buildDurationChoices(this.event);
    }

  }


  private buildBeginTimeChoices(event: Event): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // eventBegin - in minutes after day-start
      let eventBegin = event.eventBegin.getHours() * 60 + event.eventBegin.getMinutes();
      // end = latest possible begin of event, must be on this day
      let end = eventBegin + event.cardElement?.spaceAfter;
      // begin = earliest possible begin of event
      let begin =  eventBegin - event.cardElement?.spaceBefore;
      // we assure that begin is on this day - though spaceBefore should be correct and reach max. to day-start
      begin = begin < 0 ? 0 : begin;
      const beginHour = Math.floor(begin / 60);
      const beginMinute = begin - beginHour * 60;
      const slizes = beginMinute === 0 ? 0 : Math.floor(beginMinute / timeSlize) + 1;
      // firstBegin = begin of first timeSlize-block after begin (timeSlize defines blocks after full hour!!)
      let firstBegin = beginHour * 60 + slizes * timeSlize;
      if (begin < firstBegin) {
        timeChoices.push({value: begin, text: GlobalFunctions.getTimeFormatted(begin), isSelected: false})
      }
      // lastBuiltBegin = begin of last timeSlize-block we have built
      let lastBuiltBegin = firstBegin;
      const smallStep = timeSlize < 60 ? timeSlize : 30;
      const wideStep = timeSlize < 60 ? (timeSlize !== 20 ? 30 : 20) : timeSlize;
      end = end >= 24 * 60 ? 24 * 60 - smallStep : end;
      // console.log('smallStep: ', smallStep);
      // console.log('wideStep: ', wideSte);
      for (let minute = firstBegin; minute <= end; minute = minute + smallStep) {
        // we must include eventBegin - we check if it was in prvius slot of minutes !!)
        if (eventBegin < minute && eventBegin > lastBuiltBegin) {
          timeChoices.push({value: eventBegin, text: GlobalFunctions.getTimeFormatted(eventBegin), isSelected: true})
        }
        lastBuiltBegin = minute;
        const minuteOfHour = minute - Math.floor(minute / 60) * 60;
        // in Surrounding: around  eventBegin we show small steps
        const isInSurrounding = Math.abs(eventBegin - minute) < 60;
        // console.log('minute: ', minute);
        // console.log('isInSurrounding: ', isInSurrounding);
        // console.log('minuteOfHour % wideStep: ', minuteOfHour % wideStep);
        // outside of surrounding we show wide steps
        if (minute === firstBegin || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (minute === eventBegin) {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute), isSelected: true})
          } else {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute), isSelected: false})
          }
        }
      }
      // the loop has not been active
      if (firstBegin > end && eventBegin < end) {
        timeChoices.push({value: eventBegin, text: GlobalFunctions.getTimeFormatted(eventBegin), isSelected: true})
        lastBuiltBegin = eventBegin;
      }
      // if end has not been shown
      if (lastBuiltBegin < end && end >= eventBegin) {
        if (eventBegin === end) {
          timeChoices.push({value: eventBegin, text: GlobalFunctions.getTimeFormatted(eventBegin), isSelected: true})
        } else {
          timeChoices.push({value: end, text: GlobalFunctions.getTimeFormatted(end), isSelected: false})
        }
      }
      // if end has been delimted at end of day, an eventually eventBegin after end is shown
      if (eventBegin > end) {
        timeChoices.push({value: eventBegin, text: GlobalFunctions.getTimeFormatted(eventBegin), isSelected: true})
      }
      // we set color for time before startHour
      for (const t of timeChoices) {
        const timeStyle =
          t.value < this.userOpts.startHour * 60  || t.value >= this.userOpts.lastHour * 60 ? this.styles['timeElementOutsideStyle'] : {};
        t.timeStyle = timeStyle;
      }
      return timeChoices;
    } else return null;
  }

  private buildEndTimeChoices(event: Event): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // eventBegin - in minutes after day-start
      let eventBegin = event.eventBegin.getHours() * 60 + event.eventBegin.getMinutes();
      // eventEnd - in minutes after day-start
      const eventEnd = (event.eventEnd.getHours() +
      (GlobalFunctions.isMinuteSameOrEarlier(GlobalFunctions.addDays(this.eventDay, 1), event.eventEnd) ? 24 : 0 )) * 60 + event.eventEnd.getMinutes();
      // end = latest possible end of event - spaceAfter shows time until 0:00 + system constant MAX_INTERVAL_LENGTH
      let end = eventEnd + event.cardElement?.spaceAfter;
      end = end - eventBegin > this.opts.maxIntervalLength ? eventBegin + this.opts.maxIntervalLength : end;
      end = this.opts.isBookingOverMidnight === false && end > 24 * 60 ? 24 * 60 : end;
      // begin = earliest possible end of event
      const begin =  eventBegin + 5;
      const beginHour = Math.floor(begin / 60);
      const beginMinute = begin - beginHour * 60;
      const eventEndHour = Math.floor(eventEnd / 60);
      const eventEndMinute =  eventEnd - eventEndHour * 60;
      let slizes = beginMinute === 0 ? 0 : Math.floor(beginMinute / timeSlize) + 1;
      // firstBegin = first timeSlize after begin, we iterate in timeSlized minutes of full hour
      let firstBegin = beginHour * 60 + slizes * timeSlize;
      if (eventEnd < firstBegin) {
        timeChoices.push({value: eventEnd, text: GlobalFunctions.getTimeFormatted(eventEnd), isSelected: true})
      }
      // lastBuiltEnd = begin of last timeSlize-block we have built
      let lastBuiltEnd = firstBegin;
      const smallStep = timeSlize < 60 ? timeSlize : 30;
      const wideStep = timeSlize < 60 ? (timeSlize !== 20 ? 30 : 20) : timeSlize;
      // console.log('smallStep: ', smallStep);
      // console.log('wideStep: ', wideStep);
      for (let minute = firstBegin; minute <= end; minute = minute + smallStep) {
        // we must include eventEnd - this selection is ok beacause step is > 1 !!)
        if (eventEnd < minute && eventEnd > lastBuiltEnd) {
          timeChoices.push({value: eventEnd, text: GlobalFunctions.getTimeFormatted(eventEnd < 24 * 60 ? eventEnd : (eventEnd - 24 * 60)), isSelected: true})
        }
        lastBuiltEnd = minute;
        const minuteOfHour = minute - Math.floor(minute / 60) * 60;
        // in Surrounding of  eventEnd we show small steps
        const isInSurrounding = Math.abs(eventEnd - minute) < 60;
        // console.log('minute: ', minute);
        // console.log('isInSurrounding: ', isInSurrounding);
        // console.log('minuteOfHour % wideStep: ', minuteOfHour % wideStep);
        // outside of surrounding we show wide steps
        if (minute === firstBegin || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (minute === eventEnd) {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute < 24 * 60 ? minute : (minute - 24 * 60)), isSelected: true})
          } else {
            // TODO format duration as ... min, ... h with local hour, minute
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute < 24 * 60 ? minute : (minute - 24 * 60)) + ' (' +
            GlobalFunctions.getTimeFormatted(minute - eventBegin) + 'h)', isSelected: false})
          }
        }
      }
      if (lastBuiltEnd < end && end >= eventEnd) {
        if (end === eventEnd) {
          timeChoices.push({value: eventEnd, text: GlobalFunctions.getTimeFormatted(eventEnd < 24 * 60 ? eventEnd : (eventEnd - 24 * 60)), isSelected: true})
        } else {
          timeChoices.push({value: end, text: GlobalFunctions.getTimeFormatted(end < 24 * 60 ? end : (end - 24 * 60))  + ' (' +
          GlobalFunctions.getTimeFormatted(end - eventBegin) + 'h)', isSelected: false});
        }
      }
      if (end < eventEnd) {
        timeChoices.push({value: eventEnd, text: GlobalFunctions.getTimeFormatted(eventEnd < 24 * 60 ? eventEnd : (eventEnd - 24 * 60)), isSelected: true})
      }
      // we set color for time after endtHour
      for (const t of timeChoices) {
        const timeStyle =
        t.value < this.userOpts.startHour * 60 || t.value >= this.userOpts.lastHour * 60  ? this.styles['timeElementOutsideStyle'] : {};
        t.timeStyle = timeStyle;
      }
      return timeChoices;
    } else return null;
  }

  private buildDurationChoices(event: Event): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // eventBegin - in minutes after day-start
      const eventBegin = event.eventBegin.getHours() * 60 + event.eventBegin.getMinutes();
      let maxDuration = event.eventDuration + event.cardElement?.spaceAfter;
      maxDuration = maxDuration > this.opts.maxIntervalLength ? this.opts.maxIntervalLength : maxDuration;
      // duration to next day ??!!
      maxDuration  = this.opts.isBookingOverMidnight === false && eventBegin + maxDuration > 24 * 60 ? 24 * 60 - eventBegin: maxDuration;
      let lastBuiltDuration = 0;
      const smallStep = timeSlize < 60 ? timeSlize : 30;
      const wideStep = timeSlize < 60 ? (timeSlize !== 20 ? 30 : 20) : timeSlize;
      // console.log('smallStep: ', smallStep);
      // console.log('wideStep: ', wideStep);
      const beginThreshold = smallStep === 30 ? 20 : smallStep === 20 ? 15 : smallStep;
      // anyway we show 5,10,15 min at begin
      for (let duration = 5; duration < beginThreshold; duration = duration + 5) {
        if (duration === event.eventDuration) {
          timeChoices.push({value: event.eventDuration, text: GlobalFunctions.minutesDisplay(event.eventDuration), isSelected: true})
        } else {
          timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: false})
        }
      }
      // to show the eventDuration as first, if eventDuration was not shown yet
      if (event.eventDuration < smallStep && event.eventDuration >= beginThreshold) {
        timeChoices.push({value: event.eventDuration, text: GlobalFunctions.minutesDisplay(event.eventDuration), isSelected: true})
      }
      for (let duration = smallStep; duration <= maxDuration; duration = duration + smallStep) {
        // to show eventDuration before loop ends
        if (event.eventDuration < duration && event.eventDuration > lastBuiltDuration) {
          timeChoices.push({value: event.eventDuration, text: GlobalFunctions.minutesDisplay(event.eventDuration), isSelected: true})
        }
        lastBuiltDuration = duration;
        const minuteOfHour = duration - Math.floor(duration / 60) * 60;
        const isInSurrounding = duration  < 60 ||  Math.abs(event.eventDuration - duration) < 60;
        // outside of surrounding we show wide steps
        if (duration === 5 || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (duration === event.eventDuration) {
            timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: true})
          } else {
            timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: false})
          }
        }
      }
      if (lastBuiltDuration < maxDuration) {
        // max duration was not element of loop ....
        if (maxDuration === event.eventDuration) {
          // to show eventDuration as last if it equals maxDuration
          timeChoices.push({value: event.eventDuration, text: GlobalFunctions.minutesDisplay(event.eventDuration), isSelected: true})
        } else {
          timeChoices.push({value: maxDuration, text: GlobalFunctions.minutesDisplay(maxDuration), isSelected: false})
        }
      }
       // we set color for time after endtHour
       for (const t of timeChoices) {
        const timeStyle =
        eventBegin + t.value  >= this.userOpts.lastHour * 60  ? this.styles['timeElementOutsideStyle'] : {};
        t.timeStyle = timeStyle;
      }
      return timeChoices;
    } else return null;
  }

   /** ------------------------  public methods --------------------------------------------------- */

   public updateEventBegin(event: any) {
    this.event.cardElement.beginTimeChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onBeginTimeChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }

  public updateEventEnd(event: any) {
    this.event.cardElement.endTimeChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onEndTimeChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }


  public updateDuration(event: any) {
    this.event.cardElement.durationChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onDurationChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }

  public cancel() {
      this.cancelTimeChangeView.emit({updateType: UpdateType.cancelUpdate, event: this.event, id: this.event.eventId});
  }

   /**
   * onBeginTimeChanged sets beginTime and - if necessary - end Time
   * (with same duration as before - except there is another next event)
   * @param minute - minute after day-start as beginTime
   */
  public onBeginTimeChanged(minute: number): void {
    const  begin: Date = GlobalFunctions.addMinutes(this.eventDay, minute);
    // first, we try to set eventEnd to the end of the former duration -  to keep uration as it was
    const  end: Date = GlobalFunctions.addMinutes(begin, this.event.eventDuration);
    this.updateEventCardBeginEnd(begin, end);
  }


  /**
   * onEndTimeChanged sets endTime (in consecutive procedures, also event duration is set)
   * leaving beginTime unchanged
   * @param minute - minute after day-start
   */
  public onEndTimeChanged(minute: number): void {
    const begin = this.event.eventBegin;
    const end: Date = GlobalFunctions.addMinutes(this.eventDay, minute);
    this.updateEventCardBeginEnd(begin, end);
  }

  /**
   * onDurationChanged sets duration (via setting eventEnd)
   * leaving beginTime unchanged
   * @param duration - duration in minutes
   */
  public onDurationChanged(duration: number): void {
    const begin = this.event.eventBegin;
    const end: Date = GlobalFunctions.addMinutes(begin, duration);
    this.updateEventCardBeginEnd(begin, end);
  }

  /** --------------------------  supporting functions for public methods -------------------------------------------- */


  private updateEventCardBeginEnd(begin: Date, end: Date) {
    this.event.eventBegin = begin;
    if (!this.opts.isBookingOverMidnight && GlobalFunctions.isMinuteSameOrEarlier(GlobalFunctions.addDays(this.session.eventDay, 1), end)) {
      end = GlobalFunctions.addDays(this.session.eventDay, 1);
    }
    this.event.eventEnd = end;
    this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
    - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
    this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
    this.buildTimeChoices();
    this.timeUpdate.emit({updateType: UpdateType.update, event: this.event, id: this.event.eventId});
  }

}

