/**
 * IWorSelectChoice
 * general structure to handle choices of events
 */
 export interface IEventSelectChoice {
  nr: number,
  name: string,
  custIssueNr?: string,
  userName?: string,
  dateFrom: Date,
  dateTo: Date,
  isPlan: boolean,
  isSelected: boolean
}
