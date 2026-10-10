import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange } from '@angular/core';
import { formatDate, NgStyle, NgClass } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';

import { UpdateType } from '../../_enums/update-type.enum';
import { WorkType } from '../../_enums/work-type.enum';

import { Work } from '../../_db/work';
import { Session } from '../../_db/session';

import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';

@Component({
  selector: 'dsy-calendar-day-time-shift-view',
  templateUrl: './calendar-day-time-shift-view.html',
  styleUrl: './calendar-day-time-shift-view.css',
  imports: [NgStyle, NgClass]
})
export class WorkDayTimeShiftViewComponent implements OnInit {

  public name = 'WorkDayTimeShiftViewComponent';

  @Input({required: true}) session: Session;

  // in the moment locale is irrelevant for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) userOpts: IUserWorkOptions;

  @Input({required: true}) timeZoneIdentifier: string;

  // day of work - 00:00 in browser timezone
  // can be selected by user
  // workDay is in opts @Input({required: true}) workDay: Date;
  workDayDisplay = '';
  dateString = '';

  isAfterToday = false;
  isBeforeToday = false;
  isBeforeYesterday = false;

  // all works of work-day - dependent of opts.isPlan. Selected works have isSelected = true
  @Input({required: true}) works: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;


  // independent of opts.isPlan we get actualWorks to check the function copyPlanToWork
  @Input({required: true}) actualWorks: Array<Work>;

  // if selected works are to be shifted to another date we use targetWorks and targetWorkDay
  @Input({required: true}) targetWorks: Array<Work>;
  @Input({required: true}) targetWorkDay: Date;

  @Output() timeShiftCancel = new EventEmitter();
  // in case of shift to another day we update only work begin, work end - in case of copyToActual we transfer whole information
  @Output() workUpdate = new EventEmitter<{updateType: UpdateType, work: Work, works?: Array<Work>}>();

  @Output() selectionSet = new EventEmitter();

  directSpaceBefore: number;
  directSpaceAfter: number;
  shiftSpaceBefore: number;
  shiftSpaceAfter: number;

  isCopyToActual: boolean;
  isNoneDone: boolean;
  isAllDone: boolean;

  shiftActualDisplay = '';
  shiftPlanDisplay = '';
  copyPlanDisplay = '';
  targetWorkDayDisplay = '';

  rowTopNoPaddingStyle = {
    'padding-top': '0'
  }

  constructor() {
   }

