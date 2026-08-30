/**
 * IView
 * general structure to handle user-selectable views
 */
export interface IView {
  name: string;
  displayName: string;
  isSelected: boolean;
  isAutoSelected: boolean;
  isSelectable: boolean;
  // some childs can form groups
  group?: string;
  // some child components have usage as a parameter which defines behaviour of child component
  usage?: string;
}
