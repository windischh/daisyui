import { Component, Inject, LOCALE_ID, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BEGIN, CATEGORIES, CLASS, CREATED, CRLF, DESCRIPTION, DTEND, DTSTAMP, DTSTART, END, LAST_MODIFIED, LF_ZONED, LOCATION, METHOD, PRODID, PUBLISH, SUMMARY, TZID, UID, VCALENDAR, VERSION, VEVENT, X_WR_TIMEZONE } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';

import { LocationType } from '../../_enums/location-type.enum';
import { EventType } from '../../_enums/event-type.enum';

import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { SafeResource } from '../../_services/safe-resource';
import { ContactService } from '../../_services/contact.service';
import { ConfigurationService } from '../../_services/configuration.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { FetchApiService } from '../../_services/fetch-api.service';
import { ISortElement } from '../../_interfaces/i-sort-element';
import { CalendarService } from '../../_services/calendar.service';

@Component({
  selector: 'dsy-calendar-export',
  templateUrl: './calendar-export.html',
  styleUrl: './calendar-export.css',
  imports: [SafeResource]
})
export class CalendarExportComponent implements OnInit {

  public name = 'CalendarExportComponent';

  // db elements with their texts (single db object just used for generating texts)
  eventtxt: { [key: string]: string } = {};

  // url in case of using a download directory - for DEBUGGING only
  url!: string;

  encodedUri!: string;
  fileName!: string;
  fileExtension!: string;
  isFileExtension = false;
  fileType!: string;
  extendedFileName!: string;

  calendarEvents!: Event[];
  recordCount!: number;

  isUpdateFileName = false;
  isUpdateFileType = false;
  isUpdateExtendedFileName = false;

  refreshSignal = signal(0);
  readySignal = signal(0);
  resetSignal = signal(0);
  finishedSignal = signal(0);

  // when set false, we export DTSTART and DTEND as UTC time values
  // we have no possibilty for user to set it true - we must implement
  //  a VTIMEZONE header before ...
  isExportLocalTimezone = false;

