/**
 * IWorSelectChoice
 * general structure to handle choices of events
 */
 export interface IEventSelectChoice {
  nr: number,
  name: string,
  contactNr?: number,
  userName?: string,
  dateFrom: Date,
  dateTo: Date,
  isPlan: boolean,
  isSelected: boolean
}
