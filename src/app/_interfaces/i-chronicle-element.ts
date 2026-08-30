/**
 * IChronicleElement
 * general structure to handle chronicle entries for year/month
 */
export interface IChronicleElement {
  year: number,
  quarter: number,
  month: number,
  day: number,
  documentsCount: number,
  eventsCount: number,
  isElementShown: boolean,
  subElements?: Array<IChronicleElement>
}
