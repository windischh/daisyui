import { Injectable } from '@angular/core';
import * as ExifReader from 'exifreader';

import { DocumentElement } from '../_db/document';
import { DocumentFactory } from '../_db/document-factory';
import { DocumentRaw } from '../_db/document-raw';

import { IAuthorization } from '../_interfaces/i-authorization';

import { LogService } from './log.service';
import { FetchApiService } from './fetch-api.service';
import { AuthenticationService } from './authentication.service';
import { MessageService } from './message.service';
import { MAX_DOCUMENT_CLONE, MAX_DOCUMENT_NR } from '../_globals/constants';
import { GlobalFunctions } from '../_globals/global-functions';
import { App } from '../_enums/app.enum';
import { DocumentElementType } from '../_enums/document-type.enum';


@Injectable({
  providedIn: 'root',
})
export class DocumentService {

  public name = 'DocumentService';

  // directory for documents (and documentFiles) at server (without leading '/' ) - for mandant data
  // (user documents do not use this)
  private documentsDirectory = 'mandant'
  // json file for documents at server (without leading '/' )
  private documentsJsonFileName = 'documents.json'
  // json file name for exported documents at server (without leading '/' ) - are usually below "documents" which points to linked documents 
  private exportedDocumentsJsonFileName = 'dirInfoDocuments.json'

  // url for document files at server  (without leading '/' )
  // in our documents convention this url leads to linked documents at web server if used as:  personal url of each user + documents
  //   but we get document files which were creted in our app via personal url + data + documents
  private documentsFileDirectory = 'documents';
  // url for document thumbail files at server  (without leading '/' )
  private thumbnailsFileDirectory = 'thumbnails';

  constructor(
    private logger: LogService,
    private fetch: FetchApiService,
    private message: MessageService,
    private auth: AuthenticationService) { }


  /***********************************  private methods **************************************/

  
  
  /**
   * getLocaldDocuments()
   *  get documents from local storage
   * @param comp name of calling component
   * @returns array of documents, empty array if not found or server not ready
   */
  private  getLocalDocuments(comp: string): Array<DocumentElement> {
    // console.log('get server documents');
    let localDocuments: Array<DocumentElement> = [];
    const session = this.auth.getSession(comp);
    if (session && session.app !== App.local) {
      // TODO get documents from local storage
    }
    return localDocuments;
  }




/**
   * setLocalocuments()
   *  set documents at local storage
   *  (is a private function - must not be used in components ... )
   * @param documents narray of documents
   * @param comp name of calling component
   * @returns true if set
   */
private setLocalDocuments(documents: Array<DocumentElement>, comp: string): boolean{
  let isLocalDocumentsSet = false;
  if (documents) {
    const session = this.auth.getSession(comp);
    // TODO store at loxal storage
  }
  return isLocalDocumentsSet;
}



  

  /** ------------------------  public methods --------------------------------------------------- */

  
  /**
   * getDocuments()
   *  get Documents
   * @param comp name of calling component
   * @returns documents
  */
  public getDocuments(comp: string): Array<DocumentElement> {
    let allDocuments: Array<DocumentElement> = [];
    allDocuments = this.getLocalDocuments(comp);
    return allDocuments;
  }

  
  /**
   * searchDocuments()
   *  independent of document type ...
   * @param searchTerm string with nr and/or name of document
   * @param comp name of calling component
   * @returns documents with searched nr or name
   */
  public searchDocuments(searchTerm: string, comp: string): Array<DocumentElement> {
    const documents = this.getDocuments(comp);
    return documents.filter(_ => _.documentNr === Number(searchTerm) || _.documentName?.startsWith(searchTerm));
  }


  /**
   * get document()
   * @param documentId id of document
   * @param comp name of calling component
   * @returns document, if document with this id is stored at server, else returns null
   */
  public getDocument(documentId: number, comp: string): DocumentElement | null {
    const documents = this.getDocuments(comp);
    if (documents) {
      const document = documents.find(_ => _.documentId === documentId);
      if (document) {
        return document;
      }
    }
    return null;
  }



