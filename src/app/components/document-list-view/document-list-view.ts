import { Component, EventEmitter, Input, Output, signal, SimpleChange } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgStyle, SlicePipe, DecimalPipe, DatePipe } from '@angular/common';

import { GAINSBORO, LIGHT_GREY, WHITE_SMOKE } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';

import { DocumentElement } from '../../_db/document';
import { Session } from '../../_db/session';

import { DocumentElementType } from '../../_enums/document-type.enum';

import { ISortElement } from '../../_interfaces/i-sort-element';

import { SafeResource } from '../../_services/safe-resource';

import { PaginatorComponent } from '../paginator/paginator';



// we need DocumentsExtended to store a common date sort field
// documentIx is not longer needed ...
class DocumentExtended extends DocumentElement {documentIx!: number; sortDate!: Date; displayNr!: string; displayLocation!: string};

@Component({
  selector: 'dsy-document-list-view',
  templateUrl: './document-list-view.html',
  styleUrl: './document-list-view.css',
  imports: [PaginatorComponent, FormsModule, NgStyle, DecimalPipe, DatePipe, SafeResource]
})
export class DocumentListViewComponent {

  public name = 'DocumentListViewComponent';

  GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

  // DocumentExtended: typeof DocumentExtended = DocumentExtended;

  // for using MNumber() in html template - not needed, we use parseint
  //Number: typeof Number = Number;

  @Input({required: true}) session!: Session;

  @Input({required: true}) document!: DocumentElement;
  @Input({required: true}) documents!: Array<DocumentElement>;


  @Input({required: true}) thumbnails!: { [key: number]: {content: string, width: number | undefined} };
  @Input({required: true}) thumbnailCount!: number;
  @Input({required: true}) images!: { [key: number]: {content: string, width: number | undefined} };

