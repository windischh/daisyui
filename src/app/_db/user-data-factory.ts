import { ContactFactory } from "./contact-factory";
import { ProviderFactory } from "./provider-factory";
import { UserData } from "./user-data";
import { UserDataRaw } from "./user-data-raw";
import { EventFactory } from "./event-factory";
import { EventSelectOptionFactory } from "./event-select-option-factory";
import { ConfigurationOptionFactory } from "./configuration-option-factory";


export class UserDataFactory {

  static empty(): UserData {
    return new UserData(0, 0, new Date());
  }

  static fromObject(rawUserData: UserDataRaw): UserData {
    return new UserData(
      rawUserData.userId,
      rawUserData.userToken,
      typeof(rawUserData.lastModified) === 'string' ?
      new Date(rawUserData.lastModified) : rawUserData.lastModified,
      rawUserData.providers?.map(provider => ProviderFactory.fromObject(provider)),
      rawUserData.configurationOptions?.map(configurationOption => ConfigurationOptionFactory.fromObject(configurationOption)),
      rawUserData.contacts?.map(contact => ContactFactory.fromObject(contact)),
      rawUserData.events?.map(event => EventFactory.fromObject(event)),
      rawUserData.eventSelectOptions?.map(eventSelectOption => EventSelectOptionFactory.fromObject(eventSelectOption))
    )
  }

}
