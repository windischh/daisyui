/**
 * IAuthorization
 * issue provider authorization string
 */
export interface IAuthorization {
  [key: string]: any;
  providerId: number;
  providerDataUrl: string;
  providerDocumentsUrl: string;
  providerType: number;
  login: string;
  authorization: string;
  loginToken: string;
  lastLoginSuccessful: Date | null;
  lastLoginRejected: Date | null;
  lastConnectSuccessful: Date | null;
}
