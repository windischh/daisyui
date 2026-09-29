import { Component, Inject, LOCALE_ID, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet, NgClass, NgStyle, SlicePipe, DecimalPipe, DatePipe } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';
import { IcsFunctions } from '../../_globals/ics-functions';
import { DEFAULT_TIME_SLIZE, LF, MAX_INTERVAL_LENGTH, MAX_MONTHS, WHITE, WHITE_SMOKE } from '../../_globals/constants';
import { StyleFactory } from '../../_globals/style-factory';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { Event } from '../../_db/event';
import { EventFactory } from '../../_db/event-factory';
import { ConfigurationOption } from '../../_db/configuration-option';

import { EventType } from '../../_enums/event-type.enum';

import { ISortElement } from '../../_interfaces/i-sort-element';
import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { CalendarService } from '../../_services/calendar.service';
import { FetchApiService } from '../../_services/fetch-api.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ConfigurationService } from '../../_services/configuration.service';

import { PaginatorComponent } from '../paginator/paginator';




/*
  we use IcsFunctions.icsToJson() in getIcsData

  imported event are carried through 3 steps (source - checked - import ready) and set a event status:
  event.status >= 90 ? 'rejected' : event.status >= 9 ? 'overlap' :  event.status > 0 ? 'shift' : ''

  all import ready events with status < 9 are imported, status is set to 0

*/

// events are all calendar events, including timeSpans - it are extended wprls
class EventExtended extends Event {style!: {}; typeChoices!: Array<IChoice>};
@Component({
  selector: 'dsy-calendar-import',
  templateUrl: './calendar-import.html',
  styleUrl: './calendar-import.css',
  imports: [ NgClass, FormsModule, NgTemplateOutlet, NgStyle, PaginatorComponent, SlicePipe, DecimalPipe, DatePipe]
})
export class CalendarImportComponent {

public name = 'CalendarImportComponent';

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  ConfigurationOptionBasicFunctions: typeof ConfigurationOptionBasicFunctions = ConfigurationOptionBasicFunctions

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loaded
  public refreshCounterSignal = signal(0);

  public dummyData!: string;
  
  EventType: typeof EventType = EventType;


  // fileString contails file as string
  fileString!: string;
  fileSize!: number;

  // user can select a time span type 
  timeSpanType!: number;
  timeSpanText!: string;
  timeSpanStyle!: {};
  
  timeSpanTypeChoices!: Array<IChoice>;
  // categories are indexed by type-part x in time spans with types 2x
  timeSpanTypeColors!: Array<{text: string, color: string}>;
  
  // imported events from file system, sorted and eventually updated timeSpan type
  sourceEvents!: Array<EventExtended>;
  // selected and checked events - according to import step 
  events!: Array<EventExtended>;
  // filtered events (only events/only timespans/only errors) as a base for showEvents
  allShownEvents!: Array<EventExtended>;
  // shown events
  shownEvents!: Array<EventExtended>;

  // db elements with their texts (single db object just used for generating texts)
  eventtxt: { [key: string]: string } = {};

  options!: Array<ConfigurationOption>;

  file!: File | null;
  // signal 0 - no ics file 1 - icd Format ok 2 ics format not ok
  validIcsFileSignal = signal(0);
  error: any;

  encodedUri!: string;
  fileName!: string;
  fileType!: string;
  extendedFileName!: string;

  recordCount!: number;
  errorCount!: number;
  modified!: number;
  rejected!: number;
  withoutOverlap!: number;
  partiallyOverlap!: number;
  completeOverlap!: number;
  timeSpanCount!: number;
  timeSpanIsTyped!: number;
  timeSpanOverlap!: number;
  timeSpanRejected!: number;
  importCount = 0;

  isUpdateFileName = false;
  isUpdateFileType = false;
  isUpdateExtendedFileName = false;
  resetableSignal = signal(0);

  dateFrom!: Date | null;
  isDateFromEntered = false;
  dateTo!: Date | null;
  isDateToEntered = false;

  sourceReadySignal = signal(0);
  sourceCheckedSignal = signal(0);
  importReadySignal = signal(0);
  importFinishSignal = signal(0);

  // progress properties
  public showProgressSignal = signal(0);
  public progressStyle = {
    'transition-duration': '300ms',
    'display': 'block',
    'width': '0%'
  };
  public progressValue = 0;
  public progressTotal = 0;
  public progressPercent = 0;

  isShowRemarked = false;
  isShowEvent = true;
  isShowTimeSpans = true;

  // when set false, we allow only DTSTART and DTEND as UTC time values
  isImportLocalTimezone = false;
  // are events with local timezobne occuring
  isLocalEvents = false;

  // variables for paginator
  total!: number; // total number of items
  names!: Array<string> // optional - names of each record, length must be 0 or === total
  abbrPlaces = 20; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page



