import { Component, Inject, LOCALE_ID, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { StyleFactory } from '../../_globals/style-factory';
import { GlobalFunctions } from '../../_globals/global-functions';

import { ContactFactory } from '../../_db/contact-factory';
import { Contact } from '../../_db/contact';
import { Session } from '../../_db/session';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ContactService } from '../../_services/contact.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { ContactFormViewComponent } from '../contact-form-view/contact-form-view';
import { ContactListViewComponent } from '../contact-list-view/contact-list-view';

@Component({
  selector: 'dsy-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  imports: [ContactFormViewComponent, ContactListViewComponent]
})
export class ContactComponent {

  public name = 'ContactComponent';

  // contact for maintenance or show form
  public contact!: Contact;
  // component usage can be: 'form', 'list'
  private contactComponentUsage: string | undefined;
  // isMaint true - contact-list and contact-form should allow data maintenance
  public isMaint: boolean = false;
  // isCreate true - in case of usage 'list'  contact-list should allow to create a new contact
  public isCreate: boolean = false;


  // can contact nr be changed
  isContactNrChangeable: boolean = false;


  // session is used in some sub-views and MUST NOT be used in this component (use this.auth.getSession instead)
  public sessionForViews!: Session;

  // db texts
  public contacttxt: { [key: string]: string } = {};

  // contacts from db
  public contacts: Array<Contact> = [];
  public contactsLoadCounter = 0;

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // isShowForm is true to show form
  public isShowForm: boolean = false;

  // isShowList is true to show list of contacts or child contacts
  public isShowList: boolean = false;

  // defines action on contact form-view
  public formAction!: string;