  calendarTypeChoices: Array<IChoice> = [];


  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private fetch: FetchApiService,
    private calendarService: CalendarService,
    private configurationService: ConfigurationService,
    private contactService: ContactService,
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthenticationService
    ) { }

  async ngOnInit() {
    // we deactivate header child routing after we have been called
    // this.auth.isHeaderChildCalled = false;
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.loadDbTexts();
      this.initChoices();
      this.resetExport();
      this.refreshSignal.set(1);
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
    }
  }


  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const event = EventFactory.empty(); // just for dbtxt
    this.eventtxt = GlobalFunctions.objText(event,
      'Event', this.auth.systemTexts, language,  this.name);
  }

  private initChoices(): void {
    this.calendarTypeChoices = [
      {value: 'P', text: this.auth.txt['plan'], isSelected: true},
      {value: 'A', text: this.auth.txt['actual'], isSelected: false},
      {value: 'E', text: this.auth.txt['only'] + ' ' + this.auth.txt['events'], isSelected: false},
      {value: 'T', text: this.auth.txt['only'] + ' ' + this.auth.txt['time_spans'], isSelected: false},
      {value: 'U', text: this.auth.txt['time_spans'] + ' & ' + this.auth.txt['events'] + ' type 4 - Urlaub or location incl #', isSelected: false},
    ];
  }

  // buils a line in an ics calendar file
  private icsLine(what: string, content: string): string {
    return what + ':' + content + CRLF;
  }

  /** --------------------------  public methods -------------------------------------------- */

  resetExport() {
    // default filename and fileType (in the moment we do not use an option for this)
    this.fileName = 'exportCal';
    // alternate: formatDate(new Date(), 'yyyyMMdd_HHmm', this.locale);
    this.fileExtension = GlobalFunctions.getYMD(new Date()) + '_' + GlobalFunctions.getHM4String(new Date());
    this.isFileExtension = true;
    this.fileType = 'ics';
    this.extendedFileName = this.fileName + (this.isFileExtension ? '_' + this.fileExtension : '') + '.' + this.fileType;
    this.readySignal.set(0);
    this.resetSignal.set(0);
    this.finishedSignal.set(0);
    this.isUpdateExtendedFileName = false;
    this.isUpdateFileName = false;
    this.isUpdateFileType = false;
  }

  setUpdateExtendedFileName() {
    this.isUpdateExtendedFileName = !this.isUpdateExtendedFileName;
  }

  setUpdateFileName() {
    this.isUpdateFileName = true;
  }

  updateFileName(name: string) {
    this.fileName = name;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileName = false;
    this.resetSignal.set(1);
  }

  setUpdateFileType() {
    this.isUpdateFileType = true;
  }

  updateFileType(type: string) {
    this.fileType = type;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileType = false;
    this.resetSignal.set(1);
  }

  setShowExtension(event: any) {
    this.isFileExtension = event.target.checked;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;;
    this.resetSignal.set(1);
  }

  public setCalendarType(event: any) {
    this.calendarTypeChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
  }

  async prepareExport() {
    let textContent = '';
    this.recordCount = 0;

    /*
    // TODO future use - for export planned events
      we could implement a dateExported and filter
      events which are not exported to an external calendar or changed after last export
      anyway -       only active events: status < 9
    */
    const events = this.calendarService.getEvents(this.name);
    const today = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const session = this.auth.getSession(this.name);
    const contacts = this.contactService.getContacts(this.name);
    if (events && events?.length > 0) {
      if (this.calendarTypeChoices[0].isSelected) {
        //  we export planned event (type 0) which ends 3 days before today or later
        this.calendarEvents = events.filter(_ => _.type === EventType.plan &&  _.status < 9
          && GlobalFunctions.addDays(_.eventEnd, 3) > today );
      } else {
        const actualEvents = events.filter(_ => (_.type === EventType.actual || (_.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9)) &&  _.status < 9);
        if ( (this.calendarTypeChoices[1].isSelected)) {
          this.calendarEvents = actualEvents;
        } else if ( (this.calendarTypeChoices[2].isSelected)) {
           this.calendarEvents = actualEvents?.filter(_ => _.type === EventType.actual);
        } else if ( (this.calendarTypeChoices[3].isSelected)) {
          this.calendarEvents = actualEvents?.filter(_ => _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9);
        } else if ( (this.calendarTypeChoices[4].isSelected)) {
          // if we have same begin, the longer timespan must be first
          const sortElements: Array<ISortElement> = [{sortField: 'eventBegin', key: 'eventBegin'}, {sortField: 'eventEnd', key: 'eventEnd', order: 'desc'}]
          // all timespans and only events which are at an time span type 4 ...
          const timeSpams =  actualEvents?.filter(_ => _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9);
          const type4timeSpans = timeSpams?.filter(_ => _.type === EventType.timeSpanCategory4 || _.location.includes('#'))
          .sort(GlobalFunctions.sortFields(sortElements));
          const events = actualEvents?.filter(_ => _.type === EventType.actual);
          if (events?.length > 0 && type4timeSpans?.length > 0) {
            this.calendarEvents = events
            .filter(_ => {
              const maxTimeSpanSmaller = type4timeSpans.reduce((max, current) => {
                return current.eventBegin.getTime() < _.eventBegin.getTime() && current.eventBegin.getTime() > max.eventBegin.getTime()? current : max;
              }, type4timeSpans[0]);
              return _.eventBegin.getTime() < maxTimeSpanSmaller.eventEnd.getTime() ||  _.location.includes('#');
            })
            .concat(timeSpams)
            .sort(GlobalFunctions.sortFields(sortElements));
          } else {
             this.calendarEvents = timeSpams;
          }
        }
      }
      const timeSpanTypes: Array<IChoice> = [];
      // for timeSpans (and for sub-components) we need texts from general options - we load them from option rsessources (option.json)
      const options = await this.configurationService.getConfigurationOptions(this.name);
      for (let i = 1; i <= 9; i++) {
        const cat = i === 1 ? 'holiday' : i === 2 ? 'birthday' : i.toString();
        const category = ConfigurationOptionBasicFunctions.getOptionString(options, 'opt_span_' + cat) ?? '';
        let text = category;
        if (category.includes('#')) {
          text = category.substring(0, category.indexOf('#'));
        }
        timeSpanTypes.push({
          value: i.toString(),
          text,
          isSelected: false
        });
      }

      // ics Calendar Component
      textContent += this.icsLine(BEGIN, VCALENDAR);
      textContent += this.icsLine(VERSION, '2.0');
      textContent += this.icsLine(PRODID, '-//pEvent-log//');
      /*
      if (this.isExportLocalTimezone) {
      // we build X-WR-TIMEZONE anyway ...
      // it is a google not-standard entry ....
       */
      textContent += this.icsLine(X_WR_TIMEZONE, tz);
      textContent += this.icsLine(METHOD, PUBLISH);
      this.calendarEvents.forEach(_ => {
        // ics Event Component
        textContent += this.icsLine(BEGIN, VEVENT);
        if (_.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9) {
          // timeSpans are exported with this format:
          const VALUE_DATE = 'VALUE=DATE';
          textContent += this.icsLine(DTSTART+';' + VALUE_DATE, GlobalFunctions.getYMD(_.eventBegin)?.toString() ?? '');
          textContent += this.icsLine(DTEND+';' + VALUE_DATE, GlobalFunctions.getYMD(_.eventEnd)?.toString() ?? '');
        } else if (this.isExportLocalTimezone) {
          textContent += this.icsLine(DTSTART+';'+TZID+'='+tz, GlobalFunctions.getIcsDateStringLocal(_.eventBegin));
          textContent += this.icsLine(DTEND+';'+TZID+'='+tz, GlobalFunctions.getIcsDateStringLocal(_.eventEnd));
        } else {
          textContent += this.icsLine(DTSTART, GlobalFunctions.getIcsDateStringUTC(_.eventBegin));
          textContent += this.icsLine(DTEND, GlobalFunctions.getIcsDateStringUTC(_.eventEnd));
        }
        textContent += this.icsLine(DTSTAMP, GlobalFunctions.getIcsDateStringUTC(today));
        // UID unique with timestamp (no, we make it unique accoring to our app)
        const uid = _.eventId.toString() + '@daisytest_' + session?.userName;
        textContent += this.icsLine(UID, uid);
        textContent += this.icsLine(SUMMARY, _.summary);
        if (_.description && _.description !== '') {
          // desription is the only field where we allow multi-line entries
          // we replace all \n = LF = H0A by zoned characters \n
          textContent += this.icsLine(DESCRIPTION, _.description.replaceAll(/\n/g, LF_ZONED));
        }
        let location = '';
        let isText = false;
        if (_.locationType  &&_.locationType > 0) {
          location += this.auth.txt[LocationType[_.locationType]];
          isText = true;
        }
        if (_.location && _.location !== '') {
          location += (isText ? LF_ZONED : '') + _.location;
          isText = true;
        }
        // name and address are concatenated from contact fields in DB query
        const contact = contacts.find(contact => contact.contactNr === _.contactNr);
        if (contact && contact?.displayName && contact.displayName !== '') {
          location += (isText ? LF_ZONED : '') + contact.displayName;
          isText = true;
        }
        // TODO regard also companyPlz, companyStreet, ...
        if (contact?.contactPlz && contact?.contactPlz> 0) {
          location += (isText ? LF_ZONED : '') + contact.contactPlz;
          isText = true;
        }
        if (contact?.contactCity && contact?.contactCity !== '') {
          location += (isText && !(contact?.contactPlz && contact?.contactPlz> 0) ? LF_ZONED : '') + contact.contactCity;
          isText = true;
        }
        if (contact?.contactStreet && contact?.contactStreet !== '') {
          location += (isText ? LF_ZONED : '') + contact.contactStreet;
          isText = true;
        }
        if (location !== '') {
          // we use LOC to code location type (LOC=location type, and repeated in text also ..)
          if (_.locationType  && _.locationType > 0) {
            const LOC = 'LOC=';
            textContent += this.icsLine(LOCATION +';' + LOC + _.locationType, location);
          } else {
            textContent += this.icsLine(LOCATION, location);
          }
        }
        if (_.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9) {
          const category = timeSpanTypes.filter(cat => Number(cat.value) === _.type % 10)[0]?.text ?? '';
          textContent += this.icsLine(CATEGORIES, category);
        }
        textContent += this.icsLine(CLASS, 'PUBLIC');
        textContent += this.icsLine(CREATED, GlobalFunctions.getIcsDateStringUTC(_.created));
        if (_.updated) {
          textContent += this.icsLine(LAST_MODIFIED, GlobalFunctions.getIcsDateStringUTC(_.updated));
        }
        textContent += this.icsLine(END, VEVENT);
        this.recordCount += 1;
      });
      textContent += this.icsLine(END, VCALENDAR);
    }
    /* build a file for DEBUG purpose
    // console.log('test content: ', textContent.substring(0, 10), '...', textContent.length, '...', textContent.substring(textContent.length - 10));
    // this.url = await this.putContentToFile('cal-export-content-', textContent);
    if (this.url?.length > 0) {
      this.isExportReady = true;
      this.isResetable = true;
    }
    */
    // we event with encodedUrl 
    this.encodedUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
    //console.log('this.encodedUri: ',  this.encodedUri.substring(0, 10), '...', this.encodedUri.length, '...', this.encodedUri.substring(this.encodedUri.length - 10));
    this.readySignal.set(1);
    this.resetSignal.set(1);
  }

  // ONLY for DEBUGGING
  // this can not be used in this way - url to /users is not accessible via href for download ...
  async putContentToFile(fileName: string, content: string): Promise<string | null> {
    const session = this.auth.getSession(this.name);
    if (session) {
      const authIndex = session.authorizations.findIndex(_ => _.providerType === (session.app > 2 ? 2 : session.app));;
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        const auth = authorization.authorization;
        const location =  '/download/';
        const op = 'download directory on webServer';
        const headers = new Headers({
          'Authorization': auth,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        });
        const mode: RequestMode = 'cors';
        // we must check if directory already exists - otherwise we get HTTP error 405
        let isDownloadOk: boolean = await this.fetch.getOk(location, headers, mode)
        .catch((error: any) : any => {
          this.logger.error(this.auth.getSession(this.name), this.name, `${op} on: ${location} failed: ${error.message}`);
          this.message.info(this.name + `: ${op} on: ${location} failed: ${error.message}`);
          return false;
        });
        if (!isDownloadOk) {
          const op = 'make download directory on webServer';
          isDownloadOk = await this.fetch.mkcol(location, headers, mode)
          .catch((error: any) : any => {
            this.logger.error(this.auth.getSession(this.name), this.name, `${op} on: ${location} failed: ${error.message}`);
            this.message.info(this.name + `: ${op} on: ${location} failed: ${error.message}`);
            return false;
          });
        }
        if (isDownloadOk) {
          const logDate = new Date();
          const fileNameExtended = fileName
            + GlobalFunctions.getYString(logDate) + '_'
            + GlobalFunctions.getMonth2String(logDate)  + '_'
            + GlobalFunctions.getDay2String(logDate)  + '_'
            + GlobalFunctions.getHours2String(logDate)  + '_'
            + GlobalFunctions.getMinutes2String(logDate)  + '_'
            + GlobalFunctions.getSeconds2String(logDate) + '.ics';
          const url = location + fileNameExtended;
          const op = 'put content on webServer';
          const isPutOk: boolean = await this.fetch.putTxt(url, content, headers, mode)
          .catch((error: any) : any => {
            this.logger.error(this.auth.getSession(this.name), this.name, `${op} on: ${url} failed: ${error.message}`);
            this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
            return false;
          });
          if (isPutOk) {
            return url;
          }
        }
      }
    }
    return null;
  }

  // here we conform finished export - export itself is done by <a href=encodedUri> in html template ...
  async setExportFinished() {
    this.finishedSignal.set(1);
    // there is no update isExported in all records (isExported is reserved for export event to a issue and event reporting system)
    alert(this.recordCount + ' ' + this.auth.txt['records_exported']);
  }

}