  constructor(@Inject(LOCALE_ID) public locale: string,
    private fetch: FetchApiService,
    private calendarService: CalendarService,
    private configurationService: ConfigurationService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LogService,
    private message: MessageService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.loadDbTexts();
      await this.loadTimeSpanTypeChoices();
      this.resetImport();
      this.refreshCounterSignal.set(this.refreshCounterSignal() + 1);
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

  private async loadTimeSpanTypeChoices() {
    this.timeSpanTypeChoices = [];
    this.options = await this.configurationService.getConfigurationOptions(this.name);
    this.timeSpanTypeColors = [];
    this.timeSpanTypeChoices = [];
    for (let i = 0; i <= 9; i++) {
      const cat = i === 0 ? 'undefined' : i === 1 ? 'holiday' : i === 2 ? 'birthday' : i.toString();
      const category = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_span_' + cat) ?? '';
      let text = category;
      let color = '';
      let style: {};
      if (category.includes('#')) {
        text = category.substring(0, category.indexOf('#'));
        color = category.substring(category.indexOf('#'));
        style = StyleFactory.getBgColorStyle(color, 80, 2);
      } else {
        style = {'background-color': WHITE};
      }
      this.timeSpanTypeColors.push({
        text,
        color
      });
      this.timeSpanTypeChoices.push({
        value: i.toString(),
        text,
        style,
        isSelected: false
      });
    }
    // user can select a time span type - default is category 3, type 23
    this.timeSpanType = EventType.timeSpanCategory3;
    const ix = this.timeSpanTypeChoices.findIndex(choice => Number(choice.value) === this.timeSpanType % 10);
    if (ix >= 0) {
      this.timeSpanStyle = this.timeSpanTypeChoices[ix].style ?? {};
      this.timeSpanText = this.timeSpanTypeChoices[ix].text;
      this.timeSpanTypeChoices[ix].isSelected = true;
    } else {
      this.timeSpanStyle = {};
      this.timeSpanText = '';
    }
  }



   /**
   * setEventContent - is a supprting function
   * sets view-relevant fields in model event element 
   * @param view event element in view
   * @param model event element in model
   */
   private setEventContent(view: EventExtended, model: EventExtended): EventExtended {
    model.summary = view.summary;
    model.description = view.description;
    model.locationType = view.locationType;
    model.location = view.location;
    model.eventBegin =  view.eventBegin;
    model.eventEnd =  view.eventEnd;
    model.eventDuration = view.eventDuration;
    model.uid = view.uid;
    model.type = view.type;
    model.status = view.status;
    model.style = GlobalFunctions.clone(view.style);
    model.typeChoices = GlobalFunctions.clone(view.typeChoices);
    return model;
  }

  // this.events are restricted an dataFrom, dataTo and sorted on eventBegin ASC 
  private buildEvents(events: Array<EventExtended>): void {
    // only events which are in a correct stream are treated
    // here we get only actual and plan events within dateFrom and dateTo
    // shorter event comes first if eventBegin is the same ...
    const sortFields: Array<ISortElement> =  [{sortField: 'eventBegin', key: 'eventBegin'}, {sortField: 'eventDuration', key: 'eventDuration'}];
    this.events = events
    .filter(_ => _.status < 90 
      && (!this.dateFrom || GlobalFunctions.getDateInMinutes(_.eventBegin) >= GlobalFunctions.getDateInMinutes(this.dateFrom))
      && (!this.dateTo || GlobalFunctions.getDateInMinutes(_.eventBegin) < GlobalFunctions.getDateInMinutes(GlobalFunctions.addDays(this.dateTo, 1))))
    // sort according to options
    .sort(GlobalFunctions.sortFields(sortFields));
    this.recordCount = this.events.length;
    this.errorCount = this.events.filter(_ => _.type < 0).length;
    this.timeSpanCount = this.events.filter(_ => _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9).length;
  }

  private prepareShownEvents(): void {
    // paginator - this paginator has names
    this.selectedPage = 1;
    this.allShownEvents = this.events.filter(_ => this.isShowRemarked ? (_.type < 0 || _.status > 0) : ((this.isShowEvent && _.type < 20) || (this.isShowTimeSpans && _.type >= 20)));
    // without nr if we sort on names ....
    this.names = this.allShownEvents.map(_ => (GlobalFunctions.getY(_.eventBegin) + ' ' + GlobalFunctions.getMonth2String(_.eventBegin) + ' '+  _.summary.substring(0, 12)));
    // paginator - set total records - after setting names, total triggers paginator refresh
    this.total = this.allShownEvents.length;
    this.limit = this.total > 1000 ? 20 : 10;
    this.shownEvents = this.allShownEvents.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }

  /**
   * checkOverlapping()
   * put events in an array of overlapping events
   * make not overlap by correcting begin/and (or set to status 90 if they can not be)
   * @param uncheckedEvents array with events which start on same day
   * @param nextBegin optional: if set, there is a next event at
   * @return array of events which do not overlap
   */
  private checkOverlapping(uncheckedEvents: Array<EventExtended>, nextBegin?: Date): Array<EventExtended> {
    let previousEvent: EventExtended | undefined;
    let checkedEvents: Array<EventExtended> = [];
    for (const uncheckedEvent of uncheckedEvents) {
      let checkedEvent: EventExtended = {...EventFactory.empty(), style: {}, typeChoices: []};
      this.setEventContent(uncheckedEvent, checkedEvent);
      // we want to find source of checked event ....
      checkedEvent.eventId = uncheckedEvent.eventId;
      checkedEvent.name = '';
      if (previousEvent) {
        // we set eventBegin to end of previous event
        const endOfDay = GlobalFunctions.getEndOfDay(uncheckedEvent.eventBegin);
        const latestBegin = GlobalFunctions.addMinutes(endOfDay, -5);
        if (GlobalFunctions.getDateInMinutes(previousEvent.eventEnd) > GlobalFunctions.getDateInMinutes(latestBegin)) {
          checkedEvent.name = checkedEvent.name + ' shift not possible - event suppressed';
          // set not acceptable events status to 90
          checkedEvent.status = 90;
        } else if (GlobalFunctions.getDateInMinutes(previousEvent.eventEnd) > GlobalFunctions.getDateInMinutes(uncheckedEvent.eventBegin)) {
          // we set begin to end of previous event
          checkedEvent.eventBegin = previousEvent.eventEnd;
          checkedEvent.eventEnd = GlobalFunctions.addMinutes(checkedEvent.eventBegin, checkedEvent.eventDuration);
          checkedEvent.name = checkedEvent.name + '  begin shifted';
          checkedEvent.status = 1;
        } else {
          checkedEvent.name = checkedEvent.name + ' system failure at check event - this should not occur ...';
          // set not acceptable events status to 90
          checkedEvent.status = 90;
        }
      }
      if (nextBegin && checkedEvent.status < 9 && GlobalFunctions.getDateInMinutes(checkedEvent.eventEnd) > GlobalFunctions.getDateInMinutes(nextBegin)) {
        checkedEvent.eventEnd = nextBegin;
        checkedEvent.eventDuration = GlobalFunctions.getDateInMinutes(checkedEvent.eventEnd) - GlobalFunctions.getDateInMinutes(checkedEvent.eventBegin);
        checkedEvent.status++;
        checkedEvent.name = checkedEvent.name + ' end overlaps next event - shortened';
        // console.log(' end overlaps next event - shortened: ', checkedEvent);
      }
      checkedEvents.push(checkedEvent);
      previousEvent = checkedEvent;
    }
    return checkedEvents;
  }

  /**
 * showProgress()
 * @param value count of uploaded elements
 * @param total  summary of documents to be uploaded
 * @param duration in milliseconds - after duration prograss window disappears
 */
  private showProgress(value: number, total: number, duration?: number) {
    // duration in millisec until progrss windows disappears
    if (!duration || isNaN(duration)) {
      duration = 3000;
    }
    if (value > 0 && total >= value) {
      this.progressValue = value;
      this.progressTotal = total;
      this.showProgressSignal.set(this.showProgressSignal() + 1);
      this.progressPercent = Math.floor(value * 100 / total);
      this.progressStyle.width = this.progressPercent.toString() + '%';
    }
    if (value >= total)  {
      this.progressPercent = 100;
      this.progressStyle.width = '100%';
      setTimeout(() => {
      this.showProgressSignal.set(0);
      }, duration);
    }
  }

  // used to trigger change detection after updating a variable in this component ...
  private async fetchDummyData(duration?: number): Promise<void> {
    this.dummyData = 'load data .....';
    // duration in millisec until progrss windows disappears
    if (!duration || isNaN(duration)) {
      duration = 200; // 200 milliseconds default
    }

    // simulates asynchrone HTTP-requestwith Promise
    const dummyData = await new Promise<string> ((resolve) => {
      setTimeout(() => {
        resolve('data loaded ...!');
      }, duration); 
    });

    this.dummyData = dummyData; // Angular recognises because we change this.
  }




  /** --------------------------  public methods -------------------------------------------- */

  public resetImport() {
    // default filename (can not be set in input type file) and fileType
    this.fileName = '*';
    this.fileType = 'ics';
    this.extendedFileName = '';
    this.file = null;
    this.validIcsFileSignal.set(0);
    this.isUpdateExtendedFileName = false;
    this.isUpdateFileName = false;
    this.isUpdateFileType = false;
    this.resetableSignal.set(0);

    this.sourceReadySignal.set(0);
    this.sourceCheckedSignal.set(0);
    this.importReadySignal.set(0);
    this.importFinishSignal.set(0);

    this.isShowRemarked = false;

  }

  public async fileAdded(files: FileList) {
    // console.log('files: ', files);
    if (files === undefined || files.length === 0) {
      this.validIcsFileSignal.set(0);
    } else {
      // we accept only one valid file
      this.validIcsFileSignal.set(1);
      // console.log('file size: ', files[0].size);
      const fileString = await this.fetch.getReadRequest(files[0])
      .catch((error: any) : any => {
        this.error = error;
        this.validIcsFileSignal.set(2);
        this.resetableSignal.set(1);
        return null;
      });
      // console.log('fileString: ', fileString);
      this.fileSize = files[0].size;
      this.fileString = fileString;

      try {
        // JSON.parse(fileString);
        // here we could use an external ics checker ...
        const isIcsHeader = this.fileString.toUpperCase().startsWith('BEGIN:VCALENDAR');
        if (!isIcsHeader) throw new Error('ics header missing');
        const isIcsFooter = this.fileString.trimEnd().toUpperCase().endsWith('END:VCALENDAR');
        if (!isIcsHeader) throw new Error('ics footer missing');
      } catch (error) {
        //Error - JSON is not okay
        this.error = error;
        this.validIcsFileSignal.set(2);
        this.resetableSignal.set(1);
      }
      if (this.validIcsFileSignal() === 1) {
        this.file = files[0];
        this.extendedFileName = this.file.name;
      }
    }
    this.refreshCounterSignal.set(this.refreshCounterSignal() + 1);
  }

  public setUpdateExtendedFileName() {
    this.isUpdateExtendedFileName = !this.isUpdateExtendedFileName;
  }

  public setUpdateFileName() {
    this.isUpdateFileName = true;
  }

  public updateFileName(name: string) {
    this.fileName = name;
    this.isUpdateFileName = false;
    this.resetableSignal.set(1);
  }

  public setUpdateFileType() {
    this.isUpdateFileType = true;
  }

  public updateFileType(type: string) {
    this.fileType = type === '' ? '*' : type;
    this.isUpdateFileType = false;
    this.resetableSignal.set(1);
  }

  public async getIcsData() {
    this.validIcsFileSignal.set(0);
    this.recordCount = 0;
    this.errorCount = 0;
    this.sourceEvents = [];
    this.events = [];
    // here we parse data and get events -events may have correct begin and end dates or not ...
    const icsEvents = IcsFunctions.icsToJson(this.fileString);
    let eventId = 0;
    if (icsEvents?.length > 0) {
      for (const icsEvent of icsEvents) {
        let duration = 0;
        let sourceEvent: EventExtended = {...EventFactory.empty(), style: {}, typeChoices: []};
        sourceEvent.name = '';
        // in case duration > 0: begin, end are correct dates . otherwise they might be undefined ...
        const beginMinutes = GlobalFunctions.getDateInMinutes(icsEvent.startDate);
        let endMinutes = GlobalFunctions.getDateInMinutes(icsEvent.endDate);
        sourceEvent.eventBegin = beginMinutes > 0 ? icsEvent.startDate : null;
        sourceEvent.eventEnd = endMinutes > 0 ? icsEvent.endDate : null;
        if (beginMinutes > 0 && endMinutes > 0 ) {
          if (endMinutes > beginMinutes) {
            duration = endMinutes - beginMinutes;
            // begin and end at sime date/time is corrected
          } else if (endMinutes === beginMinutes) {
            if (sourceEvent.eventBegin.getHours() === 0 && sourceEvent.eventBegin.getMinutes() === 0) {
              endMinutes += 24 * 60;
              duration = endMinutes - beginMinutes;
              sourceEvent.eventEnd = GlobalFunctions.addMinutes(sourceEvent.eventEnd, 24 * 60);
            } else {
              endMinutes += DEFAULT_TIME_SLIZE;
              duration = endMinutes - beginMinutes;
              sourceEvent.eventEnd = GlobalFunctions.addMinutes(sourceEvent.eventEnd, DEFAULT_TIME_SLIZE);
            }
          }
        } else if (beginMinutes > 0) {
          endMinutes = beginMinutes + DEFAULT_TIME_SLIZE;
          duration = endMinutes - beginMinutes;
          sourceEvent.eventEnd = GlobalFunctions.addMinutes(sourceEvent.eventBegin, DEFAULT_TIME_SLIZE);
        }
        if (duration > 0) {
          if (icsEvent.startDateFormat === 2 || icsEvent.endDateFormat === 2) {
            this.isLocalEvents = true;
          }
          if ((icsEvent.startDateFormat === 2 || icsEvent.endDateFormat === 2) && !this.isImportLocalTimezone) {
            // we do not allow local timezone ....
            sourceEvent.type = -1;
            sourceEvent.name = 'local timezone not allowed';
          } else if (duration <= MAX_INTERVAL_LENGTH) {
            // all entries after today's start are planned ...
            if (GlobalFunctions.getDateInMinutes(sourceEvent.eventBegin) >= GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(new Date()))) {
              sourceEvent.type = EventType.plan;
            } else {
              sourceEvent.type = EventType.actual;
            }
          } else if (duration <= MAX_MONTHS * 30 * 24 * 60) {
            // calendar entries which are too long (but not longaer than MAX_MONTHS) to be valid events become timeSpans#
            sourceEvent.typeChoices = GlobalFunctions.clone(this.timeSpanTypeChoices);
            sourceEvent.typeChoices.forEach(_ => _.isSelected = false);
            let isTypeFound = false;
            if (icsEvent.categories && icsEvent.categories?.length > 0) {
              // timeSpanType is the first match of one of the  cateories  with time span types ...
              for (let index = 0; index < icsEvent.categories.length && !isTypeFound; index++) {
                const catString: string = icsEvent.categories[index];
                const catIndex = sourceEvent.typeChoices.findIndex(_ => catString.startsWith(_.text) && _.text.length > 0);
                if (catIndex >= 0) {
                  sourceEvent.type = 20 + Number(sourceEvent.typeChoices[catIndex].value);
                  // type 21 is for default setting
                  // if we recognize type 21 (Feiertag) we set it to rejected
                  if (sourceEvent.type === EventType.timeSpanCategory1) {
                    sourceEvent.type = EventType.timeSpanUndefined;
                    sourceEvent.typeChoices[0].isSelected = true;
                  } else {
                    sourceEvent.style = sourceEvent.typeChoices[catIndex].style ?? {};
                    sourceEvent.typeChoices[catIndex].isSelected = true;
                  }
                  isTypeFound = true;
                }
              }
            }
            if (!isTypeFound) {
              if (icsEvent.summary?.startsWith('Neuj')
              || icsEvent.summary?.startsWith('Heilige')
              || icsEvent.summary?.startsWith('Kar')
              || icsEvent.summary?.startsWith('Oster')
              || icsEvent.summary?.startsWith('Christ')
              || icsEvent.summary?.startsWith('Pfingst')
              || icsEvent.summary?.startsWith('Fronl')
              || icsEvent.summary?.startsWith('Mariä ')
              || icsEvent.summary?.startsWith('Maria ')
              || icsEvent.summary?.startsWith('Staats')
              || icsEvent.summary?.startsWith('National')
              || icsEvent.summary?.startsWith('Reformations')
              || icsEvent.summary?.startsWith('Aller')
              || icsEvent.summary?.startsWith('Unbefleckte')
              || icsEvent.summary?.startsWith('Weihn')
              || icsEvent.summary?.startsWith('Stefani')
              ) {
                sourceEvent.type = EventType.timeSpanUndefined;
                sourceEvent.typeChoices[0].isSelected = true;
              } else if (icsEvent.summary?.startsWith('Url')) {
                sourceEvent.type = EventType.timeSpanCategory4;
                sourceEvent.typeChoices[4].isSelected = true;
              } else {
                sourceEvent.type = EventType.timeSpanCategory1;
                sourceEvent.typeChoices[1].isSelected = true;
              }
            }
          } else {
            // max duration is MAX_MONTHS ....
            sourceEvent.type = -1;
            sourceEvent.name = 'time interval too long';
            console.log('time interval too long: ', icsEvent);
          }
        } else {
          // we ignore type -1
          sourceEvent.type = -1;
          // icsEvent.startDate , icsEvent.endDate, icsEvent.summary
          sourceEvent.name = 'incorrect begin/end';
          console.log('incorrect begin/end: ', icsEvent);
        }
        // we store duration anyway, also if it is 0 or undefined - we filter it when processing import
        sourceEvent.eventDuration = duration;
        if (icsEvent.summary && icsEvent.summary !== '') {
          sourceEvent.summary = icsEvent.summary;
        } else {
          if (icsEvent.description && icsEvent.description !== '') {
            sourceEvent.name += ' summary missing - we take description';
            sourceEvent.summary = icsEvent.description.substring(0, 80);
            // console.log('summary missing - we take description: ', icsEvent);
          } else if (icsEvent.location && icsEvent.location !== '') {
            sourceEvent.name += ' summary missing - we take location';
            sourceEvent.summary = icsEvent.location.substring(0, 80);
            // console.log('summary missing - we take location: ', icsEvent);
          } else if (icsEvent.categories && icsEvent.categories?.length > 0) {
            sourceEvent.name += ' summary missing - we take category';
            sourceEvent.summary = icsEvent.categories[0];
            // console.log('summary missing - we take category: ', icsEvent);
          } else {
            sourceEvent.type = -1;
            sourceEvent.name += ' summary missing';
            console.log('summary missing: ', icsEvent);
          }
        }
        if (icsEvent.description && icsEvent.description !== '') {
          sourceEvent.description = icsEvent.description;
        } else {
          // description ca be missing - type stays at it was
          sourceEvent.name += ' (description missing)';
        }
        if (icsEvent.location && icsEvent.location !== '') {
          sourceEvent.location = icsEvent.location;
          if (icsEvent.locType && Number(icsEvent.locType) > 0 && Number(icsEvent.locType) <= 6) {
            sourceEvent.locationType = Number(icsEvent.locType);
            // first part of location is the text of locationType - we suppress it
            if (sourceEvent.location.includes(LF)) {
              sourceEvent.location = sourceEvent.location.substring(sourceEvent.location.indexOf(LF) + 1);
            } else {
              sourceEvent.location = '';
            }
          }
        }
        if (icsEvent.uid && icsEvent.uid !== '') {
          sourceEvent.uid = icsEvent.uid;
        }
        sourceEvent.eventId = eventId;
        this.sourceEvents.push(sourceEvent);
        eventId++;
      }
      if (this.sourceEvents.length > 0) {
        /* test the paginator
        for (let ix = 0; ix < 5; ix++) {
          Array.prototype.push.apply(this.filteredDocuments, this.filteredCDocuments);
        }
        */
        // shorter event comes first if eventBegin is the same ...
        const sortFields: Array<ISortElement> =  [{sortField: 'eventBegin', key: 'eventBegin'}, {sortField: 'eventDuration', key: 'eventDuration'}];
        // sort according to options
        this.sourceEvents = this.sourceEvents.sort(GlobalFunctions.sortFields(sortFields))
        this.dateFrom = GlobalFunctions.getStartOfDay(this.sourceEvents[0].eventBegin);
        this.dateTo = GlobalFunctions.getStartOfDay(this.sourceEvents[this.sourceEvents.length - 1].eventBegin);
        this.buildEvents(this.sourceEvents);
        this.prepareShownEvents();
        // we show rejectd and overlaps in summary count, so we must set it now
        this.rejected = 0;
        this.completeOverlap = 0;
        this.validIcsFileSignal.set(1);
      }
    }
    this.sourceReadySignal.set(1);
    this.resetableSignal.set(1);
  }

