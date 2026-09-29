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
    */
    // userId is used to select users (in admin mode)
    // userId 0 selects all users
    public userId: number,
    // name of  user in /admin mode
    public userName: string,
    // we allow null for selection = according to eventOption
    public isPlan: boolean | null,
    // we allow null for location type selection = all types
    public locationType: number | null,
    public isShowDetails: boolean,
    public sortCriterias: IEventSortCriteria[],
    public contactDisplayNr?: string,
    public contactName?: string,
    public contactColor?: string,
    public issueNr?: number,
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
