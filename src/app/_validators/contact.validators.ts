import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ContactService } from '../_services/contact.service';

export class ContactValidators {


  /**
   * contact must not have userName which already exists 
   * validator function
   */
  static contactNrExists(cs: ContactService,  existingNr: number): ValidatorFn {
    return function(control: AbstractControl): ValidationErrors | null {
      const nr = Number(control.get('contactNr')?.value);
      // console.log('existsValidor for nr: ', nr, 'existingNr: ', existingNr );
      const contactNrExists = cs.checkContactNr(nr, 'ContactNrExistsValidator');
      // console.log('nr exists: ', nr, contactNrExists);
      return contactNrExists === false ||  (existingNr > 0 && existingNr === nr)
      ? null  
      : { contactNrExists: { valid: false }};
    };
  }

}
