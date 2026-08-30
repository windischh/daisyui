
/**
 * IMenuStatus
 * defines status of sidebar menu in session storage
 *
 */
export interface IMenuStatus {
    isSidebarMenuLoaded: boolean;
    // directory menus are also loaded (sidebar is not more in initilzed status
    // isDirectoryMenusLoaded: boolean;
    // in pevent-log we use isIssueMenusLoaded ...
    isIssueMenusLoaded: boolean;
}

