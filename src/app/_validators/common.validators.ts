import { FormControl, FormGroup } from '@angular/forms';

import { GlobalFunctions } from '../_globals/global-functions';

export class CommonValidators {

   /**
   * test correct date nterval
   *   (sync) validator function
   * for a  FormGroup, with a control dateFromString and dateToString
   */

  static dateInterval() {
    return function (controlGroup: FormGroup): { [error: string]: any } | null {
      let isValid = false;
      if (controlGroup.controls['dateFromString'] && controlGroup.controls['dateToString']) {
        const fromDate = GlobalFunctions.parseDMYtoDate(controlGroup.controls['dateFromString'].value);
        if (fromDate) {
          const toDate = GlobalFunctions.parseDMYtoDate(controlGroup.controls['dateToString'].value);
          if (toDate) {
            isValid = fromDate <= toDate;
          } 
        }
      }
      return isValid ? null : {'wrongDateInterval': {value: controlGroup.value}};
      };
    }

  /**
   * test correct date interval in case of date picker models
   *   (sync) validator function
   * for a  FormGroup, with a control dateFromModel and dateToModel
   */

  static dateModelInterval() {
    return function (controlGroup: FormGroup): { [error: string]: any } | null {
      if (!controlGroup.controls['dateFromModel'] || !controlGroup.controls['dateToModel']) {return null; }
      const f = controlGroup.controls['dateFromModel'].value.singleDate.jsDate.getTime();
      const t = controlGroup.controls['dateToModel'].value.singleDate.jsDate.getTime();
      return (f <= t) ? null : {'wrongDateInterval': {value: controlGroup.value}};
      };
    }

    /**
   * test correct interval entry in recurring order
   * interval means: number of months for which  no child order is generated
   *   (sync) validator function
   * for a  FormGroup, with a control named interval
   */

  static interval() {
    return function (controlGroup: FormGroup): { [error: string]: any } | null {
      if (!controlGroup.controls || !controlGroup.controls['interval']
        || !controlGroup.controls['dateFromModel'] || !controlGroup.controls['dateToModel']) {return null; }
      // interval 0 - create child order for every month - is ok
      let intervalOk = (Number(controlGroup.controls['interval'].value) === 0);
      const monthFrom = controlGroup.controls['dateFromModel'].value.singleDate.jsDate.getFullYear() * 100 +
       controlGroup.controls['dateFromModel'].value.singleDate.jsDate.getMonth();
      const monthTo = controlGroup.controls['dateToModel'].value.singleDate.jsDate.getFullYear() * 100 +
       controlGroup.controls['dateToModel'].value.singleDate.jsDate.getMonth();
      // monthTo follows monthFrom: only interval 0 is possible
      if (monthTo - monthFrom > 1) {
        // interval is ok if the last month is a month with a generated child order
        intervalOk = (monthTo - monthFrom) % (Number(controlGroup.controls['interval'].value) + 1) === 0;
      }
      return (intervalOk) ? null : {'wrongInterval': {value: controlGroup.value}};
      };
    }


   /**
   * test correct date in formt dd.MM.yyyy
   *  (sync) validator function
   */

  static parseDate(isFutureDateAllowed: boolean) {
    return function (control: FormControl): { [error: string]: any } | null {
      let isValid = false;
      if (control.value?.length > 0) {
        const date = GlobalFunctions.parseDMYtoDate(control.value);
        // parseDMYDate allows years from 1000 - 9999, we restrict years before and to a past date, if demanded
        if (date) {
          isValid = date.getFullYear() > 1900 && date.getFullYear() < 2999 && (isFutureDateAllowed || date.getTime() < new Date().getTime());
        }
      // an empty control has to be checked by a 'required' validator ....
      } else {
        isValid = true;
      }
      return isValid ? null : {'wrongDate': {value: control.value}};
    };
  }

 
}
