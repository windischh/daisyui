import { ImmichAlbum } from './immich-album';
import { ImmichAlbumRaw } from './immich-album-raw';
import { ImmichAssetFactory } from './immich-asset-factory';

export class ImmichAlbumFactory {


  static empty(): ImmichAlbum {
    return new ImmichAlbum('', '', '', '', '', false, '',  '',
    null, null, [], 0, null, null, null, null,
    0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawImmichAlbum: ImmichAlbumRaw): ImmichAlbum {
    const immichAlbum = new ImmichAlbum(
      rawImmichAlbum.id,
      rawImmichAlbum.ownerId,
      rawImmichAlbum.albumName,
      rawImmichAlbum.albumThumbnailAssetId,
      rawImmichAlbum.description,
      rawImmichAlbum.isActivityEnabled,
      rawImmichAlbum.order,
      rawImmichAlbum.updateId,
      typeof(rawImmichAlbum.startDate)  === 'string' ?
      new Date(rawImmichAlbum.startDate) : rawImmichAlbum.startDate, 
      typeof(rawImmichAlbum.endDate)  === 'string' ?
      new Date(rawImmichAlbum.endDate) : rawImmichAlbum.endDate,
      rawImmichAlbum.assets ? rawImmichAlbum.assets.map((_: any) => ImmichAssetFactory.fromObject(_))
          : [],
      rawImmichAlbum.assetCount,
      typeof(rawImmichAlbum.lastModifiedAssetTimestamp)  === 'string' ?
      new Date(rawImmichAlbum.lastModifiedAssetTimestamp) : rawImmichAlbum.lastModifiedAssetTimestamp, 
      typeof(rawImmichAlbum.createdAt)  === 'string' ?
      new Date(rawImmichAlbum.createdAt) : rawImmichAlbum.createdAt, 
      typeof(rawImmichAlbum.updatedAt)  === 'string' ?
      new Date(rawImmichAlbum.updatedAt) : rawImmichAlbum.updatedAt,
      typeof(rawImmichAlbum.deletedAt)  === 'string' ?
      new Date(rawImmichAlbum.deletedAt) : rawImmichAlbum.deletedAt,
      rawImmichAlbum.type,
      rawImmichAlbum.status,
      typeof(rawImmichAlbum.created) === 'string' ?
      new Date(rawImmichAlbum.created) : rawImmichAlbum.created,
      rawImmichAlbum.createdBy,
      rawImmichAlbum.releaseCreated,
      typeof(rawImmichAlbum.updated) === 'string' ?
      new Date(rawImmichAlbum.updated) : rawImmichAlbum.updated,
      rawImmichAlbum.updatedBy,
      rawImmichAlbum.releaseUpdated,
      rawImmichAlbum.version
    );
    return immichAlbum;
  }

  static fromImmichObject(rawImmichAlbumFromImmich: ImmichAlbumRaw | any): ImmichAlbum {
    const rawImmichAlbum: ImmichAlbumRaw = {...rawImmichAlbumFromImmich};
    return this.fromObject(rawImmichAlbum);
  }

}
