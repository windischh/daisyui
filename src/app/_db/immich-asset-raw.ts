export interface ImmichAssetRaw {
  id: string;
  deviceAssetId: string;
  ownerId: string;
  deviceId: string;
  type: string;
  originalPath: string;
  fileCreatedAt: Date | null;
  fileModifiedAt: Date | null;
  isFavorite: boolean;
  duration: string;
  encodedVideoPath: string;
  checksum: string;
  livePhotoVideoId: string;
  updatedAt: Date | null;
  createdAt: Date | null;
  originalFileName: string;
  originalMimeType: string;
  sidecarPath: string;
  thumbhash: string;
  isOffline: boolean;
  libraryId: string;
  isExternal: boolean;
  deletedAt: Date | null;
  localDateTime: Date | null;
  stackId: string;
  duplicateId: string;
  status: string;
  updateId: string;
  visibility: string;
  exifInfo: {
      exifImageWidth: number;
      exifImageHeight: number;
      fileSizeInByte: number;
      dateTimeOriginal: Date;
      latitude: string;
      longitude: string;
      description: string
    } | null;
  created: Date;
  createdBy: string;
  releaseCreated: number;
  updated: Date | null;
  updatedBy: string;
  releaseUpdated: number;
  version: number;
}
