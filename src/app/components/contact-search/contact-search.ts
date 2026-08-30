import { NgClass } from '@angular/common';
import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';

import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import { Contact } from '../../_db/contact';
import { ContactService } from '../../_services/contact.service';
import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';

@Component({
  selector: 'dsy-contact-search',
  templateUrl: './contact-search.html',
  styleUrl: './contact-search.css',
  imports: [NgClass]
})


export class ContactSearchComponent implements OnInit {

  public name = 'ContactSearchComponent';

  isLoading = false;
  foundContacts: Contact[] = [];

  @Output() contactSelected = new EventEmitter<Contact>();

  keyup = new EventEmitter<string>();

  constructor(
    private contactService: ContactService,
    private message: MessageService,
    public auth: AuthenticationService) { }

  ngOnInit() {
    this.keyup
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => this.isLoading = true),
      switchMap(searchTerm => {
        const found = this.contactService.searchContacts(searchTerm, this.name);
        // we retrun observable
        return of(found);
      }),
      tap(() => this.isLoading = false),
      )
    .subscribe (contacts => this.foundContacts = contacts);
  }

  selectContact(contact: Contact) {
    this.contactSelected.emit(contact);
    this.foundContacts = [];
  }

  // reset searchTerm in html when clicking outside of input field
  @HostListener('window:click', ['$event.target'])
  onClick(target: any) {
    if (target && (target.id === 'searchContent')
      ) {
        // console.log(`click id is`, target.id);
        // console.log(`parent id is`, target.parentElement.id);
      } else {
        // console.log(`You clicked on`, target);
        this.foundContacts = [];
      }
  }

}



