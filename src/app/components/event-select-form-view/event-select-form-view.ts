import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularMyDatePickerDirective, IAngularMyDpOptions, IMyDate, IMyDateModel, IMyDateRange, AngularMyDatePickerModule, VALUE } from '@nodro7/angular-mydatepicker';

import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { StyleFactory } from '../../_globals/style-factory';

import { Event } from '../../_db/event';
import { User } from '../../_db/user';
import { EventSelectOption } from '../../_db/event-select-option';
import { EventSortCriteria } from '../../_enums/event-sort-criteria.enum';
import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';
import { Contact } from '../../_db/contact';

import { LocationType } from '../../_enums/location-type.enum';
import { App } from '../../_enums/app.enum';

import { IChoice } from '../../_interfaces/i-choice';
import { INumChoice } from '../../_interfaces/i-num-choice';

import { ErrorMessage } from '../../_validators/error-message';
import { SlicePipe, DatePipe } from '@angular/common';


@Component({
  selector: 'dsy-event-select-form-view',
  templateUrl: './event-select-form-view.html',
  styleUrl: './event-select-form-view.css',
  imports: [FormsModule, ReactiveFormsModule, AngularMyDatePickerModule,  DatePipe]
})
export class EventSelectFormViewComponent implements OnInit {

  public name = 'EventSelectFormViewComponent';

  // locale for date-picker and timer-picker, used in selection-bar and views
  @Input({required: true}) locale!: string;

  @Input({required: true}) session!: Session;

  @Input({required: true}) opts!: ConfigurationOption[];
  @Input({required: true}) txt: { [key: string]: string } = {};
  @Input({required: true}) optiontxt: { [key: string]: string } = {};
  @Input({required: true}) eventtxt: { [key: string]: string } = {};

  @Input({required: true}) timeSpans!: Array<Event>;

  @Input({required: true}) users!: Array<User>;

  // eventContact and eventIssue are the selected contact and issue, depending on session
  @Input({required: true}) eventContact!: Contact;
  @Input({required: true}) eventIssueNr!: number;

  @Input({required: true}) eventContacts!: Array<Contact>;

  // eventSelectOption is the element which is maintained by this component
  @Input({required: true}) eventSelectOption!: EventSelectOption;


  @Output() optionUpdate = new EventEmitter<EventSelectOption>();
  @Output() optionDelete = new EventEmitter<EventSelectOption>();
  @Output() cancelUpdate = new EventEmitter();

  App: typeof App = App;

  // dateFrom, dateTo show the actually selected date range on form
  dateFrom!: Date;
  dateTo!: Date;

  dateRangeBegin!: Date;
  dateRangeEnd!: Date;

  // date range in days, depend from options
  showFrom!: number;
  showTo!: number;

  planChoices!: Array<IChoice>;
  locationTypeEnum: typeof LocationType = LocationType;
  locationTypeChoices!: Array<IChoice>;
  userChoices!: Array<{userId: number, userName: string, isSelected: boolean}>;
  contactChoices!: Array<IChoice>;
  dateChoices!: Array<INumChoice>;
  isShowDateChoices = false;
  // sort criteria
  sortCriteriaChoices!: Array<{ix: number, sortField: string, isSortCriteria: boolean, isSum: boolean, isSubTotal: boolean}>;
  sortCriteriaSelected!: Array<{ix: number, sortField: string, isSortCriteria: boolean, isSum: boolean, isSubTotal: boolean}>;
  sortCriteriaUnselected!: Array<{ix: number, sortField: string, isSortCriteria: boolean, isSum: boolean, isSubTotal: boolean}>;
  // ix of sortCriteriaEelemnt which is actually summed or totaled
  ixSum = -1;
  ixSubTotal = -1;
  isShowSortCriteria = false;

  thisForm: FormGroup;
  errors: { [key: string]: string } = {};
  thisFormErrorMessages!: ErrorMessage[];

