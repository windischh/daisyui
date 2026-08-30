import { Log } from './log';
import { LogRaw } from './log-raw';

export class LogFactory {

  static empty(): Log {
    return new Log(0, 0, '', '', 0, 0, 0, '', '',  '', new Date(),  '', 0, '', 
    '', new Date(), 0);
  }

  static fromObject(rawLog: LogRaw | any): Log {
    return new Log(
      rawLog.logId,
      rawLog.mandantId,
      rawLog.mandantName,
      rawLog.systemName,
      rawLog.processId,
      rawLog.sessionId,
      rawLog.userId,
      rawLog.userName,
      rawLog.login,
      rawLog.component,
      typeof(rawLog.date) === 'string' ?
      new Date(rawLog.date) : rawLog.date,
      rawLog.logMessage,
      rawLog.logLevel,
      rawLog.extraInfo,
      rawLog.createdBy,
      rawLog.dateCreated,
      rawLog.releaseCreated
    );
  }

}
