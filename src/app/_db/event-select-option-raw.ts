import { IEventSortCriteria } from '../_interfaces/i-event-sort-criteria';

/**
 * EventSelectOptionRaw
 */
export interface EventSelectOptionRaw {
  nr: number;
  name: string;
  contactNr: number;
  userId: number;
  userName: string;
  // we allow null for selection = according to eventOption
  isPlan: boolean | null;
  // we allow null for location type selection = all types
  locationType: number | null;
  isShowDetails: boolean;
  sortCriterias: IEventSortCriteria[];
  contactDisplayNr?: string;
  contactName?: string;
  contactColor?: string;
  issueNr?: number,
  isPreviousDay?: boolean;
  isPreviousWeek?: boolean;
  isPreviousMonth?: boolean;
  isCurrentDay?: boolean;
  isCurrentWeek?: boolean;
  isCurrentMonth?: boolean;
  isNextDay?: boolean;
  isNextWeek?: boolean;
  isNextMonth?: boolean;
  isDateInterval?: boolean;
  showFrom?: number;
  showTo?: number;
  isDateRange?: boolean;
  // dateFrom and dateTo are built new every time when eventSelectOption is used
  dateFrom?: Date;
  dateTo?: Date;
}
