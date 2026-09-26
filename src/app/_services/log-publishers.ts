import { LogFactory } from './../_db/log-factory';
import { Log, LogEntry } from '../_db/log';
import { GlobalFunctions } from '../_globals/global-functions';
import { FetchApiService } from './fetch-api.service';
import { LogRaw } from '../_db/log-raw';
import { Session } from '../_db/session';

/**
 *  LogPublisher objects transfer the logs to the configured destinations
 */
export abstract class LogPublisher {
  name!: string;
  location!: string;
  user!: string;
  auth!: string;
  session!: Session;
  abstract log(record: LogEntry, session?: Session): Promise<boolean>;
  abstract clear(session?: Session): Promise<boolean>;
  abstract getLogs(session?: Session): Promise<Array<Log> | null>;
}

export class LogConsole extends LogPublisher {
  constructor() {
    // Must call super() from derived classes
    super();
    // Set location not applicable
  }

  log(entry: LogEntry): Promise<boolean> {
    // Log to console
    console.log(entry.buildLogString());
    return Promise.resolve(true);
  }

  clear(): Promise<boolean> {
    console.clear();
    return Promise.resolve(true);
  }

  getLogs(): Promise<Array<Log> | null> {
    return Promise.resolve(null);
  }

}

export class LogLocalStorage extends LogPublisher {
  constructor() {
    // Must call super() from derived classes
    super();
    // Set location defines local storage item
    this.location =  'logging'
  }

  // Append log entry to local storage
  log(entry: LogEntry): Promise<boolean> {
    let ret = false;
    let values: LogEntry[];

    try {
      // Get previous values from local storage
      if (localStorage.getItem(this.location)) {
        values = JSON.parse(
           localStorage.getItem(this.location) ?? '');
      } else {
        values = [];
      }
      // Add new log entry to array
      values.push(entry);
      // Store array into local storage
      localStorage.setItem(this.location,JSON.stringify(values));
      // Set return value
      ret = true;
    } catch (err) {
      // Display error in console
      console.log(err);
    }

    return Promise.resolve(ret);
  }

  // Clear all log entries from local storage
  clear(): Promise<boolean> {
    localStorage.removeItem(this.location);

    return Promise.resolve(true);
  }

  getLogs(): Promise<Array<Log>> {
    // Get values from local storage
    let logs: Array<Log> = [];
    if (localStorage.getItem(this.location)) {
      const logEntrys: Array<LogEntry>  = JSON.parse(
          localStorage.getItem(this.location) ?? '');
      // console.log('local logs: ', localStorage.getItem(this.location));
      if (logEntrys && logEntrys?.length > 0) {
        logs = logEntrys.map(_ => {
          const log = LogFactory.fromObject(_);
          if (log) {
            log.date = 
              typeof(_.entryDate) === 'string' ?
              new Date(_.entryDate) : _.entryDate;
            log.logMessage = _.message;
            log.logLevel = _.level;
            log.extraInfo = _.extraInfo.reduce((acc, el) => acc + el + ' ','');
          }
          return log;
        })
      }
    } else {
      logs = [];
    }
    return Promise.resolve(logs);
  }

}

// LogWebApi refers to an external restAPI for posting logs
export class LogWebApi extends LogPublisher {
  constructor(private fetch: FetchApiService) {
    // Must call super() from derived classes
    super();
    // Set location - no default (set be publisher service)
    this.location = ``;
  }


  /**
   *  send log entry to back end service via POST request
   *    we use content type text/plain and JSON.stringify(entry) !!
   * @param entry log entry to be logged
   * @returns Promise<boolean>
   */
  public async log(entry: LogEntry): Promise<boolean> {
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    // we assume a log api service that has no-cors activated
    const mode: RequestMode = 'no-cors';
    const op = 'post log to webAPI';
    return await this.fetch.post(this.location, entry, headers, mode)
    .catch((error: any) : any => {
      // we are part of the logging infrastructure, so we log to console instead
      console.error('error: ' + error.message + ' at: ' + this.name + ' op: ' + op);
      return false;
    });
  }


  // Clear all log entries from Web API
  public clear(): Promise<boolean> {
    // TODO: Call Web API to clear all values, returning a promise
    return Promise.resolve(true);
  }

  getLogs(): Promise<Array<Log> | null> {
    return Promise.resolve(null);
  }

}

// LogWebServer puts logs into a logs.json  on the web server
export class LogWebServer extends LogPublisher {
  constructor(private fetch: FetchApiService) {
    // Must call super() from derived classes
    super();
    // Set location - no default (set by publisher service)
    this.location = ``;
  }


