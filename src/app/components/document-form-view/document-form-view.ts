import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output, signal, SimpleChange } from '@angular/core';
import { DecimalPipe, DatePipe, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';

import { DocumentElement } from '../../_db/document';
import { Session } from '../../_db/session';

import { DocumentElementType } from '../../_enums/document-type.enum';


import { IChoice } from '../../_interfaces/i-choice';
import { IMapMarker } from '../../_interfaces/i-map-marker';
import { IImmichFolder } from '../../_interfaces/i-immich-folder';

import { SafeResource } from '../../_services/safe-resource';
import { DocumentService } from '../../_services/document.service';

import { DocumentValidators } from '../../_validators/document.validators';
import { ErrorMessage } from '../../_validators/error-message';
import { CommonValidators } from '../../_validators/common.validators';

import { MapComponent } from '../map/map';
import { DocumentAlbumViewComponent } from '../document-album-view/document-album-view';
import { App } from '../../_enums/app.enum';

import * as ExifReader from 'exifreader';


@Component({
  selector: 'dsy-document-form-view',
  templateUrl: './document-form-view.html',
  styleUrl: './document-form-view.css',
  imports: [FormsModule, ReactiveFormsModule, DecimalPipe, DatePipe, SafeResource, MapComponent]
})
export class DocumentFormViewComponent {

  public name = 'DocumentFormViewComponent';

  public App: typeof App = App;

  DocumentElementType: typeof DocumentElementType = DocumentElementType;

  @Input({required: true}) session!: Session;

  // formAction - show, insert, update
  @Input({required: true}) formAction!: string;

  @Input({required: true}) document!: DocumentElement;
  @Input({required: true}) images!: { [key: number]: {content: string, width: number | undefined} };

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) documenttxt!: { [key: string]: string };

  // document category values and category names
  @Input({required: true}) documentCategorys!: {[key: string]: string};

  // is immich available
  @Input({required: true}) isImmichAvailable!: boolean;

  @Output() updateDocument = new EventEmitter<DocumentElement>();
  @Output() newDocument = new EventEmitter<{document: DocumentElement, documentFile?: File}>();
  @Output() newDocuments = new EventEmitter<Array<{document: DocumentElement, documentFile?: File}>>();
  @Output() documentFormClose = new EventEmitter();


  public thisForm: FormGroup;
  public errors: { [key: string]: string } = {};
  private thisFormErrorMessages!: ErrorMessage[];

  public isMaint = false;
  public isNew = false;
  public isClone = false;
  public isUpdateUniqueId = false;
  public isUpdateBody = false;
  public isShowBody = false;
  isShowMap = false;
  mapMarkers!:  Array<IMapMarker>;
  mapCenter!:  [number, number, number?];



  categoryChoices!: Array<IChoice>;

  // file is the local document file which has to be selected by user when creating an document
  file!: File;

  // files are local documents if user has chosen more then 1 file
  files!: FileList;

  // linked files are file names (full path names below linked documents directory)
  linkedFiles!: Array<string>;

  //  file names (full path names below linked documents directory) of files which are selected after choosing subdirectory
  selectedFiles!: Array<string>;

  //  file dates (key is full path names below linked documents directory))
  linkedFileDates!:  { [key: string]: Date };

  // subdirectories of linked documents directory
  linkedDirectories!: Array<IChoice>;

  // immich documents to be imported
  immichDocuments!: Array<DocumentElement>;

  // when create new document, we can choose to link files
  linkedDocumentsSignal = signal(0);
  // when check linked files if already linked, also regard public documents
  isRegardPublic = true;

  linkedFilesReadySognal = signal(0);

  // when create new document, we can choose to import immich files
  immichDocumentsSignal = signal(0);

  // when not link file, we show upload - if isUploadDirectory is set true, user can only select directries to upload ...
  uploadDirectorySignal = signal(0);

  constructor(@Inject(LOCALE_ID) public locale: string,
    private fb: FormBuilder,
    private documentService: DocumentService
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

      if (propKey === 'document') {

        switch (this.formAction) {
          case 'show':
            this.isMaint = false;
            break;

          case 'maint':
            if (this.document) {
              this.isMaint = true;
            }
            break;

          case 'new':
            // we await an empty document
            if (this.document) {
              this.isNew = true;
            }
            break;

          default:
            break;
        }
        this.initChoices();
        this.loadErrorMessages();
        if (this.isNew) {
          // no new document ...
          // this.initUniqueIdForm();
        } else if (this.isMaint) {
          this.initBodyForm();
          this.isShowBody = true;
        } else {
          this.isShowBody = true;
        }
        if (this.session.app === App.admin) {
          this.isRegardPublic === false;
        }
        this.showMap();
      }
    }
  }

  private initChoices() {
    this.categoryChoices = [];
    this.categoryChoices = Object.keys(this.documentCategorys)
    .map(_ => {
      // const enumStringType: { [key: string]: any } = this.documentCategorys;
      let isSelected = Number(_) === this.document.documentCategory;
      return {value: _, text: this.documentCategorys[_], isSelected};
    });

  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('uniqueId.documentNr', 'required', this.documenttxt['documentNr']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('uniqueId.documentNr', 'maxlength', this.documenttxt['documentNr']
      + ' ' + this.txt['must_have_not_more'] + ' 6 ' + this.txt['digits_containing']),
      new ErrorMessage('uniqueId', 'documentNrExists',  this.documenttxt['className'] + ' ' + this.txt['with']
      + ' ' + this.documenttxt['documentNr'] + ' ' + this.txt['already_exists']),
      new ErrorMessage('uniqueId.documentName', 'required', this.documenttxt['documentName']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('uniqueId.documentName', 'maxlength', this.documenttxt['documentName']
      + ' ' + this.txt['must_have_not_more'] + ' 120 ' + this.txt['positions_containing']),
      new ErrorMessage('uniqueId', 'documentNameExists',  this.documenttxt['className'] + ' ' + this.txt['with']
      + ' ' + this.documenttxt['documentName'] + ' ' + this.txt['already_exists']),
      new ErrorMessage('uniqueId.documentExtension', 'maxlength', this.documenttxt['documentExtension']
      + ' ' + this.txt['must_have_not_more'] + ' 20 ' + this.txt['positions_containing']),
      new ErrorMessage('uniqueId.documentSubDirectory', 'maxlength', this.documenttxt['documentSubDirector']
        + ' ' + this.txt['must_have_not_more'] + ' 50 ' + this.txt['positions_containing']),
      // new ErrorMessage('uniqueId.dateString', 'required', this.txt['date'] + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('uniqueId.dateString', 'pattern',  this.txt['date']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('uniqueId.dateString', 'wrongDate',  this.txt['date']
      + ' ' + this.txt['date_is_not_in_format_dd_mm_yyyy']),
      new ErrorMessage('uniqueId.timeString', 'pattern',  this.txt['time']
      + ' ' + this.txt['must_be_numeric']),
      new ErrorMessage('uniqueId.timeString', 'wrongTime',  this.txt['time']
      + ' ' + this.txt['time_is_not_in_format_hh_mm']),
      new ErrorMessage('uniqueId.imageTitle', 'maxlength', this.documenttxt['imageTitle']
      + ' ' + this.txt['must_have_not_more'] + ' 120 ' + this.txt['positions_containing'])
    ];

  }


  /**
   * form handling
   * @deprecated - no new unique document data - we do not manual insert
   * initUniqueIdForm prepares form for update unique id
   *
   */
  private initUniqueIdForm() {
    let documentNrMax = this.documentService.getDocumentNrMax(this.document.type, this.name);
    if (documentNrMax >= 0 ) {
      documentNrMax++;
    } else {
      documentNrMax = 1;
    }
    let cloneName = '';
    let cloneExtension = '';
    let cloneSubDirectory = '';
    if (this.isClone) {
      // we search for last document which has been cloned from this document
      /*
      const latestCopy = await this.documentService.getDocumentLatestClone(
        GlobalFunctions.getNameBeforeSuffix(this.document.documentName), this.name);
      if (latestCopy) {
        cloneName  = GlobalFunctions.incrementSuffix(latestCopy.documentName);
        // we assume that user has reason to rename clone extension and that ha would carry on with this ....
        cloneExtension  = latestCopy.documentExtension;
        cloneSubDirectory  = latestCopy.documentSubDirectory;
      }
        */
    }
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group({
        documentNr: [this.isNew || this.isClone ? documentNrMax : this.document.documentNr, [
          Validators.required,
          Validators.min(1),
          Validators.maxLength(6),
          // we do not check this by input type="number", because then Length validators would not work
          Validators.pattern('^[0-9]*$')
        ]],
        documentCategory: [this.document.documentCategory],
        documentName: [this.isNew ? '' : this.isClone ? cloneName : this.document.documentName, [
          Validators.required,
          Validators.maxLength(120)
        ]],
        documentExtension: [this.isNew ? '' : this.isClone ? cloneExtension : this.document.documentExtension, [
          Validators.maxLength(20)
        ]],
        documentSubDirectory: [this.isNew ? '' : this.isClone ? cloneSubDirectory : this.document.documentSubDirectory, [
          Validators.maxLength(50)
        ]],
        imageTitle: [this.isNew ? '' : this.document.imageTitle, [
          Validators.maxLength(120)
        ]],
        // we have a string type maintenance of date here - date component would not be convenient for very old dates ...
        dateString: [this.isNew ? '' : GlobalFunctions.getDDMMYYYY(this.document.dateTimeOriginal) ?? '', [
          Validators.pattern('^[0-9.]*$'),
          // we allow #### year - as 1.1.####, but no future date
          CommonValidators.parseDate(false)]],
        // we have a string type maintenance for time
        timeString: [this.isNew ? '' : this.document.dateTimeOriginal ? GlobalFunctions.getHours2String(this.document.dateTimeOriginal) + ':' + GlobalFunctions.getMinutes2String(this.document.dateTimeOriginal) : '', [
          Validators.pattern('^[0-9:]*$')
        ]],
        imageLocation: [this.document.imageLocation]
      },
      // we must use composeAsync - otherwise async validators are not checked properly ...
      {
        validator: Validators.compose(
          [DocumentValidators.documentNrExists(this.documentService,
            this.document.type,
            0),
          DocumentValidators.documentNameExists(this.documentService,
            '', '')
          ]
        )
      })
    });
    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());

  }

  /**
   * form handling
   * initBodyForm prepares form for update content body
   *
   * (is default activation ....)
   *
   */
  private initBodyForm() {
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group({
        documentNr:  [this.document.documentNr, [
          Validators.required
        ]],
        documentCategory: [this.document.documentCategory],
        documentName: [this.document.documentName, [
          Validators.required,
          Validators.maxLength(120)
        ]],
        documentExtension: [this.document.documentExtension, [
          Validators.maxLength(20)
        ]],
        documentSubDirectory: [this.document.documentSubDirectory, [
          Validators.maxLength(50)
        ]],
        imageTitle: [this.document.imageTitle, [
          Validators.maxLength(120)
        ]],
        // we have a string type maintenance of date here - date component would not be convenient for very old dates ...
        dateString: [GlobalFunctions.getDDMMYYYY(this.document.dateTimeOriginal) ?? '', [
          Validators.pattern('^[0-9.]*$'),
          // we allow #### year - as 1.1.####, but no future date
          CommonValidators.parseDate(false)
        ]],
        // we have a string type maintenance for time
        timeString: [this.document.dateTimeOriginal ? GlobalFunctions.getHours2String(this.document.dateTimeOriginal) + ':' + GlobalFunctions.getMinutes2String(this.document.dateTimeOriginal) : '', [
          Validators.pattern('^[0-9:]*$')
        ]],
        // location are gps coordinates ....
        imageLocation: [this.document.imageLocation]
      },
      // we must use composeAsync - otherwise async validators are not checked properly ...
      {
        validator: Validators.compose(
          [DocumentValidators.documentNrExists(this.documentService,
            this.document.type, this.document.documentNr),
          DocumentValidators.documentNameExists(this.documentService,
            this.document.documentName, this.document.documentExtension)
          ],
        )
      }),
      bodyGroup: this.fb.group({
        imageWidth: [this.document.imageWidth],
        note: [this.document.note]
      })
    });

    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
  }

  private showMap() {
    const location = GlobalFunctions.getLocation(this.document?.imageLocation);
    const [lat, long, alt] = location;
    if (lat === 0 && long === 0 && alt === 0) {
      this.isShowMap = false;
    } else {
      // for debugging position algorithm: this.mapMarkers = [location, [48, 16], [48.5, 17]];
      const tooltip = formatDate(this.document.dateTimeOriginal, 'EEE d.MM.yyyy HH:mm', this.locale);
      this.mapMarkers = [{marker: location, tooltip}];
      this.mapCenter = GlobalFunctions.getMapCenter(this.mapMarkers);
      this.isShowMap = true;
    }
  }



  /** ------------------------  public methods --------------------------------------------------- */


  public return() {
    this.cancelUpdates();
    this.documentFormClose.emit();
  }


  /*
  // in case of new document we must take file attributes from uploaded file...
  public async setFileAttributes(document: DocumentElement, file: File): Promise<DocumentElement> {
    document.documentOriginalFileName = file.name;
    document.documentType = file.type;
    document.documentSize = file.size;
    document.documentDate = new Date(file.lastModified);
    const point = file.name.lastIndexOf('.');
    const extension = file.name.substring(point + 1);
    document.documentName = file.name.substring(0, point);
    document.documentExtension = extension;
    // we check file type before loading Exif reader ...
    if (extension.toUpperCase() === 'JPG' || extension.toUpperCase() === 'JPEG' || extension.toUpperCase() === 'PNG' ||  extension.toUpperCase() === 'TIFF') {
      // getting exif data
      const fileBuffer = await file.arrayBuffer();
      document = this.setExifFileAttributes(document, fileBuffer);
    }
    return document;
  }
  */


  // extract exif data from ArrayBuffer
  public setExifFileAttributes(document: DocumentElement, fileBuffer: ArrayBuffer): DocumentElement {
    const tags = ExifReader.load(fileBuffer);
    const imageTitle = tags['ImageDescription']?.description;
    if (imageTitle && imageTitle !== '') {
      document.imageTitle = imageTitle;
    }
    let  dateTimeOriginal = tags['DateTimeOriginal']?.description;
    if (dateTimeOriginal) {
      // format of date tag is YYYY:MM:DD hh:mm:ss'
      dateTimeOriginal = dateTimeOriginal?.replace(':', '-');
      dateTimeOriginal = dateTimeOriginal?.replace(':', '-');
      dateTimeOriginal = dateTimeOriginal?.replace(' ', 'T');
      const date = new Date(dateTimeOriginal);
      if (date) {
        document.dateTimeOriginal = date;
      }
    }
    // GPS information into imageLocation ...
    let location = '';
    if (tags['GPSLatitude']?.description && tags['GPSLatitude']?.description !== ''
    && tags['GPSLongitude']?.description && tags['GPSLongitude']?.description !== '') {
      location = tags['GPSLatitude']?.description + ', ' + tags['GPSLongitude']?.description;
    }
    /*
    if (tags['GPSLatitude']?.description && tags['GPSLatitude']?.description !== '') {
      location = location + 'Latitude:'+ tags['GPSLatitude']?.description;
    }
    if (tags['GPSLongitude']?.description && tags['GPSLongitude']?.description !== '') {
      location = ' ' + location+ 'Longitude:'+ tags['GPSLongitude']?.description;
    }
    if (tags['GPSAltitude']?.description && tags['GPSAltitude']?.description !== '') {
      location = ' ' + location +'Altitude:'+ tags['GPSAltitude']?.description;
    }
    */
    document.imageLocation = location;
    document.imageHeight = tags['Image Height']?.description ?? '';
    document.imageWidth = tags['Image Width']?.description ?? '';
    return document;
  }



  // set update body activates body form
  public setBody() {
    if (this.isMaint) {
      this.isUpdateBody  = true;
      this.initBodyForm();
    }
  }

  // set update hdr, ftr would also activate body form
  public async submitForm() {
    // datestring is already checked by validator - might be null in case of empty user entry
    let dateTimeOrigEntered = GlobalFunctions.parseDMYtoDate(this.thisForm.value.uniqueId.dateString);
    const  timeString: string = this.thisForm.value.uniqueId.timeString ?? '';
    let hours = Number(timeString);
    let minutes = 0;
    if (timeString.indexOf(':') > 0) {
      hours = Number(timeString.substring(0, timeString.indexOf(':')));
      minutes = Number(timeString.substring(timeString.indexOf(':') + 1));
    }
    if (dateTimeOrigEntered && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      dateTimeOrigEntered.setHours(hours);
      dateTimeOrigEntered.setMinutes(minutes);
    }
    // depending on isUpdate we process the updates
    let documentNr: number;
    let document: DocumentElement;
    let documents: Array<{document: DocumentElement, documentFile?: File, documentBlob?: Blob}>
    switch (true) {
      case this.isUpdateUniqueId && this.thisForm.value.uniqueId.documentName !== '':
        // nr and cat is allowed to be changed  - nr is not able to be entered at form ...
        this.document.documentNr = Number(this.thisForm.value.uniqueId.documentNr);
        this.document.documentCategory = Number(this.thisForm.value.uniqueId.documentCategory);
        // name and extension can be changed ... but the document keeps is original fileName ...
        this.document.documentName = this.thisForm.value.uniqueId.documentName;
        this.document.documentExtension = this.thisForm.value.uniqueId.documentExtension;
        if (this.document.dateTimeOriginal && dateTimeOrigEntered
          && GlobalFunctions.getDDMMYYYY(this.document.dateTimeOriginal) === GlobalFunctions.getDDMMYYYY(dateTimeOrigEntered)
          && GlobalFunctions.getHours2String(this.document.dateTimeOriginal) + ':' + GlobalFunctions.getMinutes2String(this.document.dateTimeOriginal) === timeString) {
          // user has not changed dateTimeOrig - dateTimeOriginal remains unchanged
        } else if (dateTimeOrigEntered) {
          // we allow #### year - as 1.1.####, but date must be in past
          this.document.dateTimeOriginal = dateTimeOrigEntered.getTime > new Date().getTime ? this.document.dateTimeOriginal : dateTimeOrigEntered;
        }
        this.document.imageTitle = this.thisForm.value.uniqueId.imageTitle;
        this.document.imageLocation = this.thisForm.value.uniqueId.imageLocation;
        this.updateDocument.emit(this.document);
        break;
      case this.isUpdateBody:
        this.document.imageWidth = this.thisForm.value.bodyGroup.imageWidth;
        this.document.note = this.thisForm.value.bodyGroup.note;
        this.isShowMap = false;
        this.showMap();
        this.updateDocument.emit(this.document);
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
    this.isUpdateBody = false;
    this.errors = {};
  }

  /**
   * defining form update status as function, depending on single update flags
   *
   */
  public isUpdate(): boolean {return (this.isNew || this.isClone || this.isUpdateUniqueId || this.isUpdateBody);
  }

  /** ---------------------------- private methods exclusively used in public methods ---------------------------------- */


  /** ---------------------------- form handling methods  ---------------------------------- */


  /**
    * update form error messages
    */
  private updateErrorMessages() {
    // console.log('this.errors before check: ', this.errors);
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
        // console.log('this.errors after check: ', this.errors);
      }
    }
  }

}