  // isMaint - true if updating is allowed
  @Input({required: true}) isMaint!: boolean;
  // isMaint - true if creating of new image is allowed
  @Input({required: true}) isCreate!: boolean;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) documenttxt!: { [key: string]: string };

  // document category values and names
  @Input({required: true}) documentCategorys!: {[key: string]: string};

  @Input({required: true}) isDistinctCategory!: boolean;
  @Input({required: true}) isDistinctDirectory!: boolean;
  @Input({required: true}) isShowDisabled!: boolean;


  // @Output() pageSelected = new EventEmitter<number>();
  @Output() documentsShown = new EventEmitter<Array<number>>();
  @Output() documentListClose = new EventEmitter();
  @Output() documentShow = new EventEmitter<number>();
  @Output() documentMaint = new EventEmitter<number>();
  @Output() documentDisable = new EventEmitter<number>();
  @Output() documentEnable = new EventEmitter<number>();

  // documents are extended with ix and sortDate
  extendedDocuments!: Array<DocumentExtended>;

  // we have a paginator - we show documents according to limit
  shownDocuments!: Array<DocumentExtended>;

  // show signal triggers change detection
  public showSignal = signal(0);


  // variables for paginator
  total!: number; // total number of items
  names!: Array<string> // optional - names of each record, length must be 0 or === total
  abbrPlaces = 20; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page

  // we would apply this style to each th element of thhead/tr - but we let header default ...
  // headerStyle = {'background-color': LIGHT_GREY};

  // default sort direction: ascending document number
  sortDirection = 1;

  // we pronounce column which is sorted
  sortStyle = {'background-color': WHITE_SMOKE};
  nrSortStyle = {};
  nameSortStyle = {};
  titleSortStyle = {};
  dateSortStyle = {};
  categoryHeaderStyle = {'background-color': WHITE_SMOKE};

  constructor() {}

  ngOnInit(): void {
    // console.log('document-list init');
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {
      // we  build a new documents object in document.component at every change
      //  and we preserve selected page in sortDocuments via this.document ..
      if (propKey === 'documents') {
        // console.log('documents propkey: ', propKey);
        this.sortDocuments();
      }
      if (propKey === 'thumbnailCount') {
        // console.log('documents propkey: ', propKey);
        this.showSignal.set(this.showSignal() + 1);
        // console.log('thumbnailCount:', this.thumbnailCount);
        // console.log('thumbnailCount - showSignal:', this.showSignal());
      }
    }
  }

  private sortDocuments() {
    if (this.documents?.length > 0) {
      this.extendedDocuments = this.documents.map((_, index) => {
        const {...rest} = _;
        const documentIx = index;
        const sortDate = _.dateTimeOriginal ?? _.documentDate;
        const displayNr = (_.type === DocumentElementType.linked_document ? (_.immichAssetId === '' ? 'L  ' : 'LI ') : '') + _.documentNr.toString();
        const location = GlobalFunctions.getLocation(_.imageLocation);
        const [lat, long, alt] = location;
        let displayLocation = '';
        if (lat === 0 && long === 0 && alt === 0) {
          displayLocation = _.imageLocation?.substring(0,10);
        } else {
          displayLocation = Math.floor(lat).toString() + ',' + Math.floor(long).toString();
        }
        return {...rest, documentIx, sortDate, displayNr, displayLocation};
      });
      /* test the paginator
      for (let ix = 0; ix < 5; ix++) {
        Array.prototype.push.apply(this.filteredDocuments, this.filteredCDocuments);
      }
      */
      this.nrSortStyle = {};
      this.nameSortStyle = [];
      this.titleSortStyle = {};
      this.dateSortStyle = {};
      const sortFields: Array<ISortElement> = this.isDistinctCategory ? [{sortField: 'documentCategory', key: 'documentCategory'}]: [];
      // sort nr or name
      switch (this.sortDirection) {
        // nr ASC
        case 1:
          this.nrSortStyle = this.sortStyle;
          sortFields.push({sortField: 'type', key: 'type'});
          sortFields.push({sortField: 'documentNr', key: 'documentNr'});
          break;
        // nr DESC
        case 2:
          this.nrSortStyle = this.sortStyle;
          sortFields.push({sortField: 'type', key: 'type', order: 'desc' });
          sortFields.push({sortField: 'documentNr', key: 'documentNr', order: 'desc'});
          break;
        // name ASC
        case 3:
          this.nameSortStyle = this.sortStyle;
          sortFields.push({sortField: 'documentName', key: 'documentName' });
          break;
        // name DESC
        case 4:
          this.nameSortStyle = this.sortStyle;
          sortFields.push({sortField: 'documentName', key: 'documentName', order: 'desc'});
          break;
        // title ASC
        case 5:
          this.titleSortStyle = this.sortStyle;
          if (this.isDistinctDirectory) {
            sortFields.push({sortField: 'documentSubDirectory', key: 'documentSubDirectory'});
          }
          sortFields.push({sortField: 'imageTitle', key: 'imageTitle'});
          break;
        // title DESC
        case 6:
          this.titleSortStyle = this.sortStyle;
          if (this.isDistinctDirectory) {
            sortFields.push({sortField: 'documentSubDirectory', key: 'documentSubDirectory', order: 'desc'});
          }
          sortFields.push({sortField: 'imageTitle', key: 'imageTitle', order: 'desc'});
          break;
        // date ASC
        case 7:
          this.dateSortStyle = this.sortStyle;
          sortFields.push({sortField: 'sortDate', key: 'sortDate'});
          break;
        // date DESC
        case 8:
          this.dateSortStyle = this.sortStyle;
          sortFields.push({sortField: 'sortDate', key: 'sortDate', order: 'desc' });
          break;
        default:
          break;
      }
      // sort according to options
      this.extendedDocuments.sort(GlobalFunctions.sortFields(sortFields));
      // paginator - this paginator has names
      // we must reset selectedPage - filter can have been changed ...
      this.selectedPage = 1;
      this.names = this.extendedDocuments.map(_ => (
        this.isDistinctCategory && _.documentCategory > 0
        ? _.documentCategory?.toString() + '-' + (this.documentCategorys[_.documentCategory] ?? '') + '|'
        : ''
        )
        + (
        this.sortDirection <= 2
        ? _.documentNr.toString() + ' '
        : '')
        + _.documentName); // without nr if we sort on names ....
      // paginator - set total records - after setting names, total triggers paginator refresh
      this.total = this.extendedDocuments.length;
      this.limit = this.total > 1000 ? 20 : 10;
      // we set selected page so that document we just created or changed is shown anyway
      const shownId = this.document?.documentId;
      if (shownId > 0) {
        const shownIx  = this.extendedDocuments.findIndex(_ => _.documentId === shownId);
        if (shownIx >= 0) {
          this.selectedPage = Math.floor(shownIx / this.limit) + 1;
        }
      }
      this.shownDocuments = this.extendedDocuments.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
      // we build array of ids for the shown documents
      const ids = this.shownDocuments.reduce((acc: Array<number>, _) => acc.concat(_.documentId), []);
      this.documentsShown.emit(ids);
      // console.log('emitted ids:', ids);
    } else {
      this.extendedDocuments = [];
      this.shownDocuments = [];
      this.total = 0;
    }
    this.showSignal.set(this.showSignal() + 1);
    // console.log('sort - showSignal:', this.showSignal());

  }

  /** --------------------------  public methods -------------------------------------------- */


  /** ------------------------------ header choices ------------------------- */


  // not needed in the moment - list is used only as leading view ....
  public return() {
    this.documentListClose.emit();
  }



  // paginator - set params for actual page
  public onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // this.pageSelected.emit(pageNumber);
    // update content to view new page content
    this.shownDocuments = this.extendedDocuments?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    // we build array of document ids for the shown documents
    const ids = this.shownDocuments?.reduce((acc: Array<number>, _) => acc.concat(_.documentId), []);
    this.documentsShown.emit(ids);
  }


  /** ------------------------------ methods for list elements ------------------------- */

  public sort(direction: number): void {
    this.sortDirection = direction;
    this.sortDocuments();
  }


  // user has pressed "show image" button
  public show(i: number) {
    const id = this.shownDocuments[i].documentId;
    if (id >= 0) this.documentShow.emit(id);

  }

  // user has pressed "update image" button
  public maint(i: number) {
    const id = this.shownDocuments[i].documentId;
    if (id >= 0) this.documentMaint.emit(id);
  }

  // user has pressed "disable image" icon
  public disable(i: number) {
    const id = this.shownDocuments[i].documentId;
    if (id >= 0) this.documentDisable.emit(id);;
  }

  // user has pressed "enable image" icon
  public enable(i: number) {
    const id = this.shownDocuments[i].documentId;
    if (id >= 0) this.documentEnable.emit(id);
  }

}


