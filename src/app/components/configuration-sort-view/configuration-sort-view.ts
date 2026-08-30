import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Session } from '../../_db/session';
import { ConfigurationArea } from '../../_enums/configuration-area.enum';
import { OptionType } from '../../_enums/option-type.enum';
import { ConfigurationOptionMaintFunctions } from '../../_globals/configuration-option-maint-functions';
import { IConfigurationArea } from '../../_interfaces/i-configuration-area';



@Component({
  selector: 'dsy-configuration-sort-view',
  imports: [],
  templateUrl: './configuration-sort-view.html',
  styleUrl: './configuration-sort-view.css',
})
export class ConfigurationSortViewComponent implements OnInit {


  public name = 'ConfigurationSortViewComponent';

  @Input({required: true}) session!: Session | null;

  /* db elements from configuration model
  */
  @Input({required: true}) configurationOptions!: Array<ConfigurationOption>;
  @Input({required: true}) area!: IConfigurationArea;
  @Input({required: true}) isOptionsSort: boolean = false;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) optiontxt!: { [key: string]: string };

  @Output() setOptionsSort = new EventEmitter<boolean>();
  @Output() optionsSorted = new EventEmitter<{optionIdBefore: Array<number>, optionIdSorted: Array<number>}>();
  @Output() setOptions = new EventEmitter();

  areaTxt: string = ''; // area name for html template header
  areaOptions: Array<ConfigurationOption> = []; // areaOptions include all options belonging to choosen area

  isNewSorted = false;
  // isUpdateOk triggers dimmer
  isUpdateOk = false;

  // we use an optionId array to store all optionIds before sorting and deleting
  // sorting an deleting are made on this.configurationOption and trasfered to model when sorted via optionIdSorted
  optionIdBefore: Array<number> = [];

  constructor() { }

  ngOnInit() {
    if (this.session && this.area) {
      // we can have load procedures in OnInit because -sort-view is not loaded at reload
      let txt = this.area.optionArea;
      this.areaTxt = this.txt[txt] ? this.txt[txt] : txt;
      this.areaTxt += Object.keys(ConfigurationArea).filter(_ => _ === this.area.optionArea).length === 0 ? ' ***' : '';
      this.areaOptions = this.configurationOptions.filter(_ => _.optionArea === this.area.optionArea)
      .map(option => {
        const {...rest} = option;
        const value = ConfigurationOptionMaintFunctions.getOptionValue(option) ?? undefined;
        const txt = this.txt[option.optionName] ? this.txt[option.optionName] : option.optionName;
        const typeText = OptionType[option.type];
        return {
          ...rest, txt, value, typeText
          };
      }).sort((a, b) => a.optionNr - b.optionNr);

      this.optionIdBefore = [];
      this.areaOptions.forEach(_ => this.optionIdBefore.push(_.optionId));
      // console.log('configuration-sort init');
    }
  }


  raiseOption(i: number): void {
    if (i < this.areaOptions.length - 1) {
      // fixed options have id 0 and must be set as server option before sorting thmm
      if (this.areaOptions.findIndex(_ => _.optionId === 0) >= 0) {
        this.isUpdateOk = true;
        this.setOptions.emit();
      } else {
        const posUp = this.areaOptions[i];
        this.areaOptions[i] = this.areaOptions[i + 1];
        this.areaOptions[i + 1] = posUp;
        this.isNewSorted = true;
      }
    }
  }

  lowerOption(i: number): void {
    if (i > 0 ) {
      // fixed options have id 0 and must be set as server option before sorting thmm
      if (this.areaOptions.findIndex(_ => _.optionId === 0) >= 0) {
        this.isUpdateOk = true;
        this.setOptions.emit();
      } else {
        const posDown = this.areaOptions[i];
        this.areaOptions[i] = this.areaOptions[i - 1];
        this.areaOptions[i - 1] = posDown;
        this.isNewSorted = true;
      }
    }
  }

  setUpdates() {
    const optionIdSorted: Array<number> = [];
    this.areaOptions.forEach(_ => optionIdSorted.push(_.optionId));
    if (this.areaOptions && ((this.isNewSorted && this.optionIdBefore.length > 1)
    || (optionIdSorted.length === 1 && this.areaOptions[0].optionNr !== 1))) {
      this.isUpdateOk = true;
      this.optionsSorted.emit({optionIdBefore: this.optionIdBefore, optionIdSorted});
    } else {
      this.setOptionsSort.emit(false);
    }
  }

  cancelUpdates(): void {
    this.setOptionsSort.emit(false);
  }

}



