/*
  document element is the database element with metadata for a document file in /documents

*/
export class DocumentElement {
  constructor (
    public documentId: number,
    /*  documentCategory groups the documents in the application
       values are defined by documentCAtegory option
    */
    public documentCategory: number,
    /*  documentNr identifies the document in the application (nr is unique for each type)
    */
    public documentNr: number,
    /* name of uploaded document file, given by user at uploading
     documentName is used as internal file name at webDAV documents
    and must be unique (tpgehter with extension) over categories and types of documents*/
    public documentName: string,
    /* filename extension is used as extension of document name to get filename  */
    public documentExtension: string,
    /* document file name in webDAV URL
     - is built from documentName and documentExtension, with some replacements of special characters
     - is built ONLY at creation of this record, then remains unchanged when documentName is changed or when document is cloned ...
     - is used to get thumbnailss also for linked documents ... */
    public documentFileName: string,
    /* subdirectory of document file (below standard documents url )
      is original subdirectory or subdirectory entered by user -  blanks or special characters are not replaced ..*/
    public documentSubDirectory: string,
    /* URL of document file directory (of our document store or of linked infrastructure */
    public documentDirectory: string,
    /* URL of thumbnail file directory (we build no subdirectory for thumbnail)
      if empty, there is no thumbnail  */
    public thumbnailDirectory: string,
    /* original file name in local file system - consists of name + extension
      in case of linked documents used to retrieve file from linked documents */
    public documentOriginalFileName: string,
    /* document type according to mime subtype (jpg, jpeg, png,.. ) */
    public documentType: string,
    /* document size in bytes            */
    public documentSize: number,
    /* date of document (last modified in file system)           */
    public documentDate: Date,
    /* original date of an image (from exif image data)  
      if no exif info, wth   field is set to documentDate         */
    public dateTimeOriginal: Date,
    /* title of image   - may come from exif     */
    public imageTitle: string,
    /* height of image   - may come from exif     */
    public imageHeight: string,
    /* width of image   - may come from exif     */
    public imageWidth: string,
    /* location of image    (GPS, from exif) Latitude. Longitude       */
    public imageLocation: string,
    /* uuid of immich asset which correspondents to this document */
    public immichAssetId: string,
    /* for internal info to document
    - description of an image (from exif image data)        */
    public note: string,
    /* type 0 = undefined,
      1 = print of application document, usually PDF format
      2 = image from print app as screenshot - not used in the moment
      3 = image used as design element of application layout
      4 = document/image belonging to work (used in pWork-log) -- future use
		  5 = document/image with no special purpose
      6 = document with reference to linked document directory (document is NOT in base64 format=)
    */
    public type: number,
    /* status 0 = undefined,
      1 = active document,
      9 = manualled disabled,
      90 = automatically disabled
    */
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number
  ) {}
}
