import { IContactElement } from "../_interfaces/i-contact-element";

/*
  detailed description -see: pWork-invoice contact
*/
export class Contact {
  constructor (
  public contactId: number,
  public contactNr: number,
  // company name is usually set to name of organozation
  public companyName: string,
  // company long name - not in maintenance ...
  public longName: string,
  // company (or contact) alternate name or additional name
  public nameScnd: string,
  public companyEmail: string,
  public companyTel: string,
  public street: string,
  public city: string,
  public plz: number,
  public country: string,
  public website: string,
  // contactType - 2 internal (only needed in customer invoice systems ...)
  public contactType: number,
  public contactColor: string,
  public contactSalutation: string,
  public contactName: string,
  public contactFirstName: string,
  public contactFunction: string,
  public contactEmail: string,
  public contactTel: string,
  public contactTelScnd: string,
  public contactStreet: string,
  public contactCity: string,
  public contactPlz: number,
  public contactCountry: string,
  public contactBirthday: Date | null,
  public companyUid: string,
  // the following fields are used only in customer invoicing systems
  public iban: string,
  public paymentInfo: string,
  public ibanScnd: string,
  public paymentInfoScnd: string,
  public language: number,
  public companyNote: string,
  public externalId: string,
  public timeZoneIdentifier: string,
  /* display name has contactName, contactFirstName  */
  public displayName: string,
  /* display nr gets nr if contact nrs were fetched from contact url, otherwise contactId */
  public displayNr: string,
  /* from here we have fields which are according to vcf  */
  // N
  public name: IContactElement,
  // FN
  public formattedName: string,
  // NICKNAME
  public nickName: IContactElement,
  // EMAIL
  public email: Array<IContactElement>,
  // TEL
  public tel: Array<IContactElement>,
  // ADR
  public address: Array<IContactElement>,
  // ORG
  public organization: string,
  // TITLE
  public title: string,
  // CATEGORIES
  public categories: IContactElement,
  // URL
  public url: string,
  // NOTE
  public note: string,
  // BDAY
  public birthday: Date | null,
  // PHOTO
  public photo: string,
  // UID
  public uid: string,
  // VERSION
  public vcardVersion: string,
  // PRODID
  public vcardProdId: string,
  // undefined vcf keys
  public undefinedKey: Array<{key: string,  value: any}>,
  /*
    type is used if contacts of various sources are merged in a contact array for searching,...
    type 0 - fixedcontacts, type 1 - local contacts, type 2 - server contacts
  */
  public type: number,
  public status: number,
  public created: Date,
  public createdBy: string,
  public releaseCreated: number,
  public updated: Date | null,
  public updatedBy: string,
  public releaseUpdated: number,
  public version: number,
  /* style info is built depending on coloer,.. */
  public style?: {},
  /* message is used in import  */
  public message?: string
  ) { }
}
