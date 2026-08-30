import { MAX_INTERVAL_LENGTH } from './constants';

import { GlobalFunctions } from './global-functions';

import { ConfigurationOption } from '../_db/configuration-option';

import { OptionType } from '../_enums/option-type.enum';

import { OptionNameTimeSpanCategory } from '../_enums/option-name-time-span-category';
import { OptionNameDocumentCategory } from '../_enums/option-name-document-category';

import { AuthenticationService } from '../_services/authentication.service';
import { OptionNameEvents } from '../_enums/option-name-events.enum';
import { OptionNameUserEvents } from '../_enums/option-name-user-events.enum';

/*
  static functions for option handling
*/
export class ConfigurationOptionMaintFunctions {


/* *********************  option functions - maintenance *********************************/

  /*
    first part of option functions is for option maintenance
  */

  // all options with defined types are not deleteble !!
  // option type for named option
  static getOptionType (name: string): number {
    switch (name) {
      // see enum OptionNameEvents
      case OptionNameEvents[1]:
        return OptionType.int;
      case OptionNameEvents[2]:
        return OptionType.int;
      case OptionNameEvents[3]:
        return OptionType.intValueChoice;
      case OptionNameEvents[4]:
        return OptionType.intValueChoice;
      case OptionNameEvents[5]:
        return OptionType.boolean;
      case OptionNameEvents[6]:
        return OptionType.boolean;
      case OptionNameEvents[7]:
        return OptionType.boolean;
      case OptionNameEvents[8]:
        return OptionType.boolean;
      case OptionNameEvents[9]:
        return OptionType.boolean;
      case 'opt_events_test':
        return OptionType.stringValueChoice;
      // see enum optionNameUserEvents
      case OptionNameUserEvents[1]:
        return OptionType.boolean;
      case OptionNameUserEvents[2]:
        return OptionType.styleChoice;
      case OptionNameUserEvents[3]:
        return OptionType.intValueChoice;
      case OptionNameUserEvents[4]:
        return OptionType.int;
      case OptionNameUserEvents[5]:
        return OptionType.int;
      case OptionNameUserEvents[6]:
        return OptionType.int;
      case OptionNameUserEvents[13]:
        return OptionType.int;
      case OptionNameUserEvents[14]:
        return OptionType.int;
      // see enum OptionNameTimeSpanCategory
      case OptionNameTimeSpanCategory[1]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[2]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[3]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[4]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[5]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[6]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[7]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[8]:
        return OptionType.string;
      case OptionNameTimeSpanCategory[9]:
        return OptionType.string;
      // see enum OptionNameDocumentCategory
      case OptionNameDocumentCategory[1]:
        return OptionType.string;
      case OptionNameDocumentCategory[2]:
        return OptionType.string;
      case OptionNameDocumentCategory[3]:
        return OptionType.string;
      case OptionNameDocumentCategory[4]:
        return OptionType.string;
      case OptionNameDocumentCategory[5]:
        return OptionType.string;
      case OptionNameDocumentCategory[6]:
        return OptionType.string;
      case OptionNameDocumentCategory[7]:
        return OptionType.string;
      case OptionNameDocumentCategory[8]:
        return OptionType.string;
      case OptionNameDocumentCategory[9]:
        return OptionType.string;
      default:
        return OptionType.undefined;
    }
  }

