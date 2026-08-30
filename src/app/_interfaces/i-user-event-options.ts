
/**
 * IUserEventOptions
 * interface for component options which are stored in userEvent options
 * used in event components to transfer user options
 * * (stored in authentication service - persistent via user options)
 */
export interface IUserEventOptions {
  [index: string]: number | boolean;
  /* these options are user specific event options */
  /* userEventOptions 1 - 5, maintain in calendar-day-options-view  */
  isImmediatePersist: boolean;
  style: number;
  timeSlize: number;
  startHour: number;
  lastHour: number;
}
