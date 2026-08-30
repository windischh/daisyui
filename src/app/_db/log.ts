/**
 * log levels
 * log level 0 (triggered by .log) should only be used in test mode
 */
export enum LogLevel {
  All = 0,
  Debug = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
  Fatal = 5,
  Off = 6
}

/**
 * LogEntry- objects are exclusively used in logging infrastructure
 */
export class LogEntry {
  // public properties
  entryDate: Date = new Date();
  mandantId = 0;
  mandantName = '';
  systemName = '';
  processId = 0;
  sessionId = 0;
  userId = 0;
  userName = '';
  login = '';
  component = '';
  message = '';
  level: LogLevel = LogLevel.Debug;
  extraInfo: any[] = [];
  // logWithMandant = true;
  // logWithDate = true;
  // logWithUser = true;
  // logWithComponent = true;

  buildLogString(): string {
    let ret = '';
    /*
    if (this.logWithMandant) {
      ret += 'Mandant: ' + this.mandantId + ' - ';
    }
    if (this.logWithUser) {
      ret += 'User: ' + this.userId + ' - ';
    }
    if (this.logWithComponent) {
      ret += 'Component: ' + this.component + ' - ';
    }
    if (this.logWithDate) {
      ret += new Date() + ' - ';
    }
    */
    ret += 'Mandant: ' + this.mandantId + ' - ';
    ret += 'User: ' + this.userId + ' - ';
    ret += 'Component: ' + this.component + ' - ';
    ret += new Date() + ' - ';
    ret += 'Type: ' + LogLevel[this.level];
    ret += ' - Message: ' + this.message;
    if (this.extraInfo.length) {
      ret += ' - Extra Info: '
        + this.formatParams(this.extraInfo);
    }

    return ret;
  }

  private formatParams(params: any[]): string {
    let ret: string = params.join(',');

    // Is there at least one object in the array?
    if (params.some(p => typeof p === 'object')) {
      ret = '';
      // Build comma-delimited string
      for (const item of params) {
        ret += JSON.stringify(item) + ',';
      }
    }

    return ret;
  }
}

/**
 * Log is used for log querying via app server
 */
export class Log {
  constructor (
  public logId: number,
  /*
    mandantId can be empty 
  */
  public mandantId: number,
  public mandantName: string,
  public systemName: string,
  /*
    processId in case of batch logs
  */
  public processId: number,
  /*
    sessionId in case of client logs
  */
  public sessionId: number,
  public userId: number,
  public userName: string,
  public login: string,
  public component: string,
  public date: Date,
  public logMessage: string,
  public logLevel: number,
  public extraInfo: string,
  public createdBy: string,
  public dateCreated: Date,
  public releaseCreated: number
  ) { }
}






