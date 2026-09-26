/**
 * IAuthorization
 * issue provider authorization string
 */
export interface IAuthorization {
  [key: string]: any;
  providerId: number;
  providerName: string;
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
