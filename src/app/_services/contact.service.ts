import { LogPublishersService } from './log-publishers.service';
import { IAuthorization } from '../_interfaces/i-authorization';
import { Injectable } from '@angular/core';

import { ContactRaw } from '../_db/contact-raw';
import { ContactFactory } from '../_db/contact-factory';
import { Contact } from '../_db/contact';

import { LogService } from './log.service';
import { AuthenticationService } from './authentication.service';
import { FetchApiService } from './fetch-api.service';
import { MessageService } from './message.service';

import { MAX_CONTACT_NR } from '../_globals/constants';



/**
 * contact service
 *
 */

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  public name = 'ContactService';


  constructor(
    private logger: LogService,
    public auth: AuthenticationService,
    public fetch: FetchApiService,
    private message: MessageService) {
   }

  /***********************************  private methods **************************************/

  /**
   * getLocalContacts()
   *  get contacts (from local storage)
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param comp name of calling component
   * @returns contacts which are stored in local storage for the session user
   */
    private getLocalContacts(userId: number, comp: string): Array<Contact> {
    let contacts: Array<Contact> = [];
    const session = this.auth.getSession(comp);
    const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
    // we get all elements
    const userData = this.auth.getUserData(localUserId, 'contacts', comp);;
    if (userData && userData.contacts) {
      return userData.contacts;
    } else {
      return contacts;
    }
  }

  /**
   * setLocalContacts()
   *  st contacts (in  local storage)
   * @param userId id of user for which we load data (if 0, it is session usr ...)
   * @param contacts to be set
   * @param comp name of calling component
   * @returns contacts which are stored in local storage for the session user
   */
    private setLocalContacts(userId: number, contacts: Array<Contact>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    const localUserId = userId && userId > 0 ? userId : (session?.userId ?? 0);
    // we get all elements
    const userData = this.auth.getUserData(localUserId, 'contacts', comp);;
    if (userData && userData.contacts) {
      userData.contacts = contacts;
      return this.auth.setUserData(localUserId, 'contacts', userData, comp);
    } else {
      return false;
    }
  }



  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * getContacts()
   *  get contacts (from local storage with user of session)
   * @param comp name of calling component
   * @returns customers which are stored in local storage
  */
  public getContacts(comp: string): Array<Contact> {
    let contacts: Array<Contact> = [];
    const session = this.auth.getSession(comp);
    if (session && session?.userId && session?.userId > 0) {
      contacts = this.getLocalContacts(session.userId, comp);
    }
    return contacts;
  }


  /**
   * search Contacts()
   * @param searchTerm string with nr and/or name of contact
   * @param comp name of calling component
   * @returns contacts with searched nr or name
   */
  public searchContacts(searchTerm: string, comp: string): Array<Contact> {
    const contacts = this.getContacts(comp);
    return contacts.filter(_ => Number(_.displayNr) === Number(searchTerm) || _.companyName?.startsWith(searchTerm));
  }

  /**
   * get contact()
   * @param contactId id of contact
   * @param comp name of calling component
   * @returns contact, if contact with this id is stored in local storage, else returns null
   */
   public getContact(contactId: number, comp: string): Contact | null {
    const contacts = this.getContacts(comp);
    if (contacts) {
      const contact = contacts.find(_ => _.contactId === contactId);
      if (contact) {
        return contact;
      }
    }
    return null;
  }

  /**
   * get contactNr()
   * @param contactNr nr of contact
   * @param comp name of calling component
   * @returns contact, if contact with this id is stored in local storage, else returns null
   */
  public getContactNr(contactNr: number, comp: string): Contact | null {
    const contacts = this.getContacts(comp);
    if (contacts) {
      const contact = contacts.find(_ => _.contactNr === contactNr);
      if (contact) {
        return contact;
      }
    }
    return null;
  }

   /**
   * check contact -  same  GET as getContact, delivers true, if a contact with
   *  required identifiers already exists
   * @param contactNr nr of contact
   * @param comp name of calling component
   * @returns  true if nr exists for given type
   */
   public checkContactNr(contactNr: number, comp: string): boolean {
    const contacts = this.getContacts(comp);
    if (contacts?.length > 0) {
      const filteredContacts = contacts.filter(_ =>  _.contactNr  === contactNr);
      if (filteredContacts?.length > 0) {
        return true;
      }
    }
   return false;
  }

  /**
   * getContactLatestClone
   *  delivers contacts which have been cloned
   * @param contactName identifier
   * @param comp name of component for logging
   * @returns contact or null
   */
  public getContactLatestClone(contactName: string, comp: string): Contact | null  {
    const contacts = this.getContacts(comp);
    if (contacts?.length > 0) {
      return contacts.filter(_ => _.companyName.startsWith(contactName)).reduce((a, b) => a.companyName > b.companyName ? a : b);
    } else {
      return null;
    }
  }

  /**
   * setContacts()
   *  set contacts at local storage
   * @param contacts narray of contacts
   * @param comp name of calling component
   */
  public setContacts(contacts: Array<Contact>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    if (contacts && session && session?.userId && session?.userId > 0) {
      return this.setLocalContacts(session.userId, contacts, comp);
    } else {
      return false;
    }
  }


  /**
     * setContact()
     *  set contact at server by id
     *  setting contact is protected via etag - calling component must provide etag value on which updates where made ..
     * @param contact new contact content - in case of contactId is missing or === 0, contact is inserted
     * @param comp name of calling component
     * @returns id of set contact or 0
     */
  public setContact(contact: Contact, comp: string): number {
    let isSetOk = false;
    const contacts = this.getContacts(comp);
    const session = this.auth.getSession(comp);
    let ix = -1;
    if (contacts?.length > 0) {
      ix = contacts.findIndex(_ => _.contactId === contact.contactId);
    }
    if (contact) {
      if (contact.contactId > 0 && ix >= 0) {
        contact.updated = new Date();
        contact.updatedBy = session?.userName ?? '';
        contact.releaseUpdated = session?.releaseUpdated ?? 0;
        contact.version++;
        contacts[ix] = contact;
      } else {
        let lastContactId = contacts.length > 0
        ? contacts.reduce((a,b) => a.contactId > b.contactId ? a : b).contactId
        : 0;
        lastContactId++;
        contact.contactId = lastContactId;
        contact.created = new Date();
        contact.updatedBy = session?.userName ?? '';
        contact.releaseCreated = session?.releaseUpdated ?? 0;
        contact.version = 0;
        contacts.push(contact);
      }
      isSetOk = this.setContacts(contacts, comp);
    }
    if (isSetOk) {
      return contact.contactId;
    } else {
      return 0;
    }
  }

  /**
   * setContactStatus()
   *  set contact status
   * @param contactId  contactId to set
   * @param status   to be set
   * @param comp name of calling component
   * @returns true if status set
   */
  public setContactStatus(contactId: number, status: number, comp: string): boolean {
    let contact = this.getContact(contactId, comp);
    if (contact) {
      contact.status = status;
      const isSetOk = this.setContact(contact,comp);
      if (isSetOk) {
        return true;
      }
    }
    // contact element is not found or could not be updated
    return false;
  }


  /**
   * setContactDisabled()
   *  set contact disabled
   * @param contactId  contactId to disable
   * @param comp name of calling component
   * @returns true if disabled
   */
  public setContactDisabled(contactId: number,  comp: string): boolean {
    let contact = this.getContact(contactId, comp);
    const isDeleteable = true;
    if (contact && isDeleteable) {
      contact.status = 90;
      const isSetOk = this.setContact(contact,  comp);
      if (isSetOk) {
        return true;
      }
    }
    // contact element is not found or could not be updated
    return false;
  }

  /**
   * createContacts()
   *  creates an array of contacts (usually got via import)
   * @param contacts Array of contacts
   * @param comp name of calling component
   * @returns trur if all can be stored, false if not (in this case server contacts remain unchaned)
   */
  public createContacts(contacts: Array<Contact>, comp: string): boolean {
    const session = this.auth.getSession(comp);
    let legacyContacts: Array<Contact> = [];

    legacyContacts = this.getContacts(comp);
    // build contactId  as max of id of existing contacts
    let lastContactId = legacyContacts?.length > 0
      ? legacyContacts.reduce((a,b) => a.contactId > b.contactId ? a : b).contactId
      : 0;;
    // build contactNr  as max of nr of existing contacts
    let lastContactNr = legacyContacts?.length > 0
      ? legacyContacts.reduce((a,b) => a.contactNr > b.contactNr ? a : b).contactNr
      : 0;;
    for (const contact of contacts) {
      let ix = -1;
      if (legacyContacts?.length > 0) {
        ix = legacyContacts.findIndex(_ => _.contactNr === contact.contactNr
          || (_.contactName === contact.contactName && _.contactFirstName === contact.contactFirstName));
      }
      if (ix >= 0 && legacyContacts[ix].status < 9) {
        contact.contactId = legacyContacts[ix].contactId;
        contact.created = legacyContacts[ix].created;
        contact.createdBy = legacyContacts[ix].createdBy;
        contact.releaseCreated = legacyContacts[ix].releaseCreated;
        contact.updated = new Date();
        contact.updatedBy = session?.userName ?? '';
        contact.releaseUpdated = session?.releaseUpdated ?? 0;
        contact.version = legacyContacts[ix].version++;
        // TODO set fields only if not empty ....
        legacyContacts[ix] = contact;
      } else {
        lastContactId++;
        if (!contact.contactNr || contact.contactNr === 0) {
          lastContactNr++;
          contact.contactNr = lastContactNr;
        }
        contact.contactId = lastContactId;
        contact.created = new Date();
        contact.createdBy = session?.userName ?? '';
        contact.releaseCreated = session?.releaseUpdated ?? 0;
        contact.updated = null;
        contact.updatedBy = '';
        contact.releaseUpdated = 0;
        contact.version = 0;
        legacyContacts.push(contact);
      }
    }
    // we now store  all contacts
    if (lastContactId > 0) {
      const isStored = this.setContacts(legacyContacts, comp);
      if (isStored) {
        return true;
      }
    }

    return false;
  }



  /* *****************************************  local file functions start here **************** */


  /***********************************  private methods **************************************/

  private async getContactsFromFile(file: File, comp: string): Promise<Array<Contact> | null> {
    const fileString = await this.getFileAsDataURL(file, comp);
    const rawContacts: Array<ContactRaw> = JSON.parse(fileString);
    for (const raw of rawContacts) {
      // console.log('name: ', raw.name);
      // console.log('nr: ', raw.nr);
      // console.log('contactNr: ',   raw.contactNr);
      // we allow field nr in json - which is not defined in contact ...
      if (Number(raw.nr) > 0 && !(Number(raw.contactNr) > 0)) raw.contactNr = raw.nr ?? 0;

    }
    if (rawContacts?.length > 0) {
      // to assure that json file which are ok, but have "another" data array we check name, id, nr
      const filteredContacts = rawContacts.filter(_ => (_.companyName && _.companyName !== '')
      || Number(_.contactNr) > 0
      );
      return filteredContacts.map(rawContact => ContactFactory.fromObject(rawContact));
    } else {
      return null;
    }
  }

  /**
   * getFileAsDataURL delivers file as data url
   * @param file local file
   * @param comp component name
   */
   private getFileAsDataURL(file: File, comp: string): Promise<string> {
    const op = 'read file: ';
    const url = file.name;
    return this.fetch.getReadRequest(file)
      .catch((error: any) : any => {
        this.logger.error(this.auth.getSession(this.name), this.name, `${op} from: ${url} failed: ${error.message}`);
        this.message.info(this.name + `: ${op} from: ${url} failed: ${error.message}`);
        return null;
      });
  }


}
