import {  IContactElement } from '../_interfaces/i-contact-element';
import { ADR, BDAY, BEGIN, CATEGORIES, COMMA, EMAIL, END, EQUALS, FN, LF, LF_ZONED, N, NICKNAME, NOTE, ORG, PHOTO, PRODID, SEMICOLON, TEL, TITLE, TYPE, UID, URL, VCARD, VERSION } from './constants';


/**
 * (static) global functions
 */
export class VcfFunctions {

  /**
   * vcfToJson
   * derived from ocsToJson
   * // TODO TZID not supported yet
   *
   * @param vcfData .vcf file content as string
   * @return Array<any>  array og event objects with attributes as defined in keyMap
   *  with additional attributes:
   *  - some attributes have an array as atrributeElements
   *  - some attributes exitst multiple in form of an array
   *  - there is a numeric attribute birthdayFormet
   *  returns null if vCard is not recognized
   */

  static vcfToJson (vcfData: string): Array<any> | null {

    const NEW_LINE = /\r\n|\n|\r/;

    const CARD = VCARD;
    const CARD_START = BEGIN;
    const CARD_END = END;

    // defined in constants ....
    // const FN = 'FN';
    // const N = 'N';
    // const NICKNAME = 'NICKNAME';
    // const EMAIL = 'EMAIL';
    // const TEL = 'TEL';
    // const ADR = 'ADR';
    // const ORG = 'ORG';
    // const TITLE = 'TITLE';
    // const CATEGORIES = 'CATEGORIES';
    // const URL = 'URL';
    // const NOTE = 'NOTE';
    // const BDAY = 'BDAY';
    // const PHOTO = 'PHOTO';
    // const UID = 'UID';

    // not handled vcf tags:

    const VALUE_DATE = 'VALUE=DATE';


    /*
      parsing fo the various elements:
      	"BEGIN": noop,
        "VERSION": noop,
        "FN": singleLine,
        "N": structured(['surname', 'name', 'additionalName', 'prefix', 'suffix']),
        "NICKNAME": commaSeparatedLine,
        "EMAIL": typedLine,
        "TEL": typedLine,
        // ADR field sequence
                postOfficeBox: names[0],
                number: names[1],
                street: names[2] || '',
                city: names[3] || '',
                region: names[4] || '',
                postalCode: names[5] || '',
                country: names[6] || ''
        "ADR": addressLine,
        "ORG": singleLine,
         TITLE": singleLine,
        "CATEGORIES": commaSeparatedLine,
        "URL": singleLine,
        "NOTE": singleLine,
        "BDAY": dateLine,
        "PHOTO": singleLine
        "END": endCard,

    */

    // class definition to declare type of index - required by tslint in node ts
    class StringMap { [k: string]: any; };
    // keyMap contains all element types which can occur at a VCARD
    const keyMap: StringMap  = {
      [FN]: 'formattedName',
      [N]: 'name',
      [NICKNAME]: 'nickName',
      [EMAIL]: 'email',
      [TEL]: 'tel',
      [ADR]: 'address',
      [ORG]: 'organization',
      [TITLE]: 'title',
      [CATEGORIES]: 'categories',
      [URL]: 'url',
      [NOTE]: 'note',
      [BDAY]: 'birthday',
      [PHOTO]: 'photo',
      [UID]: 'uid',
      [VERSION]: 'vcardVersion',
      [PRODID]: 'vcardProdId'
    };


    // we do not unescape strings ...
    // we do not use trim - we want trailing spaces ...
    // const clean = (string: string)  => unescape(string).trim();
    const clean = (string: string)  => string.replaceAll(LF_ZONED, LF).replaceAll('\\' + ',', ',').replaceAll('\\' + ';', ';');


    // we do not type CardObject inside of this function correctly
    // and  we return it as any - calling procedure is not foreced to strict typing ...

    // class CardObject { [k: string]: string|number|Date|IContactElement|Array<IContactElement>; };

    class CardObject { [k: string]: any };

    let currentObj: CardObject = {};

    const elementsArray: Array<CardObject> = [];


    let lastKey = '';
    let type: string;

    if (vcfData?.toUpperCase().startsWith('BEGIN:VCARD')) {
      // file start sequence is ok
    } else {
      return null;
    }

    const lines = vcfData.split(NEW_LINE);

    // we splite each line in a key and value part ....
    for (let i = 0, iLen = lines.length; i < iLen; ++i) {
      const line = lines[i];
      const lineData = line.split(':');

      let key = lineData[0];
      let keyPartScnd = '';
      const value = lineData[1];

      if (key.indexOf(';') !== -1) {
        const keyParts = key.split(';');
        key = keyParts[0];
        // in the moment we use second key part for checking TYPE= (and VALUE=DATE ... at BDAY)
        // we store it anyway as seconfd key part
        keyPartScnd = keyParts[1];
      }

      // a line which has not 'KEY:value' and starts with a space ...
      // but here could be a : in text and then we have lineDate.length 2 ....
      if (lineData.length < 2) {
        if ((key.startsWith(' ') || key.substring(0,1) < '#20') && [keyMap[ORG], keyMap[NOTE]].includes(lastKey)) {
          if (typeof currentObj[lastKey] === 'string' ) {
            let legacyString: string = currentObj[lastKey].toString();
            legacyString += line.substring(1);
            currentObj[lastKey] = clean(legacyString);
          }
        } else if ((key.startsWith(' ') || key.substring(0,1) < '#20') && lastKey === keyMap[ADR]) {
          if (typeof currentObj[lastKey][currentObj[lastKey].length - 1].value === 'string' ) {
            let legacyString: string = currentObj[lastKey][currentObj[lastKey].length - 1].value;
            legacyString += line.substring(1);
            currentObj[lastKey][currentObj[lastKey].length - 1].value = clean(legacyString);
            currentObj[lastKey][currentObj[lastKey].length - 1].elementArray = this.sequenceParser(currentObj, clean(legacyString), SEMICOLON);
          }
        }
        continue;
      // a line can have a ' - but maybe part of text .....
      } else if (!(/^[A-Z][A-Z][A-Z]/.test(key)
        || key.startsWith('N')
        || key.startsWith('FN')
        || key.startsWith('TZ')
        || key.startsWith('item'))) {
        // this seems to be not not a vContact key ...
        // but to be sure we restrict on certain  keys ...
        if ([keyMap[ORG], keyMap[NOTE]].includes(lastKey)) {
          if (typeof currentObj[lastKey] === 'string' ) {
            let legacyString: string = currentObj[lastKey].toString();
            legacyString += line.substring(1);
            currentObj[lastKey] = clean(legacyString);
          }
        } else if (lastKey === keyMap[ADR]) {
          if (typeof currentObj[lastKey][currentObj[lastKey].length - 1].value === 'string' ) {
            let legacyString: string = currentObj[lastKey][currentObj[lastKey].length - 1].value;
            legacyString += line.substring(1);
            currentObj[lastKey][currentObj[lastKey].length - 1].value = clean(legacyString);
            currentObj[lastKey][currentObj[lastKey].length - 1].elementArray = this.sequenceParser(currentObj, clean(legacyString), SEMICOLON);
          }
        }
        continue;
      } else {
        lastKey = keyMap[key];
      }

      switch (key) {
        case CARD_START:
          if (value === CARD) {
            currentObj = {};
          }
          break;
        case CARD_END:
          if (value === CARD) {elementsArray.push(currentObj);}
          // we reset currentObj anyway ..
          currentObj = {};
          const message = 'card object: ';
          // console.log(message, currentObj);
          break;
        case FN:
          currentObj[keyMap[FN]] = clean(value);
          break;
        case N:
          let nameObj: IContactElement = {
            value: clean(value),
            elementArray: this.sequenceParser(currentObj, clean(value), SEMICOLON)
          }
          currentObj[keyMap[N]] = nameObj;
          break;
        case NICKNAME:
          let nickNameObj: IContactElement = {
            value: clean(value),
            elementArray: this.sequenceParser(currentObj, clean(value), SEMICOLON)
          }
          currentObj[keyMap[NICKNAME]] = nickNameObj;
          break;
        case EMAIL:
          if (keyPartScnd.startsWith(TYPE + EQUALS)) {
            type = keyPartScnd.substring((TYPE + EQUALS).length);
          } else {
            type = '';
          }
          let emailObj: IContactElement = {
            type,
            value: clean(value)
          }
          if (currentObj[keyMap[EMAIL]] && typeof currentObj[keyMap[EMAIL]] === "object" && currentObj[keyMap[EMAIL]].length > 0) {
            currentObj[keyMap[EMAIL]].push(emailObj);
          } else {
            const emailArray: Array<IContactElement> = [];
            emailArray[0] = emailObj;
            currentObj[keyMap[EMAIL]] = emailArray;
          }
          break;
        case TEL:
          if (keyPartScnd.startsWith(TYPE + EQUALS)) {
            type = keyPartScnd.substring((TYPE + EQUALS).length);
          } else {
            type = '';
          }
          let telObj: IContactElement = {
            type,
            value: clean(value)
          }
          if (currentObj[keyMap[TEL]] && typeof currentObj[keyMap[TEL]] === "object" && currentObj[keyMap[TEL]].length > 0) {
            currentObj[keyMap[TEL]].push(telObj);
          } else {
            const telArray: Array<IContactElement> = [];
            telArray[0] = telObj;
            currentObj[keyMap[TEL]] = telArray;
          }
          break;
        case ADR:
          if (keyPartScnd.startsWith(TYPE + EQUALS)) {
            type = keyPartScnd.substring((TYPE + EQUALS).length);
          } else {
            type = '';
          }
          let adrObj: IContactElement = {
            type,
            value: clean(value),
            elementArray: this.sequenceParser(currentObj, clean(value), SEMICOLON)
          }
          if (currentObj[keyMap[ADR]] && typeof currentObj[keyMap[ADR]] === "object" && currentObj[keyMap[ADR]].length > 0) {
            currentObj[keyMap[ADR]].push(adrObj);
            // array  already exists ,,,
          } else {
            const adrArray: Array<IContactElement> = [];
            adrArray[0] = adrObj;
            currentObj[keyMap[ADR]] = adrArray;
          }
          break;
        case ORG:
          currentObj[keyMap[ORG]] = clean(value);
          break;
        case TITLE:
          currentObj[keyMap[TITLE]] = clean(value);
          break;
        case CATEGORIES:
          let catObj: IContactElement = {
            value: clean(value),
            elementArray: this.sequenceParser(currentObj, clean(value), COMMA)
          }
          currentObj[keyMap[CATEGORIES]] = catObj;
          break;
        case URL:
          currentObj[keyMap[URL]] = clean(value);
          break;
        case NOTE:
          currentObj[keyMap[NOTE]] = clean(value);
          break;
        case BDAY:
          let bd = this.vcfDateParser(currentObj, value);
          if (bd) {
            currentObj['birthdayFormat'] = 3;
          } else if (keyPartScnd === VALUE_DATE) {
            bd = this.vcfDateParser(currentObj, value, 4);
            currentObj['birthdayFormat'] = 4;
          } else {
            // we must look for UTC format anyway ....
            bd = this.vcfDateParser(currentObj, value, 1);
            if (bd) {
              currentObj['birthdayFormat'] = 1;
            } else {
              bd = this.vcfDateParser(currentObj, value, 2);
              currentObj['birthdayFormat'] = 2;
            }
          }
          currentObj[keyMap[BDAY]] = bd;
          break;
        case PHOTO:
          currentObj[keyMap[PHOTO]] = clean(value);
          break;
        case UID:
          currentObj[keyMap[UID]] = clean(value);
          break;
        case VERSION:
          currentObj[keyMap[VERSION]] = clean(value);
          break;
        case PRODID:
          currentObj[keyMap[PRODID]] = clean(value);
          break;
        default:
          // console.log('undefined vcf key: ', key);
          if (currentObj) {
            if (currentObj['undefinedKey'] && typeof currentObj['undefinedKey'] === "object" && currentObj['undefinedKey'].length > 0) {
              currentObj['undefinedKey'].push({key, value: clean(value)});
              // array  already exists ,,,
            } else {
              const undefinedArray: Array<{key: string,  value: any}> = [];
              undefinedArray[0] = {key, value: clean(value)};
              currentObj['undefinedKey'] = undefinedArray;
            }
          }
          continue;
      }
    }
    return elementsArray;
  }

