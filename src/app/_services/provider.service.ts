import { from } from 'rxjs';
import { Injectable } from '@angular/core';

import { Provider } from '../_db/provider';
import { ProviderFactory } from '../_db/provider-factory';

import { ProviderType } from '../_enums/provider-type.enum';

import { IAuthorization } from '../_interfaces/i-authorization';
import { IUser } from '../_interfaces/i-user';

import { LogService } from './log.service';
import { FetchApiService } from './fetch-api.service';
import { AuthenticationService } from './authentication.service';
import { MessageService } from './message.service';

import { environment } from '../../environments/environment';
import { GlobalFunctions } from '../_globals/global-functions';


/**
 * provider service
 * fetches (web server, jira, trello,...)  providers via rest API
 *
 */

@Injectable({
  providedIn: 'root'
})
export class ProviderService {

  public name = 'ProviderService';

  private providersConfig = environment.providers;

  constructor(
    private logger: LogService,
    private fetch: FetchApiService,
    private auth: AuthenticationService,
    private message: MessageService) {
   }

  /***********************************  private methods **************************************/

  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * loadProviders()
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param comp name of calling component
   */
   public loadProviders(userId: number, comp: string) {
    let providers: Array<Provider> = [];
    // there must be max 1 server provider
    const serverProviderCount = this.providersConfig.reduce((count, _) => {
      if ( _.type === ProviderType.server) {
        count++;
        }
      return count;
    }, 0);
    const session = this.auth.getSession(comp);
    // it exists only 1 provider with type 1 - local issue  provider - and this has id 1
    const clientProvider = ProviderFactory.empty();
    clientProvider.isProviderAvailable = true;
    clientProvider.providerId = 1;
    clientProvider.providerName = this.auth.txt['client_issues'];
    clientProvider.providerUrl = 'Local Storage';
    clientProvider.type = 1;
    // status is 0 per default

    clientProvider.createdBy = session?.userName ?? '';
    clientProvider.releaseCreated = GlobalFunctions.release ;
    providers.push(clientProvider);

    // we build server provider with type 2 anyway - with default data or data from
    // first config entry, if this has correct type ..1
    let isConfigServerProvider = false;
    if (this.providersConfig?.length > 0 && this.providersConfig[0].type === 2) {
      isConfigServerProvider = true;
    }
    const serverProvider = ProviderFactory.empty();
    serverProvider.isProviderAvailable = true;
    serverProvider.providerId = 2;
    serverProvider.providerName = isConfigServerProvider && this.providersConfig[0].providerName !== undefined && this.providersConfig[0].providerName !== '' ?  this.providersConfig[0].providerName : this.auth.txt['server_issues'] ;
    serverProvider.providerUrl = isConfigServerProvider && this.providersConfig[0].providerUrl !== undefined && this.providersConfig[0].providerUrl !== '' ?  this.providersConfig[0].providerUrl : '/data';
    serverProvider.providerDocumentsUrl = '';
    serverProvider.maxProviderRetries = isConfigServerProvider && this.providersConfig[0].maxProviderRetries !== undefined ?  this.providersConfig[0].maxProviderRetries : 3;
    serverProvider.type = 2;
    serverProvider.createdBy = session?.userName ?? '';
    serverProvider.releaseCreated = GlobalFunctions.release ;
    providers.push(serverProvider);

    let lastProviderId = 2;

    // get other providers from configuration - the first could be already used ...
    const startConfig = isConfigServerProvider ? 1 : 0;
    for (let i = startConfig; i < this.providersConfig.length; i++) {
      let provider = ProviderFactory.empty();
      provider.isProviderAvailable = this.providersConfig[i].isProviderAvailable;
      provider.providerName = this.providersConfig[i].providerName ?? '';
      provider.providerUrl = this.providersConfig[i].providerUrl;
      provider.providerDocumentsUrl = this.providersConfig[i].providerDocumentsUrl ?? '';
      provider.maxProviderRetries = this.providersConfig[i].maxProviderRetries;
      provider.type = this.providersConfig[i].type;
      if (provider.type > ProviderType.client) {
        lastProviderId++;
        provider.providerId = lastProviderId;
        // setting provider unavailable must be done by isProviderAvailable false)
        providers.push(provider);
      }
    }
    const userData = this.auth.getUserData(userId, 'providers', comp);
    userData.providers = providers;
    this.auth.setUserData(userId, 'providers', userData, comp);
  }


  /**
   * getProviders()
   *  get providers (from local storage)
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param comp name of calling component
   * @returns providers which are stored in local storage for the session user
   */
   public getProviders(userId: number, comp: string): Array<Provider> {
    let providers: Array<Provider> = [];
    // first we get all elements as userProviders
    const userData = this.auth.getUserData(userId, 'providers', comp);;
    if (userData && userData.providers) {
      return userData.providers;
    } else {
      return providers;
    }
  }


