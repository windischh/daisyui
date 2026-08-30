import { Component, Inject, LOCALE_ID, OnInit, signal} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ADR, BDAY, BEGIN, CATEGORIES, CRLF, EMAIL, END, EQUALS, FN, N, NICKNAME, NOTE, ORG, PHOTO, PRODID, SEMICOLON, TEL, TITLE, TYPE, UID, VCARD, VERSION, URL, LF_ZONED } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';
import { ContactFactory } from '../../_db/contact-factory';

import { SafeResource } from '../../_services/safe-resource';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { ContactService } from '../../_services/contact.service';
import { AuthenticationService } from '../../_services/authentication.service';


@Component({
  selector: 'dsy-contact-export',
  templateUrl: './contact-export.html',
  styleUrl: './contact-export.css',
  imports: [SafeResource]
})
export class ContactExportComponent implements OnInit {

  public name = 'ContactExportComponent';

  // db elements with their texts (single db object just used for generating texts)
  contacttxt: { [key: string]: string } = {};

  encodedUri!: string;
  fileName!: string;
  fileExtension!: string;
  isFileExtension: boolean = false;
  fileType!: string;
  extendedFileName!: string;

  // contacts: Array<Contact>;
  recordCount: number = 0;

  isUpdateFileName = false;
  isUpdateFileType = false;
  isUpdateExtendedFileName = false;

  refreshSignal = signal(0);
  readySignal = signal(0)
  resetSignal  = signal(0);
  finishedSignal = signal(0);

  // when set false, we export DTSTART and DTEND as UTC time values
  // we have no possibilty for user to set it true - we must implement
  //  a VTIMEZONE header before ...
  isExportLocalTimezone = false;

  constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private contactService: ContactService,
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthenticationService
    ) { }

  async ngOnInit() {
    // we deactivate header child routing after we have been called
    // this.auth.isHeaderChildCalled = false;
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.loadDbTexts();
      this.resetExport();
      this.refreshSignal.set(1);
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
    this.contacttxt = GlobalFunctions.objText(contact,
      'Contact', this.auth.systemTexts, language,  this.name);
  }

  // buils a line in an vcf contacts file
  private vcfLine(what: string, content: string): string {
    return what + ':' + content + CRLF;
  }

  /** --------------------------  public methods -------------------------------------------- */

  resetExport() {
    // default filename and fileType (in the moment we do not use an option for this)
    this.fileName = 'exportContacts';
    // alternate: formatDate(new Date(), 'yyyyMMdd_HHmm', this.locale);
    this.fileExtension = GlobalFunctions.getYMD(new Date()) + '_' + GlobalFunctions.getHM4String(new Date());
    this.isFileExtension = true;
    this.fileType = 'vcf';
    this.extendedFileName = this.fileName + (this.isFileExtension ? '_' + this.fileExtension : '') + '.' + this.fileType;
    this.isUpdateExtendedFileName = false;
    this.isUpdateFileName = false;
    this.isUpdateFileType = false;
    this.finishedSignal.set(0);
    this.readySignal.set(0);
    this.resetSignal.set(0);
  }

  setUpdateExtendedFileName() {
    this.isUpdateExtendedFileName = !this.isUpdateExtendedFileName;
  }

  setUpdateFileName() {
    this.isUpdateFileName = true;
  }

  updateFileName(name: string) {
    this.fileName = name;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileName = false;
    this.resetSignal.set(1);
  }

  setUpdateFileType() {
    this.isUpdateFileType = true;
  }

  updateFileType(type: string) {
    this.fileType = type;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;
    this.isUpdateFileType = false;
    this.resetSignal.set(1);
  }

  setShowExtension(event: any) {
    this.isFileExtension = event.target.checked;
    this.extendedFileName = this.fileName +  (this.isFileExtension ? '_' + this.fileExtension : '')  + '.' + this.fileType;;
    this.resetSignal.set(1);
  }

  async prepareExport() {
    let textContent = '';
    this.recordCount = 0;

    /*
    // TODO future use - GET contacts  for export
    */
    let contacts = this.contactService.getContacts(this.name);
    // in the moment we export contacts for all contacts which are not disabled
    contacts = contacts.filter(_  => _.status < 9);
    const today = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (contacts && contacts?.length > 0) {
      contacts.forEach(_ => {
        textContent += this.vcfLine(BEGIN, VCARD);
        textContent += this.vcfLine(VERSION, _.vcardVersion ?? '3.0');
        textContent += this.vcfLine(PRODID, _.vcardProdId ?? '-//pContact-log//');
        textContent += this.vcfLine(FN, _.formattedName);
        textContent += this.vcfLine(N, _.name.value);
        if (_.nickName) {
          textContent += this.vcfLine(NICKNAME, _.nickName.value);
        }
        if (_.email?.length > 0) {
          _.email.forEach(emailElement => {
            textContent += this.vcfLine(EMAIL + (emailElement.type && emailElement.type !== '' ? (SEMICOLON + TYPE + EQUALS + emailElement.type) : ''), emailElement.value);
          });
        }
        if (_.tel?.length > 0) {
          _.tel.forEach(telElement =>  {
            textContent += this.vcfLine(TEL + (telElement.type && telElement.type !== '' ? (SEMICOLON + TYPE + EQUALS + telElement.type) : ''), telElement.value);
          });
        }
        if (_.address?.length > 0) {
          _.address.forEach(adrElement => {
            // addres can have multi-line entries
            // we replace all \n = LF = H0A by zoned characters \n
            textContent += this.vcfLine(ADR+ (adrElement.type && adrElement.type !== '' ? (SEMICOLON + TYPE + EQUALS + adrElement.type) : ''), adrElement.value.replaceAll(/\n/g, LF_ZONED));
          });
        }
        if (_.organization && _.organization !== '') {
          textContent += this.vcfLine(ORG, _.organization);
        }
        if (_.title && _.title !== '') {
          textContent += this.vcfLine(TITLE, _.title);
        }
        if (_.categories) {
          textContent += this.vcfLine(CATEGORIES, _.categories.value);
        }
        if (_.url && _.url !== '') {
          textContent += this.vcfLine(URL, _.url);
        }
        if (_.companyNote && _.companyNote !== '') {
          // note can have multi-line entries
          // we replace all \n = LF = H0A by zoned characters \n
          textContent += this.vcfLine(NOTE, _.companyNote.replaceAll(/\n/g, LF_ZONED));
        }
        if (_.birthday) {
          textContent += this.vcfLine(BDAY, GlobalFunctions.getYMD(_.birthday)?.toString() ?? '');
        }
        if (_.photo && _.photo !== '') {
          textContent += this.vcfLine(PHOTO, _.photo);
        }
        if (_.companyUid && _.companyUid !== '') {
          textContent += this.vcfLine(UID, _.companyUid);
        }
        if (_.undefinedKey?.length > 0) {
          _.undefinedKey.forEach(element => {
            textContent += this.vcfLine(element.key, element.value);
          });
        }
        textContent += this.vcfLine(END, VCARD);

        this.recordCount += 1;
      });

    }
    this.encodedUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
    this.readySignal.set(1);
    this.resetSignal.set(1);
  }

  async setExportFinished() {
    this.finishedSignal.set(1);
    // TODO in them moment there is no update isExported in all records
    // isExported is reserved for contactExport ...
    alert(this.recordCount + ' ' + this.auth.txt['records_exported']);
  }

}

