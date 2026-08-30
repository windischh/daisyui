import { Event } from '../_db/event';

/**
 * IEventGridElement
 * used in CalendarDayGridView as grid element which is containing a event
 */
export interface IEventGridElement {
  minutes: number;
  roundedMinutes: number;
  timeElement: string;
  timeBegins: boolean;
  timeRowSpan: number;
  event: Event;
  eventBegins: boolean;
  eventEnds: boolean;
  eventDurationDisplay: string;
  eventRowSpan: number;
  custIssueNr: string;
  custIssueName: string;
  tableRowStyle?: {};
  rowElementStyle?: {};
  timeElementStyle?: {};
  timeInTimeElementStyle?: {};
  leftCustStyle?: {};
  rightCustStyle?: {};
  eventElementStyle?: {};
  assocTxt?: string;
  category?: string;
  summaryDisplay?: string;
  ixFrom?: number;
  ixTo?: number;
}
