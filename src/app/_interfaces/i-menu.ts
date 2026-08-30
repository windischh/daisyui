import { IMenuItem } from "./i-menu-item";

export interface IMenu {
  menuName: string;
  text: string;
  items: IMenuItem[];
}
