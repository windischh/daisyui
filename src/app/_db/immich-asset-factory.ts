import { ImmichAsset } from './immich-asset';
import { ImmichAssetRaw } from './/immich-asset-raw';

export class ImmichAssetFactory {


  static empty(): ImmichAsset {
    return new ImmichAsset('', '', '', '', '', '', null, null, false, '', '', '', '',
    null, null,  '', '', '', '', false, '', false, null, null, '', '', '',  '', '', null,
    new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawImmichAsset: ImmichAssetRaw): ImmichAsset {
    const immichAsset = new ImmichAsset(
      rawImmichAsset.id,
      rawImmichAsset.deviceAssetId,
      rawImmichAsset.ownerId,
      rawImmichAsset.deviceId,
      rawImmichAsset.type,
      rawImmichAsset.originalPath,
      typeof(rawImmichAsset.fileCreatedAt)  === 'string' ?
      new Date(rawImmichAsset.fileCreatedAt) : rawImmichAsset.fileCreatedAt,
      typeof(rawImmichAsset.fileModifiedAt)  === 'string' ?
      new Date(rawImmichAsset.fileModifiedAt) : rawImmichAsset.fileModifiedAt,
      rawImmichAsset.isFavorite,
      rawImmichAsset.duration,
      rawImmichAsset.encodedVideoPath,
      rawImmichAsset.checksum,
      rawImmichAsset.livePhotoVideoId,
      typeof(rawImmichAsset.updatedAt)  === 'string' ?
      new Date(rawImmichAsset.updatedAt) : rawImmichAsset.updatedAt,
      typeof(rawImmichAsset.createdAt)  === 'string' ?
      new Date(rawImmichAsset.createdAt) : rawImmichAsset.createdAt,
      rawImmichAsset.originalFileName,
      rawImmichAsset.originalMimeType,
      rawImmichAsset.sidecarPath,
      rawImmichAsset.thumbhash,
      rawImmichAsset.isOffline,
      rawImmichAsset.libraryId,
      rawImmichAsset.isExternal,
      typeof(rawImmichAsset.deletedAt)  === 'string' ?
      new Date(rawImmichAsset.deletedAt) : rawImmichAsset.deletedAt,
      typeof(rawImmichAsset.localDateTime)  === 'string' ?
      new Date(rawImmichAsset.localDateTime) : rawImmichAsset.localDateTime,
      rawImmichAsset.stackId,
      rawImmichAsset.duplicateId,
      rawImmichAsset.status,
      rawImmichAsset.updateId,
      rawImmichAsset.visibility,
      rawImmichAsset.exifInfo ? {exifImageWidth: rawImmichAsset.exifInfo.exifImageWidth,
        exifImageHeight: rawImmichAsset.exifInfo.exifImageHeight,
        fileSizeInByte: rawImmichAsset.exifInfo.fileSizeInByte,
        dateTimeOriginal: rawImmichAsset.exifInfo.dateTimeOriginal,
        latitude: rawImmichAsset.exifInfo.latitude,
        longitude: rawImmichAsset.exifInfo.longitude,
        description: rawImmichAsset.exifInfo.description
      } : null, 
      typeof(rawImmichAsset.created) === 'string' ?
      new Date(rawImmichAsset.created) : rawImmichAsset.created,
      rawImmichAsset.createdBy,
      rawImmichAsset.releaseCreated,
      typeof(rawImmichAsset.updated) === 'string' ?
      new Date(rawImmichAsset.updated) : rawImmichAsset.updated,
      rawImmichAsset.updatedBy,
      rawImmichAsset.releaseUpdated,
      rawImmichAsset.version
    );
    return immichAsset;
  }

  static fromImmichObject(rawImmichAssetFromImmich: ImmichAssetRaw | any): ImmichAsset {
    const rawImmichAsset: ImmichAssetRaw = {...rawImmichAssetFromImmich};
    // console.log('rawImmichAssetFromImmic', rawImmichAssetFromImmich);
    // console.log('rawImmichAsset', rawImmichAsset);
    return this.fromObject(rawImmichAsset);
  }

}
