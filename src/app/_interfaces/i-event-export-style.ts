import { CalendarEvent } from '../_db/calendar-event';

/**
 * IEventExportStyle
 * used in EventExport for styling csv files
 */
export interface IEventExportStyle {
  [key: string]: any,
  columnDelimiter: string,
  stringDelimiter: string,
  rowDelimiter: string,
  mimeType: string,
  charset: string,
  fileName: string,
  isFileExtension: boolean,
  fileType: string,
  isColumnHeaders: boolean
}
