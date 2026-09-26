import { MAX_INTERVAL_LENGTH, DEFAULT_TIME_SLIZE, DEFAULT_TIME_ZONE_IDENTIFIER } from './constants';

import { Text } from '../_db/text';
import { Event } from '../_db/event';
import { Provider } from '../_db/provider';

import { HolidaysAustria } from '../_enums/holidays-austria.enum';
import { Holidays } from '../_enums/holidays.enum';
import { Language } from '../_enums/language.enum';
import { ProviderType } from '../_enums/provider-type.enum';

import { ISortElement } from '../_interfaces/i-sort-element';
import { IHoliday } from '../_interfaces/i-holiday';
import { IMapMarker } from '../_interfaces/i-map-marker';


/**
 * (static) global functions
 */

export class GlobalFunctions {

  // here we have release of our app to be checked against /assets/releases ...
  static release = 101;

  /** --------------------------  auth functions -------------------------------------------- */

  static buildAuthorizationString(provider: Provider, login: string, password: string): string {
    let auth: string;
    if (provider?.type === ProviderType.jira) {
      // in case of jira user has to enter api token as password
      const auth =  login + ':' + password;
      const basicAuth = 'Basic ' + GlobalFunctions.base64Encode(auth);
      // console.log('basicAuth: ', basicAuth);
      return basicAuth;
    } else {
      return '';
    }

  }


  /**
   * default language is set language of LOCALE_ID as set in angular app.module
   * languages which are defineed in language enum must have according system texts
   * @param locale locale string, such as 'en-US'
   * @returns default language according to languagae enum as number value
   */
  static getDefaultLanguage(locale: string): number {
    let defaultLanguage: number;
    switch (true) {
      case (locale && (locale.substring(0,3).toLowerCase() === 'ger'
      || locale.substring(0,3).toLowerCase() === 'deu'
      || locale.substring(0,2).toLowerCase() === 'de')):
        defaultLanguage = Language.DE;
        break;
      default:
        defaultLanguage = Language.EN;
        break;
    }
    return defaultLanguage;
  }

  /** --------------------------  location functions -------------------------------------------- */

  /**
   * get location as latitude, longitude, optional altitude
   * from a location string
   * @param locationString  string with location
   * @returns location as tuple (0,0,0 is returend when locationString does not contain a valifd location)
   */
  static getLocation(locationString: string): [number, number, number?] {
    // let location: [latitude: number, longitude: number, altitude?: number];
    const locationElements = locationString.split(',');
    if (locationElements?.length > 1) {
      const lat = Number(locationElements[0]);
      const long = Number(locationElements[1]);
      if ( locationElements?.length > 2) {
        const alt = Number(locationElements[2]);
        if (alt !== 0) {
          return [lat, long, alt];
        }
      }
      // if we got no alt, one of lat and long must not be 0
      if (lat !== 0 || long !== 0) {
        return [lat, long];
      }

    }
    return [0, 0, 0];
  }

  static isLatitudeOk(latitude: number): boolean {
    return !isNaN(latitude) && latitude <= 90 && latitude >= -90;
  }

  static isLongitudeOk(longitude: number): boolean {
    return !isNaN(longitude) && longitude <= 180 && longitude >= -180;
  }


  // degree to radians
  static deg2Rad( degree: number ): number {
    return degree * Math.PI / 180;
  }

  /**
   * get distance in km
   * from 2 location tuples (latiitude and longitude degrees)
   * @param location1
   * @param location2
   * @returns distance in km as number
   */
  static getDistance(location1: [number, number, number?], location2: [number, number, number?]): number {
    const [lat1, long1, alt1] = location1;
    const [lat2, long2, alt2] = location2;
    if (this.isLatitudeOk(lat1) && this.isLatitudeOk(lat2) && this.isLongitudeOk(long1) && this.isLongitudeOk(long2) ) {
      const radLat1 = this.deg2Rad(lat1);
      const radLat2 = this.deg2Rad(lat2);
      const radLong1 = this.deg2Rad(long1);
      const radLong2 = this.deg2Rad(long2);
      // r is the earth radius
      const r = 6371; // km
      const x = (radLong2 - radLong1) * Math.cos((radLat1 + radLat2)/2);
      const y = (radLat2 - radLat1);
      const distance = Math.sqrt(x*x + y*y) * r;
      return distance;
    }
    return 0;
  }


  /**
   * get map center of af list of map positions (markers)
   * @param markers: Array of locations
   * @returns center location [0, 0, 0] in case of empty markers list
   */
  static getMapCenter(markers: Array<IMapMarker>): [number, number, number?] {
    let center: [number, number, number?] = [0, 0, 0];
    if (markers.length > 0) {
      if (markers.length === 1) {
        // we set center rounded position of only marker  ...
        center = [(Math.floor(markers[0].marker[0] * 10) + Math.floor(markers[0].marker[0] * 10 + 1)) / 20, (Math.floor(markers[0].marker[1] * 10) + Math.floor(markers[0].marker[1] * 10 + 1)) / 20];
      } else {
        let long = 0;
        let lat = 0;
        markers.forEach(_ => {long += _.marker[0]; lat += _.marker[1]});
        center = [long/markers.length, lat/markers.length];
        // console.log('simpleCenter', center);
        const markersLeft: Array<IMapMarker> = this.clone(markers);
        // we forsee max 9999 iterations
        for (let i = 1; i < 9999 && markersLeft.length > 1; i++) {
          // markersMap is an array of routes, where each route has a start and end location
          let markersMap: Array<[[number, number, number?], [number, number, number?]]> = [];
          for (const m of markersLeft) {
            // we build a map containing route to self and each route twice - this does not matter because we just search for longest distance ,
            for (const n of markersLeft) {
              markersMap.push([m.marker, n.marker]);
            }
          }
          // sorting longest distance first
          markersMap = markersMap.sort((a, b) => this.getDistance(b[1], b[0]) - this.getDistance(a[1], a[0]));
          const location1 = [markersMap[0][0][0], markersMap[0][0][1]];
          const location2 = [markersMap[0][1][0], markersMap[0][1][1]];
          const newPosition: [number, number, number?] = [(location1[0] + location2[0])/2, (location1[1] + location2[1])/2];
          // we delete the two positions which route has longest distance
          const ixLocation1 = markersLeft.findIndex(_ => _.marker[0] === location1[0] && _.marker[1] === location1[1]);
          if (ixLocation1 >= 0) markersLeft.splice(ixLocation1, 1);
          const ixLocation2 = markersLeft.findIndex(_ => _.marker[0] === location2[0] && _.marker[1] === location2[1]);
          if (ixLocation2 >= 0) markersLeft.splice(ixLocation2, 1);
          // we insert new position which is at half way between deleted positions
          markersLeft.push({marker: newPosition});
        }
        center = markersLeft[0].marker;
        // console.log('advancedCenter', center);
      }
    }
    return center;
  }


  /**
   * get zoom level for open street map
   * @param center location of map center
   * @param markers: Array of locations which should be shown on map
   * @returns zoom level as number 0 - 18
   */
  static getMapZoomLevel(markers: Array<IMapMarker>, center?: [number, number, number?]): number {
    if (markers?.length > 0) {
      // if no center a virtual center is deined as center of markers
      if (center && center[0] >= -180 && center[0] <= 180 && center[1] >= -89 && center[1] <= 89 ) {
        // ok, we accept latitude until 100 km from north or south pole
      } else {
        center = this.getMapCenter(markers);
      }
      // maximum of distances to center
      let dist = markers.map(_ => this.getDistance(center!, _.marker))
      .reduce((prev, _) => prev < _ ? _ : prev, 0);
      // maximum of vertical distances to center
      const verticalDist = markers.map(_ => this.getDistance(center!, [_.marker[0], center![1]] ))
      .reduce((prev, _) => prev < _ ? _ : prev, 0);
      // we use double of vertical distance max if this is greater than distance ...
      if (verticalDist*2 > dist) dist = verticalDist*2;
      // r is the earth radius
      const r = 6371; // km
      let maxDist = 2*r*Math.PI;
      for (let level = 0; level < 18; level++) {
        maxDist = maxDist/2;
        if (dist > maxDist) return level;
      }
      // dist is too small (for example: center and 1 markes which is center ...)
      return 18;
    }
    // default level 8
    return 8;
  }

  /** --------------------------  event (calendar) functions -------------------------------------------- */

  /**
   * isEventIntervalOk returns true if interval is between minLength and maxLength
   *  and is a multiple of timeSlize
   * @param from eventBegin as Date object
   * @param to eventEnd as Date object
   * @param timeSlize in minutes
   * @param minIntervalLength in minutes
   * @param maxIntervalLength in minutes
   * @param isTimeSlizeInterval if true timeSlize parameter can be 5, 10, 15, 20, 30, 60
   *  and is set to 5 if not conforming
   *
   */
  static isEventIntervalOk(from: Date, to: Date, timeSlize: number, minIntervalLength: number,
    maxIntervalLength: number, isTimeSlizeInterval?: boolean): boolean {
    // max length is a multiple of 60, <= system max length

    let maxLength = MAX_INTERVAL_LENGTH;
    if (maxIntervalLength && maxIntervalLength % 60 === 0 && maxIntervalLength <= maxLength) {
      maxLength = maxIntervalLength;
    }
    // timeSlize between 5 minutes and 60 minutes, multiple of 5 and divisor of 60
    if (isTimeSlizeInterval && !(timeSlize && timeSlize % 5 === 0 && 60 % timeSlize === 0)) {
      timeSlize = DEFAULT_TIME_SLIZE;
    }

    let minLength = timeSlize;
    // min length multiple of timeSlize, <= max length
    if (minIntervalLength && minIntervalLength % timeSlize === 0 && minIntervalLength <= maxLength) {
      minLength = minIntervalLength;
    }

    const f = GlobalFunctions.getYMDHM(from) ?? 0;
    const t = GlobalFunctions.getYMDHM(to) ?? 0;
    const isOkMinLength = f + minLength <= t;
    const isOkMaxLength = f + maxLength >= t;
    const isOkTimeSlize = (t - f) % timeSlize === 0;
    return (isOkMinLength && isOkMaxLength && isOkTimeSlize);

  }

