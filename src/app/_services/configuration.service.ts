import { Injectable } from '@angular/core';

import { ConfigurationOption } from '../_db/configuration-option';
import { ConfigurationOptionFactory } from '../_db/configuration-option-factory';
import { ConfigurationOptionRaw } from '../_db/configuration-option-raw';

import { IAuthorization } from '../_interfaces/i-authorization';
import { IConfigurationArea } from '../_interfaces/i-configuration-area';

import { LogService } from './log.service';
import { FetchApiService } from './fetch-api.service';
import { AuthenticationService } from './authentication.service';
import { MessageService } from './message.service';


@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  public name = 'ConfigurationService';

  // url for fixed configurationOptions at application delivery
  private configurationOptionUrl = 'assets/option.json';


  constructor(
    private logger: LogService,
    private fetch: FetchApiService,
    private message: MessageService,
    private auth: AuthenticationService) { }


  /***********************************  private methods **************************************/

  /**
   * getFixedConfigurationOptions()
   *  get fix configurationOptions from assets
   * @param comp name of calling component
   * @returns array of configurationOptions, empty array if no fixed configurationOption exists
   */
  private async getFixedConfigurationOptions(comp: string): Promise<Array<ConfigurationOption>> {
    let fixedConfigurationOptions: Array<ConfigurationOption> = [];
    const configurationOptionsFetched = await this.fetchConfigurationOptions(this.configurationOptionUrl, this.name);
    if(configurationOptionsFetched && configurationOptionsFetched?.length > 0) {
      fixedConfigurationOptions = configurationOptionsFetched;
      fixedConfigurationOptions.forEach(_ => {
        _.optionId = 0;
        _.status = 0;
      });
    }
    return fixedConfigurationOptions;
  }

  /**
   * getLocalConfigurationOptions()
   *  get configurationOptions (from local storage)
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param comp name of calling component
   * @returns configurationOptions which are stored in local storage for the session user
   */
    private getLocalConfigurationOptions(userId: number, comp: string): Array<ConfigurationOption> {
    let configurationOptions: Array<ConfigurationOption> = [];
    const session = this.auth.getSession(comp);
    const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
    // we get all elements
    const userData = this.auth.getUserData(localUserId, 'configurationOptions', comp);;
    if (userData && userData.configurationOptions) {
      return userData.configurationOptions;
    } else {
      return configurationOptions;
    }
  }

  /**
   * setLocalConfigurationOptions()
   *  st configurationOptions (in  local storage)
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param configurationOptions to be set
   * @param comp name of calling component
   * @returns configurationOptions which are stored in local storage for the session user
   */
    private setLocalConfigurationOptions(userId: number, configurationOptions: Array<ConfigurationOption>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
    // we get all elements
    const userData = this.auth.getUserData(localUserId, 'configurationOptions', comp);
    // configuration options are set - even if there were no entries before ...
    userData.configurationOptions = configurationOptions;
    return this.auth.setUserData(localUserId, 'configurationOptions', userData, comp);
  }

  


  /**
   * setConfigurationOptionContent - sets view-relevant fields in model option element (to update model and afterwards update DB)
   * @param view option element in view
   * @param model option element in model
   */
  private setConfigurationOptionContent(view: ConfigurationOption, model: ConfigurationOption): ConfigurationOption {
    model.optionName = view.optionName;
    model.optionNr = Number(view.optionNr);
    model.optionArea = view.optionArea;
    model.optionBooleanValue = Number(view.optionBooleanValue);
    model.optionDateValue = view.optionDateValue;
    model.optionIntValue = Number(view.optionIntValue);
    model.optionNumericValue = Number(view.optionNumericValue);
    model.optionStringValue = view.optionStringValue;
    model.optionDescription = view.optionDescription;
    model.type = Number(view.type);
    model.status = Number(view.status);
    return model;
  }



  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * getConfigurationOptions()
   *  get ConfigurationOptions (from assets and server)
   *  ConfigurationOptions are taken by id, server is first, (local second), assets third choice
   * @param comp name of calling component
   * @returns ConfigurationOptions (unsorted) which are stored in local storage
  */
  public async getConfigurationOptions(comp: string): Promise<Array<ConfigurationOption>> {
    let allConfigurationOptions: Array<ConfigurationOption> = [];
    const session = this.auth.getSession(comp);
    // configuration optins from local store
    if (session && session.userId) {
      allConfigurationOptions = this.getLocalConfigurationOptions(session.userId, comp);
    }
    const fixedConfigurationOptions = await this.getFixedConfigurationOptions(comp);
    for (const configurationOption of fixedConfigurationOptions) {
      const ix = allConfigurationOptions?.findIndex(_ => _.optionName === configurationOption.optionName && _.status < 9);
      if (ix >= 0) {
        // ConfigurationOption with nr alredy in allConfigurationOptions  - this ConfigurationOption is preferred
      } else {
        allConfigurationOptions.push(configurationOption);
      }
    }
    return allConfigurationOptions;
  }


  /**
   * search ConfigurationOptions()
   * @param searchTerm string with nr and/or name of configurationOption
   * @param comp name of calling component
   * @returns configurationOptions with searched nr or name
   */
  public async searchConfigurationOptions(searchTerm: string, comp: string): Promise<Array<ConfigurationOption>> {
    const configurationOptions = await this.getConfigurationOptions(comp);
    return configurationOptions.filter(_ =>  _.optionName?.startsWith(searchTerm));
  }



  /**
   * get configurationOption()
   *  ATTN: we find only server configurationOptions with id
   *  user getConfigurationOptionNr instead
   * @param optionId id of configurationOption
   * @param comp name of calling component
   * @returns configurationOption, if configurationOption with this id is stored at server, else returns null
   */
  public async getConfigurationOption(optionId: number, comp: string): Promise<ConfigurationOption | null> {
    const configurationOptions = await this.getConfigurationOptions(comp);
    if (configurationOptions && optionId > 0) {
      const configurationOption = configurationOptions.find(_ => _.optionId === optionId);
      if (configurationOption) {
        return configurationOption;
      }
    }
    return null;
  }

  /**
   * getConfigurationOptionName
   *  delivers configurationOptions with optionName
   *
   * @param optionName identifier
   * @param comp name of component for logging
   * @returns configurationOptions array
   */
  public async getConfigurationOptionName(optionName: string, comp: string): Promise<Array<ConfigurationOption>>  {
    let filteredConfigurationOptions: Array<ConfigurationOption> = [];
    const configurationOptions = await this.getConfigurationOptions(comp);
    if (configurationOptions?.length > 0) {
      filteredConfigurationOptions = configurationOptions.filter(_ => _.optionName === optionName);
    }
    return filteredConfigurationOptions;
  }


  /**
   * check configurationOption -  same  GET as getConfigurationOption, delivers true, if a configurationOption with
   *  required identifiers already exists as configuration option, either as fixed or at server
   * @param optionName identifier
   * @param comp name of component for logging
   * @returns true if id exsists and is not disabled
   */
  public async checkConfigurationOptionName(optionName: string, comp: string): Promise<Boolean> {
    const configurationOptions = await this.getConfigurationOptions(comp);
    if (configurationOptions?.length > 0) {
      const filteredConfigurationOptions = configurationOptions.filter(_ => _.optionName === optionName && _.status < 9);
      if (filteredConfigurationOptions?.length > 0) {
        return true;
      }
    }
   return false;
  }

  //  List of optionAreas in all options and count of them

  public async getOptionAreas(comp: string): Promise<Array<IConfigurationArea>> {
    const configurationOptions = await this.getConfigurationOptions(comp);
    if (configurationOptions?.length > 0) {
      const areas = configurationOptions
      .sort((a, b) => a.optionArea !== b.optionArea ? a.optionArea < b.optionArea ? -1 : 1 : 0)
      .reduce((acc: { [key: string]: number }, option) => {
        const area = option.optionArea;
        const areaCount = acc[area] ? acc[area] + 1 : 1;
        return {
          ...acc,
          [area]: areaCount
        };
      }, {});
      return Object.entries(areas).map(([key, value]) => ({ 'optionArea': key, 'count': value  }));
    } else {
      return [];
    }
  }

  //  List of options of a single area, order by optionNr

  public async getOptionsOfArea(area: string, comp: string): Promise<Array<ConfigurationOption>> {
    const configurationOptions = await this.getConfigurationOptions(comp);
    if (configurationOptions?.length > 0) {
      return configurationOptions.filter(_ => _.optionArea === area)
      .sort((a, b) => a.optionNr - b.optionNr);
    } else {
      return [];
    }
  }



  /**
   * getStylesCount()
   * Count of style options belonging to style in a certain 'optionNameKey'
   *  position of style in optionNameKey depends on length of optionArea string
   * @param optionArea the component uses optionArea as parameter and
   * @param comp name of calling component
   * @returns array with styles, count is number of options for the style
   */
  public async getStylesCount(optionArea: string, comp: string): Promise<Array<{'style': string, 'count': number}>> {
    let configurationOptions = await this.getConfigurationOptions(comp);
    configurationOptions = configurationOptions.filter(_ => _.status < 9);
    if (configurationOptions?.length > 0) {
      const styles = configurationOptions.filter(_ => _.optionArea === optionArea)
      .reduce((acc: { [key: string]: number }, option) => {
        const style = option.optionName.substr(optionArea.trim().length + 1, 2);
        const styleCount = acc[style] ? acc[style] + 1 : 1;
        return {
          ...acc,
          [style]: styleCount
        };
      }, {});
      return Object.entries(styles).map(([key, value]) => ({ 'style': key, 'count': value  }));
    } else {
      return [];
    }
  }

  /**
   * setConfigurationOption()
   *  set configurationOption at server by id
   * @param configurationOption new configurationOption content - in case of optionId is missing or === 0, configurationOption is inserted
   * @param comp name of calling component
   * @returns optionId, if configurationOption was updated or created, else 0
   */
  public setConfigurationOption(configurationOption: ConfigurationOption, comp: string): number {
    let isSetOk = false;
    let optionId = 0;
    const session = this.auth.getSession(comp);
    if (session && session.userId) {
      const configurationOptions = this.getLocalConfigurationOptions(session.userId, comp);
      let ix = -1;
      if (configurationOptions?.length > 0) {
        ix = configurationOptions.findIndex(_ => _.optionId === configurationOption.optionId);
      }
      if (configurationOption) {
        if (configurationOption.optionId > 0 && ix >= 0) {
          configurationOptions[ix] = this.setConfigurationOptionContent(configurationOption, configurationOptions[ix]);
          configurationOptions[ix].updated = new Date();
          configurationOptions[ix].updatedBy = session.userName;
          configurationOptions[ix].releaseUpdated = session.releaseUpdated;
          configurationOptions[ix].version++;
          optionId = configurationOptions[ix].optionId;
        } else {
          let lastConfigurationOptionId = configurationOptions.length > 0
          ? configurationOptions.reduce((a,b) => a.optionId > b.optionId ? a : b).optionId
          : 0;
          lastConfigurationOptionId++;
          let newConfig = ConfigurationOptionFactory.empty();
          newConfig = this.setConfigurationOptionContent(configurationOption, newConfig);
          newConfig.optionId = lastConfigurationOptionId;
          newConfig.created = new Date();
          newConfig.createdBy = session.userName;
          newConfig.releaseCreated = session.releaseUpdated;
          newConfig.version = 0;
          optionId = newConfig.optionId;
          configurationOptions.push(newConfig);
        }
        isSetOk = this.setLocalConfigurationOptions(session.userId, configurationOptions, comp);
      }
      if (isSetOk) {
        return optionId;
      }
    }
    return 0;
  }

  /**
   * setConfigurationOptionStatus()
   *  set configurationOption status
   * @param configurationOption  optionId to set
   * @param status   to be set
   * @param comp name of calling component
   * @returns true if set
   */
  public async setConfigurationOptionStatus(optionId: number, status: number, comp: string): Promise<boolean> {
    let configurationOption = await this.getConfigurationOption(optionId, comp);
    if (configurationOption) {
      configurationOption.status = status;
      const isSetOk = this.setConfigurationOption(configurationOption, comp);
      if (isSetOk) {
        return true;
      }
    }
    // configurationOption element is not found or could not be updated
    return false;
  }


  /**
   * setConfigurationOptionDisabled()
   *  set configurationOption disabled
   * @param optionId  optionId to disable
   * @param comp name of calling component
   * @returns true if disabled
   */
  public async setConfigurationOptionDisabled(optionId: number, comp: string): Promise<boolean> {
    let configurationOption = await this.getConfigurationOption(optionId, comp);
    const isDeleteable = true;
    if (configurationOption && isDeleteable) {
      configurationOption.status = 90;
      const isSetOk = this.setConfigurationOption(configurationOption, comp);
      if (isSetOk) {
        return true;
      }
    }
    // configurationOption element is not found or could not be updated
    return false;
  }

  /**
   * setConfigurationOptionSorted()
   *  set option nr from 1 to last for an array of ids, ordered by optionIdSorted
   * @param optionIdSorted  array of optionId to sort
   * @param comp name of calling component
   * @returns true if sorted
   */
  public async setConfigurationOptionsSorted(optionIdSorted: Array<number>, comp: string): Promise<boolean> {
    let isUpdateOk = true;
    let area = '';
    const session = this.auth.getSession(comp);
    if (session && session.userId) {
      const configurationOptions = await this.getConfigurationOptions(comp);
      for (let i = 0; i < optionIdSorted.length; i++) {
        let ix = -1;
        if (configurationOptions?.length > 0) {
          const ix = configurationOptions.findIndex(_ => _.optionId === optionIdSorted[i] && optionIdSorted[i] > 0);
          if (ix >= 0) {
            if (i === 0) {
              // options must be from same area
              area = configurationOptions[ix].optionArea;
            } else if (area !== configurationOptions[ix].optionArea) {
              isUpdateOk = false;
              break;
            }
          } else {
            isUpdateOk = false;
            break;
          }
        }
      }
      if (isUpdateOk) {
        // we iterate again - - returns with false shouöd not occur, we checked it before ...
        for (let i = 0; i < optionIdSorted.length; i++) {
          const ix = configurationOptions.findIndex(_ => _.optionId === optionIdSorted[i] && optionIdSorted[i] > 0);
          if (ix >= 0) {
            configurationOptions[ix].optionNr = i + 1;
            // we must set each configuration to assure to have it at local storage!!
            const newId = this.setConfigurationOption(configurationOptions[ix], comp);
            if (!newId || newId === 0) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    }
    return isUpdateOk;
  }




/* *****************************************  http functions start here **************** */


  /***********************************  private methods **************************************/


  /**
   * fetchConfigurationOptions()
   *  fetch ConfigurationOptions from file (file must be in delivered structure - i.e. in /assets)
   * @param url URL of configurationOption file
   * @param comp name of calling component
   * @returns array of configurationOptions from file, if any - otherwise null
   */
  private async fetchConfigurationOptions(url: string, comp: string): Promise<Array<ConfigurationOption> | null> {
    const op = 'fetch configurationOptions';
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    const mode: RequestMode = 'no-cors';

    const rawConfigurationOptions: ConfigurationOptionRaw[] = await this.fetch.get<ConfigurationOptionRaw[]>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
      return null;
    });
    if (rawConfigurationOptions) {
      return rawConfigurationOptions.map(rawConfigurationOption => ConfigurationOptionFactory.fromObject(rawConfigurationOption));
    } else {
      return null;
    }
  }

  
}
