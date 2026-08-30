import { EventSelectOption } from './event-select-option';
import { Contact } from "./contact";
import { Provider } from "./provider";
import { Event } from "./event";
import { ConfigurationOption } from './configuration-option';

/**
 * UserData
 * used as element to build information structure for each user in local storage
 * a user data element has mandantory userId and only 1 Array of the possible types of data
 * we use it to store a data table in a local storage item - item name points to a certain Array,
 * for example local storage item 'Issues' has a UserDate object with an issues property
 */
export class UserData {
  constructor (
    public userId: number,
    public userToken: number,
    /*
      with lastModified we assure that session modifies userData which is
       unchangend since getting (we have a single point for modifying in auth.setUserData())
    */
    public lastModified: Date,
    public providers?: Array<Provider>,
    public configurationOptions?: Array<ConfigurationOption>,
    public contacts?: Array<Contact>,
    public events?: Array<Event>,
    public eventSelectOptions?: Array<EventSelectOption>
  ) { }
}