  public toggleRemarked(event: any): void  {
    this.isShowRemarked = event.target.checked;
    this.prepareShownEvents();
  }

  public toggleEvent(event: any): void  {
    this.isShowEvent = event.target.checked;
    this.prepareShownEvents();
  }

  public toggleTimeSpans(event: any): void  {
    this.isShowTimeSpans= event.target.checked;
    this.prepareShownEvents();
  }

  public toggleLocalTimezone(event: any): void  {
    if (confirm('date boundaries and updated timeSpan categories are reset!')) {
      this.isImportLocalTimezone = event.target.checked;
      this.getIcsData();
    }
  }

  // select default category for all timeSpans
  public selectTimeSpanCategory(event: any): void  {
    this.timeSpanTypeChoices.forEach(_ => {
      if (_.value === event.target.value) {
        _.isSelected = true;
        this.timeSpanType = 20 + Number(_.value);
        const ix = this.timeSpanTypeChoices.findIndex(choice => choice.value === _.value);
        if (ix >= 0) {
          this.timeSpanStyle = this.timeSpanTypeChoices[ix].style ?? {};
          this.timeSpanText = this.timeSpanTypeChoices[ix].text;
        } else {
          this.timeSpanStyle = {};
          this.timeSpanText = ''
        }
      } else {
        _.isSelected = false;
      }
    });
  }

