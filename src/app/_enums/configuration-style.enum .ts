/**
 * configuration style enumerates optionAreas which have dynamic style options
 * (dynamic style options have options with "optionArea_##_xxxx_styleName"
 * where ## is number of style (00 is default style), xxxx is optionGroup)
 *
 */
export enum ConfigurationStyle {
  // invoicePrint is in pevent-invoice
  // invoicePrint = 1,
  // eventCalendar is in pEvent-log
  eventCalendar = 2,
  eventExport = 3
  }

