import { IAuthorization } from "../_interfaces/i-authorization";
import { ISecurityLevel } from "../_interfaces/i-security-level";
import { IServiceLevel } from "../_interfaces/i-service-level";
import { EventSelectOption } from "./event-select-option";

export class Session {
  constructor (
    public sessionId: number,
    /* at implementations with local storage user management
      app may be local or adminr
    */
    public app: number,
    /* at implementations with local storage user management
      userId references the localStarge user
    */
    public userId: number,
    /* userToken is set from localStorage user
    */
    public userToken: number,
    public userName: string,
    /* securityLevel - see i-security-level
    */
    public securityLevel: ISecurityLevel,
    /* documents - name of documents directory for external (linked) documents - if empty, this session has no documents
    */
    public documents: string,
    /* date/time of last transaction in this session
      this is server time - client has his own timestamp !!
      (in case of webDAV this field  is not actualized, only resetted ....*/
    public lastTx: Date,
    /* lastTxClient - timestamp of last activity to be checked togehter with actual time against duration
    */
    public lastTxClient: Date,
    public authorizations: Array<IAuthorization>,
    /* duration - max. time of inactivity in minutes
    */
    public duration: number,
    public extraInfo: string,
    /* serviceLevel - see i-service-level
    */
    public serviceLevel: IServiceLevel,
    /* language 1 = english, 2= german 	0 = undefined  can be changed durng session!!
    */
    public language: number,
    /* contact nr is the last contact the user has chosen as eventing-contact
      is set during session refresh  */
    public contactNr: number ,
    /* issue nr is the issue nr which user has set when choseing as eventing-contact
      is set during session refresh  */
    public issueNr: number ,
    /*  calendarDay - date has been chosen by user when creating or selecting events
      set to actual day when session starts
    */
    public calendarDay: Date,
    /* eventSelectOption - the actually chosen element of EventSelectOptions  */
    public eventSelectOption: EventSelectOption | null,
    /* plan instead of actual  default true in local and server mode,
      false in admin mode - admin has no planning calendar, but analyzes (actual!) issue event */
    public isPlan: boolean,
    /*  is plan maintainable   default false at /admin  */
    public isPlanMaint: boolean,
    /* we do not store release at session - we can get release from user with session.userId */
    public type: number,
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
  ) { }
}
