import { Provider } from '../_db/provider';

/**
 * IProviderItemsFound
 *  object which is returend by gettingitems from provider
 */
export interface IProviderItemsFound {
  /* isDataFound true: we got data from provider  */
  isDataFound: boolean;
  /* isLoginNecessary: true we need provider login  */
  isLoginNecessary: boolean;
  /* provider to whom this data belongs */
  provider: Provider;
  /* itemsrs  */
  items: Array<string> | null;
}