  // select time span category for 1 event
  public selectTimeSpanType(event: any, index: number): void  {
    const session = this.auth.getSession(this.name);
    if (session && session.isPlanMaint) {
      this.shownEvents[index].typeChoices.forEach(_ => {
        if (_.value === event.target.value) {
          _.isSelected = true;
          this.shownEvents[index].type = 20 + Number(_.value);
          const ix = this.timeSpanTypeChoices.findIndex(choice => choice.value === _.value);
          if (ix >= 0) {
            this.shownEvents[index].style = this.shownEvents[index].typeChoices[ix].style ?? {};
          } else {
            this.shownEvents[index].style = {};
          }
        } else {
          _.isSelected = false;
        }
      });
    } else {
      // we do not allow change of category because later this changed categories will not be able to be imported
      alert('not allowed due to user rights');
    }
    // TODO update of event in allShownEvents (not necessary because of object reference)
    //  but in events and sourceEvents

  }

  public setDateFromEntered(dateString: string) {
    this.isDateFromEntered = dateString !== '' ? true : false;
  }

  public setDateFrom(dateString: string) {
    if (this.sourceCheckedSignal() === 1) {
      alert ('source already checked ....');
    } else {
      let dateFrom = GlobalFunctions.parseDMYtoDate(dateString);
      if (dateFrom && (!this.dateTo || this.dateTo?.getTime() > dateFrom.getTime())) {
        this.dateFrom = GlobalFunctions.getStartOfDay(dateFrom);
        this.buildEvents(this.sourceEvents);
        this.prepareShownEvents();
      } else {
        this.dateFrom = null;
      }
    }
    this.isDateFromEntered = false;
  }

