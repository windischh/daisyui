import { Inject, Injectable, LOCALE_ID } from '@angular/core';

import { GlobalFunctions } from '../_globals/global-functions';
import { CAL_BASE, TXT_BASE } from '../_globals/constants';

import { environment } from '../../environments/environment';

import { Session } from '../_db/session';
import { Text } from '../_db/text';
import { SessionFactory } from '../_db/session-factory';
import { TextFactory } from '../_db/text-factory';
import { TextRaw } from '../_db/text-raw';
import { User } from '../_db/user';
import { UserRaw } from '../_db/user-raw';
import { UserFactory } from '../_db/user-factory';
import { UserData } from '../_db/user-data';
import { UserDataRaw } from '../_db/user-data-raw';
import { UserDataFactory } from '../_db/user-data-factory';
import { EventSelectOption } from './../_db/event-select-option';

import { IAuthorization } from '../_interfaces/i-authorization';
import { IMenuStatus } from '../_interfaces/i-menu-status';
import { IServiceLevel } from './../_interfaces/i-service-level';
import { IUserEventOptions } from '../_interfaces/i-user-event-options';

import { LogService } from './log.service';
import { FetchApiService } from './fetch-api.service';
import { MessageService } from './message.service';


/**
 * authentication service including session service
 * service class to be injected in angular components
 * the service holds system texts as public property
 * in case of application reload session is rebuilt from session storage
 *
 * *******************************************************************
 * session item in session storage and all local storage items
 * are EXCLUSIVELY to be set and get from this authentication service
 * *******************************************************************
 */

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  public name = 'AuthenticationService';

  private releaseUrl = 'assets/releases';
  private txtUrl = 'assets/txt.json';
  private dbtxtUrl = 'assets/dbtxt.json';

  // text from db - filled at session load, used when changing language .... - used also by dbtxt in form components
  public systemTexts: Text[] = [];

  // public text properties
  private txtBase: string[] = TXT_BASE;
  public txt: { [key: string]: string } = {};

  private calBase: string[] = CAL_BASE;
  public cal: { [key: string]: string } = {};

  private production = environment.production;
  private sessionConfiguration = environment.sessionConfiguration;

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private logger: LogService,
    private message: MessageService,
    private fetch: FetchApiService) {
      this.initTexts();
    }

