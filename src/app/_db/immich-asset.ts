/*
 immich assetstructure from immich db

*/
export class ImmichAsset {
  constructor (
    public id: string,
    public deviceAssetId: string,
    public ownerId: string,
    public deviceId: string,
    public type: string,
    public originalPath: string,
    public fileCreatedAt: Date | null,
    public fileModifiedAt: Date | null,
    public isFavorite: boolean,
    public duration: string,
    public encodedVideoPath: string,
    public checksum: string,
    public livePhotoVideoId: string,
    public updatedAt: Date | null,
    public createdAt: Date | null,
    public originalFileName: string,
    public originalMimeType: string,
    public sidecarPath: string,
    public thumbhash: string,
    public isOffline: boolean,
    public libraryId: string,
    public isExternal: boolean,
    public deletedAt: Date | null,
    public localDateTime: Date | null,
    public stackId: string,
    public duplicateId: string,
    public status: string,
    public updateId: string,
    public visibility: string,
    public exifInfo: {
      exifImageWidth: number,
      exifImageHeight: number,
      fileSizeInByte: number,
      dateTimeOriginal: Date,
      latitude: string,
      longitude: string,
      description: string
    } | null,
    /* type is taken as string from immich
    public type: number,
    */
    /* status is taken as string from immich
    public status: number,
    */
    /* audit info is pEvent standard */
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number
  ) {}
}