  public setDateToEntered(dateString: string) {
    this.isDateToEntered = dateString !== '' ? true : false;
  }

  public setDateTo(dateString: string) {
    if (this.sourceCheckedSignal() === 1) {
      alert ('source already checked ....');
    } else {
      let dateTo = GlobalFunctions.parseDMYtoDate(dateString);
      if (dateTo && dateString.length === 4) {
        dateTo = GlobalFunctions.addYears(dateTo, 1);
        dateTo = GlobalFunctions.addDays(dateTo, -1);
      }
      if (dateTo && (!this.dateFrom || dateTo.getTime() > this.dateFrom?.getTime())) {
        this.dateTo = GlobalFunctions.getStartOfDay(dateTo);
        this.buildEvents(this.sourceEvents);
        this.prepareShownEvents();
      } else {
        this.dateTo = null;
      }
    }
    this.isDateToEntered = false;
  }


  // we check import source events on timeSlize (5 min) and no overlap in source
  public setImportSourceChecked() {
    // this.sourceEvents.filter(_ => _.status > 0).forEach(_ => console.log('event with status > 0: ',_));
    // this.events are restricted an dataFrom, dataTo and sorted on eventBegin ASC 
    this.buildEvents(this.sourceEvents);
    // we build events which must be not overlapping
    let checkedEvents: Array<EventExtended> = [];
    let timeSpans: Array<EventExtended> = [];
    // eventDayStartMinute keeps start of day which are currently treating (is day start of all elements of overlappingEvents)
    let eventDayStartMinute = 0;
    // overlappingEvents are stored intermediately in this array until we release them
    let overlappingEvents: Array<EventExtended> = [];
    // lastMinute is the latest eventEnd of all elements of overlappingEvents
    let lastMinute = 0;
    for (let sourceEvent of this.events) {
      if (sourceEvent.type === EventType.actual || sourceEvent.type === EventType.plan) {
        const newDayStartMinute = GlobalFunctions.getDateInMinutes(GlobalFunctions.getStartOfDay(sourceEvent.eventBegin));
        if (overlappingEvents.length > 0 && (newDayStartMinute > eventDayStartMinute || GlobalFunctions.getDateInMinutes(sourceEvent.eventBegin) >= lastMinute)) {
          const overlapResolved = this.checkOverlapping(overlappingEvents, sourceEvent.eventBegin);
          checkedEvents = checkedEvents.concat(overlapResolved);
          overlappingEvents = [];
          eventDayStartMinute = 0;
          lastMinute = 0;
        }
        eventDayStartMinute = newDayStartMinute;
        lastMinute = GlobalFunctions.getDateInMinutes(sourceEvent.eventEnd) > lastMinute ? GlobalFunctions.getDateInMinutes(sourceEvent.eventEnd) : lastMinute;
        overlappingEvents.push(sourceEvent);
      } else {
         // timeSpan are as they are -- that means, no adjustment to 5 min timeSlie ...
         timeSpans.push(sourceEvent);
      }
    }
    if (overlappingEvents.length > 0) {
      const overlapResolved = this.checkOverlapping(overlappingEvents);
      checkedEvents = checkedEvents.concat(overlapResolved);
    }
    this.modified = checkedEvents.filter(_ => _.status > 0 && _.status < 9).length;
    this.rejected = checkedEvents.filter(_ => _.status >= 9).length;
    this.buildEvents(checkedEvents.concat(timeSpans));
    this.prepareShownEvents();
    this.sourceCheckedSignal.set(1);
  }

