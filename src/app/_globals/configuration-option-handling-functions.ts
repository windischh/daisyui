import { MAX_INTERVAL_LENGTH } from './constants';

import { ConfigurationOption } from '../_db/configuration-option';
import { ConfigurationOptionFactory } from '../_db/configuration-option-factory';
import { Session } from '../_db/session';

import { OptionType } from '../_enums/option-type.enum';
import { OptionNameEvents } from '../_enums/option-name-events.enum';
import { OptionNameUserEvents } from '../_enums/option-name-user-events.enum';

import { IServiceLevel } from './../_interfaces/i-service-level';
import { IEventOptions } from '../_interfaces/i-event-options';
import { IUserEventOptions } from '../_interfaces/i-user-event-options';

import { ConfigurationOptionBasicFunctions } from './configuration-option-basic-functions';


/*
  static functions for option handling
*/
export class ConfigurationOptionHandlingFunctions {

  /******************************* eventOptions handling  *****************/

  /**
   * function to update user-specific eventOptions with options
   *
   * @param eventOptions - eventOptions
   * @param options - option data from option file
   * @returns eventOptions
   */
  static updateEventOptions(eventOptions: IEventOptions, options: Array<ConfigurationOption>, serviceLevel: IServiceLevel): IEventOptions {
    //  we actualize all eventOptions from auth options!!
    // defaultIntervalLength
    eventOptions[OptionNameEvents[3]] = ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_events_' + OptionNameEvents[3])
      ?? 30;
    // maxIntervalLength
    eventOptions[OptionNameEvents[4]] = ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_events_' + OptionNameEvents[4])
      ?? MAX_INTERVAL_LENGTH;
    // isContactBooking
    eventOptions[OptionNameEvents[5]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[5])
      && serviceLevel.contact > 0 ? true : false;
    // isBookingOffIssueTimes
    eventOptions[OptionNameEvents[6]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[6])
      ?? false;
    // isChangeIssueTimes
    eventOptions[OptionNameEvents[7]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[7])
      ?? false;
    // isGenerateChildIssues
    eventOptions[OptionNameEvents[8]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[8])
      ?? false;
    // isBookingOverMidnight
    eventOptions[OptionNameEvents[9]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[9])
      ?? false;
    // isChooseAllContactIssues
    eventOptions[OptionNameEvents[10]] = ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[10])
      ?? false;
    return eventOptions;
  }

  /**
   * function to initialize  eventOptions
   *
   * @param session - session data
   * @param options - option data from option file - include also user options which are used as basis for
   *   initialization
   * @returns eventOptions
   */
  static initializeEventOptions(session: Session, options: Array<ConfigurationOption>): IEventOptions {
    return {
      /**  event options      */
      defaultIntervalLength : ConfigurationOptionBasicFunctions.getOptionInt(options,  'opt_events_' + OptionNameEvents[3])
        ?? 30,
      maxIntervalLength : ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_events_' + OptionNameEvents[4])
        ?? MAX_INTERVAL_LENGTH,
      isContactBooking : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[5])
        && session.serviceLevel.contact > 0 ? true : false,
      isBookingOffIssueTimes : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[6])
        ?? false,
      isChangeIssueTimes : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[7])
        ?? false,
      isGenerateChildIssues : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[8])
        ?? false,
      isBookingOverMidnight : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[9])
        ?? false,
      isChooseAllContactIssues : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_events_' + OptionNameEvents[10])
        ?? false
    };

  }

/**
   * function to initialize user-specific eventOptions
   *
   * @param options - option data from option file - include also user options which are used as basis for
   *   initialization
   * @param calendarDay - options refer to a calendarDay (and are permanrnt modified if calendarDay changes)
   * @returns eventOptions
   */
static initializeUserEventOptions(options: Array<ConfigurationOption>): IUserEventOptions {
  return {
    /** the following settings are user options - maintained in calendar-day-options-view
     * but they also have defaults in standard mandant options
    */
    isImmediatePersist : ConfigurationOptionBasicFunctions.getOptionBoolean(options, 'opt_userEvents_' + OptionNameUserEvents[1])
      ?? false,
    style : ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_userEvents_' + OptionNameUserEvents[2])
      ?? 0,
    timeSlize: ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_userEvents_' + OptionNameUserEvents[3])
      ?? 5,
    startHour : ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_userEvents_' + OptionNameUserEvents[4])
      ?? 8,
    lastHour :  ConfigurationOptionBasicFunctions.getOptionInt(options, 'opt_userEvents_' + OptionNameUserEvents[5])
      ?? 17
  };

}



  /**
   * get user option from a event option (= userEventOptions element with eventOptionsKey)
   * - event Options Key is for example 'startHour', resulting user option is 'opt_userEvents_startHour'
   *  optionNr = 5 (defined  by enum OptionNameUserEvents)
   *
   * @deprecated - we do not use this procedure in our components, and here we set user option directly in intializeUserEventOptions
   *
   * @param options - option data from option file
   * @param userEventOptions usually the eventOptions from session.eventOptions as opts
   * @param eventOptionsKey key of the processed element of eventOptions
   * @returns option
   */
  static getUserOptionFromEventOptions(options: Array<ConfigurationOption>, userEventOptions: IUserEventOptions, eventOptionsKey: string): ConfigurationOption | null {
    if (userEventOptions[eventOptionsKey] !== null && userEventOptions[eventOptionsKey] !== undefined) {
      const optionNameKey = 'opt_userEvents_' + eventOptionsKey;
      const enumStringType: { [key: string]: any } = OptionNameUserEvents;
      let option: ConfigurationOption;
      option = options.filter(_ => _.optionName.startsWith(optionNameKey))[0];
      if (!option) {
        option = options.filter(_ => _.optionName.startsWith(optionNameKey))[0];
      }
      if (!option) {
        option = ConfigurationOptionFactory.empty();
        option.optionName = optionNameKey;
        option.optionArea = 'userEvents';

        option.optionNr = enumStringType[optionNameKey];
      }
      switch (enumStringType[optionNameKey]) {
        // isImmediatePersist
        case 1:
          if (typeof userEventOptions[eventOptionsKey] === 'boolean') {
            option.optionBooleanValue = userEventOptions[eventOptionsKey] ? 1 : 0;
            option.type = OptionType.boolean;
          }
          break;
        // style
        case 2:
          if (typeof userEventOptions[eventOptionsKey] === 'number') {
            option.optionIntValue = userEventOptions[eventOptionsKey] as number;
            option.type = OptionType.int;
          }
          break;
        // timeSlize
        case 3:
          if (typeof userEventOptions[eventOptionsKey] === 'number') {
            option.optionIntValue = userEventOptions[eventOptionsKey] as number;
            option.type = OptionType.int;
          }
          break;
        // startHour
        case 4:
          if (typeof userEventOptions[eventOptionsKey] === 'number') {
            option.optionIntValue = userEventOptions[eventOptionsKey] as number;
            option.type = OptionType.int;
          }
          break;
        // lastHour
        case 5:
          if (typeof userEventOptions[eventOptionsKey] === 'number') {
            option.optionIntValue = userEventOptions[eventOptionsKey] as number;
            option.type = OptionType.int;
          }
          break;
        default:
          break;
      }
      return option;
    } else {
      return null;
  }
}


  /******************************* end of eventOptions handling *****************/

}
