import { DatePipe, formatDate, NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output, SimpleChange } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { StyleFactory } from '../../_globals/style-factory';
import { MAX_CONTACT_NR } from '../../_globals/constants';
import { GlobalFunctions } from '../../_globals/global-functions';

import { Session } from '../../_db/session';
import { Contact } from '../../_db/contact';
import { ContactFactory } from '../../_db/contact-factory';

import { ContactService } from '../../_services/contact.service';

import { ContactValidators } from '../../_validators/contact.validators';
import { CommonValidators } from '../../_validators/common.validators';
import { ErrorMessage } from '../../_validators/error-message';


@Component({
  selector: 'dsy-contact-form-view',
  templateUrl: './contact-form-view.html',
  styleUrl: './contact-form-view.css',
  imports: [ReactiveFormsModule, NgStyle, NgTemplateOutlet, DatePipe]
})
export class ContactFormViewComponent {


  public name = 'ContactFormViewComponent';

  @Input({required: true}) session!: Session;

  // formAction - show, insert, update
  @Input({required: true}) formAction!: string;
  @Input({required: true}) contact!: Contact;
  @Input({required: true}) isContactNrChangeable!: boolean;

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) contacttxt!: { [key: string]: string };

  @Output() updateContact = new EventEmitter<Contact>();
  @Output() newContact = new EventEmitter<Contact>();
  @Output() contactFormClose = new EventEmitter();


  contactStyle = {};

  public thisForm: FormGroup;
  public errors: { [key: string]: string } = {};
  private thisFormErrorMessages: ErrorMessage[] = [];

  public isMaint = false;
  public isNew = false;
  public isClone = false;
  public isUpdateUniqueId = false;
  public isUpdateHdr = false;
  public isUpdateContact = false;
  public isUpdateFtr = false;
  public isShowBody = false;

  constructor(@Inject(LOCALE_ID) public locale: string,
    private fb: FormBuilder,
    private contactService: ContactService
  ) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit(): void {
    // activation is done by ngOnChanges
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {

      if (propKey === 'contact' || propKey === 'formAction') {

        switch (this.formAction) {
          case 'show':
            this.isMaint = false;
            break;

          case 'maint':
            if (this.contact) {
              this.isMaint = true;
              // when changing to maint after new ....
              this.isNew = false;
            }
            break;

          case 'new':
            // we await an empty contact
            if (this.contact) {
              this.isNew = true;
            }
            break;

          default:
            break;
        }
        this.loadErrorMessages();
        this.initChoices();
        if (this.isNew) {
          this.initUniqueIdForm();
        } else {
          this.contactStyle = StyleFactory.getBgColorStyle(this.contact.contactColor);
          if (this.isMaint) {
            this.initBodyForm();
          }
        }
      }
    }
  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('uniqueId.contactNr', 'required', this.contacttxt['contactNr']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('uniqueId.contactNr', 'minlength', this.contacttxt['contactNr']
      + ' ' + this.txt['must_have_at_least'] + ' 1 ' + this.txt['digits_containing']),
      new ErrorMessage('uniqueId.contactNr', 'max', this.contacttxt['contactNr']
      + ' ' + this.txt['must_not_be_greater_than'] + ' ' + MAX_CONTACT_NR),
      new ErrorMessage('uniqueId.contactNr', 'pattern', this.contacttxt['contactNr']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('uniqueId.name', 'required',  this.contacttxt['name']
      + ' ' + this.txt['must_be_entered']),
      // new ErrorMessage('uniqueId.name', 'minlength', this.contacttxt['name']
      // + ' ' + this.txt['must_have_at_least'] + ' 1 ' + this.txt['positions']),
      new ErrorMessage('uniqueId.name', 'maxlength', this.contacttxt['name']
      + ' ' + this.txt['must_have_not_more'] + ' 120 ' + this.txt['positions_conatining']),
      new ErrorMessage('uniqueId', 'contactExists',  (this.session.serviceLevel.contact < 2 ? this.txt['contact'] : this.txt['contact']) + ' '  + this.txt['with']
      + ' ' + this.contacttxt['contactNr'] + ' ' + this.txt['already_exists']),
      // new ErrorMessage('hdrGroup.plz', 'required', this.contacttxt['plz']
      // + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('hdrGroup.plz', 'pattern', this.contacttxt['plz']
      + ' ' + this.txt['must_be_numeric']),
      // new ErrorMessage('hdrGroup.plz',  'maxlength', this.contacttxt['plz']
      // + ' ' + this.txt['must_have_not_more'] + ' 5 ' + this.txt['digits_containing']),
      new ErrorMessage('hdrGroup.plz',  'min', this.contacttxt['plz']
      + ' ' + this.txt['must_be_greater_than'] + ' 1000 ' ),
      new ErrorMessage('hdrGroup.plz',  'max', this.contacttxt['plz']
      + ' ' + this.txt['must_not_be_greater_than'] + ' 99999 ' ),
      // new ErrorMessage('hdrGroup.country', 'required', this.contacttxt['country']
      // + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('hdrGroup.country', 'minlength', this.contacttxt['country']
      + ' ' + this.txt['must_have_at_least'] + ' 2 ' + this.txt['digits_containing']),
      new ErrorMessage('hdrGroup.country', 'maxlength', this.contacttxt['country']
      + ' ' + this.txt['must_have_not_more'] + ' 2 ' + this.txt['digits_containing']),
      new ErrorMessage('hdrGroup.contactColor', 'pattern', this.contacttxt['contactColor']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('hdrGroup.contactColor',  'max', this.contacttxt['contactColor']
      + ' ' + this.txt['must_not_be_greater_than'] + ' 99 ' ),
      new ErrorMessage('contactGroup.contactEmail', 'email', this.contacttxt['contactEmail']
      + ' ' + this.txt['must_be_entered_correctly']),
      new ErrorMessage('contactGroup.contactEmailScnd', 'email', this.contacttxt['contactEmailScnd']
      + ' ' + this.txt['must_be_entered_correctly']),
      new ErrorMessage('contactGroup.contactBirthdayString', 'pattern', this.contacttxt['contactBirthday']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('contactGroup.contactBirthdayString', 'wrongDate',  this.contacttxt['contactBirthday']
      + ' ' + this.txt['date_is_not_in_format_dd_mm_yyyy'])
    ];

  }


  private initChoices() {

  }


  /**
   * form handling
   * initUniqueIdForm prepares form for update unique id when creating or cloning contact
   *
   */
  private async initUniqueIdForm() {
    let cloneName = '';
    if (this.isClone) {
      // we search for last contact which has been cloned from this contact
      const latestCopy = await this.contactService.getContactLatestClone(this.contact.companyName, this.name);
      if (latestCopy) {
        cloneName  = latestCopy.companyName + ' (copy)';
      }
    }
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group({
        contactNr: [(this.isNew || this.isClone) ? '' : this.contact.contactNr, [
          Validators.required,
          // Validators.minLength(1),
          // Validators.maxLength(6),
          Validators.max(MAX_CONTACT_NR),
          // we do not check this by input type="number", because then Length validators would not work
          Validators.pattern('^[0-9]*$')
        ]],
        name: [this.isNew ? '' : this.isClone ? cloneName : this.contact.companyName, [
          Validators.required,
          // Validators.minLength(1),
          Validators.maxLength(120)
        ]]
      },
      {
        // securityLevel.maint must be >= 1 and serviceLevel.contact >= 1 to create contacts
        validator:  ContactValidators.contactNrExists(this.contactService,
          // in case of new contact we get empty contact record as this.contact
          this.session.serviceLevel.contact, this.session.securityLevel.maint, 0)
      })
    });

    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());

  }

  /**
   * form handling
   * initBodyForm prepares form for update content body incl. uniqueId
   *
   * (is default activation ....)
   *
   */
  private async initBodyForm() {
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group({
        contactNr:  [this.contact.contactNr, [
          Validators.required,
          // Validators.minLength(1),
          // Validators.maxLength(6),
          Validators.max(MAX_CONTACT_NR),
          // we do not check this by input type="number", because then Length validators would not work
          Validators.pattern('^[0-9]*$')
        ]],
        name: [this.contact.companyName, [
          Validators.required,
          // Validators.minLength(1),
          Validators.maxLength(120)
        ]]
      },
      {
        // securityLevel.maint must be >= 1 and serviceLevel.contact >= 1 to create contacts
        validator:  [
          ContactValidators.contactNrExists(this.contactService,
            this.session.serviceLevel.contact, this.session.securityLevel.maint, this.contact.contactNr)
          ]
      }),
      hdrGroup: this.fb.group({
        longName: this.contact.longName,
        nameScnd: this.contact.nameScnd,
        street: this.contact.street,
        city: this.contact.city,
        plz: [this.contact.plz === 0 ? '' : this.contact.plz, [
          Validators.pattern('^[0-9]*$'),
          Validators.min(1000),
          Validators.max(99999)
          // TODO group Validator, together with country Validators and checking against plz data
          ]
        ],
        country: [this.contact.country, [
          Validators.minLength(2),
          Validators.maxLength(2)
          ]
        ],
        website: this.contact.website,
        contactType: this.contact.contactType === 1 ? true : false,
        contactColor: [this.contact.contactColor, [
          Validators.pattern('^[0-9]*$'),
          Validators.max(99)
          ]
        ]
      }),
      contactGroup: this.fb.group({
        contactSalutation: this.contact.contactSalutation,
        contactFirstName: this.contact.contactFirstName,
        contactName: this.contact.contactName,
        contactFunction: this.contact.contactFunction,
        contactEmail: [this.contact.contactEmail, [Validators.email]],
        contactEmailScnd: [this.contact.contactEmailScnd, [Validators.email]],
        contactTel: this.contact.contactTel,
        contactTelScnd: this.contact.contactTelScnd,
        contactBirthdayString: [this.contact.contactBirthday ? formatDate(this.contact.contactBirthday, 'd.MM.yyyy', this.locale): '', [
          Validators.pattern('^[0-9.]*$'),
          CommonValidators.parseDate(false)
          ]
        ]
      }),
      ftrGroup: this.fb.group({
        uid: this.contact.companyUid,
        iban: this.contact.iban,
        ibanScnd: this.contact.ibanScnd,
        paymentInfo: this.contact.paymentInfo,
        paymentInfoScnd: this.contact.paymentInfoScnd,
        externalId: this.contact.externalId,
        note: this.contact.companyNote
      })
    });

    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
    this.isShowBody = true;
  }


  /** ------------------------  public methods --------------------------------------------------- */


  public return() {
    this.cancelUpdates();
    this.contactFormClose.emit();
  }

  public async setUniqueIdClone() {
    if (this.isMaint) {
      this.isClone = true;
      await this.initUniqueIdForm();
    }
  }

  // set update unique id activates body form
  public async setUniqueId() {
    if (this.isMaint) {
      this.isUpdateUniqueId  = true;
      await this.initBodyForm();
    }
  }