  // date picker configuration
  // ViewChild static (since angular 8) not necessary cause ngxdp not used at ngOnInit
  @ViewChild('dp') ngxdp!: AngularMyDatePickerDirective;
  public dpModel!: IMyDateModel;   // not initial date set
  /*
  public dpDefaultMonth: IMyDefaultMonth = {
    defMonth: moment(this.opts.calendarDay).format('MM-YYYY')
  };
  */

  // we show the date range, but we do not want the user to enter it directly
  public dpDisabled = false;

  // disabledRanges contains eventually disabled date ranges
  disabledRanges: Array<IMyDateRange>  = [];

  // dates for holidays are shown in red color
  highlightDates: Array<IMyDate>  = [];


  public myDatepickerOptions: IAngularMyDpOptions = {
    dateRange: true,
    dateFormat: 'dd.mm.yyyy',
    // showFooterToday, todayText => depends on new angular-mydatepicker release aug.2020
    todayTxt: '',
    showFooterToday: true,
    showWeekNumbers: true
  };

  public dateOpts!: IAngularMyDpOptions;

  constructor(
    private fb: FormBuilder) {
      // we init the form to avoid errors. Content is set with the various setXxx functions
      this.thisForm = this.fb.group({});
    }

  ngOnInit(): void {
    this.initChoices();
    this.loadErrorMessages();
    this.addDpOptions();
    // we init the form and fill it with eventSelectOption
    this.initThisForm();
    this.showDate();
  }


