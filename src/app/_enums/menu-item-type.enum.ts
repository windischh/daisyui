/**
 * menu item type
 *
 */
export enum MenuItemType {
  undefined = 0,
  itemIsDocumentsArea = 1,
  itemIsDocumentsDirectory = 2,
  itemIsDirectoryArea = 3,
  itemIsDirectory = 4,
  itemIsNextRoot = 5,
  itemHasProviderMenu = 6,
  itemHasFilterMenu = 7,
  /* item is an issue and has subtasks  
  */
  itemHasIssueMenu = 8,
  itemIsDocument = 11,
  itemIsFile = 12,
  itemIsFilesRest = 13,
  /* item is an issue without subtasks  */
  itemIsAnIssue = 14
}
