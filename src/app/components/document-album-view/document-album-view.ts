import { Component, OnInit, HostListener, ViewChild, Inject, LOCALE_ID, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle  } from '@angular/common';

import { GlobalFunctions } from '../../_globals/global-functions';

import { ImmichAsset } from '../../_db/immich-asset';
import { ImmichAssetFactory } from './../../_db/immich-asset-factory';

import { ProviderType } from '../../_enums/provider-type.enum';
import { ProviderService } from '../../_services/provider.service';
import { MenuType } from '../../_enums/menu-type.enum';
import { DocumentElementType } from '../../_enums/document-type.enum';

import { IImmichFolder } from '../../_interfaces/i-immich-folder';
import { ISortElement } from '../../_interfaces/i-sort-element';

import { AuthenticationService } from '../../_services/authentication.service';
import { ImmichService } from '../../_services/immich.service';
import { DocumentService } from '../../_services/document.service';

import { PaginatorComponent } from '../paginator/paginator';
import { Provider } from '../../_db/provider';
import { ImmichAlbum } from '../../_db/immich-album';
import { ImmichAlbumFactory } from '../../_db/immich-album-factory';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';



class FolderLine {sort!: string; type!: number; text!: Array<string>; counters!: Array<number>; isSelected!: boolean; isSelectable!: boolean; folderIx!: number};


@Component({
  selector: 'dsy-document-album-view',
  templateUrl: './document-album-view.html',
  styleUrl: './document-album-view.css',
  imports: [NgStyle, FormsModule, PaginatorComponent]
})
export class DocumentAlbumViewComponent implements OnInit {

  public name = 'DocumentAlbumViewComponent';

  // action: getDocuments (for import), setAlbums
  @Input({required: true}) action!: string;

  @Input() category!: string;

  @Output() immichClose = new EventEmitter();

  // immich provider
  provider: Provider | null = null;

  // db elements with their texts
  immichFolders!: Array<IImmichFolder>;
  immichAssets!: Array<ImmichAsset>;
  immichAssetTxt: { [key: string]: string } = {};

  // we have a paginator - we show immich folders according to limit
  folderLines!: Array<FolderLine>;
  allShownFolderLines!: Array<FolderLine>;
  shownFolderLines!: Array<FolderLine>;

  // parameters from routes; in case of test: menu for show various parts of order table
  parametersSetSignal = signal(0);

  // setting to true if data loaded from server  ...
  foldersReadySignal = signal(0);

  isSelectAll!: boolean;

  isShowSelectable!: boolean;

  importCounter!: number;

  public dummyData!: string;

  // progress properties
  public showProgressSignal = signal(0);
  public progressStyle = {
    'transition-duration': '300ms',
    'display': 'block',
    'width': '0%'
  };
  public progressValue = 0;
  public progressTotal = 0;
  public progressPercent = 0;


  // variables for paginator
  total!: number; // total number of items
  names!: Array<string>; // optional - names of each record, length must be 0 or === total
  abbrPlaces = 8; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 30; // how many items are we showing in each page - here we need a multiple of 3
  selectedPage: number = 1; // the current selected page

