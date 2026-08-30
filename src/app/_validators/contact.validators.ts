import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ContactService } from '../_services/contact.service';

export class ContactValidators {

 /**
 * Contact  must not have nr which already exist
 *  (except it is nr of just maintained record = existingNr)
 *  and maint level must by >= 1
 * (async) validator function
 */


  static contactNrExists(cs: ContactService, serviceLevel: number, maintLevel: number,
    existingNr: number): ValidatorFn  {
    return function(control: AbstractControl): ValidationErrors | null {
      const nr = Number(control.get('ContactNr')?.value);
      const ContactNrExists = cs.checkContactNr(nr, 'ContactNrExistsValidator');
      return (exists: boolean)  => (existingNr > 0 && existingNr === nr) || (exists === false && serviceLevel >= 1 && maintLevel >= 1)
          ? null : {ContactExists: { valid: false }};
    };
  }

}
