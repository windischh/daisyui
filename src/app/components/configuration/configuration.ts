import { Component, Inject, LOCALE_ID, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ConfigurationOption } from '../../_db/configuration-option';
import { ConfigurationOptionFactory } from '../../_db/configuration-option-factory';
import { ConfigurationStyle } from '../../_enums/configuration-style.enum ';
import { ConfigurationArea } from '../../_enums/configuration-area.enum';
import { GlobalFunctions } from '../../_globals/global-functions';
import { IConfigurationArea } from '../../_interfaces/i-configuration-area';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { ConfigurationFormViewComponent } from '../configuration-form-view/configuration-form-view';
import { ConfigurationSortViewComponent } from '../configuration-sort-view/configuration-sort-view';
import { ConfigurationListViewComponent } from '../configuration-list-view/configuration-list-view';
import { Session } from '../../_db/session';


@Component({
  selector: 'dsy-configuration',
  templateUrl: './configuration.html',
  styleUrl: './configuration.css',
  imports: [ConfigurationFormViewComponent, ConfigurationSortViewComponent, ConfigurationListViewComponent]
})
export class ConfigurationComponent implements OnInit {


  public name = 'ConfigurationComponent';

  // configurationOption for maintenance or show form
  // not needed here ...
  public configurationOption!: ConfigurationOption;
  // component usage can be: 'form', 'list'
  private configurationComponentUsage!: string;
  // isMaint true - configurationOption-list and configurationOption-form should allow data maintenance
  public isMaint: boolean = false;
  // isCreate true - in case of usage 'list'  configurationOption-list should allow to create a new configurationOption
  public isCreate: boolean = false;

  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews!: Session | null;

  // db texts
  public optiontxt: { [key: string]: string } = {};

  // configurationOptions from db
  public configurationOptions: Array<ConfigurationOption> = [];
  public configurationOptionsLoadCounter = 0;

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  areas!: Array<IConfigurationArea>;
  area!: IConfigurationArea;

  configurationStyleEnum: { [key: string]: any } = ConfigurationStyle;
  configurationAreaEnum: { [key: string]: any } = ConfigurationArea;

  isOptionsSort = false;

  // isShowForm is true to show form
  public isShowForm: boolean = false;

  // isShowList is true to show list of configurationOptions or child configurationOptions
  public isShowList: boolean = false;

  // defines action on configurationOption form-view
  public formAction!: string | null;


