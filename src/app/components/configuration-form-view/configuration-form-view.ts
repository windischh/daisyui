import { Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output, SimpleChange } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';
import { ConfigurationOptionFactory } from '../../_db/configuration-option-factory';
import { OptionType } from '../../_enums/option-type.enum';
import { ConfigurationArea } from '../../_enums/configuration-area.enum';
import { ConfigurationStyle } from '../../_enums/configuration-style.enum ';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';
import { ConfigurationOptionMaintFunctions } from '../../_globals/configuration-option-maint-functions';
import { GlobalFunctions } from '../../_globals/global-functions';
import { INumChoice } from '../../_interfaces/i-num-choice';
import { IConfigurationArea } from '../../_interfaces/i-configuration-area';

import { ConfigurationService } from '../../_services/configuration.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { ErrorMessage } from '../../_validators/error-message';
import { ConfigurationValidators } from '../../_validators/configuration.validators';
import { OptionGroupCalendar } from '../../_enums/option-group-event-calendar.enum';
import { OptionGroupCalendarExport } from '../../_enums/option-group-calendar-export.enum';


@Component({
  selector: 'dsy-configuration-form-view',
  templateUrl: './configuration-form-view.html',
  styleUrl: './configuration-form-view.css',
  imports: [FormsModule, ReactiveFormsModule]
})
export class ConfigurationFormViewComponent implements OnInit {

  public name = 'ConfigurationFormViewComponent';

  @Input({required: true}) session!: Session | null;

