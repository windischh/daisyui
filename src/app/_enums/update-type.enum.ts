/**
 * update types
 *
 * insert, update, delete are basic operations
 * update withour reload is used in update modes where reloading of other elements can be triggered
 * setUpdate/cancelUpdate is used if a record has been marked (in model) as just beeing updated
 * enable/disable are used in rearranging (sorting order positions,...)
 *
 */
export enum UpdateType {
  insert = 'Insert',
  update = 'Update',
  updateWReload = 'UpdateWithoutReload',
  delete = 'Delete',
  setShow = 'SetShow',
  setUpdate = 'SetUpdate',
  cancelUpdate = 'CancelUpdate',
  setInsert = 'SetInsert',
  enable = 'Enable',
  multipleInsert = 'MultipleInsert',
  multipleUpdate = 'MultipleUpdate',
  copyPlanToActual = 'CopyPlanToActual',
  disable = 'Disable'}

