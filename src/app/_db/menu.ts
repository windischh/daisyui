import { IMenu } from "../_interfaces/i-menu";
import { MenuItem } from "./menu-item";

export class Menu implements IMenu{
  constructor (
    /**
     * menuId can be a uniqueId to get this menu from a menu storage
     */
    public menuId: number,
    /**
     * menuCategory is used to structure menus
     *  menu elements with category "subMenu" are not used to form a root menu element
     */
    public menuCategory: string,
    /**
     * menuName can be a uniqueId to get this menu from a menu storage
     */
    public menuName: string,
    /**
     * text is important at root level - there we show it
     * (at subMenu level we show text of item to which the menu belongs)
     * but this text plays a role if:
     * - we show this text if we set menu visible
     */
    public text: string,
    public isVisible: boolean,
    public items: MenuItem[],
    /**
     * in case of type 6 or higher providerId is > 0
    */
    public providerId: number,
     /*
      in case of directory menus ...
    */
    public directoryHandle: FileSystemDirectoryHandle | null,
    /**
     * menu tpye is used by menu service
     * when building menu with directories, menu with
     *  - documents area gets type 1
     *  - documents directory gets type 2
     *  - directory area gets type 3
     *  - directory root gets type 4
     *  - directory gets type 5
     * when building menu with issues, menu with
     *  - an issue provider root gets type 6
     *  - filter gets type 7
     *  - issue gets type 8
    * when building immich menu, menu with
     *  - an immich provider root gets type 9
     *  - issue gets type 10
     * (attention: menu itself can be category subMenu or rootMenu)
     * 0 = default menu elements
     */
    public type: number,
    /*
      status = 0 per default
      status 9 (disabled) is used temporarely during deleteion of menu trees
    */
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
  ) { }
}
