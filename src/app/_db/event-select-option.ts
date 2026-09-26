import { IEventSortCriteria } from '../_interfaces/i-event-sort-criteria';

/**
 * EventSelectOption
 * used in event components to store last selection parameters
 * (stored in user data)
 */
export class EventSelectOption {
  constructor (
    public nr: number,
    public name: string,
    public contactNr: number,
    /*
    * event select entries
    ' must have issueProviderId (with url, login to veriyf id!) and external id to identify issue
    */
    public issueProviderId: number,
    public providerUrl: string,
    public login: string,
    public nExternalIssueId: number,
    public sExternalIssueId: string,
    // userId is used to select users in /server and /local mode
    // where we select locoal and server events
    // userId 0 selects all users
    public userId: number,
    // @deprecated not really used ...
    public externalUserId: string,
    // login (here as userLogin - we have already a login to identify issue!!!)
    // is used to select users in /admin mode
    // where we select users from all logins which we find in issue events
    // empty login selects all users
    public userLogin: string,
    // we allow null for selection = according to eventOption
    public isPlan: boolean | null,
    // we allow null for location type selection = all types
    public locationType: number | null,
    public isShowDetails: boolean,
    public sortCriterias: IEventSortCriteria[],
    public userName?: string,
    // custIssueNr has contactNr or issueNr
    public custIssueNr?: string,
    public contactDisplayNr?: string,
    public contactName?: string,
    public contactColor?: string,
    public issueDisplayNr?: string,
    public issueText?: string,
    public isPreviousDay?: boolean,
    public isPreviousWeek?: boolean,
    public isPreviousMonth?: boolean,
    public isCurrentDay?: boolean,
    public isCurrentWeek?: boolean,
    public isCurrentMonth?: boolean,
    public isNextDay?: boolean,
    public isNextWeek?: boolean,
    public isNextMonth?: boolean,
    public isDateInterval?: boolean,
    public showFrom?: number,
    public showTo?: number,
    public isDateRange?: boolean,
    // dateFrom and dateTo are built new every time when eventSelectOption is used
    public dateFrom?: Date,
    public dateTo?: Date
  ) {}
}
