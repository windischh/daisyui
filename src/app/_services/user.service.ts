

import { Inject, Injectable, LOCALE_ID } from '@angular/core';

import { GlobalFunctions } from '../_globals/global-functions';
import { ConfigurationOptionHandlingFunctions } from '../_globals/configuration-option-handling-functions';

import { User } from '../_db/user';
import { Event } from '../_db/event';
import { EventFactory } from '../_db/event-factory';
import { EventType } from '../_enums/event-type.enum';

import { IAuthorization } from '../_interfaces/i-authorization';

import { LogService } from './log.service';
import { AuthenticationService } from './authentication.service';
import { ProviderService } from './provider.service';
import { ConfigurationService } from './configuration.service';
import { IHoliday } from '../_interfaces/i-holiday';
import { Contact } from '../_db/contact';
import { MAX_MONTHS } from '../_globals/constants';
import { App } from '../_enums/app.enum';
import { UserFactory } from '../_db/user-factory';



/**
 * user service provides users and userData
 */

@Injectable({
  providedIn: 'root'
})
export class UserService {

  public name = 'UserService';

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private logger: LogService,
    private configurationService: ConfigurationService,
    private providerService: ProviderService,
    private auth: AuthenticationService) {
    }

/***********************************  private methods **************************************/

private buildAuthorizations(userId: number): Array<IAuthorization> {
  let authorizations: Array<IAuthorization> = [];
  const providers = this.providerService.getProviders(userId, this.name);
  if (providers?.length > 0) {
    for (const provider of providers) {
      authorizations = this.providerService.addAuthorization(authorizations, provider);
    }
  }
  return authorizations;
}

/**
   * buildRecurringTimeSpans()
   *  load timeSpans from holidays
   *  and build a user element 'recurrringTimeSpans' as user events
   *  (independent of provider - recurringTimeSpans exist only in local storage)
   * @param userId id of user for which we load data (if 0, it is session user ...)
   * @param comp name of calling component
   * @param rangeBegin start of time span range
   * @param rangeEnd end of time span range
   */
  private buildRecurringTimeSpans(userId: number, rangeBegin: Date, rangeEnd: Date, comp: string): void {
    const holidays = GlobalFunctions.buildHolidays(this.locale, rangeBegin, rangeEnd);
    let holidayTimeSpans: Array<Event> = holidays
    .map(_ => {
      const element = EventFactory.empty();
      element.summary = this.auth.cal[_.holidayText];
      element.eventBegin = GlobalFunctions.getStartOfDay(_.holidayDate) ?? new Date();
      element.eventEnd = GlobalFunctions.addDays(element.eventBegin, 1);
      element.type = EventType.timeSpanCategory1;
      return element;
    });


    let lastEventId = 0;
    holidayTimeSpans
    .sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime())
    .forEach(_ => {
      lastEventId++;
      _.eventId = lastEventId;
    });

    // we build timeSpans for birthdays
    const session = this.auth.getSession(comp);
    if (session && session.serviceLevel?.contact > 0) {
      let birthdays: Array<IHoliday> = [];
      let birthdayTimeSpans: Array<Event> = [];
      const userData = this.auth.getUserData(userId, 'contacts', comp);
      const contacts = userData?.contacts?.filter(_ => _.status < 9);
      if (contacts) {
        for (let year = rangeBegin.getFullYear(); year <= rangeEnd.getFullYear(); year++) {
          birthdayTimeSpans = birthdayTimeSpans.concat(contacts
          .filter(_ => _.contactBirthday &&  _.contactBirthday.getFullYear() > 1900)
          .map(_ => {
            const birthdayTimeSpan = EventFactory.empty();
            birthdayTimeSpan.eventBegin = new Date(year, _.contactBirthday?.getMonth() ?? 0, _.contactBirthday?.getUTCDate() ?? 1);
            birthdayTimeSpan.summary = _.contactName;
            birthdayTimeSpan.eventEnd = GlobalFunctions.addDays(birthdayTimeSpan.eventBegin, 1);
            birthdayTimeSpan.type = EventType.timeSpanCategory2;
            // customer info in timeSpan
            birthdayTimeSpan.eventInfo = {
            contactNr: _.contactNr,
            contactDisplayNr: _.displayNr,
            contactDisplayName: _.displayName,
            companyName: _.companyName,
            street: _.contactStreet ?? _.street,
            city: _.contactCity?? _.city,
            plz: _.contactPlz ?? _.plz,
            contactColor: _.contactColor
            };
            return birthdayTimeSpan;
          }));
        }
        birthdayTimeSpans = birthdayTimeSpans.filter(_ => GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(rangeBegin)
        && GlobalFunctions.getDateInMinutes(_.eventBegin) <= GlobalFunctions.getDateInMinutes(rangeEnd));
      }
      // now we concat the 2 timeSpan arrays
      holidayTimeSpans = holidayTimeSpans.concat(birthdayTimeSpans);
    }

    const userData = this.auth.getUserData(userId, 'recurringTimeSpans', comp);
    userData.events = holidayTimeSpans;
    this.auth.setUserData(userId, 'recurringTimeSpans', userData, comp);

   return;

  }



