import { ImmichAsset } from "./immich-asset";

/*
  immich album structure from immich db
*/
export class ImmichAlbum {
  constructor (
    public id: string,
    public ownerId: string,
    public albumName: string,
    public albumThumbnailAssetId: string,
    public description: string,
    public isActivityEnabled: boolean,
    public order: string,
    public updateId: string,
    public startDate: Date | null,
    public endDate: Date | null,
    public assets: Array<ImmichAsset>,
    public assetCount: number,
    public lastModifiedAssetTimestamp: Date | null,
    public createdAt: Date | null,
    public updatedAt: Date | null,
    public deletedAt: Date | null,
    /* type and status are pEvent standard */
    public type: number,
    public status: number,
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
