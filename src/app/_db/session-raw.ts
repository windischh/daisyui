import { IAuthorization } from "../_interfaces/i-authorization";
import { ISecurityLevel } from "../_interfaces/i-security-level";
import { IServiceLevel } from "../_interfaces/i-service-level";
import { EventSelectOption } from "./event-select-option";

export interface SessionRaw {
  sessionId: number;
  app: number;
  userId: number;
  userToken: number;
  userName: string;
  securityLevel: ISecurityLevel;
  documents: string;
  lastTx: Date;
  lastTxClient: Date;
  authorizations: Array<IAuthorization>;
  duration: number;
  extraInfo: string;
  serviceLevel: IServiceLevel;
  language: number
  contactNr: number;
  issueNr: number;
  calendarDay: Date;
  eventSelectOption: EventSelectOption;
  isPlan: boolean;
  isPlanMaint: boolean;
  type: number;
  status: number;
  created: Date;
  createdBy: string;
  releaseCreated: number;
  updated: Date;
  updatedBy: string;
  releaseUpdated: number;
  version: number;
  }
