import { Event } from '../_db/event';

/**
 * IEventListlement
 * used in EventListView as element which is containing a event
 */
export interface IEventListElement {
  [key: string]: any,
  timeString: string;
  event: Event;
  userName: string;
  userExternalId: string;
  contactNr: number;
  contactDisplayNr: string;
  contactName: string;
  contactExternalId: string;
  contactStyle?: {[key: string]: any};
  issueProviderId: number;
  nExternalIssueId?: number;
  sExternalIssueId?: string;
  issueDisplayNr: string;
  issueText: string;
  issueDescription: string;
  categoryNr: number;
  /* duration in minutes ... */
  durationMinutes: number;
  durationHours: number;
  durationFormatted: string;
  /* localized text of locazion type  ... */
  locationTypeText: string;
  isGroupElement?: boolean;
  /* if isGroupElement, this field indicates for which criteria field */
  changedCriteria?: string;
  /* if isGroupElement, this field carries the group sum */
  sumDuration?: number;
  isSum?: boolean;
  isSubTotal?: boolean;
}
