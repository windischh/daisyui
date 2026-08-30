
/**
 * IConfiguratioArea
 *  are of Configuration
  */
export interface IConfigurationArea {
  optionArea: string,
  // count of active options in this area
  count: number,
  isAreaMaint?: boolean,
  styles?: number,
  areaNr?: number,
  areaText?: string
}