/***********************************  private methods **************************************/

  /**
    * initTexts()
    *  called by constructor
    *  calls initText for each of the system text categories
    */
  private initTexts(): void {
    this.initText(this.txt, this.txtBase);
    this.initText(this.cal, this.calBase);
  }

  /**
  * initText()
  * initText for each of the system text categories
  * (initText and loadText use call by reference - which is standard in javaScript for parameters
  *    which are objects or arrays)
  * @param o text (key/value)
  * @param t array of systemTexts
  */
  private initText(o: { [key: string]: string }, t: string[]): void {
    for (const text of t) {
      o[text] = text;
    }
  }

  /**
   * initSession()
   *  initializes session structure
   * @param userId  userId for which the session is initialized - in most cases will be 0,
   *  then session is initialized anyway for the last active user
   * - if not found, then user structure will be initialized
   * @param comp name of calling component
   */
  private async initSession(userId: number, comp: string) {
    // console.log('session init');
    let session = SessionFactory.empty();
    // we load (system) texts
    await this.getSystemTexts();
    this.loadTexts();
    // user will be the (new) user of the session
    let user: User | null = null;;
    if (userId > 0) {
      user = this.getUser(userId, this.name);
      if (user && user?.status < 9) {
        // ok
      } else {
        userId = 0;
      }
    } else {
      // userId must be >= 0 anyway
      userId = 0;
    }
    if (userId === 0) {
      let users = this.getUsers(this.name).filter(_ => _.status < 9);
      // we check if users are valid - first user must exist and with a valid id
      if (users && users.length > 0 && users[0].userId >= 1 ) {
         // we take the last used from the active users ....
        users = users.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      } else {
        // there is no active user
        this.initUsers(comp);
        // after initUsers only 1 user with userId 1 exists
        users = this.getUsers(this.name);
      }
      userId = users[0].userId;
    }
    user = this.getUser(userId, this.name);
    let initServiceLevel: IServiceLevel = { contact: 0, issue: 0, event: 0};
    // config for contact service level
    initServiceLevel.contact = this.sessionConfiguration.contactServiceLevel;
    // session.app = null;
    let lastSessionId = Number(localStorage.getItem('LAST_SESSION_ID'));
    if (lastSessionId > 0) {
      lastSessionId++;
    } else {
      lastSessionId = 1;
    }
    session.sessionId = lastSessionId;
    localStorage.setItem('LAST_SESSION_ID', lastSessionId.toString());
    session.userId = userId;
    session.userToken = user?.userToken ?? 0;
    session.userName = user?.userName ?? '';
    session.createdBy = user?.userName ?? '';
    session.releaseCreated = GlobalFunctions.release ;
    session.eventSelectOption = null;
    // all authorizations which are persisted at user are taken into session
    session.authorizations  = user?.authorizations ?? [];
    // language depends on LOCALE
    session.language = GlobalFunctions.getDefaultLanguage(this.locale);
    // initialize all session variables
    session.contactNr = 0;
    session.calendarDay = user?.calendarDay ?? GlobalFunctions.getStartOfDay(new Date()) ?? new Date();
    session.serviceLevel = initServiceLevel;
    // config for session duration
    session.duration = this.sessionConfiguration.sessionDuration;
    session.lastTxClient = new Date();
    const sidebarMenuStatus: IMenuStatus = {isSidebarMenuLoaded: false, isIssueMenusLoaded: false};
    this.setSession(session, comp);
    if (!this.production) {
      sessionStorage.setItem('MessageLevel', 'TEST');
    }
    // we load texts again (with session language)
    this.loadTexts();
  }

  /**
   * initUsers()
   *  initializes complete user structure in local storage
   */
  private initUsers( comp: string) {
    const users: Array<User> = [];
    const user1 = UserFactory.empty();
    // initialize user event options from this.option assuming an empty session
    user1.userId = 1;
    user1.releaseCreated = GlobalFunctions.release ;
    user1.userToken  = (new Date()).getTime();
    // we can not set userEventOptions here - we have no options from Configuration service ...
    // user1.userEventOptions = ConfigurationOptionHandlingFunctions.initializeUserEventOptions(options);
    users.push(user1);
    this.setUsers(users, comp);
  }

  /**
   * checkUser()
   *  checks if userId is valid and has the given user token
   *  (after user init there could be session users which are not longer valid .... )
   * @param userId id of user
   * @param userToken userToken which user should have
   * @param comp name of calling component
   * @returns true if userId is an active user in users
   */
   private checkUser(userId: number, userToken: number, comp: string): boolean {
    const user = this.getUser(userId, comp);
    if (user && user.status < 9 && user.userToken === userToken) {
      return true;
    } else {
      return false;
    }
  }



  /**
   * getSystemTexts()
   *  fetches system texts from text database (in the moment txt and dbtxt json files)
   */
  private async getSystemTexts() {
    this.systemTexts = [];
    const txt = await this.fetchTexts(this.txtUrl, this.name);
    if (txt) this.systemTexts = this.systemTexts.concat(txt);
    const dbtxt = await this.fetchTexts(this.dbtxtUrl, this.name);
    if (dbtxt) this.systemTexts  = this.systemTexts.concat(dbtxt);
  }


  /**
  * loadTexts()
  *  called by session activation process
  *  calls load Text for each (txt, cal) of the system text categories
  */
  private loadTexts(): void {
    this.loadText(this.txt, 'txt');
    this.loadText(this.cal, 'cal');
  }

 /**
  * loadText()
  *  from database
  *  checks if this.systemTexts is available and builds text elements from it
  * @param o text (key/value)
  * @param cat textCategory to be built
  */
  private loadText(o: { [key: string]: string }, cat: string): void {
    if (this.systemTexts?.length > 0) {
      const session = this.getSession(this.name);
      // default language according to application internal language coding (language enum)
      const language = session ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
      for (const t of this.systemTexts.filter(text => {
        return (text.textCategory.includes(cat)
          && text.language === language
          && text.type === 1);
      })) {
        o[t.textName] = t.text;
      }
    }
  }