  // at back arrow from source checked ..
  public resetImportSource() {
    this.buildEvents(this.sourceEvents);
    this.prepareShownEvents();
    this.sourceCheckedSignal.set(0);
    this.rejected = 0;
  }

  // we check ipport (which is already source checked) on overlaps with existing events
  public async setImportOverlap() {
    let importEvents: Array<EventExtended> = [];
    this.withoutOverlap = 0;
    this.partiallyOverlap = 0;
    this.completeOverlap = 0;
    this.timeSpanIsTyped = 0;
    this.timeSpanOverlap = 0;
    this.timeSpanRejected = 0;
    const allEvents = this.calendarService.getEvents(this.name);
    const actualEvents = allEvents.filter(_ => _.type === EventType.actual && _.status < 9);
    const planEvents = allEvents.filter(_ => _.type === EventType.plan && _.status < 9);
    let eventCounter = 0;
    const events = this.events.filter(_ => _.type === EventType.actual || _.type === EventType.plan);
    for (const event of events) {
      let importEvent: EventExtended = {...EventFactory.empty(), style: {}, typeChoices: []};
      this.setEventContent(event, importEvent);
      importEvent.name = '';
      // we want to find source
      importEvent.eventId = event.eventId;
      let legacyEvents = actualEvents;
      if (event.type === EventType.plan) {
        legacyEvents = planEvents;
      }
      // we do not take event with same UID in consideration of overlapping because we will update it ...
      const session = this.auth.getSession(this.name);
      legacyEvents = legacyEvents.filter(_ => !(
        _.type === event.type
        &&  (_.eventId.toString() + '@daisytest_' + session?.userName) === event.uid
      ));
      const eventDay = GlobalFunctions.getStartOfDay(event.eventBegin);
      // check if there is no other actual event overlapping eventBegin of (eventually) generated new actual
      if (legacyEvents.filter(legacyEvent => legacyEvent.eventBegin <= event.eventBegin && legacyEvent.eventEnd > event.eventBegin).length === 0) {
        // spaceAfter is the max. length for imported event
        const spaceAfter = GlobalFunctions.getSpaceAfter(event.eventBegin, legacyEvents, eventDay);
        if (spaceAfter >= 5) {
          if (spaceAfter >=  event.eventDuration) {
            // all is ok - event is imported without change
            this.withoutOverlap++;
          } else {
            importEvent.eventDuration = spaceAfter;
            importEvent.eventEnd = GlobalFunctions.addMinutes(importEvent.eventBegin, importEvent.eventDuration);
            importEvent.name = importEvent.name + ' partially overlap - duration shortened';
            // set corrected overlap status +1
            importEvent.status += 1;
            this.partiallyOverlap++;
          }
        } else {
          // set not acceptable status + 9 (should not happen because we should have found legacy event ...)
          importEvent.name = importEvent.name + ' system failure at overlap check - this should not occur ...';
          importEvent.status += 9;
          this.completeOverlap++;
        }
      // there is event which overlaps begin
      } else {
        // we fix the legacy l event which overlaps imported eventBegin
        let isPossible = false;
        let legacyEvent = GlobalFunctions.getPreviousEvent(legacyEvents, event.eventBegin);
        if (!legacyEvent) {
          legacyEvent = GlobalFunctions.getNextEvent(legacyEvents, event.eventBegin);
        }
        // previousActualEvent is checked to assure previousActualEvent ....
        if (legacyEvent && (GlobalFunctions.getDateInMinutes(legacyEvent.eventBegin) <= GlobalFunctions.getDateInMinutes(event.eventBegin))) {
          let isSearchNext = true;
          for (let index = 0; isSearchNext; index++) {
            if (legacyEvent) {
              let spaceAfter = GlobalFunctions.getSpaceAfter(legacyEvent.eventEnd, legacyEvents, eventDay);
              // it is possible that spaceAfter is 0, due to directly follwing next event ...
              if (spaceAfter >= 5) {
                isSearchNext = false;
                if (GlobalFunctions.getDateInMinutes(legacyEvent.eventEnd)+ 5 <= GlobalFunctions.getDateInMinutes(event.eventEnd)) {
                  isPossible = true;
                  // begin is at end of legacy events range
                  importEvent.eventBegin = legacyEvent.eventEnd;
                  // end is at importend - if there is enough space ....
                  importEvent.eventDuration = GlobalFunctions.getDateInMinutes(event.eventEnd) - GlobalFunctions.getDateInMinutes(importEvent.eventBegin);
                  if (spaceAfter >= importEvent.eventDuration) {
                    importEvent.name = importEvent.name + ' partially overlap - begin shifted';
                  } else {
                    importEvent.name = importEvent.name + ' partially overlap - begin and end shifted';
                    importEvent.eventDuration = spaceAfter;
                    importEvent.eventEnd = GlobalFunctions.addMinutes(importEvent.eventBegin, importEvent.eventDuration);
                  }
                  // set corrected overlap status +1
                  importEvent.status += 1;
                  this.partiallyOverlap++;
                }
              } else {
                const untilDate = GlobalFunctions.addDays(eventDay, 1);
                if (legacyEvent) legacyEvent = GlobalFunctions.getNextEvent(legacyEvents, legacyEvent.eventEnd, untilDate);
                if (!legacyEvent || index > 100) {
                  isSearchNext = false;
                }
              }
            }
          }
        }
        if (!isPossible ) {
          importEvent.name = importEvent.name + ' total overlap - event rejected';
          // set not acceptable status + 9
          importEvent.status += 9;
          this.completeOverlap++;
        }
      }
      importEvents.push(importEvent);
      eventCounter++;
      if (this.events.length < 500 || eventCounter % 100 === 0) {
        await this.fetchDummyData(1000/this.events.length);
        this.showProgress(eventCounter, this.events.length);
      }
    }
    // timeSpan are taken from sourceEvents
    // and are checked if "double import" = same time span is imported again ...
    let legacyTimeSpans =  allEvents.filter(_ => _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9 && _.status < 9);
    let importTimeSpans: Array<EventExtended> = [];
    const timeSpans = this.events.filter(_ => _.type >= EventType.timeSpanUndefined 
      && _.type <= EventType.timeSpanCategory9);
    for (const timeSpan of timeSpans) {
      let importTimeSpan: EventExtended = {...EventFactory.empty(), style: {}, typeChoices: []};
      this.setEventContent(timeSpan, importTimeSpan);
      // we set type if not typed in import
      if (timeSpan.type === EventType.timeSpanCategory1) {
        importTimeSpan.type  = this.timeSpanType;
        importTimeSpan.style = this.timeSpanStyle;
        importTimeSpan.typeChoices.forEach(_ => _.isSelected = Number(_.value) === importTimeSpan.type % 10 ? true : false);
        this.timeSpanIsTyped++;
      } 
      // we import all valid types ...
      if (importTimeSpan.type >= EventType.timeSpanCategory3) {
        // we want to find source
        importTimeSpan.eventId = timeSpan.eventId;
        // we do not take timespan  with same UID in consideration of overlapping
        const session = this.auth.getSession(this.name);
        legacyTimeSpans = legacyTimeSpans.filter(_ => !(
          _.type === importTimeSpan.type
          &&  (_.eventId.toString() + '@daisytest_' + session?.userName) === timeSpan.uid
        ));
        if (legacyTimeSpans.filter(legacyTimeSpan => GlobalFunctions.getDateInMinutes(legacyTimeSpan.eventBegin) ===  GlobalFunctions.getDateInMinutes(timeSpan.eventBegin)
        && GlobalFunctions.getDateInMinutes(legacyTimeSpan.eventEnd) ===  GlobalFunctions.getDateInMinutes(timeSpan.eventEnd)
        && legacyTimeSpan.summary === importTimeSpan.summary
        && legacyTimeSpan.type === importTimeSpan.type
        ).length === 0) {
          // no duplicate
        } else {
          importTimeSpan.name = importTimeSpan.name + ' total overlap - time span rejected';
          // set not acceptable status + 9
          importTimeSpan.status += 9;
          this.timeSpanOverlap++;
        }
        // set not acceptable time span  status + 9
        importTimeSpans.push(importTimeSpan);
        eventCounter++;
        if (this.events.length < 500 || eventCounter % 100 === 0) {
          await this.fetchDummyData(1000/this.events.length);
          this.showProgress(eventCounter, this.events.length);
        }
        // console.log(progressCounter);
        // console.log(this.showProgressSignal());
      } else {
        this.timeSpanRejected++;
      }
    }
    this.buildEvents(importEvents.concat(importTimeSpans));
    this.prepareShownEvents();
    this.showProgressSignal.set(0);
    this.importReadySignal.set(1);
  }

