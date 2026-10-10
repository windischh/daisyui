import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { formatDate, NgClass, NgTemplateOutlet, NgStyle, SlicePipe, DatePipe } from '@angular/common';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { MAX_MONTHS, MAX_INTERVAL_LENGTH, POWDER_BLUE } from '../../_globals/constants';

import { Work } from '../../_db/work';
import { Session } from '../../_db/session';
import { Customer } from '../../_db/customer';
import { Issue } from '../../_db/issue';
import { ConfigurationOption } from '../../_db/configuration-option';

import { IIssueChoice } from '../../_interfaces/i-issue-choice';
import { IWorkOptions } from '../../_interfaces/i-work-options';
import { IUserWorkOptions } from '../../_interfaces/i-user-work-options';
import { IChoice } from '../../_interfaces/i-choice';

import { LocationType } from '../../_enums/location-type.enum';
import { UpdateType } from '../../_enums/update-type.enum';
import { WorkType } from '../../_enums/work-type.enum';


import { ErrorMessage } from '../../_validators/error-message';

import { IAngularMyDpOptions, IMyDate, IMyDateModel, IMyDateRange, IMyInputFieldChanged, AngularMyDatePickerDirective, AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { WorkDayTimeChangeComponent } from '../work-day-time-change/work-day-time-change.component';



@Component({
  selector: 'dsy-calendar-day-card-form-view',
  templateUrl: './calendar-day-card-form-view.html',
  styleUrl: './calendar-day-card-form-view.css',
  imports: [FormsModule, ReactiveFormsModule, NgClass, AngularMyDatePickerModule, WorkDayTimeChangeComponent, NgTemplateOutlet, NgStyle, SlicePipe, DatePipe]
})
export class WorkDayCardFormViewComponent implements OnInit {

  public name = 'WorkDayCardFormViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) custtxt: { [key: string]: string };
  @Input({required: true}) issuetxt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };

  @Input({required: true}) timeSpans: Array<Work>;

  @Input({required: true}) options: Array<ConfigurationOption>;
  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by work-day-component
  @Input({required: true}) opts: IWorkOptions;
  @Input({required: true}) userOpts: IUserWorkOptions;

  // customer and issue which are selected for work entry
  @Input({required: true}) workCustomer: Customer;
  @Input({required: true}) workIssue: Issue;
  @Input({required: true}) workIssues: Array<Issue>;

  // workContainer is the container (work itself,  date) for the work which is to be updated
  @Input({required: true}) workContainer: {updateType: UpdateType, work: Work, d: Date};

  @Input({required: true}) works: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;

  // if work is to be shifted to another date we use targetWorks and targetWorkDay
  @Input({required: true}) targetWorks: Array<Work>;
  @Input({required: true}) targetWorkDay: Date;

  // categories are type-part x in time spans with types 2x
  @Input({required: true}) timeSpanTypeChoices: Array<IChoice>;


  @Output() workDaySelected = new EventEmitter<Date>();
  @Output() timeSpanUpdate = new EventEmitter<{updateType: UpdateType, work: Work}>();
  @Output() workUpdate = new EventEmitter<{updateType: UpdateType, work: Work}>();
  @Output() workUpdateAssoc = new EventEmitter<{updateType: UpdateType, work: Work}>();
  @Output() cardFormCancel = new EventEmitter();

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  WorkType: typeof WorkType = WorkType;
  UpdateType: typeof UpdateType = UpdateType;

  // day of work - 00:00 in browser timezone
  // workDay comes first from opts
  workDay: Date;
  workDayDisplay = '';
  dateString = '';

  // in case of time spans:
  beginDisplay = '';
  endDisplay = '';
  days: number;

  isAfterToday = false;
  isCustomerInfo = false;
  isIssueInfo = false;

  // work contains a new work object (in case of insert) or cloned from workContainer.work
  work: Work;
  // if work is timeSpan, it may have a style
  style: {};
  // cardFormWorks are surroundingworks on workDay (or targetWorkDay, if choosen), built from this.works or this.targetWorks
  cardFormWorks: Array<Work>;

  issueChoices: Array<IIssueChoice>;
  // ixSet is the issueChoices array index of the element which is actually joined to work
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
    this.getWorkParameters();
    this.setLocationTypeChoices();
    this.setIssueChoices();
    const {updateType, work, d} = this.workContainer;
    if (work.type < WorkType.timeSpanUndefined) {
      // we assure that only works of this day, previous day, reaching to this day and first work of next day are in allWorks
      this.cardFormWorks = GlobalFunctions.buildWorks(this.works, this.workDay, true, true);
    }
    // console.log('work-container', this.workContainer);
    switch (updateType) {
      case UpdateType.update:
        this.prepareUpdate(work);
        break;
      case UpdateType.insert:
          this.prepareInsert(work, d);
          break;
    }
    this.loadErrorMessages();
    this.initThisForm();
    this.positionViewport();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    let isNewTarget = false;
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'works') {
        const {updateType, work, d} = this.workContainer;
        if (work.type < WorkType.timeSpanUndefined && this.workDay) {
          // we assure that only works of this day, previous day, reaching to this day and first work of next day are in allWorks
          this.cardFormWorks = GlobalFunctions.buildWorks(this.works, this.workDay, true, true);
        }
      }
      if (propKey === 'targetWorkDay' || propKey === 'targetWorks') {
        // console.log('targetWorkDay: ', this.targetWorkDay);
        // console.log('tminutes: ', GlobalFunctions.getDateInMinutes(this.targetWorkDay));
        // console.log('targetworks: ', this.targetWorks);
        isNewTarget = true;
      }
    }
    if (isNewTarget && this.workContainer.work.type < WorkType.timeSpanUndefined
    && GlobalFunctions.getDateInMinutes(this.targetWorkDay) > 0 && this.workContainer?.updateType === this.updateTypeEnum.update
    && GlobalFunctions.getDateInMinutes(this.workDay) > 0
    && GlobalFunctions.getDateInMinutes(this.workDay) !== GlobalFunctions.getDateInMinutes(this.targetWorkDay)
    && this.targetWorks !== undefined && this.targetWorks !== null) {
      this.prepareUpdateForTarget();
    }
  }

  private getWorkParameters() {
    // defaultIntervlLength is taken from opts in "prepareInsert()"
    this.workDay = this.session.workDay;
    this.workDayDisplay = formatDate(this.workDay, 'EEE d.MM.yyyy', this.locale);
    const today = GlobalFunctions.getStartOfDay(new Date());
    const tomorrow = GlobalFunctions.addDays(today, 1);;
    this.isAfterToday = GlobalFunctions.getDateInMinutes(this.workDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
    // in case of plan and actual we must check work-day
    const {updateType, work, d} = this.workContainer;
    this.addDpOptions(work);
  }

  // dateOpts are built
  private addDpOptions(work: Work) {

    // utils.clone would not work
    this.dateOpts = this.getCopyOfDpOptions(this.myDatepickerOptions);

    this.dateOpts.todayTxt = this.txt['today'];

    const disabled: IMyDateRange[] = GlobalFunctions.clone(this.disabledRanges);

    this.dateOpts.disableDateRanges = disabled;

    // we limit date entry to MAX_MONTHS before today and to MAX_MONTHS after today
    // (it is necessary to enter a disable entry in all cases if it has been entered in 1 case
    // cause component would not reset option otherwise)
    let disableSince = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS);
    let disableUntil = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS * -1);

    if (work?.type === WorkType.actual) {
      disableSince = GlobalFunctions.addDays(this.workDay, 1);
    } else if (work?.type === WorkType.plan) {
      disableUntil = GlobalFunctions.addDays(this.workDay, -1);;
    } else {
      disableSince = work?.workEnd;
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
            year: _.workBegin.getFullYear(), month: _.workBegin.getMonth() + 1, day: _.workBegin.getDate()
          }
          this.highlightDates.push(holiday);
        }
      });
    }

    this.dateOpts.highlightDates = this.highlightDates;

    // we need dateEndOpts only in case of time spans ...
    this.dateEndOpts = this.getCopyOfDpOptions(this.dateOpts);

    disableSince = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS);
    disableUntil = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(work?.workBegin), -1);

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
    const {updateType, work, d} = this.workContainer;
    // choice value 1 is work is not assigned exists anyway
    this.issueChoices.push({value: 1, customerNr: 0,
    isSelected: false, displayText: this.txt['not_assigned']});
    // choice value 2 is customer of work, if work is assigned direct to customer, without issue
    // choice value 3 is issue of work
    if (updateType === UpdateType.update && (work.customerNr > 0 || work.issueProviderId > 0)) {
      let customerName = work.workInfo.customerName && work.workInfo.customerName !== ''
          ? work.workInfo.customerName
          : work.workInfo.customerNr > 0
            ? (this.session.serviceLevel.customer === 1 ? this.txt['contact'] : this.txt['customer']) + ': ' + work.workInfo.customerNr.toString()
            : '';
      this.issueChoices.push({value: work.customerNr > 0 && work.issueProviderId === 0 ? 2 : 3,
        customerNr: work.workInfo.customerNr,
        customerName : customerName.substring(0,20),
        displayNr: work.issueProviderId > 0 ? work.workInfo.issueDisplayNr : work.workInfo.customerDisplayNr,
        issueText: work.workInfo.issueText?.substring(0,30),
        externalId: work.workInfo.sExternalIssueId,
        text: work.workInfo.issueNote?.substring(0,50),
        // TODO customer/issue based default locationType
        defaultLocationType:  work.customerNr > 0 ? LocationType.onSite : null,
        isSelected: work.issueProviderId === 0 && work.customerNr === this.workCustomer.customerNr ? true
        : this.workIssue.issueProviderId === work.issueProviderId
        && this.workIssue.nExternalIssueId === work.workInfo?.nExternalIssueId
        && this.workIssue.sExternalIssueId === work.workInfo?.sExternalIssueId
        ? true
        : false,
        displayText:  work.workInfo.issueProviderId > 0
        ? (work.workInfo.issueDisplayNr)
          + '|' + work.workInfo.issueText?.substring(0,30)
          + (work.workInfo.customerNr > 0
          ? ('|' + customerName.substring(0,20))
          : '')
        : work.workInfo.customerNr > 0
        ? ( (this.session.serviceLevel.customer === 1 ? this.txt['contact'] : this.txt['customer']) + ': ' +  work.workInfo.customerDisplayNr + '|' + customerName.substring(0,30))
        : ''
      });
      if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
        this.ixSelected = this.issueChoices.length - 1;
      }
      // ixSet is set to the legacy joined customer or issue
      this.ixSet = this.issueChoices.length - 1;
    }

    // choice value 4 choice for workCustomer selected in this session - if not already shown as customer
    if (this.workCustomer?.customerNr > 0) {
      if (work.type >= WorkType.timeSpanUndefined) {
        if (this.workCustomer.customerNr !== work.customerNr) {
          this.issueChoices.push({value: 4,
            customerNr: this.workCustomer.customerNr,
            customerName: this.workCustomer.name?.substring(0,30),
            displayNr: this.workCustomer.displayNr,
            isSelected: true,
            displayText: this.workCustomer.displayNr + '|' + this.workCustomer.name?.substring(0,30)
          });
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        }
      } else {
        // a choice with value 4 is built if customer is not the joined customer of work  - and customer is chooseable if booking is allowed
        if ((this.workCustomer.customerNr !== work.customerNr || work.workInfo.issueProviderId > 0) && this.opts.isCustomerBooking) {
          this.issueChoices.push({value: 4,
            customerNr: this.workCustomer.customerNr,
            customerName: this.workCustomer.name?.substring(0,30),
            displayNr: this.workCustomer.displayNr,
            issueText: this.txt['without_issue'],
            isSelected: this.workIssue.issueProviderId === 0,
            displayText:  (this.session.serviceLevel.customer === 1 ? this.txt['contact'] : this.txt['customer']) + ': ' + this.workCustomer.displayNr + '|' + this.workCustomer.name?.substring(0,30)});
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        }

      } // end else type >= timeSpanUndefined
    } // end if customerId > 0
    // choice value >= 5 other issues of the same customer (workIssues are built in work-day from all customer issues,  only if isChooseAllCustomerIssues
    // - but workIssue itself is among them anyway)
    if (this.workIssues?.length > 0 && work.type < WorkType.timeSpanUndefined) {
      // from issues  we build issueChoices
      for (let ix = 0; ix < this.workIssues.length; ix++) {
        if (work.issueProviderId === 0
          || this.workIssues[ix].issueProviderId !== work.issueProviderId
          || this.workIssues[ix].nExternalIssueId !== work.workInfo?.nExternalIssueId
          || this.workIssues[ix].sExternalIssueId !== work.workInfo?.sExternalIssueId
          || this.workIssues[ix].providerUrl !== work.workInfo?.providerUrl
          || this.workIssues[ix].login !== work.workInfo?.login) {
          let customerName = this.workCustomer.name && this.workCustomer.name !== ''
          ? this.workCustomer.name
          : this.workIssues[ix].customerNr > 0
            ? (this.session.serviceLevel.customer === 1 ? this.txt['contact'] : this.txt['customer']) + ': ' + this.workIssues[ix].customerNr.toString()
            : '';
          this.issueChoices.push({value: 5 + ix, customerNr: this.workIssues[ix].customerNr,
            customerName: customerName.substring(0,20),
            displayNr: this.workIssues[ix].displayNr,
            issueText: this.workIssues[ix].summary?.substring(0,30),
            externalId: this.workIssues[ix].sExternalIssueId,
            text: this.workIssues[ix].description?.substring(0,50),
            // TODO customer/issue based default locationType
            defaultLocationType: null,
            // style: this.workIssues[ix].style,
            workIssuesIndex: ix,
            // workIssue is selected
            isSelected: this.workIssues[ix].issueProviderId === this.workIssue.issueProviderId
            && this.workIssues[ix].nExternalIssueId === this.workIssue.nExternalIssueId
            && this.workIssues[ix].sExternalIssueId === this.workIssue.sExternalIssueId,
            displayText: this.workIssues[ix].displayNr
              + '|' + this.workIssues[ix].summary?.substring(0,30)
              + (this.workIssues[ix].customerNr > 0
              ? ('|' + customerName.substring(0,20))
              : '')
          });
          if (this.issueChoices[this.issueChoices.length - 1].isSelected) {
            this.ixSelected = this.issueChoices.length - 1;
          }
        } // end if issueProviderId ...
      } // end for workIssues
    } // end check workIssues length

    if (this.ixSelected < 0 && this.issueChoices.length > 0 && UpdateType.update) {
      this.ixSelected = 0;
    }
  }



  /**
   * prepareUpdate - first preparation of original work which is beeing updated
   * @param work (from workContainer), is cloned to have a new object for updating the model
   *   special handling if work.type >= WorkType.timeSpanUndefined (time span, without begin time and end time)
   */
   private prepareUpdate(work: Work) {
    this.work = GlobalFunctions.clone(work);
    let spaceBefore = 0;
    let spaceAfter = 0;
    const workDurationDisplay = GlobalFunctions.minutesDisplay(this.work.workDuration);
    if (work.type < WorkType.timeSpanUndefined) {
      spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,  this.workDay, this.work.workId);
      spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,  this.workDay, this.work.workId);
    } else {
      this.days = GlobalFunctions.getDateInDays(this.work.workEnd) - GlobalFunctions.getDateInDays(this.work.workBegin);
      this.beginDisplay = formatDate(this.work.workBegin, 'EEE d.MM.yyyy', this.locale);
      this.endDisplay = formatDate(GlobalFunctions.addDays(this.work.workEnd, -1), 'EEE d.MM.yyyy', this.locale);
      this.addDpOptions(work);
    }
    this.work.cardElement = {spaceBefore, spaceAfter,
       isTemporary: false, isSummaryUpdated: false, workDurationDisplay, custIssueNr: '', custIssueName: ''};
    if (work.type < WorkType.timeSpanUndefined) {
      this.buildShiftChoices();
    } else {
      const category = work.type % 10;
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
   * @param work (from workContainer - can contain summary, locationType from entries in other views ...)
   *   special handling if work.type >= WorkType.timeSpanUndefined (time span, without begin time and end time)
   * @param d date and time for insertion of new work, entered in other views ...
   */
  private prepareInsert(work: Work, d: Date) {
    this.work = work;
    if (this.work.type < WorkType.timeSpanUndefined) {
      // if we have empty work from grid or temporary inserted work from workCard
      if (this.work.workDuration === undefined || work.workDuration === null || work.workDuration === 0) {
        this.work.type = this.session.isPlan ? WorkType.plan : WorkType.actual;
        this.work.workBegin = d;
        this.work.workDuration = this.opts.defaultIntervalLength;
        this.work.workEnd = GlobalFunctions.addMinutes(this.work.workBegin, this.work.workDuration);
      }
      const nextWork: Work = GlobalFunctions.getNextWork(this.cardFormWorks, this.work.workBegin);
      if (nextWork && GlobalFunctions.isMinuteEarlier(nextWork.workBegin, this.work.workEnd )) {
        this.work.workEnd = nextWork.workBegin;
      }
      this.work.workDuration = GlobalFunctions.getDateInMinutes(this.work.workEnd)
      - GlobalFunctions.getDateInMinutes(this.work.workBegin);
      // @deprecated this.work.isUpdated = true;
      const workDurationDisplay = GlobalFunctions.minutesDisplay(this.work.workDuration);
      const spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,  this.workDay);
      const spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,  this.workDay);
      this.work.cardElement = {isTemporary: false, isSummaryUpdated: false, spaceBefore, spaceAfter, workDurationDisplay,
        custIssueNr: '', custIssueName: ''};
    } else {
      this.work.workBegin = GlobalFunctions.getStartOfDay(d);
      // duration in time span is built dynamically - work.workDuration is set to 0
      this.work.workDuration = 0;
      // end is set to begin of next day
      this.work.workEnd = GlobalFunctions.addDays(this.work.workBegin, 1);
      this.beginDisplay = formatDate(this.work.workBegin, 'EEE d.MM.yyyy', this.locale);
      this.days = 1;
      const workDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.work.workEnd) - GlobalFunctions.getDateInMinutes(this.work.workBegin));
      this.work.cardElement = {isTemporary: false, isSummaryUpdated: false, spaceBefore: 0, spaceAfter: 0, workDurationDisplay,
        custIssueNr: '', custIssueName: ''};
      this.addDpOptions(work);
    }
  }

  // only used at real works to have choices when shifting this works
  private buildShiftChoices() {
    // for shift before (= before work which is before selected works)
    const earlierBegin = GlobalFunctions.getPreviousBegin(this.work.workBegin, this.work.workDuration, this.cardFormWorks, this.workDay);
    this.work.cardElement.shiftSpaceBefore = earlierBegin ? GlobalFunctions.getDateInMinutes(this.work.workBegin) - GlobalFunctions.getDateInMinutes(earlierBegin) : 0;
    // console.log('shiftSpaceBefore', this.shiftSpaceBefore);

    // for shift after (= after work which is after selected works)
    const laterBegin = GlobalFunctions.getNextBegin(this.work.workBegin, this.work.workDuration, this.cardFormWorks, this.workDay);
    this.work.cardElement.shiftSpaceAfter = laterBegin ? GlobalFunctions.getDateInMinutes(laterBegin) - GlobalFunctions.getDateInMinutes(this.work.workBegin) : 0;
    // console.log('shiftSpaceAfter', this.shiftSpaceAfter);

  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('bodyGroup.summary', 'required',  this.worktxt['summary'] + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('bodyGroup.summary', 'minlength', this.worktxt['summary']
      + ' ' + this.txt['must_have_at_least'] + ' 1 ' + this.txt['positions_containing']),
      new ErrorMessage('bodyGroup.summary', 'maxlength', this.worktxt['summary']
      + ' ' + this.txt['must_have_not_more'] + ' 255 ' + this.txt['positions_containing']),
      new ErrorMessage('bodyGroup.location', 'maxlength', this.worktxt['location']
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
        // summary: [this.workContainer.updateType === UpdateType.insert ? '' : this.work.summary, [
        summary: [this.work?.summary, [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(255)
          ]
        ],
        locationType: [this.work?.locationType],
        description: [this.workContainer.updateType === UpdateType.insert ? '' : this.work.description],
        location: [this.workContainer.updateType === UpdateType.insert ? '' : this.work.location, [
          Validators.maxLength(255)
          ]
        ],
        category: [this.work?.type >= WorkType.timeSpanUndefined ? (this.work.type % 10).toString() : '']
      })
    });
    this.onChangesWorkType();
    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
  }