  constructor(@Inject(LOCALE_ID) public locale: string,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LogService,
    private message: MessageService,
    private configurationService: ConfigurationService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    this.configurationComponentUsage = 'list';
    this.isMaint = true;
    this.isCreate = true;
    // activation is done here - we have a component called by routing ...
    switch (this.configurationComponentUsage) {
      case 'form':
        this.isShowForm = true;
        this.isShowList = false;
        this.formAction = this.isCreate ? 'new' : this.isMaint && this.area ? 'maint' : 'show'
        break;

      case 'list':
        this.isShowForm = false;
        this.isShowList = true;
        this.formAction = null;
        break;

      default:
        break;
    }
    await this.sessionActivate();
  }


  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    if (this.auth.isSessionActive()) {
      this.sessionForViews  = this.auth.getSession(this.name);
      this.refreshSignal.set(0);
      this.loadDbTexts();
      await this.getConfigurationOptions();
      if (this.isShowList) {
        await this.getOptionAreas();
        this.refreshSignal.set(1);
      }
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
    }
  }

  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const configurationOption = ConfigurationOptionFactory.empty();
    this.optiontxt = GlobalFunctions.objText(configurationOption,
      'Option', this.auth.systemTexts, language,  this.name);
  }


  /**
   * getConfigurationOptions()
   *  delivers all active configurationOptions
   */
  private async getConfigurationOptions() {
    let configurationOptions: Array<ConfigurationOption>;
    const session = this.auth.getSession(this.name);
    configurationOptions = await this.configurationService.getConfigurationOptions(this.name);
    // we get no disabled configurationOptions and - in case of work also
    configurationOptions = configurationOptions?.filter(_ => _.status < 9);
    if (configurationOptions?.length > 0) {
      this.configurationOptions = configurationOptions.sort((a, b) =>
      a.optionName !== b.optionName ? a.optionName < b.optionName ? -1 : 1 : 0);
      for (const configurationOption of this.configurationOptions) {
        // TODO prepare configurationOption display values
        // console.log('configurationOption: ', configurationOption);
      }
    } else {
      this.configurationOptions = [];
    }
    this.configurationOptionsLoadCounter++;
  }

  // special areas with style options are defined explicit - in the moment 'invoicePrint', 'workCalendar'
  private async getOptionAreas() {
    const session = this.auth.getSession(this.name);
    let areas = await this.configurationService.getOptionAreas(this.name);
    // we add all areas from enum where no option element has been found
    const missingAreas = Object.keys(ConfigurationArea)
    .filter((k: any) => typeof ConfigurationArea[k] === 'number')
    .filter(_ => areas.filter(area => area.optionArea === _).length === 0 );

    missingAreas.forEach(_ => areas.push({optionArea: _, count: 0}) );

    // we filter areas (only in pwork-invoice according to serviceLevel)
    areas = areas.filter(_ => {
      let isChoosen = true;
      // 1 order
      isChoosen = _.optionArea === ConfigurationArea[1]
      ? false
      : isChoosen;
      // 2 invoice 6 invoicePrint
      isChoosen =  _.optionArea === ConfigurationArea[2] || _.optionArea === ConfigurationArea[6]
      ? false
      : isChoosen;
      // 3 work 9 work export
      isChoosen =  _.optionArea === ConfigurationArea[3] || _.optionArea === ConfigurationArea[9]
      ? true
      : isChoosen;
      // 8 todo not active in the moment
      isChoosen = _.optionArea === ConfigurationArea[8]
      ? false
      : isChoosen;
      // 10 document
      isChoosen =  _.optionArea === ConfigurationArea[10]
      ? true
      : isChoosen;
      return isChoosen;
    });
    for (let i = 0; i < areas.length; i++) {
      let area = areas[i];
      const {...rest} = area;
      // we sort areas by configurationAreaEnum
      let areaNr = Number(this.configurationAreaEnum[area.optionArea]);
      areaNr = areaNr ? areaNr : 0;
      let txt = area.optionArea;
      let areaText = this.auth.txt[txt] ? this.auth.txt[txt] : txt;
      areaText += Object.keys(this.configurationAreaEnum).filter(_ => _ === area.optionArea).length === 0 ? ' ***' : '';
      let isAreaMaint = true;
      isAreaMaint = area.optionArea === ConfigurationArea[1]
      ? false
      : isAreaMaint;
      isAreaMaint = area.optionArea === ConfigurationArea[1] || area.optionArea === ConfigurationArea[2] || area.optionArea === ConfigurationArea[6]
      ? false
      : isAreaMaint;
      isAreaMaint = area.optionArea === ConfigurationArea[9]
      ? true
      : isAreaMaint;
      isAreaMaint = area.optionArea === ConfigurationArea[5] || area.optionArea === ConfigurationArea[7] || area.optionArea === ConfigurationArea[10]
      ? true
      : isAreaMaint;
      // invoicePrint (and maybe other) areas with styles are defined by configurationStyleEnum
      if (Object.keys(this.configurationStyleEnum).filter(_ => _ === area.optionArea).length === 1 ) {
        const stylesCount = await this.configurationService.getStylesCount(area.optionArea, this.name);
        const styles = Object.entries(stylesCount).length;
        area = {
          ...rest, areaNr, areaText, isAreaMaint, styles
        }
      } else {
        area = {
          ...rest, areaNr, areaText, isAreaMaint
        }
      }
      areas[i] = area;
    }
    this.areas = areas.sort((a, b) => (a.areaNr ?? 0) - (b.areaNr ?? 0));
  }




  /** --------------------------  public methods -------------------------------------------- */


  /** ------------------------------ configurationOption-list-view ------------------------- */

  // not used in the moment - lista s leading view is visible when component is active ,,,
  public closeConfigurationList() {
    this.isShowList = false;
  }


 insertArea() {
    this.formAction = 'new';
    this.area = {optionArea:'', count: 0};
    this.isShowForm = true;
    this.isShowList = false;
  }


 showArea(i: number) {
    this.formAction = 'show';
    this.area = this.areas[i];
    this.isShowForm = true;
    this.isShowList = false;
  }

 maintArea(i: number) {
    this.formAction = 'maint';
    this.area = this.areas[i];
    this.isShowForm = true;
    this.isShowList = false;
  }

  // if insert is triggered in (leading) list, here we activate form-view
  public insertConfigurationOption() {
    this.formAction = 'new';
    this.configurationOption = ConfigurationOptionFactory.empty();
    this.isShowForm = true;
    this.isShowList = false;
  }


  // if show is triggered in (leading) list, here we activate form-view
  public showConfigurationOption(i: number) {
    this.formAction = 'show';
    this.configurationOption = this.configurationOptions[i];
    this.isShowForm = true;
    this.isShowList = false;
  }

  // if update is triggered in (leading) list, here we activate form-view
  public maintConfigurationOption(i: number) {
    this.formAction = 'maint';
    this.configurationOption = this.configurationOptions[i];
    this.isShowForm = true;
    this.isShowList = false;
  }


  async changeLanguage(event: number) {
    await this.auth.changeLanguage(event, this.name);
  }

  /** ------------------------------ configurationOption-form-view ------------------------- */

  // configurationOption data were entered in form-view, we proceed the updates here
  public async configurationOptionUpdate(configurationOption: ConfigurationOption) {
    if (configurationOption && configurationOption.optionName !== '') {
      const updatedId = await this.configurationService.setConfigurationOption(configurationOption, this.name);
      if (updatedId > 0) {
        // with getConfigurationOption we get updated configurationOption ...
        // not needed with this kind of -form-view
        // this.configurationOption = await this.configurationService.getConfigurationOption(updatedId, this.name);
      }
    }
    // here we must reload configurationOptions for form-view
    await this.getConfigurationOptions();
  }


  // configurationOption was created in form-view, we proceed the updates here
  public async configurationOptionCreate(configurationOption: ConfigurationOption) {
    let isCreated = false;
    let optionId: number;
    if (configurationOption && configurationOption.optionName !== '') {
      const session = this.auth.getSession(this.name);
      configurationOption.optionId = 0;
      optionId = await this.configurationService.setConfigurationOption(configurationOption, this.name);
      /* we do not neew this with this kind of -form-view
      if (optionId > 0) {
        // we set this.configurationOption to the created (or cloned) configurationOption
        this.configurationOption = await this.configurationService.getConfigurationOption(optionId, this.name);
        if (this.configurationOption) {
          isCreated = true;
          this.formAction = 'maint';
        }
      }
      if (!isCreated) {
        // should not happen
        this.configurationOption = ConfigurationOptionFactory.empty();
        const op = 'configurationOption create';
        const message = 'configurationOption: ' + configurationOption.optionName + ' not created';
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} failed: ${message}`);
        this.message.show(this.name + `: ${op} failed: ${message}`);
        await this.closeConfigurationForm();
      }
      */
    }
    // here we must reload configurationOptions for form-view
    await this.getConfigurationOptions();
  }


  public async disableConfigurationOption(configurationOption: ConfigurationOption) {
    if (configurationOption && configurationOption?.optionId > 0) {
      // check deleteable
      // const isDeleteable = this.configurationOptionService.isConfigurationOptionDeleteable(configurationOptionId, this.name);
      const isDeleteable = true;
      if (isDeleteable) {
        // we get confirm in form-view
        // if (confirm(this.auth.txt['configurationOption_disable'] + '?')) {
          const isDisabled = await this.configurationService.setConfigurationOptionDisabled(configurationOption.optionId, this.name);
          if (isDisabled) {
            await this.getConfigurationOptions();
          }
        // }
      } else {
        alert(this.auth.txt['disable_not_possible']);
      }
    }
  }


  public async closeConfigurationForm() {
    if (this.configurationComponentUsage === 'form') {
      // nothing - in the moment  this component is selected only by routing, there is no close action ....
    } else {
      this.isShowForm = false;
      await this.getConfigurationOptions();
      this.isShowList = true;
      this.formAction = null;
    }
  }

  setOptionsSort(event: boolean) {
    this.isOptionsSort = event;
  }

  // set fixed options from assets at server
  // triggered when sort is demanded on fixed options
  // sort must be re triggered by user
  async setOptions() {
    const areaOptions = this.configurationOptions.filter(_ => _.optionArea === this.area.optionArea)
    .sort((a, b) => a.optionNr - b.optionNr);
    let isCreated = false;
    for (const option of areaOptions) {
      if (option.optionId === 0) {
        const optionId = await this.configurationService.setConfigurationOption(option, this.name);
        if (optionId > 0) {
          isCreated = true;
        } else {
          isCreated = false;
          alert(this.auth.txt['option_update_failure']);
          break;
        }
      }
    }
    if (isCreated) {
      await this.getConfigurationOptions();
      alert(this.auth.txt['options_are_stored_sort_again']);
    }
    this.isOptionsSort = false;
  }

  // we sort in service  which sets configuration option to new nr and resorts all options with optionIdSorted
  async sortOptions(event: {optionIdBefore: Array<number>,  optionIdSorted: Array<number>}) {
    const {optionIdBefore, optionIdSorted} = event;
    // ... we have no deletes in sort-view, so we would not really use optionIdBefore
    const isUpdateOk = await this.configurationService.setConfigurationOptionsSorted(optionIdSorted, this.name);
    if (isUpdateOk) {
      await this.getConfigurationOptions();
    }
    this.isOptionsSort = false;
  }

}


