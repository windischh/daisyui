import { Contact } from './contact';
import { ContactRaw } from './contact-raw';

export class ContactFactory {

  static empty(): Contact {
    return new Contact(0, 0,  '',  '', '', '', '',  '', '', 0, '', '', 0, '',
      '', '', '', '', '', '', '', '', '', 0, '', null, '', '', '', '', '', 0, '',  '', '', '',  '',
      /* from here we have fields which are according to vcf  */
      {value: ''},  '', {value: ''}, [], [],  [], '', '', {value: ''},'', '', null, '', '', '', '', [],
      0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawContact: ContactRaw): Contact {
    return new Contact(
      rawContact.contactId,
      rawContact.contactNr,
      rawContact.companyName,
      rawContact.longName,
      rawContact.nameScnd,
      rawContact.companyEmail,
      rawContact.companyTel,
      rawContact.street,
      rawContact.city,
      rawContact.plz,
      rawContact.country,
      rawContact.website,
      rawContact.contactType,
      rawContact.contactColor === undefined ? '' : rawContact.contactColor,
      rawContact.contactSalutation,
      rawContact.contactName,
      rawContact.contactFirstName,
      rawContact.contactFunction,
      rawContact.contactEmail,
      rawContact.contactTel,
      rawContact.contactTelScnd,
      rawContact.contactStreet,
      rawContact.contactCity,
      rawContact.contactPlz,
      rawContact.contactCountry,
      typeof(rawContact.contactBirthday) === 'string' ?
      new Date(rawContact.contactBirthday) : rawContact.contactBirthday,
      rawContact.companyUid,
      rawContact.iban,
      rawContact.paymentInfo,
      rawContact.ibanScnd,
      rawContact.paymentInfoScnd,
      rawContact.language,
      rawContact.companyNote,
      rawContact.externalId,
      rawContact.timeZoneIdentifier,
      rawContact.displayName,
      rawContact.displayNr === undefined || rawContact.displayNr === `` ? rawContact.contactNr > 0 ? rawContact.contactNr.toString()  : rawContact.contactId.toString() : rawContact.displayNr,
      /* from here we have fields which are according to vcf  */
      rawContact.name,
      rawContact.formattedName,
      rawContact.nickName,
      rawContact.email,
      rawContact.tel,
      rawContact.address,
      rawContact.organization,
      rawContact.title,
      rawContact.categories,
      rawContact.url,
      rawContact.note,
      typeof(rawContact.birthday) === 'string' ?
      new Date(rawContact.birthday) : rawContact.birthday,
      rawContact.photo,
      rawContact.uid,
      rawContact.vcardVersion,
      rawContact.vcardProdId,
      rawContact.undefinedKey,
      rawContact.type,
      rawContact.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawContact.created) === 'string' ?
      new Date(rawContact.created) : rawContact.created,
      rawContact.createdBy,
      rawContact.releaseCreated,
      typeof(rawContact.updated) === 'string' ?
      new Date(rawContact.updated) : rawContact.updated,
      rawContact.updatedBy,
      rawContact.releaseUpdated,
      rawContact.version
    );
  }


}
