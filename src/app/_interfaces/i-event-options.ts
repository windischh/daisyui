
/**
 * IEventOptions
 * interface for component options which are stored in Event options
 * used in event components to transfer configuration parameters
 */
export interface IEventOptions {
  [index: string]: number | boolean;
  /* show events backward and forward - in days */
  showFrom: number;
  showTo: number;
  /* interval length for events in minutes*/
  defaultIntervalLength: number;
  maxIntervalLength: number;
  /* can we book an event over midnight */
  isBookingOverMidnight: boolean;

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
