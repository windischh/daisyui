import { AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

import { DocumentService } from '../_services/document.service';

export class DocumentValidators {

 

  /**
  * document must not have nr or fileName which already exist
   *  (except it is nr of just maintained record = existingNr, existingFileName)
   * @param ds document service
   * @param type 
   * @param existingNr
   * @returns validator function
   */
  static documentNrExists(ds: DocumentService, type: number, existingNr: number): ValidatorFn {
    return function(control: AbstractControl): ValidationErrors | null {
      const nr = Number(control.get('documentNr')?.value);
      const documentNrExists = ds.checkDocumentNr(type, nr, 'documentNrExistsValidator', true);
      return documentNrExists === false || (existingNr > 0 && existingNr === nr)
       ? null 
       : {documentNrExists: { valid: false }};
    };
  }

  /**
   * documentNameExists()
   * check if file name exists
   *  check function delivers names of documents which are not disabled, independent of type and documentCategory
   * @param ds documentService which delivers check function
   * @param existingFileName file name may exist if control refers to an existing file name
   * @param existingFileExtension  may exist if control refers to an existing file name
   * @returns ValidationErrors: documentFileNameExists
   */
  static documentNameExists(ds: DocumentService, existingFileName: string, existingFileExtension: string): ValidatorFn {
    return function(control: AbstractControl): ValidationErrors | null {
      const fileName: string = control.get('documentName')?.value;
      const fileExtension: string = control.get('documentExtension')?.value;
      const documentNameExists = ds.checkDocumentName(fileName, fileExtension, 'documentNameExistsValidator');
      return documentNameExists === false 
       || (existingFileName !== '' && existingFileName === fileName && existingFileExtension !== '' && existingFileExtension === fileExtension) 
       ? null 
       : {documentNameExists: { valid: false }};
    };
  }


}
