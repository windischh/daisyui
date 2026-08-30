export interface ConfigurationOptionRaw {
    optionId: number;
    mandantId: number;
    optionName: string;
    optionArea:  string;
    optionNr:  number;
    optionDescription:    string;
    optionBooleanValue: number | null;
    optionStringValue:  string | null;
    optionIntValue:    number | null;
    optionNumericValue:  number | null;
    optionDateValue:  Date | null;
    type: number;
    status: number;
    created: Date;
    createdBy: string;
    releaseCreated: number;
    updated: Date | null;
    updatedBy: string;
    releaseUpdated: number;
    version: number;
}
