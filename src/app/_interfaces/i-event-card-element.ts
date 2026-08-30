import { INumChoice } from "./i-num-choice";

/**
 * IEventCard
 * used in CalendarDayCardsView as optional supplement tu Event(Card)
 */
export interface IEventCardElement {
  isTemporary: boolean;
  isSummaryUpdated: boolean;
  spaceBefore: number;
  spaceAfter: number;
  shiftSpaceBefore?: number;
  shiftSpaceAfter?: number;
  isEndOnNextDay?: boolean;
  eventDurationDisplay: string;
  beginTimeChoices?: Array<INumChoice>;
  endTimeChoices?: Array<INumChoice>;
  durationChoices?: Array<INumChoice>;
  locationTypeChoices?: Array<INumChoice>;
  isShowTimeChange?: boolean;
  isShowTimeShift?: boolean;
  isShowLocationTypeDropdown?: boolean;
  contactIssueNr: string;
  contactIssueName: string;
  contactStyle?: {};
}
