
/**
 * IEventHInfo
 * optional supplement to Event
 * is used in getEventInfo
 * also used in CalendarDay model for selected contact
  */
export interface IEventInfo {
    // eventHeaderId: number;
    contactNr: number;
    contactDisplayNr?: string;
    contactDisplayName?: string;
    companyName?: string;
    street?: string;
    city?: string;
    plz?: number;
    contactColor?: string;
    issueNr?: number;
    defaultLocationType?: number;
}
