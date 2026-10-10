import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener} from '@angular/core';
import { formatDate, NgClass, NgStyle, SlicePipe, DatePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { Work } from '../../_db/work';
import { WorkFactory } from '../../_db/work-factory';
import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';

import { INumChoice } from '../../_interfaces/i-num-choice';
import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';
import { IWorkOptions } from '../../_interfaces/i-work-options';
import { WorkDayTimeChangeComponent } from '../work-day-time-change/work-day-time-change.component';


@Component({
  selector: 'dsy-calendar-day-cards-view',
  templateUrl: './calendar-day-cards-view.html',
  styleUrl: './calendar-day-cards-view.css',
  imports: [NgClass, WorkDayTimeChangeComponent, NgStyle, SlicePipe, DatePipe]
})
export class WorkDayCardsViewComponent implements OnInit {

  public name = 'WorkDayCardsViewComponent';

  @Input({required: true}) session: Session;

  // in the moment locale is irrelevant for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) opts: IWorkOptions;
  @Input({required: true}) userOpts: IUserWorkOptions;

  // day of work - 00:00 in browser timezone
  // can be selected by user
  // workDay is in opts @Input({required: true}) workDay: Date;
  workDayDisplay = '';
  dateString = '';

  isAfterToday = false;

  @Input({required: true}) works: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;

  @Input({required: true}) isCreating: boolean;
  @Input({required: true}) isSelecting: boolean;

  @Output() workSelect = new EventEmitter<{isSelect: boolean, id: number}>();
  // this view updates only work summary, begin, end
  @Output() workUpdate = new EventEmitter<{updateType: UpdateType, work: Work}>();
  @Output() workCreate = new EventEmitter<boolean>();
  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, work: Work, d: Date}>();

  // workCards are enhanced works (time-picker attributes are set via mapping) and have same cardinality and sort-order as works
  workCards: Array<Work>;

  locationTypeEnum: typeof LocationType = LocationType;

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // which time should be updated 1 begin, 2 end, 3 duration
  changeType: number;

  isWorksLoaded = false;



  constructor() { }

  ngOnInit() {

  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetWorks = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts') {
        // this.opts = propValue.currentValue;
        if (this.session?.workDay) {
          this.getWorkParameters();
        }
      }
      if (propKey === 'works' || propKey === 'worksChangeCounter') {
        isSetWorks = true;
      }
      // console.log('work-day-cards propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetWorks) {
      this.isWorksLoaded = false;
      if (this.works && this.works.length > 0 && this.session?.workDay) {
        const realWorks = this.works.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(this.session.workDay, _.workBegin)
        && GlobalFunctions.isMinuteEarlier(_.workBegin, GlobalFunctions.addDays(this.session.workDay, 1) ) );
        if (realWorks && realWorks?.length > 0) {
          this.buildWorkCards(this.works);
        } else if (this.session?.workDay) {
          this.addDayStartCard();
        }
      } else if (this.session?.workDay) {
        this.addDayStartCard();
      }
      this.isWorksLoaded = true;
    }
  }

  private getWorkParameters() {
    // defaultIntervlLength is taken from opts in "prepareInsert()"
    this.workDayDisplay = formatDate( this.session.workDay, 'EEE dd.MM.yyyy', this.locale);
    const tomorrow = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(new Date()), 1);
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.session.workDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
  }

  private buildLocationTypeChoices(): Array<INumChoice>  {
    const enumStringType: { [key: string]: any } = this.locationTypeEnum;
    const locationTypeChoices: Array<INumChoice> = Object.keys(this.locationTypeEnum)
    .filter((k: any) => typeof this.locationTypeEnum[k] === 'number')
    .map((_: string) => {
      return {value: Number(enumStringType[_]), text: this.txt[_]};
    });
    return locationTypeChoices;
  }


  private addDayStartCard() {
    const dayStartDummy = WorkFactory.empty();
    dayStartDummy.workBegin = GlobalFunctions.addMinutes(this.session.workDay, this.userOpts.startHour * 60);
    dayStartDummy.workEnd = dayStartDummy.workBegin;
    dayStartDummy.summary = (this.session?.isPlan ? this.txt['no_plan_entry'] : this.txt['no_entry'] );
    const worksDummy: Array<Work> = [];
    worksDummy.push(dayStartDummy);
    this.buildWorkCards(worksDummy);
  }


  /**
   * we build workCards from works
   * (attention: we use this function also for dummyWorks)
   */
  private buildWorkCards(works: Array<Work>) {
    this.workCards = works.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(this.session.workDay, _.workBegin)
    && GlobalFunctions.isMinuteEarlier(_.workBegin, GlobalFunctions.addDays(this.session.workDay, 1)) );
    this.workCards.map((card) => {
      const workDurationDisplay = GlobalFunctions.minutesDisplay(card.workDuration);
      let custIssueNr = '';
      let custIssueName = '';
      let custStyle = {};
      if (card.customerNr > 0) {
        if (card.issueProviderId > 0) {
          custIssueNr = card.workInfo.customerDisplayNr;
          custIssueName = card.workInfo.customerName;
        } else {
          custIssueNr = card.workInfo.issueDisplayNr;
          custIssueName = card.workInfo.customerName+ ' | ' + card.workInfo.issueText;
        }
        custStyle = StyleFactory.getBgColorStyle(card.workInfo.customerColor, 0);
      }
      // work might be updated in another view, but all workCards ar set to update = false;
      card.cardElement = {spaceBefore: 0, spaceAfter: 0, isTemporary: false, isSummaryUpdated: false,
        workDurationDisplay, custIssueNr: custIssueNr, custIssueName, custStyle};
      // console.log('map models for ', JSON.stringify(work));
      return card;
    });
    this.actualizeCardElements();
  }


  private actualizeCardElements() {
    // we add work from previous day, reaching to this day and first work of next day
    const allWorks = GlobalFunctions.buildWorks(this.works, this.session.workDay, true, true);
    this.workCards.forEach((card) => {
      card.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(card.workBegin, allWorks, this.session.workDay);
      card.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(card.workEnd, allWorks, this.session.workDay);

      // for shift before (= before work which is before selected works)
      const earlierBegin = GlobalFunctions.getPreviousBegin(card.workBegin, card.workDuration, allWorks, this.session.workDay);
      card.cardElement.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(card.workBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
      // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

      // for shift after (= after work which is after selected works)
      const laterBegin = GlobalFunctions.getNextBegin(card.workBegin, card.workDuration, allWorks, this.session.workDay);
      card.cardElement.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(card.workBegin) : 0;
      // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

      if (!GlobalFunctions.isMinuteSame(card.workBegin, card.workEnd)) {
        card.cardElement.isEndOnNextDay = card.workEnd.getTime() >= GlobalFunctions.addDays(this.session.workDay, 1).getTime();
        card.cardElement.locationTypeChoices = this.buildLocationTypeChoices();
        const ix = card.cardElement.locationTypeChoices.findIndex(_ => _.value === card.locationType);
        if (ix >= 0) {
          card.cardElement.locationTypeChoices[ix].isSelected = true;
        }
      }
    });

  }

  // recognize clicks outside of locationType dropdown
  @HostListener('window:click', ['$event.target'])
  onClick(target: any) {
    if ((target && (target.id === 'selectItem' || target.id === 'dropdownButton'))
      || ((target?.parentElement) && (target.parentElement?.id ===  'dropdown'  || target.parentElement?.id ===  'dropdownButton'  ))) {
      // console.log(`click id is`, target.id);
      // console.log(`parent id is`, target.parentElement.id);
    } else {
      // console.log(`You clicked on`, target);
      if (this.workCards) {
        this.workCards.forEach(_ => {
          _.cardElement.isShowLocationTypeDropdown = false;
        });
      }
    }
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setCustomerBgColorStyle (customerColor: string) {
    return StyleFactory.getBgColorStyle(customerColor, 0);
  }

  public shiftBefore(i: number) {
    this.workCards[i].workBegin = GlobalFunctions.addMinutes(this.workCards[i].workBegin, -1 * this.workCards[i].cardElement.shiftSpaceBefore);
    this.workCards[i].workEnd = GlobalFunctions.addMinutes(this.workCards[i].workEnd, -1 * this.workCards[i].cardElement.shiftSpaceBefore);
    // actualized by onChanges
    // this.actualizeCardElements();
    if (!this.workCards[i].cardElement.isTemporary) {
      this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
    }
  }

  public shiftAfter(i: number) {
    this.workCards[i].workBegin = GlobalFunctions.addMinutes(this.workCards[i].workBegin, this.workCards[i].cardElement.shiftSpaceAfter);
    this.workCards[i].workEnd =  GlobalFunctions.addMinutes( this.workCards[i].workEnd, this.workCards[i].cardElement.shiftSpaceAfter);
    // actualized by onChanges
    // this.actualizeCardElements();
    if (!this.workCards[i].cardElement.isTemporary) {
      this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
    }
  }


   /**
   * insert - button (left side of card) pressed by user
   * @param index of work - we use workBegim of work where insert symbol was clicked as workEnd for new work
   */
  public insertBefore(i: number): void {
    if (this.workCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0
    && (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.workDay))) {
      const newWork = WorkFactory.empty();
      newWork.type = this.session.isPlan ? 0 : 1;
      newWork.workEnd = this.workCards[i].workBegin;
      if (newWork.workEnd.getMinutes() < this.opts.defaultIntervalLength) {
        newWork.workDuration = newWork.workEnd.getMinutes();
      } else {
        newWork.workDuration = this.opts.defaultIntervalLength;
      }
      if (newWork.workDuration > 0) {
        newWork.workBegin = GlobalFunctions.addMinutes(newWork.workEnd, -1 * newWork.workDuration);
        // adding work from previous day
        const allWorks = GlobalFunctions.buildWorks(this.works, this.session.workDay, true, false);
        let previousWork: Work = GlobalFunctions.getPreviousWork(allWorks, newWork.workBegin);
        // if overlapping, workBegin is set to previous workEnd
        if (previousWork && GlobalFunctions.isMinuteEarlier(newWork.workBegin, previousWork.workEnd )) {
          newWork.workBegin = previousWork.workEnd;
        }
        newWork.workDuration = GlobalFunctions.getDateInMinutes(newWork.workEnd)
        - GlobalFunctions.getDateInMinutes(newWork.workBegin);
        const workDurationDisplay = GlobalFunctions.minutesDisplay(newWork.workDuration);
        newWork.cardElement = {isTemporary: true, isSummaryUpdated: true, spaceBefore: 0, spaceAfter: 0,
          workDurationDisplay, custIssueNr: '', custIssueName: ''};
        this.workCards = this.workCards.filter(_ =>_.workBegin < _.workEnd);
        this.workCards.push(newWork);
        this.workCards.sort((a, b) => a.workBegin.getTime() - b.workBegin.getTime());
        this.actualizeCardElements();
        this.workCreate.emit(true);
      }
    } else {
      alert(this.txt['notPossible']);
    }
  }

  /**
   * insert - button (right side of card) pressed by user
   * @param i - index of work - we use workEnd of work where insert symbol was clicked as workStart for new work
   */
  public insertAfter(i: number): void {
    if (this.workCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0
    && (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.workDay))) {
      const newWork = WorkFactory.empty();
      newWork.type = this.session.isPlan ? 0 : 1;
      newWork.workBegin = this.workCards[i].workEnd;
      newWork.workDuration = this.opts.defaultIntervalLength;
      newWork.workEnd = GlobalFunctions.addMinutes(newWork.workBegin, newWork.workDuration);
      // adding first work on next day
      const allWorks = GlobalFunctions.buildWorks(this.works,  this.session.workDay, false, true);
      let nextWork: Work = GlobalFunctions.getNextWork(allWorks, newWork.workBegin);
      // if we get this processed work as next work we search for real next work
      // here we need this only for dayStartCard
      if (nextWork && GlobalFunctions.isMinuteSame (nextWork.workBegin, this.workCards[i].workBegin)) {
        nextWork = GlobalFunctions.getNextWork(allWorks, GlobalFunctions.addMinutes(this.workCards[i].workBegin, 1));
      }
      // if overlapping, workEnd is set to begin of next work, duration is shortened
      if (nextWork && GlobalFunctions.isMinuteEarlier(nextWork.workBegin, newWork.workEnd )) {
        newWork.workEnd = nextWork.workBegin;
      }
      newWork.workDuration = GlobalFunctions.getDateInMinutes(newWork.workEnd)
      - GlobalFunctions.getDateInMinutes(newWork.workBegin);
      const workDurationDisplay = GlobalFunctions.minutesDisplay(newWork.workDuration);
      newWork.cardElement = {isTemporary: true, isSummaryUpdated: true, spaceBefore: 0, spaceAfter: 0, workDurationDisplay,
        custIssueNr: '', custIssueName: ''};
      this.workCards = this.workCards.filter(_ =>_.workBegin < _.workEnd);
      this.workCards.push(newWork);
      this.workCards.sort((a, b) => a.workBegin.getTime() - b.workBegin.getTime());
      this.actualizeCardElements();
      this.workCreate.emit(true);
    } else {
      alert(this.txt['notPossible']);
    }
  }



  public setShowTimeChange(i: number, type: number) {
    if (this.workCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0 || this.workCards[i].cardElement.isTemporary) {
      this.changeType = type;
      this.workCards[i].cardElement.isShowTimeChange = true;
    }
  }

  public timeUpdate(event: {updateType: UpdateType, work: Work, id: number}) {
    const i = this.workCards.findIndex(_ => _.workId === event.id);
    if (i >= 0) {
      this.workCards[i] = event.work;
      this.workCards[i].workEnd = this.getNewEnd(event.work.workBegin, event.work.workEnd);
      this.workCards[i].cardElement.isShowTimeChange = false;
      this.actualizeCardElements();
      if (!this.workCards[i].cardElement.isTemporary) {
        this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
      }
    }
  }

  public cancelTimeChangeView(event: {updateType: UpdateType, work: Work, id: number}) {
    const i = this.workCards.findIndex(_ => _.workId === event.id);
    if (i >= 0) {
      this.workCards[i].cardElement.isShowTimeChange = false;
    }
  }


  public selectWork(i: number) {
    // console.log('select:', i);
    if (this.workCards[i].isSelected) {
      this.workCards[i].isSelected = false;
    } else {
      this.workCards[i].isSelected = true;
    }
    if (!this.workCards[i].cardElement.isTemporary) {
      this.workSelect.emit({isSelect: this.workCards[i].isSelected, id: this.workCards[i].workId});
    }
  }


  public showLocationType(i: any) {
    if (this.workCards[i].cardElement.isShowLocationTypeDropdown) {
      this.workCards[i].cardElement.isShowLocationTypeDropdown = false;
    } else if (this.workCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0 || this.workCards[i].cardElement.isTemporary) {
      this.workCards[i].cardElement.isShowLocationTypeDropdown = true;
    }
  }

  public updateLocationType(i: number, value: number): void {
    // console.log('i:', i)
    // console.log('value:', value)
    // console.log('value type:', typeof value)
    this.workCards[i].cardElement.locationTypeChoices.forEach(_ => {
      if (_.value  === value) {
        _.isSelected = true;
          this.workCards[i].locationType = value;
          if (!this.workCards[i].cardElement.isTemporary) {
            this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
          }
      } else {
        _.isSelected = false;
      }
    });
    this.workCards[i].cardElement.isShowLocationTypeDropdown = false;
  }

  // we use update to set the update flag - if work is updated by another view, we do not allow updating
  // if another work is just beeing update or time-updated, no update of this work is possible
  public setUpdateSummary(i: number): void {
    // no update for dayStartCard and no update if works are updated by another view
    if (!GlobalFunctions.isMinuteSame(this.workCards[i].workBegin, this.workCards[i].workEnd)
    && !this.isSelecting
    // @deprecated && this.works.filter(_ => _.isUpdated && _.workId === this.workCards[i].workId).length === 0
      && this.workCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0)  {
      this.workCards[i].cardElement.isSummaryUpdated = true;
      // this.workSetUpdate.emit(this.workCards[i].workId);
    }
  }

  public storeSummary(i: number, summary: string, info: string): void {
    if (summary && summary.length > 0 && this.workCards[i].cardElement.isSummaryUpdated) {
      this.workCards[i].summary = summary;
    }
  }

  /**
   * update sets text fields in work and sends workUpdate
   * (changes in workBegin and workEnd are handled otherwhere - so weh do not have to deal with
   *    disabledRanges here)
   * @param i index of workCards
   * @param summary text for this work
   */
  public updateSummary(i: number, summary: string, info: string): void {
    // console.log('setSummaryEmit', info);
    if (summary && summary.length > 0 && this.workCards[i].cardElement.isSummaryUpdated) {
      this.workCards[i].summary = summary;
      // this.workCards[i].cardElements.isSummaryUpdated = false;
      if (this.workCards[i].cardElement.isTemporary) {
        // this.workCards[i].cardElements.isTemporary = false;
        this.workUpdate.emit({updateType: UpdateType.insert, work: this.workCards[i]});
        this.workCreate.emit(false);
      } else {
        this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
      }
    } else {
      this.cancelUpdates(i);
    }
  }


  public cancelUpdates(i: number) {
    // we need the assertion of existing workCards element because of deleting from array inside the if construct
    if (this.workCards[i]) {
      if (this.workCards[i].cardElement.isTemporary) {
        this.workCards.splice(i, 1);
        // splice or reload model to get rid of temporary cards lead to similar effect in this if construct
        // this.workReload.emit();
        // we have to recalc disabled because workBegin and workEnd where already placed in deisabledRange
        if (this.workCards.length > 0) {
          this.actualizeCardElements();
        } else {
          this.addDayStartCard();
        }
      } else {
        this.workCards[i].cardElement.isSummaryUpdated = false;
        this.workCards[i].summary = this.works.find(_ => _.workId === this.workCards[i].workId)?.summary;
        // console.log('cancelUpdatesEmit');
        // this.workUpdate.emit({type: UpdateType.cancelUpdate, work: this.workCards[i], id: this.workCards[i].workId});
      }
    }
    this.workCreate.emit(false);
  }

  public setDone(i: number): void {
    if (!this.isCreating && !this.isSelecting) {
      if(this.workCards[i].doneId > 0 && confirm(this.txt['reset'] + ' ' + this.txt['done'] + '?')) {
        this.workCards[i].doneId = 0;
        this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
      } else if (!(this.workCards[i].doneId > 0)) {
        // we do not show done element if isAfterToday
        // user can set to unDone for future elements (thess can occur only when shifting done works to the future) only in card-form
        // so this case can not occur in the moment
        if (this.isAfterToday) {
          alert(this.txt['set_to'] + ' ' + this.txt['done'] + this.txt['not_allowed']);
        } else if (confirm(this.txt['set_to'] + ' ' + this.txt['done'] + '?')) {
          this.workCards[i].doneId = this.workCards[i].workId;
          this.workUpdate.emit({updateType: UpdateType.update, work: this.workCards[i]});
        }
      }
    }
  }

  public setDelete(i: number): void {
    // we check isSummaryUpdated
    if (confirm(this.txt['work_disable'] + '?')) {
      if (this.workCards[i] && this.workCards[i].cardElement.isSummaryUpdated ) {
        this.workUpdate.emit({updateType: UpdateType.delete, work: this.workCards[i]});
      } else {
        this.cancelUpdates(i);
      }
    }
  }


  public enableCardFormView(workCard: Work, i: number) {
    if (workCard.workId === this.workCards[i].workId
      && this.workCards.filter(_ => (_.cardElement.isSummaryUpdated && _.workId !== workCard.workId)
      || _.cardElement.isShowTimeChange).length === 0) {
      // we transfer eventually updated summary, location type to card-form-view
      // workCards itself are set back to original value
      const work: Work = GlobalFunctions.clone(this.workCards[i]);
      if (work.cardElement.isTemporary) {
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, work, d: null});
      } else {
        this.cardFormViewEnabled.emit({updateType: UpdateType.update, work, d: null});
      }
      this.cancelUpdates(i);
    }
  }


  /** --------------------------  supporting functions for public methods -------------------------------------------- */

  private getNewEnd(begin: Date, end: Date): Date {
    let nextWork: Work = GlobalFunctions.getNextWork(this.works, begin);
    // if we get this processed work as next work we search for real next work
    if (nextWork && GlobalFunctions.isMinuteSame(nextWork.workBegin, begin)) {
      nextWork = GlobalFunctions.getNextWork(this.works, GlobalFunctions.addMinutes(begin, 1));
    }
    // if overlapping, workEnd is set to begin of next work, duration is shortened
    if (nextWork && GlobalFunctions.isMinuteEarlier(nextWork.workBegin, end )) {
      end = nextWork.workBegin;
    }
    // duration must not exceed this.opts.maxIntervalLength
    if (GlobalFunctions.isMinuteEarlier(GlobalFunctions.addMinutes(begin, this.opts.maxIntervalLength), end)) {
      end = GlobalFunctions.addMinutes(begin, this.opts.maxIntervalLength);
    }
    return end;
  }

}



