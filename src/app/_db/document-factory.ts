import { DocumentElement } from './document';
import { DocumentRaw } from './document-raw';

export class DocumentFactory {
  static empty(): DocumentElement {
    return new DocumentElement(0, 0, 0, '', '', '', '', '', '', '', '', 0,
      new Date(), new Date(), '', '', '', '', ``,  '',
      0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawDocument: DocumentRaw): DocumentElement {
    return new DocumentElement(
      rawDocument.documentId,
      rawDocument.documentCategory,
      rawDocument.documentNr,
      rawDocument.documentName,
      rawDocument.documentExtension,
      rawDocument.documentFileName,
      rawDocument.documentSubDirectory,
      rawDocument.documentDirectory,
      rawDocument.thumbnailDirectory,
      rawDocument.documentOriginalFileName,
      rawDocument.documentType,
      rawDocument.documentSize,
      typeof(rawDocument.documentDate) === 'string' ?
      new Date(rawDocument.documentDate) : rawDocument.documentDate,
      typeof(rawDocument.dateTimeOriginal) === 'string' ?
      new Date(rawDocument.dateTimeOriginal) : rawDocument.dateTimeOriginal,
      rawDocument.imageTitle,
      rawDocument.imageHeight,
      rawDocument.imageWidth,
      rawDocument.imageLocation,
      rawDocument.immichAssetId,
      rawDocument.note,
      rawDocument.type,
      rawDocument.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawDocument.created) === 'string' ?
      new Date(rawDocument.created) : rawDocument.created,
      rawDocument.createdBy,
      rawDocument.releaseCreated,
      typeof(rawDocument.updated) === 'string' ?
      new Date(rawDocument.updated) : rawDocument.updated,
      rawDocument.updatedBy,
      rawDocument.releaseUpdated,
      rawDocument.version
    );
  }

  static fromFile(f: File): DocumentElement {
    return new DocumentElement(
      0, 0, 0, '', '', '', '', '', '', f.name, f.type, f.size,
      new Date(f.lastModified), new Date(), '', '', '', '', '', '',
      0, 0, new Date(), '', 0, null, '', 0, 0);
  }

}