  /**
   * Parse a stringly typed iCal formatted date as a native JS date object
   * @param calobj: Object to check surroundings of date string - used only for debugging
   * @param string: date
   * @param format?: number 1 - iCal date, 2 - iCal without Z, 3 - ISO , 4 simple date without time
   * @return Date or null
   */
  // we use errCode in the moment only at debugging ...
  // vcfDateParser(date: string, format?: number): {retDate: Date; errCode: Array<number>} {
  static vcfDateParser(calobj: {}, date: string, format?: number): Date | null {

    const T_INDEX_ICAL = 8;
    const Z_INDEX_ICAL = 15;
    const LENGTH_ICAL = 16;

    const T_INDEX_ISO = 10;
    const Z_INDEX_ISO = 23;
    const LENGTH_ISO = 24;
    const S_INDEX1_ISO = 4;
    const S_INDEX2_ISO = 7;
    const D_INDEX1_ISO = 13;
    const D_INDEX2_ISO = 16;
    const P_INDEX_ISO = 19;

    const LENGTH_SIMPLE = 8;


    let tIndex = -1;
    let zIndex = -1;
    let length = -1;
    let sIndex1 = -1;
    let sIndex2 = -1;
    let dIndex1 = -1;
    let dIndex2 = -1;
    let pIndex = -1;
    let year: number, month: number, day: number, hour: number, minute: number , second: number;

    // default format is 3
    if (!format || format < 1 || format > 4) {
      format = 3;
    }

    switch (format) {
      case 1:
        // iCal Format (UTC)
        tIndex = T_INDEX_ICAL;
        zIndex = Z_INDEX_ICAL;
        length = LENGTH_ICAL;
        break;
      case 2:
        // iCal Format without Z (local timezone)
        tIndex = T_INDEX_ICAL;
        length = LENGTH_ICAL - 1;
        break;
      case 3:
        // ISO 8601 Format
        tIndex = T_INDEX_ISO;
        zIndex = Z_INDEX_ISO;
        length = LENGTH_ISO;
        sIndex1 = S_INDEX1_ISO;
        sIndex2 = S_INDEX2_ISO;
        dIndex1 = D_INDEX1_ISO;
        dIndex2 = D_INDEX2_ISO;
        pIndex =  P_INDEX_ISO;
        break;
      case 4:
        // simple date format yyyymmdd without time
        length = LENGTH_SIMPLE;
        break;
      default:
        // there is no default procedure - we assure defined format
    }
    const valid: number = _validateFormat(date);
    if (valid !== 0) {
      // debugging validation errors
      // console.log('invalid date format: ', valid, ' for dateString: ', date, ' format: ', format);
      // console.log('at object: ', calobj);
      return null;
    }

    if (format === 1) {
    // this structure conforms to format 1 - iCal Format
      year = parseInt(date.substr(0, 4), 10);
      month = parseInt(date.substr(4, 2), 10) - 1;
      day = parseInt(date.substr(6, 2), 10);
      hour = parseInt(date.substr(9, 2), 10);
      minute = parseInt(date.substr(11, 2), 10);
      second = parseInt(date.substr(13, 2), 10);
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    if (format === 2) {
      // this structure conforms to format 2 - iCal Format without ending Z
      year = parseInt(date.substr(0, 4), 10);
      month = parseInt(date.substr(4, 2), 10) - 1;
      day = parseInt(date.substr(6, 2), 10);
      hour = parseInt(date.substr(9, 2), 10);
      minute = parseInt(date.substr(11, 2), 10);
      second = parseInt(date.substr(13, 2), 10);
      return new Date(year, month, day, hour, minute, second);
    }

    if (format === 3) {
    // this structure conforms to format 3 - ISO 8601 Format
    // we assume UTC date ....
      year = parseInt(date.substr(0, 4), 10);
      month = parseInt(date.substr(5, 2), 10) - 1;
      day = parseInt(date.substr(8, 2), 10);
      hour = parseInt(date.substr(11, 2), 10);
      minute = parseInt(date.substr(14, 2), 10);
      second = parseInt(date.substr(17, 2), 10);
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    if (format === 4) {
      // this structure conforms to format 4 - simple format yyyymmdd
      year = parseInt(date.substring(0, 4), 10);
      month = parseInt(date.substring(4, 6), 10) - 1;
      day = parseInt(date.substring(6, 8), 10);
      return new Date(year, month, day);
    }

    return null;


    /**
     * Check whether or not a given date is a valid iCal formatted date
     * that means at format 1 (iCal): yyyyMMddThhmmssZ
     * @param string: d
     * @return number: errorcode
     */
    function _validateFormat(d: string): number {
      // debugger;
      const dArray = d.split('');

      if (dArray.length !== length) {return 101;}
      if (tIndex !== -1 && dArray[tIndex] !== 'T') {return 102;}
      if (zIndex !== -1 && dArray[zIndex] !== 'Z') {return 103;}
      if (sIndex1 !== -1 && dArray[sIndex1]  !== '-' ) {return 104;}
      if (sIndex2 !== -1 && dArray[sIndex2]  !== '-' ) {return 105;}
      if (dIndex1 !== -1 && dArray[dIndex1]  !== ':' ) {return 106;}
      if (dIndex2 !== -1 && dArray[dIndex2]  !== ':' ) {return 107;}
      if (pIndex !== -1 && dArray[pIndex]  !== '.' ) {return 108;}

      // every character except T,Z must be numeric then we return true
      if (dArray
        .filter((x, i) => i !== tIndex
        && i !== zIndex
        && i !== sIndex1
        && i !== sIndex2
        && i !== dIndex1
        && i !== dIndex2
        && i !== pIndex)
        .every(x => !isNaN(parseInt(x, 10)))) {return 0; } else {return 109; }
    }

  }

  /**
   * Parse a sequence (string) and return array of  elemenzs
   * @param vcfobj: Object to check surroundings of sequence  string - used only for debugging
   * @param sequence: string
   * @param delimiter:string
   * @return array of  fields
   */
  static sequenceParser(vcfobj: {}, sequence: string, delimiter :string): Array<string> {
    let elements: Array<string> = [];

    elements = sequence.split(delimiter);

    return elements;


  }



}