/** ------------------------  public methods --------------------------------------------------- */

  /**
   * buildUserData
   *
   * used in local user creation procedure (user.status < 2) to
   *  build issue providers and other structure data in local storage
   *
   * extend session by authorizations
   */
  public async buildUserData(userId: number, comp: string) {
    const user = this.auth.getUser(userId, comp);
    // userData are bulit and user.status set to 2 ....
    if (user && (user.status === 0 || user.status === 1)) {
      user.status = 1;
      this.auth.setUser(userId, user, comp);
      this.providerService.loadProviders(userId, comp);
      // in this moment user has not correct type - so we will builf timeSpans also for admins .....
      if (user.type !== App.admin) {
        this.loadRecurringTimeSpans(userId, comp);
      }
      user.authorizations = this.buildAuthorizations(userId);
      this.auth.setUser(userId, user, comp);
       // TODO implement later
      // await this.calendarService.loadRecurringTimeSpans(userId, comp);
      user.status = 2;
      this.auth.setUser(user.userId, user, comp);
    }
  }

  /**
   * getUsers()
   *  get users from local storage
   *  get users is provided directly by auth
   * @param comp name of calling component
   * @returns users from local storage
   */
  public getUsers(comp: string): Array<User> {
    return this.auth.getUsers(comp);
  }

  /**
   * getUser()
   *  get user from local storage
   *  get user is provided directly by auth
   * @param userId id of user
   * @param comp name of calling component
   * @returns user is found with userId  in users
   */
  public getUser(userId: number, comp: string): User | null {
    return this.auth.getUser(userId, comp);
  }


  /**
   * setUser()
   *  store user in local storage
   *  set user is provided directly by auth
   * @param userId id of user
   * @param user data of user to be updated
   * @param comp name of calling component
   * @returns true if user is updated in local storage
   */
  public setUser(userId: number, user: User, comp: string): boolean {
    const session = this.auth.getSession(comp);
    user.updated = new Date();
    user.updatedBy = session?.userName ?? '';
    user.releaseUpdated = GlobalFunctions.release ;
    user.version++;
    return this.auth.setUser(userId, user, comp)
  }

  /**
   * createUser()
   *  create user in  local storage
   * @param user user
   * @param comp name of calling component
   * @returns user is found with userId  in users
   */
  public async createUser(user: User, comp: string): Promise<number> {
    const users = this.auth.getUsers(comp);
    if (user) {
      const session = this.auth.getSession(comp);
      let lastUserId = users?.length > 0
      ? users.reduce((a,b) => a.userId > b.userId ? a : b).userId
      : 0;
      lastUserId++;
      user.userId = lastUserId;
      user.releaseCreated = GlobalFunctions.release;
      user.userToken  = (new Date()).getTime();
      user.created = new Date();
      user.createdBy = session?.userName ?? '';
      // we intentionally reset update info
      user.updated = null;
      user.updatedBy = '';
      user.releaseUpdated = 0;
      // there might be no session app at init - user type will be set to 0 - but user type is set anyway later at setUserTyoe
      user.type = session?.app === App.server ? 2 : session?.app === App.local ? 1 : 0;
      user.version = 0;
      if (!user.userEventOptions) {
        // options are read from configuration file ...
        const options = await this.configurationService.getConfigurationOptions(this.name);
        // user event options are initialized with options of actual session user!!
        user.userEventOptions = ConfigurationOptionHandlingFunctions.initializeUserEventOptions(options);
      }
      users.push(user);
      this.auth.setUsers(users, comp);
      return user.userId;
    }
    return 0;
  }

  /**
   * disableUser()
   *  disable user in local storage
   * @param userId id of user
   * @param comp name of calling component
   * @returns user is found with userId  in users
   */
  public disableUser(userId: number, comp: string): boolean {
    if (this.isUserDeleteable(userId, comp)) {
      const user = this.getUser(userId, comp);
      if (user) {
        user.status = 9;
        return this.setUser(userId, user, comp);
      } else {
        return false;
      }
    } else return false;
  }

  /**
   * checkUserName()
   *  checks if userName exists as active user
   * @param userName name to be checked
   * @param comp name of calling component
   * @returns true if userName exists
   */
  public checkUserName(userName: string, comp: string): boolean {
    const users = this.auth.getUsers(comp);
    if (users) {
      const activeUsers = users.filter(_ => _.status < 9);
      if (activeUsers?.length  > 0) {
        const ix = activeUsers.findIndex(_ => _.userName === userName);
        if (ix >= 0) return true;
      }
    }
    return false;
  }

  public isUserDeleteable(userId: number, comp: string): boolean {
    const user = this.auth.getUser(userId, comp);
    if (user) {
      if (user.type === 3) {
        // no delete of local admin user (there is only 1)
        return false;
      }
      const data = this.auth.getUserData(userId, 'event', comp);
      if (data?.events && data?.events?.length > 0) {
        // TODO check if currentEvents are exported ...
        // if (data.events.filter(_ => _.isExported))
      }
      return true;
    } else return false;
  }

  /**
   * setUserType()
   *  sets user.type according to app - if user was just initialized
   *  otherwise find a user with fitting  type or create a new one
   * @param app according to calling parameters (should be called with app that is targetted ..; should not be null)
   * @param comp name of calling component
   */
  public async setUserType(app: App,  comp: string) {
    let session = this.auth.getSession(comp);
    if (session) {
      let user = this.getUser(session.userId, comp);
      let isNewUser = false;
       // app null should not occur - before calling setUserType parameter app ist set to 1,2,3
      const appChoices = Object.keys(App)
      .filter((k: any) => typeof App[k] === 'number' && Number(App[k]) > 0)
      .map((_: any) => Number(App[_]));
      if (user && (user.status === 0 || (!appChoices.includes(user.type)) )) {
        // user was just created as default user or we have incorrect user t
        isNewUser = true;
      } else if (user && !appChoices.includes(app)) {
        app = user.type;
      }
      // after checking on new user, we assure anyway that session user data are loaded
      await this.buildUserData(session.userId, this.name);
      user = this.getUser(session.userId, comp);
      // in case of existing session must stay in this mode ...
      if (user && !isNewUser && session.app === app && user.type === app ) {
        // we do not need to change anything
      } else {
        if (user && isNewUser && session.app === 0) {
          // we have a new created session and user ....
          user.type = app;
          if (app === App.admin) {
            user.userName = 'admin';
          }
          this.setUser(user.userId, user, this.name);
        }
        if (user && user.type !== app) {
          // we have a user with wrong type
          let setSessionUserId = 0;
          const users = this.getUsers(this.name).filter(_ => _.status < 9
            && _.type === app);
          if (users && users.length > 0) {
            for (user of users) {
              if (setSessionUserId === 0) {
                if (user.type === App.server) {
                  setSessionUserId = user.userId;
                }
              }
            }
          }
          if (users && users.length > 0 && setSessionUserId === 0 && users[0].userId >= 1 ) {
            setSessionUserId = users[0].userId;
          } else if (setSessionUserId === 0) {
            user = UserFactory.empty();
            setSessionUserId = await this.createUser(user, this.name);
            user = this.getUser(setSessionUserId, this.name);
            // create user has type according to actual session app
            if (user) {
              user.type = app;
              if (app === App.admin) {
                user.userName = 'admin';
              }
              this.setUser(setSessionUserId, user, this.name);
              await this.buildUserData(setSessionUserId, this.name);
            }
          }
          const newUserId = await this.auth.newSessionUser(setSessionUserId, this.name);
          if (newUserId === setSessionUserId) {
            session = this.auth.getSession(this.name);
          }
        }
        if (session && session.app !== app) {
          // here we change session.app and user.type
          user = this.getUser(session.userId, comp);
          if (user) {
            switch (app) {
              case App.local:
                session.app = App.local;
                session.isPlan = true;
                session.isPlanMaint = true;
                break;
              case App.server:
                session.app = App.server;
                session.isPlan = true;
                session.isPlanMaint = true;
                break;
              case App.admin:
                session.app = App.admin;
                // to show actual event as default in calendar.component ...
                session.isPlan = false;
                // we have no calendar component usage at app.admin in the moment
                session.isPlanMaint = false;
                break;

              default:
                break;
            }
            // this.setUser(user.userId, user, comp);
            session.userName = user.userName;
            this.auth.setSession(session, comp);
          }
        }
      } // end else - there was a need of changechange
      session = this.auth.getSession(this.name);
      if (session && session?.authorizations?.length > 0) {
      // already built
      } else if (user) {
        // we build all authorizations - also if session.issueProviderId limits the session to 1 provider ...
        this.auth.setSessionAuthorizations(user.authorizations, this.name);
      }
    }
  }


  /**
   * setUserCalendarDay()
   *  store calendarDay for user in local storage
   * @param userId id of user
   * @param calendarDay last chrinicle calendarDay for that user
   * @param comp name of calling component
   * @returns true if user is updated in local storage
   */
  public setUserCalendarDay(userId: number, calendarDay: Date,  comp: string): boolean {
    const user = this.auth.getUser(userId, comp);
    if (user) {
      user.calendarDay = calendarDay;
      return this.auth.setUser(userId, user, comp);
    }
    return false;
  }


