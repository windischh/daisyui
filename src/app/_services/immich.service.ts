import { Injectable } from '@angular/core';

import { IAuthorization } from '../_interfaces/i-authorization';

import { LogService } from './log.service';
import { FetchApiService } from './fetch-api.service';
import { AuthenticationService } from './authentication.service';
import { MessageService } from './message.service';

import { App } from '../_enums/app.enum';
import { ImmichAsset } from '../_db/immich-asset';
import { ImmichAssetFactory } from '../_db/immich-asset-factory';
import { ImmichAssetRaw } from '../_db/immich-asset-raw';
import { IProviderItemsFound } from '../_interfaces/i-provider-items-found';
import { Provider } from '../_db/provider';
import { ProviderType } from '../_enums/provider-type.enum';
import { ImmichAlbumFactory } from '../_db/immich-album-factory';
import { ImmichAlbum } from '../_db/immich-album';
import { DocumentElement } from '../_db/document';



/**
 * immich service
 * fetches immich assets and albums via rest API
 *
 *
 */

@Injectable({
  providedIn: 'root'
})
export class ImmichService {

  public name = 'ImmichService';


  constructor(
    private logger: LogService,
    private fetch: FetchApiService,
    private auth: AuthenticationService,
    private message: MessageService) {
   }

  /***********************************  private methods **************************************/



  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * getImmichLibrarys()
   *  get librarys for immich asssets
   * @param provider must be an immich provider with  URL
   * @param comp name of calling component
   * @returns interface with provider items found
   */
  public async getImmichLibrarys(provider: Provider, comp: string): Promise<IProviderItemsFound> {
    let itemsFound: IProviderItemsFound = {
      isDataFound:  false, 
      isLoginNecessary: false,
      provider,
      items: null};
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        // get items via fetch
        itemsFound.items = await this.fetchImmichLibrarys(provider, authorization, comp);
        // in case of server provider filtersFound in the moment has only set isDataFound on true
        itemsFound.isDataFound = true;
      } else {
        itemsFound.isLoginNecessary = true;
      }
    }
    return itemsFound;
  }


  /**
   * getImmichAssets()
   *  get assets from immich rest API
   * @param provider must be an immich provider with  URL
   * @param comp name of calling component
   * @param library if optional paarameter librray is present, we return only assets where originalPath starts with  library
   * @returns array of assets, empty array if not found or server not ready
   */
  public async getImmichAssets(provider: Provider, comp: string, library?: string): Promise<Array<ImmichAsset>> {
    let assets: Array<ImmichAsset> = [];
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        // if there are assets, we return them
        const fetchedAssets = await this.fetchImmichAssets(provider, authorization, comp);
        if (fetchedAssets && library && library.length > 0) {
          assets = fetchedAssets.filter(_ => _.originalPath.startsWith(library));
        }
      }
    }
    return assets;
  }


  /**
   * getImmichAsset()
   *  get immich asset with id
   * @param provider must be an immich provider with  URL
   * @param id id of asset
   * @param comp name of calling component
   * @returns asset or null if no asset with this id is found
   * 3
   */
  public async getImmichAsset(provider: Provider, id: string, comp: string): Promise<ImmichAsset | null> {
    /* we do not get immich asset from immich assets
    const assets = await this.getImmichAssets(provider, comp);
    let assetFound: ImmichAsset = null;
    const assetsFound = assets.filter(_ => _.id === id);
    if (assetsFound.length === 1) {
      assetFound = assetsFound[0];
    }
    return assetFound;
    */
    let asset: ImmichAsset | null = null;
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        asset = await this.fetchImmichAsset(provider, id,  authorization, comp);
      }
    }
    return asset;
  }

  /**
   * getImmichAlbums()
   *  get albumsfrom immich rest API
   * @param provider must be an immich provider with  URL
   * @param comp name of calling component
   * @returns array of albums, empty array if not found or server not ready
   */
  public async getImmichAlbums(provider: Provider, comp: string): Promise<Array<ImmichAlbum>> {
    let albums: Array<ImmichAlbum> = [];
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        // if there are assets, we return them
        albums = await this.fetchImmichAlbums(provider, authorization, comp) ?? [];
      }
    }
    return albums;
  }

  /**
   * getImmichAlbum()
   *  get album from immich rest API
   * @param provider must be an immich provider with  URL
   * @param albumName name of album
   * @param comp name of calling component
   * @returns album, null if not found or server not ready
   */
  public async getImmichAlbum(provider: Provider, albumName: string, comp: string): Promise<ImmichAlbum | null> {
    let album: ImmichAlbum | null = null;
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        // if there are assets, we return them
        const albums = await this.fetchImmichAlbums(provider, authorization, comp);
        if (albums) {
          const albumIx = albums.findIndex(_ => _.albumName === albumName);
          if (albumIx && albumIx >= 0) {
            album = await this.fetchImmichAlbum(provider, authorization, albums[albumIx].id, comp);
          }
        }
      }
    }
    return album;
  }

   /**
   * get documentFileContent()
   *  fetches document file with documentFileName
   *  from server as string
   * @param document document
   * @param isThumbnail if true we return content of thumbnail file
   * @param comp name of calling component
   * @returns content from document file, if document with this id is stored at server, else returns empty string
   */
  public async getDocumentFileContent(document: DocumentElement, isThumbnail: boolean, comp: string): Promise<string> {
    // there must be a name for file
    if (document && document?.documentFileName !== '' && document.immichAssetId !== '') {
      return '';
    }
    return '';
  }

  /**
   * setImmichAlbum()
   *  set album from immich rest API
   *  (we check if album exists - if yes, we update assets ...)
   * @param provider must be an immich provider with  URL
   * @param album album incl. assets
   * @param comp name of calling component
   * @returns true if set was ok
   */
  public async setImmichAlbum(provider: Provider, album: ImmichAlbum, comp: string): Promise<boolean> {
    const session = this.auth.getSession(comp);
    if (session && session?.authorizations) {
      const authIndex = session.authorizations.findIndex(_ => _.providerId === provider.providerId);
      if (authIndex >= 0 && session.authorizations[authIndex].authorization !== '') {
        const authorization = session.authorizations[authIndex];
        // if there are assets, we return them
        const albums = await this.fetchImmichAlbums(provider, authorization, comp);
        if (albums) {
          const albumIx = albums?.findIndex(_ => _.albumName === album.albumName);
          // album alreday exists - we put all assets
          const assetIds = album.assets.map(_ => _.id);
          if (albumIx >= 0) {
            // restApi PUT albums/ssets can take also esisting assets - are not touched ..
            const isSetOk = await this.fetchPutImmichAssetsToAlbums(provider, authorization, [albums[albumIx].id], assetIds, comp);
            return isSetOk ?? false;
          } else {
            const newAlbum = await this.fetchPostImmichAlbum(provider, authorization, album.albumName, assetIds, comp);
            if (newAlbum?.albumName === album.albumName) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }







  /* *****************************************  local file functions start here **************** */


  /***********************************  private methods **************************************/



  /* *****************************************  http functions start here **************** */


  /***********************************  private http fetch  methods **************************************/

  /**
   * fetchImmicLibraryss()
   *  fetch librarys from rest API
   * @param provider must be an immich provider with  URL
   * @param authorization authorization with jira authentication string (base64 encoded)
   * @param comp name of calling component
   * @returns assets, if any - otherwise null
   */
  private async fetchImmichLibrarys(provider: Provider, authorization: IAuthorization, comp: string): Promise<Array<string> | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch immich fetchImmicLibraryss';
    let url = '';

    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      
      return null;
    }

    url = url + '/libraries';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }
    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const librarys: Array<any> = await this.fetch.get<{elements: Array<any>}>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return null;
    });
    let allImportPaths: Array<string> = [];
    if (librarys && librarys?.length > 0) {
      for (const library of librarys) {
        if (library.hasOwnProperty('importPaths')) {
          const importPatchs: Array<string> = library['importPaths'];
          allImportPaths = allImportPaths.concat(importPatchs);
        }
      }
    }

    return allImportPaths;
  }

  /**
   * fetchImmichAssets()
   *  fetch assets from rest API
   * @param provider must be an immich provider with  URL
   * @param authorization authorization with immich authentication string 
   * @param comp name of calling component
   * @returns assets, if any - otherwise null
   */
  private async fetchImmichAssets(provider: Provider, authorization: IAuthorization, comp: string): Promise<Array<ImmichAsset> | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch immich assets';
    let url = '';
    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    url = url + '/search/metadata';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }

    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';


    let rawImmichAssets: Array<ImmichAssetRaw> = [];
    let isComplete = false;
    // we get assets via chunks of 1000 elements an limit result to a million assets
    for (let index = 0; index < 999 && !isComplete; index++) {
      // TODO: only assets which are not archived ??
      // or we let our application check that with status field ...
      const body = {
        'order': 'asc',
        'page': index + 1,
        'size': 1000,
        'type': 'IMAGE',
        "withExif": true
      }
      const result: any = await this.fetch.postResponse<{resultObject: any}>(url, body, headers, mode)
      .catch((error: any) : any => {
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
        this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
        return null;
      });
  
      if (result?.hasOwnProperty('assets')) {
        const assets = result['assets'];
        if (assets?.hasOwnProperty('items')) {
          // console.log('items', assets['items'] );
          const fetchedAssets: Array<ImmichAssetRaw> = assets['items'];
          // console.log('fetchedAssets', fetchedAssets );
          if (fetchedAssets && fetchedAssets?.length > 0) {
            rawImmichAssets = rawImmichAssets.concat(fetchedAssets);
          } else {
            isComplete = true;
          }
        } else {
          isComplete = true;
        }
      } else {
        isComplete = true;
      }
    }

    if (rawImmichAssets && rawImmichAssets?.length > 0) {
      return rawImmichAssets.map(rawImmichAsset => {
        let asset = ImmichAssetFactory.fromImmichObject(rawImmichAsset);
        asset.created = asset.createdAt ?? new Date();
        asset.updated = asset.updatedAt;
        return asset;
      });
    } else {
      return null;
    }
    
  }

  /**
   * fetchImmichAsset()
   *  fetch assset by id wirh GET assetInfo from rest API
   * @param provider must be an immich provider with  URL
   * @param id uuid
   * @param authorization authorization with immich authentication string
   * @param comp name of calling component
   * @returns asset, if found - otherwise null
   */
  private async fetchImmichAsset(provider: Provider, id: string, authorization: IAuthorization, comp: string): Promise<ImmichAsset | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch immich asset';
    let url = '';

    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    if (id === undefined || id === null || id === '') {
      this.logger.warn(this.auth.getSession(this.name), this.name, `${op} from: ${url} - id is empty`);
      // console.log('id is empty at fetchJiraIssue');
      return null;
    }
    url = url + '/assets/' + id;
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }
    const headers = new Headers({
      'x-api-key': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const rawImmichAsset: ImmichAssetRaw  = await this.fetch.get<ImmichAssetRaw>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return null;
    });
    // console.log('raw jira issue: ', rawJiraIssue);
    if (rawImmichAsset && rawImmichAsset.id ===  id) {
      let asset = ImmichAssetFactory.fromImmichObject(rawImmichAsset);
      if (asset) {
        asset.created = asset.createdAt ?? new Date();
        asset.updated = asset.updatedAt;
        return asset;
      } else {
      return null;
      }
    } else {
      return null;
    }
  }

  /**
   * fetchImmichAlbums()
   *  fetch albums from rest API
   * @param provider must be an immich provider with  URL
   * @param authorization authorization with jira authentication string (base64 encoded)
   * @param comp name of calling component
   * @returns albums if any - otherwise null
   */
  private async fetchImmichAlbums(provider: Provider, authorization: IAuthorization, comp: string): Promise<Array<ImmichAlbum> | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetchImmicLhAlbums';
    let url = '';

    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    url = url + '/albums';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }
    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const albums: Array<any> = await this.fetch.get<{elements: Array<any>}>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return null;
    });
    if (albums && albums?.length > 0) {
      return albums.map(rawAlbum => ImmichAlbumFactory.fromImmichObject(rawAlbum));
    } else {
      return null;
    }

  }

  /**
   * fetchImmichAlbum()
   *  fetch album from rest API
   * @param provider must be an immich provider with  URL
   * @param authorization authorization with jira authentication string (base64 encoded)
   * @param id uuid of album
   * @param comp name of calling component
   * @returns albums if any - otherwise null
   */
  private async fetchImmichAlbum(provider: Provider, authorization: IAuthorization, id: string, comp: string): Promise<ImmichAlbum | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetchImmicLhAlbums';
    let url = '';

    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    url = url + '/albums/' + id;
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }
    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const result: any = await this.fetch.get<{element: any}>(url, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return null;
    });

    if (result && result?.hasOwnProperty('albumName') && result?.hasOwnProperty('createdAt')  && result?.hasOwnProperty('updatedAt')) {
      let album = ImmichAlbumFactory.fromImmichObject(result);
      album.created = album.createdAt ?? new Date();
      album.updated = album.updatedAt;
      return album;
    } else {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - result has no albumName`);
      this.message.info(this.name + `: ${op} on: ${url} failed: - result has no albumName`);
      return null;
    }

  }

  /**
   * fetchPostImmichAlbum()
   *  posts new album with asssets
   * @param provider must be an immich provider with  URL
   * @param albumName name of album which shall be created
   * @param assetIds isd of assets which should belong to album
   * @param authorization authorization with immich authentication string 
   * @param comp name of calling component
   * @returns album, if created - otherwise null
   */
  private async fetchPostImmichAlbum(provider: Provider, authorization: IAuthorization, albumName: string, assetIds: Array<string>, comp: string): Promise<ImmichAlbum | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch post immich album';
    let url = '';
    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    url = url + '/albums';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }

    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';


    const body = {
      'albumName': albumName,
      'assetIds': assetIds
    }
    const result: any = await this.fetch.postResponse<{resultObject: any}>(url, body, headers, mode)
    .catch((error: any) : any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return null;
    });
  
    if (result && result?.hasOwnProperty('albumName') && result?.hasOwnProperty('createdAt')  && result?.hasOwnProperty('updatedAt')) {
      let album = ImmichAlbumFactory.fromImmichObject(result);
      if (album.albumName === albumName) {
        album.created = album.createdAt ?? new Date();
        album.updated = album.updatedAt;
        return album;
      } else {
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - album created with worng albumName`);
        this.message.info(this.name + `: ${op} on: ${url} failed: - album created with worng albumName`);
        return null;
      }
    } else {
      console.log(`album not created at ${op} - result has no albumName`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - result has no albumName`);
      this.message.info(this.name + `: ${op} on: ${url} failed: - result has no albumName`);
      return null;
    }
    
  }

/**
   * fetchPutImmichAssetsToAlbums()
   *  puts asssets to immich albums
   * @param provider must be an immich provider with  URL
   * @param albumIds id of albums
   * @param assetIds isd of assets which should belong to album
   * @param authorization authorization with immich authentication string 
   * @param comp name of calling component
   * @returns album, if created - otherwise null
   */
  private async fetchPutImmichAssetsToAlbums(provider: Provider, authorization: IAuthorization, albumIds: Array<string>,  assetIds: Array<string>, comp: string): Promise<boolean | null> {
    const auth = authorization.authorization;
    const login = authorization.login;
    const op = 'fetch put immich assets to albums';
    let url = '';
    if (provider && provider.providerUrl !== '' && provider.type === ProviderType.immich
      && provider.isProviderAvailable) {
      url = url + provider.providerUrl;
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${op} from: ${url} - not possible`);
      return null;
    }

    url = url + '/albums/assets';
    if (auth === undefined || auth === null || auth === '') {
      // console.log(`auth is empty at ${op} - should be catched by app before??`);
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} - auth is empty`);
      return null;
    }

    const headers = new Headers({
      'x-api-key': auth,
      // 'x-api-key': 'W26EayKRcyNQpPKRmxtJy6mExwPtIpJm9BjQYNUQ4',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const mode: RequestMode = 'same-origin';

    const body = {
      'albumIds': albumIds,
      'assetIds': assetIds
    }

    return await this.fetch.put(url, body, headers, mode)
    .catch((error: any): any => {
      this.logger.error(this.auth.getSession(this.name), this.name, `${op} on: ${url} failed: ${error.message}`);
      this.message.info(this.name + `: ${op} on: ${url} failed: ${error.message}`);
      return false;
    });
  }



}
