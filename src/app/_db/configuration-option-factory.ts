
import { ConfigurationOption } from './configuration-option';
import { ConfigurationOptionRaw } from './configuration-option-raw';

export class ConfigurationOptionFactory {

  static empty(): ConfigurationOption {
    return new ConfigurationOption(0, 0, '', '', 0, '', null,  null, null, null, null,
    0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawOption: ConfigurationOptionRaw): ConfigurationOption {
    return new ConfigurationOption(
      rawOption.optionId,
      rawOption.mandantId,
      rawOption.optionName,
      rawOption.optionArea,
      rawOption.optionNr,
      rawOption.optionDescription,
      rawOption.optionBooleanValue,
      rawOption.optionStringValue,
      rawOption.optionIntValue,
      rawOption.optionNumericValue,
      typeof(rawOption.optionDateValue) === 'string' ?
      new Date(rawOption.optionDateValue) : rawOption.optionDateValue,
      rawOption.type,
      rawOption.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawOption.created) === 'string' ?
      new Date(rawOption.created) : rawOption.created,
      rawOption.createdBy,
      rawOption.releaseCreated,
      typeof(rawOption.updated) === 'string' ?
      new Date(rawOption.updated) : rawOption.updated,
      rawOption.updatedBy,
      rawOption.releaseUpdated,
      rawOption.version
    );
  }

}