/**
   * loadRecurringTimeSpans()
   *  load timeSpans from holidays and birthdays
   *  and build a user element 'recurrringTimeSpans' as user events
   *  (independent of event provider - recurringTimeSpans exist only in local storage)
   * @param userId id of user for which we load data (if 0, it is session user ...)
   * @param comp name of calling component
   * @param startDate optional date where recurring time spans should start - we rebuild timeSpans if start date less existing time spans begin
   * @param endDate optional date where recurring time spans should end - we rebuild timeSpans if end dategreater existing time spans end

   */
  public async loadRecurringTimeSpans(userId: number, comp: string, startDate?: Date, endDate?: Date) {
    // first we build timeSpans for holidays
    let rangeBegin = GlobalFunctions.addMonths(new Date(), MAX_MONTHS * -1);
    let rangeEnd =  GlobalFunctions.addMonths(new Date(), MAX_MONTHS);
    // set rangeBegin, rangeEnd to first or last event if outside of range ...
    const userDataEvents = this.auth.getUserData(userId, 'events', comp);
    if (userDataEvents && userDataEvents?.events && userDataEvents?.events?.length > 0 && GlobalFunctions.getDateInMinutes(userDataEvents?.events[0]?.eventBegin) < GlobalFunctions.getDateInMinutes(rangeBegin)) {
      rangeBegin = userDataEvents?.events[0]?.eventBegin;
    }
    if (userDataEvents && userDataEvents?.events  && userDataEvents?.events?.length > 0 && GlobalFunctions.getDateInMinutes(userDataEvents?.events[userDataEvents?.events?.length - 1]?.eventBegin) > GlobalFunctions.getDateInMinutes(rangeEnd)) {
      rangeEnd = userDataEvents?.events[0]?.eventEnd;
    }
    if (startDate) {
      if (GlobalFunctions.getDateInMinutes(startDate) < GlobalFunctions.getDateInMinutes(rangeBegin) ) {
        rangeBegin = startDate;
      }
    }
    if (endDate) {
      if (GlobalFunctions.getDateInMinutes(endDate) > GlobalFunctions.getDateInMinutes(rangeEnd) ) {
        rangeEnd = endDate;
      }
    }
    this.buildRecurringTimeSpans(userId, rangeBegin, rangeEnd, comp);
  }

  /**
   * getRecurringTimeSpans()
   *  get timeSpans of session (or linked) user from local storage
   * @param userId session user (userId is 0) or a linked user for which we want to get timeSpan data
   * @param comp name of calling component
   * @returns timeSpans as events
   */
   public getRecurringTimeSpans(userId: number, comp: string): Array<Event> {
    let timeSpans: Array<Event> = [];
    let userData = this.auth.getUserData(userId, 'recurringTimeSpans', comp);
    timeSpans = userData?.events ?? [];
    return timeSpans;
  }

  /**
   * getRecurringTimeSpanRange()
   *  get timeSpans filtered by time range
   * (if range is outside MAX_MONTHS, timespans are dynamically built)
   * @param userId session user (userId is 0) or a linked user for which we want to get timeSpan data
   * @param fromDate begin of time range
   * @param toDate end of time range
   * @param comp name of calling component
   * @returns timeSpans  (only active timeSpans are returned)
   */
   public async getRecurringTimeSpanRange(userId: number, fromDate: Date, toDate: Date, comp: string): Promise<Array<Event>> {
    let timeSpans: Array<Event>;
    timeSpans = this.getRecurringTimeSpans(userId, comp);
    let isRebuild = false;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
     // we check from and to date if they are contained in recurring time spans for user
    if (timeSpans.length === 0 || fromDate.getTime() < timeSpans[0]?.eventBegin.getDate()) {
      startDate = fromDate;
      isRebuild = true;
    }
    if (timeSpans.length === 0 || toDate.getTime() > timeSpans[timeSpans.length - 1]?.eventBegin.getDate()) {
      endDate = toDate;
      isRebuild = true;
    }
    if (isRebuild) {
      this.loadRecurringTimeSpans(userId, comp, startDate, endDate);
      timeSpans = this.getRecurringTimeSpans(userId, comp);
    }

    if (timeSpans?.length > 0) {
    timeSpans = timeSpans.filter(_ =>
      GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(fromDate)
      && GlobalFunctions.getDateInMinutes(_.eventEnd) <= GlobalFunctions.getDateInMinutes(toDate)
      && _.status < 9);
    }
    return timeSpans;
  }




}
