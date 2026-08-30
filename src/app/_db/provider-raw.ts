
export interface ProviderRaw {
  comment: string;
  providerId: number;
  providerName: string;
  providerUrl: string;
  providerDocumentsUrl: string;
  description: string;
  isProviderAvailable: boolean;
  maxProviderRetries: number;
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
