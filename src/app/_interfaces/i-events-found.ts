import { Event } from "../_db/event";

/**
 * IEventsFound
 *  object which is returend by getting issue event from provider
 */
export interface IEventsFound {
  /* isEventFound true: we got an event from provider and have already stored it in session storage */
  isDataFound: boolean;
  /* isLoginNecessary: true we need provider login  */
  isLoginNecessary: boolean
  /* events -  content which we got from provider*/
  events: Array<Event>;
}