  /**
   * isEventMinutesOk returns true if minutes conforms to timeSlize
   * @param mm minutes
   * @param timeSlize in minutes
   */
  static isEventMinutesOk(mm: number, timeSlize: number): boolean {
     // timeSlize between 5 minutes and 60 minutes, multiple of 5 and divisor of 60
     if (!(timeSlize && timeSlize % 5 === 0 && 60 % timeSlize === 0)) {
      timeSlize = DEFAULT_TIME_SLIZE;
    }

    return mm % timeSlize === 0;
  }

  /**
   * calcTimeRounded calculates a rounded eventTime as timeRounded
   * @param timeEvented raw time duration of event (length of interval)
   * @param minTime might be 0 - if > 0, then timeRounded has at least this minimal length
   * @param roundTimeSlize might be 0 - if > 0, time over minimal length is rounded to a multiple of roundTimeSlize
   * @param maxTime might be 0 - if > 0, timeRounded is limited by maxTime
   */
  static calcTimeRounded(timeEvented: number, minTime: number, roundTimeSlize: number, maxTime: number): number {
    let timeRounded = 0;
    if (timeEvented > 0) {
      timeRounded = minTime;
      if (timeEvented  > minTime) {
        if (roundTimeSlize > 0) {
          const slizesOverMin = Math.floor((timeEvented - minTime - 1) / roundTimeSlize) + 1;
          const timeOverMin = slizesOverMin * roundTimeSlize;
          timeRounded += timeOverMin;
        } else {
          timeRounded = timeEvented;
        }
        if (timeRounded > maxTime && maxTime > 0) {
          timeRounded = maxTime;
        }
      }
    }
    return timeRounded;
  }


  /**
   * build holidays according to locale
   * @param locale locale string, such as 'en-US'
   * @returns default language according to languagae enum as number value
   */
  static buildHolidays(locale: string, rangeBegin: Date, rangeEnd: Date): Array<IHoliday> {
    let holidays: Array<IHoliday> = [];
    let holidaysEnum: {[key: string | number]: any };
    switch (true) {
      case (locale.substring(locale.indexOf('-')).substring(1,3).toUpperCase() === 'AT'):
        holidaysEnum = HolidaysAustria;
        break;
      default:
        holidaysEnum = Holidays;
        break;
    }
    // we iterate through holiday enum and push an IHoliday entry for each enum entry
    for (let year = rangeBegin.getFullYear(); year <= rangeEnd.getFullYear(); year++) {
      holidays = holidays.concat(Object.keys(holidaysEnum)
      .filter((k: any) => typeof holidaysEnum[k] === 'number')
      .map(_ => {
        const easter = GlobalFunctions.getEaster(new Date(year, 0, 1));
        let holidayDate: Date;
        // holidaysEnum[_] has holiday date in form of mmdd for fixed holidays
        if (holidaysEnum[_] < 8000) {
          holidayDate = new Date(year, (holidaysEnum[_] - holidaysEnum[_]  % 100) / 100 - 1, holidaysEnum[_]  % 100);
        // easter dependent holidays have 9000 for easter sunday ....
        } else {
          holidayDate =  GlobalFunctions.addDays(easter, holidaysEnum[_]  % 1000);
        }
        let element: IHoliday = {holidayText: _, holidayDate};
        return element;
      }));
    }
    return holidays.filter(_ => GlobalFunctions.getDateInMinutes(_.holidayDate) > GlobalFunctions.getDateInMinutes(rangeBegin)
    && GlobalFunctions.getDateInMinutes(_.holidayDate) <= GlobalFunctions.getDateInMinutes(rangeEnd));
  }

  /**
   * returns event array built from events
   * although they might include only events on calendarDay including event from day before ending on calendarDay
   *  and first event of next day
   *  we assure this by filtering and sorting
   *
   * @param events array of events
   * @param calendarDay
   * @param isPreviousEvent - include event at previous day which reaches on today
   * @param nextEvent - include first event on next day
   */
   static buildEvents(events: Event[],  calendarDay: Date, isPreviousEvent: boolean, isNextEvent: boolean): Event[] | null {
    let dailyEvents: Array<Event>;
    // we take all events in range except "dayStartCard" - which has eventBegin === eventEnd
    if (events?.length > 0) {
      // we do not need to use array prototype here ...
      // Array.prototype.push.apply(allEvents, events.filter(_ => (
      dailyEvents = events.filter(_ =>
        ((isPreviousEvent === true && GlobalFunctions.isMinuteEarlier(GlobalFunctions.addDays(calendarDay, -1), _.eventBegin) && GlobalFunctions.isMinuteEarlier(_.eventBegin, calendarDay) && GlobalFunctions.isMinuteSameOrEarlier(calendarDay, _.eventEnd))
        ||
        GlobalFunctions.isMinuteSameOrEarlier(calendarDay, _.eventBegin) && GlobalFunctions.isMinuteEarlier(_.eventBegin, GlobalFunctions.addDays(calendarDay, 1) ))
        && (_.eventBegin < _.eventEnd)
      );
      const nextEvent = GlobalFunctions.getNextEvent(events, GlobalFunctions.addDays(calendarDay, 1), GlobalFunctions.addDays(calendarDay, 2));
      if (isNextEvent === true && nextEvent) {
        dailyEvents.push(nextEvent);
      }
      return dailyEvents.sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
    } else {
      return null;
    }
  }

