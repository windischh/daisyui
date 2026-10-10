import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

import { GlobalFunctions } from '../../_globals/global-functions';

import { IEventOptions } from '../../_interfaces/i-event-options';
import { ConfigurationOption } from '../../_db/configuration-option';
import { IUserEventOptions } from '../../_interfaces/i-user-event-options';
import { FormsModule } from '@angular/forms';

// TODO if we  need this construct otherwhere, we should make an interface ....
class HourObject {startHour: {value: string, isChecked: boolean}; lastHour: {value: string, isChecked: boolean}; }


@Component({
  selector: 'dsy-calendar-day-options-view',
  templateUrl: './calendar-day-options-view.html',
  styleUrl: './calendar-day-options-view.css',
  imports: [FormsModule]
})
export class EventDayOptionsViewComponent implements OnInit {

  public name = 'EventDayOptionsViewComponent';

  @Input({required: true}) txt: { [key: string]: string };
  @Input({required: true}) userOpts: IUserEventOptions;
  @Input({required: true}) options: ConfigurationOption[];

  persistChoices: Array<{value: string, isChecked: boolean}> = [];
  styleChoices: Array<{value: number, text: string, isSelected: boolean}>;
  startHourChoices: Array<{value: string, isChecked: boolean}> = [];
  lastHourChoices: Array<{value: string, isChecked: boolean}> = [];

  timeSlizes: Array<number>;
  timeSlizeChoices: Array<{value: number, isChecked: boolean}> = [];

  maxCustSel: Array<number>;
  maxCustSelChoices: Array<{value: number, isChecked: boolean}> = [];

  hourChoices: HourObject[] = [];

  @Output() optsUpdate = new EventEmitter<IUserEventOptions>();
  @Output() optsStore = new EventEmitter();

  documentWidth = document.documentElement.clientWidth;
  tableScrollStyle = {'width': this.documentWidth, 'overflow-x': 'scroll'};

  constructor() { }

  ngOnInit(): void {
    this.initChoices();
  }


  private initChoices() {
    this.persistChoices.push({value: 'true', isChecked: this.userOpts.isImmediatePersist });
    this.persistChoices.push({value: 'false', isChecked: !this.userOpts.isImmediatePersist });
    for (let i = 0; i <= 24; i++) {
      const hourChoice: HourObject = {startHour: i === 24 ? null : {value: i.toString(), isChecked: i === this.userOpts.startHour},
        lastHour: i === 0 ? null : {value: i.toString(), isChecked: i === this.userOpts.lastHour}};
      this.hourChoices.push(hourChoice);
    }
    this.initTimeSlizes();
    this.initmaxCustSel();
    this.initStartHourChoices(this.userOpts.startHour);
    this.initLastHourChoices(this.userOpts.lastHour);
    this.getStyles();
  }

  private initTimeSlizes() {
    this.timeSlizes = GlobalFunctions.getTimeSlizes();
    this.timeSlizeChoices = [];
    this.timeSlizes.forEach(t => {
      this.timeSlizeChoices.push({value: t, isChecked: Number(this.userOpts.timeSlize) === t ? true : false });
    });
  }

  private initmaxCustSel() {
    this.maxCustSel = [10, 20, 30, 40, 50];
    this.maxCustSelChoices = [];
    this.maxCustSel.forEach(t => {
      this.maxCustSelChoices.push({value: t, isChecked: Number(this.userOpts.maxIssueSelections) === t ? true : false });
    });
  }

  private initStartHourChoices(startHour: number) {
    this.startHourChoices = [];
    for (let i = 0; i < 24; i++) {
      this.startHourChoices.push({value: i.toString(), isChecked: i === startHour});
    }
  }

  private initLastHourChoices(lastHour: number) {
    this.lastHourChoices = [];
    for (let i = 1; i <= 24; i++) {
      this.lastHourChoices.push({value: i.toString(), isChecked: i === lastHour});
    }
  }


