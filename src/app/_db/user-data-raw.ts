
import { ContactRaw } from "./contact-raw";
import { ProviderRaw } from "./provider-raw";
import { EventRaw } from "./event-raw";
import { EventSelectOptionRaw } from "./event-select-option-raw";
import { ConfigurationOptionRaw } from "./configuration-option-raw";

/**
 * UserDataRaw
 */
 export interface UserDataRaw {
  userId: number;
  userToken: number;
  lastModified: Date;
  providers?: Array<ProviderRaw>;
  configurationOptions?: Array<ConfigurationOptionRaw>,
  contacts?: Array<ContactRaw>;
  events?: Array<EventRaw>;
  eventSelectOptions?: Array<EventSelectOptionRaw>;
}
