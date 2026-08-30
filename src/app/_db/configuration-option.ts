/*
  detailed description -see: pEvent-invoice
*/
export class ConfigurationOption {
  constructor (
    public optionId: number,
    public mandantId: number,
    public optionName: string,
    public optionArea:  string,
    public optionNr:  number,
    public optionDescription:    string,
    public optionBooleanValue: number | null,
    public optionStringValue:  string | null,
    public optionIntValue:    number | null,
    public optionNumericValue:  number | null,
    public optionDateValue:  Date | null,
    public type: number,
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
    public isDeleteable?: boolean,
    public style?: number,
    public optionGroup?: number,
    public optionGroupName?: string,
    public name?: string,
    public nameKey?: string,
    public txt?: string,
    public value?: string,
    public typeText?: string
  ) {}
}
