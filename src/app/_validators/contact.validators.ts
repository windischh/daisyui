import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ContactService } from '../_services/contact.service';

export class ContactValidators {

 /**
 * Contact  must not have nr which already exist
 *  (except it is nr of just maintained record = existingNr)
 *  and maint level must by >= 1
 * (async) validator function



  static contactNrExists(cs: ContactService, serviceLevel: number, maintLevel: number,
    existingNr: number): ValidatorFn  {
    return function(control: AbstractControl): ValidationErrors | null {
      const nr = Number(control.get('contactNr')?.value);
      console.log('existsValidor for nr: ', nr, 'existingNr: ', existingNr );
      const ContactNrExists = cs.checkContactNr(nr, 'ContactNrExistsValidator');
      // console.log('nr exists: ', nr, ContactNrExists);
      return (contactNrExists: boolean)  => (existingNr > 0 && existingNr === nr) || (exists === false && serviceLevel >= 1 && maintLevel >= 1)
          ? null : {ContactExists: { valid: false }};
    };
  }
     */

  /**
     * user  must not have userName which already exists 
     *  (except userName is not changed in form  ...)
     * validator function
     */
  
    static contactNrExists(cs: ContactService,  existingNr: number): ValidatorFn {
      return function(control: AbstractControl): ValidationErrors| null {
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