  ngOnInit(): void {
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'works' || propKey === 'actualWorks' || propKey === 'targetWorkDay'  || propKey === 'worksChangeCounter') {
        if (this.works && this.works.length > 0) {
          this.buildShiftChoices();
        }
      }
    }
  }

  private buildShiftChoices() {
    const today = GlobalFunctions.getStartOfDay(new Date());
    const tomorrow = GlobalFunctions.addDays(today, 1);
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.session.workDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
    // in the moment we do not use isBeforeToday
    this.isBeforeToday = GlobalFunctions.getDateInMinutes(this.session.workDay) < GlobalFunctions.getDateInMinutes(today);
    // in the moment we use isBeforeYesterday to prohibit shifting planWorks
    // TODO days before might be based on a new option
    const yesterday = GlobalFunctions.addDays(today, -1);
    this.isBeforeYesterday = GlobalFunctions.getDateInMinutes(this.session.workDay) < GlobalFunctions.getDateInMinutes(yesterday);
    this.shiftActualDisplay = this.targetWorkDay ? formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale) : this.txt['no_date_selected'];
    this.shiftPlanDisplay = this.targetWorkDay ? formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale) :
      GlobalFunctions.isMinuteSame(today, this.session.workDay) ? this.txt['to_tomorrow'] : this.txt['no_date_selected'];
    this.copyPlanDisplay = this.targetWorkDay ? formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale) :
      GlobalFunctions.isMinuteSame(today, this.session.workDay) ? this.txt['to_today'] : this.txt['no_date_selected'];
    let rangeBegin: Date;
    let spaceBefore: number;
    let rangeEnd: Date;
    let spaceAfter: number;
    // we assure that works  consists only of work of day before, which reaches into this day,
    // and first work on next day
    const allWorks = GlobalFunctions.buildWorks(this.works, this.session.workDay, true, true);
    allWorks.forEach(_ => {
      if (_.isSelected && !rangeBegin) {
        rangeBegin = _.workBegin;
        spaceBefore = GlobalFunctions.getSpaceBefore(_.workBegin, allWorks, this.session.workDay);
      }
      if (_.isSelected && rangeBegin) {
        rangeEnd = _.workEnd;
        // if there is no work after, spaceAfter is calculated as end of this day + MAX_INTERVAL_SIZE
        spaceAfter = GlobalFunctions.getSpaceAfter(_.workEnd, allWorks, this.session.workDay);
        const minuteBegin =  GlobalFunctions.getDateInMinutes(_.workBegin) - GlobalFunctions.getDateInMinutes(this.session.workDay);
        // if we shift, if workEnd is already at next day, the sapce must not lead to workBegin at next day
        //  else (workend is at this day) workEnd must stay at this day
        spaceAfter = minuteBegin + _.workDuration <= 24 * 60 && minuteBegin + _.workDuration + spaceAfter >  24 * 60
        ? 24 * 60 - minuteBegin - _.workDuration
        : minuteBegin + spaceAfter > 24 * 60
        ? 24 * 60 - minuteBegin
        : spaceAfter;
      }
    })
    // console.log('rangeBegin', rangeBegin);
    // console.log('rangeEnd', rangeEnd);
    // console.log('spaceBefore work:', spaceBefore);
    // console.log('spaceAfter work:', spaceAfter);

    const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);

    const beginAfterStartHour = GlobalFunctions.getDateInMinutes(rangeBegin)
    - GlobalFunctions.getDateInMinutes(this.session.workDay) - this.userOpts.startHour * 60;
    const endAfterLastHour = GlobalFunctions.getDateInMinutes(rangeEnd)
    - GlobalFunctions.getDateInMinutes(this.session.workDay) - this.userOpts.lastHour * 60;

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

    // for shift before (= before work which is before selected works)
    const earlierBegin = GlobalFunctions.getPreviousBegin(rangeBegin, rangeDuration, allWorks, this.session.workDay);
    this.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(rangeBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
    // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

    // for shift after (= after work which is after selected works)
    const laterBegin = GlobalFunctions.getNextBegin(rangeBegin, rangeDuration, allWorks, this.session.workDay);
    this.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(rangeBegin) : 0;
    // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

    // checking copy plan to actual
    this.isCopyToActual = this.works.filter(_ => _.isSelected
      // copying is managed correctly by copy plan to actual and eventually not all can be copied.
    ).length > 0;

    // isNoneDone - none of the selected works is done shift not possible if planWork is done
    this.isNoneDone = this.works.filter(_ => _.isSelected && _.doneId > 0).length === 0;
    this.isAllDone = this.works.filter(_ => _.isSelected && _.doneId === 0).length === 0;
  }

  // returns minutes later (pr earlier, if negative) for a begin (relative to rangeBegin) in targetWorks
  // returns 0 if rangeBegin is unchanged, return null if no begin is possible
  private searchTargetBegin(): number {
    // ramgBegin rangeEnd are begin and end of range at target day
    let rangeBegin: Date;
    let lastElementBegin: Date;
    let rangeEnd: Date;
    // we take begin and end at source day
    const allWorks = GlobalFunctions.buildWorks(this.works, this.session.workDay, true, false);
    allWorks.forEach(_ => {
      if (_.isSelected && !rangeBegin) {
        rangeBegin = _.workBegin;
      }
      if (_.isSelected && rangeBegin) {
        lastElementBegin = _.workBegin;
        rangeEnd = _.workEnd;
      }
    })
    let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetWorkDay) - GlobalFunctions.getDateInMinutes(this.session.workDay);
    // now we have begin and end at target day
    rangeBegin = GlobalFunctions.addMinutes(rangeBegin, minutesDiff);
    rangeEnd = GlobalFunctions.addMinutes(rangeEnd, minutesDiff);
    lastElementBegin = GlobalFunctions.addMinutes(lastElementBegin, minutesDiff);
    const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
    // 1. we check if we can leave begin unchanged
    if (this.targetWorks.filter(_ => _.workBegin <= rangeBegin && _.workEnd > rangeBegin).length === 0
      && this.targetWorks.filter(_ => _.workBegin < rangeEnd && _.workEnd >= rangeEnd).length === 0
      && this.targetWorks.filter(_ => _.workBegin > rangeBegin && _.workEnd < rangeEnd).length === 0) {
      return 0;
    }
    // 2. we check if the space  before and after begin is enough to place whole range
    // so we would get earlier begin - this we do before we check later begin, bu not if we copy at today
    const spaceBefore = GlobalFunctions.getSpaceBefore(rangeBegin,this.targetWorks,this.targetWorkDay);
    const spaceAfter = GlobalFunctions.getSpaceAfter(rangeBegin,this.targetWorks,this.targetWorkDay);
    if (spaceBefore + spaceAfter >= rangeDuration
      && !GlobalFunctions.isMinuteSame(this.targetWorkDay, this.session.workDay)) {
      // we need no check for same/next day bacause here we get earlier
        return spaceAfter - rangeDuration;
    } else {
      // 3. if  begin is covered by a work, we try if spaceAfter end of this work is OK
      const workAtBegin = this.targetWorks.find(_ => _.workBegin <= rangeBegin && _.workEnd > rangeBegin);
      if (workAtBegin) {
        const spaceAfterWorkAtBegin = GlobalFunctions.getSpaceAfter(workAtBegin.workEnd, this.targetWorks,this.targetWorkDay);
        const shiftAtBegin = GlobalFunctions.getDateInMinutes(workAtBegin.workEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
        if (spaceAfterWorkAtBegin >= rangeDuration
        && GlobalFunctions.getDateInMinutes(lastElementBegin) - GlobalFunctions.getDateInMinutes(this.targetWorkDay) + shiftAtBegin < 24 * 60) {
          return shiftAtBegin;
        }
      }
      // 4. if not, maybe we can shift after a next work
      const laterDate = GlobalFunctions.getNextBegin(rangeBegin, rangeDuration, this.targetWorks,this.targetWorkDay);
      if (laterDate) {
        return GlobalFunctions.getDateInMinutes(laterDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
      }
    }
    // 5. here we are if we must shift earlier - first we try method 2. at workDay
    if (spaceBefore + spaceAfter >= rangeDuration) {
        return spaceAfter - rangeDuration;
    }
    // 6. if not, maybe we can shift before a previous work
    const earlierDate = GlobalFunctions.getPreviousBegin(rangeBegin, rangeDuration, this.targetWorks,this.targetWorkDay);
    if (earlierDate) {
      return GlobalFunctions.getDateInMinutes(earlierDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
    }
    // 7. no possibilty to place range at target
    return null;
  }

  /** ------------------------  public methods --------------------------------------------------- */


  public shiftBefore() {
    this.shiftWorksBefore(this.shiftSpaceBefore);
  }

  public shiftAfter() {
    this.shiftWorksAfter(this.shiftSpaceAfter);
  }

  public shiftEarlier() {
    this.shiftWorksBefore(this.directSpaceBefore);
  }

  public shiftLater() {
    this.shiftWorksAfter(this.directSpaceAfter);
  }

  public copyToActual() {
    let plannedWorkBegin = this.works[0].workBegin;
    let isAllPlannedCopied = true;
    const copiedWorks: Array<Work> = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
    let newWorks: Array<Work> = [];
    for (const _ of copiedWorks) {
      if (isAllPlannedCopied) {
        const workCanBegin = GlobalFunctions.getDateInMinutes(plannedWorkBegin) > GlobalFunctions.getDateInMinutes(_.workBegin)
        ? plannedWorkBegin
        : _.workBegin;
        // check if there is no other actual work overlapping workBegin of (eventually) generated new actual
        if (this.actualWorks.filter(actual => actual.workBegin <= workCanBegin && actual.workEnd > workCanBegin).length === 0) {
          let newWorkDuration = 0;
          // spaceAfter is the max. length for copied work
          const spaceAfter = GlobalFunctions.getSpaceAfter(workCanBegin, this.actualWorks, this.session.workDay);
          newWorkDuration = spaceAfter > _.workDuration ? _.workDuration : spaceAfter;
          if (newWorkDuration >= 5) {
            const newWork: Work = GlobalFunctions.clone(_);
            // new copied work starts at same time as planned work or directly after lat copied work
            newWork.workId = 0;
            newWork.workBegin = workCanBegin;
            newWork.workDuration = newWorkDuration;
            newWork.type = WorkType.actual;
            newWork.doneId = 0;
            newWork.planId = _.workId;
            newWork.workEnd = GlobalFunctions.addMinutes(newWork.workBegin, newWorkDuration);
            newWorks.push(newWork);
            // next copied work can begin here
            plannedWorkBegin = newWork.workEnd;
          } else {
            isAllPlannedCopied = false;
          }
        // there is work which overlaps begin
        } else {
          // we fix the actual work which overlaps planned workBegin
          let newWorkDuration = 0;
          let actualWork = GlobalFunctions.getPreviousWork(this.actualWorks, workCanBegin);
          if (!actualWork) {
            actualWork = GlobalFunctions.getNextWork(this.actualWorks, workCanBegin);
          }
          // previousActualWork is checked to assure previousActualWork ....
          if (actualWork && GlobalFunctions.getDateInMinutes(actualWork.workBegin) <= GlobalFunctions.getDateInMinutes(_.workBegin)) {
            let isSearchNext = true;
            for (let index = 0; isSearchNext; index++) {
              let spaceAfter = GlobalFunctions.getSpaceAfter(actualWork.workEnd, this.actualWorks, this.session.workDay);
              // it is possible that spaceAfter is 0, due to directly follwing next work ...
              if (spaceAfter >= 5) {
                isSearchNext = false;
                newWorkDuration = spaceAfter > _.workDuration ? _.workDuration : spaceAfter;
              } else {
                actualWork = GlobalFunctions.getNextWork(this.actualWorks, actualWork.workEnd);
                if (!actualWork || index > 100) {
                  isSearchNext = false;
                }
              }
            }
          }
          // min. timeSlize in our system is 5 min
          if (newWorkDuration >= 5  ) {
            const newWork: Work = GlobalFunctions.clone(_);
            newWork.workId = 0;
            newWork.workDuration = newWorkDuration;
            newWork.type = WorkType.actual;
            newWork.planId = _.workId;
            newWork.doneId = 0;
            newWork.workBegin = actualWork.workEnd;
            newWork.workEnd = GlobalFunctions.addMinutes(newWork.workBegin, newWorkDuration);
            newWorks.push(newWork);
            // next copied work can begin here
            plannedWorkBegin = newWork.workEnd;
          } else {
            isAllPlannedCopied = false;
          }
        }
      }
    }
    if (isAllPlannedCopied) {
      this.workUpdate.emit({updateType: UpdateType.copyPlanToActual, work: null, works: newWorks});
    } else {
      alert(this.txt['not'] + ' ' + this.txt['all_are_copied']  + '!')
    }
    // after copying we end selection
    this.selectionSet.emit();
  }

  public copyPlan() {
    if (this.targetWorkDay) {
      this.targetWorkDayDisplay = formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale);
    }
    // if no target, and we are at today, we use today if we plan for today
    if (!this.targetWorkDay && GlobalFunctions.isMinuteSame(GlobalFunctions.getStartOfDay(new Date()), this.session.workDay)) {
      this.targetWorkDay = this.session.workDay;
      this.targetWorks = GlobalFunctions.buildWorks(this.works, this.session.workDay, true, false);
      this.targetWorkDayDisplay = this.txt['today'] + ', ' + formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale);
    }
    // we search a possible target range
    // if target not possible for interval, alert user 'copyNotPossible'
    if (this.targetWorkDay) {
      const shiftMinutes = this.searchTargetBegin();
      if (shiftMinutes !== undefined && shiftMinutes !== null) {
        let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetWorkDay) - GlobalFunctions.getDateInMinutes(this.session.workDay);
        let copiedWorks: Work[] = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
        let targetBegin = GlobalFunctions.addMinutes(copiedWorks[0].workBegin, minutesDiff + shiftMinutes);
        if (confirm(this.txt['copy_works_to']  + ': ' + this.targetWorkDayDisplay + ' - ' + formatDate(targetBegin, 'H:mm', this.locale)
        + (shiftMinutes > 0 ? ' ( + ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )': shiftMinutes < 0 ? ' ( - ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )' : '') +'?')) {
          copiedWorks.forEach(_ => {
            _.workId = 0;
            _.workBegin = GlobalFunctions.addMinutes(_.workBegin, minutesDiff + shiftMinutes);
            _.workEnd = GlobalFunctions.addMinutes(_.workEnd, minutesDiff + shiftMinutes);
            _.doneId = 0;
          });
        }
        this.workUpdate.emit({updateType: UpdateType.multipleInsert, work: null, works: copiedWorks});
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
    if (this.targetWorkDay) {
      this.targetWorkDayDisplay = formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale);
    }
    // if no targetWorkDay and we are planning for today, we suggest tomorrow for shift
    if (!this.targetWorkDay && this.session.isPlan && GlobalFunctions.isMinuteSame(GlobalFunctions.getStartOfDay(new Date()), this.session.workDay) ) {
      const nextDay = GlobalFunctions.addDays(this.session.workDay, 1);
      this.targetWorkDay = nextDay;
      this.targetWorks = GlobalFunctions.buildWorks(this.works, nextDay, false, false);
      this.targetWorkDayDisplay = this.txt['tomorrow'] + ', ' + formatDate(this.targetWorkDay, 'EEE d.MM.yyyy', this.locale);
    }
    if (this.targetWorkDay) {
      const shiftMinutes = this.searchTargetBegin();
      if (shiftMinutes !== undefined && shiftMinutes !== null) {
        let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetWorkDay) - GlobalFunctions.getDateInMinutes(this.session.workDay);
        let shiftedWorks: Work[] = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
        let targetBegin = GlobalFunctions.addMinutes(shiftedWorks[0].workBegin, minutesDiff + shiftMinutes);
        if (confirm(this.txt['shift_works_to']  + ': ' + this.targetWorkDayDisplay + ' - ' + formatDate(targetBegin, 'H:mm', this.locale)
        + (shiftMinutes > 0 ? ' ( ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )' : shiftMinutes < 0 ? ' ( - ' + GlobalFunctions.minutesDisplay(shiftMinutes) + ' )': '') +'?')) {
          shiftedWorks.forEach(_ => {
            _.workBegin = GlobalFunctions.addMinutes(_.workBegin, minutesDiff + shiftMinutes,);
            _.workEnd = GlobalFunctions.addMinutes(_.workEnd, minutesDiff + shiftMinutes);
          });
        }
        this.workUpdate.emit({updateType: UpdateType.multipleUpdate, work: null, works: shiftedWorks});
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
    let doneWorks: Work[] = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
    doneWorks.forEach(_ => {
      if (this.isAllDone) {
        _.doneId = 0;
      } else {
        _.doneId = _.workId;
      }
    })
    this.workUpdate.emit({updateType: UpdateType.multipleUpdate, work: null, works: doneWorks});
    // after selecting we end selection
    this.selectionSet.emit();
  }

  /** --------------------------  supporting functions for public methods -------------------------------------------- */


  private shiftWorksBefore(minutes: number) {
    let shiftedWorks: Work[] = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
    shiftedWorks.forEach(_ => {
        _.workBegin = GlobalFunctions.addMinutes( _.workBegin, -1 * minutes);
        _.workEnd = GlobalFunctions.addMinutes(_.workEnd, -1 * minutes);
    });
    this.workUpdate.emit({updateType: UpdateType.multipleUpdate, work: null, works: shiftedWorks});
    // after shifting we end selection
    this.selectionSet.emit();
  }

  private shiftWorksAfter(minutes: number) {
    let worksReverse: Work[] = GlobalFunctions.buildWorks(this.works, this.session.workDay, false, false).filter(_ => _.isSelected);
    worksReverse.reverse().forEach(_ => {
      _.workBegin = GlobalFunctions.addMinutes(_.workBegin, minutes);
      _.workEnd = GlobalFunctions.addMinutes(_.workEnd, minutes);
    });
    this.workUpdate.emit({updateType: UpdateType.multipleUpdate, work: null, works: worksReverse});
    // after shifting we end selection
    this.selectionSet.emit();
  }

}


