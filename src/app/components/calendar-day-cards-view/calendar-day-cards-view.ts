import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, HostListener} from '@angular/core';
import { formatDate, NgClass, NgStyle, SlicePipe, DatePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';

import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';

import { INumChoice } from '../../_interfaces/i-num-choice';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IEventOptions } from '../../_interfaces/i-event-options';
import { EventDayTimeChangeComponent } from '../event-day-time-change/event-day-time-change.component';


@Component({
  selector: 'dsy-calendar-day-cards-view',
  templateUrl: './calendar-day-cards-view.html',
  styleUrl: './calendar-day-cards-view.css',
  imports: [NgClass, EventDayTimeChangeComponent, NgStyle, SlicePipe, DatePipe]
})
export class EventDayCardsViewComponent implements OnInit {

  public name = 'EventDayCardsViewComponent';

  @Input({required: true}) session: Session;

  // in the moment locale is irrelevant for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) eventtxt: { [key: string]: string };

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) opts: IEventOptions;
  @Input({required: true}) userOpts: IUserEventOptions;

  // day of event - 00:00 in browser timezone
  // can be selected by user
  // eventDay is in opts @Input({required: true}) eventDay: Date;
  eventDayDisplay = '';
  dateString = '';

  isAfterToday = false;

  @Input({required: true}) events: Array<Event>;
  @Input({required: true}) eventsChangeCounter: number;

  @Input({required: true}) isCreating: boolean;
  @Input({required: true}) isSelecting: boolean;

  @Output() eventSelect = new EventEmitter<{isSelect: boolean, id: number}>();
  // this view updates only event summary, begin, end
  @Output() eventUpdate = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() eventCreate = new EventEmitter<boolean>();
  @Output() cardFormViewEnabled = new EventEmitter<{updateType: UpdateType, event: Event, d: Date}>();

  // eventCards are enhanced events (time-picker attributes are set via mapping) and have same cardinality and sort-order as events
  eventCards: Array<Event>;

  locationTypeEnum: typeof LocationType = LocationType;

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // which time should be updated 1 begin, 2 end, 3 duration
  changeType: number;

  isEventsLoaded = false;



  constructor() { }

  ngOnInit() {

  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isSetEvents = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'opts') {
        // this.opts = propValue.currentValue;
        if (this.session?.eventDay) {
          this.getEventParameters();
        }
      }
      if (propKey === 'events' || propKey === 'eventsChangeCounter') {
        isSetEvents = true;
      }
      // console.log('event-day-cards propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
    if (isSetEvents) {
      this.isEventsLoaded = false;
      if (this.events && this.events.length > 0 && this.session?.eventDay) {
        const realEvents = this.events.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(this.session.eventDay, _.eventBegin)
        && GlobalFunctions.isMinuteEarlier(_.eventBegin, GlobalFunctions.addDays(this.session.eventDay, 1) ) );
        if (realEvents && realEvents?.length > 0) {
          this.buildEventCards(this.events);
        } else if (this.session?.eventDay) {
          this.addDayStartCard();
        }
      } else if (this.session?.eventDay) {
        this.addDayStartCard();
      }
      this.isEventsLoaded = true;
    }
  }

  private getEventParameters() {
    // defaultIntervlLength is taken from opts in "prepareInsert()"
    this.eventDayDisplay = formatDate( this.session.eventDay, 'EEE dd.MM.yyyy', this.locale);
    const tomorrow = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(new Date()), 1);
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.session.eventDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
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
    const dayStartDummy = EventFactory.empty();
    dayStartDummy.eventBegin = GlobalFunctions.addMinutes(this.session.eventDay, this.userOpts.startHour * 60);
    dayStartDummy.eventEnd = dayStartDummy.eventBegin;
    dayStartDummy.summary = (this.session?.isPlan ? this.txt['no_plan_entry'] : this.txt['no_entry'] );
    const eventsDummy: Array<Event> = [];
    eventsDummy.push(dayStartDummy);
    this.buildEventCards(eventsDummy);
  }


  /**
   * we build eventCards from events
   * (attention: we use this function also for dummyEvents)
   */
  private buildEventCards(events: Array<Event>) {
    this.eventCards = events.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(this.session.eventDay, _.eventBegin)
    && GlobalFunctions.isMinuteEarlier(_.eventBegin, GlobalFunctions.addDays(this.session.eventDay, 1)) );
    this.eventCards.map((card) => {
      const eventDurationDisplay = GlobalFunctions.minutesDisplay(card.eventDuration);
      let custIssueNr = '';
      let custIssueName = '';
      let custStyle = {};
      if (card.contactNr > 0) {
        if (card.issueProviderId > 0) {
          custIssueNr = card.eventInfo.contactDisplayNr;
          custIssueName = card.eventInfo.contactName;
        } else {
          custIssueNr = card.eventInfo.issueDisplayNr;
          custIssueName = card.eventInfo.contactName+ ' | ' + card.eventInfo.issueText;
        }
        custStyle = StyleFactory.getBgColorStyle(card.eventInfo.contactColor, 0);
      }
      // event might be updated in another view, but all eventCards ar set to update = false;
      card.cardElement = {spaceBefore: 0, spaceAfter: 0, isTemporary: false, isSummaryUpdated: false,
        eventDurationDisplay, custIssueNr: custIssueNr, custIssueName, custStyle};
      // console.log('map models for ', JSON.stringify(event));
      return card;
    });
    this.actualizeCardElements();
  }


  private actualizeCardElements() {
    // we add event from previous day, reaching to this day and first event of next day
    const allEvents = GlobalFunctions.buildEvents(this.events, this.session.eventDay, true, true);
    this.eventCards.forEach((card) => {
      card.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(card.eventBegin, allEvents, this.session.eventDay);
      card.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(card.eventEnd, allEvents, this.session.eventDay);

      // for shift before (= before event which is before selected events)
      const earlierBegin = GlobalFunctions.getPreviousBegin(card.eventBegin, card.eventDuration, allEvents, this.session.eventDay);
      card.cardElement.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(card.eventBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
      // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

      // for shift after (= after event which is after selected events)
      const laterBegin = GlobalFunctions.getNextBegin(card.eventBegin, card.eventDuration, allEvents, this.session.eventDay);
      card.cardElement.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(card.eventBegin) : 0;
      // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

      if (!GlobalFunctions.isMinuteSame(card.eventBegin, card.eventEnd)) {
        card.cardElement.isEndOnNextDay = card.eventEnd.getTime() >= GlobalFunctions.addDays(this.session.eventDay, 1).getTime();
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
      if (this.eventCards) {
        this.eventCards.forEach(_ => {
          _.cardElement.isShowLocationTypeDropdown = false;
        });
      }
    }
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setContactBgColorStyle (contactColor: string) {
    return StyleFactory.getBgColorStyle(contactColor, 0);
  }

  public shiftBefore(i: number) {
    this.eventCards[i].eventBegin = GlobalFunctions.addMinutes(this.eventCards[i].eventBegin, -1 * this.eventCards[i].cardElement.shiftSpaceBefore);
    this.eventCards[i].eventEnd = GlobalFunctions.addMinutes(this.eventCards[i].eventEnd, -1 * this.eventCards[i].cardElement.shiftSpaceBefore);
    // actualized by onChanges
    // this.actualizeCardElements();
    if (!this.eventCards[i].cardElement.isTemporary) {
      this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
    }
  }

  public shiftAfter(i: number) {
    this.eventCards[i].eventBegin = GlobalFunctions.addMinutes(this.eventCards[i].eventBegin, this.eventCards[i].cardElement.shiftSpaceAfter);
    this.eventCards[i].eventEnd =  GlobalFunctions.addMinutes( this.eventCards[i].eventEnd, this.eventCards[i].cardElement.shiftSpaceAfter);
    // actualized by onChanges
    // this.actualizeCardElements();
    if (!this.eventCards[i].cardElement.isTemporary) {
      this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
    }
  }


   /**
   * insert - button (left side of card) pressed by user
   * @param index of event - we use eventBegim of event where insert symbol was clicked as eventEnd for new event
   */
  public insertBefore(i: number): void {
    if (this.eventCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0
    && (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.eventDay))) {
      const newEvent = EventFactory.empty();
      newEvent.type = this.session.isPlan ? 0 : 1;
      newEvent.eventEnd = this.eventCards[i].eventBegin;
      if (newEvent.eventEnd.getMinutes() < this.opts.defaultIntervalLength) {
        newEvent.eventDuration = newEvent.eventEnd.getMinutes();
      } else {
        newEvent.eventDuration = this.opts.defaultIntervalLength;
      }
      if (newEvent.eventDuration > 0) {
        newEvent.eventBegin = GlobalFunctions.addMinutes(newEvent.eventEnd, -1 * newEvent.eventDuration);
        // adding event from previous day
        const allEvents = GlobalFunctions.buildEvents(this.events, this.session.eventDay, true, false);
        let previousEvent: Event = GlobalFunctions.getPreviousEvent(allEvents, newEvent.eventBegin);
        // if overlapping, eventBegin is set to previous eventEnd
        if (previousEvent && GlobalFunctions.isMinuteEarlier(newEvent.eventBegin, previousEvent.eventEnd )) {
          newEvent.eventBegin = previousEvent.eventEnd;
        }
        newEvent.eventDuration = GlobalFunctions.getDateInMinutes(newEvent.eventEnd)
        - GlobalFunctions.getDateInMinutes(newEvent.eventBegin);
        const eventDurationDisplay = GlobalFunctions.minutesDisplay(newEvent.eventDuration);
        newEvent.cardElement = {isTemporary: true, isSummaryUpdated: true, spaceBefore: 0, spaceAfter: 0,
          eventDurationDisplay, custIssueNr: '', custIssueName: ''};
        this.eventCards = this.eventCards.filter(_ =>_.eventBegin < _.eventEnd);
        this.eventCards.push(newEvent);
        this.eventCards.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
        this.actualizeCardElements();
        this.eventCreate.emit(true);
      }
    } else {
      alert(this.txt['notPossible']);
    }
  }

  /**
   * insert - button (right side of card) pressed by user
   * @param i - index of event - we use eventEnd of event where insert symbol was clicked as eventStart for new event
   */
  public insertAfter(i: number): void {
    if (this.eventCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0
    && (!this.session.isPlan || GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) <= GlobalFunctions.getDateInMinutes(this.session.eventDay))) {
      const newEvent = EventFactory.empty();
      newEvent.type = this.session.isPlan ? 0 : 1;
      newEvent.eventBegin = this.eventCards[i].eventEnd;
      newEvent.eventDuration = this.opts.defaultIntervalLength;
      newEvent.eventEnd = GlobalFunctions.addMinutes(newEvent.eventBegin, newEvent.eventDuration);
      // adding first event on next day
      const allEvents = GlobalFunctions.buildEvents(this.events,  this.session.eventDay, false, true);
      let nextEvent: Event = GlobalFunctions.getNextEvent(allEvents, newEvent.eventBegin);
      // if we get this processed event as next event we search for real next event
      // here we need this only for dayStartCard
      if (nextEvent && GlobalFunctions.isMinuteSame (nextEvent.eventBegin, this.eventCards[i].eventBegin)) {
        nextEvent = GlobalFunctions.getNextEvent(allEvents, GlobalFunctions.addMinutes(this.eventCards[i].eventBegin, 1));
      }
      // if overlapping, eventEnd is set to begin of next event, duration is shortened
      if (nextEvent && GlobalFunctions.isMinuteEarlier(nextEvent.eventBegin, newEvent.eventEnd )) {
        newEvent.eventEnd = nextEvent.eventBegin;
      }
      newEvent.eventDuration = GlobalFunctions.getDateInMinutes(newEvent.eventEnd)
      - GlobalFunctions.getDateInMinutes(newEvent.eventBegin);
      const eventDurationDisplay = GlobalFunctions.minutesDisplay(newEvent.eventDuration);
      newEvent.cardElement = {isTemporary: true, isSummaryUpdated: true, spaceBefore: 0, spaceAfter: 0, eventDurationDisplay,
        custIssueNr: '', custIssueName: ''};
      this.eventCards = this.eventCards.filter(_ =>_.eventBegin < _.eventEnd);
      this.eventCards.push(newEvent);
      this.eventCards.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
      this.actualizeCardElements();
      this.eventCreate.emit(true);
    } else {
      alert(this.txt['notPossible']);
    }
  }



  public setShowTimeChange(i: number, type: number) {
    if (this.eventCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0 || this.eventCards[i].cardElement.isTemporary) {
      this.changeType = type;
      this.eventCards[i].cardElement.isShowTimeChange = true;
    }
  }

  public timeUpdate(event: {updateType: UpdateType, event: Event, id: number}) {
    const i = this.eventCards.findIndex(_ => _.eventId === event.id);
    if (i >= 0) {
      this.eventCards[i] = event.event;
      this.eventCards[i].eventEnd = this.getNewEnd(event.event.eventBegin, event.event.eventEnd);
      this.eventCards[i].cardElement.isShowTimeChange = false;
      this.actualizeCardElements();
      if (!this.eventCards[i].cardElement.isTemporary) {
        this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
      }
    }
  }

  public cancelTimeChangeView(event: {updateType: UpdateType, event: Event, id: number}) {
    const i = this.eventCards.findIndex(_ => _.eventId === event.id);
    if (i >= 0) {
      this.eventCards[i].cardElement.isShowTimeChange = false;
    }
  }


  public selectEvent(i: number) {
    // console.log('select:', i);
    if (this.eventCards[i].isSelected) {
      this.eventCards[i].isSelected = false;
    } else {
      this.eventCards[i].isSelected = true;
    }
    if (!this.eventCards[i].cardElement.isTemporary) {
      this.eventSelect.emit({isSelect: this.eventCards[i].isSelected, id: this.eventCards[i].eventId});
    }
  }


  public showLocationType(i: any) {
    if (this.eventCards[i].cardElement.isShowLocationTypeDropdown) {
      this.eventCards[i].cardElement.isShowLocationTypeDropdown = false;
    } else if (this.eventCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0 || this.eventCards[i].cardElement.isTemporary) {
      this.eventCards[i].cardElement.isShowLocationTypeDropdown = true;
    }
  }

  public updateLocationType(i: number, value: number): void {
    // console.log('i:', i)
    // console.log('value:', value)
    // console.log('value type:', typeof value)
    this.eventCards[i].cardElement.locationTypeChoices.forEach(_ => {
      if (_.value  === value) {
        _.isSelected = true;
          this.eventCards[i].locationType = value;
          if (!this.eventCards[i].cardElement.isTemporary) {
            this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
          }
      } else {
        _.isSelected = false;
      }
    });
    this.eventCards[i].cardElement.isShowLocationTypeDropdown = false;
  }

  // we use update to set the update flag - if event is updated by another view, we do not allow updating
  // if another event is just beeing update or time-updated, no update of this event is possible
  public setUpdateSummary(i: number): void {
    // no update for dayStartCard and no update if events are updated by another view
    if (!GlobalFunctions.isMinuteSame(this.eventCards[i].eventBegin, this.eventCards[i].eventEnd)
    && !this.isSelecting
    // @deprecated && this.events.filter(_ => _.isUpdated && _.eventId === this.eventCards[i].eventId).length === 0
      && this.eventCards.filter(_ => _.cardElement.isSummaryUpdated || _.cardElement.isShowTimeChange).length === 0)  {
      this.eventCards[i].cardElement.isSummaryUpdated = true;
      // this.eventSetUpdate.emit(this.eventCards[i].eventId);
    }
  }

  public storeSummary(i: number, summary: string, info: string): void {
    if (summary && summary.length > 0 && this.eventCards[i].cardElement.isSummaryUpdated) {
      this.eventCards[i].summary = summary;
    }
  }

  /**
   * update sets text fields in event and sends eventUpdate
   * (changes in eventBegin and eventEnd are handled otherwhere - so weh do not have to deal with
   *    disabledRanges here)
   * @param i index of eventCards
   * @param summary text for this event
   */
  public updateSummary(i: number, summary: string, info: string): void {
    // console.log('setSummaryEmit', info);
    if (summary && summary.length > 0 && this.eventCards[i].cardElement.isSummaryUpdated) {
      this.eventCards[i].summary = summary;
      // this.eventCards[i].cardElements.isSummaryUpdated = false;
      if (this.eventCards[i].cardElement.isTemporary) {
        // this.eventCards[i].cardElements.isTemporary = false;
        this.eventUpdate.emit({updateType: UpdateType.insert, event: this.eventCards[i]});
        this.eventCreate.emit(false);
      } else {
        this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
      }
    } else {
      this.cancelUpdates(i);
    }
  }


  public cancelUpdates(i: number) {
    // we need the assertion of existing eventCards element because of deleting from array inside the if construct
    if (this.eventCards[i]) {
      if (this.eventCards[i].cardElement.isTemporary) {
        this.eventCards.splice(i, 1);
        // splice or reload model to get rid of temporary cards lead to similar effect in this if construct
        // this.eventReload.emit();
        // we have to recalc disabled because eventBegin and eventEnd where already placed in deisabledRange
        if (this.eventCards.length > 0) {
          this.actualizeCardElements();
        } else {
          this.addDayStartCard();
        }
      } else {
        this.eventCards[i].cardElement.isSummaryUpdated = false;
        this.eventCards[i].summary = this.events.find(_ => _.eventId === this.eventCards[i].eventId)?.summary;
        // console.log('cancelUpdatesEmit');
        // this.eventUpdate.emit({type: UpdateType.cancelUpdate, event: this.eventCards[i], id: this.eventCards[i].eventId});
      }
    }
    this.eventCreate.emit(false);
  }

  public setDone(i: number): void {
    if (!this.isCreating && !this.isSelecting) {
      if(this.eventCards[i].doneId > 0 && confirm(this.txt['reset'] + ' ' + this.txt['done'] + '?')) {
        this.eventCards[i].doneId = 0;
        this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
      } else if (!(this.eventCards[i].doneId > 0)) {
        // we do not show done element if isAfterToday
        // user can set to unDone for future elements (thess can occur only when shifting done events to the future) only in card-form
        // so this case can not occur in the moment
        if (this.isAfterToday) {
          alert(this.txt['set_to'] + ' ' + this.txt['done'] + this.txt['not_allowed']);
        } else if (confirm(this.txt['set_to'] + ' ' + this.txt['done'] + '?')) {
          this.eventCards[i].doneId = this.eventCards[i].eventId;
          this.eventUpdate.emit({updateType: UpdateType.update, event: this.eventCards[i]});
        }
      }
    }
  }

  public setDelete(i: number): void {
    // we check isSummaryUpdated
    if (confirm(this.txt['event_disable'] + '?')) {
      if (this.eventCards[i] && this.eventCards[i].cardElement.isSummaryUpdated ) {
        this.eventUpdate.emit({updateType: UpdateType.delete, event: this.eventCards[i]});
      } else {
        this.cancelUpdates(i);
      }
    }
  }


  public enableCardFormView(eventCard: Event, i: number) {
    if (eventCard.eventId === this.eventCards[i].eventId
      && this.eventCards.filter(_ => (_.cardElement.isSummaryUpdated && _.eventId !== eventCard.eventId)
      || _.cardElement.isShowTimeChange).length === 0) {
      // we transfer eventually updated summary, location type to card-form-view
      // eventCards itself are set back to original value
      const event: Event = GlobalFunctions.clone(this.eventCards[i]);
      if (event.cardElement.isTemporary) {
        this.cardFormViewEnabled.emit({updateType: UpdateType.insert, event, d: null});
      } else {
        this.cardFormViewEnabled.emit({updateType: UpdateType.update, event, d: null});
      }
      this.cancelUpdates(i);
    }
  }


  /** --------------------------  supporting functions for public methods -------------------------------------------- */

  private getNewEnd(begin: Date, end: Date): Date {
    let nextEvent: Event = GlobalFunctions.getNextEvent(this.events, begin);
    // if we get this processed event as next event we search for real next event
    if (nextEvent && GlobalFunctions.isMinuteSame(nextEvent.eventBegin, begin)) {
      nextEvent = GlobalFunctions.getNextEvent(this.events, GlobalFunctions.addMinutes(begin, 1));
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

}



