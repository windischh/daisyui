import { DatePipe, NgClass } from '@angular/common';
import { Component, Inject, LOCALE_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Session } from '../../_db/session';

import { Language } from '../../_enums/language.enum';
import { App } from '../../_enums/app.enum';

import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { CalendarService } from '../../_services/calendar.service';
import { AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';


@Component({
  selector: 'dsy-status',
  templateUrl: './status.html',
  styleUrl: './status.css',
  imports: [NgClass, FormsModule, DatePipe, AngularMyDatePickerModule]
})
export class StatusComponent {

  public name = 'StatusComponent';

  App: typeof App = App;

  public modeChoices!: Array<IChoice>;
  public languageChoices!: Array<IChoice>;

  public session!: Session | null;

  public calendarMessages: Array<[string, string]> = [];

  // refresh signal triggers change detection
  // signal value   0 - not ready  > 0 ready
  public refreshSignal = signal(0);

  constructor(@Inject(LOCALE_ID) public locale: string,
    private route: ActivatedRoute,
    private router: Router,
    private calendarService: CalendarService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    await this.sessionUse();
  }

  // we do not activate session because we want to show last status ..
  private async sessionUse() {
    this.session = this.auth.getSession(this.name);
    if (this.session) {
      this.modeChoices = [
        {text: 'admin', value: 'admin', isSelected: this.session.app === App.admin},
        // no change to server mode
        // {text: 'server - user', value: 'server', isSelected: true},
        {text: 'local-user', value: 'local', isSelected: this.session.app === App.local}
      ];
      this.languageChoices = Object.keys(Language)
      .filter((k: any) => typeof Language[k] === 'number' && Number(Language[k]) > 0)
      .map(_ => {
        const enumStringType: { [key: string]: any } = Language;
        return {value: enumStringType[_] as string, text: _, isSelected: Number(enumStringType[_]) === this.session?.language };
      });
    }
    // status of users calendar (actual and planned events)
    const calendarStatus = this.calendarService.getCalendarStatus(this.name);
    const [actualCount, plannedBeforeTodayCount, plannedTodayCount, plannedAfterTodayCount, firstActualDays, lastPlannedDays ] = calendarStatus;
    this.calendarMessages.push(['text-xl md:text-2xl font-semibold', 'Kalender - Ereignisse']);
    if (actualCount > 0 && firstActualDays < 366) {
      this.calendarMessages.push(['text-base', actualCount.toString() + ' tatsächliche Ereignisse  (beginnend vor ' + Math.round(firstActualDays/7).toString() + ' Wochen) ']);
    }
    if (actualCount > 0 && firstActualDays >= 366) {
      this.calendarMessages.push(['text-base', actualCount.toString() + ' tatsächliche  Ereignisse  (beginnend vor ' + Math.round(firstActualDays/365).toString() + ' Jahren) ']);
    }
    if (plannedBeforeTodayCount > 0) {
      this.calendarMessages.push(['text-base', plannedBeforeTodayCount.toString() + ' alte geplante Ereignisse (vor heute)']);
    }
    if (plannedTodayCount > 0) {
      this.calendarMessages.push(['text-base', plannedTodayCount.toString() + ' geplante Ereignisse (heute)']);
    }
    if (plannedAfterTodayCount > 0 && lastPlannedDays < 366) {
      this.calendarMessages.push(['text-base', plannedAfterTodayCount.toString() + ' geplante Ereignisse  (bis in ' + Math.round(lastPlannedDays/7).toString() + ' Wochen) ']);
    }
     if (plannedAfterTodayCount > 0 && lastPlannedDays >= 366) {
      this.calendarMessages.push(['text-base', plannedAfterTodayCount.toString() + ' geplante Ereignisse  (bis in ' + Math.round(lastPlannedDays/365).toString() + ' Jahren) ']);
    }
    const isCheckMode = true;
    const planToActualStatus = this.calendarService.convertEventsActual(isCheckMode, this.name);
    const [noOverlapCount, lastNoOverlapDays, overlapCount, lastOverlapDays, disabledActualCount]= planToActualStatus;
    this.calendarMessages.push(['text-xl md:text-2xl font-semibold', 'Kalender Plan Convert']);
    if (disabledActualCount > 0) {
      this.calendarMessages.push(['text-base', disabledActualCount.toString() + ' tatsächliche Ereignisse mit Strukturfehlern - zu löschen']);
    }
    if (noOverlapCount > 0) {
      this.calendarMessages.push(['text-base', noOverlapCount.toString() + ' alte geplante Ereignisse (bis vor ' + Math.round(lastNoOverlapDays/7).toString() + ' Wochen) - konvertierbar in tasächliche']);
    }
    if (overlapCount > 0) {
      this.calendarMessages.push(['text-base', overlapCount.toString() + ' alte geplante Ereignisse (bis vor ' + Math.round(lastOverlapDays/7).toString() + ' Wochen) - überlappend, nicht konvertierbar']);
    }
    this.refreshSignal.set(this.refreshSignal() + 1);
  }

  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * change mode of app
   * @param event - choosen selection
   */
  public selectMode(event: any): void {
    this.router.navigate(['../' + event.target.value], { relativeTo: this.route.parent });
  }

  /**
   * rewuest language of selection-box
   * @param event - id of selection choices
   */
  public async selectLanguage(event: any)  {
    for await (const _ of this.languageChoices) {
      if (Number(_.value) === Number(event.target.value)) {
        _.isSelected = true;
        await this.auth.changeLanguage(Number(_.value), this.name);
        this.session = this.auth.getSession(this.name);
      } else {
        _.isSelected = false;
      }
    }
    this.refreshSignal.set(this.refreshSignal() + 1);
  }

}

