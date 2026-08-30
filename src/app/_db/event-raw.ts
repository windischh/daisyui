

export interface EventRaw {
    eventId: number;
    mandantId: number;
    userId: number;
    userToken: number;
    externalUserId: string;
    serverUserToken: string;
    contactNr: number;
    eventBegin: Date;
    eventEnd: Date;
    eventDuration: number;
    summary: string;
    description: string;
    location: string;
    locationType: number;
    planId: number;
    doneId: number;
    eventImportId: number;
    issueProviderId: number;
    providerUrl: string;
    login: string;
    nExternalIssueId: number;
    sExternalIssueId: string;
    nExternalEventId: number;
    sExternalEventId: string;
    isStoredAtIssue: boolean;
    isExported: boolean;
    invoiceOrderNr: number;
    type: number;
    status: number;
    created: Date;
    createdBy: string;
    releaseCreated: number;
    updated: Date | null;
    updatedBy: string;
    releaseUpdated: number;
    version: number;
  }
