import { Injectable } from '@angular/core';
import { LogPublishersService } from './log-publishers.service';
import { LogPublisher } from './log-publishers';
import { LogLevel, LogEntry, Log } from '../_db/log';
import { GlobalFunctions } from '../_globals/global-functions';
import { Session } from '../_db/session';
import { environment } from '../../environments/environment';

/**
 * LogService - service class for logging
 *  this service class is injected into services and components for logging
 *
 */
@Injectable({
  providedIn: 'root'
})
export class LogService {

  // public properties
  publishers: LogPublisher[];

  private level = environment.logLevel;

  private  systemName =  environment.systemName;

  constructor (
    private publisherService: LogPublishersService) {
      // set Publishers
      this.publishers = this.publisherService.publishers;
    }

  /*
  private async writeToLog(mandantId: number,
    sessionId: number,
    userId: number,
    userName: string,
    login: string,
    comp: string,
    msg: string,
    level: LogLevel,
    params: any[]) {
      if (this.shouldLog(level)) {
        const entry: LogEntry = new LogEntry();
        entry.mandantId = mandantId;
        entry.systemName = this.systemName;
        // TODO provide mandantName
        entry.mandantName = '';
        entry.processId = 0;
        entry.sessionId = sessionId;
        entry.userId = userId;
        entry.userName = userName;
        entry.login = login;
        entry.component = comp;
        entry.message = msg;
        entry.level = level;
        entry.extraInfo = params;
        for (const logger of this.publishers) {
          if (logger.name.toLowerCase() !== 'webserver' || (mandantId > 0 && login !== '')) {
            const response = await logger.log(entry);
            if (!response) {
              if (logger.location) {
                console.log ('log not susccesfull at:' + logger.location + ' message:' + JSON.stringify(entry));
              } else {
                console.log ('log not susccesfull, no location,  at:' + ' message:' + JSON.stringify(entry));
              }
            }
          }
        }
      }
  }
  */

  private async writeToLog(
    session: Session | null,
    comp: string,
    msg: string,
    level: LogLevel,
    params: any[]) {
      if (this.shouldLog(level)) {
        const entry: LogEntry = new LogEntry();
        entry.mandantId = 0;
        entry.systemName = this.systemName;
        entry.mandantName =  '';
        entry.processId = 0;
        entry.sessionId = session?.sessionId ?? 0;
        entry.userId = session?.userId ?? 0;
        entry.userName = session?.userName ?? '';
        entry.login = '';
        entry.component = comp;
        entry.message = msg;
        entry.level = level;
        entry.extraInfo = params;
        for (const logger of this.publishers) {
          if (logger.name.toLowerCase() !== 'webserver' && session) {
            const response = await logger.log(entry, session);
            if (!response) {
              if (logger.location) {
                console.log ('log not susccesfull at:' + logger.location + ' message:' + JSON.stringify(entry));
              } else {
                console.log ('log not susccesfull, no location,  at:' + ' message:' + JSON.stringify(entry));
              }
            }
          }
        }
      }
  }

  private shouldLog(level: LogLevel): boolean {
    let ret = false;
    if ((level >= this.level &&
         level !== LogLevel.Off) ||
         this.level === LogLevel.All) {
      ret = true;
    }
    return ret;
  }

  logs(): string[] {
    const logs: string[] = [];
    for (const logger of this.publishers) {
      logs.push(logger.name);
    }
    return logs;
  }

  debug(session: Session | null, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.Debug, optionalParams);
  }

  info(session: Session | null, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.Info, optionalParams);
  }

  warn(session: Session | null, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.Warn, optionalParams);
  }

  error(session: Session | null, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.Error, optionalParams);
  }

  fatal(session: Session | null, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.Fatal, optionalParams);
  }

  /*
  log(session: Session, comp: string, msg: string, ...optionalParams: any[]) {
    this.writeToLog(session, comp, msg, LogLevel.All, optionalParams);
  }
  */

  clearLog(name: string, session?: Session): Promise<boolean> {
    const ix = this.publishers.findIndex(_ => _.name === name);
    return this.publishers[ix].clear(session);
  }

  public async getServerLogs(session: Session): Promise<Array<Log>> {
    let logs: Array<Log> = [];
    for (const logger of this.publishers) {
      if (logger.name.toLowerCase() === 'webserver') {
        const serverLogs = await logger.getLogs(session);
        if (serverLogs && serverLogs?.length > 0) {
          logs = serverLogs;
        }
      }
    }
    return logs;
  }

  public async getLogsRange(session: Session, dateFrom: Date, dateTo: Date, comp: string): Promise<Array<Log>> {
    const logs = await this.getServerLogs(session);
    return logs.filter(_ => GlobalFunctions.getDateInMinutes(_.date) >= GlobalFunctions.getDateInMinutes(dateFrom) && GlobalFunctions.getDateInMinutes(_.date) <= GlobalFunctions.getDateInMinutes(dateTo));
  }
}