  // formAction - show, insert, update
  @Input({required: true}) formAction: string | null = '';
  @Input({required: true}) area!: IConfigurationArea;
  // all configurationOptions of this area
  @Input({required: true}) configurationOptions!: Array<ConfigurationOption>;
  @Input({required: true}) configurationOptionsLoadCounter!: number;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) optiontxt!: { [key: string]: string };

  @Output() updateConfigurationOption = new EventEmitter<ConfigurationOption>();
  @Output() newConfigurationOption = new EventEmitter<ConfigurationOption>();
  @Output() disableConfigurationOption = new EventEmitter<ConfigurationOption>();
  @Output() configurationFormClose = new EventEmitter();
  @Output() setOptionsSort = new EventEmitter();

  public thisForm: FormGroup;
  public errors: { [key: string]: string } = {};
  private thisFormErrorMessages: ErrorMessage[] = [];

  public isMaint = false;
  public isNew = false;
  public isClone = false;
  public isUpdateUniqueId = false;
  public isUpdateBody = false;
  public isShowBody = false;

  areaTxt: string = ''; // area name for html template header
  optionIx: number = 0; // index of current configurationOption
  isStyle: boolean = false;  // isStyle is true if optionArea is style-structured
  isStyleChoosen = false; // isStyleChhoosen: style is set via user entry
  style!: number; // current style
  areaOptions: Array<ConfigurationOption> = []; // areaOptions include all options belonging to choosen area
  shownOptions: Array<ConfigurationOption> = []; // styleOptions include all options belonging to choosen style (or all areaOptions in case of not styled)

  isUpdateOption = false; // option is just beeing updated
  isNewOption = false; // in case of isUpdateOption: is the option a new option?

  // to prevent user actions before server responds to a previous update/insert
  isProcessOpen = false;

  // typeChoices define the available types for an option
  typeChoices = Object.keys(OptionType)
    .filter((k: any) => typeof OptionType[k] === 'number')
    .map(_ => {
      const enumStringType: { [key: string]: any } = OptionType;
      return {value: enumStringType[_] as number, text: _};
    });

  typeChoicesFiltered: Array<{value: number, text: string}> = [];

  // groupChoices define the available optionGroups in case of style-structured areas
  groupChoices: Array<{value: number, text: string}> = [];
  // optionGroupCalendarEnum: typeof OptionGroupCalendar = OptionGroupCalendar;
  groupChoicesCalendar = Object.keys(OptionGroupCalendar)
  .filter((k: any) => typeof OptionGroupCalendar[k] === 'number')
  .map(_ => {
    const enumStringType: { [key: string]: any } = OptionGroupCalendar;
    return {value: enumStringType[_] as number, text: _};
  });
  groupChoicesCalendarExport = Object.keys(OptionGroupCalendarExport)
  .filter((k: any) => typeof OptionGroupCalendarExport[k] === 'number')
  .map(_ => {
    const enumStringType: { [key: string]: any } = OptionGroupCalendarExport;
    return {value: enumStringType[_] as number, text: _};
  });

  // choosenType defines the type which is choosen by user through optionGroup (in case of style-structured areas)
  //  or name with associated types
  choosenType: number = 0;

  // stringChoices define the available texts
  stringChoices: Array<INumChoice> = [];
  isStringChoice = false;

  // stringNameChoices define names for for stringSequences  in case of style-structured areas
  stringNameChoices: Array<INumChoice> = [];
  isStringNameChoice = false;
  // we need a flag to set true if stringName has been chosen and valueChoices are defined
  isValueChoice = false;

  // isStringNameEntry defines that it is allowed to enter optionName field in case of isStyle
  isStringNameEntry = false;

  // intChoices define the available numbers
  intChoices: Array<INumChoice> = [];
  isIntChoice = false;
  intValue: number = 0;

  // styleChoices define the available styles - which are presented to user as intChoices
  styleChoices: Array<INumChoice> = [];
  isStyleChoice = false;

  booleanChoices: Array<INumChoice> = [{value: 1, text: 'true'}, {value: 0, text: 'false'}];
  isBooleanChoice = false;


  constructor(@Inject(LOCALE_ID) public locale: string,
    private fb: FormBuilder,
    // configurationService is used to transfer it to validators adn to validate new style
    private configurationService: ConfigurationService,
    // auth is private and only used to transfer it to Configuration functions
    private auth: AuthenticationService
  ) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit(): void {
    // activation is done by ngOnChanges
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {

      if (propKey === 'area' || propKey === 'configurationOptionsLoadCounter') {
        switch (this.formAction) {
          case 'show':
            this.isMaint = false;
            break;

          case 'maint':
            if (this.area) {
              this.isMaint = true;
            }
            break;

          case 'new':
            // we await an empty configurationOption
            if (this.area) {
              this.isNew = true;
            }
            break;

          default:
            break;
        }
        this.loadErrorMessages();
        this.initChoices();
        this.isProcessOpen = false;
        let txt = this.area.optionArea;
        this.areaTxt = this.txt[txt] ? this.txt[txt] : txt;
        this.areaTxt += Object.keys(ConfigurationArea).filter(_ => _ === this.area.optionArea).length === 0 ? ' ***' : '';
        if (Object.keys(ConfigurationStyle).filter(_ => _ === this.area.optionArea).length > 0 ) {
          this.isStyle = true;
          if (!this.isStyleChoosen) {
            this.getStyles(this.area);
          }
        } else {
          this.isStyle = false;
        }
        this.loadOptions();
      }
    }

  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('option.optionName', 'required',  this.optiontxt['optionName']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('option.optionName', 'minLength',  this.optiontxt['optionName']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('option.optionName', 'optionExists',  this.optiontxt['className'] + ' ' + this.txt['with']
      + ' ' + this.optiontxt['optionName'] + ' ' + this.txt['already_exists']),
      new ErrorMessage('option.othis.shownOptionsptionNr', 'pattern',  this.optiontxt['optionNr']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('option', 'optionExists',  this.optiontxt['className'] + ' ' + this.txt['with']
      + ' ' + this.optiontxt['optionName'] + ' ' + this.txt['already_exists'])
    ];
  }

  // init group choices after each selection of style
  private initChoices() {
    if (this.configurationOptions?.length > 0) {
      // in case of isStyle we allow more than one choice in an optionGroup only for string types
      if (this.isStyle) {
        switch (this.area.optionArea) {
          case 'calendar':
            this.groupChoices = this.groupChoicesCalendar;
            break;
          case 'calendarExport':
            this.groupChoices = this.groupChoicesCalendarExport;
            break;
        }
        // groupChoice is possible if no element of this group exist in options or we have a stringSequence
        this.groupChoices = this.groupChoices.filter(_ => {
          const groupOptions = this.shownOptions?.filter(option => option.optionGroup  === _.value);
          return groupOptions.length === 0 || (groupOptions.length > 0
            && (groupOptions[0].type === OptionType.stringSequence
              || groupOptions[0].type === OptionType.stringSeqNameChoice
              || groupOptions[0].type === OptionType.stringSeqValueChoice
              || groupOptions[0].type === OptionType.stringSeqValueChoiceUnique
              || groupOptions[0].type === OptionType.stringSeqBothChoice
              || groupOptions[0].type === OptionType.stringSeqBothChoiceUnique
          ));
        });
      } else {
        this.typeChoicesFiltered = this.typeChoices.filter(
          _ => _.value !== OptionType.undefined
          && _.value !== OptionType.stringSequence
          && _.value !== OptionType.stringSeqNameChoice
          && _.value !== OptionType.stringSeqValueChoice
          && _.value !== OptionType.stringSeqValueChoiceUnique
          && _.value !== OptionType.stringSeqBothChoice
          && _.value !== OptionType.stringSeqBothChoiceUnique
          );
      }
    }

  }

  private async getStyles(area: IConfigurationArea) {
    this.styleChoices = [];
    if (this.area && this.isStyle) {
      this.configurationOptions.filter(_ => _.optionArea === this.area.optionArea
        && _.optionName.substring(_.optionArea.length + 4) === 'opt_style_name'
      ).forEach(_ => {
        const styleString  = _.optionName.substring(_.optionArea.length + 1, _.optionArea.length + 3);
        let styleName = '';
        styleName = this.txt['style'] ? this.txt['style'] : 'style';
        styleName += ': ' + styleString;
        this.styleChoices.push({
          value: Number(styleString),
          text: _.optionStringValue ? _.optionStringValue : styleName,
          isSelected: false
        });
      });
      this.addNullChoice();
      this.styleChoices.sort((a, b) => a.value - b.value);
    }
  }

  private async loadOptions() {
    this.shownOptions = [];
    if (this.configurationOptions?.length > 0) {
      this.areaOptions = this.configurationOptions.filter(_ => _.optionArea === this.area.optionArea)
      .map(option => {
        const {...rest} = option;
        let isDeleteable = true;
        const value = ConfigurationOptionMaintFunctions.getOptionValue(option) ?? undefined;
        let name = option.optionName;
        let nameKey = '';
        let txt = this.txt[option.optionName] ? this.txt[option.optionName] : option.optionName;
        let optionGroup = 0;
        const typeText = OptionType[option.type];
        // is the option part of a stlye-structured area ?
        if (this.isStyle) {
          let optionGroupName = '';
          const styleName = option.optionName.substr(option.optionArea.length + 4);
          // first record (exact: record with _##_opt_style_name, where ## is number of style)
          //  of each style contains name of the style - which can also be changed via stringValue
          if (styleName === 'opt_style_name') {
            const style = Number(option.optionName.substring(option.optionArea.length + 1, option.optionArea.length + 3));
            let styleString = '';
            if (style !== undefined && style >= 0) {
              styleString = '0'.concat(style.toString()).substr(style.toString().length - 1, 2);
            }
            optionGroupName = this.txt['style'] ? this.txt['style'] : 'style';
            optionGroupName += ': ' + styleString;
            nameKey = option.optionName.substr(0, option.optionArea.length + 4);
            name = option.optionName.substr(option.optionArea.length + 4);
            txt = this.txt[styleName] ? this.txt[styleName] : styleName;
            // style'header' has optionGroup 0 -  we check if it is deleteable
            // (on performance reason) when user tries to delete style
          } else {
            optionGroup = Number(option.optionName.substr(option.optionArea.length + 4, 4));
            switch (this.area.optionArea) {
              case 'calendar':
                optionGroupName = OptionGroupCalendar[optionGroup];
                break;
              case 'clalendarExport':
                optionGroupName = OptionGroupCalendarExport[optionGroup];
                break;
            }
            optionGroupName = this.txt[optionGroupName] ? this.txt[optionGroupName] : optionGroupName;
            nameKey = option.optionName.substr(0, option.optionArea.length + 9);
            name = option.optionName.substr(option.optionArea.length + 9);
            txt = this.txt[name] ? this.txt[name] : name;
          }
          return {
            ...rest, name, nameKey, txt, value, typeText, isDeleteable, style: this.style, optionGroup, optionGroupName
            };
        } else {
          // if we know this option, it must not be deleted
          if (ConfigurationOptionMaintFunctions.getOptionType(name)) {
            isDeleteable = false;
          }
          return {
            ...rest, name, nameKey, txt, value, typeText, isDeleteable, optionGroup
            };
        }
      }).sort((a, b) => (a.optionGroup * 1000 + a.optionNr) - (b.optionGroup * 1000 + b.optionNr));

      if (!this.isStyle) {
        this.shownOptions = this.areaOptions;
      } else if (this.isStyleChoosen) {
        let styleString = '';
        if (this.style !== undefined && this.style >= 0) {
          styleString = '0'.concat(this.style.toString()).substr(this.style.toString().length - 1, 2);
        }
        this.shownOptions = this.areaOptions?.filter(_ => _.optionName.substring(_.optionArea.length + 1, _.optionArea.length + 3) === styleString);
        // style header may be deleted if no option for the style is at server
        if (this.shownOptions?.filter(_ => _.optionId > 0)?.length > 1) {
          this.shownOptions[0].isDeleteable = false;
        }
        this.initChoices();
      }
    }
  }

  /**
   * used to show "no selected style" before first choice of user
   */
  private addNullChoice() {
    // we assure to have just 1 null choice
    const choices: Array<INumChoice> = GlobalFunctions.clone(this.styleChoices);
    this.styleChoices = [];
    this.styleChoices.push({
      value: -1,
      text: '',
      isSelected: true
    });
    // we assure to have just 1 null choice
    choices.forEach(_ => {
      if (_.value >= 0) {
        this.styleChoices.push(_);
      }
    });
  }

  // after new getting styles, set this.style in choices ...
  private setThisStyle() {
    this.styleChoices.forEach(_ => {
      if (_.value === this.style) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
  }



  /** ------------------------  public methods --------------------------------------------------- */


  public return() {
    this.cancelUpdates();
    this.configurationFormClose.emit();
  }


  async setStyle(styleString: string) {
    // we do not hide input field, but we ignore input if a configuration element is just beeing updated
    if (!this.isUpdateOption) {
      const oldStyle = this.style;
      if (Number(styleString) > 0) {
        this.style = Number(styleString);
        if (this.shownOptions.length === 0 || this.shownOptions[0].optionGroup !== 0) {
          // no opt_style_name record
          const nameKey = this.area.optionArea + '_' + '0'.concat(this.style.toString()).substr((this.style).toString().length - 1, 2) + '_';
          const isExists = await this.configurationService.checkConfigurationOptionName(nameKey + 'opt_style_name', this.name);
          if (!isExists && this.session && this.session?.securityLevel?.maint >= 2 && confirm(this.txt['create_new_style'] + ': ' + this.style.toString() + '?')) {
            const newOption = ConfigurationOptionFactory.empty();
            newOption.optionName = nameKey + 'opt_style_name';
            newOption.optionArea = this.area.optionArea;
            newOption.type = OptionType.string;
            this.newConfigurationOption.emit(newOption);
            this.isStyleChoosen = true;
          } else {
            alert(this.txt['create_new_style'] + ': ' + this.txt['not_allowed']);
            this.style = oldStyle;
          }
        } else {
          this.isStyleChoosen = true;
        }
      } else if (styleString === '0') {
        this.style = 0;
        // style 0 is default - we take it for granted that there are options for this style ...
        this.isStyleChoosen = true;
      } else {
        alert(this.txt['enter_a_number']);
      }
      if (this.isStyleChoosen) {
        this.setThisStyle();
        this.shownOptions = this.areaOptions?.filter(_ => _.optionName.substring(_.optionArea.length + 1, _.optionArea.length + 3) === styleString);
        this.initChoices();
      }
    }
  }

  selectStyle(event: any) {
    if (event.target.value) {
      this.styleChoices.forEach(_ => {
        if (_.value === Number(event.target.value)) {
          _.isSelected = true;
          this.style = _.value;
          this.isStyleChoosen = true;
          const styleString = this.style >= 0 && this.style < 10 ? '0' + this.style.toString() : this.style >= 10 && this.style < 99 ? this.style.toString() : '';
          if (styleString !== '') {
            this.shownOptions = this.areaOptions?.filter(_ => _.optionName.substring(_.optionArea.length + 1, _.optionArea.length + 3) === styleString);
          } else {
            this.shownOptions = [];
          }
          this.initChoices();
        } else {
          _.isSelected = false;
        }
      });
    }
  }

  /**
   * setSort is called from UI when user pushed the option sort button
   */
  setSort() {
    this.setOptionsSort.emit();
  }

  /**
   * setOption is called from UI when user pushed the option update button
   *  - or after addOption
   * @param i index of options
   */
  setOption(i: number) {
    if (this.shownOptions) {
      this.isUpdateOption = true;
      // in case of both choices we open value choice after name choice has been done
      this.isValueChoice = false;
      this.choosenType = this.shownOptions[i].type;
      this.setNameChoices(this.shownOptions[i]['name'] as string);
      this.setGroupChoices(this.shownOptions[i].optionGroup ?? 0, this.shownOptions[i]['name'] as string);
      this.optionIx = i;
      this.thisForm = this.fb.group({
        option: this.fb.group({
          optionType: [this.shownOptions[i].type?.toString()],
          optionGroup: [this.shownOptions[i].optionGroup?.toString()],
          optionNr: [this.shownOptions[i].optionNr,
            [Validators.pattern('^[0-9.]*$')]
          ],
          optionName: [this.shownOptions[i]['name'] ? this.shownOptions[i]['name'] as string  : '',
            [Validators.required,
            Validators.minLength(1)]
          ],
          // in dependance of type, we set optionValue as value which is built in model
          optionValue: [this.shownOptions[i]['value'] as string],
          // we use intValue only for intChoices
          // optionIntValue:  [this.shownOptions[i].optionIntValue ? this.shownOptions[i].optionIntValue.toString() : '0'],
          // optionBooleanValue: [this.shownOptions[i].optionBooleanValue ? this.shownOptions[i].optionBooleanValue.toString() : '0'],
          optionDescription: [this.shownOptions[i].optionDescription]
        },
        {
          asyncValidator: ConfigurationValidators.optionNameExists(this.configurationService,
              this.session?.serviceLevel.contact ?? 0, this.session?.securityLevel.maint ?? 0,
              this.shownOptions[i]['name'] ?? '')
        })
      });
      this.onChangesOption();
      this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
    }
  }

  /**
   * triggered by form when optionGroup or optionName changed
   */
  onChangesOption() {
    this.thisForm.get('option.optionGroup')?.valueChanges
    .subscribe(group => {
        this.choosenType = ConfigurationOptionMaintFunctions.getStyleOptionType(this.area.optionArea, group);
        const optionType = this.thisForm.get('option.optionType');
        if (optionType) {
          optionType.patchValue(this.choosenType.toString());
        }
        if (this.choosenType !== OptionType.stringSequence
          && this.choosenType !== OptionType.stringSeqNameChoice
          && this.choosenType !== OptionType.stringSeqValueChoice
          && this.choosenType !== OptionType.stringSeqValueChoiceUnique
          && this.choosenType !== OptionType.stringSeqBothChoice
          && this.choosenType !== OptionType.stringSeqBothChoiceUnique) {
            const optionName = this.thisForm.get('option.optionName');
            if (optionName) {
              optionName.patchValue(OptionType[this.choosenType]);
            }
        }
        this.setGroupChoices(group, this.thisForm.get('option.optionName')?.value ?? '');
    });

    this.thisForm.get('option.optionName')?.valueChanges
    .subscribe(name => {
      // we trigger both Choice routines - the routines itself check if isStyle or not
      this.setNameChoices(name);
      // we need renewed group choices - in case of stringSeqBothChoice after deciding the name
      // we now can fill and show choices for value
      this.setGroupChoices(this.thisForm.get('option.optionGroup')?.value, name);
      this.isValueChoice = true;
      if (this.choosenType) {
        const optionType = this.thisForm.get('option.optionType');
        if (optionType) {
          optionType.patchValue(this.choosenType.toString());
        }
      }
    });

    // changing optionType is possible only if newOption
    this.thisForm.get('option.optionType')?.valueChanges
    .subscribe(name => {
      if (name === OptionType.boolean) {
        this.isBooleanChoice = true;
      } else {
        this.isBooleanChoice = false;
      }
    });
  }



  /**
   * addOption  is called from UI when user pushed the option add button
   */
  addOption() {
    if (this.shownOptions) {
      const newIx = this.shownOptions.length;
      const configurationOption = ConfigurationOptionFactory.empty();
      this.shownOptions.push(configurationOption);
      this.shownOptions[newIx].optionArea = this.area.optionArea;
      if (this.isStyle) {
        // we put 9999 as optionGroup - to check at submit
        this.shownOptions[newIx].optionGroup = 9999;
        this.shownOptions[newIx]['nameKey'] = ConfigurationOptionBasicFunctions.getOptionKey(this.area.optionArea, this.style, this.shownOptions[newIx]['optionGroup']);
        this.shownOptions[newIx].optionNr = 0;
      } else {
        this.shownOptions[newIx].optionGroup = 0;
        this.shownOptions[newIx]['nameKey'] = '';
        this.shownOptions[newIx].optionNr = newIx + 1;
      }
      this.shownOptions[newIx]['name'] = '';
      this.shownOptions[newIx].type = 0;
      this.isNewOption = true;
      this.setOption(newIx);
    }
  }


  submitForm() {
    if (this.isUpdateOption && this.thisForm.value.option.optionGroup !== '9999'
     && ( this.choosenType !== 0 || Number(this.thisForm.value.option.optionType) !== 0 )) {
      if (this.choosenType !== 0) {
        this.shownOptions[this.optionIx].type = this.choosenType;
      } else {
        this.shownOptions[this.optionIx].type = Number(this.thisForm.value.option.optionType);
      }
      if (this.isStyle && this.isNewOption) {
        this.shownOptions[this.optionIx]['nameKey'] =
         ConfigurationOptionBasicFunctions.getOptionKey(this.area.optionArea, this.style, Number(this.thisForm.value.option.optionGroup));
      }
      this.shownOptions[this.optionIx].optionName = this.shownOptions[this.optionIx]['nameKey'] + this.thisForm.value.option.optionName;;
      switch (this.shownOptions[this.optionIx].type) {
        case OptionType.boolean:
          this.shownOptions[this.optionIx].optionBooleanValue = this.thisForm.value.option.optionValue === 'true' ? 1 : 0;
          break;
        case OptionType.string:
        case OptionType.stringValueChoice:
        case OptionType.stringSequence:
        case OptionType.stringSeqNameChoice:
        case OptionType.stringSeqValueChoice:
        case OptionType.stringSeqValueChoiceUnique:
        case OptionType.stringSeqBothChoice:
        case OptionType.stringSeqBothChoiceUnique:
          this.shownOptions[this.optionIx].optionStringValue = this.thisForm.value.option.optionValue;
          break;
        case OptionType.int:
        case OptionType.intValueChoice:
        case OptionType.styleChoice:
          this.shownOptions[this.optionIx].optionIntValue = Number(this.thisForm.value.option.optionValue);
          break;
        case OptionType.numeric:
          this.shownOptions[this.optionIx].optionNumericValue = Number(this.thisForm.value.option.optionValue);
          break;
        case OptionType.date:
          this.shownOptions[this.optionIx].optionDateValue =
           GlobalFunctions.parseDMYtoDate(this.thisForm.value.option.optionValue);
          break;
      }
      this.shownOptions[this.optionIx].optionDescription = this.thisForm.value.option.optionDescription;
      if (this.isNewOption) {
        this.shownOptions[this.optionIx].optionArea = this.area.optionArea;
        this.newConfigurationOption.emit(this.shownOptions[this.optionIx]);
        this.shownOptions = [];
        this.isNewOption = false;
      } else {
        this.updateConfigurationOption.emit(this.shownOptions[this.optionIx]);
        this.shownOptions = [];
      }
      this.isProcessOpen = true;
    }
    this.cancelUpdates();
  }

  async setDelete(i: number) {
    // style headercan be deleted - all style options are also deleted
    if (this.isStyle && i === 0) {
      let isDeleteAllowed = true;
      if (this.area.optionArea === 'invoicePrint') {
        // at style header we check if template has this style
        /* // TODO after implementing template
        const templates = await this.templateService.getTemplates(this.auth.session.mandantId, this.name).toPromise();
        if (templates.filter(_ => _.style === this.shownOptions[i]['style']).length > 0) {
          alert(this.txt['option_delete'] + ' ' + this.txt['not_allowed'] + '!');
          isDeleteAllowed = false;
        }
        */
      }
      if (isDeleteAllowed && confirm(this.txt['option_delete']  + ': '+ this.shownOptions[i]['name'] + ' - ' + this.shownOptions[i]['style'] + (this.shownOptions[i]['value'] ? ' - ' + this.shownOptions[i]['value'] : '') + '?')) {
        this.disableConfigurationOption.emit(this.shownOptions[i]);
      }
    } else if (this.shownOptions[i].isDeleteable && confirm(this.txt['option_delete'] + ': '+ this.shownOptions[i]['name'] + (this.shownOptions[i]['value'] ? ' - ' + this.shownOptions[i]['value'] : '') + '?')) {
      this.disableConfigurationOption.emit(this.shownOptions[i]);
      this.isProcessOpen = true;
    }
  }


  public cancelUpdates(): void {
    if (this.isNewOption) {
      this.shownOptions.pop();
      this.isNewOption = false;
    }
    this.isUpdateOption = false;
    this.isNew = false;
    this.isClone = false;
    this.isUpdateUniqueId = false;
    this.isUpdateBody = false;
    this.errors = {};
  }

  /**
   * defining form update status as function, depending on single update flags
   *
   */
  public isUpdate(): boolean {return (this.isNew || this.isClone || this.isUpdateUniqueId || this.isUpdateBody);
  }

  /** ---------------------------- private methods exclusively used in public methods ---------------------------------- */


  /**
   * setGroupChoices is called by setOption and by changed option group field during form entry
   * (entry in group field is possible only if newOption)
   *
   * @param optionGroup actual optionGroup of the option - in case of not style-structured areas it is ignored
   */
  private setGroupChoices(optionGroup: number, optionName: string) {
    // console.log('type was changed');
    if (this.isStyle) {
      this.isStringNameEntry = (this.choosenType ===  OptionType.stringSequence
        || this.choosenType === OptionType.stringSeqValueChoice
        || this.choosenType === OptionType.stringSeqValueChoiceUnique);
      this.isBooleanChoice = (this.choosenType === OptionType.boolean);
      this.isStringChoice = (this.choosenType === OptionType.stringValueChoice
        || this.choosenType === OptionType.stringSeqValueChoice
        || this.choosenType === OptionType.stringSeqValueChoiceUnique
        || this.choosenType === OptionType.stringSeqBothChoice
        || this.choosenType === OptionType.stringSeqBothChoiceUnique);
      if (this.isStringChoice) {
        this.stringChoices =  ConfigurationOptionMaintFunctions.getStyleStringChoices(this.area.optionArea, optionGroup, optionName);
      if (this.choosenType === OptionType.stringSeqValueChoiceUnique
       || this.choosenType === OptionType.stringSeqBothChoiceUnique) {
          // we filter values which are already used in this optionGroup - value is unique
          this.stringChoices = this.stringChoices.filter(_ => {
            const stringOptions = this.shownOptions.filter(option =>
              Number(option.optionName.substr(option.optionArea.length + 4, 4)) === optionGroup
              && option.optionStringValue === _.text
              );
            return stringOptions.length === 0;
          });
        }
      }
      // stringName chooseable only if isStyle
      this.isStringNameChoice = (this.choosenType === OptionType.stringSeqNameChoice
        || this.choosenType === OptionType.stringSeqBothChoice
        || this.choosenType === OptionType.stringSeqBothChoiceUnique);
      if (this.isStringNameChoice) {
        this.stringNameChoices = ConfigurationOptionMaintFunctions.getStyleStringNameChoices(this.area.optionArea, optionGroup, this.auth)
        // we filter names which are already used in this optionGroup - name must be unique
        .filter(_ => {
          const stringNameOptions = this.shownOptions.filter(option =>
            Number(option.optionName.substr(option.optionArea.length + 4, 4)) === optionGroup
            && option.optionName.substr(option.optionArea.length + 9)  === _.text
          );
          return stringNameOptions.length === 0;
        });
      }
      // intChoice has int as target this.choosenType - maybe we also need numeric choice somtime ...
      this.isIntChoice = (this.choosenType === OptionType.intValueChoice);
      this.intChoices = ConfigurationOptionMaintFunctions.getStyleIntChoices(this.area.optionArea, optionGroup);
    }
  }

   /**
   * setNameChoices  is called by setOption and by changed name field during form entry
   *  (entry of optionName is possible only if newOption!!)
   *
   * @param optionName - name of the option can have string or number choices, defined in this.utils
   */
  private setNameChoices(optionName: string) {
    if (!this.isStyle) {
      // no sequence types if not style-structured
      this.typeChoicesFiltered = this.typeChoices.filter(
      _ => _.value !== OptionType.undefined
      && _.value !== OptionType.stringSequence
      && _.value !== OptionType.stringSeqNameChoice
      && _.value !== OptionType.stringSeqValueChoice
      && _.value !== OptionType.stringSeqValueChoiceUnique
      && _.value !== OptionType.stringSeqBothChoice
      && _.value !== OptionType.stringSeqBothChoiceUnique
      );
      const isNoStringChoice = ConfigurationOptionMaintFunctions.getStringChoices(optionName).length === 0
      || (ConfigurationOptionMaintFunctions.getStringChoices(optionName).length === 1
        && ConfigurationOptionMaintFunctions.getStringChoices(optionName)[0].text === '');
      if (isNoStringChoice) {
        this.typeChoicesFiltered = this.typeChoicesFiltered.filter(_ => _.value !== OptionType.stringValueChoice);
        this.stringChoices = [];
        this.isStringChoice = false;
      } else {
        this.choosenType = OptionType.stringValueChoice;
        this.isStringChoice = true;
        this.stringChoices = ConfigurationOptionMaintFunctions.getStringChoices(optionName);
      }
      const isNoIntChoice = ConfigurationOptionMaintFunctions.getIntChoices(optionName, this.auth).length === 0
      || (ConfigurationOptionMaintFunctions.getIntChoices(optionName, this.auth).length === 1
        && ConfigurationOptionMaintFunctions.getIntChoices(optionName, this.auth)[0].value === 0);
      if (isNoIntChoice) {
        this.typeChoicesFiltered = this.typeChoicesFiltered.filter(_ => _.value !== OptionType.intValueChoice);
        this.intChoices = [];
        this.isIntChoice = false;
      } else {
        this.choosenType = OptionType.intValueChoice;
        this.isIntChoice = true;
        this.intChoices = ConfigurationOptionMaintFunctions.getIntChoices(optionName, this.auth);
      }
      // style choice with style 0 as only style is a possible choice
      const styleChoice = ConfigurationOptionMaintFunctions.getIntChoicesOfStyles(optionName, this.shownOptions,
        this.txt['style'] ? this.txt['style'] : '');
      const isNoStyleChoice = (styleChoice.length === 0 || styleChoice.length === 1 && styleChoice[0].text === '');
      if (isNoStyleChoice) {
        this.typeChoicesFiltered = this.typeChoicesFiltered.filter(_ => _.value !== OptionType.styleChoice);
        this.styleChoices = [];
        this.isStyleChoice = false;
      } else {
        this.choosenType = OptionType.styleChoice;
        this.isStyleChoice = true;
        this.styleChoices = styleChoice;
      }
      if (!this.choosenType || this.choosenType === OptionType.undefined) {
        this.choosenType = ConfigurationOptionMaintFunctions.getOptionType(optionName);
      }
      if (this.choosenType && this.choosenType > OptionType.undefined) {
        this.typeChoicesFiltered = [];
        if (this.choosenType === OptionType.boolean) {
          this.isBooleanChoice = true;
        } else {
          this.isBooleanChoice = false;
        }
      }
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
        this.errors[message.forControl]  = message.text;
      }
    }
  }

}