  /**
   * getDocumentNr
   *  delivers documents with nr
   *
   * @param documentNr identifier
   *  ATTN: documentNr is unique for  type - so we can have more than 1 document which nr
   * @param comp name of component for logging
   * @returns documents with searched nr
   */
  public getDocumentNr( documentNr: number, comp: string): Array<DocumentElement> {
    let filteredDocuments: Array<DocumentElement> = [];
    const documents = this.getDocuments(comp);
    if (documents?.length > 0) {
      filteredDocuments = documents.filter(_ => _.documentNr  === documentNr);
    }
    return filteredDocuments;
  }



  /**
   * check document - delivers true, if a document with
   *  required identifiers already exists (and is not disabled) 
   *  (fixed documents can have the same nr)
   * @param documentNr nr which shall be given to document
   * @param type nr is unique for given type
   * @param comp name of calling component
   * @param isDisabled include also fisabled documenzts in nr check ... we have enabling, so we must preserve disbled numbers ..
   * @returns true if nr exists
   */
  public checkDocumentNr(type: number, documentNr: number, comp: string, isDisabled?: boolean): Boolean {
    if (documentNr > 0) {
      const documents = this.getLocalDocuments(comp);
      if (documents?.length > 0 && documentNr > 0 && documentNr <= MAX_DOCUMENT_NR) {
        const filteredDocuments = documents.filter(_ =>  _.type  === type && _.documentNr  === documentNr && (isDisabled ?  true : _.status < 9));
        if (filteredDocuments?.length > 0) {
          return true;
        }
      }
    }
  return false;
  }

  /**
   * check documentName - delivers true, if a document with this name and extension exists among server documents
   * (among all categories, types, subdirectories)
   * name can exist among disabled documents - document file of disabled document will be overwritten!!
   * @param name file name to be checked
   * @param extension file extension to be checked
   * @param comp name of calling component
   * @returns true is file with fileName exists (and is not disabled)
   */
  public checkDocumentName(name: string, extension: string, comp: string): Boolean {
    if (name && name !== '' && extension && extension !== ``) {
      const documents = this.getLocalDocuments(comp);
      if (documents?.length > 0) {
        const filteredDocuments = documents.filter(_ =>   _.documentName?.trimEnd()  === name?.trimEnd() && _.documentExtension?.trimEnd() === extension?.trimEnd() && _.status < 9);
        if (filteredDocuments?.length > 0) {
          // console.log(name, ' - name exists');
          return true;
        }
      }
    }
    // console.log(name, ' - name not exists');
    return false;
  }


