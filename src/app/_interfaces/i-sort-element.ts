import { KeyCode } from './../_enums/key-code.enum';

/**
 * ISortlement
 *
 */
export interface ISortElement {
  /* name of sort field
  */
  sortField: string;
  /* name of the key (object property)
  */
  key: string;
  /* if key belongs to an object (in the first level below sorted object)
    object has name of the object */
  object?: string;
  /* datePart can be y,m,d,h
  (lower or upper case) */
  datePart?: string;
  /* asc or desc */
  order?: string;
  /* when 2 objects are compared - has this sortField changed? */
  isFieldChanged?: boolean;
}