  // option type for style-structured option
  // we return type string if we do not know area or optionGroup
  static getStyleOptionType(area: string, optionGroup: number): number {
    switch (area) {
      case 'eventCalendar':
        // we cover optionGroups from 100 to 400
        if (optionGroup >= 100 && optionGroup < 500 ) {
          return OptionType.stringSequence;
        }
        if (optionGroup >= 500 && optionGroup < 600) {
          return OptionType.boolean;
        }
        /***************** 9300 - 9700  tests stringSequences   */
        if (optionGroup >= 9300 && optionGroup < 9400 ) {
          return OptionType.stringSeqNameChoice;
        }
        if (optionGroup >= 9400 && optionGroup < 9500 ) {
          return OptionType.stringSeqValueChoice;
        }
        if (optionGroup >= 9500 && optionGroup < 9600 ) {
          return OptionType.stringSeqValueChoiceUnique;
        }
        if (optionGroup >= 9600 && optionGroup < 9700 ) {
          return OptionType.stringSeqBothChoice;
        }
        if (optionGroup >= 9700 && optionGroup < 9800 ) {
          return OptionType.stringSeqBothChoiceUnique;
        }
        return OptionType.undefined;
        break;
      case 'eventExport':
        if (optionGroup === 1 || optionGroup === 2 || optionGroup === 3) {
          return OptionType.stringValueChoice;
        }
        if (optionGroup === 4 || optionGroup === 5 || optionGroup === 6 || optionGroup === 8) {
          return OptionType.string;
        }
        if (optionGroup === 7 || optionGroup === 9) {
          return OptionType.boolean;
        }
        if (optionGroup >= 100 && optionGroup < 200 ) {
          return OptionType.stringSeqNameChoice;
        }
        return OptionType.undefined;
        break;
      default:
        return OptionType.undefined;
    }
  }

  static getOptionValue(option: ConfigurationOption): string | null {
    switch (option.type) {
      case OptionType.boolean:
        return option.optionBooleanValue === 1 ? 'true' : 'false';
        break;
      case OptionType.string:
      case OptionType.stringValueChoice:
      case OptionType.stringSequence:
      case OptionType.stringSeqNameChoice:
      case OptionType.stringSeqValueChoice:
      case OptionType.stringSeqValueChoiceUnique:
      case OptionType.stringSeqBothChoice:
      case OptionType.stringSeqBothChoiceUnique:
        return option.optionStringValue;
        break;
      case OptionType.int:
      case OptionType.intValueChoice:
      case OptionType.styleChoice:
        return option.optionIntValue
        ? option.optionIntValue.toString()
        : '0';
        break;
      case OptionType.numeric:
        return option.optionNumericValue
        ? option.optionNumericValue.toString()
        : '0.00';
        break;
      case OptionType.date:
        return option.optionDateValue
        // TODO do we need full digits`?
        // if not, use
        // ? GlobalFunctions.getDMY(option.optionDateValue)
        ? GlobalFunctions.getDDMMYYYY(option.optionDateValue)
        : null;
        break;
      default:
        return null;
    }
  }

  // this are all intValueChoices for named options
  static getIntChoices(name: string, auth: AuthenticationService): Array<{value: number, text: string}> {
    let choices: Array<{value: number, text: string}>;
    switch (name) {
      // 'opt_events_defaultIntervalLength'
      case OptionNameEvents[3]:
          // what is the default length for event intervals
          const eventsIntervalValues = [30, 60, 120, 180, 240, 300, 360];
          choices = eventsIntervalValues.map(_ => {
            return {'value': _, 'text': _.toString()};
          });
          return choices;
        break;
      // 'opt_events_maxIntervalLength'
      case OptionNameEvents[4]:
          // what is the max length for event intervals (up to MAX_INTERVAL_LENGTH of system)
          const eventsMaxIntervalValues = [360, MAX_INTERVAL_LENGTH];
          choices = eventsMaxIntervalValues.map(_ => {
            return {'value': _, 'text': _.toString()};
          });
          return choices;
        break;
      // 'opt_userEvents_timeSlize'
      case OptionNameUserEvents[3]:
        // what is the timeSlize for granularity in planning
        const timeSlizeValues = GlobalFunctions.getTimeSlizes();
        choices = timeSlizeValues.map(_ => {
          return {'value': _, 'text': _.toString()};
        });
        return choices;
        break;
      default:
        return [{value: 0, text: '0'}];
    }
  }

  // this are all intValueChoices for style-structured options
  static getStyleIntChoices(area: string, optionGroup: number): Array<{value: number, text: string}> {
    return [{value: 0, text: '0'}];
  }

