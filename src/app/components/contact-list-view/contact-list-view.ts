import { Component, EventEmitter, Input, Output, signal, SimpleChange } from '@angular/core';
import { NgStyle, SlicePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';

import { ContactSearchComponent } from '../contact-search/contact-search';
import { PaginatorComponent } from '../paginator/paginator';


class ContactExtended extends Contact{contactIx!: number};
@Component({
  selector: 'dsy-contact-list-view',
  templateUrl: './contact-list-view.html',
  styleUrl: './contact-list-view.css',
  imports: [ContactSearchComponent, NgStyle, PaginatorComponent, ReactiveFormsModule, FormsModule, SlicePipe]
})
export class ContactListViewComponent {

  public name = 'ContactListViewComponent';

  @Input({required: true}) session!: Session;
  @Input({required: true}) contact!: Contact;
  @Input({required: true}) contacts!: Array<Contact>;
  @Input({required: true}) contactsLoadCounter!: number;
  // isMaint - true if updating is allowed
  @Input({required: true}) isMaint!: boolean;
  // isMaint - true if creating of new contact is allowed
  @Input({required: true}) isCreate!: boolean;
  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) contacttxt!: { [key: string]: string };

  @Output() contactListClose = new EventEmitter();
  @Output() contactInsert = new EventEmitter();
  @Output() contactShow = new EventEmitter<number>();
  @Output() contactMaint = new EventEmitter<number>();
  @Output() contactDisable = new EventEmitter<number>();
  @Output() contactEnable = new EventEmitter<number>();


  // contacts can be filtered by user
  filteredContacts: Array<ContactExtended> = [];

  contactsReadySignal = signal(0);

  // we have a paginator - we show contacts according to limit
  shownContacts: Array<ContactExtended> = [];

  contactFilter = '';

  sortDirection = 0;

  // special function: if true, we show only disabled and can re-enable them
  isShowDisabled = false;

  // variables for paginator
  total: number = 0; // total number of items
  names: Array<string> = [] // optional - names of each record, length must be 0 or === total
  abbrPlaces = 5; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page


  constructor() { }

  ngOnInit(): void {

  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {

      // we need contactLoadCounter .... we do not want to build a new contacts object in contact.component at every change ...
      if (propKey === 'contacts' || propKey === 'contactsLoadCounter') {
        this.filterContacts();
      }
    }
  }

  private filterContacts() {

    // we have a paginator - we reset shown elements first ...
    this.shownContacts = [];
    this.total = 0;
    this.contactsReadySignal.set(0);

    if (this.contacts.length > 0) {
      this.filteredContacts = this.contacts.map((_, index) => {
        const {...rest} = _;
        const contactIx = index;
        return {...rest, contactIx};
      });
      if (this.contactFilter.length > 0) {
        this.filteredContacts = this.filteredContacts.filter(_ => _.displayName?.includes(this.contactFilter)
        || _.contactNr?.toString().startsWith(this.contactFilter)
        || _.companyName?.startsWith(this.contactFilter));
      }
      // if isShowDisabled is set true, we show only the disabled
      if (this.isShowDisabled) {
        this.filteredContacts = this.filteredContacts.filter(_ => _.status === 90);
      } else {
        this.filteredContacts = this.filteredContacts.filter(_ => _.status === 0);
      }

      if (this.filteredContacts.length > 0) {

        /* test the paginator
        for (let ix = 0; ix < 5; ix++) {
          Array.prototype.push.apply(this.filteredContacts, this.filteredContacts);
        }
        */


        // sort nr or name - contact which is selected is shown as first element
        switch (this.sortDirection) {
          // nr ASC
          case 1:
            this.filteredContacts.sort((a, b) => a.contactNr - b.contactNr);
            break;
          // nr DESC
          case 2:
            this.filteredContacts.sort((a, b) => b.contactNr - a.contactNr);
            break;
          // name ASC
          case 3:
            this.filteredContacts.sort((a, b) => a.displayName  <  b.displayName ? -1 : 0);
            break;
          // name DESC
          case 4:
            this.filteredContacts.sort((a, b) =>  b.displayName < a.displayName  ? -1 : 0);
            break;
            // companyName ASC
          case 5:
             this.filteredContacts.sort((a, b) => a.companyName  <  b.companyName ? -1 : 0);
            break;
            // companyName DESC
          case 6:
            this.filteredContacts.sort((a, b) =>  b.companyName < a.companyName  ? -1 : 0);
            break;
          default:
            this.filteredContacts.sort((a, b) => a.contactNr - b.contactNr);
            break;
        }

        // paginator - this paginator has names
        this.selectedPage = 1;
        // without nr if we sort on names ....
        this.names = this.filteredContacts.map(_ => (this.sortDirection <= 2 ? _.contactNr.toString() + ' ' : '') + _.displayName);
        // paginator - set total records - after setting names, total triggers paginator refresh
        this.total = this.filteredContacts.length;
        this.limit = this.total > 1000 ? 20 : 10;
        this.shownContacts = this.filteredContacts.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
      }
    }
    this.contactsReadySignal.set(1);

  }




  /** --------------------------  public methods -------------------------------------------- */


  // not needed in the moment - list is used only as leading view ....
  public return() {
    this.contactListClose.emit();
  }

  // user has pressed "insert contact" button
  public insert() {
    this.contactInsert.emit();
  }


  // user has pressed "show contact" button
  public show(i: number) {
    const ix = this.shownContacts[i].contactIx;
    if (ix >= 0) this.contactShow.emit(ix);
  }

  // user has pressed "show contact" button
  public showSearched(contact: Contact) {
    const ix = this.contacts.findIndex(_ => _.contactId === contact.contactId);
    if (ix >= 0) this.contactShow.emit(ix);
  }

  public setShowDisabled(event: any): void {
    this.isShowDisabled = event.target.checked;
    this.filterContacts();
  }


  // up to now we use no extra button to start filter operation
  public setFilter(filterTerm: string) {
    this.contactFilter = filterTerm;
    this.filterContacts();
    // console.log('filter: ', filterTerm);
  }

  // paginator - set params for actual page
  public onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // update content to view new page content
    this.shownContacts = this.filteredContacts?.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }

  public sort(direction: number): void {
    this.sortDirection = direction;
    this.filterContacts();
  }


  // user has pressed "update contact" button
  public maint(i: number) {
    const ix = this.shownContacts[i].contactIx;
    if (ix >= 0) this.contactMaint.emit(ix);
  }

  // user has pressed "disable contact" icon
  public disable(i: number) {
    const ix = this.shownContacts[i].contactIx;
    if (ix >= 0) this.contactDisable.emit(ix);
  }

  // user has pressed "enable contact" icon
  public enable(i: number) {
    const ix = this.shownContacts[i].contactIx;
    if (ix >= 0) this.contactEnable.emit(ix);
  }


}


