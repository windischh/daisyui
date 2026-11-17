import { CalendarEvent } from '../_db/calendar-event';

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
  event?: CalendarEvent;
  eventBegins: boolean;
  eventEnds: boolean;
  eventDurationDisplay: string;
  eventRowSpan: number;
  contactDisplayNr: string;
  contactDisplayName: string;
  tableRowStyle?: {};
  rowElementStyle?: {};
  timeElementStyle?: {};
  timeInTimeElementStyle?: {};
  leftContactStyle?: {};
  rightContactStyle?: {};
  eventElementStyle?: {};
  assocTxt?: string;
  category?: string;
  summaryDisplay?: string;
  ixFrom?: number;
  ixTo?: number;
}
