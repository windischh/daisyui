import { Component, Inject, LOCALE_ID, signal } from '@angular/core';
import { DatePipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { GlobalFunctions } from '../../_globals/global-functions';
import { THUMBNAIL_WIDTH } from '../../_globals/constants';
import { ConfigurationOptionBasicFunctions } from '../../_globals/configuration-option-basic-functions';

import { DocumentElement } from '../../_db/document';
import { DocumentFactory } from '../../_db/document-factory';
import { Session } from '../../_db/session';
import { ConfigurationOption } from '../../_db/configuration-option';

import { DocumentElementType } from '../../_enums/document-type.enum';
import { OptionNameDocumentCategory } from '../../_enums/option-name-document-category';
import { App } from '../../_enums/app.enum';

import { ISortElement } from '../../_interfaces/i-sort-element';
import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ConfigurationService } from '../../_services/configuration.service';

import { DocumentListViewComponent } from '../document-list-view/document-list-view';
import { DocumentFormViewComponent } from '../document-form-view/document-form-view';
import { ProviderType } from '../../_enums/provider-type.enum';
import { DocumentService } from '../../_services/document.service';
import { ImmichService } from '../../_services/immich.service';
import { IImmichFolder } from '../../_interfaces/i-immich-folder';


@Component({
  selector: 'dsy-document',
  templateUrl: './document.html',
  styleUrl: './document.css',
  imports: [DocumentFormViewComponent, NgClass, NgStyle, SlicePipe, DatePipe, DocumentListViewComponent]
})
export class DocumentComponent {


  public name = 'DocumentComponent';

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  public App: typeof App = App;

  // we need options to build choices
  public options!: Array<ConfigurationOption>;

  // document for maintenance or show form
  public document!: DocumentElement;
  // component usage can be: 'form', 'list'
  private documentComponentUsage!: string;
  // isMaint true - document-list and document-form should allow data maintenance
  public isMaint!: boolean;
  // isCreate true - in case of usage 'list'  document-list should allow to create a new document
  public isCreate!: boolean;

  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews!: Session;

  // db texts
  public documenttxt: { [key: string]: string } = {};

  // documents from db
  public documents: Array<DocumentElement> = [];

   // isShowForm is true to show form
  public isShowForm!: boolean;

  // isShowList is true to show list of documents or child documents
  public isShowList!: boolean;

  // defines action on document form-view
  public formAction!: string;

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // number of (filtered) linked documents
  countLinkedDocuments!: number;

  // thumbnails swith is reset and set in getting thumbnails, triggered  via list-view
  // but we have already documents weshow, so this switch is not necessary
  // isThumbnailsLoaded = true;

  // document category values and names - all possible categorys
  documentCategorys!: {[key: string]: string};
  // choice includes all categories
  categoryChoices!: Array<IChoice>;
  // user can see selected categorys - selected category names are shown
  selectedCategorys!: Array<string>;

  // choose document type shown
  documentType = '0';
  documentTypeChoices: Array<IChoice> = [];

  subdirFilter = '';
  isSubdirFilterEntered = false;
  documentFilter = '';
  isFilterEntered = false;
  dateFrom!: Date;
  isDateFromEntered = false;
  dateTo!: Date;
  isDateToEntered = false;

  // documents can be filtered by user
  filteredDocuments!: Array<DocumentElement>;


  // special function: if true, we show only disabled and can re-enable them
  isShowDisabled = false;

  // special function: if true, we sort inside category
  isDistinctCategory = true;

  // special function: if true, we sort inside sub directory
  isDistinctDirectory = false;

  isImmichAvailable = false;

  isShowDropdown!: boolean;


  // popup properties - we use popup here, as this component is selfstanding
  // public popupClass = 'ui flowing popup hidden';
  public popupSignal = signal(0);
  public popupHeaderText = '';
  public popupContentText = '';
  public popupConfirmText = '';
  public popupConfirmClass = 'ui green label';