  constructor(@Inject(LOCALE_ID) public locale: string,
  private route: ActivatedRoute,
  private router: Router,
  private logger: LogService,
  private message: MessageService,
  private contactService: ContactService,
  public auth: AuthenticationService) { }

async ngOnInit() {
  // maintenance of contact
  this.contactComponentUsage = 'list';
  this.isMaint = true;
  this.isCreate = true;

  // activation is done here - we have a component called by routing ...
  switch (this.contactComponentUsage) {
    case 'form':
      // in case of leading form (here: only at mandant) showForm is set after getting mandant data ...
      this.isShowForm = false;
      this.isShowList = false;
      this.formAction = this.isCreate ? 'new' : this.isMaint && this.contact ? 'maint' : 'show'
      break;

    case 'list':
      this.isShowForm = false;
      this.isShowList = true;
      this.formAction = '';
      break;

    default:
      break;
  }
  await this.sessionActivate();
}



// check session at init & before submitting any http transaction in this component
private async sessionActivate() {
  await this.auth.activateSession(this.name);
  const isSessionActive = this.auth.isSessionActive();
  const session = this.auth.getSession(this.name);
  if (session && isSessionActive) {
    this.sessionForViews  = session;
    this.loadDbTexts();
    this.getContacts();
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
  const contact = ContactFactory.empty();
  this.contacttxt = GlobalFunctions.objText(contact,
    'Contact', this.auth.systemTexts, language,  this.name);
}


  /**
   * getContacts()
   *  delivers all active contacts
   */
  private getContacts() {
    this.refreshSignal.set(0);
    let contacts: Array<Contact>;
    const session = this.auth.getSession(this.name);
    contacts = this.contactService.getContacts(this.name);
    // we take also disabled contacts - filtering is done by list-view
    if (contacts?.length > 0) {
      for (const contact of contacts) {
        // we build style with color
        const style = StyleFactory.getBgColorStyle(contact.contactColor);
        contact.style = style;
      }
      // sort is done by list-view
      // this.contacts = contacts.sort((a, b) => a.contactNr - b.contactNr);
      this.contacts = contacts;
    } else {
      this.contacts = [];
    }
    this.contactsLoadCounter++;
    this.refreshSignal.set(1);
  }


  /** --------------------------  public methods -------------------------------------------- */


  /** ------------------------------ contact-list-view ------------------------- */

  // not used in the moment - lista s leading view is visible when component is active ,,,
  public closeContactList() {
    this.isShowList = false;
  }

  // if insert is triggered in (leading) list, here we activate form-view
  public insertContact() {
    this.formAction = 'new';
    this.contact = ContactFactory.empty();
    // contacts have type 2 ...
    this.contact.type = 2;
    this.isShowForm = true;
    this.isShowList = false;
  }


  // if show is triggered in (leading) list, here we activate form-view
  public showContact(i: number) {
    this.formAction = 'show';
    this.contact = this.contacts[i];
    this.isShowForm = true;
    this.isShowList = false;
  }

  // if update is triggered in (leading) list, here we activate form-view
  public maintContact(i: number) {
    this.formAction = 'maint';
    this.contact = this.contacts[i];
    const session = this.auth.getSession(this.name);
    this.isContactNrChangeable = true;
    // in the moment there is no reason why contact should not by changeable ...
    this.isShowForm = true;
    this.isShowList = false;
  }


  public disableContact(i: number) {
    const contact = this.contacts[i];
    const session = this.auth.getSession(this.name);
    if (session && contact && contact.contactId > 0) {
      // check deleteable
      // const isDeleteable = this.contactService.isContactDeleteable(contactId, this.name);
      let isDeleteable = true;
      if (isDeleteable) {
        if (confirm(this.auth.txt['contact_disable'] + '?')) {
          const isDisabled = this.contactService.setContactDisabled(contact.contactId, this.name);
          if (isDisabled) {
            this.getContacts();
          } else {
            alert('local storage error - file reload');
            this.getContacts();
          }
        }
      } else {
        alert(this.auth.txt['disable_not_possible']);
      }
    }
  }


  public enableContact(i: number) {
    const contact = this.contacts[i];
    const session = this.auth.getSession(this.name);
    if (session && contact && contact.contactId > 0) {
      if (confirm(this.auth.txt['contact_enable'] + '?')) {
        const isEnabled = this.contactService.setContactStatus(contact.contactId, 0, this.name);
        if (isEnabled) {
          this.getContacts();
        } else {
          alert('storage error - file reload');
          this.getContacts();
        }
      }
    }
  }

  public selectContact(i: number) {
    let contact = this.contacts[i];
    // we build a contact at server if contact has no contactId yet
    if (contact && contact.contactId === 0) {
      const newId = this.contactService.setContact(contact, this.name);
      if (newId > 0) {
        contact = this.contactService.getContact(newId, this.name) ?? contact;
      } else if (newId === 0) {
        alert('communication error');
      } else if (newId === -1) {
        alert('storage error');
        this.getContacts();
      }
    }
  }



  /** ------------------------------ contact-form-view ------------------------- */

  // contact data were entered in form-view, we proceed the updates here
  public contactUpdate(contact: Contact) {
    if (contact && contact.displayName !== '' && contact.contactId > 0) {
      const updatedId = this.contactService.setContact(contact, this.name);
      if (updatedId > 0) {
        // with getContact we get updated contact ...
        this.contact = this.contactService.getContact(updatedId, this.name) ?? this.contact;

      } else if (updatedId === 0) {
        alert('communication error');
      } else if (updatedId === -1) {
        alert('storage error');
        this.closeContactForm();
      }
    }
  }


  // contact was created in form-view, we proceed the updates here
  public contactCreate(contact: Contact) {
    let isCreated = false;
    let contactId: number;
    if (contact && contact.displayName !== '') {
      const session = this.auth.getSession(this.name);
      contact.contactId = 0;
      contact.type = 1;
      contactId = this.contactService.setContact(contact, this.name);
      if (contactId > 0) {
        // we set this.contact to the created (or cloned) contact
        this.contact = this.contactService.getContact(contactId, this.name) ?? this.contact;
        if (this.contact) {
          isCreated = true;
          this.formAction = 'maint';
        }
      } else if (contactId === 0) {
        alert('communication error');
      } else if (contactId === -1) {
        alert('storage error');
      }
      if (!isCreated) {
        // should not happen
        this.contact = ContactFactory.empty();
        const op = 'contact create';
        const message = 'contact: ' + contact.displayName + ' not created';
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} failed: ${message}`);
        this.message.show(this.name + `: ${op} failed: ${message}`);
        this.closeContactForm();
      }
    }
  }

  public closeContactForm() {
    if (this.contactComponentUsage === 'form') {
      // nothing - in the moment  this component is selected only by routing, there is no close action ....
      // (in case of mandant; where the usage is 'form', we do not allow close [Symbol]..)
    } else {
      this.isShowForm = false;
      this.getContacts();
      this.isShowList = true;
      this.formAction = '';
    }
  }

}

