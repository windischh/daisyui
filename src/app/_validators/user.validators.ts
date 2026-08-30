import { FormGroup } from '@angular/forms';
import { UserService } from '../_services/user.service';

export class UserValidators {
  
  /**
   * user  must not have userName which already exists 
   *  (except userName is not changed in form  ...)
   * validator function
   */

  static userNameExists(us: UserService, userName: string) {
    return function(controlGroup: FormGroup): { [error: string]: any } | null {
      const userNameExists = us.checkUserName(controlGroup.controls['userName'].value, 'userNameExistsValidator');
      return userNameExists && controlGroup.controls['userName'].value !== userName 
        ? { userNameExists: { valid: false }}
        : null;
    };
  }


}