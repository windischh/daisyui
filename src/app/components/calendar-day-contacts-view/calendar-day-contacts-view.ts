import { Component, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter, ViewChild, SimpleChanges} from '@angular/core';
import { formatDate, NgStyle, SlicePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { StyleFactory } from '../../_globals/style-factory';
import { MAX_CUSTOMER_NR, WHITE_SMOKE } from '../../_globals/constants';

import { IWorkOptions } from '../../_interfaces/i-work-options';
import { Work } from '../../_db/work';
import { Session } from '../../_db/session';
import { Customer } from '../../_db/customer';
import { Issue } from '../../_db/issue';

@Component({
  selector: 'dsy-calendar-day-contacts-view',
  templateUrl: './calendar-day-contacts-view.html',
  styleUrl: './calendar-day-contacts-view.css',
  imports: [NgStyle, SlicePipe]
})
export class WorkDayCustomersViewComponent implements OnInit {

  public name = 'WorkDayCustomersViewComponent';

  @Input({required: true}) session: Session;

  // we need locale for time formatting
  @Input({required: true}) locale: string;

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) worktxt: { [key: string]: string };
  @Input({required: true}) custtxt: { [key: string]: string };
  @Input({required: true}) issuetxt: { [key: string]: string };

  @Input({required: true}) opts: IWorkOptions;

  @Input({required: true}) actualWorks: Array<Work>;
  @Input({required: true}) planWorks: Array<Work>;
  @Input({required: true}) worksChangeCounter: number;

  // customer and issue which are selected for work entry
  @Input({required: true}) workCustomer: Customer;
  @Input({required: true}) workIssue: Issue;

  MAX_CUSTOMER_NR = MAX_CUSTOMER_NR;

  worksFiltered: Array<WorkExtended>;

  otherDayStyle = {
    'background-color': WHITE_SMOKE
  };

  @Output() customerSelected = new EventEmitter<number>();
  @Output() issueOfWorkSelected = new EventEmitter<number>();

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    for (const [propKey, propValue] of Object.entries(changes)) {
      if (propKey === 'session' || propKey === 'actualWorks' || propKey === 'planWorks'  || propKey === 'opts' ||  propKey === 'worksChangeCounter') {
        this.filterWorks();
      }
      // console.log('work-day-orders propkey: ', propKey, 'propvalue: ', JSON.stringify(propValue));
    }
  }

  /**
   * the component shows all work of actual week
   *
   * (style and date display suppress are prepared to show more than workDay ....)
   *
   */
  private filterWorks() {

    if (this.session) {
      const works = this.session.isPlan ? this.planWorks : this.actualWorks;
      if (works?.length > 0) {
        // we take all works for week of workDay - we check again, but planWorks and actualworks are usually  prepared for this week already ..
        // weekDay is day (0 - 6) of selected workDay
        const weekDay = GlobalFunctions.getWeekDay(this.session.workDay, 0, this.locale);
        // weekBegin is the date of first day of week
        const weekBegin = GlobalFunctions.addDays(GlobalFunctions.getStartOfDay(this.session.workDay), -1 * weekDay);
        const nextWeekBegin = GlobalFunctions.addDays(weekBegin, 7);
        this.worksFiltered = works.filter(_ =>
          GlobalFunctions.isMinuteSameOrEarlier(weekBegin, _.workBegin)
          && GlobalFunctions.isMinuteEarlier(_.workBegin, nextWeekBegin)
          && ( (this.session.isPlan && _.type === 0)
          || (!this.session.isPlan && _.type === 1) ))
          .map((work)  => {
            return {...work, customerNrDisplay: MAX_CUSTOMER_NR.toString(), issueNr: '999999999', workBeginDisplay: '', timeDisplay: '', timeWorkedDisplay: '', style: {}};
          });
        for (const work of this.worksFiltered) {
          work.workBeginDisplay = formatDate(GlobalFunctions.getStartOfDay(work.workBegin), 'd.MM.yyyy', this.locale);
          work.timeDisplay = formatDate(work.workBegin, 'HH:mm', this.locale);
          // get customer, issue via workInfo
          if (work.customerNr > 0) {
            work.customerNrDisplay = work.workInfo?.customerDisplayNr;
          }
          if (work.issueProviderId > 0) {
            work.issueNr = work.workInfo?.nExternalIssueId ? work.workInfo?.nExternalIssueId.toString() : work.workInfo?.sExternalIssueId;
          }
        }
      }
      // sort by date, customerNr, issueNr
      if (this.worksFiltered?.length > 0) {
        this.worksFiltered.sort((a: WorkExtended, b: WorkExtended) => {
          if (a['customerNrDisplay'] > b['customerNrDisplay']) {return 1000; }
          if (a['customerNrDisplay'] < b['customerNrDisplay']) {return -1000; }
          if (a['issueNr'] > b['issueNr']) {return 100; }
          if (a['issueNr'] < b['issueNr']) {return -100; }
          if (a['workBeginDisplay'] > b['workBeginDisplay'] ) {return 10; }
          if (a['workBeginDisplay'] < b['workBeginDisplay'] ) {return -10; }
          if (a['timeDisplay'] > b['timeDisplay'] ) {return 1; }
          if (a['timeDisplay'] < b['timeDisplay'] ) {return -1; }
          return 0;
        });
        // suppress date if equal date before, also customerNr
        for (let ix = 0; ix < this.worksFiltered.length; ix++) {
          if (ix > 0 && this.worksFiltered[ix]['customerNrDisplay']  === this.worksFiltered[ix - 1]['customerNrDisplay'] ) {
              this.worksFiltered[ix]['customerNrDisplay']  = '';
          }
          if (ix > 0 && this.worksFiltered[ix]['issueNr']  === this.worksFiltered[ix - 1]['issueNr'] ) {
              this.worksFiltered[ix]['issueNr']  = '';
          }
          if (ix > 0 && GlobalFunctions.getYMD(this.worksFiltered[ix].workBegin) === GlobalFunctions.getYMD(this.worksFiltered[ix - 1].workBegin) ) {
            this.worksFiltered[ix]['workBeginDisplay']= null;
          }
          const worked = this.worksFiltered[ix].workDuration;
          let workDurationDisplay =  GlobalFunctions.minutesDisplay(worked);
          this.worksFiltered[ix]['timeWorkedDisplay'] = workDurationDisplay;
          if (GlobalFunctions.getYMD(this.worksFiltered[ix].workBegin)  === GlobalFunctions.getYMD(this.session.workDay) ) {
            this.worksFiltered[ix]['style'] = {};
          } else {
            this.worksFiltered[ix]['style'] = this.otherDayStyle;
          }
        }
      }
    } else {
      this.worksFiltered = [];
    }
  }

  /** ------------------------  public methods --------------------------------------------------- */

  public setCustomerBgColorStyle (customerColor: string) {
    return StyleFactory.getBgColorStyle(customerColor, 0);
  }

  // we get index of work from template and send workId  via event to parent component to get issue there ...
  public setIssue(i: number) {
    this.issueOfWorkSelected.emit(this.worksFiltered[i].workId);
  }

  public setCustomer(customerId: number) {
    this.customerSelected.emit(customerId);
  }

}


