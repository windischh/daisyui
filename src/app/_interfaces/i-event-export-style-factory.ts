import { COMMA, CRLF, DOUBLE_QUOTATION_MARK } from '../_globals/constants';
import { IEventExportStyle } from './i-event-export-style';

/**
 * IEventStyle
 * used in EventExport
 */

export class IEventExportStyleFactory {

  static default(): IEventExportStyle {
    return {
      columnDelimiter: COMMA,
      stringDelimiter: DOUBLE_QUOTATION_MARK,
      rowDelimiter: CRLF,
      mimeType: 'text/csv',
      charset: 'utf-8',
      fileName: 'eventExport',
      isFileExtension: true,
      fileType: 'csv',
      isColumnHeaders: true
    };
  }

}

