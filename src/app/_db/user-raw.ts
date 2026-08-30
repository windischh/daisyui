import { IAuthorization } from "../_interfaces/i-authorization";
import { IUserEventOptions } from "../_interfaces/i-user-event-options";


export interface UserRaw {
  userId: number;
  userToken: number;
  userName: string;
  lastActivity: Date;
  calendarDay: Date;
  userEventOptions: IUserEventOptions;
  authorizations: Array<IAuthorization>;
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
