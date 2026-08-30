import { User } from "./user";
import { UserRaw } from "./user-raw";

export class UserFactory {

  static empty(): User {
    return new User(0, 0, '',
    new Date(), null, null, [],
    0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawUser: UserRaw): User {
    return new User(
      rawUser.userId,
      rawUser.userToken,
      rawUser.userName,
      typeof(rawUser.lastActivity) === 'string' ?
      new Date(rawUser.lastActivity) : rawUser.lastActivity,
      typeof(rawUser.calendarDay) === 'string' ?
      new Date(rawUser.calendarDay) : rawUser.calendarDay,
      rawUser.userEventOptions,
      rawUser.authorizations,
      rawUser.type,
      rawUser.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawUser.created) === 'string' ?
      new Date(rawUser.created) : rawUser.created,
      rawUser.createdBy,
      rawUser.releaseCreated,
      typeof(rawUser.updated) === 'string' ?
      new Date(rawUser.updated) : rawUser.updated,
      rawUser.updatedBy,
      rawUser.releaseUpdated,
      rawUser.version
    )
  }

}