  public resetImportOverlap() {
    this.setImportSourceChecked();
    this.withoutOverlap = 0;
    this.partiallyOverlap = 0;
    this.completeOverlap = 0;
    this.timeSpanIsTyped = 0;
    this.timeSpanOverlap = 0;
    this.timeSpanRejected = 0;
    this.importReadySignal.set(0);
  }

  public async setImportFinished() {
    let operation = 'import calendar';
    let message = '';
    const session = this.auth.getSession(this.name);
    if (session && session.isPlanMaint) {
      this.resetImportOverlap();
      // we show all importef (setImportOverlap actualizes shown events to check after import)...
      this.isShowEvent = true;
      this.isShowTimeSpans = true;
      this.isShowRemarked = false;
      await this.setImportOverlap();
      const importEvents = this.events.filter(_ =>  _.status < 9 && (_.type === EventType.actual || _.type === EventType.plan));
      for (let event of importEvents) {
        event.eventImportId = event.eventId;
        event.eventId = 0;
        event.status = 0;
      }
      const importTimeSpans = this.events.filter(_ => _.status < 9 && _.type >= EventType.timeSpanUndefined && _.type <= EventType.timeSpanCategory9);
      for (const event of importTimeSpans) {
        event.eventImportId = event.eventId;
        event.eventId = 0;
        event.status = 0;
        // timeSpan has duration 0 per definitionem
        event.eventDuration = 0;
        event.typeChoices = [];
        event.style = {};
      }
      this.importCount = importEvents.length + importTimeSpans.length;
      const messageCount  = importEvents.length + ' ' + this.auth.txt['event_count'] + (importTimeSpans.length > 0 ? (' + ' + importTimeSpans.length + ' ' + this.auth.txt['time_spans']) : '');
      // if (confirm(this.auth.txt['import'] + ': ' + messageCount)) {
      if (this.importCount > 0) {
        // we divide import events into chunks to show progress bar and to prevent file blockings ...
        const chunkLength = 100;
        let isCompleteCreated = true;
        let imported = 0;
        const sortFields: Array<ISortElement> =  [{sortField: 'eventBegin', key: 'eventBegin'}, {sortField: 'eventDuration', key: 'eventDuration'}];
        // sort according to options
        const allEvents = importEvents.concat(importTimeSpans).sort(GlobalFunctions.sortFields(sortFields));
        for (let i = 0; i < this.importCount/chunkLength && isCompleteCreated; i++) {
          const isLastChunk = i >= this.importCount/chunkLength - 1;
          const chunk = allEvents.slice(i * chunkLength, isLastChunk ? this.importCount : i * chunkLength + chunkLength);
          // here we put imported events  to events of current user
          const isCreated = this.calendarService.createEvents(chunk, this.name);
          if (isCreated) {
            imported = isLastChunk ? this.importCount : i * chunkLength ;
            this.showProgress(imported, this.events.length);
          } else {
            isCompleteCreated = false;
          }
          // we set a timeout to prevent http timeouts...
          await this.fetchDummyData();
        }
        if (isCompleteCreated) {
          message = this.auth.txt['records_imported'] + ': ' + messageCount;
          this.importFinishSignal.set(1);
        } else {
          message = 'error - import stopped after: ' + imported + ' records';
          this.importCount = 0;
        }
      } else {
        message = this.auth.txt['import'] + ' ' + this.auth.txt['notPossible'];
        alert(message);
      }
    } else {
      message = 'not allowed due to user rights';
      // TODO message this.dbFailure(operation, message);
      this.importCount = 0;
    }

    if (this.importCount === 0) {
      this.logger.error(this.auth.getSession(this.name), this.name, `${operation} failed: ${message}`);
      this.message.show(this.name + `: ${operation} failed: ${message}`);
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${operation} successfull: ${message}`);
      this.message.show(this.name + `: ${operation} successfull: ${message}`);
    }
    this.showProgressSignal.set(0);
  }

  // paginator - set params for actual page
  public onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // update content to view new page content
    this.shownEvents = this.allShownEvents.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }

}