  documentWidth = document.documentElement.clientWidth;
  // due to https://stackoverflow.com/questions/3934271/horizontal-scrollbar-on-top-and-bottom-of-table #52
  // we do not use x- and y- scrolling, so we can use this
  scrollWrapperStyle = {'width': document.documentElement.clientWidth, 'overflow-x': 'scroll', 'transform': 'rotateX(180deg)'};
  tableScrollStyle = {'transform': 'rotateX(180deg)'};


  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private immichService: ImmichService,
    private providerService: ProviderService,
    private documentService: DocumentService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.loadDbTexts();
      this.initChoices();
      // get parameters
      await this.getFolderParameters();
      this.parametersSetSignal.set(1);
      await this.getFolders();
      await this.filterFolders();
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.immichClose.emit();
    }
  }


  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const immichAsset = ImmichAssetFactory.empty();
    this.immichAssetTxt = GlobalFunctions.objText(immichAsset,
      'ImmichAsset', this.auth.systemTexts, language,  this.name);
  }

  private initChoices() {
    this.isSelectAll = false;
    this.isShowSelectable = false;
  }


  private async getFolderParameters() {

  }

  /**
   * get folders and immich assets from immich service
   */
  private async getFolders() {
    this.foldersReadySignal.set(1);
    const session = this.auth.getSession(this.name);
     // ATTN there moght be more than 1 immich providers ... in the moment we search only for first ...
    if (session) {
      const providerIx = session.authorizations.findIndex(_ => _.providerType === ProviderType.immich && _.authorization !== '');
      if (providerIx >= 0) {
        // get immich provider and library from sidebar menu
        this.provider = this.providerService.getProvider(0, session.authorizations[providerIx].providerId, this.name);
        if (this.provider) {
          const externalLibrary = this.provider.providerDocumentsUrl;
          if (externalLibrary && externalLibrary !== '') {
            this.immichAssets = await this.immichService.getImmichAssets(this.provider, this.name, externalLibrary);
            // console.log('libary: ', library);
            // console.log('this.immichAssets', this.immichAssets);
            const folderNames = this.immichAssets?.reduce((acc: Array<string>, asset) =>
              { const folderName = asset.originalPath.includes('/') ? asset.originalPath.substring(0, asset.originalPath.lastIndexOf('/') + 1) : '/';
                return acc.includes(folderName)
                ? acc
                : [...acc, folderName];
              }, []);
            // console.log('foldeNames', folderNames);
            const folders: Array<IImmichFolder> = [];
            if (folderNames) {
              for (const folderName of folderNames) {
                const subFolderName = folderName.includes(externalLibrary)
                  ? GlobalFunctions.trimChar(folderName.substring(folderName.indexOf(externalLibrary) + externalLibrary.length), '/')
                  : '';
                const matches = [...subFolderName.matchAll(/\//g)];
                // console.log('matches', matches);
                const folderLevel = matches.length + (subFolderName === '' ? 0 : 1);
                // we count various attributes for each folder ...
                const folder: IImmichFolder = {
                  // folderName is full name of folder
                  folderName,
                  externalLibrary,
                  // subFolderName  is folder part below library without leading and trailing '/'
                  subFolderName,
                  folderLevel,
                  assets: [],
                  counters: [[],[]]
                }
                folders.push(folder);
              }
              this.immichFolders = folders;
              this.foldersReadySignal.set(2);
            }
          } else {
            console.log('internal error - no provider library')
          } // endif 
        } else {
           alert('internal error - no provider ');
        } // endif items length
      }
    }
  }

  private async filterFolders() {
    if (this.immichFolders?.length > 0) {
      // filter and build lines from immichFolders
      this.folderLines = [];
      // anyway we get albums once ...
      let albums: Array<ImmichAlbum>;
      if (this.action === 'setAlbums' && this.provider) {
        albums = await this.immichService.getImmichAlbums(this.provider, this.name);
      } else {
        albums = [];
      }
      this.foldersReadySignal.set(2);
      // console.log('this.immichFolders', this.immichFolders);
      for (let index = 0; index < this.immichFolders.length; index++) {
        const folder = this.immichFolders[index];
        let isSelectable = false;
        let text = '';
        // on case of getDocuments we count importable assets
        if (this.action.startsWith('getDocuments')) {
          // in the moment we have only externalLibrary folders in getFolders - aventually we need more folders later.. 
          if (folder.externalLibrary !== '' && folder.folderLevel >= 0 && folder.folderLevel <= 1) {
            // console.log('folder', folder);
            const documents = this.documentService.getDocuments(this.name);
            // in the moment we have 5 counter categories
            for (let ix = 0; ix < 5; ix++) {
              // counters map 0 for all elements, 1 for elements in sub folders
              folder.counters[0].push(0);
              folder.counters[1].push(0);
              folder.assets.push([]);
            }
            // we filter all assets which orginal path - should not be necessary as we have built it thiy way ..
            let assets = this.immichAssets?.filter(_ => _.originalPath.startsWith(folder.folderName));
            if (folder.folderLevel === 0) {
              // assets which are in subdiretory to root are conted in their subdirectory folder ...
              // assets.forEach(_ => console.log('sub', _.originalPath.substring(folder.folderName.length)));
              assets = assets.filter(_ => !_.originalPath.substring(folder.folderName.length).includes('/'));
            }
            for (const asset of assets) {
              folder.counters[0][0]++;
              // console.log('sub', asset.originalPath.substring(folder.folderName.length));
              if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                folder.counters[1][0]++;
              }
              folder.assets[0].push(asset);
              let name = asset.originalFileName;
              const point = name.lastIndexOf('.');
              const extension = name.substring(point + 1);
              name = name.substring(0, point);
              // we check if asset already is a document ...
              // we do not fetch documents for each element ...
              // let documentsImported = await this.documentService.searchDocuments(name, this.name);
              let documentsImported = documents.filter(_ => _.documentName.startsWith(name));
              // console.log('documentsImported ', documentsImported );
              // document may be linked again if file name is not exact (but excluding duplicate suffix)
              // or subdirectory is different or it is disabled by user ...
              documentsImported = documentsImported.filter(_ => { 
                const rawName = _.documentName.includes(' (') ?  _.documentName.substring(0, _.documentName.indexOf(' (')) : _.documentName;
                // console.log('rawName', rawName);
                // console.log('name', name);
                // we must compare with subFolderName which is first level subFolder ...
                const subDirectoryFirstLevel = _.documentSubDirectory.includes('/') ? _.documentSubDirectory.substring(0, _.documentSubDirectory.indexOf('/')) :  _.documentSubDirectory;
                return rawName === name && subDirectoryFirstLevel === folder.subFolderName
                && _.type === DocumentElementType.linked_document && _.status < 9;
              });
              if (documentsImported.length > 0) {
                // document already existing
                if (documentsImported[0].immichAssetId) {
                   // compare immich ids
                  if (documentsImported[0].immichAssetId === asset.id) {
                    // add 1 to counter for documents with same immich id
                    folder.counters[0][3]++;
                    if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                      folder.counters[1][3]++;
                    }
                    folder.assets[3].push(asset);
                  } else {
                    // add 1 to counter for documents with other immich id
                    folder.counters[0][4]++;
                    if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                      folder.counters[1][4]++;
                    }
                    folder.assets[4].push(asset);
                  }
                } else {
                  // add 1 to counter for documents without immich id
                  folder.counters[0][2]++;
                  if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                    folder.counters[1][2]++;
                  }
                  folder.assets[2].push(asset);
                }
              } else {
                // add 1 to counter for documents to import an select this folder
                isSelectable = true;
                folder.counters[0][1]++;
                if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                  folder.counters[1][1]++;
                }
                folder.assets[1].push(asset);
              }
            } // endfor assets
          } // endif foler is a linked subfolder level 0 or 1
        } //  endif action
        else if (this.action === 'setAlbums') {
          // albums are created for first level directories of external library ....
          if (folder.externalLibrary !== '' && folder.folderLevel === 1) {
            // we check if folder exists as album
            let isFolderHasAlbum = false;
            let isFolderAlbumFound = false;
            let folderAlbum: ImmichAlbum | null = null;
            if (albums && albums?.length > 0) {
              const albumwIx = albums.findIndex(_ => _.albumName === folder.subFolderName);
              if (albumwIx >= 0 && this.provider) {
                isFolderHasAlbum = true;
                folderAlbum = await this.immichService.getImmichAlbum(this.provider, folder.subFolderName, this.name);
                if (folderAlbum) {
                  isFolderAlbumFound = true;
                } 
              }
            }
            // we have 3 counter categories all /album exists, count not in album /album does not exist
            for (let ix = 0; ix < 3; ix++) {
              // counters map 0 for all elements, 1 for elements in sub folders
              folder.counters[0].push(0);
              folder.counters[1].push(0);
              folder.assets.push([]);
            }
            let assets = this.immichAssets?.filter(_ => _.originalPath.startsWith(folder.folderName));
            for (const asset of assets) {
              folder.counters[0][0]++;
              // console.log('sub', asset.originalPath.substring(folder.folderName.length));
              if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                folder.counters[1][0]++;
              }
              folder.assets[0].push(asset);
              if (isFolderHasAlbum) {
                if (isFolderAlbumFound && folderAlbum && folderAlbum?.assets) {
                  let isAssetInAlbum = false;
                  if (folderAlbum.assets.length > 0) {
                    // check if asset is alredy in album, then we do not count this asset
                    const albumIx = folderAlbum.assets.findIndex(_ => _.id === asset.id);
                    if (albumIx >= 0) {
                      isAssetInAlbum = true;
                    }
                  }
                  if (!isAssetInAlbum) {
                    isSelectable = true;
                    folder.counters[0][1]++;
                    // console.log('sub', asset.originalPath.substring(folder.folderName.length));
                    if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                      folder.counters[1][1]++;
                    }
                    folder.assets[1].push(asset);
                  }
                } else {
                  // album is in albums list but not found ...
                  text = 'album not found';
                }
              } else {
                isSelectable = true;
                folder.counters[0][2]++;
                // console.log('sub', asset.originalPath.substring(folder.folderName.length));
                if (asset.originalPath.substring(folder.folderName.length).includes('/')) {
                  folder.counters[1][2]++;
                }
                folder.assets[2].push(asset);
              }
            } // endfor assets
          } // endif foler is a linked subfolder level 0 or 1
          // we set timeout to show progress anyway
          await this.fetchDummyData(10);
        } //  endif setAlbums
        if (folder.folderLevel === 1 || this.action !== 'setAlbums') {
          this.folderLines.push({
            // we sort by folder name
            sort: folder.subFolderName,
            type: 1,
            text: [folder.folderName, folder.subFolderName],
            counters: [],
            isSelected: false,
            isSelectable,
            folderIx: index
          });
            this.folderLines.push({
            // we sort by folder name
            sort: folder.subFolderName,
            type: 2,
            text: [text],
            counters: folder.counters[0],
            isSelected: false,
            // is this folder selectable ??
            isSelectable, 
            folderIx: index
          });
          this.folderLines.push({
            // we sort by folder name
            sort: folder.subFolderName,
            type: 3,
            text: [],
            counters: folder.counters[1],
            isSelected: false,
            isSelectable,
            folderIx: index
          });
        }
      this.showProgress(index, this.immichFolders.length);
      } // endfor folders
      const sortElements: Array<ISortElement> = [{sortField: 'sort', key: 'sort'}, {sortField: 'type', key: 'type'}]
      this.folderLines = this.folderLines.sort(GlobalFunctions.sortFields(sortElements));
      this.allShownFolderLines = this.folderLines;
      // paginator - this paginator has names
      this.names = this.allShownFolderLines.map(_ => _.text[0]);
      // paginator - set total records - after setting names, total triggers paginator refresh
      this.total = this.allShownFolderLines.length;
      this.shownFolderLines = this.allShownFolderLines.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    } else {
      this.folderLines = [];
      this.names = [];
      this.total = 0;
      this.allShownFolderLines = [];
      this.shownFolderLines = [];
    }
    this.foldersReadySignal.set(3);
    this.importCounter = 0;
  }
  
   /**
 * showProgress()
 * @param value count of uploaded elements
 * @param total  summary of documents to be uploaded
 * @param duration in milliseconds - after duration prograss window disappears
 */
  private showProgress(value: number, total: number, duration?: number) {
    // duration in millisec until progrss windows disappears
    if (!duration || isNaN(duration)) {
      duration = 3000;
    }
    if (value > 0 && total >= value) {
      this.progressValue = value;
      this.progressTotal = total;
      this.showProgressSignal.set(this.showProgressSignal() + 1);
      this.progressPercent = Math.floor(value * 100 / total);
      this.progressStyle.width = this.progressPercent.toString() + '%';
    }
    if (value >= total)  {
      this.progressPercent = 100;
      this.progressStyle.width = '100%';
      setTimeout(() => {
      this.showProgressSignal.set(0);
      }, duration);
    }
  }

  // used to trigger change detection after updating a variable in this component ...
  private async fetchDummyData(duration?: number): Promise<void> {
    this.dummyData = 'load data .....';
    // duration in millisec until progrss windows disappears
    if ( !duration ||isNaN(duration)) {
      duration = 200; // 200 milliseconds default
    }

    // simulates asynchrone HTTP-requestwith Promise
    const dummyData = await new Promise<string> ((resolve) => {
      setTimeout(() => {
        resolve('data loaded ...!');
      }, duration); 
    });

    this.dummyData = dummyData; // Angular recognises because we change this.
  }

  


  /** ------------------------  public methods --------------------------------------------------- */


  // paginator - set params for actual page
  onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // update content to view new page content
    this.shownFolderLines = this.allShownFolderLines.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }

  select(event: any, value: string) {
    const ix = this.folderLines.findIndex(_ => _.sort === value && _.type === 2 && _.isSelectable);
    if (ix >= 0) {
      this.folderLines[ix].isSelected = event.target.checked;
    }
    this.calcCounter();
  }

  selectAll(event: any) {
    this.isSelectAll = event.target.checked;
    // this.isSelectAll = !this.isSelectAll;
    // console.log(' this.isSelectAll:',  this.isSelectAll);
    if (this.isSelectAll) {
      this.folderLines.forEach(_ => _.isSelected = _.type === 2 && _.isSelectable ? true : false);
    } else {
      this.folderLines.forEach(_ => _.isSelected = _.type === 2 && _.isSelectable ? false : false);
    }
    this.calcCounter();
  }

  showSelectable(event: any) {
    this.isShowSelectable = event.target.checked;
    this.selectedPage = 1;
    this.allShownFolderLines = this.folderLines?.filter(_ => _.isSelectable || !this.isShowSelectable);
    // paginator - this paginator has names
    this.names = this.allShownFolderLines.map(_ => _.text[0]);
    // paginator - set total records - after setting names, total triggers paginator refresh
    this.total = this.allShownFolderLines.length;
    this.shownFolderLines = this.allShownFolderLines?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }


  calcCounter() {
    this.importCounter = 0;
    for (const line of  this.folderLines) {
      if (line.type === 2 && line.isSelected) {
        this.importCounter += line.counters[1];
      }
    }
   }

  import() {
    const folders: Array<IImmichFolder> = [];
     for (const line of  this.folderLines) {
      if (line.type === 2 && line.isSelected) {
        folders.push(this.immichFolders[line.folderIx]);
      }
    }
    // after importing this component is closed by parent
  }

  async insertInAlbum() {
    const folders: Array<IImmichFolder> = [];
     for (const line of  this.folderLines) {
      if (line.type === 2 && line.isSelected) {
        folders.push(this.immichFolders[line.folderIx]);
      }
    }
    // folders are these folders where assets must be inserted in albums
    for (const folder of folders) {
      let album = ImmichAlbumFactory.empty();
      album.albumName = folder.subFolderName;
      if (folder.counters[0][2] > 0) {
        // we check if folder counter 2 > 0, the we must create album first
        album.assets = folder.assets[2];
      } else if (folder.counters[0][1] > 0) {
        album.assets = folder.assets[1];
      }
      if (album.assets?.length > 0 && this.provider) {
        const isOk = await this.immichService.setImmichAlbum(this.provider, album, this.name);
        if (isOk) {
          alert(album.assets?.length + ' assets added to ' + (folder.counters[0][2] > 0 ? 'NEW ' : '') + 'album: ' + folder.subFolderName);
        } else {
          alert(album.assets?.length + ' assets could NOT be added to album: ' + folder.subFolderName);
        }
      } else {
        alert('nothing to import to album: ' + folder.subFolderName);
      }
    }
    // we must close app - album infrastructure has changed, user must enter component again ,,,
    this.immichClose.emit();
  }

  // cancelling this component  ...
  cancel() {
    this.immichClose.emit();
  }

}