/** ------------------------  public methods --------------------------------------------------- */
/** ---------------  session storage getters and setters --------------------------------------------------- */

 /**
   * checkRelease()
   *  checks release (there must be a ###.json in releases if release is ###)
   *  thus we check delivery and availability of actualized browser cach
   *  (user has to refresh browser cache at release delivery to assure actual status of /assets)
   */
 public async checkRelease(comp: string) {
  const url = this.releaseUrl + '/' + GlobalFunctions.release.toString() + '.json';
  const releaseDate = await this.fetchRelease(url, this.name);
  if (releaseDate && releaseDate.getTime() > 0) {
    return true;
  } else {
    return false;
  }

}

  /**
   * getSession()
   *  get session from session storage
   * @param comp name of component
   * @returns session if session exists in session storage and has a valid user, otherwise null
   */
  public getSession(comp: string): Session | null{
    let session: Session | null = null;
    let sessionString = sessionStorage.getItem('session');
    if (sessionString && sessionString !== '') {
      const sessionRaw = JSON.parse(sessionString);
      session = SessionFactory.fromObject(sessionRaw);
    }
    if (session && session.userId > 0) {
      if (this.checkUser(session.userId, session.userToken, comp) ) {
        // due to security reason we do not take mandantId from session storage ...
        return session;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

/**
 * setSession()
 *  store session in session storage
 *  ATTN: though setSession is public, it is intended to be used by this service
 *   and by other services, NOT by all other components ....
 * @param session session data
 * @param comp name of component
 */
  public setSession(session: Session, comp: string) {
    if (session !== undefined && session !== null && typeof session === 'object' && session instanceof Session ) {
      // we set releaseUpdated - because releaseUpdated is used by all other services ...
      session.releaseUpdated = GlobalFunctions.release ;
      session.updated = new Date();
      sessionStorage.setItem('session', JSON.stringify(session));
    }
  }



/** ---------------  local storage getters and setters --------------------------------------------------- */

  /**
   * getUsers()
   *  get users from local storage
   * @param comp name of calling component
   * @returns users from local storage
   */
  public getUsers(comp: string): Array<User> {
    let users: Array<User> = [];
    let usersString = localStorage.getItem('users');
    if (usersString && usersString !== '') {
      const rawUsers: Array<UserRaw> = JSON.parse(usersString);
      users = rawUsers.map(_ => UserFactory.fromObject(_))
    }
    return users;
  }

  /**
   * setUsers()
   *  set users  in local storage
   * @param users data of users
   * @param comp name of calling component
   * @returns true if user is updated in local storage
   */
   public setUsers(users: Array<User>, comp: string) {
    if (users !== undefined && users !== null && Array.isArray(users)) {
      let isArrayOfUser = true;
      for (const user of users) {
        if (typeof user === 'object' && user instanceof User) {
          // array of users - ok
        } else {
          isArrayOfUser = false;
        }
      }
      if (isArrayOfUser) {
        localStorage.setItem('users', JSON.stringify(users));
      }
    }
  }



  /**
   * getUserData()
   *  get user data from local storage
   * @param userId id of user - if userId is 0, then we get data from session user
   * @param item name of local storage item
   * @param comp name of calling component
   * @returns userData element which is stored in local storage for the session user with item name (at least a empty user data element)
   */
  public getUserData(userId: number, item: string, comp: string): UserData {
    // first we get all elements as userData
    let userData: Array<UserData> = [];
    const userDataString = localStorage.getItem(item);
    if (userDataString && userDataString !== '') {
      const userDataRaw: Array<UserDataRaw> = JSON.parse(userDataString);
      if (userDataRaw?.length > 0) {
        userData = userDataRaw.map(_ => UserDataFactory.fromObject(_));
      }
    }
    let userDataElement = UserDataFactory.empty();
    let userToken = 0;
    // now we select element for user
    if (userId > 0) {
      const user = this.getUser(userId, comp);
      userToken = user?.userToken ?? 0;
    } else {
      const session = this.getSession(comp);
      if (session)  {
        userId = session.userId;
        userToken = session.userToken;
      }
    }
    if (userId > 0)  {
      userDataElement.userId = userId;
      userDataElement.userToken = userToken;
      if (userData?.length > 0) {
        const ix = userData.findIndex(_ => _.userId === userId && _.userToken === userToken);
        if (ix >= 0) {
          userDataElement = userData[ix];
        }
        const iy = userData.findIndex(_ => _.userId === userId && _.userToken !== userToken);
        if (iy >= 0) {
          // userToken could be different to that of userData. This could happen
          // - if user has been deactivated and a new user with the same id arises
          // - if local storage was manipulated, in case of tests ...
          // in this case we store a new empty userData element with correct token
          // and we log info about wrong user data
          const session = this.getSession(comp);
          const message = `userData for ${item} with wrong userToken exists - will be ignored`
          this.message.info(`${this.name}: `  + this.txt['system_error'] + `: ${message}`);
          this.logger.warn(session, this.name, this.txt['system_error'] + `: ${message}`);
        }
      }
    }
    return userDataElement;
  }

   /**
   * setUserData()
   *  set user data in local storage
   * @param userId id of user - if userId is 0, then we set data  of session user
   * @param item name of local storage item
   * @param userDataElement  element of userdata - we expect it has userId of session
   * @param comp name of calling component
   * @returns true if we have successfully stored userDataElement, false if session user or lastModified does not fit
   */
  public setUserData(userId: number, item: string, userDataElement: UserData, comp: string): boolean {
    let userToken = 0;
    if (userId > 0) {
      const user = this.getUser(userId, comp);
      userToken = user?.userToken ?? 0;
    } else {
      const session = this.getSession(comp);
      if (session)  {
        userId = session.userId;
        userToken = session.userToken;
      }
    }
    if (userId > 0 && userDataElement.userId === userId && userDataElement.userToken === userToken)  {
      let isStored = false;
      //  we get all elements as userData
      let userData: Array<UserData> = [];
      const userDataString = localStorage.getItem(item);
      if (userDataString && userDataString !== '') {
        const userDataRaw: Array<UserDataRaw> = JSON.parse(userDataString);
        if (userDataRaw?.length > 0) {
          userData = userDataRaw.map(_ => UserDataFactory.fromObject(_));
        }
      }
      // now we select element for user
      if (userData?.length > 0) {
        const ix = userData.findIndex(_ => _.userId === userId && _.userToken === userToken);
        if (ix >= 0) {
          // we check if userDataElement is unchanged - it must be based on
          if (userDataElement.lastModified?.getTime() === userData[ix].lastModified?.getTime()) {
            userData[ix] = userDataElement;
            userData[ix].lastModified = new Date();
            isStored = true;
          } else return false;
        }
        // TODO shall we delete wrong user data or leave it for manual repair in case of testing ...
        // in the moment we delete them ...
        const iy = userData.findIndex(_ => _.userId === userId && _.userToken !== userToken);
        if (iy >= 0) {
          userData.splice(iy, 1);
        }
      }
      if (!isStored) {
        userDataElement.lastModified = new Date();
        userData.push(userDataElement);
      }
      localStorage.setItem(item, JSON.stringify(userData));
      return true;
    } else return false;

  }

  /**
   * purgeUsers() is for development scenarios only
   * it deletes all users and their data of local storage
   * @param doIt 0 -checks only development mode, 1 - checks session id, 2 - deletes data
   * @param comp calling component
   * @returns true if we are in development and check js ok
   */
  public purgeUsers(doIt: number, comp: string): boolean {
    const session = this.getSession(comp);
    if (doIt === 0 && !this.production) {
      return true;
    }
    if (doIt === 1 && !this.production && session?.sessionId === Number(localStorage.getItem('LAST_SESSION_ID'))) {
      return true;
    }
    if (doIt === 2 && !this.production) {
      localStorage.removeItem('issues');
      localStorage.removeItem('issueSelections');
      localStorage.removeItem('providers');
      localStorage.removeItem('events');
      localStorage.removeItem('eventSelectOptions');
      localStorage.removeItem('recurringTimeSpans');
      localStorage.removeItem('users');
      this.initSession(0, comp);
      return true;
    }
    return false;
  }




/** ---------------------  other public methods --------------------------------------------------- */


  /**
   * getUser()
   *  get user from local storage
   * @param userId id of user
   * @param comp name of calling component
   * @returns user is found with userId  in users
   */
  public getUser(userId: number, comp: string): User | null {
    const users = this.getUsers(comp);
    const user = users.find(_ => _.userId === userId);
    if (user) {
      return user;
    } else {
      return null;
    }
  }

  /**
   * setUser()
   *  store user in local storage
   * @param userId id of user
   * @param user data of user to be updated
   * @param comp name of calling component
   * @returns true if user is updated in local storage
   */
   public setUser(userId: number, user: User, comp: string): boolean {
    const users = this.getUsers(comp);
    const ix = users.findIndex(_ => _.userId === userId);
    if (ix >= 0 && users[ix]?.userToken === user.userToken) {
      users[ix] = user;
      this.setUsers(users, comp);
      return true;
    } else {
      return false;
    }
  }


  /**
   * activateSession()
   *  activates session in session service (setting time in client timestamp)
   * @param comp name of component
   */
  public async activateSession(comp: string) {
    // with getSession we get session from sessionstorage
    // - only if session of session storage is yet valid, otherwise we get null ...
    const session = this.getSession(comp);
    // session is continued if not older then 30 min
    if (session && GlobalFunctions.getDateInMinutes(new Date()) < GlobalFunctions.getDateInMinutes(session.lastTxClient) + session.duration ) {
      session.lastTxClient = new Date();
      this.setSession(session, comp);
      const user = this.getUser(session.userId, comp);
      if (user) {
        user.lastActivity = session.lastTxClient;
        this.setUser(session.userId, user, comp);
      }
      await this.getSystemTexts();
      this.loadTexts();
    } else {
      // message only at test environment ...
      this.message.info('session not longer valid at: ' + new Date());
      /*
      const isInitialized = await this.newSessionUser(session?.userId, comp);
      if (isInitialized) {
        // console.log('session not valid - initialized with last user found');
      } else {
        // console.log('session not valid - reset');
        await this.initSession(0, comp);
      }
       */
    }
  }

  /**
   * isSessionActive()
   * @returns true if session isa active
   */
  public isSessionActive() {
    // there must be a valid session
    const session = this.getSession(this.name);
    if (session && session.userId > 0 && session.duration >= 0 && session.lastTxClient?.getTime() > 0) {
      if (GlobalFunctions.getYMDHM(new Date()) ?? 0 - (GlobalFunctions.getYMDHM(session.lastTxClient) ?? 0) < session.duration) {
        return true;
      } else return false;
    } else return false;
  }

  /**
   * setSessionContactId()
   *  set contact nr  as session contact nr
   * (contact to this nr must not necessarily exist)
   * @param contactNr contact nr which shall be the selected session contact
   * @param comp name of calling component
   * @returns true if session is actualized
   */
  public setSessionContactId(contactNr: number, comp: string): boolean {
    const session = this.getSession(comp);
    if (session && contactNr >= 0) {
      session.contactNr = contactNr;
      session.lastTx = new Date();
      this.setSession(session, comp);
      return true;
    } else {
      return false;
    }
  }

   /**
   * setSessionIssueNr()
   *  set issue nr  as session issue nr
   * (issue to this nr must not necessarily exist)
   * @param issueNr issue nr which shall be the selected session issue
   * @param comp name of calling component
   * @returns true if session is actualized
   */
  public setSessionIssueNr(issueNr: number, comp: string): boolean {
    const session = this.getSession(comp);
    if (session && issueNr >= 0) {
      session.issueNr = issueNr;
      session.lastTx = new Date();
      this.setSession(session, comp);
      return true;
    } else {
      return false;
    }
  }


  /**
   * setSessionEventSelectOption()
   *  store eventSelectOption in session
   * @param eventSelectOption
   * @param comp name of component
   */
     public setSessionEventSelectOption(eventSelectOption: EventSelectOption, comp: string) {
      // eventSelectOption may be null
      if (eventSelectOption === null || (eventSelectOption !== undefined &&  eventSelectOption !== null && typeof eventSelectOption === 'object' && eventSelectOption instanceof EventSelectOption)) {
        const session = this.getSession(comp);
        if (session) {
          session.eventSelectOption = eventSelectOption;
          session.lastTx = new Date();
          this.setSession(session, comp);
        }
      }
    }


  /**
   * setSessionAuthorizations()
   * @param authorizations
   * @param comp name of calling component
   * @returns true if session is actualized
   */
    public setSessionAuthorizations(authorizations: Array<IAuthorization>, comp: string): boolean {
    const session = this.getSession(comp);
    if (session) {
      session.authorizations = authorizations;
      session.lastTx = new Date();
      this.setSession(session, comp);
      return true;
    } else {
      return false;
    }
  }




  /**
   * rememberAuthorizations()
   * @param providerId
   * @param comp name of calling component
   * @returns true if session is actualized
   */
  public rememberAuthorization(providerId: number, comp: string)  {
    const session = this.getSession(comp);
    const user = this.getUser(session?.userId ?? 0, comp);
    if (session?.authorizations && user?.authorizations) {
      const ix = session.authorizations.findIndex(_ => _.providerId === providerId);
      const iy = user.authorizations.findIndex(_ => _.providerId === providerId);
      if (ix >= 0 && iy >= 0) {
        if (user.authorizations[iy].login !== session.authorizations[ix].login) {
          if (user.userName === '' || user.userName === user.authorizations[iy].login) {
            user.userName = session.authorizations[ix].login;
          }
          user.authorizations[iy].login = session.authorizations[ix].login;
        }
        user.authorizations[iy].authorization = session.authorizations[ix].authorization;
        user.authorizations[iy].lastLoginSuccessful = session.authorizations[ix].lastLoginSuccessful;
        this.setUser(user.userId, user, comp);
      }
    }

  }

  /**
   * rememberLoginAttempt()
   *  remeber login attempt and connect attempt of session in user
   * @param providerId
   * @param comp name of calling component
   * @returns true if user is actualized
   */
   public rememberLoginAttempt(providerId: number, comp: string)  {
    const session = this.getSession(comp);
    const user = this.getUser(session?.userId ?? 0, comp);
    if (session?.authorizations && user?.authorizations) {
      const ix = session.authorizations.findIndex(_ => _.providerId === providerId);
      const iy = user.authorizations.findIndex(_ => _.providerId === providerId);
      if (ix >= 0 && iy >= 0 && user?.authorizations[iy]?.login === session?.authorizations[ix]?.login) {
        user.authorizations[iy].lastLoginRejected = session.authorizations[ix].lastLoginRejected;
        user.authorizations[iy].lastLoginSuccessful = session.authorizations[ix].lastLoginSuccessful;
        user.authorizations[iy].lastConnectSuccessful = session.authorizations[ix].lastConnectSuccessful;
        this.setUser(user.userId, user, comp);
      }
    }

  }



  /**
   * setSessionCalendarDay()
   *  update session calendarDay data
   * @param sessionUpdate session object with updated fiels
   *    ATTN: only calendarDay related data are updated!
   * @param comp name of calling component
   * @returns true if session is actualized
   */
  public setSessionCalendarDay(sessionUpdate: Session, comp: string): boolean {
    const session = this.getSession(comp);
    if (session) {
      session.calendarDay = sessionUpdate.calendarDay;
      session.isPlan = sessionUpdate.isPlan;
      session.isPlanMaint = sessionUpdate.isPlanMaint;
      session.lastTxClient = sessionUpdate.lastTxClient;
      session.lastTx = new Date();
      session.updated = new Date();
      session.updatedBy = session.userName;
      session.version++;
      this.setSession(session, comp);
      return true;
    } else {
      return false;
    }
  }


  /**
   * changeLanguage()
   *  changes language in session
   * @param language language number
   * @param comp name of component
   */
  public async changeLanguage(language: number, comp: string) {
    // activate session to assure that we have a session
    await this.activateSession(comp);
    const session = this.getSession(comp);
    if (session) {
      session.language = language;
      session.updated = new Date();
      session.updatedBy = session.userName;
      session.version++;
      this.setSession(session, comp);
    }
    await this.getSystemTexts();
    this.loadTexts();
  }


  /**
   * newSessionUser()
   *  switches active session to a new user - session is initialized with given userId
   *  (if userId is not valid, no switch is made)
   * @param userId - id of new session user
   * @param comp name of component
   * @returns userId if session is actualized with new user
   */
   public async newSessionUser(userId: number, comp: string): Promise<number> {
    // validity of userId would by  checked by initSession anyway
    // but we check it before to stay at old user if not possible
    if (userId > 0) {
      const user = this.getUser(userId, this.name);
      if (user && user?.status < 9) {
        await this.initSession(userId, comp);
        const session = this.getSession(this.name);
        if (session) {
          session.isPlan = false;
          session.isPlanMaint = true;
          this.setSession(session, comp);
          this.setSessionAuthorizations(user.authorizations, this.name);
        }
        return userId;
      }
    } else if (userId === 0) {
      let session = this.getSession(comp);
      if (!session) {
        await this.initSession(0, comp);
      }
      session = this.getSession(comp);
      return session?.userId ?? 0;
    }
    return 0;
  }

  /**
   * updateSessionUser()
   *  updates data of session user  (userName)
   * @param comp name of component
   * @returns
   */
   public async updateSessionUser(comp: string) {
    // activate session to assure that we have a session
    await this.activateSession(comp);
    const session = this.getSession(comp);
    const user = this.getUser(session?.userId ?? 0, this.name);
    if (session && user && user?.status < 9) {
      // updated by gets userName before change ...
      session.updatedBy = session.userName;
      session.userName = user.userName;
      session.updated = new Date();
      session.version++;
      this.setSession(session, comp);
    }

  }


  /**
   * setUserOptions()
   *  sets user options  of user in local storage
   * @param userEventOptions options as basis for update
   * @param userId id of user in local storage
   * @param comp name of calling component
   * @returns true if local storage
   */
  public setUserOptions(userEventOptions: IUserEventOptions, userId: number, comp: string): boolean  {
    const user = this.getUser(userId, comp);
    if (user) {
      user.userEventOptions = userEventOptions;
      user.updated = new Date();
      const session = this.getSession(comp);
      user.updatedBy = session?.userName ?? '';
      user.version++;
      const ok = this.setUser(userId, user, comp);
      return ok;
    }
    return false;
  }

  /**
   * setUserOption()
   *  sets a certain user option
   * @param userEventOptions options as basis for update
   * @param userId id of user in local storage
   * @param optionName name of option to be updated
   * @param comp name of calling component
   * @returns true if option file is actualized
   */
  public setUserOption(userEventOptions: IUserEventOptions, userId: number, optionName: string, comp: string): boolean  {
    const user = this.getUser(userId, comp);
    if (user && user.userEventOptions) {
      user.userEventOptions[optionName] = userEventOptions[optionName];
      const ok = this.setUser(userId, user, comp);
      return ok;
    }
    return false;
  }


  /* *****************************************  http functions start here **************** */


  /***********************************  private methods **************************************/


  /**
   * fetchRelease()
   *  fetchRelease - http GET or fetch()
   * @param url http url
   * @param comp name of component
   * @returns release date, if relase file for this.release exists, otherwise null
   */
  private async fetchRelease(url: string, comp: string): Promise<Date | null> {
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    const mode: RequestMode = 'no-cors';
    const op = 'fetch release';
    const releaseDate: {created: Date} = await this.fetch.get<{}>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
      return null;
    });
    if (releaseDate) {
      return  typeof(releaseDate.created) === 'string' ?
      new Date(releaseDate.created) : releaseDate.created;
    } else {
      return null;
    }
  }

  /**
   * fetchTexts()
   *  fetchTexts - http GET or fetch()
   * @param url http url
   * @param comp name of component
   */
  private async fetchTexts(url: string, comp: string): Promise<Array<Text> | null> {
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    const mode: RequestMode = 'no-cors';
    const op = 'fetch texts';
    const rawTexts: TextRaw[] = await this.fetch.get<TextRaw[]>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
      return null;
    });
    if (rawTexts) {
      return rawTexts.map(rawText => TextFactory.fromObject(rawText));
    } else {
      return null;
    }
  }

}
