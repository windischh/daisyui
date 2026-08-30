export interface LogRaw {
    logId: number;
    mandantId: number;
    mandantName: string;
    systemName: string;
    processId: number;
    sessionId: number;
    userId: number;
    userName: string;
    login: string;
    component: string;
    date: Date;
    logMessage: string;
    logLevel: number;
    extraInfo: string;
    createdBy: string;
    dateCreated: Date;
    releaseCreated: number;
  }
