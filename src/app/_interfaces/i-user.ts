import { ISecurityLevel } from "./i-security-level";

/**
 * IUser
 * user data from server
 */
export interface IUser {
  /*
    login must be unque over all mandants
  */
  login: string;
  /*
    login token is required  and must not be empty 
  */
  loginToken: string;
  /*
    mandntId is required at all server data 
  */
  mandantId: number;
  /*
    userId is an unique numeric id at server
   */
  userId: number;
  /*
    externalUserId is the id at server (might com form other external applications)
  */
  externalUserId: string;
  userName: string;
  /*
    documents is directory for external documents, used by this user (if empty, user has no own documents)
  */
  documents: string;
  securityLevel: ISecurityLevel;
}