  private initChoices() {
    // user choices - all  users can be choosen in admin mode
    if (this.session.app === App.admin) {
      this.userChoices = [{userId: 0, userName: this.txt['all_users'],
        isSelected: '' === this.eventSelectOption.userName}];
      this.users?.forEach(_ => this.userChoices.push({userId: 0,  userName: _.userName,
        isSelected: _.userId === this.eventSelectOption.userId}));
    } else {
      this.userChoices = [{userId: this.session.userId, userName: this.session.userName,
        isSelected: this.session.userId === this.eventSelectOption.userId}];
    }

    this.planChoices = this.session.app === App.admin ? [
      {value: '1', isSelected: this.eventSelectOption.isPlan === false, text: this.txt['actual']},
      {value: '0', isSelected: this.eventSelectOption.isPlan === true, text: this.txt['plan']}
    ] : [
      {value: '1', isSelected: this.eventSelectOption.isPlan === false, text: this.txt['actual']},
      {value: '0', isSelected: this.eventSelectOption.isPlan === true, text: this.txt['plan']},
      {value: '2', isSelected: this.eventSelectOption.isPlan === null, text: this.txt['like'] + ' ' + this.txt['calendar']}
    ];

    // contact  choices - load from existing option
    this.contactChoices = [];
    for (let contact of this.eventContacts) {
      let choice: IChoice = {
        value: contact.contactNr.toString() + (this.session.app === App.admin ? '|' + contact.userId : ''),
        text: contact.displayName,
        isSelected: contact.contactNr === this.eventSelectOption.contactNr
        && contact.userId === this.eventSelectOption.userId}
      this.contactChoices.push(choice);
    }

    let isContactSelected = false;
    let contactIx = this.contactChoices.findIndex(_ => _.isSelected);
    if (contactIx > 0) {
      isContactSelected = true;
    } else if (this.session.contactNr > 0) {
      // session contactNr can be > 0 only if we are not in admin mode ...
      contactIx = this.contactChoices.findIndex(_ => Number(_.value) === this.session.contactNr);
      if (contactIx > 0) {
        isContactSelected = true;
      }
    }
    this.contactChoices.sort((a, b) => a.text > b.text ? -1 : 0);
    this.contactChoices.unshift( {
        value: '',
        text: this.txt['select_all'],
        isSelected: !isContactSelected}
    )

    // locationTypehas an empty(null) choice - which means 'all' as first choice
    // default eventSelectOption has null ...
    let isLegacySelection = false;
    this.locationTypeChoices = Object.keys(this.locationTypeEnum)
    .filter((k: any) => typeof this.locationTypeEnum[k] === 'number')
    .map((_: string) => {
      let isSelected = false;
      const enumStringType: { [key: string]: any } = this.locationTypeEnum;
      if (enumStringType[_] === this.eventSelectOption?.locationType) {
        isSelected = true;
        isLegacySelection = true;
      }
      return {value: enumStringType[_] as string, text: this.txt[_], isSelected};
    });
    this.locationTypeChoices.splice(0, 0, {value: '', text: this.txt['all'], isSelected: !isLegacySelection});

    // date choices - this.eventSelectOption (also default) anyway has an dateFrom dateTo
    this.dateChoices = [];
    for (let value = 0; value < 11; value++) {
      let isSelected = false;
      switch (value) {
        case 0:
          isSelected = this.eventSelectOption.isPreviousDay ? true : false;
          break;
        case 1:
          isSelected = this.eventSelectOption.isPreviousWeek ? true : false;
          break;
        case 2:
          isSelected = this.eventSelectOption.isPreviousMonth ? true : false;
          break;
        case 3:
          isSelected = this.eventSelectOption.isCurrentDay ? true : false;
          break;
        case 4:
          isSelected = this.eventSelectOption.isCurrentWeek ? true : false;
          break;
        case 5:
          isSelected = this.eventSelectOption.isCurrentMonth ? true : false;
          break;
        case 6:
          isSelected = this.eventSelectOption.isNextDay ? true : false;
          break;
        case 7:
          isSelected = this.eventSelectOption.isNextWeek ? true : false;
          break;
        case 8:
          isSelected = this.eventSelectOption.isNextMonth ? true : false;
          break;
        case 9:
          isSelected = this.eventSelectOption.isDateInterval ? true : false;
          break;
        case 10:
          isSelected = this.eventSelectOption.isDateRange ? true : false;
          this.dateRangeBegin = this.eventSelectOption.dateFrom ?? new Date();
          this.dateRangeEnd = this.eventSelectOption.dateTo ?? new Date();
          break;
        default:
          break;
      }
      this.dateChoices.push({value, text: '', isSelected});
    }

    this.dpModel = {
      isRange: true,
      singleDate: undefined,
      dateRange: {beginJsDate: this.eventSelectOption?.dateFrom, endJsDate: this.eventSelectOption?.dateTo}
    };

    this.showFrom = ConfigurationOptionBasicFunctions.getOptionInt(this.opts, 'opt_events_showFrom') ?? 0;
    this.showTo = ConfigurationOptionBasicFunctions.getOptionInt(this.opts, 'opt_events_showTo') ?? 0;

    // sort crtiteria - load from existing criteria
    this.sortCriteriaChoices = Object.keys(EventSortCriteria)
      .filter((k: any) => typeof EventSortCriteria[k] === 'number')
      .map((_, ix) => {
        const criteria = this.eventSelectOption.sortCriterias?.filter(crit => crit.sortField === _)[0];
        if (criteria) {
          return {ix: ix,  sortField: criteria.sortField, isSortCriteria: criteria.isSortCriteria,
            isSum: criteria.isSum, isSubTotal: criteria.isSubTotal};
        } else {
          return {ix: ix,  sortField: _, isSortCriteria: false,
            isSum: false, isSubTotal: false};
        }
      });
    this.setSortCriteria();
  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('option.nrString', 'pattern',  this.optiontxt['optionNr']
      + ' ' + this.txt['must_be_numeric']),
      // new ErrorMessage('option.nrString', 'min',  this.optiontxt['optionNr']
      // + ' ' + this.txt['must_be_greater_than'] + ' 0 '),
      new ErrorMessage('option.nrString', 'max',  this.optiontxt['optionNr']
      + ' ' + this.txt['must_not_be_greater_than'] + ' 99 '),
      new ErrorMessage('date.showFromString', 'pattern',  this.txt['dateFrom']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('date.showFromString', 'max',  this.txt['dateFrom']
      + ' ' + this.txt['must_not_be_greater_than'] + ' ' + this.showFrom + ' ' + this.txt['days']),
      new ErrorMessage('date.showToString', 'pattern',  this.txt['dateTo']
      + ' ' + this.txt['must_be_numeric']) ,
      new ErrorMessage('date.showToString', 'max',  this.txt['dateTo']
      + ' ' + this.txt['must_not_be_greater_than'] + ' ' + this.showTo + ' ' + this.txt['days'])
    ];
  }