  /**
   * we get the next eventBegin for given date
   *  (event  can begin at minute of given date to be a valid next event)
   *
   * @param events array of events which are searched in
   * @param searchDate start date (time) for search
   * @param untilDate optional end date for search (restricts end of search array)
   */
   static getNextEvent (events: Array<Event>, searchDate: Date, untilDate?: Date): Event | null {
    if (events?.length > 0) {
      const filtered = events.filter(event => {
        // next event can start direct at minute of search date
        return (GlobalFunctions.isMinuteSameOrEarlier(searchDate, event.eventBegin)
          && (untilDate ? GlobalFunctions.isMinuteSameOrEarlier(event.eventBegin, untilDate) : true)
        );
      // sort ascending to get the first event
      }).sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime())[0];
      return filtered;
    } else return null;
  }

   /**
   * we get the  prevoius event which starts before the minute of a given search date
   * (attention - resulting event could  overlap the search date!!)
   *
   * @param events array of events which are searched in
   * @param searchDate  date (time) for search
   * @param fromDate optional start date for search (restricts begin of search array)
   */
  static getPreviousEvent (events: Array<Event>, searchDate: Date, fromDate?: Date): Event | null  {
    if (events?.length > 0) {
      return events.filter(event => {
        // previous event must begin earlier than search date
        return (GlobalFunctions.isMinuteEarlier(event.eventBegin, searchDate)
          && (fromDate ? GlobalFunctions.isMinuteSameOrEarlier(fromDate, event.eventBegin) : true)
        );
      // sort descending to get the last event
      }).sort((a, b) => b.eventBegin.getTime() - a.eventBegin.getTime())[0];
    } else return null;
  }

  /**
   * getSpaceBefore returns free space (in minutes) before event
   *  tries to find last event before eventBegin - if there is none, spaceBefore is interval from  calendarDay
   *  returns 0 if eventBegin is alread overlapped by another event which is not event with eventId
   * @param eventBegin - we take this as begin for which spaceBefore is calculated
   * @param events array of events (assumed all events of calendarDay including events of previous day
   *  reaching in this eventday)
   * @param calendarDay - should be start of this calendarDay
   * @param eventId - event with this id is excluded from before-calculation. Used if we just are editing a eventBegin
   *  of an existing event which might be recognized as event before. We need not exclude a event which begins just at given eventBegin
   *
   */
   static getSpaceBefore(eventBegin: Date, events: Array<Event>, calendarDay: Date, eventId?: number): number {
    if (calendarDay?.getTime() > 0 && eventBegin?.getTime() >= calendarDay.getTime()) {
      let endBefore: Date;
      let ixBefore : number = 0;
      let filtered: Event[] = [];
      if (events?.length > 0) {
        // we build a local of events array, filtered anyway, to sort in ascending order
        filtered = events.filter(_ => _.eventId !== eventId)
        .sort((a, b) => a.eventBegin.getTime() - b.eventBegin.getTime());
        // we search index of record which ends before eventBegin - and record must not be that with eventId
        filtered.forEach((w, index) => {
          if (w.eventBegin.getTime() < eventBegin.getTime() && w.eventEnd.getTime() >= eventBegin.getTime()) {
            // there is a event element which overlaps given eventBegin and is NOT the event with given eventId
            ixBefore = -1;
          }
          if (w.eventEnd.getTime() <= eventBegin.getTime()) {
            ixBefore = index;
          }
        });
      }
      // have we found a record before?
      if (ixBefore === -1) {
        return 0;
      } else if (ixBefore >= 0) {
        endBefore = filtered[ixBefore].eventEnd;
      } else {
        endBefore = calendarDay;
      }
      return GlobalFunctions.getDateInMinutes(eventBegin) - GlobalFunctions.getDateInMinutes(endBefore);
    } else {
      return 0;
    }
  }

  /**
   * getSpaceAfter returns free space (in minutes) after event
   *  tries to find first event after eventEnd - if there is none,
   *  spaceAfter is interval until start of next calendarDay + MAX_INTERVAL_LENGTH
   * @param eventEnd - we take this as end for which spaceAfter is calculated
   * @param events array of events (assumed all events of calendarDay  and events of next day
   * - especially starting before MAX_INTERVAL_LENGTH after midnight)
   * @param calendarDay - should be start of this calendarDay
   * @param eventId  - event with this id is excluded in after-calculation. We need not exclude a event which ends just at given eventEnd
   *
   */
  static getSpaceAfter(eventEnd: Date, events: Array<Event>, calendarDay: Date, eventId?: number): number {
    if (calendarDay?.getTime() > 0 && eventEnd?.getTime() >= calendarDay.getTime()) {
      let beginAfter: Date;
      let ixAfter : number = 0;
      let filtered: Event[] = [];
      if (events?.length > 0) {
        // we build a local of events array, filtered anyway, to sort in descending order
        filtered = events.filter(_ => _.eventId !== eventId)
        .sort((a, b) => b.eventBegin.getTime() - a.eventBegin.getTime());
        // we search index of record which starts after eventEnd - and record must not be that with eventId
        filtered.forEach((w, index) => {
          if (w.eventBegin.getTime() <= eventEnd.getTime() && w.eventEnd.getTime() > eventEnd.getTime()) {
            // there is a event element which overlaps given eventEnd and is NOT the event with given eventId
            ixAfter = -1;
          }
          if (w.eventBegin.getTime() >= eventEnd.getTime()) {
            ixAfter = index;
          }
        });
      }
      // have we found a record after?
      if (ixAfter== -1) {
        return 0;
      } else if (ixAfter >= 0) {
        beginAfter = filtered[ixAfter].eventBegin;
      } else {
        beginAfter = GlobalFunctions.addMinutes(calendarDay, 24 * 60 + MAX_INTERVAL_LENGTH);
      }
      return  GlobalFunctions.getDateInMinutes(beginAfter) - GlobalFunctions.getDateInMinutes(eventEnd);
    } else {
      return 0;
    }

  }


  /**
  * returns first possible begin date before rangeBegin and before event starts
   * in order to place a given range into given events
   *
   * @param rangeBegin at this date at calendarDay the range is placed in the moment
   * @param rangeDuration range length in miuntes
   * @param events existing events at calendarDay assumed to be ordered ascending
   * @param calendarDay calendarDay, defined by start of day
   * @retrun begin date,  null if no event is before rangeBegin or if no begin date is possible
   */
   static getPreviousBegin(rangeBegin: Date, rangeDuration: number, events: Array<Event>, calendarDay: Date): Date | null {
    if (GlobalFunctions.isMinuteSameOrEarlier(calendarDay, rangeBegin)
    && GlobalFunctions.isMinuteEarlier(rangeBegin, GlobalFunctions.addDays(calendarDay, 1))
    && rangeDuration <= MAX_INTERVAL_LENGTH
    && events?.length > 0) {
      // there might be a event entry from day before reaching to calendarDay, but no older events
      const filtered = events.filter(_ => GlobalFunctions.isMinuteEarlier(calendarDay, _.eventEnd)
      && GlobalFunctions.isMinuteEarlier(_.eventBegin, rangeBegin));
      if (filtered.length > 0) {
        let foundEventBegin: Date | undefined = filtered[filtered.length - 1].eventBegin;
        for (let i = 0; foundEventBegin && GlobalFunctions.isMinuteSameOrEarlier(calendarDay, foundEventBegin)  && i < 999; i++) {
          const spaceBefore = GlobalFunctions.getSpaceBefore(foundEventBegin, filtered, calendarDay);
          if (spaceBefore >= rangeDuration) {
            return GlobalFunctions.addMinutes(foundEventBegin, rangeDuration * -1);
          } else {
            foundEventBegin = GlobalFunctions.getPreviousEvent(filtered, foundEventBegin)?.eventBegin;
          }
          // console.log ('loop - beginBefore: ', foundEventBegin);
        }
      }
    }
    return null;
  }

  /**
   * returns first possible begin date after rangeBegin among given events
   *  (in order to shift a given range after given events)
   *  first possible begin date is returend as a valid date, if there is at least one event and if there is enough space to shift range there
   *
   * @param rangeBegin at this date at calendarDay the range begins in the moment
   * @param rangeDuration interval length in minutes
   * @param events existing events at calendarDay assumed to be ordered ascending
   * @param calendarDay calendarDay, defined by start of day
   * @return date where rangeBegin can be placed,  null if no event is after rangeBegin or if no begin date is possible afterwards
   */
  static getNextBegin(rangeBegin: Date, rangeDuration: number, events: Array<Event>, calendarDay: Date): Date | null {
    const rangeEnd = GlobalFunctions.addMinutes(rangeBegin, rangeDuration);
    if (GlobalFunctions.isMinuteSameOrEarlier(calendarDay, rangeBegin)
    && GlobalFunctions.isMinuteEarlier(rangeEnd, GlobalFunctions.addDays(calendarDay, 1))
    && rangeDuration <= MAX_INTERVAL_LENGTH
    && events?.length > 0) {
      // all event entries must be from calendarDay
      const filtered = events.filter(_ => GlobalFunctions.isMinuteSameOrEarlier(calendarDay, _.eventBegin)
      && GlobalFunctions.isMinuteEarlier(rangeEnd, _.eventEnd));
      if (filtered.length > 0) {
        let foundEventEnd: Date | undefined = filtered[0].eventEnd;
        for (let i = 0; foundEventEnd && i < 999; i++) {
          const spaceAfter = GlobalFunctions.getSpaceAfter(foundEventEnd, filtered, calendarDay);
          if (spaceAfter >= rangeDuration) {
            const nextEnd = GlobalFunctions.addMinutes(foundEventEnd, rangeDuration);
            if (GlobalFunctions.getDateInMinutes(nextEnd) - GlobalFunctions.getDateInMinutes(calendarDay) < 24 * 60) {
              // we return the possible begin of range
              return foundEventEnd;
            } else {
              return null;
            }
          } else {
            foundEventEnd = GlobalFunctions.getNextEvent(filtered, foundEventEnd)?.eventEnd;
          }
          // console.log ('loop - nextEnd: ', foundEventEnd);
        }
      }
    }
    return null;
  }

  /** --------------------------  string handling functions -------------------------------------------- */


  /**
   * remove leading and trailing characters from string
   * @param string string to be checked and trimmed
   * @param charToRemove string to be removed
   * @returns trimmed string
   */
  static  trimChar(string: string, charToRemove: string) {
    if (string === undefined || string === null) {
      return string;
    }
    while(string.charAt(0) === charToRemove) {
      string = string.substring(1);
    }

    while(string.charAt(string.length-1) === charToRemove) {
      string = string.substring(0,string.length-1);
    }

    return string;
  }

  /**
   * remove special characters from string
   * - rpplace german Umlaute by 2 characters
   * - elimnate all blanks
   * @param string string to be cleaned
   * @returns cleaned  string
   */
  static  removeSpecialChar(string: string) {
    let cleanedString =  string && string !== '' ? string
    .replaceAll('Ä', 'AE')
    .replaceAll('Ö', 'OE')
    .replaceAll('Ü', 'UE')
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll(' ', '')
    : '';

    return cleanedString;
  }

  /**
   * getTextAbbr delivers abbreviation of a text string
   * @param text - the text sring
   * @param places - max. places, if not provided, than we assueme 5
   * @returns abbreviated text string with trailing ...
   */
  static getTextAbbr(text: string, places?: number): string {
    if (text === undefined || text === null) {
      return text;
    }
    if (places === undefined || places === null || places === 0) {
      places = 5;
    }
    if (text.length <= places) {
      return text;
    } else {
      return text.substring(0, places) + '...';
    }
  }


  /**
   * replaceText replaces a placeholder @text in an array of texts
   * if @notext occurs anywhere in array of texts, no replacement is done
   *  (all @notext occurences are deleted)
   * otherwise all occurences of @text are replaced by parameter text
   *  if no occurence, them parameter text is added at begin of first text
   *
   * @param text text which is inserted instead of @text
   * @param texts array of texts which is returend with replaced content
   */
  static replaceText(text: string, texts: string[]): string[] {
    if (text === undefined || text === null) {
      return texts;
    }
    if (texts?.length > 0) {
      const placeholder = '@text';
      const regexpPlaceholder = new RegExp(placeholder, 'g');
      const notext = '@notext';
      const regexpNotext= new RegExp(notext, 'g');
      if (texts.filter(_ => _?.includes(notext)).length > 0) {
        for (let i = 0; i < texts.length; i++) {
          texts[i] = texts[i]?.replace(regexpNotext, '');
          texts[i] = texts[i]?.replace(regexpPlaceholder, '');
        }
        return texts;
      }
      if (texts.filter(_ => _?.includes(placeholder)).length > 0) {
        for (let i = 0; i < texts.length; i++) {
          texts[i] = texts[i]?.replace(regexpPlaceholder, text);
        }
      } else if (texts[0]) {
        texts[0] = text + ' ' + texts[0];
      } else {
        texts[0] = text;
      }
    }
    return texts;
  }


  /** --------------------------  file functions -------------------------------------------- */


  /**
   * parse name without suffix
   * @param fullName
   * @returns name until suffix (trailing spaces must be cut by calling procedure)
   */
  static getNameBeforeSuffix(fullName: string): string {
    let name = fullName;
    return name.substring(0, this.getSuffixPosition(name));
  }

  /**
   * add 1 to suffix and return name with suffix
   * @param fullName
   * @returns fullName with next suffix
   */
  static incrementSuffix(fullName: string): string {
    let name = fullName;
    return this.getNameBeforeSuffix(fullName).trimEnd() + ' (' + (this.getSuffixValue(fullName) + 1).toString() +')';
  }

  /**
   * add 1 to suffix and return name with suffix -
   * @param fullName
   * @returns fullName with next suffix, suffix without spaces behind name
   */
  static incrementSuffixCompact(fullName: string): string {
    let name = fullName;
    return this.getNameBeforeSuffix(fullName).trimEnd() + '(' + (this.getSuffixValue(fullName) + 1).toString() +')';
  }

  /**
   * get position of a clone suffix in a name
   * @param fullName
   * @returns position of suffix - starting with "(" - if no suffix, we return length of fullName
   */
  static getSuffixPosition(fullName: string): number {
    let suffixPosition = fullName.length;
    const suffix = this.getSuffix(fullName);
    if (suffix) {
      suffixPosition = fullName.lastIndexOf(suffix);
    }
    return suffixPosition;
  }

  /**
   * get a clone suffix in a name
   * @param fullName
   * @returns suffix - starting with "(" - if no suffix, we return null
   */
  static getSuffix(fullName: string): string | null {
    const suffixes = fullName.trimEnd().match(/\([0-9]+\)$/) ?? '';
    if (suffixes?.length > 0) {
      return suffixes[suffixes.length -1];
    }
    return null;
  }

  /**
   * get a clone suffix in a name
   * @param fullName
   * @returns value of suffix - if no suffix, we return 0
   */
  static getSuffixValue(fullName: string): number {
    const suffix = this.getSuffix(fullName);
    if (suffix) {
      return Number(suffix.replace('(', '').replace(')', ''));
    }
    return 0;
  }

  /**
   * getFileDate extracts date last modified for a file
   *
   * @param fileName file defined by its name with complete directory path
   * @param dateLines lies of a file which contains result of a dir or ls statement
   * @param isUnixStyle true if dateLines where produced by a unix system
   * @returns date of file, null if no date was found
   */
  static getFileDate(fileName: string, dateLines: Array<string>, isUnixStyle?: boolean): Date | null {
    let dateIx = -1;
    let nameOnly = fileName;
    if (fileName.includes('/')) {
      // directory has no leading slash ....
      const directory = fileName.substring(0, fileName.lastIndexOf('/'));
      nameOnly = fileName.substring(fileName.lastIndexOf('/') + 1);
      for (let ix = 0; ix < dateLines.length && dateIx < 0; ix++) {
        if (dateLines[ix].includes('/' + directory)) {
          dateIx = ix;
        }
      }
    }
    // we start from a directory line (or from begin for root files ..)
    let isDateFound = false;
    for (let ix = dateIx + 1; ix < dateLines.length && !isDateFound; ix++) {
      if (dateLines[ix].includes(nameOnly)) {
        // we have found line for file - process depending on system
        if (isUnixStyle) {
          const fileNamePlace = dateLines[ix].indexOf(nameOnly);
          const dateString = dateLines[ix].substring(fileNamePlace - 36, fileNamePlace);
          if (dateString?.length > 0) {
            return new Date(dateString);
          }
        } else {
          const dateString = dateLines[ix].substring(0, 10);
          // we await date in format dd.mm.yyyy
          const dateFound = GlobalFunctions.parseDMYtoDate(dateString);
          if (dateFound) {
            isDateFound = true;
            const timeString = dateLines[ix].substring(10, 18);
            const times = timeString.split(':');
            if (times.length > 1) {
              const hours = Math.floor(Number(times[0]));
              const minutes = Math.floor(Number(times[1]));
              if (hours >= 0 && hours <= 23) {
                dateFound.setHours(hours);
                if (minutes >= 0 && minutes <= 59) {
                  dateFound.setMinutes(minutes);
                }
              // we correct time shift of DIR command
              return GlobalFunctions.addMinutes(dateFound, 60);
              } // endif hours
            } // endif times
          } // endif datefound
        } // endif unix style
      } // endif dateLines[ix] is the right line
    } // endfor dateLines
    return null;
  }

  /*
  * Base 64 implementation in JavaScript
  * Copyright (c) 2009 Nicholas C. Zakas. All rights reserved.
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  * THE SOFTWARE.
  */

  /**
   * Base64-encodes a string of text.
   * @param {String} text The text to encode.
   * @return {String} The base64-encoded string.
   */
  static  base64Encode(text: string){

    if (/([^\u0000-\u00ff])/.test(text)){
        throw new Error("Can't base64 encode non-ASCII characters.");
    }

    var digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        i = 0,
        cur, prev, byteNum,
        result=[];

    while(i < text.length){

        cur = text.charCodeAt(i);
        byteNum = i % 3;

        switch(byteNum){
            case 0: //first byte
                result.push(digits.charAt(cur >> 2));
                break;

            case 1: //second byte
                result.push(digits.charAt((prev! & 3) << 4 | (cur >> 4)));
                break;

            case 2: //third byte
                result.push(digits.charAt((prev! & 0x0f) << 2 | (cur >> 6)));
                result.push(digits.charAt(cur & 0x3f));
                break;
        }

        prev = cur;
        i++;
    }

    if (byteNum == 0){
        result.push(digits.charAt((prev! & 3) << 4));
        result.push("==");
    } else if (byteNum == 1){
        result.push(digits.charAt((prev! & 0x0f) << 2));
        result.push("=");
    }

    return result.join("");
  }

  /**
  * Base64-decodes a string of text.
  * @param {String} text The text to decode.
  * @return {String} The base64-decoded string.
  */
  static base64Decode(text: string){

    //ignore white space
    text = text.replace(/\s/g,"");

    //first check for any unexpected input
    if(!(/^[a-z0-9\+\/\s]+\={0,2}$/i.test(text)) || text.length % 4 > 0){
        throw new Error("Not a base64-encoded string.");
    }

    //local variables
    var digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        cur, prev, digitNum,
        i=0,
        result = [];

    //remove any equals signs
    text = text.replace(/=/g, "");

    //loop over each character
    while(i < text.length){

        cur = digits.indexOf(text.charAt(i));
        digitNum = i % 4;

        switch(digitNum){

            //case 0: first digit - do nothing, not enough info to event with

            case 1: //second digit
                result.push(String.fromCharCode(prev! << 2 | cur >> 4));
                break;

            case 2: //third digit
                result.push(String.fromCharCode((prev! & 0x0f) << 4 | cur >> 2));
                break;

            case 3: //fourth digit
                result.push(String.fromCharCode((prev! & 3) << 6 | cur));
                break;
        }

        prev = cur;
        i++;
    }

    //return a string
    return result.join("");

  }

  /**
   * encode() encodes input string with given key
   *  (we euse encoding for numeric values - so we do not have to handle overflow situations ...)
   * @param input string to be encoded
   * @param key string must contain only lower characters from 'a' to 'z'
   * @returns encoded string (empty string if key does not fit)
   */
  static encode(input: string, key: string): string {
    const aCode = 'a'.charCodeAt(0);
    const zCode = 'z'.charCodeAt(0);
    let encoded = '';
    // Verify that the input is lower case is lower case alpha and has one or more characters
    if (key && key.length > 0 && /^[a-z]+$/.test(key)) {
      // key ok
    } else {
      // throw new Error("Bad key");
      return '';
    }
    // Check that the key is long enough for the input and if not expand
    if (key.length < input.length) {
        key = this.expandKey(key, input.length);
    }
    for (let i = 0; i < input.length; i++) {
        let charCode = input.charCodeAt(i) + this.getOffset(key[i]);
        encoded += String.fromCharCode(charCode);
    }
    return encoded;
  }

  /**
   * decode() decodesinput string with given key
   *  (we euse encoding for numeric values - so we do not have to handle overflow situations ...)
   * @param input string to be decoded
   * @param key string must contain only lower characters from 'a' to 'z'
   * @returns decoded string (empty string if key does not fit)
   */
  static decode(encoded: string, key: string): string {
    const aCode = 'a'.charCodeAt(0);
    const zCode = 'z'.charCodeAt(0);
    let decoded = '';
    // Verify that the input is lower case is lower case alpha and has one or more characters
    if (key && key.length > 0 && /^[a-z]+$/.test(key)) {
      // key ok
    } else {
      // throw new Error("Bad key");
      return '';
    }
    // Check that the key is long enough for the input and if not expand
    if (key.length < encoded.length) {
      key = this.expandKey(key, encoded.length);
    }
    for (let i = 0; i < encoded.length; i++) {
        let charCode = encoded.charCodeAt(i) - this.getOffset(key[i]);
        decoded += String.fromCharCode(charCode);
    }
    return decoded;
  }

  // helper function for encode, decode
  static getOffset(inpChar: string): number {
    const aCode = 'a'.charCodeAt(0);
    return inpChar.charCodeAt(0) - aCode;
  }

  // helper function for encode, decode
  static expandKey(key: string, targetLength: number): string {
      let expandedKey = key;
      while (expandedKey.length < targetLength) {
        expandedKey += expandedKey;
      }
      return expandedKey;
  }



  /** --------------------------  object and sort functions -------------------------------------------- */

  /**
   * objText is called by the components to load their dbtxt
   * returns a text object for the specified object
   * which (in case of text in database is not specified)
   *  at least consits of the property names as texts
   *
   * @param obj the object to which the texts are built
   * @param comp calling component for logging purpose
   */
  static objText(obj: Object, className: string, systemTexts: Text[], language: number, comp: string): { [key: string]: string }  {
    const textObj: { [key: string]: string } = {};
    if (obj) {
      // we merge the 2 arrays of texts (Object.keys und texts.text)
      // by first setting textObj properties to their own names
      for (const prop of Object.keys(obj)) {
        // console.log('category: ', cat, 'property: ', prop );
        textObj[prop] = prop;
      }
      // we have no success with generic obj.constructor.name;
      // in production build we do not get one
      textObj['className'] = className;
      // text for property of object is set to text of database
      // if the entry equals the property of the object it will be overwritten
      // other texts are built as new properties
      if (systemTexts?.length > 0) for (const t of systemTexts.filter(text => {
        return (text.textCategory.trim() === className
          && text.language === (language ? language : 0)
          && text.type === 2);
      })) {
        textObj[t.textName] = t.text;
      }
    }
    return textObj;

  }


  /**
   * returns a compare function for a sort of objects on one key of them
   *
   * @param sortElements - the sort fields in order of the sortElements array
   *  we use each sortElement to define properties in objects which have to be sorted:
   */
  static sortFields(sortElements: ISortElement[]) {
    return function innerSort(a: any, b: any) {
      if (typeof a !== 'object' || typeof b !== 'object') {
        return 0;
      }
      if (sortElements && sortElements.length > 0) {
        let comparison: number;
        for (let index = 0; index < sortElements.length; index++) {
          comparison = GlobalFunctions.compareField(sortElements[index], a, b);
          // if we get a sort order at this sortElement, we do not need to compare others
          if (comparison !== 0) {
            return (
              (sortElements[index].order?.toUpperCase() === 'DESC') ? (comparison * -1) : comparison
            );
          }
        }
        // we have checked all sortElements ....
        return 0;
      } else {
        return 0;
      }
    };
  }


  /**
   * compares 2 objects and delivers 0  if all fields are equal, < 0 if a less than b
   * @param sortElements defines an array of fields of each object which is to be commpared
   *  in sequence of the array
   * @param a object
   * @param b object
   */
  static compareFields(sortElements: ISortElement[], a: object, b: object): number {
    if (sortElements && sortElements.length > 0) {
      let comparison: number;
      for (let index = 0; index < sortElements.length; index++) {
        comparison = GlobalFunctions.compareField(sortElements[index], a, b);
        if (comparison !== 0) {
          return comparison;
        }
      }
      // we have checked all sortElements ....
      return 0;
    } else {
      return 0;
    }
  }


  /**
   * returns a compare function for a sort of objects on one key of them
   * @param key property which has to be sorted (can be string, number or boolean -
   *  booleans are sorted by Number(key), so false = 0, true = 1)
   * @param order 'asc' (default) od 'desc'
   */
  static compareValue(key: string, order = 'asc') {
    return function innerSort(a: any, b: any) {

      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0;
      }
      let comparison: number;

      if (typeof a[key] === 'string' && typeof b[key] === 'string') {
        comparison = Number(a[key].localeCompare(b[key]));
      } else if (typeof a[key] === 'number' && typeof b[key] === 'number') {
        comparison = a[key] - b[key];
      } else if (typeof a[key] === 'boolean' && typeof b[key] === 'boolean') {
        // we allow sort of booleans
        comparison = Number(a[key]) - Number(b[key]);
      } else {
        // all other types are handled as "equal"
        return 0;
      }

      return (
        (order.toUpperCase() === 'DESC') ? (comparison * -1) : comparison
      );
    };
  }

  /**
   * compares 2 objects and delivers
   * 0 if the compared field is equal
   * < 0 if the field of a is less than the field of b
   * > 0 vice versa
   * so it can be used in a sort function ....
   * @param sortElement defines the field of each object which is to be commpared
   * @param key - name of property which has to be sorted (can be string, number or boolean -
   *  booleans are sorted by Number(key), so false = 0, true = 1)
   * @param object - if key belongs to an object which is placed at first level below sorted object
   *  - this is the name of the object
   * @param datePart can have value y year, m month, w week, d day, h hour - if omitted, and key is a Date object,
   *  we sort by getTime (millisec)
   * @param order 'asc' (default) od 'desc'
   * @param a object
   * @param b object
   */
  static compareField(sortElement: {key: string, object?: string, datePart?: string, order?: string}, a: {[key: string]: any}, b: {[key: string]: any}): number {
    let comparison = 0;
    let objectA: {[key: string]: any};
    let objectB: {[key: string]: any};
    if (sortElement.object && sortElement.object !== '') {
      if (!a.hasOwnProperty(sortElement.object) || !b.hasOwnProperty(sortElement.object)
      || typeof a[sortElement.object] !== 'object' || typeof b[sortElement.object] !== 'object') {
        // sub-object doesn't exist on either object or is not an object
        return comparison;
      } else {
        objectA = a[sortElement.object];
        objectB = b[sortElement.object];
      }
    } else {
      objectA = a;
      objectB = b;
    }
    // we compare now objectA with objectB - can be object or sub-object
    if (!objectA.hasOwnProperty(sortElement.key) || !objectB.hasOwnProperty(sortElement.key)) {
      // property doesn't exist on either object
      comparison = 0;
    } else if (typeof objectA[sortElement.key] === 'string' && typeof objectB[sortElement.key] === 'string') {
      comparison = Number(objectA[sortElement.key].localeCompare(objectB[sortElement.key]));
    } else if (typeof objectA[sortElement.key] === 'number' && typeof objectB[sortElement.key] === 'number') {
      comparison = objectA[sortElement.key] - objectB[sortElement.key];
    } else if (typeof objectA[sortElement.key] === 'boolean' && typeof objectB[sortElement.key] === 'boolean') {
      // we allow sort of booleans
      comparison = Number(objectA[sortElement.key]) - Number(objectB[sortElement.key]);
    } else if (typeof objectA[sortElement.key] === 'object' && typeof objectB[sortElement.key] === 'object'
      && objectA[sortElement.key] instanceof Date && objectB[sortElement.key] instanceof Date) {
      if (sortElement.datePart && sortElement.datePart.substr(0, 1).toUpperCase() === 'Y') {
        comparison = (GlobalFunctions.getY(objectA[sortElement.key]) ?? 0)
        - (GlobalFunctions.getY(objectB[sortElement.key]) ?? 0);
      } else if (sortElement.datePart && sortElement.datePart.substr(0, 1).toUpperCase() === 'M') {
        comparison = (GlobalFunctions.getYM(objectA[sortElement.key]) ?? 0)
        - (GlobalFunctions.getYM(objectB[sortElement.key]) ?? 0);
      } else if (sortElement.datePart && sortElement.datePart.substr(0, 1).toUpperCase() === 'W') {
        comparison = GlobalFunctions.getYW(objectA[sortElement.key])
        - GlobalFunctions.getYW(objectB[sortElement.key]);
      } else if (sortElement.datePart && sortElement.datePart.substr(0, 1).toUpperCase() === 'D') {
        comparison = (GlobalFunctions.getYMDH(objectA[sortElement.key]) ?? 0)
        - (GlobalFunctions.getYMDH(objectB[sortElement.key])?? 0);
      // dates without datePart option are compared by getTime
      } else {
        comparison = objectA[sortElement.key].getTime() - objectB[sortElement.key].getTime();
      }
    } else {
      // all other types are handled as "equal"
      // console.log('object but not Date:', sortElement.key);
      comparison = 0;
    }
    return comparison;
  }



  /**
   * Converts an HSL color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * params  h is in the set [0, 360], s  and l are contained in the set [0, 100]
   * returns r, g, and b in the set [0, 255].
   *
   * @param   hslObject  with  h = fue (from 0 to 360), s = saturation (from 0 to 100), l = lightness (from 0 to 100)
   * @return  rgbObject  The RGB representation with r, g, b
   */
  static hslToRgb(hslObject: {h: number, s: number, l: number}): {r: number, g: number, b: number} {
    let r: number, g: number, b: number;
    const h = hslObject.h > 360 ? 1 : hslObject.h < 0 ? 0 : hslObject.h / 360;
    const s = hslObject.s > 100 ? 1 : hslObject.s < 0 ? 0 : hslObject.s / 100;
    const l = hslObject.l > 100 ? 1 : hslObject.l < 0 ? 0 : hslObject.l / 100;

    function hue2rgb(p: number, q: number, t: number)  {
      if (t < 0) {t += 1; }
      if (t > 1) {t -= 1; }
      if (t < 1 / 6) {return p + (q - p) * 6 * t; }
      if (t < 1 / 2) {return q; }
      if (t < 2 / 3) {return p + (q - p) * (2 / 3 - t) * 6; }
      return p;
    }

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
  }

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns  h is in the set [0, 360], s and l are contained in the set [0, 100]
 *
 * @param   rgbObject:  r       The red color value,  g The green color value, b       The blue color value
 * @return  hslObject          The HSL representation
 */

  static rgbToHsl (rgbObject: {r: number, g: number, b: number}): {h: number, s: number, l: number} {

    const r = rgbObject.r > 255 ? 1 : rgbObject.r < 0 ? 0 : rgbObject.r / 255;
    const g = rgbObject.g > 255 ? 1 : rgbObject.g < 0 ? 0 : rgbObject.g / 255;
    const b = rgbObject.b > 255 ? 1 : rgbObject.b < 0 ? 0 : rgbObject.b / 255;


    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h: number, s: number;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const  d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }

    return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)};
  }


  static classOf<T extends { new (...args: any[]): {} }>(o: InstanceType<T>): T {
    return o.constructor as T;
  }

  /**
   * cloning objects
   *
   * @param obj object which is cloned - may be of any type
   */
   static clone(obj: any): any {
    let copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || 'object' !== typeof obj) {
      return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
            copy[i] = this.clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      let copy: { [key: string | number | symbol]: any } = {};
      for (const attr in obj) {
          if (obj.hasOwnProperty(attr)) {
            copy[attr] = this.clone(obj[attr]);
          }
      }
      return copy;
    }

    throw new Error('Unable to copy obj! Its type is not supported.');
  }

  /** --------------------------  date functions -------------------------------------------- */


  /**
   * parse date from string
   * @param dateString string in format 'DD.MM.YYYY' (with year >= 1000)
   *   or in format 'DD.MM' - in this case we assume current year
   *   or in format 'YYYY' - in this case we assume 1.1. of year YYYY
   * @returns date, if parseable string - else returns null
   */
  static parseDMYtoDate(dateString: string): Date | null{
    let isoDateString: string = '';
    const currentDate = new Date();
    const currentYearString = this.getYString(currentDate);
    // we replace leading and trailing points
    const trimmed = dateString.replace(/^\.+/, '').replace(/\.+$/, '');
    // we count points
    const pointMatch = trimmed.match(/\./g);
    if (pointMatch?.length === 2) {
      const year = Number(trimmed.replace(/(.*)\.(.*)\.(.*)/, '$3'));
      // we must assure a 4 digit year to get a correct ISO date string
      if (year >= 1000 && year <= 9999) {
        isoDateString = trimmed.replace(/(.*)\.(.*)\.(.*)/, year.toString() + '-$2-$1');
      }
    }
    if (pointMatch?.length === 1) {
      isoDateString = trimmed.replace(/(.*)\.(.*)/, currentYearString + '-$2-$1');
    }
    if ((!pointMatch || pointMatch?.length === 0) && Number(dateString) >= 1000 && Number(dateString) <= 9999) {
      isoDateString = Number(dateString).toString() + '-01-01';
    }
    // we check if we have built a correct ISO date string
    const millisecs = Date.parse(isoDateString);
    if (isNaN(millisecs)) {
      return null;
    } else {
      // ATTN: day or month without leading 0 leads to time 00:00, with leading 0 we get hour with UTC delay
      let newDate = new Date(isoDateString);
      // we adjust hours/minutes to start of day = 0
      newDate.setHours(0,0);
      return newDate;
    }
  }

   /**
   * parse date from string
   * @param dateString string in format 'YYYYWW' (with year > 1000)
   * or in format 'WW' - in this case we assume current year
   * @returns date, if parseable string - else returns null
   */
   static parseYWtoDate(dateString: string): Date {
    const currentDate = new Date();
    const currentYearString = this.getYString(currentDate);
    const currentYear = Number(currentYearString);
    let year: number = 1900;
    let week: number = 1;
    // we replace leading and trailing points
    const trimmed = dateString.replace(/^\.+/, '').replace(/\.+$/, '');
    if (trimmed.length < 6 && Number(trimmed) <= 53) {
      year = currentYear;
      week = Number(trimmed);
    } else if (trimmed.length === 6) {
      year = Number(trimmed.substring(0, 4));
      week = Number(trimmed.substring(4));
    }
    return this.getDateByWeek(week, year);
  }

   /**
   * parse date from string
   * @param dateString string in format 'YYYYMM'
   * or in format 'MM' - in this case we assume current year
   * @returns date, if parseable string - else returns null
   */
   static parseYMtoDate(dateString: string): Date {
    const currentDate = new Date();
    const currentYearString = this.getYString(currentDate);
    const currentYear = Number(currentYearString);
    let year: number = 1900;
    let month: number = 1;
    // we replace leading and trailing points
    const trimmed = dateString.replace(/^\.+/, '').replace(/\.+$/, '');
    if (trimmed.length < 6 && Number(trimmed) <= 53) {
      year = currentYear;
      month = Number(trimmed);
    } else if (trimmed.length === 6) {
      year = Number(trimmed.substring(0, 4));
      month = Number(trimmed.substring(4));
    }
    return new Date(year, month - 1, 1);
  }


  /**
   * parse date from string
   * @param dateString string in format 'YYYYMMDD'
   * @returns date, if parseable string - else returns null
   */
   static parseYMDtoDate(dateString: string): Date | null {
    if (dateString && dateString !== '') {
      // simple format yyyymmdd
      const year: number = parseInt(dateString.substring(0, 4), 10);
      const month: number = parseInt(dateString.substring(4, 6), 10) - 1;
      const day: number = parseInt(dateString.substring(6, 8), 10);
      if (year > 999 && month < 12 && day < 32) {
        return new Date(year, month, day);
      }
    }
    return null;
  }


  /**
   * gets minutes from 1.1.1970
   * @param date date object
   */
  static getDateInMinutes(date: Date): number {
    const minutes = 1000 * 60;
    // console.log('date', date, typeof date);
    if (date && date instanceof Date) {
      return Math.floor(date.getTime() / minutes) ;
    } else return 0;
  }

  /**
   * gets minutes from 1.1.1970
   * @param date date object
   * - date is in timezone of browser - we add hours of difference between date and UTC date
   *
   */
  static getDateInDays(date: Date): number {
    // console.log('date', date, typeof date);
    if (date && date instanceof Date) {
      // we construct a date object with UTC midnight expressded in local time
      // this  has hauurs > 0 at start of day - we must use this to correct hours
      const localStartOfDay = new Date(date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString()  + '-'  +  date.getDate().toString());
      // console.log('localStartOfDay: ', localStartOfDay);
      const localHours = localStartOfDay.getHours();
      // console.log('localHours: ', localHours);
      const hours = this.getDateInMinutes(date) / 60;
      return Math.floor((hours + localHours) / 24) ;
    } else return 0;
  }


  static isMinuteEarlier(firstDate: Date, secondDate: Date): boolean {
    return GlobalFunctions.getDateInMinutes(firstDate) < GlobalFunctions.getDateInMinutes(secondDate);
  }

  /**
   * isMinuteSameOrEarlier
   * @param firstDate should be earlier then second date , then returns true
   * @param secondDate date to compare
   */
  static isMinuteSameOrEarlier(firstDate: Date, secondDate: Date): boolean {
    return GlobalFunctions.getDateInMinutes(firstDate) <= GlobalFunctions.getDateInMinutes(secondDate);
  }

  static isMinuteSame(firstDate: Date, secondDate: Date): boolean {
    return GlobalFunctions.getDateInMinutes(firstDate) === GlobalFunctions.getDateInMinutes(secondDate);
  }


  /** returns yyyy - year must be > 999  */
  static getY(date: Date): number | null {
    if (date && date instanceof Date) {
      const y = date.getFullYear();
      if (y > 999) {
        return y;
      } else return null;
    } else return null;
  }

  /** returns year as string (can be shorter than 4 positions for years < 1000)  */
  static getYString(date: Date): string | null {
    if (date && date instanceof Date) {
      return date.getFullYear().toString();
    } else return null;
  }

  /** returns yyyymm, mm = month as 01 - 12  */
  static getYM(date: Date): number | null {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getY(date) ?? 0) * 100 + date.getMonth() + 1;
    } else return null;
  }

  /** returns yyyyww, ww = week  */
  static getYW(date: Date): number {
    return (GlobalFunctions.getWeekYear(date) ?? 0) * 100 + (GlobalFunctions.getWeek(date) ?? 0);
  }

  /** returns yyyymmdd  */
  static getYMD(date: Date): number | null {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getYM(date) ?? 0) * 100 + date.getDate();
    } else return null;

  }

  /** returns d.mm.yyyy  day and month without leading zero */
  static getDMY(date: Date): string | null{
    if (date && date instanceof Date) {
      return  date.getDate().toString() + '.' + (date.getMonth() + 1).toString() + '.' +  date.getFullYear().toString();
    } else return null;
  }

  /** returns dd.mm.yyyy  day and month with leading zero */
  static getDDMMYYYY(date: Date): string | null {
    if (date && date instanceof Date) {
      return  this.getDay2String(date) + '.' + this.getMonth2String(date) + '.' +  date.getFullYear().toString();
    } else return null;
  }

  /** returns yyyymmddhh  */
  static getYMDH(date: Date): number | null {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getYMD(date) ?? 0) * 100 + date.getHours();
    } else return null;

  }


  /** returns yyyymmddhhmm  */
  static getYMDHM(date: Date): number | null {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getYMDH(date) ?? 0) * 100 + date.getMinutes();
    } else return null;

  }

  /** returns yyyymmddhhmmss  */
  static getYMDHMS(date: Date): number | null {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getYMDHM(date) ?? 0) * 100 + date.getSeconds();
    } else return null;

  }

  /** returns month as string with 2 digits  */
  static getMonth2String(date: Date): string | null {
    if (date && date instanceof Date) {
      const month = (date.getMonth() + 1).toString();
      if ((date.getMonth() + 1) < 10) {
        return '0' + month
      } else {
        return month;
      }
    } else return null;

  }

  /** returns day as string with 2 digits  */
  static getDay2String(date: Date): string | null{
    if (date && date instanceof Date) {
      const day = date.getDate().toString();
      if (date.getDate() < 10) {
        return '0' + day
      } else {
        return day;
      }
    } else return null;
  }

  /** returns h as number - to get full 2 digits in a string use getHString  */
  static getH(date: Date): number | null {
    if (date && date instanceof Date) {
      return date.getHours();
    } else return null;
  }

  /** returns hh as string with 2 digits  */
  static getHours2String(date: Date): string | null{
    if (date && date instanceof Date) {
      const hh = date.getHours().toString();
      if (date.getHours() < 10) {
        return '0' + hh
      } else {
        return hh;
      }
    } else return null;
  }

  /** returns min as number - to get full 2 digits in a string use getMString  */
  static getM(date: Date): number | null{
    if (date && date instanceof Date) {
      return date.getMinutes();
    } else return null;
  }

  /** returns mm as string with 2 digits  */
  static getMinutes2String(date: Date): string | null{
    if (date && date instanceof Date) {
      const mm = date.getMinutes().toString();
      if (date.getMinutes() < 10) {
        return '0' + mm
      } else {
        return mm;
      }
    } else return null;
  }

  /** returns seconds as string - to get full 2 digits in a string use getSString  */
  static getS(date: Date): number | null{
    if (date && date instanceof Date) {
      return date.getSeconds();
    } else return null;
  }

  /** returns ss as string  */
  static getSeconds2String(date: Date): string | null{
    if (date && date instanceof Date) {
      const ss = date.getSeconds().toString();
      if (date.getSeconds() < 10) {
        return '0' + ss;
      } else {
        return ss;
      }
    } else return null;
  }

  /** returns hhmm as number - to get full 4 digits in a string use getHMString  */
  static getHM(date: Date): number {
    return (GlobalFunctions.getH(date) ?? 0) * 100 + date.getMinutes();
  }

  /** returns hhmm as string  */
  static getHM4String(date: Date): string {
    const hhmm = GlobalFunctions.getHM(date).toString();
    if (date.getHours() === 0) {
       if (date.getMinutes() < 10) {
        return '000' + hhmm;
       } else {
        return '00' + hhmm;
       }
    } else if (date.getHours() < 10) {
      return '0' + hhmm;
    } else {
      return hhmm;
    }
  }

  /** returns hhmmss as number - to get full 6 digits in a string use getHMSString  */
  static getHMS(date: Date): number {
    return GlobalFunctions.getHM(date) * 100 + date.getSeconds();
  }

  /** returns hhmmss as string  */
  static getHMS6String(date: Date): string {
    let returnString = '';
    returnString += GlobalFunctions.getHours2String(date);
    returnString += GlobalFunctions.getMinutes2String(date);
    returnString += GlobalFunctions.getSeconds2String(date);
    return returnString;
  }

  /** returns UTC yyyy - year must be > 999  */
  static getUTCY(date: Date): number | null {
    if (date && date instanceof Date) {
      const y = date.getUTCFullYear();
      if (y > 999) {
        return y;
      } else {
        return null;
      }
    } else return null;
  }

  /** returns UTC yyyymm, mm = month as 01 - 12  */
  static getUTCYM(date: Date): number {
    return (GlobalFunctions.getUTCY(date) ?? 0) * 100 + date.getUTCMonth() + 1;
  }

  /** returns UTC yyyyww, ww = week  */
  static getUTCYW(date: Date): number {
    return (GlobalFunctions.getUTCWeekYear(date) ?? 0) * 100 + (GlobalFunctions.getUTCWeek(date) ?? 0);
  }

  /** returns UTC yyyymmdd  */
  static getUTCYMD(date: Date): number {
    return GlobalFunctions.getUTCYM(date) * 100 + date.getUTCDate();
  }

  /** returns UTC yyyymmddhh  */
  static getUTCYMDH(date: Date): number {
    return GlobalFunctions.getUTCYMD(date) * 100 + date.getUTCHours();
  }


  /** returns UTC yyyymmddhhmm  */
  static getUTCYMDHM(date: Date): number {
    return GlobalFunctions.getUTCYMDH(date) * 100 + date.getUTCMinutes();
  }

  /** returns UTC yyyymmddhhmmss  */
  static getUTCYMDHMS(date: Date): number {
    return GlobalFunctions.getUTCYMDHM(date) * 100 + date.getUTCSeconds();
  }

  /** returns UTC hhmmss as number - to get full 6 digits in a string use getUTCHMSString  */
  static getUTCHMS(date: Date): number | null {
    if (date && date instanceof Date) {
      return date.getUTCHours() * 10000 + date.getUTCMinutes() * 100 + date.getUTCSeconds();
    } else return null;
  }


  /** returns hh as string with 2 digits  */
  static getUTCHours2String(date: Date): string | null {
    if (date && date instanceof Date) {
      const hh = date.getUTCHours().toString();
      if (date.getUTCHours() < 10) {
        return '0' + hh
      } else {
        return hh;
      }
    } else return null;
  }


  /** returns mm as string with 2 digits  */
  static getUTCMinutes2String(date: Date): string | null {
    if (date && date instanceof Date) {
      const mm = date.getUTCMinutes().toString();
      if (date.getUTCMinutes() < 10) {
        return '0' + mm
      } else {
        return mm;
      }
    } else return null;
  }


  /** returns ss as string  */
  static getUTCSeconds2String(date: Date): string | null {
    if (date && date instanceof Date) {
      const ss = date.getUTCSeconds().toString();
      if (date.getUTCSeconds() < 10) {
        return '0' + ss;
      } else {
        return ss;
      }
    } else return null;
  }

  /** returns UTC hhmmss as string  */
  static getUTCHMS6String(date: Date): string {
    return GlobalFunctions.getUTCHours2String(date) ?? '' + (GlobalFunctions.getUTCMinutes2String(date) ?? ''  + (GlobalFunctions.getUTCSeconds2String(date) ?? ''));
  }


  static getIsoString(date: Date): string | null {
    if (date && date instanceof Date) {
      let tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num: number) {
          return (num < 10 ? '0' : '') + num;
      };

      return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
    } else return null;
  }

  // milliseconds with three digits, offset without ':'
  static getJiraIsoString(date: Date): string | null {
    if (date && date instanceof Date) {
      let tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num: number) {
            return (num < 10 ? '0' : '') + num
        },
        milliPad = function(num: number) {
          return (num < 10 ? '00' : num < 100 ? '0' : '') + num
        };

      return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + milliPad(date.getMilliseconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
              pad(Math.abs(tzo) % 60);
    } else return null;
  }

  // This script is released to the public domain and may be used, modified and
  // distributed without restrictions. Attribution not necessary but appreciated.
  // Source: https://weeknumber.net/how-to/javascript

  /** Returns the ISO week of the date.  */
  static getWeek(date: Date): number | null {
    if (date && date instanceof Date) {
      // copy has UTC date  with time 00:00:00 - we must calculate with UTC values to avoid summer-time differneces ...
      const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      // Thursday in current week decides the year.
      copy.setDate(copy.getDate() + 3 - (copy.getDay() + 6) % 7);
      // January 4 is always in week 1.- so week1 is date of jan 4
      const week1 = new Date(Date.UTC(copy.getFullYear(), 0, 4));
      // Adjust to Thursday in week 1 and count number of weeks from copy to week1
      const diffMilliSec = copy.getTime() - week1.getTime();
      const milliSecToDays = 24*60*60*1000;
      const diffDays = diffMilliSec / milliSecToDays;
      const diffWeeks = (diffDays - 3 + (week1.getDay() + 6) % 7) / 7;
      return 1 + Math.round(diffWeeks);
      /*
      return 1 + Math.round(((copy.getTime() - week1.getTime()) / 86400000
                            - 3 + (week1.getDay() + 6) % 7) / 7);
      */
    } else return null;
  }

  /** Returns the four-digit year corresponding to the ISO week of the date.  */
  static getWeekYear(date: Date): number | null {
    if (date && date instanceof Date) {
      const copy = new Date();
      copy.setTime(date.getTime());
      copy.setDate(copy.getDate() + 3 - (copy.getDay() + 6) % 7);
      return copy.getFullYear();
    } else return null;
  }

  /** Returns the UTC ISO week of the date.  */
  static getUTCWeek(date: Date): number | null{
    if (date && date instanceof Date) {
      const copy = new Date();
      copy.setTime(date.getTime());
      copy.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year.
      copy.setDate(copy.getUTCDate() + 3 - (copy.getUTCDay() + 6) % 7);
      // January 4 is always in week 1.
      const week1 = new Date(copy.getUTCFullYear(), 0, 4);
      // Adjust to Thursday in week 1 and count number of weeks from copy to week1.
      return 1 + Math.round(((copy.getTime() - week1.getTime()) / 24*60*60*1000
                            - 3 + (week1.getUTCDay() + 6) % 7) / 7);
    } else return null;
  }

  /** Returns the four-digit UTC year corresponding to the ISO week of the date.  */
  static getUTCWeekYear(date: Date): number | null {
    if (date && date instanceof Date) {
      const copy = new Date();
      copy.setTime(date.getTime());
      copy.setDate(copy.getUTCDate() + 3 - (copy.getUTCDay() + 6) % 7);
      return copy.getUTCFullYear();
    } else return null;
  }

  /**
   * getWeekDay() delivers weekDay of given date - 0 is first day,..
   *
   * @param date the date for which we return weekday
   * @param firstDay can be set directly, without using locale Monday is 1 and Sunday is 7, as defined by ISO-8861
   *  if set to 0, we use locale or default behaviour (monday is first day)
   * @param locale locale string, such as 'en-US'
   * @returns weekDay of given date as index - 0 is first day of week, 6 is last day
   */
  static getWeekDay(date: Date, firstDay?: number, locale?: string): number | null{
    if (date && date instanceof Date) {
      let effectiveFirstDay: number;
      if (firstDay && firstDay >= 1 && firstDay <= 7) {
        effectiveFirstDay = firstDay;
      } else if (locale) {
        const localeForWeekInfo = new Intl.Locale(locale);
        // weekInfo is yet in proposal stage ...
        // effectiveFirstDay = localeForWeekInfo.weekInfo.firstDay;
        effectiveFirstDay = 1;
      } else {
        effectiveFirstDay = 1;
      }
      // getDay() returns anyway 0 for sunday, 1 for monday ,...
      let weekDay = date.getDay() - effectiveFirstDay;
      weekDay = weekDay < 0 ? weekDay + 7 : weekDay;
      return weekDay;
    } else return null;
  }

  static getDateByWeek(week: number, year: number) {
    // Create a date for 1 Jan in required year
    const d = new Date(year, 0);
    // Get day of week number, sun = 0, mon = 1, etc.
    const dayNum = d.getDay();
    // Get days to add
    let requiredDate = --week * 7;

    // For ISO week numbering
    // If 1 Jan is Friday to Sunday, go to next week
    if (dayNum != 0 || dayNum > 4) {
      requiredDate += 7;
    }

    // Add required number of days
    d.setDate(1 - d.getDay() + ++requiredDate);
    return d;
  }

  /** returns start of day  */
  static getStartOfDay(date: Date): Date | null {
    if (date && date instanceof Date) {
      const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return copy;
    } else return null;
  }

  /** returns end of day as last minute of day (i.e. 23:59) */
  static getEndOfDay(date: Date): Date | null {
    if (date && date instanceof Date && this.getStartOfDay(date)) {
      let copy: Date = this.getStartOfDay(date) ?? new Date();
      copy = this.addDays(copy, 1);
      copy = this.addMinutes(copy, -1);
      return copy;
    } else return null;
  }

  /** returns start of month  */
  static getStartOfMonth(date: Date): Date | null {
    if (date && date instanceof Date) {
      const copy = new Date(date.getFullYear(), date.getMonth(), 1);
      return copy;
    } else return null;
  }


  /** returns start of week  */
  static getStartOfWeek(date: Date, firstDay?: number, locale?: string): Date {
    return this.addDays(date, (this.getWeekDay(date, firstDay, locale) ?? 0) * -1);
  }

  /** returns start of year  */
  static getStartOfYear(date: Date): Date | null {
    if (date && date instanceof Date) {
      const copy = new Date(date.getFullYear(), 0, 1);
      return copy;
    } else return null;
  }

  /** returns last day of maonth */
  static getEndOfMonth(date: Date): Date | null {
    if (date && date instanceof Date) {
      const copy = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return copy;
    } else return null;
  }


  /** we calculate date of easter sunday for the year of a given date
    * calculation follows the formula of H.Lichtenberg who improved the Gauß formula in 1997
    */
  static getEaster(date: Date): Date {
    if (date && date instanceof Date) {
      const y = date.getFullYear();
      const K = Math.floor(y/100);
      const M = 15 + Math.floor((3*K+3)/4) - Math.floor((8*K+13)/25);
      const S = 2 - Math.floor((3*K+3)/4);
      const A = y % 19;
      const D = (19*A+M) % 30;
      const R = Math.floor(D/29) + (Math.floor(D/28) - Math.floor(D/29))* Math.floor(A/11);
      const OG = 21 + D - R; // March date of Easter Full Moon: Mar 32 = Apr 1, etc
      const SZ = 7 - (y + Math.floor(y/4)+S) % 7; // date of first march Sunday
      const OE = 7 - (OG-SZ) % 7;
      const OS = OG + OE; // March date of Easter: Mar 32 = Apr 1, etc
      if (OS > 31) {
        // Easter is in april
        return new Date(y, 3, OS - 31);
      } else {
        // Easter is in march
        return new Date(y, 2, OS);
      }
    // we do not return null - so we return first of april in case of invalid date parameter
    } else return new Date(1900, 3, 1);
  }

  /**
   * date string for calendar export - time is expressed in local timezone
   * @param date - as stored in browser component - that means, local time
   * @returns date string yyyymmddThhmmss or empty string if date not correct
   */
  static getIcsDateStringLocal(date: Date): string {
    if (date && date instanceof Date) {
      return (GlobalFunctions.getYMD(date) ?? 0).toString() + 'T' + GlobalFunctions.getHMS6String(date);
    } else return '';
  }


  /**
   * date string for calendar export - as UTC time
   * @param date - as stored in browser component - that means, local time
   * @returns date string yyyymmddThhmmssZ or empty string if date not correct
   */
  static getIcsDateStringUTC(date: Date) {
    if (date && date instanceof Date) {
      return GlobalFunctions.getUTCYMD(date).toString() + 'T' + GlobalFunctions.getUTCHMS6String(date) + 'Z';
    } else return '';
  }

  static addYears(date: Date, years: number): Date  {
    if (date && date instanceof Date) {
      let year = date.getFullYear();
      // month between 0 - 11
      const month = date.getMonth();
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const second = date.getSeconds();
      year = year + years;
      return new Date(year, month, day, hour, minute, second);
    } else return new Date();
  }

  static addMonths(date: Date, months: number): Date  {
    if (date && date instanceof Date) {
      let year = date.getFullYear();
      // month between 0 - 11
      let month = date.getMonth();
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const second = date.getSeconds();
      let allMonths = year * 12 + month + months;
      month = allMonths % 12;
      year = Math.floor(allMonths / 12);
      return new Date(year, month, day, hour, minute, second);
    } else return new Date();
  }

  /**
   * adds months to a date in form of a YYYYMM number
   * @param yMonths numeric value of YYYYMM
   * @param months number of months to add
   * @returns YYYYMM as number
   */
  static addMonthsYM(yMonths: number, months: number): number | null{
    const date = this.parseYMtoDate(yMonths.toString());
    if (date) {
      const newDate = this.addMonths(date, months);
      if (newDate) {
        return this.getYM(newDate);
      } else {
        return null;
      }
    } else {
      return yMonths;
    }
  }

  static addWeeks(date: Date, weeks: number): Date {
    if (date && date instanceof Date) {
      // this ignores change from and to summer time - a week interval is exact 7 days of 24 hours ...
      // return new Date(date.getTime() + weeks *(7 * 24 * 60 * 60 * 1000));
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + weeks * 7);
      return newDate;
    } else return new Date();
  }

  static addDays(date: Date, days: number): Date {
    if (date && date instanceof Date) {
      // we must respect summer time change
      // return new Date(date.getTime() + days *(24 * 60 * 60 * 1000));
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + days);
      return newDate;
    } else return new Date();
  }

  static addMinutes(date: Date, minutes: number): Date {
    if (date && date instanceof Date) {
      const minuteLength = 1000 * 60;
      return new Date(date.getTime() + minutes * minuteLength);
    } else return new Date();
  }

  static minutesDisplay(minutes: number): string {
    minutes = minutes < 0 ? minutes * -1 : minutes;
    return (minutes >= 60 ? Math.floor(minutes / 60).toString() + 'h ' : '') + (minutes % 60 > 0 ? (minutes % 60).toString() + ' min' : '');
  }

  static getTimeFormatted(minutes: number): string {
    return ( Math.floor(minutes / 60).toString() + ':' +
    '0'.concat((minutes % 60).toString()).substr((minutes % 60).toString().length - 1, 2));
  }



  /**
   * getTimeSlizes return minutes as an 5 minute-distanced array
   */
  static getTimeSlizes(): Array<number> {
    const timeSlizes: Array<number> = [];
    for (let i = 5; i <= 60; i += 5) {
      if (60 % i === 0) {
        timeSlizes.push(i);
      }
    }
    return timeSlizes;
  }

}
