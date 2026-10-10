import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter} from '@angular/core';

import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { LIGHT_CORAL } from '../../_globals/constants';

import { OptionGroupWorkCalendar } from '../../_enums/option-group-work-calendar.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Work } from '../../_db/work';
import { Session } from '../../_db/session';

import { IWorkOptions } from '../../_interfaces/i-work-options';
import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';
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
export class WorkDayTimeChangeComponent implements OnInit {

  public name = 'WorkDayTimeChangeComponent';

  @Input({required: true}) session: Session;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) opts: IWorkOptions;
  @Input({required: true}) userOpts: IUserWorkOptions;

  // workDay can be differnt from opts.workDay
  @Input({required: true}) workDay: Date;

  // this is the work the time of which is beeing updated
  @Input({required: true}) work: Work;
  // which time should be updated 1 begin, 2 end, 3 duration
  @Input({required: true}) changeType: number;

  // this view updates only begin, end
  @Output() timeUpdate = new EventEmitter<{updateType: UpdateType, work: Work, id: number}>();
  @Output() cancelTimeChangeView = new EventEmitter<{updateType: UpdateType, work: Work, id: number}>();

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
      // console.log('work-day-cards propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
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
      const area = 'workCalendar';
      const k = 'timeElementOutsideStyle';
      const isStylesHaveDefault = false;
      // getting style options
      // first we load all option values with the default style
      const enumStringType: { [key: string]: any } = OptionGroupWorkCalendar;
      const def = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, 0,
        enumStringType['opt_workCalendar_' + k], isStylesHaveDefault);
      if (def !== undefined) {
        this.styles[k] = def;
      }
      // then we take style from opts
      const style = this.userOpts.style;
      if (style === undefined || style ===  null || style <= 0 || style > 99) {
        // default option = 00 is already loaded
      } else {
        const s = ConfigurationOptionBasicFunctions.getStyleOptionSeq(this.options, area, style,
          enumStringType['opt_workCalendar_' + k], isStylesHaveDefault);
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

    // workBegin equals workEnd - should not occur here ...
    if (!GlobalFunctions.isMinuteSame(this.work.workBegin, this.work.workEnd)) {
      this.work.cardElement.isEndOnNextDay = this.work.workEnd.getTime() >= GlobalFunctions.addDays(this.session.workDay, 1).getTime();
      this.work.cardElement.beginTimeChoices = this.buildBeginTimeChoices(this.work);
      this.work.cardElement.endTimeChoices = this.buildEndTimeChoices(this.work);
      // we auto-correct wrong duration entries in work
      if (this.work.workDuration !== GlobalFunctions.getDateInMinutes(this.work.workEnd)
      - GlobalFunctions.getDateInMinutes(this.work.workBegin)) {
        const operation = 'buildTimeChoices';
        const error = 'duration was invalid in database - corrected';
        this.dbFailure(operation, error);
        this.work.workDuration = GlobalFunctions.getDateInMinutes(this.work.workEnd)
        - GlobalFunctions.getDateInMinutes(this.work.workBegin);
        this.work.cardElement.workDurationDisplay = GlobalFunctions.minutesDisplay(this.work.workDuration);
        this.timeUpdate.emit({updateType: UpdateType.update, work: this.work, id: this.work.workId});
      }
      this.work.cardElement.durationChoices = this.buildDurationChoices(this.work);
    }

  }


  private buildBeginTimeChoices(work: Work): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // workBegin - in minutes after day-start
      let workBegin = work.workBegin.getHours() * 60 + work.workBegin.getMinutes();
      // end = latest possible begin of work, must be on this day
      let end = workBegin + work.cardElement?.spaceAfter;
      // begin = earliest possible begin of work
      let begin =  workBegin - work.cardElement?.spaceBefore;
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
        // we must include workBegin - we check if it was in prvius slot of minutes !!)
        if (workBegin < minute && workBegin > lastBuiltBegin) {
          timeChoices.push({value: workBegin, text: GlobalFunctions.getTimeFormatted(workBegin), isSelected: true})
        }
        lastBuiltBegin = minute;
        const minuteOfHour = minute - Math.floor(minute / 60) * 60;
        // in Surrounding: around  workBegin we show small steps
        const isInSurrounding = Math.abs(workBegin - minute) < 60;
        // console.log('minute: ', minute);
        // console.log('isInSurrounding: ', isInSurrounding);
        // console.log('minuteOfHour % wideStep: ', minuteOfHour % wideStep);
        // outside of surrounding we show wide steps
        if (minute === firstBegin || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (minute === workBegin) {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute), isSelected: true})
          } else {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute), isSelected: false})
          }
        }
      }
      // the loop has not been active
      if (firstBegin > end && workBegin < end) {
        timeChoices.push({value: workBegin, text: GlobalFunctions.getTimeFormatted(workBegin), isSelected: true})
        lastBuiltBegin = workBegin;
      }
      // if end has not been shown
      if (lastBuiltBegin < end && end >= workBegin) {
        if (workBegin === end) {
          timeChoices.push({value: workBegin, text: GlobalFunctions.getTimeFormatted(workBegin), isSelected: true})
        } else {
          timeChoices.push({value: end, text: GlobalFunctions.getTimeFormatted(end), isSelected: false})
        }
      }
      // if end has been delimted at end of day, an eventually workBegin after end is shown
      if (workBegin > end) {
        timeChoices.push({value: workBegin, text: GlobalFunctions.getTimeFormatted(workBegin), isSelected: true})
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

  private buildEndTimeChoices(work: Work): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // workBegin - in minutes after day-start
      let workBegin = work.workBegin.getHours() * 60 + work.workBegin.getMinutes();
      // workEnd - in minutes after day-start
      const workEnd = (work.workEnd.getHours() +
      (GlobalFunctions.isMinuteSameOrEarlier(GlobalFunctions.addDays(this.workDay, 1), work.workEnd) ? 24 : 0 )) * 60 + work.workEnd.getMinutes();
      // end = latest possible end of work - spaceAfter shows time until 0:00 + system constant MAX_INTERVAL_LENGTH
      let end = workEnd + work.cardElement?.spaceAfter;
      end = end - workBegin > this.opts.maxIntervalLength ? workBegin + this.opts.maxIntervalLength : end;
      end = this.opts.isBookingOverMidnight === false && end > 24 * 60 ? 24 * 60 : end;
      // begin = earliest possible end of work
      const begin =  workBegin + 5;
      const beginHour = Math.floor(begin / 60);
      const beginMinute = begin - beginHour * 60;
      const workEndHour = Math.floor(workEnd / 60);
      const workEndMinute =  workEnd - workEndHour * 60;
      let slizes = beginMinute === 0 ? 0 : Math.floor(beginMinute / timeSlize) + 1;
      // firstBegin = first timeSlize after begin, we iterate in timeSlized minutes of full hour
      let firstBegin = beginHour * 60 + slizes * timeSlize;
      if (workEnd < firstBegin) {
        timeChoices.push({value: workEnd, text: GlobalFunctions.getTimeFormatted(workEnd), isSelected: true})
      }
      // lastBuiltEnd = begin of last timeSlize-block we have built
      let lastBuiltEnd = firstBegin;
      const smallStep = timeSlize < 60 ? timeSlize : 30;
      const wideStep = timeSlize < 60 ? (timeSlize !== 20 ? 30 : 20) : timeSlize;
      // console.log('smallStep: ', smallStep);
      // console.log('wideStep: ', wideStep);
      for (let minute = firstBegin; minute <= end; minute = minute + smallStep) {
        // we must include workEnd - this selection is ok beacause step is > 1 !!)
        if (workEnd < minute && workEnd > lastBuiltEnd) {
          timeChoices.push({value: workEnd, text: GlobalFunctions.getTimeFormatted(workEnd < 24 * 60 ? workEnd : (workEnd - 24 * 60)), isSelected: true})
        }
        lastBuiltEnd = minute;
        const minuteOfHour = minute - Math.floor(minute / 60) * 60;
        // in Surrounding of  workEnd we show small steps
        const isInSurrounding = Math.abs(workEnd - minute) < 60;
        // console.log('minute: ', minute);
        // console.log('isInSurrounding: ', isInSurrounding);
        // console.log('minuteOfHour % wideStep: ', minuteOfHour % wideStep);
        // outside of surrounding we show wide steps
        if (minute === firstBegin || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (minute === workEnd) {
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute < 24 * 60 ? minute : (minute - 24 * 60)), isSelected: true})
          } else {
            // TODO format duration as ... min, ... h with local hour, minute
            timeChoices.push({value: minute, text: GlobalFunctions.getTimeFormatted(minute < 24 * 60 ? minute : (minute - 24 * 60)) + ' (' +
            GlobalFunctions.getTimeFormatted(minute - workBegin) + 'h)', isSelected: false})
          }
        }
      }
      if (lastBuiltEnd < end && end >= workEnd) {
        if (end === workEnd) {
          timeChoices.push({value: workEnd, text: GlobalFunctions.getTimeFormatted(workEnd < 24 * 60 ? workEnd : (workEnd - 24 * 60)), isSelected: true})
        } else {
          timeChoices.push({value: end, text: GlobalFunctions.getTimeFormatted(end < 24 * 60 ? end : (end - 24 * 60))  + ' (' +
          GlobalFunctions.getTimeFormatted(end - workBegin) + 'h)', isSelected: false});
        }
      }
      if (end < workEnd) {
        timeChoices.push({value: workEnd, text: GlobalFunctions.getTimeFormatted(workEnd < 24 * 60 ? workEnd : (workEnd - 24 * 60)), isSelected: true})
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

  private buildDurationChoices(work: Work): Array<INumChoice> {
    if (this.userOpts.timeSlize > 0) {
      const timeChoices: Array<INumChoice> = [];
      const timeSlize: number  = this.userOpts.timeSlize && Number(this.userOpts.timeSlize) >= 5 && 60 % Number(this.userOpts.timeSlize) === 0 ? Number(this.userOpts.timeSlize) : 5;
      // workBegin - in minutes after day-start
      const workBegin = work.workBegin.getHours() * 60 + work.workBegin.getMinutes();
      let maxDuration = work.workDuration + work.cardElement?.spaceAfter;
      maxDuration = maxDuration > this.opts.maxIntervalLength ? this.opts.maxIntervalLength : maxDuration;
      // duration to next day ??!!
      maxDuration  = this.opts.isBookingOverMidnight === false && workBegin + maxDuration > 24 * 60 ? 24 * 60 - workBegin: maxDuration;
      let lastBuiltDuration = 0;
      const smallStep = timeSlize < 60 ? timeSlize : 30;
      const wideStep = timeSlize < 60 ? (timeSlize !== 20 ? 30 : 20) : timeSlize;
      // console.log('smallStep: ', smallStep);
      // console.log('wideStep: ', wideStep);
      const beginThreshold = smallStep === 30 ? 20 : smallStep === 20 ? 15 : smallStep;
      // anyway we show 5,10,15 min at begin
      for (let duration = 5; duration < beginThreshold; duration = duration + 5) {
        if (duration === work.workDuration) {
          timeChoices.push({value: work.workDuration, text: GlobalFunctions.minutesDisplay(work.workDuration), isSelected: true})
        } else {
          timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: false})
        }
      }
      // to show the workDuration as first, if workDuration was not shown yet
      if (work.workDuration < smallStep && work.workDuration >= beginThreshold) {
        timeChoices.push({value: work.workDuration, text: GlobalFunctions.minutesDisplay(work.workDuration), isSelected: true})
      }
      for (let duration = smallStep; duration <= maxDuration; duration = duration + smallStep) {
        // to show workDuration before loop ends
        if (work.workDuration < duration && work.workDuration > lastBuiltDuration) {
          timeChoices.push({value: work.workDuration, text: GlobalFunctions.minutesDisplay(work.workDuration), isSelected: true})
        }
        lastBuiltDuration = duration;
        const minuteOfHour = duration - Math.floor(duration / 60) * 60;
        const isInSurrounding = duration  < 60 ||  Math.abs(work.workDuration - duration) < 60;
        // outside of surrounding we show wide steps
        if (duration === 5 || minuteOfHour % wideStep === 0 || isInSurrounding) {
          if (duration === work.workDuration) {
            timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: true})
          } else {
            timeChoices.push({value: duration, text: GlobalFunctions.minutesDisplay(duration), isSelected: false})
          }
        }
      }
      if (lastBuiltDuration < maxDuration) {
        // max duration was not element of loop ....
        if (maxDuration === work.workDuration) {
          // to show workDuration as last if it equals maxDuration
          timeChoices.push({value: work.workDuration, text: GlobalFunctions.minutesDisplay(work.workDuration), isSelected: true})
        } else {
          timeChoices.push({value: maxDuration, text: GlobalFunctions.minutesDisplay(maxDuration), isSelected: false})
        }
      }
       // we set color for time after endtHour
       for (const t of timeChoices) {
        const timeStyle =
        workBegin + t.value  >= this.userOpts.lastHour * 60  ? this.styles['timeElementOutsideStyle'] : {};
        t.timeStyle = timeStyle;
      }
      return timeChoices;
    } else return null;
  }

   /** ------------------------  public methods --------------------------------------------------- */

   public updateWorkBegin(event: any) {
    this.work.cardElement.beginTimeChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onBeginTimeChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }

  public updateWorkEnd(event: any) {
    this.work.cardElement.endTimeChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onEndTimeChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }


  public updateDuration(event: any) {
    this.work.cardElement.durationChoices.forEach(_ => {
      if (_.value  === Number(event.target.value)) {
        _.isSelected = true;
        this.onDurationChanged(_.value);
      } else {
        _.isSelected = false;
      }
    });
  }

  public cancel() {
      this.cancelTimeChangeView.emit({updateType: UpdateType.cancelUpdate, work: this.work, id: this.work.workId});
  }

   /**
   * onBeginTimeChanged sets beginTime and - if necessary - end Time
   * (with same duration as before - except there is another next work)
   * @param minute - minute after day-start as beginTime
   */
  public onBeginTimeChanged(minute: number): void {
    const  begin: Date = GlobalFunctions.addMinutes(this.workDay, minute);
    // first, we try to set workEnd to the end of the former duration -  to keep uration as it was
    const  end: Date = GlobalFunctions.addMinutes(begin, this.work.workDuration);
    this.updateWorkCardBeginEnd(begin, end);
  }


  /**
   * onEndTimeChanged sets endTime (in consecutive procedures, also work duration is set)
   * leaving beginTime unchanged
   * @param minute - minute after day-start
   */
  public onEndTimeChanged(minute: number): void {
    const begin = this.work.workBegin;
    const end: Date = GlobalFunctions.addMinutes(this.workDay, minute);
    this.updateWorkCardBeginEnd(begin, end);
  }

  /**
   * onDurationChanged sets duration (via setting workEnd)
   * leaving beginTime unchanged
   * @param duration - duration in minutes
   */
  public onDurationChanged(duration: number): void {
    const begin = this.work.workBegin;
    const end: Date = GlobalFunctions.addMinutes(begin, duration);
    this.updateWorkCardBeginEnd(begin, end);
  }

  /** --------------------------  supporting functions for public methods -------------------------------------------- */


  private updateWorkCardBeginEnd(begin: Date, end: Date) {
    this.work.workBegin = begin;
    if (!this.opts.isBookingOverMidnight && GlobalFunctions.isMinuteSameOrEarlier(GlobalFunctions.addDays(this.session.workDay, 1), end)) {
      end = GlobalFunctions.addDays(this.session.workDay, 1);
    }
    this.work.workEnd = end;
    this.work.workDuration = GlobalFunctions.getDateInMinutes(this.work.workEnd)
    - GlobalFunctions.getDateInMinutes(this.work.workBegin);
    this.work.cardElement.workDurationDisplay = GlobalFunctions.minutesDisplay(this.work.workDuration);
    this.buildTimeChoices();
    this.timeUpdate.emit({updateType: UpdateType.update, work: this.work, id: this.work.workId});
  }

}

