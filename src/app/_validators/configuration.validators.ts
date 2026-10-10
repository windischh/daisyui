import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';

import { ConfigurationService } from '../_services/configuration.service';


export class ConfigurationValidators {

  static optionNameExists(cs: ConfigurationService, existingName: string): AsyncValidatorFn {
    return async function(control: AbstractControl): Promise<ValidationErrors|null> {
      const name = control.get('optionName')?.value;
      const optionNameExists = cs.checkConfigurationOptionName(name, 'configurationExistsValidator');
      return optionNameExists.then(exists =>
        (existingName &&  existingName !== '' && existingName === name) || (exists === false)
          ? null : {configurationOptionExists: { valid: false }}
        );
   };
 }


}
