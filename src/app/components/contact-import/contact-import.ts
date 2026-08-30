import { DecimalPipe, NgStyle, NgTemplateOutlet, SlicePipe } from '@angular/common';
import { Component, Inject, LOCALE_ID, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { GlobalFunctions } from '../../_globals/global-functions';
import { VcfFunctions } from '../../_globals/vcf-functions';
import { ContactFactory } from '../../_db/contact-factory';
import { Contact } from '../../_db/contact';
import { Session } from '../../_db/session';

import { FetchApiService } from '../../_services/fetch-api.service';
import { ContactService } from '../../_services/contact.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { AuthenticationService } from '../../_services/authentication.service';

import { PaginatorComponent } from '../paginator/paginator';
import { ISortElement } from '../../_interfaces/i-sort-element';

/**
 * this is a contact card (.vcf) import
 *
 * we use vcfFunctions.vcfToJson() in prepareImport() - getting contacts source
 *
 * imported contacts are carried through 3 steps (source - checked - import ready) and set a contacts status:
 *  contacts.status >= 90 ? 'rejected' : contacts.status >= 9 ? 'duplicate' :  contacts.status > 0 ? 'corrected, accepted' : ''
 *
 * all import ready contactss with status < 9 are imported, status is set to 0
 *
 */

@Component({
  selector: 'dsy-contact-import',
  templateUrl: './contact-import.html',
  styleUrl: './contact-import.css',
    imports: [FormsModule, NgTemplateOutlet, NgStyle, PaginatorComponent, SlicePipe, DecimalPipe]
})
export class ContactImportComponent implements OnInit {

  public name = 'ContactImportComponent';

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loaded
  public refreshCounterSignal = signal(0);
  public resetableSignal = signal(0);

  // we need session in html template
  session!: Session;


  // fileString contails file as string
  fileString!: string;
  fileSize!: number;

  // imported contactss from file system (step 1)
  sourceContacts!: Array<Contact>;
  // sorted and checked contacts (step 2)
  checkedContacts!: Array<Contact>;
  // contacts for import (step 3)
  importContacts!: Array<Contact>;


  // contactss according to import step 1- 3 as base for showContacts
  contacts!: Array<Contact>;
  // shown contacts
  shownContacts: Array<Contact> = [];
  // first contactNr of imported contacts
  startContactNr = 1;


  custtxt: { [key: string]: string } = {};

  // we got at least 1 valid vcf file
  validVcfFileSignal = signal(0);
  error: any;

  encodedUri!: string;
  fileName!: string;
  fileType!: string;
  extendedFileName!: string;

  recordCount!: number;
  errorCount!: number;
  accepted!: number;
  rejected!: number;
  noDuplicates!: number;
  duplicates!: number;
  importCount = 0;

  isUpdateFileName = false;
  isUpdateFileType = false;
  isUpdateExtendedFileName = false;
  isUploadDirectory = false;

  sourceReadySignal = signal(0);
  sourceCheckedSignal = signal(0);
  importReadySignal = signal(0);
  importFinishedSignal = signal(0);

  isShowRemarked = false;

  // variables for paginator
  total: number = 0; // total number of items
  names: Array<string> = []; // optional - names of each record, length must be 0 or === total
  abbrPlaces = 20; // optional - in case of names: how much letters should abrreviated name have in tooltip
  limit: number = 10; // how many items are we showing in each page
  selectedPage: number = 1; // the current selected page


  constructor(@Inject(LOCALE_ID) public locale: string,
  private fetch: FetchApiService,
  private contactService: ContactService,
  private route: ActivatedRoute,
  private router: Router,
  private logger: LogService,
  private message: MessageService,
  public auth: AuthenticationService) { }

  async ngOnInit() {
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    const session = this.auth.getSession(this.name);
    if (session && this.auth.isSessionActive()) {
      this.session = session;
      this.loadDbTexts();
      this.resetImport();
      this.refreshCounterSignal.set(this.refreshCounterSignal() + 1);
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
    const contact = ContactFactory.empty(); // just for dbtxt
    this.custtxt = GlobalFunctions.objText(contact,
      'Contact', this.auth.systemTexts, language,  this.name);
  }


  private prepareShownContacts(contacts: Array<Contact>): void {
    // paginator - this paginator has names
    this.selectedPage = 1;
    if (contacts?.length >= 0)  {
      this.contacts = contacts.filter(_ => this.isShowRemarked ? (_.type < 0 || _.status > 0) : true);
      // without nr if we sort on names ....
      this.names = this.contacts.map(_ => _.companyName.substring(0, 12));
      // paginator - set total records - after setting names, total triggers paginator refresh
      this.total = this.contacts.length;
      this.limit = this.total > 1000 ? 20 : 10;
      this.shownContacts = this.contacts.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
    }

  }



  /** --------------------------  public methods -------------------------------------------- */

  resetImport() {
    // default filename (can not be set in input type file) and fileType
    this.fileName = '*';
    this.fileType = 'vcf';
    this.extendedFileName = '';
    this.validVcfFileSignal.set(0);
    this.error = undefined;
    this.isUpdateExtendedFileName = false;
    this.isUpdateFileName = false;
    this.isUpdateFileType = false;
    this.isUploadDirectory = false;

    this.sourceReadySignal.set(0);
    this.sourceCheckedSignal.set(0);
    this.importReadySignal.set(0);
    this.importFinishedSignal.set(0);

    this.isShowRemarked = false;

    this.resetableSignal.set(0);
  }

  // we accept more thany one contacts file
  async fileAdd(files: FileList) {
    // console.log('files: ', files);
    if (files === undefined || files?.length === 0) {
      // no op
    } else  {
      this.validVcfFileSignal.set(1);
      this.fileString = '';
      this.fileSize = 0;
      for (let index = 0; index < files.length; index++) {
        // for each  file in selection
        // console.log('file size: ', files[0].size);
        const fileString = await this.fetch.getReadRequest(files[index])
        .catch((error: any) : any => {
          this.error = error;
          this.validVcfFileSignal.set(0);
          this.resetableSignal.set(1);
          return null;
        });
        if (this.validVcfFileSignal() === 1) {
          try {
            // here we could use an external vcf checker ...
            const isVcfHeader = fileString.toUpperCase().startsWith('BEGIN:VCARD');
            if (!isVcfHeader) throw new Error('vcf header missing');
            const isIcsFooter = fileString.trimEnd().toUpperCase().endsWith('END:VCARD');
            if (!isVcfHeader) throw new Error('vcf footer missing');
          } catch (error) {
            //Error - vcf file is not okay
            this.error = files[index].name + ': ' + error;
            this.validVcfFileSignal.set(0);
            this.resetableSignal.set(1);
          }
          if (this.validVcfFileSignal() === 1) {
            // console.log('fileString: ', fileString);
            this.fileSize += files[index].size;
            this.fileString += fileString;
          }
        }

      }
      if (this.validVcfFileSignal() === 1) {
        // first (or only) and last file name is remembered ...
        this.extendedFileName = files[0].name + (files.length > 1 ? (' - ' + files[files.length - 1 ].name) : '');
      }
    }
    this.refreshCounterSignal.set(this.refreshCounterSignal() + 1);
  }

  setUpdateExtendedFileName() {
    this.isUpdateExtendedFileName = !this.isUpdateExtendedFileName;
  }

  setUpdateFileName() {
    this.isUpdateFileName = true;
  }

  updateFileName(name: string) {
    this.fileName = name;
    this.isUpdateFileName = false;
    this.resetableSignal.set(1);
  }

  setUpdateFileType() {
    this.isUpdateFileType = true;
  }

  updateFileType(type: string) {
    this.fileType = type === '' ? '*' : type;
    this.isUpdateFileType = false;
    this.resetableSignal.set(1);
  }

  public setUploadDirectory(event: any): void {
    this.isUploadDirectory = event.target.checked;
  }

  // step 1
  public prepareImport(nr: string) {
    this.startContactNr = Number(nr);
    this.validVcfFileSignal.set(0);
    this.recordCount = 0;
    this.errorCount = 0;
    // here we parse data and getcontacts
    const vcfContacts = VcfFunctions.vcfToJson(this.fileString);
    let contactNr = this.startContactNr;
    if (vcfContacts && vcfContacts?.length > 0) {
      this.sourceContacts = [];
      for (const vcfContact of vcfContacts) {
        let contact = ContactFactory.empty();
        contact.message = '';
        if (vcfContact.formattedName && vcfContact.formattedName !== '') {
          contact.displayName = vcfContact.formattedName;
        } else {
          contact.status += 1;
          contact.message += 'formatted name missing ';
        }
        if (vcfContact.name && vcfContact.name?.value !== '') {
          contact.contactName = vcfContact.name.elementArray[0];
          contact.contactFirstName = vcfContact.name.elementArray[1];
          contact.contactSalutation = vcfContact.name.elementArray[3];
          contact.nameScnd = vcfContact.name.elementArray[2];
          contact.companyName = (contact.contactName !== '' ? contact.contactName + ' ' : '') + contact.contactFirstName;
          if(contact.contactName === '') {
            contact.status += 1;
            contact.message += 'name missing ';
          }
        } else {
          contact.status = 9;
          contact.message += 'no name entries - rejected ';
        }
        if (vcfContact.address?.length > 0 && vcfContact.address[0].elementArray?.length > 0) {
          contact.street = vcfContact.address[0].elementArray[2];
          contact.city = vcfContact.address[0].elementArray[3];
          const plz: string = vcfContact.address[0].elementArray[5].toString();
          contact.plz = Number(plz.startsWith('A-') ? plz.substring(2) : plz);
          contact.country = vcfContact.address[0].elementArray[6];
        }
        if (vcfContact.address?.length > 1) {
          contact.status += 1;
          contact.message += 'more than 1 address records ';
        }
        if (vcfContact.email?.length > 0) {
          contact.contactEmail = vcfContact.email[0].value;
          if (vcfContact.email?.length > 1) {
            contact.contactEmailScnd = vcfContact.email[1].value;
            if (vcfContact.email?.length > 2) {
              contact.status += 1;
              contact.message += 'more than 2 email records ';
            }
          }
        }
        if (vcfContact.tel?.length > 0) {
          contact.contactTel = vcfContact.tel[0].value;
          if (vcfContact.tel?.length > 1) {
            contact.contactTelScnd = vcfContact.tel[1].value;
            if (vcfContact.tel.length > 2) {
              contact.status += 1;
              contact.message += 'more than 2 tel records ';
            }
          }
        }

        contact.contactFunction = vcfContact.title;
        contact.contactBirthday = vcfContact.birthday;

        contact.longName = vcfContact.organization;
        contact.website = vcfContact.url;
        contact.companyUid = vcfContact.uid;
        contact.companyNote = vcfContact.note;
        contact.contactNr = contactNr;
        contact.type = 2;

        // contact fields are excat the imported values !!!
        contact.name = vcfContact.name;
        contact.formattedName = vcfContact.formattedName;
        contact.nickName = vcfContact.nickName;
        contact.email = vcfContact.email;
        contact.address = vcfContact.address;
        contact.organization = vcfContact.organization;
        contact.title = vcfContact.title;
        contact.categories = vcfContact.categories;
        contact.url = vcfContact.url;
        contact.note = vcfContact.note;
        contact.birthday = vcfContact.birthday;
        contact.photo = vcfContact.photo;
        contact.uid = vcfContact.uid;
        contact.vcardVersion = vcfContact.version;
        contact.vcardProdId = vcfContact.vcardProdId;
        contact.undefinedKey = vcfContact.undefinedKey;
        if (contact.undefinedKey?.length > 0) {
          contact.status += 1;
          contact.message += 'undefined vcard key: ' + contact.undefinedKey.map(_  => _.key).toString();
        }
        this.sourceContacts.push(contact);
        contactNr++
      }
      if (this.sourceContacts.length > 0) {
        /* test the paginator
        for (let ix = 0; ix < 5; ix++) {
          Array.prototype.push.apply(this.filteredDocuments, this.filteredCDocuments);
        }
        */
        //  we sort on names to see duplicates together  ...
        const sortFields: Array<ISortElement> =  [{sortField: 'name', key: 'name'}];
        // sort according to options
        this.sourceContacts.sort(GlobalFunctions.sortFields(sortFields));
        this.prepareShownContacts(this.sourceContacts);

        this.recordCount = this.sourceContacts.length;
        this.errorCount = this.sourceContacts.filter(_ => _.status >= 9).length;
        this.rejected = 0;
        this.validVcfFileSignal.set(1);
      }
    }
    this.sourceReadySignal.set(1);
    this.resetableSignal.set(1);
  }

  public toggleRemarked(event: any): void  {
    this.isShowRemarked = event.target.checked;
    this.prepareShownContacts(this.importReadySignal() === 1 ? this.importContacts : this.sourceCheckedSignal() === 1 ? this.checkedContacts : this.sourceContacts);
  }

  // step 1 => step 2
  // we check source contacts if no overlap in source and build checked contacts
  // this.sourceContacts MUST be sorted on formatted name  ASC
  public setImportSourceChecked() {
    // we build contacts which must be not overlapping
    this.checkedContacts = [];
    const validContacts = this.sourceContacts.filter (_ => _.status < 9);
    for (let contact of validContacts) {
      contact.message = '';
      if (this.sourceContacts.filter(cust => cust.contactName === contact.contactName
        && cust.contactFirstName === contact.contactFirstName
        && cust.contactNr !== contact.contactNr
        ).length > 0) {
        contact.message += 'duplicate name and duplicate first name ';
        contact.status += 9;
      } else  if (this.sourceContacts.filter(cust => cust.contactName === contact.contactName
        && cust.contactFirstName !== contact.contactFirstName
        && cust.contactNr !== contact.contactNr
        ).length > 0) {
        contact.message += 'duplicate name ';
        contact.status += 1;
      }
      // rejected contacts are taken to show them, rejected at start of nesxt step cause of status ...
      this.checkedContacts.push(GlobalFunctions.clone(contact));
    }
    this.accepted = this.checkedContacts.filter(_ => _.status > 0 && _.status < 9).length;
    this.rejected = this.checkedContacts.filter(_ => _.status >= 9).length;
    this.prepareShownContacts(this.checkedContacts);
    this.sourceCheckedSignal.set(1);
  }

  // we go back from step 2 => step 1
  public resetImportSource() {
    this.prepareShownContacts(this.sourceContacts);
    this.sourceCheckedSignal.set(0);
    this.rejected = 0;
  }

  // step 2 => step 3
  // we check ipport (which is already source checked) on duplicates with existing contacts
  public setImportDuplicates() {
    this.importContacts = [];
    this.noDuplicates = 0;
    this.duplicates = 0;
    const contacts = this.contactService.getContacts(this.name);
    // only contacts which are in a correct stream are treated
    const validContacts = this.checkedContacts.filter (_ => _.status < 9);
    for (const validContact of validContacts) {
      let importContact = GlobalFunctions.clone(validContact);
      importContact.status = 0;
      importContact.message = '';
      if (contacts.filter(legacyContact => legacyContact.status < 9
        && (legacyContact.companyName.startsWith(importContact.name)
        || (legacyContact.contactFirstName.startsWith(importContact.contactName) && legacyContact.contactFirstName.startsWith(importContact.contactFirstName)))).length > 0) {
        importContact.message = 'duplicate contact exists in db ';
        importContact.status += 9;
        this.duplicates++;
      } else {
        this.noDuplicates++;
      }
      // rejected contacts are taken to show them, rejected at start of nesxt step cause of status ...
      this.importContacts.push(importContact);
    }
    this.prepareShownContacts(this.importContacts);
    this.importReadySignal.set(1);
  }

   // we go back from step 3 => step 2
  public resetImportDuplicates() {
    this.prepareShownContacts(this.checkedContacts);
    this.noDuplicates = 0;
    this.duplicates = 0;
    this.importReadySignal.set(0);
  }

  // import data from step 3
  public setImportFinished() {
    let operation = 'import contacts';
    let message = '';
   
    this.resetImportDuplicates();
    this.setImportDuplicates();
    // now we store  contacts
    const isUpdate = true;

    let importContacts = this.importContacts.filter(_ =>  _.status < 9);
    for (let contact of importContacts) {
      // TODO there is no import id in the moment
      // contact.importId  = contact.contactId;
      contact.contactId = 0;
      contact.status = 0;
    }

    this.importCount = importContacts.length;
    if (this.importCount > 0) {
      // here we put imported contactss to legacy contactss
      const isCreated = this.contactService.createContacts(importContacts,  this.name);
      if (isCreated) {
        message = this.auth.txt['records_imported'] + ': ' + this.importCount;
      } else {
        message = 'error - no confirmation for imported contacts';
        this.importCount = 0;
      }
    } else {
      message = this.auth.txt['import'] + ' ' + this.auth.txt['aborted'];
    }

    if (this.importCount === 0) {
      this.logger.error(this.auth.getSession(this.name), this.name, `${operation} failed: ${message}`);
      this.message.show(this.name + `: ${operation} failed: ${message}`);
    } else {
      this.logger.info(this.auth.getSession(this.name), this.name, `${operation} successfull: ${message}`);
      this.message.show(this.name + `: ${operation} successfull: ${message}`);
    }

    this.importFinishedSignal.set(1);
  }

  // paginator - set params for actual page
  public onPageSelect(pageNumber: number): void {
    this.selectedPage = pageNumber;
    // update content to view new page content
    this.shownContacts = this.contacts.filter((_, ix) => ix >= ((this.selectedPage - 1) * this.limit) && ix < (this.selectedPage * this.limit));
  }


}
