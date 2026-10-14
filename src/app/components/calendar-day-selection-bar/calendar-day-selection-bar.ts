import { Component, OnInit, ViewChild, Input, EventEmitter, Output, OnChanges, SimpleChange, HostListener } from '@angular/core';
import { formatDate, NgStyle, NgClass, SlicePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { GAINSBORO, LIGHT_CORAL, LIGHT_GREY, MAX_MONTHS, WHITE_SMOKE, WINDOW_WIDTH_MOBILE, WINDOW_WIDTH_TABLET } from '../../_globals/constants';
import { StyleFactory } from '../../_globals/style-factory';

import { IView } from '../../_interfaces/i-view';
import { IEventOptions } from '../../_interfaces/i-event-options';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';

import { Session } from '../../_db/session';
import { Event } from '../../_db/event';
import { Contact } from '../../_db/contact';

import { AngularMyDatePickerDirective, DefaultView, IAngularMyDpOptions, IMyCalendarViewChanged, IMyDate, IMyDateModel, IMyDefaultMonth, IMyInputFieldChanged, IMyMarkedDate, IMyRangeDateSelection, IMyDateRange, AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { FormsModule } from '@angular/forms';
import { App } from '../../_enums/app.enum';
import { IChoice } from '../../_interfaces/i-choice';

@Component({
  selector: 'dsy-calendar-day-selection-bar',
  templateUrl: './calendar-day-selection-bar.html',
  styleUrl: './calendar-day-selection-bar.css',
  imports: [NgStyle, FormsModule, AngularMyDatePickerModule, NgClass]
})
export class CalendarDaySelectionBarComponent implements OnInit {

  public name = 'CalendarDaySelectionBarComponent';

  public App = App;

  @Input({required: true}) session!: Session;

  @Input({required: true}) locale!: string;

  @Input({required: true}) txt!: { [key: string]: string };

  // window width for selecting size of header
  windowWidth = window.innerWidth;
  WINDOW_WIDTH_TABLET = WINDOW_WIDTH_TABLET;
  WINDOW_WIDTH_MOBILE = WINDOW_WIDTH_MOBILE;

  // day of event - 00:00 in browser timezone
  // can be selected by user
  // calendarDay is in opts @Input({required: true}) calendarDay: Date;
  calendarDayDisplay = '';
  weekDisplay = '';
  dateString = '';

  planActualChoices: Array<{value: string, isPlan: boolean, isChecked: boolean}> = [];

  /*
  timeSlizes: Array<number>;
  timeSlizeChoices: Array<{value: number, isChecked: boolean}> = [];
  */

  // startHour, timeSlize, defaultIntervalSize are model parameters, managed by event-day-component
  @Input({required: true}) opts!: IEventOptions;
  @Input({required: true}) userOpts!: IUserEventOptions;
  @Input({required: true}) calendarDayChangeCounter!: number;

  @Input({required: true}) views!: Array<IView>;

  // for use in html template
  viewsSelectable!: Array<IView>;

  // view menu for small viewport
  viewChoices!: Array<IChoice>;

  // @Input({required: true}) locale: string;

  @Input({required: true}) timeSpans!: Array<Event>;
  @Input({required: true}) sessionContact!: Contact | undefined;

  @Input({required: true}) isCreating!: boolean;
  @Input({required: true}) isSelecting!: boolean;
  @Input({required: true}) countSelected = 0;
  @Input({required: true}) targetCalendarDay!: Date | null;
  @Input({required: true}) firstCalendarDay!: Date;

  @Output() calendarDaySelected = new EventEmitter<Date>();
  @Output() sessionPlanUpdate = new EventEmitter<Session>();
  @Output() selectionSet = new EventEmitter();
  @Output() viewSelection = new EventEmitter<string>();


  // date picker configuration
  // ViewChild static (since angular 8) not necessary cause ngxdp not used at ngOnInit
  @ViewChild('dp') ngxdp!: AngularMyDatePickerDirective;
  public dpModel!: IMyDateModel;   // not initial date set

  public dpDisabled = false;

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

  calendarDayStyle = {
  };

  pointerStyle = {
    'cursor':  'pointer'
  }

  contactStyle!: {
  };

  rowTopNoPaddingStyle = {
    'padding-top': '0'
  }

  rowBottomNoPaddingStyle = {
    'padding-bottom': '0'
  }

  // styles signals if calendarDay lays inside interval: issueFrom - issueTo
  dateInsideStyle = {
    // 'background-color': 'White'
  };

  dateOutsideStyle = {
    // 'background-color': 'Red'
    'color': 'Red'
  };

  dateOtherYearStyle = {
    'background-color': 'PaleGreen'
    // 'color': 'Green'
  };

  showDateFrom = '';
  showDateTo = '';
  dateFromStyle = this.dateInsideStyle;
  dateToStyle = this.dateInsideStyle;

  // we show selection bar after having built all styles
  isStylesReady = false;

  constructor() { }

  ngOnInit() {
    this.addDpOptions();
    this.loadPlanActual();
    this.loadTimeSlizes();
    this.setContactStyles();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'eventContactSelected') {
        this.setContactStyles();
      }
      if (propKey === 'locale') {
        this.locale = propValue.currentValue;
      }
      if (propKey === 'session' || propKey === 'opts' || propKey === 'calendarDayChangeCounter') {
        this.isStylesReady = false;
        if (this.session?.calendarDay) {
          const jsDate: Date = this.isSelecting && this.targetCalendarDay ? GlobalFunctions.clone(this.targetCalendarDay) : GlobalFunctions.clone(this.session.calendarDay);
          this.calendarDayDisplay = formatDate( this.session.calendarDay, 'EEE d.MM.yyyy', this.locale);
          // sundays (and holidays) are red
          let firstDay: number;
          // weekInfo is yet in proposal stage ...
          // const localeForWeekInfo = new Intl.Locale(this.locale);
          // weekInfo.firstDay delivers 1 for monday,... 7 if sunday is first day of week
          // firstDay = localeForWeekInfo.weekInfo.firstDay;
          // we set firstDay to monday
          firstDay = 1;
          const sundayWeekDay = 7 - firstDay;
          // this.calendarDayStyle = GlobalFunctions.getWeekDay(this.session.calendarDay, 0, this.locale)  === sundayWeekDay
          this.calendarDayStyle = GlobalFunctions.getWeekDay(this.session.calendarDay, 1)  === sundayWeekDay
          || (this.timeSpans && this.timeSpans?.filter(_ => _.type === 21 && GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(this.session.calendarDay, 1) )
          && GlobalFunctions.getDateInMinutes(_.eventEnd) > GlobalFunctions.getDateInMinutes(this.session.calendarDay))).length > 0
            ? {
              'color': 'Red'
            }
            : {};
          // today is underlined
          this.calendarDayStyle = GlobalFunctions.getYMD(this.session.calendarDay) === GlobalFunctions.getYMD(new Date())
            ? {
              ...this.calendarDayStyle,
              // 'text-decoration': 'underline'
              'background-color': GAINSBORO
            }
            : this.calendarDayStyle;
          this.weekDisplay = formatDate(this.session.calendarDay, 'ww/yyyy', this.locale);
          this.dpModel = {isRange: false, singleDate: {jsDate}};
          this.addDpOptions();
          this.loadPlanActual();
          this.loadTimeSlizes();
          this.setContactStyles();
        }
      }
      if (propKey === 'views') {
        this.viewsSelectable = this.views.filter(_ => _.isSelectable);
        this.viewChoices = [];
        for (let v of this.viewsSelectable) {
          this.viewChoices.push({value: v.name, text: v.displayName, isSelected: v.isSelected});
        }
      }
      if (propKey ===  'targetCalendarDay') {
        // intentionally no change of calendarDayDisplay cause here the user is selecting a shift target ...!
        const jsDate: Date = this.isSelecting && this.targetCalendarDay ? GlobalFunctions.clone(this.targetCalendarDay) : GlobalFunctions.clone(this.session.calendarDay);
        this.dpModel = {isRange: false, singleDate: {jsDate}};
        this.addDpOptions();
      }
      if (propKey ===  'isSelecting') {
        // console.log('event-day-selection-bar propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
        this.addDpOptions();
      }
      // console.log('event-day-selection-bar propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
  }

  // dateOpts are built
  private addDpOptions() {

    // utils.clone would not event
    this.dateOpts = this.getCopyOfDpOptions(this.myDatepickerOptions);

    this.dateOpts.todayTxt = this.txt['today'];

    const disabled: Array<IMyDateRange> = GlobalFunctions.clone(this.disabledRanges);
    this.dateOpts.disableDateRanges = disabled;

    // we limit date entry to MAX_MONTHS before today and to MAX_MONTHS after today
    // (it is necessary to enter a disable entry in all cases if it has been entered in 1 case
    // cause component would not reset option otherwise)
    let disableSince = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS);
    let disableUntil = GlobalFunctions.addMonths(GlobalFunctions.getStartOfDay(new Date()), MAX_MONTHS * -1);
    // in case of viewing old calendars we must have the possibility to go back to first calendarDay
    if (this.firstCalendarDay && GlobalFunctions.getDateInMinutes(this.firstCalendarDay) < GlobalFunctions.getDateInMinutes(disableUntil)) {
      disableUntil = this.firstCalendarDay;
    }
    if (this.isSelecting) {
      if (this.session.isPlan) {
        disableUntil = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(new Date()), -1);

      } else {
        disableSince = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(new Date()), 1);
      }
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
  }

  /**
  * we need getCopy to avoid getting just a reference with "... = this.myDatepickerOptions"
  */
  private getCopyOfDpOptions(opts: IAngularMyDpOptions): IAngularMyDpOptions {
    return JSON.parse(JSON.stringify(opts));
  }

  private loadPlanActual() {
    this.planActualChoices = [];
    if (GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date())) >= GlobalFunctions.getDateInMinutes(this.session?.calendarDay)) {
      this.planActualChoices.push({value: 'actual', isPlan: false, isChecked: !this.session?.isPlan});
    }
    this.planActualChoices.push({value: 'plan', isPlan: true, isChecked: this.session?.isPlan});
  }


  private loadTimeSlizes() {
    /* in the  we do not set timeSlizes outside of options-view
    this.timeSlizes = GlobalFunctions.getTimeSlizes();
    this.timeSlizeChoices = [];
    this.timeSlizes.forEach(t => {
      this.timeSlizeChoices.push({value: t, isChecked: Number(this.opts?.timeSlize) === t ? true : false });
    });
      */
  }

  private setContactStyles() {
    this.contactStyle = StyleFactory.getBgColorStyle(this.sessionContact?.contactColor ?? '', 0, 0, GlobalFunctions.clone(this.pointerStyle));
    if (this.session?.calendarDay && this.sessionContact) this.isStylesReady = true;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // console.log(event.target.innerWidth);
    this.windowWidth = event.target.innerWidth;
  }

  /** ------------------------  public methods --------------------------------------------------- */



  public toggleShowPlan(event: any) {
    // we must clone session to get a new object reference
    const session: Session = GlobalFunctions.clone(this.session);
    this.planActualChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isChecked = true;
      } else {
        _.isChecked = false;
      }
    });
    if (this.planActualChoices.filter(_ => _.isPlan)[0].isChecked) {
      session.isPlan = true;
    } else {
      session.isPlan = false;
    }
    this.sessionPlanUpdate.emit(session);
  }



  public clearDate(): void {
    this.ngxdp.clearDate();
  }

  // if type of angular-mydatepicker is hidden, this function is obsolete
  public onInputFieldChanged(event: IMyInputFieldChanged): void {
    // console.log('onInputFieldChanged(): Value: ', event.value, ' - dateFormat: ', event.dateFormat, ' - valid: ', event.valid);
  }

  public onDateChanged(event: IMyDateModel): void {
    // console.log('onDateChanged(): ', event);
    // in this surrounding we do not set isRange
    if (!event.isRange) {
      // this.session.calendarDay = event.singleDate.jsDate;
      const choosenDate = event.singleDate?.jsDate;
      if (choosenDate) this.calendarDaySelected.emit(choosenDate);
    }
  }

  public goBack():void {
    if (!this.isSelecting && !this.isCreating ) {
      const choosenDate = GlobalFunctions.addDays(this.session.calendarDay, -1);
      this.calendarDaySelected.emit(choosenDate);
    }
  }

  public goForward():void {
    if (!this.isSelecting && !this.isCreating  ) {
      const choosenDate = GlobalFunctions.addDays(this.session.calendarDay, 1);
      this.calendarDaySelected.emit(choosenDate);
    }
  }

  public goWeekBack():void {
    if (!this.isSelecting && !this.isCreating ) {
      const choosenDate = GlobalFunctions.addDays(this.session.calendarDay, -7);
      this.calendarDaySelected.emit(choosenDate);
    }
  }

  public goWeekForward():void {
    if (!this.isSelecting && !this.isCreating  ) {
      const choosenDate = GlobalFunctions.addDays(this.session.calendarDay, 7);
      this.calendarDaySelected.emit(choosenDate);
    }
  }

  public viewSelected(): string {
    let selected = ''
    this.views.forEach(_ => {
      if (_.isSelected) {
        selected = _.name;
      }
    });
    return selected;
  }

  public selectView(value: string) {
    // console.log('selectView(): ', value);
    if ((!this.isSelecting || value === 'week-view' || value === 'grid-view' || value === 'cards-view')
    && !this.isCreating ) {
      // isSelected in this.views (and via object reference also in this.viewSeletced) is set in parent component
      this.viewSelection.emit(value);
    }
    this.viewChoices.forEach(_ => {
      if (_.value === value) {
        _.isSelected = true
      } else {
        _.isSelected = false;
      }
    });
  }

  public selectViewChoice(event: any) {
    this.selectView(event.target.value);
  }

  public setSelection() {
    this.selectionSet.emit();
  }

  public setContactSelection() {
    // this.autoViewSelected.emit('issue-select-view');
    if (!this.isSelecting && !this.isCreating && this.viewSelected() !== 'options-view') {
      this.viewSelection.emit('issue-select-view');
    }
  }

}



