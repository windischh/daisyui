import { ImmichAsset } from "../_db/immich-asset"

/**
 * IImmichFolder
 * general structure to handle immich folder information
 */
export interface IImmichFolder {
  // full name of folder - anyway ends with '/'
  folderName: string,
  // name of external libray - can be empty
  externalLibrary: string,
  // if folder is a sub folder of external library - part of folder name below
  subFolderName: string,
  // 0 is root folder (in case of linked folder level counts below linked library)
  folderLevel: number,
  // counter arrey has elemnt 0 for all, 1 for assets which are in subDirectories
  // counters in detail have values for 
  // allAssets: number,
  //  assetsNotInDocuments: number,
  //  assetsInDocumentsWithoutId: number,
  //  assetsInDocumentsWithSameId: number,
  //  assetsInDocumentsWithOtherId: number
  counters: Array<Array<number>>,
  // index 0 - all assets, 1 - not in documents, can be imported, 2 -- same immich id 3 - othe immich id 4 - no immich id
  assets: Array<Array<ImmichAsset>>,
  isSelected?: boolean,
  style?: {}
}
