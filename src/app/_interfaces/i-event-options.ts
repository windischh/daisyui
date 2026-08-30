
/**
 * IEventOptions
 * interface for component options which are stored in Event options
 * used in event components to transfer configuration parameters
 */
export interface IEventOptions {
  [index: string]: number | boolean;
  defaultIntervalLength: number;
  maxIntervalLength: number;
  /* usContactBooking can be true if servicelLevel.contact > 0    */
  isContactBooking: boolean;
  isBookingOffIssueTimes: boolean;
  isChangeIssueTimes: boolean;
  isGenerateChildIssues: boolean;
  isBookingOverMidnight: boolean;
  isChooseAllContactIssues: boolean;

  /* these options are user specific event options */
  /* userEventOptions 1 - 7, maintain in calendar-day-options-view
  isImmediatePersist: boolean;
  style: number;
  timeSlize: number;
  startHour: number;
  lastHour: number;
  maxIssueSelections: number;
  isShowFilters: boolean;
  */
}