  // this are all styleChoices (int choices where the available choices are styles)
  static getIntChoicesOfStyles(name: string, options: ConfigurationOption[], txt?: string):
    Array<{value: number, text: string, isSelected: boolean}> {
    const choices: Array<{value: number, text: string, isSelected: boolean}> = [];
    switch (name) {
      case 'opt_userEvents_style':
        // get styles from eventCalendar
        options.filter(_ => _.optionArea === 'eventCalendar'
          && _.optionName.substr(_.optionArea.length + 4) === 'opt_style_name'
        ).forEach(_ => {
          const styleString  = _.optionName.substr(_.optionArea.length + 1, 2);
          let styleName = '';
          styleName = txt ? txt : 'style';
          styleName += ': ' + styleString;
          choices.push({
            value: Number(styleString),
            text: _.optionStringValue ? _.optionStringValue : styleName,
            isSelected: false
          });
        });
        if (choices.length > 0) {
          choices[0].isSelected = true;
          return choices;
        } else {
          return [{value: 0, text: '', isSelected: false}];
        }
        break;
      default:
        return [{value: 0, text: '', isSelected: false}];
    }
  }

  // (there are no StyleIntChoicesOfStyles cause styleChoice is not an available type for style-structured options)

  // this are all stringValueChoices for named options
  static getStringChoices(name: string): Array<{value: number, text: string}> {
    switch (name) {
      case 'opt_events_test':
        return [{value: 0, text: 'test0'}, {value: 1, text: 'test1'}];
      default:
        return [{value: 0, text: ''}];
    }
  }

  // this are all stringValuesChoices for style-strucred options
  static getStyleStringChoices(area: string, optionGroup: number, optionName: string):
   Array<{value: number, text: string}> {
    if (area === 'eventCalendar' && optionGroup === 9400 ) {
      return [
        {value: 0, text: 'Testchoice1'},
        {value: 1, text: 'Testchoice2'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9500 ) {
      return [
        {value: 0, text: 'Testchoice1'},
        {value: 1, text: 'Testchoice2'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9600 && optionName === 'Testname1') {
      return [
        {value: 0, text: 'Testchoice1_1'},
        {value: 1, text: 'Testchoice1_2'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9600 && optionName === 'Testname2') {
      return [
        {value: 0, text: 'Testchoice2_1'},
        {value: 1, text: 'Testchoice2_2'},
        {value: 2, text: 'Testchoice2_3'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9700 ) {
      return [
        {value: 0, text: 'Testchoice1'},
        {value: 1, text: 'Testchoice2'}
      ];
    // we allow columnn delimiters
    } else if (area === 'eventExport' && optionGroup === 1) {
      return [
        {value: 0, text: ', (comma)'},
        {value: 1, text: '; (semicolon)'},
        {value: 2, text: '(TAB)'}
      ];
    // we allow string delimiters
    } else if (area === 'eventExport' && optionGroup === 2) {
      return [
        {value: 0, text: '" (double quotation mark)'},
        {value: 1, text: '\' (single quotation mark)'}
      ];
    // we allow row delimiters (are transformed into hex values when exporting)
    } else if (area === 'eventExport' && optionGroup === 3) {
      return [
        {value: 0, text: '\\r\\n (CRLF)'},
        {value: 1, text: '\\n (LF)'}
      ];
    } else {
      return [{value: 0, text: ''}];
    }
  }

  // this are all stringValuesChoices for style-structured options
  static getStyleStringNameChoices(area: string, optionGroup: number, auth: AuthenticationService): Array<{value: number, text: string}> {
    if  (area === 'eventCalendar' && optionGroup === 9300 ) {
      return [
        {value: 0, text: 'Testname1'},
        {value: 1, text: 'Testname2'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9600 ) {
      return [
        {value: 0, text: 'Testname1'},
        {value: 1, text: 'Testname2'}
      ];
    } else if (area === 'eventCalendar' && optionGroup === 9700 ) {
      return [
        {value: 0, text: 'Testname1'},
        {value: 1, text: 'Testname2'}
      ];
    // we allow up to 99 columns in event export (in the moment only 20 are defined in enum)
    } else if (area === 'eventExport' && optionGroup >= 100 && optionGroup < 200) {
      return [
        {value: 0, text: auth.txt['columnHeader']},
        {value: 1, text: auth.txt['columnContent']},
        {value: 2, text: auth.txt['maxLength']},
        {value: 3, text: auth.txt['decimalPositions']},
        {value: 4, text: auth.txt['dateFormat']}
      ];
    } else {
      return [{value: 0, text: ''}];
    }
  }

  /* ********************* end of option functions - maintenance *********************************/


}
