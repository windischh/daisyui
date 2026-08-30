import { OptionType } from '../_enums/option-type.enum';
import { ConfigurationOption } from '../_db/configuration-option';


/*
  static functions for option handling
*/
export class ConfigurationOptionBasicFunctions {

  /**
   *
   * @param area area of configuration - options are grouped in areas for maintenance reason,
   *    though each option is identified only by name
   * @param style style (00 - 99) in style-structured options
   * @param optionGroup group in style-structured options
   */
  static getOptionKey (area: string, style: number, optionGroup: number): string {
    return  area +  '_'
    + '0'.concat(style.toString()).substr((style).toString().length - 1, 2) + '_'
    + '000'.concat(optionGroup.toString()).substr((optionGroup).toString().length - 1, 4) + '_';
  }


  /******************************* configuration (option) getters for simple options start here *****************/

  /**
   * check if option exists
   * @param options option array (as loaded in auth)
   * @param optionName name of option we search for
   * @returns true if option exsits
   */
  static getOptionExists(options: ConfigurationOption[], optionName: string): boolean {
    if (options) {
      const option = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (option) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * returns id of  option
   * @param options option array (as loaded in auth)
   * @param optionName name of option we search for
   * @returns optionId
   */
  static getOptionId(options: ConfigurationOption[], optionName: string): number | null{
    if (options) {
      const option = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (option) {
        return option.optionId;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * we get string value of an option - option is checked if it is from string type
   * (types 11 to 19 = stringValueChoice, string sequences are also string types)
   *
   * @param options option array (as loaded in auth)
   * @param optionName name of the option, usually 'opt_....'
   * @returns string value
   */
  static getOptionString(options: ConfigurationOption[], optionName: string): string | null {
    if (options) {
      const stringOption = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (stringOption && (stringOption.type === OptionType.string
        || (Math.floor(stringOption.type / 10) * 10 ) === 10)) {
        return stringOption.optionStringValue;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * returns boolean option
   * @param options option array (as loaded in auth)
   * @param optionName name of option we search for
   * @returns boolean value
   */
  static getOptionBoolean(options: ConfigurationOption[], optionName: string): boolean | null {
    if (options) {
      const booleanOption = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (booleanOption && booleanOption.type === OptionType.boolean) {
        return booleanOption.optionBooleanValue === 1 ? true : false;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * returns int option
   * @param options option array (as loaded in auth)
   * @param optionName name of option we search for
   * @returns numeric value
   */
  static getOptionInt(options: ConfigurationOption[], optionName: string): number | null {
    if (options) {
      const intOption = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (intOption && (intOption.type === OptionType.int
        || intOption.type === OptionType.intValueChoice
        || intOption.type === OptionType.styleChoice)) {
        return intOption.optionIntValue;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * returns date option
   * @param options option array (as loaded in auth)
   * @param optionName name of option we search for
   * @returns Date
   */
  static getOptionDate(options: ConfigurationOption[], optionName: string): Date | null {
    if (options) {
      const dateOption = options.filter(_ => _.optionName.startsWith(optionName))[0];
      if (dateOption && (dateOption.type === OptionType.date)) {
        return dateOption.optionDateValue;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }



  /******************************* configuration (option) getters for style-structured options start here *****************/

  static getStyleOptionSeq(options: ConfigurationOption[], area: string, style: number,
    optionGroup: number, isStyleHasDefault?: boolean, isStyleIsDefault?: boolean): Array<Array<string>> | null {
    if (options) {
      const pairedOptions: Array<Array<string | null>> = [];
      const optionNameKey = this.getOptionKey(area, style, optionGroup);
      for (const o of options.filter(option => option.optionName.startsWith(optionNameKey))) {
        // optionName starts with optionNameKey, followed by name part of the style
        const optionNameStyle = o.optionName.substring(o.optionArea.length + 9);
        const pairedOption = [optionNameStyle, o.optionStringValue];
        pairedOptions.push(pairedOption);
      }
      if (pairedOptions.length === 0 && isStyleHasDefault && !isStyleIsDefault) {
        return this.getStyleOptionSeqDefault(options, area, style, optionGroup);
      } else if (pairedOptions.length === 0 ) {
        return null;
      } else {
        return Object.fromEntries(pairedOptions);
      }
    } else {
      return null;
    }
  }

  static getStyleOptionSeqDefault(options: ConfigurationOption[], area: string, style: number, optionGroup: number): Array<Array<string>> | null  {
    const optionGroupDefault = Math.floor(optionGroup / 100) * 100;
    return this.getStyleOptionSeq(options, area, style, optionGroupDefault, false, true);
  }

  static getStyleOptionString(options: ConfigurationOption[], area: string,  style: number,
    optionGroup: number, isStringHasDefault?: boolean, isStringIsDefault?: boolean): string | null {
    if (options) {
      const optionNameKey = this.getOptionKey(area, style, optionGroup);
      let stringOption = '';
      let optionsCount = 0;

      for (const o of options.filter(option => option.optionName.startsWith(optionNameKey))) {
        if (o.type === OptionType.string
        || (Math.floor(o.type / 10) * 10 ) === 10) {
          stringOption += ' ' + o.optionStringValue;
          optionsCount++;
          }
      }

      if (optionsCount === 0 && isStringHasDefault && !isStringIsDefault) {
        return this.getStyleOptionStringDefault(options, area, style, optionGroup);
      } else if (optionsCount === 0 ) {
        return null;
      } else {
        return stringOption.trim();
      }

    } else {
      return null;
    }

  }

  static getStyleOptionStringDefault(options: ConfigurationOption[], area: string, style: number, optionGroup: number): string | null {
    const optionGroupDefault = Math.floor(optionGroup / 100) * 100;
    return this.getStyleOptionString(options, area, style, optionGroupDefault, false, true);
  }

  static getStyleOptionBoolean(options: ConfigurationOption[], area: string, style: number, optionGroup: number): boolean | null {
    if (options) {
      const optionNameKey = this.getOptionKey(area, style, optionGroup);
      const booleanOption = options.filter(_ => _.optionName.startsWith(optionNameKey))[0];
      if (booleanOption && booleanOption.type === OptionType.boolean) {
        return booleanOption.optionBooleanValue === 1 ? true : false;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // int options for styles are int and intValueChoice - style choice cannot be selected
  // (we can not bind style to an option in another style)
  static getStyleOptionInt(options: ConfigurationOption[], area: string, style: number, optionGroup: number): number | null {
    if (options) {
      const optionNameKey = this.getOptionKey(area, style, optionGroup);
      const intOption = options.filter(_ => _.optionName.startsWith(optionNameKey))[0];
      if (intOption && (intOption.type === OptionType.int
        || intOption.type === OptionType.intValueChoice)) {
        return intOption.optionIntValue;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /******************************* end of  (option) getters  *****************/


}