  /**
   * getDocumentNrMax
   *  delivers max nr for given type
   * @param type nr is unique for given type
   * @param comp name of component for logging
   * @returns max number, 0 if nu adequate record exists
   */
  public getDocumentNrMax(type: number, comp: string): number {
    let documentNrMax = 0;
    const documents = this.getDocuments(comp);
    const filteredDocuments = documents?.filter(_ =>   _.type  === type);
    if (filteredDocuments?.length > 0) {
      documentNrMax = filteredDocuments.reduce((a,b) => a.documentNr > b.documentNr ? a : b).documentNr;
    }
    return documentNrMax;
  }

  
  /**
   * createDocuments()
   *  creates an array of (immich) documents in local store
   * @param documents Array of document (document type is immich_document)
   * @param comp name of calling component
   * @returns array of ids of successfull stored documents
   */
  public createDocuments(documents: Array<DocumentElement>, comp: string): { [key: number]: boolean } {
    let documentIds: { [key: number]: boolean } = {};
    for (const document of documents) {
      if (document && document.documentName !== '') {
        const op = 'documents create';
        let message = 'documents not created';      
        if (document.type !== DocumentElementType.immich_document) {
          // document.type is already set
          document.documentId = 0;
          // check if name is unique - otherwise set a copy number as suffix ...
          // + ' (1)' - replace (1) by (2),... - see global functions
          let name = document.documentName;
          let isNrFound = false;
          for (let index = document.documentNr; index <= MAX_DOCUMENT_NR && !isNrFound; index++) {
            const isNrExists = this.checkDocumentNr(document.type, index, comp, true);
            if (isNrExists || index <= 0) {
              // nr already exists, we try next ...
              // console.log(index, 'document with this nr exists');
            } else {
              document.documentNr = index;
              // check if name is unique - otherwise set a copy number as suffix ...
              // + ' (1)' - replace (1) by (2),... - see global functions
              let name = document.documentName;
              let isNameExists = this.checkDocumentName(name, document.documentExtension, comp);
              for (let i = 0; isNameExists && i < MAX_DOCUMENT_CLONE; i++) {
                name = GlobalFunctions.incrementSuffix(name);
                isNameExists = this.checkDocumentName(name, document.documentExtension, comp);
                // console.log(name, 'document with this name exists: ', isNameExists);
              }
              document.documentName = name;
              isNrFound = true;
            }
          }
          const documentId = this.setDocument(document, comp);
          // TODO here we could add checks for document with documentId
          documentIds[documentId] = true;
        } // is document type ok
      } // is document
    } // andfor documents
	  return documentIds;
  }

  /**
   * setDocument()
   *  set document at local storage by id
   * @param document new document content - in case of documentId is missing or === 0, document is inserted
   * @param comp name of calling component
   * @returns documentId, if document was updated or created, else 0
   */
  public setDocument(document: DocumentElement,  comp: string): number {
    let isSetOk = false;
    let documents = this.getLocalDocuments(comp);
    const session = this.auth.getSession(comp);
    let ix = -1;
    if (documents?.length > 0) {
      ix = documents.findIndex(_ => _.documentId === document.documentId);
    }
    if (document) {
      if (document.documentId > 0 && ix >= 0) {
        document.updated = new Date();
        document.updatedBy = session?.userName?? '';
        document.releaseUpdated = session?.releaseUpdated ?? 0;
        document.version++;
        documents[ix] = document;
      } else {
        let lastDocumentId = documents.length > 0
        ? documents.reduce((a,b) => a.documentId > b.documentId ? a : b).documentId
        : 0
        lastDocumentId++;
        document.documentId = lastDocumentId;
        document.created = new Date();
        document.createdBy = session?.userName ?? '';
        document.releaseCreated = session?.releaseUpdated ?? 0;
        documents.push(document);
      }
      isSetOk = this.setLocalDocuments(documents, comp);
    }
    if (isSetOk) {
      return document.documentId;
    } else {
      return 0;
    }
  }

  /**
   * setDocumentStatus()
   *  set document status
   * @param documentId  documentId to set
   * @param status   to be set
   * @param comp name of calling component
   * @returns true if could be set
   */
  public setDocumentStatus(documentId: number, status: number,  comp: string): boolean {
    let document = this.getDocument(documentId, comp);
    if (document) {
      document.status = status;
      const documentIdUpdated  =  this.setDocument(document, comp);
      if (documentIdUpdated > 0) {
        return true;
      }
    }
    // document element is not found or could not be updated
    return false;
  }


  /**
   * setDocumentDisabled()
   *  set document disabled
   * @param documentId  documentId to disable
   * @param comp name of calling component
   * @returns true if could be disabled
   */
  public setDocumentDisabled(documentId: number, comp: string): boolean {
    let document = this.getDocument(documentId, comp);
    const isDeleteable = true;
    if (document && isDeleteable) {
      document.status = 90;
      const documentIdDisbled = this.setDocument(document, comp);
      if (documentIdDisbled > 0) {
        return true;
      }
    }
    // document element is not found or could not be updated
    return false;
  }

  
  
  /* *****************************************  http functions start here **************** */


  /***********************************  private methods **************************************/


}
