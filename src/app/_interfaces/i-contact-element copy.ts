/**
 * IContactElement
 * general structure for  elements which have type
 * used in contacts (for email, tel with various types)
 */
export interface IContactElement {
  value: string,
  type?: string,
  elementArray?: Array<string>
}
