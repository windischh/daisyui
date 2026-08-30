
/**
 * IEventHInfo
 * optional supplement to Event
 * is used in getEventInfo
 * also used in CalendarDay model for selected contact/issue
  */
export interface IEventInfo {
    // eventHeaderId: number;
    contactNr: number;
    contactDisplayNr?: string;
    contactName?: string;
    contactLongName?: string;
    street?: string;
    city?: string;
    plz?: number;
    contactColor?: string;
    contactExternalId?: string;
    issueText?: string;
    issueDescription?: string;
    issueDisplayNr?: string;
    issueDateFrom?: Date;
    issueDateTo?: Date;
    issueDateFinished?: Date;
    issueNote?: string;
    issueProviderId: number;
    nExternalIssueId?: number;
    sExternalIssueId?: string;
    providerUrl?: string;
    login?: string;
    issueStatus?: number;
    categoryNr?: number;
    defaultLocationType?: number;
}
