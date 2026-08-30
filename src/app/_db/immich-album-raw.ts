import { ImmichAssetRaw } from "./immich-asset-raw";

export interface ImmichAlbumRaw {
  id: string;
  ownerId: string;
  albumName: string;
  albumThumbnailAssetId: string
  description: string;
  isActivityEnabled: boolean;
  order: string;
  updateId: string;
  startDate: Date | null;
  endDate: Date | null;
  assets: Array<ImmichAssetRaw>;
  assetCount: number;
  lastModifiedAssetTimestamp: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
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