private onChangesWorkType() {
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
   * when time is updated, we must check if another work is after and end time has to be adjusted
   * - works must not overlap
   *
   * @param begin new begin time
   * @param end new end time
   * @param workId id of processed work
   * @returns eventually corrected end time
   */
  private getNewEnd(begin: Date, end: Date, workId: number): Date {
    let nextWork: Work = GlobalFunctions.getNextWork(this.cardFormWorks, begin);
    // if we get this processed work as next work we search for real next work
    if (nextWork && workId === nextWork.workId) {
      nextWork = GlobalFunctions.getNextWork(this.cardFormWorks, GlobalFunctions.addMinutes(nextWork.workBegin, 1));
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


  /**
   * prepareUpdateForTarget -  preparation of original work for a target date
   */
   private prepareUpdateForTarget() {
    const shiftMinutes = this.searchTargetBegin();
    if (shiftMinutes !== undefined && shiftMinutes !== null) {
      let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetWorkDay) - GlobalFunctions.getDateInMinutes(this.workDay);
      // no shift or user accepts shifted begin
      if (shiftMinutes === 0 || confirm(this.txt['work_shifted_to']  + ' '
      + formatDate(GlobalFunctions.addMinutes(this.work.workBegin, minutesDiff + shiftMinutes), 'HH:mm', this.locale) + '?')) {
        // we set the surrounding works to targetWorks
        this.cardFormWorks = GlobalFunctions.buildWorks(this.targetWorks, this.targetWorkDay, true, true);
        // we set new workBegin and workEnd
        this.work.workBegin = GlobalFunctions.addMinutes(this.work.workBegin, minutesDiff + shiftMinutes);
        this.work.workEnd = GlobalFunctions.addMinutes(this.work.workEnd, minutesDiff + shiftMinutes);
        this.work.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,
          this.targetWorkDay, this.work.workId);
        this.work.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,
          this.targetWorkDay, this.work.workId);
        // now we set this workDay
        this.workDay = this.targetWorkDay;
        // we build shiftChices for target workDay
        this.buildShiftChoices();
        this.workDayDisplay = formatDate(this.workDay, 'EEE d.MM.yyyy', this.locale);
        const today = GlobalFunctions.getStartOfDay(new Date());
        const tomorrow = GlobalFunctions.addDays(today, 1);;
        this.isAfterToday = GlobalFunctions.getDateInMinutes(this.workDay) >= GlobalFunctions.getDateInMinutes(tomorrow);
      }
    } else {
      alert(this.txt['notPossible']  + '!');
    }
  }


  // returns minutes later (pr earlier, if negative) for a begin (relative to rangeBegin) in targetWorks
  // returns 0 if rangeBegin is unchanged, return null if no begin is possible
  private searchTargetBegin(): number {
    // ramgBegin rangeEnd are begin and end of range at target day
    let rangeBegin: Date;
    let rangeEnd: Date;
    let minutesDiff = GlobalFunctions.getDateInMinutes(this.targetWorkDay) - GlobalFunctions.getDateInMinutes(this.workDay);
    // now we have begin and end at target day
    rangeBegin = GlobalFunctions.addMinutes(this.work.workBegin, minutesDiff);
    rangeEnd = GlobalFunctions.addMinutes(this.work.workEnd, minutesDiff);
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
      && !GlobalFunctions.isMinuteSame(this.targetWorkDay, this.workDay)) {
      // we need no check for same/next day bacause here we get earlier
        return spaceAfter - rangeDuration;
    } else {
      // 3. if  begin is covered by a work, we try if spaceAfter end of this work is OK
      const workAtBegin = this.targetWorks.find(_ => _.workBegin <= rangeBegin && _.workEnd > rangeBegin);
      if (workAtBegin) {
        const spaceAfterWorkAtBegin = GlobalFunctions.getSpaceAfter(workAtBegin.workEnd, this.targetWorks,this.targetWorkDay);
        const shiftAtBegin = GlobalFunctions.getDateInMinutes(workAtBegin.workEnd) - GlobalFunctions.getDateInMinutes(rangeBegin);
        if (spaceAfterWorkAtBegin >= rangeDuration
        && GlobalFunctions.getDateInMinutes(rangeBegin) - GlobalFunctions.getDateInMinutes(this.targetWorkDay) + shiftAtBegin < 24 * 60) {
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

  public setCustomerBgColorStyle (customerColor: string) {
    return StyleFactory.getBgColorStyle(customerColor, 0);
  }

  public shiftBefore() {
    this.work.workBegin = GlobalFunctions.addMinutes(new Date(this.work.workBegin), this.work.cardElement.shiftSpaceBefore * -1);
    this.work.workEnd = GlobalFunctions.addMinutes(new Date(this.work.workEnd), this.work.cardElement.shiftSpaceBefore * -1);
    this.work.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,
      this.workDay, this.work.workId);
    this.work.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,
     this.workDay, this.work.workId);
    this.buildShiftChoices();
  }

  public shiftAfter() {
    this.work.workBegin = GlobalFunctions.addMinutes(this.work.workBegin, this.work.cardElement.shiftSpaceAfter);
    this.work.workEnd = GlobalFunctions.addMinutes(this.work.workEnd, this.work.cardElement.shiftSpaceAfter);
    this.work.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,
      this.workDay, this.work.workId);
    this.work.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,
     this.workDay, this.work.workId);
    this.buildShiftChoices();
  }

  public setShowTimeChange(type: number) {
    this.changeType = type;
    this.work.cardElement.isShowTimeChange = true;
  }

  public timeUpdate(event: {updateType: UpdateType, work: Work, id: number}) {
    this.work = event.work;
    this.work.workEnd = this.getNewEnd(event.work.workBegin, event.work.workEnd, event.work.workId);
    // it could happen that we get new end due to a following event - we must update duration
    this.work.workDuration = GlobalFunctions.getDateInMinutes(this.work.workEnd)
    - GlobalFunctions.getDateInMinutes(this.work.workBegin);
    this.work.cardElement.workDurationDisplay = GlobalFunctions.minutesDisplay(this.work.workDuration);
    // this.work.workId can be 0 in case of insert ....
    this.work.cardElement.spaceBefore = GlobalFunctions.getSpaceBefore(this.work.workBegin, this.cardFormWorks,
       this.workDay, this.work.workId);
    this.work.cardElement.spaceAfter = GlobalFunctions.getSpaceAfter(this.work.workEnd, this.cardFormWorks,
      this.workDay, this.work.workId);
    this.work.cardElement.isShowTimeChange = false;
  }

  public cancelTimeChangeView(event: {updateType: UpdateType, work: Work, id: number}) {
    this.work.cardElement.isShowTimeChange = false;
  }


  public setCustomerInfo() {
    this.isCustomerInfo = !this.isCustomerInfo;
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
    if (this.work.type < WorkType.timeSpanUndefined) {
      // in this surrounding we do not set isRange
      if (!event.isRange && this.workContainer.updateType !== UpdateType.insert) {
        const choosenDate = event.singleDate.jsDate;
        if (GlobalFunctions.getDateInMinutes(this.workDay) !== GlobalFunctions.getDateInMinutes(choosenDate)) {
          this.workDaySelected.emit(choosenDate);
        }
        // we need no delay - we process targetWorkDay at ngOnChange
        // setTimeout(() => {console.log('1 second finished!')}, 1000);
      }
    } else {
      const choosenDate = event.singleDate.jsDate;
      this.work.workBegin = GlobalFunctions.getStartOfDay(choosenDate);
      this.days = GlobalFunctions.getDateInDays(this.work.workEnd) - GlobalFunctions.getDateInDays(this.work.workBegin);
      this.beginDisplay = formatDate(this.work.workBegin, 'EEE d.MM.yyyy', this.locale);
      this.work.cardElement.workDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.work.workEnd) - GlobalFunctions.getDateInMinutes(this.work.workBegin));
      this.addDpOptions(this.work);
    }
  }

   // if type of angular-mydatepicker is hidden, this function is obsolete
   public onEndInputFieldChanged(event: IMyInputFieldChanged): void {
    // console.log('onInputFieldChanged(): Value: ', event.value, ' - dateFormat: ', event.dateFormat, ' - valid: ', event.valid);
  }


  public onEndDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    if (this.work.type < WorkType.timeSpanUndefined) {
      // not possible - end date is defined automatically
    } else {
      const choosenDate = event.singleDate.jsDate;
      // user choses date as last day of the time span - we store start of next day as workEnd
      this.work.workEnd = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(choosenDate), 1);
      this.days = GlobalFunctions.getDateInDays(this.work.workEnd) - GlobalFunctions.getDateInDays(this.work.workBegin);
      this.endDisplay = formatDate(GlobalFunctions.addDays(this.work.workEnd, -1), 'EEE d.MM.yyyy', this.locale);
      this.work.cardElement.workDurationDisplay = GlobalFunctions.minutesDisplay(GlobalFunctions.getDateInMinutes(this.work.workEnd) - GlobalFunctions.getDateInMinutes(this.work.workBegin));
      this.addDpOptions(this.work);
    }
  }

  public selectAnotherIssue(event: any) {
    if (event.target.value && Number(event.target.value) >= 0) {
      this.ixSelected = this.issueChoices.findIndex(_ => _.value === Number(event.target.value));
    }
  }

  public setAnotherIssue() {
    // console.log('work-info: ', this.work.workInfo);
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
    this.work.summary = this.thisForm.value.bodyGroup.summary;
    this.work.locationType = Number(this.thisForm.value.bodyGroup.locationType);
    this.work.description = this.thisForm.value.bodyGroup.description;
    this.work.location = this.thisForm.value.bodyGroup.location;
    switch (true) {
      case (this.ixSet === 0):
        this.work.customerNr = 0;
        this.work.issueProviderId = 0;
        this.work.nExternalIssueId = 0;
        this.work.sExternalIssueId = '';
        this.work.providerUrl = '';
        this.work.login = '';
        break;
      case (this.ixSet === 1 && this.issueChoices[1].value === 2):
        this.work.customerNr = this.workContainer.work.customerNr;
        this.work.issueProviderId = 0;
        this.work.nExternalIssueId = 0;
        this.work.sExternalIssueId = '';
        this.work.providerUrl = '';
        this.work.login = '';
        break;
      case (this.ixSet === 1 && this.issueChoices[1].value === 3):
        // customer and issue stay as they were ...
        break;
      case (this.ixSet >= 1 && this.issueChoices[this.ixSet].value === 4):
        this.work.customerNr = this.workCustomer.customerNr;
        this.work.issueProviderId = 0;
        this.work.nExternalIssueId = 0;
        this.work.sExternalIssueId = '';
        this.work.providerUrl = '';
        this.work.login = '';
        break;
      case (this.ixSet >= 1 && this.issueChoices[this.ixSet].value >= 5):
        const choice = this.issueChoices[this.ixSet].workIssuesIndex;
        this.work.customerNr = this.workIssues[choice].customerNr;
        this.work.issueProviderId = this.workIssues[choice].issueProviderId;
        this.work.nExternalIssueId = this.workIssues[choice].nExternalIssueId;
        this.work.sExternalIssueId = this.workIssues[choice].sExternalIssueId;
        this.work.providerUrl = this.workIssues[choice].providerUrl;
        this.work.login = this.workIssues[choice].login;
        break;
    }
    if (this.work.type < WorkType.timeSpanUndefined) {
      // when updating real works (type < WorkType.timeSpanUndefined) it might be that there are associated works where customer, issue should also be updated
      if (this.workContainer.updateType !== UpdateType.insert
        && (this.work.customerNr !== this.workContainer.work.customerNr
          || this.work.issueProviderId !== this.workContainer.work.issueProviderId
          || this.work.nExternalIssueId !== this.workContainer.work.nExternalIssueId
          || this.work.sExternalIssueId !== this.workContainer.work.sExternalIssueId
          || this.work.providerUrl !== this.workContainer.work.providerUrl
          || this.work.login !== this.workContainer.work.login)) {
        this.workUpdateAssoc.emit({updateType: this.workContainer.updateType, work: this.work});
      } else {
        this.workUpdate.emit({updateType: this.workContainer.updateType, work: this.work});
      }
    } else {
      let category = Number(this.thisForm.value.bodyGroup.category);
      if (category === 0 && this.timeSpanTypeChoices.length > 0) {
        category = Number(this.timeSpanTypeChoices[0].value);
      }
      this.work.type = WorkType.timeSpanUndefined + category;
      const ix = this.timeSpanTypeChoices.findIndex(_ => _.value === this.thisForm.value.bodyGroup.category);
      if (ix >= 0) {
        this.style = this.timeSpanTypeChoices[ix].style;
      } else {
        this.style = {};
      }
      this.timeSpanUpdate.emit({updateType: this.workContainer.updateType, work: this.work});
    }

  }

  public setDone(): void {
    /*
    if (this.work.doneId > 0 && confirm(this.txt['reset'] + ' ' + this.txt['done'] + '?')) {
      this.work.doneId = 0;
      this.submitForm();
    } else if (!(this.work.doneId > 0)) {
      if (this.isAfterToday) {
        alert(this.txt['set_to'] + ' ' + this.txt['done'] + ' ' + this.txt['not_allowed']);
      } else if (confirm(this.txt['set_to'] + ' ' + this.txt['done'] + '?')) {
        this.work.doneId = this.work.workId;
        this.submitForm();
      }
    }
    */
    if (this.work.doneId > 0) {
      this.work.doneId = 0;
    }  else if (!(this.work.doneId > 0)) {
      if (this.isAfterToday) {
        alert(this.txt['set_to'] + ' ' + this.txt['done'] + ' ' + this.txt['not_allowed']);
      } else {
        this.work.doneId = this.work.workId;
      }
    }
  }

  public setDelete(): void {
    if (this.work.type < WorkType.timeSpanUndefined) {
      if (confirm(this.txt['work_disable'] + '?')) {
        if (this.workContainer.updateType === UpdateType.update) {
          this.workUpdate.emit({updateType: UpdateType.delete, work: this.work});
        }
      }
    } else {
      if (confirm(this.txt['time_span_disable'] + '?')) {
        if (this.workContainer.updateType === UpdateType.update) {
          this.timeSpanUpdate.emit({updateType: UpdateType.delete, work: this.work});
        }
      }
    }

  }

  public cancelUpdates(): void {
    if (this.workContainer.updateType !== UpdateType.insert) {
      this.workUpdate.emit({updateType: UpdateType.cancelUpdate, work: this.work});
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



