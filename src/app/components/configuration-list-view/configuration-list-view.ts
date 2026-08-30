import { DecimalPipe, SlicePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfigurationOption } from '../../_db/configuration-option';
import { Session } from '../../_db/session';
import { Language } from '../../_enums/language.enum';
import { IConfigurationArea } from '../../_interfaces/i-configuration-area';


@Component({
  selector: 'dsy-configuration-list-view',
  templateUrl: './configuration-list-view.html',
  styleUrl: './configuration-list-view.css',
  imports: [FormsModule, SlicePipe, DecimalPipe]
})
export class ConfigurationListViewComponent implements OnInit {


  public name = 'ConfigurationListViewComponent';

  @Input({required: true}) session!: Session | null;

  @Input({required: true}) areas!: Array<IConfigurationArea>;
  @Input({required: true}) configurationOption!: ConfigurationOption;
  @Input({required: true}) configurationOptions!: Array<ConfigurationOption>;
  // isMaint - true if updating is allowed
  @Input({required: true}) isMaint: boolean = false;
  // isMaint - true if creating of new configurationOption is allowed
  @Input({required: true}) isCreate: boolean = false;
  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) optiontxt!: { [key: string]: string };

  @Output() configurationListClose = new EventEmitter();
  @Output() areaInsert = new EventEmitter();
  @Output() areaShow = new EventEmitter<number>();
  @Output() areaMaint = new EventEmitter<number>();
  @Output() changeLanguage = new EventEmitter<number>();

  languageEnum: { [key: string]: any } = Language;

  // choices
  languageChoices = Object.keys(this.languageEnum)
    .filter(k => typeof this.languageEnum[k] === 'number')
    .map(_ => {
      return {value: this.languageEnum[_] as string, text: _, isSelected: false};
    });

  constructor() { }

  ngOnInit(): void {
    if (this.session) {
      this.languageChoices.forEach(_ => {
        if (Number(_.value) === this.session?.language) {
          _.isSelected = true;
        }
      })
    }
  }


  /** --------------------------  public methods -------------------------------------------- */


  // not needed in the moment - list is used only as leading view ....
  public return() {
    this.configurationListClose.emit();
  }

  // user has pressed "insert configurationOption" button
  public insert() {
    this.areaInsert.emit();
  }


  // user has pressed "show configurationOption" button
  public show(i: number) {
    this.areaShow.emit(i);
  }

  // user has pressed "update configurationOption" button
  public maint(i: number) {
    this.areaMaint.emit(i);
  }

  // user has pressed "disable configurationOption" icon
  public disable(i: number) {
    // we do not allow disablng of areas ...
  }

  setLanguage(event: any): void {
    this.languageChoices.forEach(_ => {
      if (Number(_.value) === Number(event.target.value)) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.changeLanguage.emit(Number(this.languageChoices.filter(_ => _.isSelected)[0].value));
  }

}


