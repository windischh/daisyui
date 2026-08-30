

/**
 * (static) global functions
 */

import { BEGIN, CATEGORIES, DESCRIPTION, DTEND, DTSTART, END, LF, LF_ZONED, LOCATION, SUMMARY, UID, VEVENT } from "./constants";

export class IcsFunctions {

  /**
   * icsToJson
   * cloned 2018-12-13 from npm ics-to-json ( which was lastModified 2018-11-04)
   * adapted to handle UTC and local dates probperly
   * // TODO TZID not supported yet
   *
   * @param icsData .ics file content as string
   * @return Array<any> where any is an EventObject
   *  can be string, number, Date or string array
   */

  static icsToJson (icsData: string): Array<any> {

    const NEW_LINE = /\r\n|\n|\r/;

    const EVENT = VEVENT;
    const EVENT_START = BEGIN;
    const EVENT_END = END;

    const START_DATE = DTSTART;
    const END_DATE = DTEND;
    // const DESCRIPTION = 'DESCRIPTION';
    // const SUMMARY = 'SUMMARY';
    // const LOCATION = 'LOCATION';

    const ALARM = 'VALARM';

    const VALUE_DATE = 'VALUE=DATE';

    const LOC = 'LOC=';


    // class definition to declare type of index - required by tslint in node ts
    class StringMap { [k: string]: any; };
    // keyMap contains all element types which can occur at a VEVENT
    const keyMap: StringMap  = {
      [START_DATE]: 'startDate',
      [END_DATE]: 'endDate',
      [DESCRIPTION]: 'description',
      [SUMMARY]: 'summary',
      [LOCATION]: 'location',
      [UID]: 'uid',
      [CATEGORIES]: 'categories'

    };

    // we do not unescape strings ...
    // we do not use trim - we want trailing spaces ...
    // const clean = (string: string)  => unescape(string).trim();
    const clean = (string: string)  => string.replaceAll(LF_ZONED, LF).replaceAll('\\' + ',', ',').replaceAll('\\' + ';', ';');

    class EventObject { [k: string]: string|number|Date|Array<string>; };

    let currentObj: EventObject = {};

    const array: Array<EventObject> = [];

    let lastKey = '';

    const lines = icsData.split(NEW_LINE);

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
        // in the moment we use second key part for checking VALUE=DATE ...
        // we store it anyway as seconfd key part
        keyPartScnd = keyParts[1];
      }

      // a line which has not 'KEY:value' and starts with a space ...
      // but here could be a : in text and then we have lineDate.length 2 ....
      if (lineData.length < 2) {
        if ((key.startsWith(' ') || key.substring(0,1) < '#20') && lastKey !== undefined && lastKey.length) {
          if (typeof currentObj[lastKey] === 'string' ) {
            let legacyString = currentObj[lastKey].toString();
            legacyString += line.substring(1);
            currentObj[lastKey] = clean(legacyString);
          }
        }
        continue;
      // a line can have a ' - but maybe part of text .....
      } else if (!(/^[A-Z][A-Z][A-Z]/.test(key) || key.startsWith('X-'))) {
        // this seems to be not not a vCalendar key ...
        // but to be sure we restrict on certain  keys ...
        if ([keyMap[SUMMARY], keyMap[DESCRIPTION], keyMap[LOCATION]].includes(lastKey)) {
          if (typeof currentObj[lastKey] === 'string' ) {
            let legacyString = currentObj[lastKey].toString();
            legacyString += line.substring(1);
            currentObj[lastKey] = clean(legacyString);
          }
        }
        continue;
      } else {
        lastKey = keyMap[key];
      }

      switch (key) {
        case EVENT_START:
          if (value === EVENT) {
            currentObj = {};
          }
          break;
        case EVENT_END:
          if (value === EVENT) {array.push(currentObj);}
          const message = 'event object: ';
          // console.log(message, currentObj);
          break;
        case START_DATE:
          let sd = this.iCalDateParser(currentObj, value);
          if (sd) {
            currentObj['startDateFormat'] = 3;
          } else if (keyPartScnd === VALUE_DATE) {
            sd = this.iCalDateParser(currentObj, value, 4);
            currentObj['startDateFormat'] = 4;
          } else {
            // we must look for UTC format anyway ....
            sd = this.iCalDateParser(currentObj, value, 1);
            if (sd) {
              currentObj['startDateFormat'] = 1;
            } else {
              sd = this.iCalDateParser(currentObj, value, 2);
              currentObj['startDateFormat'] = 2;
            }
          }
          if (sd) {
            currentObj[keyMap[START_DATE]] = sd;
          }
          break;
        case END_DATE:
          let ed = this.iCalDateParser(currentObj, value);
          if (ed) {
            currentObj['endDateFormat'] = 3;
          } else if (keyPartScnd === VALUE_DATE) {
            ed = this.iCalDateParser(currentObj, value, 4);
            currentObj['endDateFormat'] = 4;
          } else {
            // we must look for UTC format anyway ....
            ed = this.iCalDateParser(currentObj, value, 1);
            if (ed) {
              currentObj['endDateFormat'] = 1;
            } else {
              ed = this.iCalDateParser(currentObj, value, 2);
              currentObj['endDateFormat'] = 2;
            }
          }
          if (ed) {
            currentObj[keyMap[END_DATE]] = ed;
          }
          break;
        case DESCRIPTION:
          // console.log('description raw: ', value);
          // console.log('description cleaned: ', clean(value));
          currentObj[keyMap[DESCRIPTION]] = clean(value);
          break;
        case SUMMARY:
          currentObj[keyMap[SUMMARY]] = clean(value);
          break;
        case LOCATION:
          if (keyPartScnd.startsWith(LOC)) {
            currentObj['locType'] = keyPartScnd.substring(4);
          }
          // console.log('location cleaned: ', clean(value));
          currentObj[keyMap[LOCATION]] = clean(value);
          break;
        case UID:
          currentObj[keyMap[UID]] = clean(value);
          break;
        case CATEGORIES:
          currentObj[keyMap[CATEGORIES]] = clean(value).split(',');
          break;
        default:
          continue;
      }
    }

    return array;
  }

   /**
   * Parse a stringly typed iCal formatted date as a native JS date object
   * @param calobj: Object to check surroundings of date string - used only for debugging
   * @param string: date
   * @param format?: number 1 - iCal date, 2 - iCal without Z, 3 - ISO , 4 simple date without time
   * @return Date
   */
  // we use errCode in the moment only at debugging ...
  // iCalDateParser(date: string, format?: number): {retDate: Date; errCode: Array<number>} {
  static iCalDateParser(calobj: {}, date: string, format?: number): Date | null {

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



}