  // progress properties
  public showProgressSignal = signal(0);
  // isProgressPrepare is set if we are in preparation mode
  public isProgressPrepare = false;
  public progressStyle = {
    'transition-duration': '300ms',
    'display': 'block',
    'width': '0%'
  };
  public progressValue = 0;
  public progressTotal = 0;
  public progressPercent = 0;

  // images content for documents, filled  when document detail is shown or for filtered documents
  // we use images content also (as thumnails) in document list template if no thumbnail content
  public images: { [key: number]: {content: string, width: number | undefined}} = {};
  // thumbnails are loaded for documents which are filtered in document list
  public thumbnails: { [key: number]: {content: string, width: number | undefined} } = {};
  public thumbnailCountSignal = signal(0);

  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private configurationService: ConfigurationService,
    private documentService: DocumentService,
    private immichService: ImmichService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    this.documentComponentUsage = 'list';
    await this.sessionActivate();
  }



  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      const session = this.auth.getSession(this.name);
      if (session) {
        this.isMaint = session?.app === App.admin ? true : false;
        // this.isCreate = (session.app === App.admin || (session.app === App.server && session.documents !== '')) && session.securityLevel.maint > 0 ? true : false;
        // no manual creation of documents
        this.isCreate = false;
        // activation is done here - we have a component called by routing ...
        switch (this.documentComponentUsage) {
          case 'form':
            this.isShowForm = true;
            this.isShowList = false;
            this.formAction = this.isCreate ? 'new' : this.isMaint && this.document ? 'maint' : 'show'
            break;

          case 'list':
            this.isShowForm = false;
            this.isShowList = true;
            this.formAction = '';
            break;

          default:
            break;
        }
        this.sessionForViews  = session;
        this.loadDbTexts();
        if (this.isShowList) {
          this.options = await this.configurationService.getConfigurationOptions(this.name);
          this.initChoices(true);
          this.refreshSignal.set(0);
          await this.getDocuments();
          this.refreshSignal.set(1);
        }
      } else {
        // session could not be activated - duration exhausted
        this.message.info(this.name +` internal session error - session must be restarted`);
        this.logger.info(this.auth.getSession(this.name), this.name, `session error - session must be restarted`);
        this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
      }
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.router.navigate(['./../restart'], { relativeTo: this.route.parent });
    }
  }

  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session?.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const document = DocumentFactory.empty();
    this.documenttxt = GlobalFunctions.objText(document,
      'Document', this.auth.systemTexts, language,  this.name);
  }

  // with isAll true we set selected choice to all, otherwise to undefined
  private initChoices(isAll: boolean) {
    this.documentCategorys = {};
    // first we build  all category values from enum to get a category header even if no category exists- except for category 0 = undefined ....
    const categorys: Array<number> = Object.keys(OptionNameDocumentCategory)
    // only document categories where optioan has a name !== ''
    .filter((k: any) => typeof OptionNameDocumentCategory[k] === 'string' && ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_document_' + k) !== '')
    .map(_ => Number(_));
    for (const cat of categorys) {
      this.documentCategorys[cat] = ConfigurationOptionBasicFunctions.getOptionString(this.options, 'opt_document_' + cat) ?? '';
    }
    this.categoryChoices = [];
    this.categoryChoices = Object.keys(this.documentCategorys)
    .map(_ => {
      // const enumStringType: { [key: string]: any } = this.documentCategorys;
      let isSelected = !isAll ? true : false;
      return {value: _, text: this.documentCategorys[_], isSelected};
    });
    this.categoryChoices.splice(0, 0, {value: '', text: this.auth.txt['all'],
      isSelected: isAll ? true : false});
    this.selectedCategorys = this.categoryChoices.filter(_ => _.isSelected).map(_ => _.text);

    this.documentTypeChoices = [
      {value: '0', text: this.auth.txt['all'], isSelected: true},
      {value: '5', text: this.auth.txt['uploaded'], isSelected: false},
      {value: '6', text: this.auth.txt['linked_documents'], isSelected: false},
      {value: '7', text: this.auth.txt['immich_documents'], isSelected: false}
    ];
    const session = this.auth.getSession(this.name);
    // there moght be more than 1 immich providers ... in the moment we search only for first ...
    let immichProviderIx = -1;
    if (session) {
      immichProviderIx = session.authorizations.findIndex(_ => _.providerType === ProviderType.immich && _.authorization !== '');
    }
    this.isImmichAvailable = immichProviderIx >= 0;
  }

  /**
   * getDocuments()
   *  delivers all active documents
   */
  private async getDocuments() {
    if (this.isImmichAvailable) {
      await this.actualizeFromImmich();
    } else {
      alert('immich not available - we work with locally stored documents info')
    }
    let documents: Array<DocumentElement>;
    const session = this.auth.getSession(this.name);
    documents = this.documentService.getDocuments(this.name);
    // we do not filter documents - disabled can be shown by selection in list-view
    // const filteredDocuments = documents?.filter(_ =>  _.status < 9)
    if (documents?.length > 0) {
      // console.log(`number of documents: `, documents?.length);
      // TODO get thumbnails for all filtered documents ...
      const sortElements: Array<ISortElement> = [{sortField: 'documentCategory', key: 'documentCategory'}, {sortField: 'documentNr', key: 'documentNr'}]
      this.documents = documents
      .sort(GlobalFunctions.sortFields(sortElements));
      this.filterDocuments();
    } else {
      this.filteredDocuments = [];
    }
  }

   /**
   * gactualizeFromImmich()
   *  actualize documents metadata in local storage from immich
   */
  private async actualizeFromImmich() {
    // we check immich library
    // const provider = this.providerService.getProvider(0, immichProviderId, this.name);
    // const itemsFound = await this.immichService.getImmichLibrarys(provider, this.name);
    // itemsFound  has external libray name ( that contains /linkedDocuments)
    // we insert immich documents as new documents for all immich folders
    // TODO get immich folders and check for assets which are already stored as documents
    const immichFolders: Array<IImmichFolder> = [];
    if (immichFolders.length > 0) {
      let importCount = 0;
      let documents: Array<DocumentElement>;
      let documentNrMax = this.documentService.getDocumentNrMax(DocumentElementType.linked_document, this.name);
      if (documentNrMax >= 0 ) {
        documentNrMax++;
      } else {
        documentNrMax = 1;
      }
      documents = [];
      let documentNr = documentNrMax;
      for (const folder of immichFolders) {
        if (folder.assets[1].length > 0) {
          for (const asset of folder.assets[1]) {
            // we build an empty document as clone of this document to be independent form eventually changes of this.document ...
            let document: DocumentElement = GlobalFunctions.clone(this.document);
            document.documentNr = documentNr;
            document.type = DocumentElementType.linked_document;
            // documentFileName is built for internal use - it is overwritten in setDocument in document service ...
            document.documentFileName = asset.originalPath.includes('/') ? asset.originalPath.substring(asset.originalPath.lastIndexOf('/') + 1) : asset.originalPath;
            // subdirectory below external library path
            let subDirectory = asset.originalPath.includes('/') ? asset.originalPath.substring(0, asset.originalPath.lastIndexOf('/')) : '';
            if (subDirectory.includes(folder.externalLibrary)) {
              subDirectory = GlobalFunctions.trimChar(subDirectory.substring(subDirectory.indexOf(folder.externalLibrary) + folder.externalLibrary.length), '/')
            }
            document.documentSubDirectory = subDirectory;
            // documentOriginalFileName from immich is not used !!!
            // document.documentOriginalFileName = asset.originalFileName;
            document.documentOriginalFileName = document.documentFileName;
            document.documentSize = asset.exifInfo?.fileSizeInByte ?? 0;
            // we get document date from special dirInfoDate ...
            document.documentDate = asset.fileCreatedAt ?? new Date();
            const name = asset.originalFileName;
            const point = name.lastIndexOf('.');
            const extension = name.substring(point + 1);
            document.documentName = name.substring(0, point);
            document.documentExtension = extension;
            document.immichAssetId = asset.id;
            // we do not extract exif or file data from file.blob, but we get them from immich data..
            document.imageTitle = asset.exifInfo?.description ?? '';
            document.dateTimeOriginal = asset.exifInfo?.dateTimeOriginal ?? document.documentDate;
            if (asset.exifInfo?.latitude && asset.exifInfo?.latitude !== '' && asset.exifInfo?.longitude && asset.exifInfo?.longitude !== '') {
              document.imageLocation = asset.exifInfo.latitude + ', ' + asset.exifInfo.longitude;
            }
            document.imageHeight = asset.exifInfo?.exifImageHeight?.toString() + 'px';
            document.imageWidth = asset.exifInfo?.exifImageWidth?.toString() + 'px';
            documents.push(document);
            documentNr++;
            importCount++;
          }
        }
      }
      let failures = 0;
      // TODO build chunks of 5 documents and show a progress bar if documents.length > 10
      // for test we build 1 document ...
      for (let i = 0; i < documents.length; i++) {
        const documentIds = this.documentService.createDocuments([documents[i]], this.name);
        failures += Object.entries(documentIds).filter(([key, value]) => value === false).length;
        this.showProgress(i + 1, documents.length);
      }
      // inform user about loading documents
      this.showPopup((documents.length - failures).toString() + ' ' + this.auth.txt['documents'], failures === 0, this.auth.txt['created'],
        failures > 0 ? failures.toString() + ' ' + this.auth.txt['files'] + ' ' + this.auth.txt['not'] + ' '+ this.auth.txt['created'] : '', 8000 );
    }
    
  }

  private filterDocuments() {
    if (this.documents?.length > 0) {
      // user should have possibilty to use  point to distinct between documents with cloned names ...
      const placeOfPoint = this.documentFilter.indexOf('.');
      const documentFilterRaw = this.documentFilter.substring(0, placeOfPoint);
      this.filteredDocuments = this.documents.filter(_ => {
        return (this.documentFilter?.length > 0 ? ((placeOfPoint >= 0 ? _.documentName === documentFilterRaw : _.documentName?.startsWith(this.documentFilter)) ||  _.imageTitle?.startsWith(this.documentFilter)) : true)
        && (this.subdirFilter?.length > 0 ? _.documentSubDirectory?.startsWith(this.subdirFilter) : true)
        && (!this.dateFrom || this.dateFrom.getTime() < _.dateTimeOriginal?.getTime() )
        && (!this.dateTo || this.dateTo.getTime() > _.dateTimeOriginal?.getTime() )
        && (this.categoryChoices[0].isSelected
          || (this.categoryChoices[this.categoryChoices.length -1].isSelected && !_.documentCategory)
          || this.categoryChoices.filter(cat => cat.isSelected && _.documentCategory === Number(cat.value)).length > 0)
        && (this.documentTypeChoices[0].isSelected
          ||this.documentTypeChoices.filter(type => type.isSelected && _.type === Number(type.value)).length > 0)
      });
      // if isShowDisabled is set true, we show only the disabled
      if (this.isShowDisabled) {
        this.filteredDocuments = this.filteredDocuments.filter(_ => _.status >= 9);
        this.countLinkedDocuments = 0;
      } else {
        this.filteredDocuments = this.filteredDocuments.filter(_ => _.status < 9);
        this.countLinkedDocuments = this.filteredDocuments.filter(_ => _.type === DocumentElementType.linked_document && _.status < 9).length;
      }
    }
    if (this.filteredDocuments?.filter(_ => _.documentId === this.document?.documentId)?.length > 0) {
      // document has remained in list ...
    } else {
      this.document = DocumentFactory.empty();
    }
  }


  /**
   * getDocumentContent()
   *  fetch content and calculate width
   *  (we proceed this also if images entry already exists - document.imageWidth can be changed by user ...)
   *  stores content from document directory in images key/value structure
   * @param document: element of documents database for whichwe get content
   */
  private async getDocumentContent(document: DocumentElement) {
    // first we check if we shoul load image from file content
    if (document.documentDirectory && document.documentDirectory !== '' && !this.images[document.documentId]) {
      const isGetThumbnail = false;
      const documentString = await this.immichService.getDocumentFileContent( document, isGetThumbnail, this.name);
      if (documentString !== '') {
        // first we have no width.
        this.images[document.documentId] = {content: documentString, width: undefined};
      }
    }
    // anyway we recalculate width ,,,
    this.calcImageWidth(document);
    this.calcThumbnailWidth(document);
  }

  private calcImageWidth(document: DocumentElement) {
    if (this.images[document.documentId] && this.images[document.documentId]?.content !== '') {
      let width =  parseInt(document.imageWidth);
      if (width > 0) {
        // we calculate width indepentent of existing of stored thumbnail
        this.images[document.documentId].width = width > 600 ? (600 + width/10) : width;
      } else {
        // if no width we let browser do ...
        this.images[document.documentId].width = undefined;
      }
    }
  }


  private calcThumbnailWidth(document: DocumentElement) {
    if (this.thumbnails[document.documentId]) {
      let width =  parseInt(document.imageWidth);
      if (width > 0) {
        // we calculate thumbnailWidth indepentent of existing of stored thumbnail
        this.thumbnails[document.documentId].width = width > THUMBNAIL_WIDTH - 10 ? (THUMBNAIL_WIDTH - 10 + width/100) : width;
      } else {
        this.thumbnails[document.documentId].width = THUMBNAIL_WIDTH;
      }
    }
  }

  /**
   * showPopup()
   * @param header header text
   * @param isPositiveConfirmed if is false, color changes from green to red
   * @param confirm text we show to confirm
   * @param content detail text
   * @param duration in milliseconds
   */
  private showPopup(header: string, isPositiveConfirmed?: boolean, confirm?: string, content?: string, duration?: number)  {
    if (!duration || isNaN(duration)) {
      duration = 2000;
    }
    this.popupHeaderText = header;
    if (content) {
      this.popupContentText = content;
    } else {
      this.popupContentText = '';
    }
    if (!isPositiveConfirmed) {
      this.popupConfirmClass = this.popupConfirmClass.replace('green', 'red');
    } else {
      this.popupConfirmClass = this.popupConfirmClass.replace('red', 'green');
    }
    if (confirm) {
      this.popupConfirmText = confirm;
    } else {
      this.popupConfirmText = '';
    }
    // this.popupClass = this.popupClass.replace('hidden', 'visible');
    this.popupSignal.set(1);
    setTimeout(() => {
      // this.popupClass = this.popupClass.replace('visible', 'hidden');
      this.popupSignal.set(0);
    }, duration);
  }

/**
 * showProgress()
 * @param value count of uploaded elements
 * @param total  summary of documents to be uploaded
 * @param duration in milliseconds - after duration prograss window disappears
 */
private showProgress(value: number, total: number, duration?: number)  {
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
  if (value >= total) {
    this.progressPercent = 100;
    this.progressStyle.width = '100%';
    setTimeout(() => {
      this.showProgressSignal.set(0);
    }, duration);
  }

}



  /** --------------------------  public methods -------------------------------------------- */

  public setShowDisabled(event: any) {
    this.isShowDisabled = event.target.checked;
    this.filterDocuments();
  }

  public toggleCategoryMenu() {
    this.isShowDropdown = !this.isShowDropdown;
    // default duration 10 sec. user has time to choose 1 ore more categories
    const duration = 10000;
    // user has toggled dropdown visible
    if (this.isShowDropdown) {
      // after duration we automatic toggle to hidden
      setTimeout(() => {
        this.isShowDropdown = false;
      }, duration);
    }
  }

  public selectCategory(event: any) {
    this.selectedCategorys = [];
    // all was not set and is now set
    if (Number(event.target.value) === 0 && event.target.checked) {
      this.initChoices(true);
    } else {
      this.categoryChoices.forEach(_ => {
        if (Number(_.value) === Number(event.target.value)) {
          if (event.target.checked) {
          _.isSelected = true;
          } else {
            _.isSelected = false;
          }
        }
      });
      this.categoryChoices[0].isSelected = false;
    }
    // no category is selected, we init with all
    if (this.categoryChoices.filter(_ => _.isSelected).length === 0) {
      this.initChoices(true);
    }
    this.selectedCategorys = this.categoryChoices.filter(_ => _.isSelected).map(_ => _.text);
    this.filterDocuments();
  }

  public setDistinctCategory(event: any) {
    this.isDistinctCategory = event.target.checked;
    this.filterDocuments();
  }

  public setDistinctDirectory(event: any): void {
    this.isDistinctDirectory = event.target.checked;
  }

  public setDateFromEntered(dateString: string) {
    this.isDateFromEntered = dateString !== '' ? true : false;
  }

  public setDateFrom(dateString: string) {
    let dateFrom = GlobalFunctions.parseDMYtoDate(dateString);
    if (dateFrom && (!this.dateTo || this.dateTo?.getTime() > dateFrom.getTime())) {
      this.dateFrom = dateFrom;
    } else {
      this.dateFrom = new Date();
    }
    this.filterDocuments();
    this.isDateFromEntered = false;
  }

  public setDateToEntered(dateString: string) {
    this.isDateToEntered = dateString !== '' ? true : false;
  }

  public setDateTo(dateString: string) {
    let dateTo = GlobalFunctions.parseDMYtoDate(dateString);
    if (dateTo && dateString.length === 4) {
      dateTo = GlobalFunctions.addYears(dateTo, 1);
      dateTo = GlobalFunctions.addDays(dateTo, -1);
    }
    if (dateTo && (!this.dateFrom || dateTo.getTime() > this.dateFrom?.getTime())) {
      this.dateTo = dateTo;
    } else {
      this.dateTo = new Date();
    }
    this.filterDocuments();
    this.isDateToEntered = false;
  }

  public setSubdirEntered(filterString: string) {
    this.isSubdirFilterEntered = filterString !== '' ? true : false;
  }

  // entry in field or extra button to start filter operation
  public setSubdir(filterTerm: string) {
    this.subdirFilter = filterTerm;
    this.filterDocuments();
    // console.log('filter: ', filterTerm);
    this.isSubdirFilterEntered = false;
  }

  public setFilterEntered(filterString: string) {
    this.isFilterEntered = filterString !== '' ? true : false;
  }

  // entry in field or extra button to start filter operation
  public setFilter(filterTerm: string) {
    this.documentFilter = filterTerm;
    this.filterDocuments();
    // console.log('filter: ', filterTerm);
    this.isFilterEntered = false;
  }

  public closePopUp() {
    // this.popupClass = this.popupClass.replace('visible', 'hidden');
    this.popupSignal.set(0);
  }

  public setDocumentType(event: any) {
    this.documentTypeChoices.forEach(_ => {
      if (_.value === event.target.value && event.target.checked) {
        _.isSelected = true;
      } else {
        _.isSelected = false;
      }
    });
    this.documentType = this.documentTypeChoices.filter(_ => _.isSelected)[0].value;
    this.filterDocuments();
  }

  /** ------------------------ ------- document-list-view ------------------------- */

  // not used in the moment - lista s leading view is visible when component is active ,,,
  public closeDocumentList() {
    this.isShowList = false;
  }


  // fetch thumbnails for filtered documents (if thumbnail is already in key/value structure, there is no need to fetch again...)
  public async getFilteredThumbnails(ids: Array<number>) {
    // this.isThumbnailsLoaded = false;
    if (ids?.length > 0) {
      for (const id of ids) {
        const document = this.documents.find(_ => _.documentId === id);
        // first we check if we should load thumbnail from file content
        if (document?.thumbnailDirectory && document?.thumbnailDirectory !== '' && !this.thumbnails[id]) {
          const isGetThumbnail = true;
          const documentString = await this.immichService.getDocumentFileContent(document, isGetThumbnail, this.name);
          if (documentString !== '') {
            // first we have no width.
            this.thumbnails[id] = {content: documentString, width: undefined};
            this.calcThumbnailWidth(document);
          }
        }
        // we load document content to build thumbnail if no thumbnail content is available
        if (document && !this.thumbnails[id]) {
          // thumbnail width wil be calculated in getDocumentContent()
          this.thumbnails[id] = {content: '', width: undefined};
          await this.getDocumentContent(document);
          // console.log('document content for id:', id);
        }
      }
      this.thumbnailCountSignal.set(this.thumbnailCountSignal() + 1);
      // console.log('document - thumbnailCountSignal:', this.thumbnailCountSignal());
    }

  }

  /*
  @deprected - no document insert
  // if insert is triggered in (leading) list, here we activate form-view
  public insertDocument(documentCategory: number) {
    this.formAction = 'new';
    this.document = DocumentFactory.empty();
    this.document.documentCategory = documentCategory;
    this.document.type = DocumentElementType.without_special_purpose;
    this.isShowForm = true;
    this.isShowList = false;
  }
  */

  // if show is triggered in (leading) list, here we activate form-view
  public async showDocument(id: number) {
    this.formAction = 'show';
    this.document = this.documents.find(_ => _.documentId === id) ?? this.document;
    // getting content anyway - at least to recalc width
    await this.getDocumentContent(this.document);
    this.isShowForm = true;
    this.isShowList = false;
  }

  // if update is triggered in (leading) list, here we activate form-view
  public async maintDocument(id: number) {
    this.formAction = 'maint';
    this.document = this.documents.find(_ => _.documentId === id) ?? this.document;
    // getting content anyway - at least to recalc width
    await this.getDocumentContent(this.document);
    this.isShowForm = true;
    this.isShowList = false;
  }


  public async disableDocument(id: number) {
    const document = this.documents.find(_ => _.documentId === id);
    if (document && document?.documentId > 0) {
      // check deleteable
      // const isDeleteable = this.documentService.isImageDeleteable(documentId, this.name);
      const isDeleteable = true;
      if (isDeleteable) {
        if (confirm(this.auth.txt['document_disable'] + '?')) {
          const isDisabled = await this.documentService.setDocumentDisabled(document.documentId, this.name);
          if (isDisabled) {
            await this.getDocuments();
          }
        }
      } else {
        alert(this.auth.txt['disable_not_possible']);
      }
    }
  }

  public async enableDocument(id: number) {
    const document = this.documents.find(_ => _.documentId === id);
    const customersession = this.auth.getSession(this.name);
    if (document && document.documentId > 0) {
      if (confirm(this.auth.txt['document_enable'] + '?' )) {
        const isEnabled = await this.documentService.setDocumentStatus(document.documentId, 0, this.name);
        if (isEnabled) {
          // ok
        } else {
          alert('possible file error - file reload');
        }
        await this.getDocuments();
      }
    }
  }


  /** ------------------------------ document-form-view ------------------------- */

  // document data were entered in form-view, we proceed the updates here
  // there is no update of document itself in document file
  public documentUpdate(document: DocumentElement) {
    if (document && document.documentName !== '') {
      // console.log(`document component update etag: `, this.etag);
      const updatedId = this.documentService.setDocument(document, this.name);
      if (updatedId > 0) {
        // with getDocument we get updated document ...
        this.document = this.documentService.getDocument(updatedId, this.name) ?? this.document;
        // document content is already loaded when calling maint of document - but eventually width has to be recalculated
        this.calcImageWidth(this.document);
        // category of document could be changed - we must rearrange list ...
        this.getDocuments();
      } else if (updatedId === 0) {
        alert('communication error');
      } else if (updatedId === -1) {
        alert('file error');
      }
    }
  }

  public closeDocumentForm() {
    if (this.documentComponentUsage === 'form') {
      // nothing - in the moment  this component is selected only by routing, there is no close action ....
    } else {
      this.isShowForm = false;
      this.isShowList = true;
      this.formAction = '';
    }
  }

}
