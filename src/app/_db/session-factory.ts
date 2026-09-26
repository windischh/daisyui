import { Session } from './session';
import { SessionRaw } from './session-raw';
import { GlobalFunctions } from '../_globals/global-functions';
import { EventSelectOptionFactory } from './event-select-option-factory';

export class SessionFactory {

  static empty(): Session {
    return new Session(0, 0, 0, 0, '', {user: 0, maint: 0, show: 0, isTest: false}, '',
     new Date(), new Date(), [], 0, '',
     {contact: 0, issue: 0, event: 0},  0, 0, 0, new Date(),
     null, false, false,
     0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawSession: SessionRaw): Session {
    return new Session(
      rawSession.sessionId,
      rawSession.app,
      rawSession.userId,
      rawSession.userToken,
      rawSession.userName,
      rawSession.securityLevel,
      rawSession.documents,
      typeof(rawSession.lastTx) === 'string' ?
      new Date(rawSession.lastTx) : rawSession.lastTx,
      typeof(rawSession.lastTxClient) === 'string' ?
      new Date(rawSession.lastTxClient) : rawSession.lastTxClient,
      rawSession.authorizations,
      rawSession.duration,
      rawSession.extraInfo,
      rawSession.serviceLevel,
      rawSession.language,
      rawSession.contactNr,
      rawSession.issueNr,
      typeof(rawSession.calendarDay) === 'string' ?
      new Date(rawSession.calendarDay) : rawSession.calendarDay,
      rawSession.eventSelectOption ? EventSelectOptionFactory.fromObject(rawSession.eventSelectOption) : null,
      rawSession.isPlan,
      rawSession.isPlanMaint,
      rawSession.type,
      rawSession.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawSession.created) === 'string' ?
      new Date(rawSession.created) : rawSession.created,
      rawSession.createdBy,
      rawSession.releaseCreated,
      typeof(rawSession.updated) === 'string' ?
      new Date(rawSession.updated) : rawSession.updated,
      rawSession.updatedBy,
      rawSession.releaseUpdated,
      rawSession.version
    );
  }

}
