import { Text } from './text';
import { TextRaw } from './text-raw';

export class TextFactory {

  static empty(): Text {
    return new Text(0, '', '', 0, '', 0,
    0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawText: TextRaw | any): Text {
    return new Text(
      rawText.textId,
      rawText.textCategory,
      rawText.textName,
      rawText.textValue,
      rawText.text,
      rawText.language,
      rawText.type,
      rawText.status,
      typeof(rawText.created) === 'string' ?
      new Date(rawText.created) : rawText.created,
      rawText.createdBy,
      rawText.releaseCreated,
      typeof(rawText.updated) === 'string' ?
      new Date(rawText.updated) : rawText.updated,
      rawText.updatedBy,
      rawText.releaseUpdated,
      rawText.version
    );
  }

}


