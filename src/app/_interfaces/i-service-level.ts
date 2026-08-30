/**
 * IServiceLevel
 * used in session
 */
export interface IServiceLevel {
  /*
    level 0 - there are no contacts
    level 1 - we use contacts
    level 2 - contacts can be assigned to events
  */
  contact: number;
  // not used
  issue: number;
  /*
    level 0 - there are no events
    level 1 - we use calendar and events
  */
  event: number;
}