  /**
   *  log extends the logs.json file by a new log entry
   * @param entry log entry to be logged
   * @returns Promise<boolean>
   */
  public async log(entry: LogEntry, session: Session): Promise<boolean> {
    const log = LogFactory.fromObject(entry);
    if (log) {
      let logs: Array<Log> = await this.getLogs(session);
      if (!logs) logs = [];
      const lastLogId = logs?.length > 0
        ? logs.reduce((a,b) => a.logId > b.logId ? a : b).logId
        : 0;
      log.logId = lastLogId + 1;
      log.date = entry.entryDate;
      log.logMessage = entry.message;
      log.logLevel = entry.level;
      log.extraInfo = entry.extraInfo.reduce((acc, el) => acc + el + ' ','');
      log.dateCreated = new Date();
      log.createdBy = 'LogPublisher - ' + this.name;
      log.releaseCreated = GlobalFunctions.release;
      logs.push(log);
      // TODO in the moment we have a fix authorzation fpr logs.json
      // we will not use session authorization - but we must put these authorization into environment ...
      const login = 'admin';
      const password = 'admin_pw'
      const auth = 'Basic ' + GlobalFunctions.base64Encode(login.trim() + ':' + password.trim());
      const headers = new Headers({
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      const mode: RequestMode = 'cors';
      const op = 'put log on web server';
      return await this.fetch.put(this.location, logs, headers, mode)
      .catch((error: any) : any => {
        // we are part of the logging infrastructure, so we log to console instead
        console.error('error: ' + error.message + ' at: ' + this.name + ' op: ' + op);
        return false;
      });
    }
    return false;

  }

  // Clear all log entries from Web server
  public async clear(session: Session): Promise<boolean> {
    let logs: Array<Log> = [];
    //  this authorization comes from  environment ...
    const login = this.user;
    const password = this.auth;
    const auth = 'Basic ' + GlobalFunctions.base64Encode(login.trim() + ':' + password.trim());

    const headers = new Headers({
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    const mode: RequestMode = 'cors';
    const op = 'purge log on web server';
    return this.fetch.put(this.location, logs, headers, mode)
    .catch((error: any) : any => {
      // we are part of the logging infrastructure, so we log to console instead
      console.error('error: ' + error.message + ' at: ' + this.name + ' op: ' + op);
      return false;
    });

  }

  // get logs from a logs.json server file
  public async getLogs(session: Session): Promise<Array<Log>> {
    let logs: Array<Log> = [];
    //  this authorization comes from  environment ...
    const login = this.user;
    const password = this.auth;
    const auth = 'Basic ' + GlobalFunctions.base64Encode(login.trim() + ':' + password.trim());
    const headers = new Headers({
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    const mode: RequestMode = 'cors';
    const op = 'get log from web server';
    const rawLogs: Array<LogRaw>  = await this.fetch.get<{logs: Array<LogRaw>}>(this.location, headers, mode)
    .catch((error: any) : any => {
      // we are part of the logging infrastructure, so we log to console instead
      console.error('error: ' + error.message + ' at: ' + this.name + ' op: ' + op);
      return null;
    });
    // if we have already logs we get them into logs, else logs is an empty array
    if (rawLogs && rawLogs?.length > 0) {
      logs = rawLogs.map(rawLog => {
        let log = LogFactory.fromObject(rawLog);
        return log;
      });
    }
    return logs;

  }

}

// LogWebdirectory logs single log files on a web server directory
export class LogWebDirectory extends LogPublisher {
  constructor(private fetch: FetchApiService) {
    // Must call super() from derived classes
    super();
    // Set location - no default (set by publisher service)
    this.location = ``;
  }


  /**
   *  send log entry to back end data store via PUT (we assume webDAV running on webserver)
   *    each log builds a new entry at the defined location
   *    we use content type text/plain and file extension .log
   * @param entry log entry to be logged
   * @returns Promise<boolean>
   */
  public async log(entry: LogEntry): Promise<boolean> {
    const logDate = new Date();
    const fileName = 'daisytest-'
      + GlobalFunctions.getYString(logDate) + '_'
      + GlobalFunctions.getMonth2String(logDate)  + '_'
      + GlobalFunctions.getDay2String(logDate)  + '_'
      + GlobalFunctions.getHours2String(logDate)  + '_'
      + GlobalFunctions.getMinutes2String(logDate)  + '_'
      + GlobalFunctions.getSeconds2String(logDate) + '.log';
    const locationWithFile = this.location + '/' + fileName;
    const headers = new Headers({
      'Content-Type': 'text/plain'
    });
    const mode: RequestMode = 'cors';
    const op = 'put log entry on webServer';
    return await this.fetch.put(locationWithFile, entry, headers, mode)
    .catch((error: any) : any => {
      // we are part of the logging infrastructure, so we log to console instead
      console.error('error: ' + error.message + ' at: ' + this.name + ' op: ' + op);
      return false;
    });
  }

  // Clear all log entries from Web server
  public clear(): Promise<boolean> {
    // TODO: Call to Web server to clear all log files
    return Promise.resolve(true);
  }

  getLogs(): Promise<Array<Log> | null> {
    return Promise.resolve(null);
  }

}