  /**
   * getProvider()
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param providerId id of issue provider
   * @param comp name of calling component
   * @returns issueProvider, if provider with this id is stored in session storage, else returns null
   */
   public getProvider(userId: number, providerId: number, comp: string): Provider | null {
    const providers = this.getProviders(userId, comp);
    if (providers) {
      const provider = providers.find(_ => _.providerId === providerId);
      if (provider) {
        return provider;
      }
    }
    return null;
  }



  /**
   * addAuthorization()
   * @param authorizations array of existing authorizations
   * @param provider provider for which an authorization is added
   * @returns extended authorizations
   */
   public addAuthorization(authorizations: Array<IAuthorization>,  provider: Provider): Array<IAuthorization>  {
    const authorization: IAuthorization = {
      providerId: provider.providerId,
      providerDataUrl: provider.providerUrl,
      providerDocumentsUrl: provider.providerDocumentsUrl,
      providerType: provider.type,
      login: '',
      authorization: '',
      loginToken: '',
      lastLoginSuccessful: null,
      lastLoginRejected: null,
      lastConnectSuccessful: null
    };
    const ix = authorizations.findIndex(_ => _.providerId === provider.providerId);
    if (ix >= 0) {
      authorizations[ix].authorization = authorization.authorization;
    } else {
      authorizations.push(authorization);
    }
    return authorizations;
  }


  public async checkLogin(providerId: number, comp: string ): Promise<boolean> {
    const provider = this.getProvider(0, providerId, comp);
    let session = this.auth.getSession(comp);
    let user = this.auth.getUser(session?.userId ?? 0, comp);
    let authIndex: number;
    if (session && session?.authorizations) {
      authIndex = session.authorizations.findIndex(_ => _.providerId === provider?.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        switch (true) {
          case provider && provider.type === ProviderType.client:
            return true;
          case provider && provider.type === ProviderType.server:
            const serverOk = await this.fetchServerCheck(provider, session.authorizations[authIndex], comp);
            if (serverOk) {

              return true;
            } else {
              session.authorizations[authIndex].lastLoginRejected = new Date();
              this.auth.setSessionAuthorizations(session.authorizations, comp);
              alert (this.auth.txt['login_rejected']);
              return false;
            }
            break;
          case provider && provider.type === ProviderType.jira:
            return false;
          case provider && provider.type === ProviderType.trello:
            return false;
          case provider && provider.type === ProviderType.immich:
            // immich login check
            const isImmichOk = await this.fetchImmichCheck(provider, session.authorizations[authIndex], comp);
            if (isImmichOk) {
              return true;
            } else {
              session.authorizations[authIndex].lastLoginRejected = new Date();
              this.auth.setSessionAuthorizations(session.authorizations, comp);
              alert (this.auth.txt['login_rejected']);
              return false;
            }
          default:
            break;
        }
      }
    }
    return false;

  }



  /* *****************************************  local file functions start here **************** */


  /***********************************  private methods **************************************/


  /* *****************************************  http functions start here **************** */


  /***********************************  private http fetch  methods **************************************/


   /**
   * fetchServerCheck()
   *  fetch server
   * @param provider must be a server provider with  URL of webDAV server
   * @param authorization webDAV authentication string (base64 encoded)
   * @param comp name of calling component
   * @returns server ok as true
   */
   private async fetchServerCheck(provider: Provider, authorization: IAuthorization,  comp: string): Promise<boolean> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch server';
    let url = '';
    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.server
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return false;
    }

    url = url + '/logs';

    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      this.message.info(this.name + `: ${op} from: ${url} - auth is empty`);
      return false;
    }

    const headers = new Headers({
      'Authorization': auth,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    });
    const mode: RequestMode = 'same-origin';

    const serverOk: boolean = await this.fetch.getOk(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
      return false;
    });

    return serverOk;

  }


  /**
   * fetchImmichCheck()
   *  check immich  rest API
   * @param provider must be an immich provider with  URL
   * @param authorization authorization with jira authentication string (base64 encoded)
   * @param comp name of calling component
   * @returns server ok as true
   */
  private async fetchImmichCheck(provider: Provider, authorization: IAuthorization, comp: string): Promise<boolean> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch immich fetchImmicLibrarys';
    let url = '';

    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);

      return false;
    }

    url = url + '/libraries';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return false;
    }
    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const librarys: Array<any> = await this.fetch.get<{elements: Array<any>}>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return false;
    });

    if (librarys && librarys?.length > 0) {
      return true;
    }

    return false;
  }


}
