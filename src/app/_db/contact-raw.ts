import { IContactElement } from "../_interfaces/i-contact-element";

export interface ContactRaw {
    contactId: number;
    contactNr: number;
    companyName: string;
    longName: string;
    nameScnd: string;
    street: string;
    city: string;
    plz: number;
    country: string;
    website: string;
    contactType: number;
    contactColor: string;
    contactSalutation: string;
    contactName: string;
    contactFirstName: string;
    contactFunction: string;
    contactEmail: string;
    contactEmailScnd: string;
    contactTel: string;
    contactTelScnd: string;
    contactBirthday: Date | null;
    companyUid: string;
    iban: string;
    paymentInfo: string;
    ibanScnd: string;
    paymentInfoScnd: string;
    language: number;
    companyNote: string;
    externalId: string;
    timeZoneIdentifier: string;
    displayName: string,
    displayNr: string,
    /* from here we have fields which are according to vcf  */
    name: IContactElement;
    formattedName: string;
    nickName: IContactElement;
    email: Array<IContactElement>;
    tel: Array<IContactElement>;
    address: Array<IContactElement>;
    organization: string;
    title: string;
    categories: IContactElement;
    url: string;
    note: string;
    birthday: string;
    photo: string;
    uid: string;
    vcardVersion: string;
    vcardProdId: string;
    undefinedKey: Array<{key: string,  value: any}>;
    type: number;
    status: number;
    created: Date;
    createdBy: string;
    releaseCreated: number;
    updated: Date | null;
    updatedBy: string;
    releaseUpdated: number;
    version: number;
    nr?: number;
    id?: number;
  }
