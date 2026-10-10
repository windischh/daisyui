import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { formatDate, NgClass, NgTemplateOutlet, NgStyle, SlicePipe, DatePipe } from '@angular/common';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { MAX_MONTHS, MAX_INTERVAL_LENGTH, POWDER_BLUE } from '../../_globals/constants';

import { Event } from '../../_db/event';
import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';
import { Issue } from '../../_db/issue';
import { ConfigurationOption } from '../../_db/configuration-option';

import { IIssueChoice } from '../../_interfaces/i-issue-choice';
import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { IChoice } from '../../_interfaces/i-choice';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { EventType } from '../../_enums/event-type.enum';


import { ErrorMessage } from '../../_validators/error-message';

import { IAngularMyDpOptions, IMyDate, IMyDateModel, IMyDateRange, IMyInputFieldChanged, AngularMyDatePickerDirective, AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { EventDayTimeChangeComponent } from '../event-day-time-change/event-day-time-change.component';



@Component({
  selector: 'dsy-calendar-day-card-form-view',
  templateUrl: './calendar-day-card-form-view.html',
  styleUrl: './calendar-day-card-form-view.css',
  imports: [FormsModule, ReactiveFormsModule, NgClass, AngularMyDatePickerModule, EventDayTimeChangeComponent, NgTemplateOutlet, NgStyle, SlicePipe, DatePipe]
})
export class EventDayCardFormViewComponent implements OnInit {

  public name = 'EventDayCardFormViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) custtxt: { [key: string]: string };
  @Input({required: true}) issuetxt: { [key: string]: string };
  @Input({required: true}) eventtxt: { [key: string]: string };

  @Input({required: true}) timeSpans: Array<Event>;

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) opts: IEventOptions;
  @Input({required: true}) userOpts: IUserEventOptions;

  // contact and issue which are selected for event entry
  @Input({required: true}) eventContact: Contact;
  @Input({required: true}) eventIssue: Issue;
  @Input({required: true}) eventIssues: Array<Issue>;

  // eventContainer is the container (event itself,  date) for the event which is to be updated
  @Input({required: true}) eventContainer: {updateType: UpdateType, event: Event, d: Date};

  @Input({required: true}) events: Array<Event>;
  @Input({required: true}) eventsChangeCounter: number;

  // if event is to be shifted to another date we use targetEvents and targetEventDay
  @Input({required: true}) targetEvents: Array<Event>;
  @Input({required: true}) targetEventDay: Date;

  // categories are type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeChoices: Array<IChoice>;


  @Output() eventDaySelected = new EventEmitter<Date>();
  @Output() timeSpanUpdate = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() eventUpdate = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() eventUpdateAssoc = new EventEmitter<{updateType: UpdateType, event: Event}>();
  @Output() cardFormCancel = new EventEmitter();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  EventType: typeof EventType = EventType;
  UpdateType: typeof UpdateType = UpdateType;

  // day of event - 00:00 in browser timezone
  // eventDay comes first from opts
  eventDay: Date;
  eventDayDisplay = '';
  dateString = '';

  // in case of time spans:
  beginDisplay = '';
  endDisplay = '';
  days: number;

  isAfterToday = false;
  isContactInfo = false;
  isIssueInfo = false;

  // event contains a new event object (in case of insert) or cloned from eventContainer.event
  event: Event;
  // if event is timeSpan, it may have a style
  style: {};
  // cardFormEvents are surroundingevents on eventDay (or targetEventDay, if choosen), built from this.events or this.targetEvents
  cardFormEvents: Array<Event>;

  issueChoices: Array<IIssueChoice>;
  // ixSet is the issueChoices array index of the element which is actually joined to event
  ixSet: number;
  // isSelected is the issueChoices array index of the element which is shown as selected element
  ixSelected: number;

  updateTypeEnum: typeof UpdateType = UpdateType;
  locationTypeEnum: typeof LocationType = LocationType;
  locationTypeChoices: Array<IChoice>;

  // which time should be updated 1 begin, 2 end, 3 duration
  changeType: number;

  thisForm: FormGroup;
  errors: { [key: string]: string } = {};
  thisFormErrorMessages: ErrorMessage[];

  // date picker configuration
  // ViewChild static (since angular 8) not necessary cause ngxdp not used at ngOnInit
  @ViewChild('dp') ngxdp: AngularMyDatePickerDirective;
  public dpModel: IMyDateModel = null;   // not initial date set
  public dpDisabled = false;
  public dpEndModel: IMyDateModel = null;   // not initial date set
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

  public dateOpts: IAngularMyDpOptions;
  public dateEndOpts: IAngularMyDpOptions;

  constructor(private fb: FormBuilder) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit() {
    this.getEventParameters();
    this.setLocationTypeChoices();
    this.setIssueChoices();
    const {updateType, event, d} = this.eventContainer;
    if (event.type < EventType.timeSpanUndefined) {
      // we assure that only events of this day, previous day, reaching to this day and first event of next day are in allEvents
      this.cardFormEvents = GlobalFunctions.buildEvents(this.events, this.eventDay, true, true);
    }
    // console.log('event-container', this.eventContainer);
    switch (updateType) {
      case UpdateType.update:
        this.prepareUpdate(event);
        break;
      case UpdateType.insert:
          this.prepareInsert(event, d);
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
        if (event.type < EventType.timeSpanUndefined && this.eventDay) {
          // we assure that only events of this day, previous day, reaching to this day and first event of next day are in allEvents
          this.cardFormEvents = GlobalFunctions.buildEvents(this.events, this.eventDay, true, true);
        }
      }
      if (propKey === 'targetEventDay' || propKey === 'targetEvents') {
        // console.log('targetEventDay: ', this.targetEventDay);
        // console.log('tminutes: ', GlobalFunctions.getDateInMinutes(this.targetEventDay));
        // console.log('targetevents: ', this.targetEvents);
        isNewTarget = true;
      }
    }
    if (isNewTarget && this.eventContainer.event.type < EventType.timeSpanUndefined
    && GlobalFunctions.getDateInMinutes(this.targetEventDay) > 0 && this.eventContainer?.updateType === this.updateTypeEnum.update
    && GlobalFunctions.getDateInMinutes(this.eventDay) > 0
    && GlobalFunctions.getDateInMinutes(this.eventDay) !== GlobalFunctions.getDateInMinutes(this.targetEventDay)
    && this.targetEvents !== undefined && this.targetEvents !== null) {
      this.prepareUpdateForTarget();
    }
  }

  private getEventParameters() {
    // defaultIntervlLength is taken from opts in "prepareInsert()"
    this.eventDay = this.session.eventDay;
    this.eventDayDisplay = formatDate(this.eventDay, 'EEE d.MM.yyyy', this.locale);
    const today = GlobalFunctions.getStartOfDay(new Date());
    const tomorrow = GlobalFunctions.addDays(today, 1);;
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.eventDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
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
      disableSince = GlobalFunctions.addDays(this.eventDay, 1);
    } else if (event?.type === EventType.plan) {
      disableUntil = GlobalFunctions.addDays(this.eventDay, -1);;
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

  private setIssueChoices() {
    this.issueChoices = [];
    this.ixSelected = -1;
    this.ixSet = 0;
    const {updateType, event, d} = this.eventContainer;
    // choice value 1 is event is not assigned exists anyway
    this.issueChoices.push({value: 1, contactNr: 0,
    isSelected: false, displayText: this.txt['not_assigned']});
    // choice value 2 is contact of event, if event is assigned direct to contact, without issue
    // choice value 3 is issue of event
    if (updateType === UpdateType.update && (event.contactNr > 0 || event.issueProviderId > 0)) {
      let contactName = event.eventInfo.contactName && event.eventInfo.contactName !== ''
          ? event.eventInfo.contactName
          : event.eventInfo.contactNr > 0
            ? (this.session.serviceLevel.contact === 1 ? this.txt['contact'] : this.txt['contact']) + ': ' + event.eventInfo.contactNr.toString()
            : '';
      this.issueChoices.push({value: event.contactNr > 0 && event.issueProviderId === 0 ? 2 : 3,
        contactNr: event.eventInfo.contactNr,
        contactName : contactName.substring(0,20),
        displayNr: event.issueProviderId > 0 ? event.eventInfo.issueDisplayNr : event.eventInfo.contactDisplayNr,
        issueText: event.eventInfo.issueText?.substring(0,30),
        externalId: event.eventInfo.sExternalIssueId,
        text: event.eventInfo.issueNote?.substring(0,50),
        // TODO contact/issue based default locationType
        defaultLocationType:  event.contactNr > 0 ? LocationType.onSite : null,
        isSelected: event.issueProviderId === 0 && event.contactNr === this.eventContact.contactNr ? true
        : this.eventIssue.issueProviderId === event.issueProviderId
        && this.eventIssue.nExternalIssueId === event.eventInfo?.nExternalIssueId
        && this.eventIssue.sExternalIssueId === event.eventInfo?.sExternalIssueId
        ? true
        : false,
        displayText:  event.eventInfo.issueProviderId > 0
        ? (event.eventInfo.issueDisplayNr)
          + '|' + event.eventInfo.issueText?.substring(0,30)
          + (event.eventInfo.contactNr > 0
          ? ('|' + contactName.substring(0,20))
          : '')
        : event.eventInfo.contactNr > 0
        ? ( (this.session.serviceLevel.contact === 1 ? this.txt['contact'] : this.txt['contact']) + ': ' +  event.eventInfo.contactDisplayNr + '|' + contactName.substring(0,30))
        : ''
      });
      if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
        this.ixSelected = this.issueChoices.length - 1;
      }
      // ixSet is set to the legacy joined contact or issue
      this.ixSet = this.issueChoices.length - 1;
    }

    // choice value 4 choice for eventContact selected in this session - if not already shown as contact
    if (this.eventContact?.contactNr > 0) {
      if (event.type >= EventType.timeSpanUndefined) {
        if (this.eventContact.contactNr !== event.contactNr) {
          this.issueChoices.push({value: 4,
            contactNr: this.eventContact.contactNr,
            contactName: this.eventContact.name?.substring(0,30),
            displayNr: this.eventContact.displayNr,
            isSelected: true,
            displayText: this.eventContact.displayNr + '|' + this.eventContact.name?.substring(0,30)
          });
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        }
      } else {
        // a choice with value 4 is built if contact is not the joined contact of event  - and contact is chooseable if booking is allowed
        if ((this.eventContact.contactNr !== event.contactNr || event.eventInfo.issueProviderId > 0) && this.opts.isContactBooking) {
          this.issueChoices.push({value: 4,
            contactNr: this.eventContact.contactNr,
            contactName: this.eventContact.name?.substring(0,30),
            displayNr: this.eventContact.displayNr,
            issueText: this.txt['without_issue'],
            isSelected: this.eventIssue.issueProviderId === 0,
            displayText:  (this.session.serviceLevel.contact === 1 ? this.txt['contact'] : this.txt['contact']) + ': ' + this.eventContact.displayNr + '|' + this.eventContact.name?.substring(0,30)});
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        }

      } // end else type >= timeSpanUndefined
    } // end if contactId > 0
    // choice value >= 5 other issues of the same contact (eventIssues are built in event-day from all contact issues,  only if isChooseAllContactIssues
    // - but eventIssue itself is among them anyway)
    if (this.eventIssues?.length > 0 && event.type < EventType.timeSpanUndefined) {
      // from issues  we build issueChoices
      for (let ix = 0; ix < this.eventIssues.length; ix++) {
        if (event.issueProviderId === 0
          || this.eventIssues[ix].issueProviderId !== event.issueProviderId
          || this.eventIssues[ix].nExternalIssueId !== event.eventInfo?.nExternalIssueId
          || this.eventIssues[ix].sExternalIssueId !== event.eventInfo?.sExternalIssueId
          || this.eventIssues[ix].providerUrl !== event.eventInfo?.providerUrl
          || this.eventIssues[ix].login !== event.eventInfo?.login) {
          let contactName = this.eventContact.name && this.eventContact.name !== ''
          ? this.eventContact.name
          : this.eventIssues[ix].contactNr > 0
            ? (this.session.serviceLevel.contact === 1 ? this.txt['contact'] : this.txt['contact']) + ': ' + this.eventIssues[ix].contactNr.toString()
            : '';
          this.issueChoices.push({value: 5 + ix, contactNr: this.eventIssues[ix].contactNr,
            contactName: contactName.substring(0,20),
            displayNr: this.eventIssues[ix].displayNr,
            issueText: this.eventIssues[ix].summary?.substring(0,30),
            externalId: this.eventIssues[ix].sExternalIssueId,
            text: this.eventIssues[ix].description?.substring(0,50),
            // TODO contact/issue based default locationType
            defaultLocationType: null,
            // style: this.eventIssues[ix].style,
            eventIssuesIndex: ix,
            // eventIssue is selected
            isSelected: this.eventIssues[ix].issueProviderId === this.eventIssue.issueProviderId
            && this.eventIssues[ix].nExternalIssueId === this.eventIssue.nExternalIssueId
            && this.eventIssues[ix].sExternalIssueId === this.eventIssue.sExternalIssueId,
            displayText: this.eventIssues[ix].displayNr
              + '|' + this.eventIssues[ix].summary?.substring(0,30)
              + (this.eventIssues[ix].contactNr > 0
              ? ('|' + contactName.substring(0,20))
              : '')
          });
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        } // end if issueProviderId ...
      } // end for eventIssues
    } // end check eventIssues length

    if (this.ixSelected < 0 && this.issueChoices.length > 0 && UpdateType.update) {
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
      spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,  this.eventDay, this.event.eventId);
      spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,  this.eventDay, this.event.eventId);
    } else {
      this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
      this.beginDisplay = formatDate(this.event.eventBegin, 'EEE d.MM.yyyy', this.locale);
      this.endDisplay = formatDate(GlobalFunctions.addDays(this.event.eventEnd, -1), 'EEE d.MM.yyyy', this.locale);
      this.addDpOptions(event);
    }
    this.event.cardElement = {spaceBefore, spaceAfter,
       isTemporary: false, isSummaryUpdated: false, eventDurationDisplay, custIssueNr: '', custIssueName: ''};
    if (event.type < EventType.timeSpanUndefined) {
      this.buildShiftChoices();
    } else {
      const category = event.type % 10;
      const ix = this.timeSpanTypeChoices.findIndex(_ => Number(_.value) === category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style;
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
      const nextEvent: Event = GlobalFunctions.getNextEvent(this.cardFormEvents, this.event.eventBegin);
      if (nextEvent && GlobalFunctions.isMinuteEarlier(nextEvent.eventBegin, this.event.eventEnd )) {
        this.event.eventEnd = nextEvent.eventBegin;
      }
      this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
      - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
      // @deprecated this.event.isUpdated = true;
      const eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
      const spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,  this.eventDay);
      const spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,  this.eventDay);
      this.event.cardElement = {isTemporary: false, isSummaryUpdated: false, spaceBefore, spaceAfter, eventDurationDisplay,
        custIssueNr: '', custIssueName: ''};
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
        custIssueNr: '', custIssueName: ''};
      this.addDpOptions(event);
    }
  }

  // only used at real events to have choices when shifting this events
  private buildShiftChoices() {
    // for shift before (= before event which is before selected events)
    const earlierBegin = GlobalFunctions.getPreviousBegin(this.event.eventBegin, this.event.eventDuration, this.cardFormEvents, this.eventDay);
    this.event.cardElement.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(this.event.eventBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
    // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

    // for shift after (= after event which is after selected events)
    const laterBegin = GlobalFunctions.getNextBegin(this.event.eventBegin, this.event.eventDuration, this.cardFormEvents, this.eventDay);
    this.event.cardElement.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(this.event.eventBegin) : 0;
    // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

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
    this.thisForm.get('bodyGroup.category').valueChanges
    .subscribe(category => {
      const ix = this.timeSpanTypeChoices.findIndex(_ => _.value === category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style;
      } else {
        this.style = {};
      }
    });
  }


  private positionViewport() {
    let element = document.getElementById('cardForm');
    // scrollIntoView is not implemented in jsdom...
    window.HTMLElement.prototype.scrollIntoView = function() {};
    element.scrollIntoView();
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
    let nextEvent: Event = GlobalFunctions.getNextEvent(this.cardFormEvents, begin);
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
    if (shiftMinutes !== undefined && shiftMinutes !== null) {
      let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetEventDay) - GlobalFunctions.getDateInMinutes(this.eventDay);
      // no shift or user accepts shifted begin
      if (shiftMinutes === 0 || confirm(this.txt['event_shifted_to']  + ' '
      + formatDate(GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff + shiftMinutes), 'HH:mm', this.locale) + '?')) {
        // we set the surrounding events to targetEvents
        this.cardFormEvents = GlobalFunctions.buildEvents(this.targetEvents, this.targetEventDay, true, true);
        // we set new eventBegin and eventEnd
        this.event.eventBegin = GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff + shiftMinutes);
        this.event.eventEnd = GlobalFunctions.addMinutes(this.event.eventEnd, minutesDiff + shiftMinutes);
        this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
          this.targetEventDay, this.event.eventId);
        this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
          this.targetEventDay, this.event.eventId);
        // now we set this eventDay
        this.eventDay = this.targetEventDay;
        // we build shiftChices for target eventDay
        this.buildShiftChoices();
        this.eventDayDisplay = formatDate(this.eventDay, 'EEE d.MM.yyyy', this.locale);
        const today = GlobalFunctions.getStartOfDay(new Date());
        const tomorrow = GlobalFunctions.addDays(today, 1);;
        this.isAfterToday = GlobalFunctions.getDateInMinutes(this.eventDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
      }
    } else {
      alert(this.txt['notPossible']  + '!');
    }
  }


  // returns minutes later (pr earlier, if negative) for a begin (relative to rangeBegin) in targetEvents
  // returns 0 if rangeBegin is unchanged, return null if no begin is possible
  private searchTargetBegin(): number {
    // ramgBegin rangeEnd are begin and end of range at target day
    let rangeBegin: Date;
    let rangeEnd: Date;
    let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetEventDay) - GlobalFunctions.getDateInMinutes(this.eventDay);
    // now we have begin and end at target day
    rangeBegin = GlobalFunctions.addMinutes(this.event.eventBegin, minutesDiff);
    rangeEnd = GlobalFunctions.addMinutes(this.event.eventEnd, minutesDiff);
    const rangeDuration = GlobalFunctions.getDateInMinutes(rangeEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
    // 1. we check if we can leave begin unchanged
    if (this.targetEvents.filter(_ => _.eventBegin <= rangeBegin && _.eventEnd > rangeBegin).length === 0
      && this.targetEvents.filter(_ => _.eventBegin < rangeEnd && _.eventEnd >= rangeEnd).length === 0
      && this.targetEvents.filter(_ => _.eventBegin > rangeBegin && _.eventEnd < rangeEnd).length === 0) {
      return 0;
    }
    // 2. we check if the space  before and after begin is enough to place whole range
    // so we would get earlier begin - this we do before we check later begin, bu not if we copy at today
    const spaceBefore = GlobalFunctions.getSpaceBefore(rangeBegin,this.targetEvents,this.targetEventDay);
    const spaceAfter = GlobalFunctions.getSpaceAfter(rangeBegin,this.targetEvents,this.targetEventDay);
    if (spaceBefore + spaceAfter >= rangeDuration
      && !GlobalFunctions.isMinuteSame(this.targetEventDay, this.eventDay)) {
      // we need no check for same/next day bacause here we get earlier
        return spaceAfter - rangeDuration;
    } else {
      // 3. if  begin is covered by a event, we try if spaceAfter end of this event is OK
      const eventAtBegin = this.targetEvents.find(_ => _.eventBegin <= rangeBegin && _.eventEnd > rangeBegin);
      if (eventAtBegin) {
        const spaceAfterEventAtBegin = GlobalFunctions.getSpaceAfter(eventAtBegin.eventEnd, this.targetEvents,this.targetEventDay);
        const shiftAtBegin = GlobalFunctions.getDateInMinutes(eventAtBegin.eventEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
        if (spaceAfterEventAtBegin >= rangeDuration
        && GlobalFunctions.getDateInMinutes(rangeBegin) - GlobalFunctions.getDateInMinutes(this.targetEventDay) + shiftAtBegin < 24 * 60) {
          return shiftAtBegin;
        }
      }
      // 4. if not, maybe we can shift after a next event
      const laterDate = GlobalFunctions.getNextBegin(rangeBegin, rangeDuration, this.targetEvents,this.targetEventDay);
      if (laterDate) {
        return GlobalFunctions.getDateInMinutes(laterDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
      }
    }
    // 5. here we are if we must shift earlier - first we try method 2. at eventDay
    if (spaceBefore + spaceAfter >= rangeDuration) {
        return spaceAfter - rangeDuration;
    }
    // 6. if not, maybe we can shift before a previous event
    const earlierDate = GlobalFunctions.getPreviousBegin(rangeBegin, rangeDuration, this.targetEvents,this.targetEventDay);
    if (earlierDate) {
      return GlobalFunctions.getDateInMinutes(earlierDate) - GlobalFunctions.getDateInMinutes(rangeBegin);
    }
    // 7. no possibilty to place range at target
    return null;
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setContactBgColorStyle (contactColor: string) {
    return StyleFactory.getBgColorStyle(contactColor, 0);
  }

  public shiftBefore() {
    this.event.eventBegin = GlobalFunctions.addMinutes(new Date(this.event.eventBegin), this.event.cardElement.shiftSpaceBefore * -1);
    this.event.eventEnd = GlobalFunctions.addMinutes(new Date(this.event.eventEnd), this.event.cardElement.shiftSpaceBefore * -1);
    this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
      this.eventDay, this.event.eventId);
    this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
     this.eventDay, this.event.eventId);
    this.buildShiftChoices();
  }

  public shiftAfter() {
    this.event.eventBegin = GlobalFunctions.addMinutes(this.event.eventBegin, this.event.cardElement.shiftSpaceAfter);
    this.event.eventEnd = GlobalFunctions.addMinutes(this.event.eventEnd, this.event.cardElement.shiftSpaceAfter);
    this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
      this.eventDay, this.event.eventId);
    this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
     this.eventDay, this.event.eventId);
    this.buildShiftChoices();
  }

  public setShowTimeChange(type: number) {
    this.changeType = type;
    this.event.cardElement.isShowTimeChange = true;
  }

  public timeUpdate(event: {updateType: UpdateType, event: Event, id: number}) {
    this.event = event.event;
    this.event.eventEnd = this.getNewEnd(event.event.eventBegin, event.event.eventEnd, event.event.eventId);
    // it could happen that we get new end due to a following event - we must update duration
    this.event.eventDuration = GlobalFunctions.getDateInMinutes(this.event.eventEnd)
    - GlobalFunctions.getDateInMinutes(this.event.eventBegin);
    this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(this.event.eventDuration);
    // this.event.eventId can be 0 in case of insert ....
    this.event.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.event.eventBegin, this.cardFormEvents,
       this.eventDay, this.event.eventId);
    this.event.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.event.eventEnd, this.cardFormEvents,
      this.eventDay, this.event.eventId);
    this.event.cardElement.isShowTimeChange = false;
  }

  public cancelTimeChangeView(event: {updateType: UpdateType, event: Event, id: number}) {
    this.event.cardElement.isShowTimeChange = false;
  }


  public setContactInfo() {
    this.isContactInfo = !this.isContactInfo;
  }

  public setIssueInfo() {
    this.isIssueInfo = !this.isIssueInfo;
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
        const choosenDate = event.singleDate.jsDate;
        if (GlobalFunctions.getDateInMinutes(this.eventDay) !== GlobalFunctions.getDateInMinutes(choosenDate)) {
          this.eventDaySelected.emit(choosenDate);
        }
        // we need no delay - we process targetEventDay at ngOnChange
        // setTimeout(() => {console.log('1 second finished!')}, 1000);
      }
    } else {
      const choosenDate = event.singleDate.jsDate;
      this.event.eventBegin = GlobalFunctions.getStartOfDay(choosenDate);
      this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
      this.beginDisplay = formatDate(this.event.eventBegin, 'EEE d.MM.yyyy', this.locale);
      this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.event.eventEnd) - GlobalFunctions.getDateInMinutes(this.event.eventBegin));
      this.addDpOptions(this.event);
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
      const choosenDate = event.singleDate.jsDate;
      // user choses date as last day of the time span - we store start of next day as eventEnd
      this.event.eventEnd = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(choosenDate), 1);
      this.days = GlobalFunctions.getDateInDays(this.event.eventEnd) - GlobalFunctions.getDateInDays(this.event.eventBegin);
      this.endDisplay = formatDate(GlobalFunctions.addDays(this.event.eventEnd, -1), 'EEE d.MM.yyyy', this.locale);
      this.event.cardElement.eventDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.event.eventEnd) - GlobalFunctions.getDateInMinutes(this.event.eventBegin));
      this.addDpOptions(this.event);
    }
  }

  public selectAnotherIssue(event: any) {
    if (event.target.value && Number(event.target.value) >= 0) {
      this.ixSelected = this.issueChoices.findIndex(_ => _.value === Number(event.target.value));
    }
  }

  public setAnotherIssue() {
    // console.log('event-info: ', this.event.eventInfo);
    this.ixSet = this.ixSelected >= 0 ? this.ixSelected : this.ixSet;
    if ((this.issueChoices[this.ixSet].value === 3 || this.issueChoices[this.ixSet].value >= 5)) {
      const defLocType = this.issueChoices[this.ixSet].defaultLocationType;
      if (defLocType > 0 && Number(this.thisForm.get('bodyGroup.locationType').value) !== defLocType) {
        if (confirm('set_to' + ': ' + this.txt[this.locationTypeEnum[defLocType]] + '?')) {
          this.thisForm.get('bodyGroup.locationType').patchValue(defLocType.toString());
        }
      }
    }
  }


  public submitForm() {
    this.event.summary = this.thisForm.value.bodyGroup.summary;
    this.event.locationType = Number(this.thisForm.value.bodyGroup.locationType);
    this.event.description = this.thisForm.value.bodyGroup.description;
    this.event.location = this.thisForm.value.bodyGroup.location;
    switch (true) {
      case (this.ixSet === 0):
        this.event.contactNr = 0;
        this.event.issueProviderId = 0;
        this.event.nExternalIssueId = 0;
        this.event.sExternalIssueId = '';
        this.event.providerUrl = '';
        this.event.login = '';
        break;
      case (this.ixSet === 1 && this.issueChoices[1].value === 2):
        this.event.contactNr = this.eventContainer.event.contactNr;
        this.event.issueProviderId = 0;
        this.event.nExternalIssueId = 0;
        this.event.sExternalIssueId = '';
        this.event.providerUrl = '';
        this.event.login = '';
        break;
      case (this.ixSet === 1 && this.issueChoices[1].value === 3):
        // contact and issue stay as they were ...
        break;
      case (this.ixSet >= 1 && this.issueChoices[this.ixSet].value === 4):
        this.event.contactNr = this.eventContact.contactNr;
        this.event.issueProviderId = 0;
        this.event.nExternalIssueId = 0;
        this.event.sExternalIssueId = '';
        this.event.providerUrl = '';
        this.event.login = '';
        break;
      case (this.ixSet >= 1 && this.issueChoices[this.ixSet].value >= 5):
        const choice = this.issueChoices[this.ixSet].eventIssuesIndex;
        this.event.contactNr = this.eventIssues[choice].contactNr;
        this.event.issueProviderId = this.eventIssues[choice].issueProviderId;
        this.event.nExternalIssueId = this.eventIssues[choice].nExternalIssueId;
        this.event.sExternalIssueId = this.eventIssues[choice].sExternalIssueId;
        this.event.providerUrl = this.eventIssues[choice].providerUrl;
        this.event.login = this.eventIssues[choice].login;
        break;
    }
    if (this.event.type < EventType.timeSpanUndefined) {
      // when updating real events (type < EventType.timeSpanUndefined) it might be that there are associated events where contact, issue should also be updated
      if (this.eventContainer.updateType !== UpdateType.insert
        && (this.event.contactNr !== this.eventContainer.event.contactNr
          || this.event.issueProviderId !== this.eventContainer.event.issueProviderId
          || this.event.nExternalIssueId !== this.eventContainer.event.nExternalIssueId
          || this.event.sExternalIssueId !== this.eventContainer.event.sExternalIssueId
          || this.event.providerUrl !== this.eventContainer.event.providerUrl
          || this.event.login !== this.eventContainer.event.login)) {
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
        this.style = this.timeSpanTypeChoices[ix].style;
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