  private getStyles() {
    this.styleChoices = [];
    this.options.filter(_ => _.optionArea === 'eventCalendar'
      && _.optionName.substr(_.optionArea.length + 4) === 'opt_style_name'
    ).forEach(_ => {
      const styleString  = _.optionName.substr(_.optionArea.length + 1, 2);
      let styleName = '';
      styleName = this.txt['style'] ? this.txt['style'] : 'style';
      styleName += ': ' + styleString;
      this.styleChoices.push({
        value: Number(styleString),
        text: _.optionStringValue ? _.optionStringValue : styleName,
        isSelected: Number(styleString) === this.userOpts.style
      });
    });
  }


  /** --------------------------  public methods -------------------------------------------- */

  public storeOptions() {
    this.optsStore.emit();
    // console.log('we persist now: ', JSON.stringify(this.opts));
  }

  public setPersist(event: any) {
    // console.log('setPersist ', JSON.stringify(event));
    if (event.target.value) {
      // we must clone opts to get a new object reference for this.opts in model
      const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
      this.persistChoices.forEach(_ => {
        if (_.value === event.target.value && event.target.checked) {
          _.isChecked = true;
        } else {
          _.isChecked = false;
        }
      });
      userOpts.isImmediatePersist =  this.persistChoices.filter(_ => _.value === 'true')[0].isChecked;
      this.optsUpdate.emit(userOpts);
    }
  }

  public selectStyle(event: any) {
    if (event.target.value) {
      // we must clone opts to get a new object reference for this.opts in model
      const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
      this.styleChoices.forEach(_ => {
        if (_.value === Number(event.target.value)) {
          _.isSelected = true;
          userOpts.style = _.value;
        } else {
          _.isSelected = false;
        }
      });
      this.optsUpdate.emit(userOpts);
    }
  }

  public setTimeSlize(event: any) {
    // we must clone opts to get a new object reference for this.opts in model
    const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
    this.timeSlizeChoices.forEach(_ => {
      if (_.value === Number(event.target.value) && event.target.checked) {
        userOpts.timeSlize = _.value;
        this.optsUpdate.emit(userOpts);
        _.isChecked = true;
      } else {
        _.isChecked = false;
      }
    });
  }

  public setStartHour(event: any) {
    if (event.target.value) {
      // we must clone opts to get a new object reference for this.opts in model
      const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
      this.startHourChoices.forEach(_ => {
        if (_.value === event.target.value && event.target.checked) {
          _.isChecked = true;
          userOpts.startHour = Number(_.value);
        } else {
          _.isChecked = false;
        }
      });
      if (userOpts.lastHour <= userOpts.startHour) {
        userOpts.lastHour = userOpts.startHour + 1;
        this.initLastHourChoices(userOpts.lastHour);
      }
      this.optsUpdate.emit(userOpts);
    }
  }

  public setLastHour(event: any) {
    if (event.target.value) {
      // we must clone opts to get a new object reference for this.opts in model
      const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
      this.lastHourChoices.forEach(_ => {
        if (_.value === event.target.value && event.target.checked) {
          _.isChecked = true;
          userOpts.lastHour = Number(_.value);
        } else {
          _.isChecked = false;
        }
      });
      if (userOpts.lastHour <= userOpts.startHour) {
        userOpts.startHour = userOpts.lastHour - 1;
        this.initStartHourChoices(userOpts.startHour);
      }
      this.optsUpdate.emit(userOpts);
    }
  }

  public setMaxCustSel(event: any) {
    // we must clone opts to get a new object reference for this.opts in model
    const userOpts: IUserEventOptions = GlobalFunctions.clone(this.userOpts);
    this.maxCustSelChoices.forEach(_ => {
      if (_.value === Number(event.target.value) && event.target.checked) {
        userOpts.maxIssueSelections = _.value;
        this.optsUpdate.emit(userOpts);
        _.isChecked = true;
      } else {
        _.isChecked = false;
      }
    });
  }
}