// set update hdr, ftr also activates body form

public async setHdr() {
  if (this.isMaint) {
    this.isUpdateHdr  = true;
    await this.initBodyForm();
  }
}

public async setContact() {
  if (this.isMaint) {
    this.isUpdateContact  = true;
    await this.initBodyForm();
  }
}

public async setFtr() {
  if (this.isMaint) {
    this.isUpdateFtr  = true;
    await this.initBodyForm();
  }
}



  public async submitForm() {
    // depending on isUpdate we process the updates
    switch (true) {
      // this case is prohibited by validator .....
      case this.isClone && this.contact.contactNr === Number(this.thisForm.value.uniqueId.contactNr):
        alert(this.txt['enter_a_number'] + ' ' + this.txt['for'] + ' ' + this.txt['clone'] + '!');
        break;
      case this.isNew || this.isClone:
        this.contact = ContactFactory.empty();
        this.contact.contactNr = Number(this.thisForm.value.uniqueId.contactNr);
        this.contact.companyName = this.thisForm.value.uniqueId.name;
        this.contact.contactColor = ((this.contact.contactNr % 10) * 10 + Math.round(this.contact.contactNr / 10) % 10).toString();
        this.contactStyle = StyleFactory.getBgColorStyle(this.contact.contactColor);
        this.contact.companyName = this.thisForm.value.uniqueId.name;
        const lastBlank = this.contact.companyName.trim().lastIndexOf(' ');
        if (this.session.serviceLevel.contact < 2 && lastBlank > 0) {
          this.contact.contactFirstName = this.contact.companyName.trim().substring(0, lastBlank).trim();
          this.contact.contactName = this.contact.companyName.trim().substring(lastBlank).trim();
        }
        this.newContact.emit(this.contact);
        this.isMaint = true;
        break;
      case this.isUpdateUniqueId && this.thisForm.value.uniqueId.contactName !== '':
        this.contact.contactNr = Number(this.thisForm.value.uniqueId.contactNr);
        this.contact.companyName = this.thisForm.value.uniqueId.name;
        this.updateContact.emit(this.contact);
        break;
      case this.isUpdateHdr:
        // Contact exists on server & Hdr fields are updated => mandant update
        this.contact.longName = this.thisForm.value.hdrGroup.longName;
        this.contact.nameScnd = this.thisForm.value.hdrGroup.nameScnd;
        this.contact.street = this.thisForm.value.hdrGroup.street;
        this.contact.city = this.thisForm.value.hdrGroup.city;
        this.contact.plz = Number(this.thisForm.value.hdrGroup.plz);
        this.contact.country = this.thisForm.value.hdrGroup.country;
        this.contact.website = this.thisForm.value.hdrGroup.website;
        // contact in the moment gets always language of the mandant
        this.contact.language = Number(this.session.language);
        this.contact.contactType = this.thisForm.value.hdrGroup.contactType ? 1 : 0;
        this.contact.companyUid = this.contact.contactType === 0 ? this.contact.companyUid : '';
        // if user sets the color empty, we use default ....
        this.contact.contactColor = this.thisForm.value.hdrGroup.contactColor  === '' ? ((this.contact.contactNr % 10) * 10 + Math.round(this.contact.contactNr / 10) % 10).toString() : this.thisForm.value.hdrGroup.contactColor;
        this.contactStyle = StyleFactory.getBgColorStyle(this.contact.contactColor);
        this.updateContact.emit(this.contact);
        break;
      case this.isUpdateContact:
        this.contact.contactSalutation = this.thisForm.value.contactGroup.contactSalutation;
        this.contact.contactName = this.thisForm.value.contactGroup.contactName;
        this.contact.contactFirstName = this.thisForm.value.contactGroup.contactFirstName;
        this.contact.contactFunction = this.thisForm.value.contactGroup.contactFunction;
        this.contact.contactEmail = this.thisForm.value.contactGroup.contactEmail;
        this.contact.contactEmailScnd = this.thisForm.value.contactGroup.contactEmailScnd;
        this.contact.contactTel = this.thisForm.value.contactGroup.contactTel;
        this.contact.contactTelScnd = this.thisForm.value.contactGroup.contactTelScnd;
        this.contact.contactBirthday = GlobalFunctions.parseDMYtoDate(this.thisForm.value.contactGroup.contactBirthdayString);
        this.updateContact.emit(this.contact);
        break;
      case this.isUpdateFtr:
        this.contact.companyUid = this.contact.contactType === 0 ? this.thisForm.value.ftrGroup.uid : '';
        this.contact.iban = this.thisForm.value.ftrGroup.iban;
        this.contact.ibanScnd = this.thisForm.value.ftrGroup.ibanScnd;
        this.contact.paymentInfo = this.thisForm.value.ftrGroup.paymentInfo;
        this.contact.paymentInfoScnd = this.thisForm.value.ftrGroup.paymentInfoScnd;
        this.contact.externalId = this.thisForm.value.ftrGroup.externalId;
        this.contact.companyNote = this.thisForm.value.ftrGroup.note;
        this.updateContact.emit(this.contact);
        break;
      default:
        break;
    }
    this.cancelUpdates();
  }

  public cancelUpdates(): void {
    this.isNew = false;
    this.isClone = false;
    this.isUpdateUniqueId = false;
    this.isUpdateHdr= false;
    this.isUpdateContact= false;
    this.isUpdateFtr= false;
    this.errors = {};
  }

  /**
   * defining form update status as function, depending on single update flags
   *
   */
  public isUpdate(): boolean {return (this.isNew || this.isClone || this.isUpdateUniqueId || this.isUpdateHdr || this.isUpdateContact || this.isUpdateFtr);
  }

  /** ---------------------------- private methods exclusively used in public methods ---------------------------------- */


  /** ---------------------------- form handling methods  ---------------------------------- */


  /**
    * update form error messages
    */
  private updateErrorMessages() {
    this.errors = {};
    for (const message of this.thisFormErrorMessages) {
      const control = this.thisForm.get(message.forControl);
      /**
      * we build errors key-value
      */
      if (control &&
          control.dirty &&
          control.invalid &&
          control.errors &&
          control.errors[message.forValidator] &&
          !this.errors[message.forControl]) {
        this.errors[message.forControl]  = message.text;
      }
    }
  }

}