  // dateOpts are built
  private addDpOptions() {

    // utils.clone would not event
    this.dateOpts = this.getCopyOfDpOptions(this.myDatepickerOptions);

    this.dateOpts.todayTxt = this.txt['today'];

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
  }

  /**
  * we need getCopy to avoid getting just a reference with "... = this.myDatepickerOptions"
  */
   private getCopyOfDpOptions(opts: IAngularMyDpOptions): IAngularMyDpOptions {
    return JSON.parse(JSON.stringify(opts));
  }


  /**
   * thisForm has all modifyable fields of this.eventSelectOption
   * except:
   * - custOrder: is handled by selection of custOrderChoices
   * - 5 boolean fields for date choices
   * - sort criteria are handled by sortCriteriChoices
   *
   */
  private initThisForm() {
    /* dp model not in form
    const dpModelDate: IMyDateModel = {
      isRange: true,
      singleDate: null,
      dateRange: {beginJsDate: this.eventSelectOption.dateFrom, endJsDate: this.eventSelectOption.dateTo}
    };
    */
    this.thisForm = this.fb.group({
      option: this.fb.group({
        nrString: [this.eventSelectOption.nr, [
          Validators.pattern('^[0-9]*$'),
          // option nr may be 0
          // Validators.min(1),
          Validators.max(99)
        ]],
        name: [this.eventSelectOption.name],
        // isPlan can be null ...
        selectPlan: [this.eventSelectOption.isPlan === null ? '2' : this.eventSelectOption.isPlan ? '0' : '1'],
        // locationType in eventSelectOption can be null, in selection is represented by empty string
        locationType: [this.eventSelectOption.locationType ?? ''],
        isShowDetails: [this.eventSelectOption.isShowDetails],
        userId:  [this.eventSelectOption.userId],
        issueNrString: [this.eventSelectOption.issueNr ? this.eventSelectOption.issueNr : '', [
          Validators.pattern('^[0-9]*$'),
        ]],
      }),
      date: this.fb.group({
        showFromString: [this.eventSelectOption.showFrom, [
          Validators.pattern('^[0-9]*$'),
          Validators.max(this.showFrom)
        ]],
        showToString: [this.eventSelectOption.showTo, [
          Validators.pattern('^[0-9]*$'),
          Validators.max(this.showTo)
        ]]
        /*,
        dateModel: [dpModelDate]
        */
      })
    });
    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
  }

