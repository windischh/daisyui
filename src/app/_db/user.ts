
import { IEventOptions } from "../_interfaces/i-event-options";
import { IUserEventOptions } from "../_interfaces/i-user-event-options";
import { IAuthorization } from '../_interfaces/i-authorization';
export class User {
  constructor (
    /* userId is defined by adding users in local storage
    */
    public userId: number,
    public userToken: number,
    public userName: string,
    /* each user activity (independent from session) is registered as lastActivity
    */
    public lastActivity: Date,
    /*
      calendarDay used to remember users last calendarDay when browsing through chronicle
    */
    public calendarDay: Date | null,
    public userEventOptions: IUserEventOptions | null,
    /* user has an array of authorizations - for each of his issueProviders
      a login is stored if "remember my login" is checked or when manually taken from session authorization
    */
    public authorizations: Array<IAuthorization>,
    /*
      we do not need user type in the moment ...
      type 0 - admin user, 1 - local  user, 2 - server user
    */
    public type: number,
    /*
      status = 0: user created
      status = 1: user data loading in progress
      status = 2: user data loading complete
      status = 9: user deactivated (deactivation is possible only if no session with this userId exists)
    */
    public status: number,
    public created: Date,
    public createdBy: string,
    /* the pEvent release which has created this user record
    */
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
    public isShowAuthorizations?: boolean

  ) { }
}