  /**
   * date display on form
   */
  private showDate() {
    this.dateFrom =
      this.dateChoices[0].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, -1):
      this.dateChoices[1].isSelected ? GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(this.session.calendarDay), -1):
      this.dateChoices[2].isSelected ?  GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(this.session.calendarDay) ?? this.session.calendarDay, -1):
      this.dateChoices[3].isSelected ? this.session.calendarDay :
      this.dateChoices[4].isSelected ? GlobalFunctions.getStartOfWeek(this.session.calendarDay) :
      this.dateChoices[5].isSelected ? GlobalFunctions.getStartOfMonth(this.session.calendarDay) :
      this.dateChoices[6].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, 1):
      this.dateChoices[7].isSelected ? GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(this.session.calendarDay), 1):
      this.dateChoices[8].isSelected ? GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(this.session.calendarDay) ?? this.session.calendarDay, 1):
      this.dateChoices[9].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, Number(this.thisForm.value.date.showFromString) * -1):
      this.dateChoices[10].isSelected ? this.dateRangeBegin :
      this.session.calendarDay;
    this.dateTo =
      this.dateChoices[0].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, -1):
      this.dateChoices[1].isSelected ? GlobalFunctions.addDays(GlobalFunctions.getStartOfWeek(this.session.calendarDay), -1):
      this.dateChoices[2].isSelected ? GlobalFunctions.addDays(GlobalFunctions.getStartOfMonth(this.session.calendarDay) ?? this.session.calendarDay, -1):
      this.dateChoices[3].isSelected ? this.session.calendarDay :
      this.dateChoices[4].isSelected ? GlobalFunctions.addDays(GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(this.session.calendarDay), 1), -1):
      this.dateChoices[5].isSelected ? GlobalFunctions.addDays(GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(this.session.calendarDay)?? this.session.calendarDay, 1), -1):
      this.dateChoices[6].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, 1):
      this.dateChoices[7].isSelected ? GlobalFunctions.addDays(GlobalFunctions.addWeeks(GlobalFunctions.getStartOfWeek(this.session.calendarDay), 2), -1):
      this.dateChoices[8].isSelected ? GlobalFunctions.addDays(GlobalFunctions.addMonths(GlobalFunctions.getStartOfMonth(this.session.calendarDay) ?? this.session.calendarDay, 2), -1):
      this.dateChoices[9].isSelected ? GlobalFunctions.addDays(this.session.calendarDay, Number(this.thisForm.value.date.showToString)):
      this.dateChoices[10].isSelected ? this.dateRangeEnd :
      this.session.calendarDay;
  }

  /**
   * we set sortCriteria based on content of their elements
   */
  private setSortCriteria() {
    // we assure that unselected elements have the right place amomg the unselected
    this.sortCriteriaChoices.forEach(_ => {
      if (!_.isSortCriteria) {
        const enumStringType: { [key: string]: any } = EventSortCriteria;
        _.ix = enumStringType[_.sortField];
      }
    });
    // re-sort to assure ix sequence and set ix to index of array
    this.sortCriteriaChoices
    .sort((a, b) => (a.isSortCriteria ? a.ix : (100 + a.ix)) - (b.isSortCriteria ? b.ix : (100 + b.ix)))
    .forEach((_, i) => _.ix = i);
    this.sortCriteriaSelected = this.sortCriteriaChoices.filter(_ => _.isSortCriteria);
    this.sortCriteriaUnselected = this.sortCriteriaChoices.filter(_ => !_.isSortCriteria);
    // if no sum element,  the highest index of selected becomes sum (and rests subTotal,)
    if (this.sortCriteriaSelected?.length > 0 && this.sortCriteriaSelected.filter(_ => _.isSum).length === 0) {
      this.sortCriteriaChoices[this.sortCriteriaSelected[this.sortCriteriaSelected.length - 1].ix].isSum = true;
      this.sortCriteriaChoices[this.sortCriteriaSelected[this.sortCriteriaSelected.length - 1].ix].isSubTotal = false;
    }
    // if no subTotal element, set element with index 0 as subTotal
    const sumElement = this.sortCriteriaSelected?.findIndex(_ => _.isSum);
    if (sumElement >= 0 && this.sortCriteriaSelected?.filter(_ => _.isSubTotal).length === 0
    && sumElement > this.sortCriteriaSelected[0]?.ix ) {
      this.sortCriteriaChoices[this.sortCriteriaSelected[0].ix].isSubTotal = true;
    }
    // if subTotal element and sumElement have changed places, we change subTotal and sum
    const subTotalElement = this.sortCriteriaSelected?.findIndex(_ => _.isSubTotal);
    if (sumElement >= 0 && subTotalElement >= 0 && sumElement < subTotalElement) {
      this.sortCriteriaChoices[sumElement].isSubTotal = true;
      this.sortCriteriaChoices[sumElement].isSum = false;
      this.sortCriteriaChoices[subTotalElement].isSum = true;
      this.sortCriteriaChoices[subTotalElement].isSubTotal = false;
    }
    // fix the index values for sum and subTotal
    this.ixSum = -1;
    this.ixSubTotal = -1;
    this.sortCriteriaChoices
    .forEach(_ => {
      if (_.isSum) {
        this.ixSum = _.ix;
      }
      if (_.isSubTotal) {
        this.ixSubTotal = _.ix;
      }
    });
  }

  /**
   * used in setSelected() to assure sequences (month/week/day and contact/order)
   *
   * @param newSelected ix of an element which has selected as isSortCriteria
   * @param beforeThis there are certain elements which must come after newSelected -
   *  this param has the ix of such an element
   */
  private changeIx (newSelected: number, beforeThis: number) {
    if (beforeThis < newSelected) {
      this.sortCriteriaChoices[newSelected].ix = beforeThis;
      for (let index = beforeThis; index < this.sortCriteriaChoices.length; index++) {
        if (index !== newSelected) {
          this.sortCriteriaChoices[index].ix += 1;
        }
      }
    }
  }

  /** --------------------------  public methods -------------------------------------------- */

  setContact(event: any) {
    this.contactChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
  }

  showDateChoices() {
    this.isShowDateChoices = !this.isShowDateChoices;
    if (this.isShowDateChoices) {
      // console.log('onChangesDate');
      this.thisForm.get('date.showFromString')?.valueChanges
      .subscribe(_ => {
        this.showDate();
      });
      this.thisForm.get('date.showToString')?.valueChanges
      .subscribe(_ => {
        this.showDate();
      });
    }
  }

  setDate(event: any) {
    // console.log ('dateEvent: ', event);
    this.dateChoices.forEach(_ => {
      if (_.value === Number(event.target.value) && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.showDate();
  }

  clearDate(): void {
    this.ngxdp.clearDate();
  }

  onDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    if (event.isRange) {
      this.dateRangeBegin = GlobalFunctions.getStartOfDay(event?.dateRange?.beginJsDate ?? new Date());
      this.dateRangeEnd = GlobalFunctions.getStartOfDay(event?.dateRange?.endJsDate ?? new Date()) ;
    }
    this.showDate();
  }

  showSortCriteria() {
    this.isShowSortCriteria = !this.isShowSortCriteria;
  }

  // attention: lowerIndex, raiseIndex are controlled by html.template
  // so that ordering rules (month/weeek/day, contact/issueNr) are assured
  lowerIndex(ix: number) {
    if (ix > 0 ) {
      const criteriaDown = this.sortCriteriaChoices[ix];
      this.sortCriteriaChoices[ix] = this.sortCriteriaChoices[ix - 1];
      this.sortCriteriaChoices[ix].ix = ix;
      this.sortCriteriaChoices[ix - 1] = criteriaDown;
      this.sortCriteriaChoices[ix - 1].ix = ix - 1;
      this.setSortCriteria();
    }
  }

  raiseIndex(ix: number) {
    if (ix < this.sortCriteriaChoices.length - 1 ) {
      const criteriaUp = this.sortCriteriaChoices[ix];
      this.sortCriteriaChoices[ix] = this.sortCriteriaChoices[ix + 1];
      this.sortCriteriaChoices[ix].ix = ix;
      this.sortCriteriaChoices[ix + 1] = criteriaUp;
      this.sortCriteriaChoices[ix + 1].ix = ix + 1;
      this.setSortCriteria();
    }
  }

  setSelected(ix: number) {
    this.sortCriteriaChoices[ix].isSortCriteria = true;
    if (this.sortCriteriaChoices[ix].sortField === 'week') {
      this.changeIx(ix, this.sortCriteriaChoices.findIndex(_ => _.sortField === 'day'));
    }
    if (this.sortCriteriaChoices[ix].sortField === 'month') {
      this.changeIx(ix, this.sortCriteriaChoices.findIndex(_ => _.sortField === 'week'));
      this.changeIx(ix, this.sortCriteriaChoices.findIndex(_ => _.sortField === 'day'));
    }
    if (this.sortCriteriaChoices[ix].sortField === 'contact') {
      this.changeIx(ix, this.sortCriteriaChoices.findIndex(_ => _.sortField === 'issue'));
    }
    this.setSortCriteria();
  }

  setUnselected(ix: number) {
    this.sortCriteriaChoices[ix].isSubTotal = false;
    this.sortCriteriaChoices[ix].isSum = false;
    this.sortCriteriaChoices[ix].isSortCriteria = false;
    this.setSortCriteria();
  }

  setSum(event: any) {
    if (event.target.checked) {
      this.sortCriteriaChoices.forEach(_ => {
        if (_.ix === Number(event.target.value)) {
          _.isSum = true;
        } else {
          _.isSum = false;
        }
      });
    }
    this.setSortCriteria();
  }

  setSubTotal(event: any) {
    if (event.target.checked) {
      this.sortCriteriaChoices.forEach(_ => {
        if (_.ix === Number(event.target.value)) {
          _.isSubTotal = true;
        } else {
          _.isSubTotal = false;
        }
      });
    }
    this.setSortCriteria();
  }


  submitForm() {
    this.eventSelectOption.nr = Number(this.thisForm.value.option.nrString);
    this.eventSelectOption.name = this.thisForm.value.option.name;
    if (this.eventSelectOption.name === 'default') {
      const name = prompt(this.txt['enter_a_name'] + ': ', 'default');
      if (name != null) {
        this.eventSelectOption.name = name;
      }
    }
    if (this.eventSelectOption.name === 'default') {
      this.eventSelectOption.nr = 0;
    } else {
      this.eventSelectOption.nr = this.eventSelectOption.nr === 0 ? 1 : this.eventSelectOption.nr;
    }
    if (this.thisForm.value.option.locationType === '') {
      this.eventSelectOption.locationType = null;
    } else {
      this.eventSelectOption.locationType = Number(this.thisForm.value.option.locationType);
    }
    this.eventSelectOption.isPlan = this.thisForm.value.option.selectPlan === '0' ? true : this.thisForm.value.option.selectPlan === '1' ? false : null;
    // this.eventSelectOption.isPlan = this.thisForm.value.option.isPlan && !this.thisForm.value.option.isActual ? true
     // : !this.thisForm.value.option.isPlan && this.thisForm.value.option.isActual ? false : null;
    this.eventSelectOption.isShowDetails = this.thisForm.value.option.isShowDetails;
    if (this.session.app === App.admin) {
      this.eventSelectOption.userId = this.thisForm.value.option.userId;
      if (this.eventSelectOption?.userId > 0) {
        this.eventSelectOption.userName = this.users.filter(_ => _.userId === this.eventSelectOption.userId)[0].userName;
      } else  {
        this.eventSelectOption.userName = '';
      }
    }
    if (this.session.app === App.local) {
      this.eventSelectOption.userId = this.session.userId;
      this.eventSelectOption.userName = this.session.userName;
    }
    // contact: first we clear old selection
    this.eventSelectOption.contactNr = 0;
    this.eventSelectOption.contactDisplayNr = '';
    this.eventSelectOption.contactName = '';
    this.eventSelectOption.contactColor = '';

    // we take contact from selected - only 1 should be checked
    this.contactChoices.forEach(_ => {
      if (_.isSelected) {
        if (this.session.app === App.admin && _.value.includes('|')) {
          const userId = Number(_.value.substring(_.value.lastIndexOf('|') + 1));
          if (userId && userId > 0) {
            // we overwrite user selection !!!
            this.eventSelectOption.userId = userId;
            this.eventSelectOption.userName = this.users.filter(_ => _.userId === this.eventSelectOption.userId)[0].userName;
          }
          const contactNr = Number(_.value.substring(0, _.value.indexOf('|') - 1));
          if (contactNr && contactNr > 0) {
            this.eventSelectOption.contactNr = contactNr;
          }
        } else {
          this.eventSelectOption.contactNr = Number(_.value);
        }
        if (this.eventSelectOption.contactNr > 0) {
          const contactIx = this.eventContacts.findIndex(_ => _.userId === this.eventSelectOption.userId && _.contactNr === this.eventSelectOption.contactNr);
          if (contactIx >= 0) {
            this.eventSelectOption.contactDisplayNr = this.eventContacts[contactIx].displayNr;
            this.eventSelectOption.contactName = this.eventContacts[contactIx].displayName;
            this.eventSelectOption.contactColor = this.eventContacts[contactIx].contactColor;
          }
        }
      }
    });

    // iissueNr
    this.eventSelectOption.issueNr = Number(this.thisForm.value.option.issueNrString);
    // dates
    let isOneSelected = false;
    this.dateChoices.forEach((_, index) => {
      switch (index) {
        case 0:
          this.eventSelectOption.isPreviousDay = _.isSelected;
          break;
        case 1:
          this.eventSelectOption.isPreviousWeek = _.isSelected;
          break;
        case 2:
          this.eventSelectOption.isPreviousMonth = _.isSelected;
          break;
        case 3:
          this.eventSelectOption.isCurrentDay = _.isSelected;
          break;
        case 4:
          this.eventSelectOption.isCurrentWeek = _.isSelected;
          break;
        case 5:
          this.eventSelectOption.isCurrentMonth = _.isSelected;
          break;
        case 6:
          this.eventSelectOption.isNextDay = _.isSelected;
          break;
        case 7:
          this.eventSelectOption.isNextWeek = _.isSelected;
          break;
        case 8:
          this.eventSelectOption.isNextMonth = _.isSelected;
          break;
        case 9:
          this.eventSelectOption.isDateInterval = _.isSelected;
          break;
        case 10:
          this.eventSelectOption.isDateRange = _.isSelected;
          break;
        default:
          break;
      }
      if (_.isSelected) {
        isOneSelected = true;
      }
    });
    if (!isOneSelected) {
      this.eventSelectOption.isCurrentWeek = true;
    }
    if (this.eventSelectOption.isDateInterval) {
      this.eventSelectOption.showFrom = Number(this.thisForm.value.date.showFromString);
      this.eventSelectOption.showTo = Number(this.thisForm.value.date.showToString);
    } else {
      this.eventSelectOption.showFrom = 0;
      this.eventSelectOption.showTo = 0;
    }
    if (this.eventSelectOption.isDateRange) {
      this.eventSelectOption.dateFrom = this.dateRangeBegin;
      this.eventSelectOption.dateTo = this.dateRangeEnd;
    }

    // sort criteria
    this.eventSelectOption.sortCriterias = [];
    this.sortCriteriaChoices?.forEach(_ => this.eventSelectOption.sortCriterias.push({
      sortField: _.sortField, isSortCriteria: _.isSortCriteria, isSum: _.isSum, isSubTotal: _.isSubTotal
    }));

    // console.log('we emit eventSelectOption:', this.eventSelectOption);
    this.optionUpdate.emit(this.eventSelectOption);

  }

  cancelUpdates() {
    this.cancelUpdate.emit();
  }

  setDelete() {
    if (confirm(this.txt['option_delete'] + '?')) {
      this.optionDelete.emit(this.eventSelectOption);
    }
  }

  /** --------------------------  supporting functions for public methods -------------------------------------------- */


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
        this.errors[message.forControl]  = message.text;
      }
    }
  }

}
