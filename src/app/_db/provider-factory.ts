import { Provider } from './provider';
import { ProviderRaw } from './provider-raw';

export class ProviderFactory {


  static empty(): Provider {
    return new Provider('', 0, '', '', '', '',
      false, 0,
      0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawProvider: ProviderRaw): Provider {
    return new Provider(
      rawProvider.comment,
      rawProvider.providerId,
      rawProvider.providerName,
      rawProvider.providerUrl,
      rawProvider.providerDocumentsUrl,
      rawProvider.description,
      rawProvider.isProviderAvailable,
      rawProvider.maxProviderRetries,
      rawProvider.type,
      rawProvider.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawProvider.created) === 'string' ?
      new Date(rawProvider.created) : rawProvider.created,
      rawProvider.createdBy,
      rawProvider.releaseCreated,
      typeof(rawProvider.updated) === 'string' ?
      new Date(rawProvider.updated) : rawProvider.updated,
      rawProvider.updatedBy,
      rawProvider.releaseUpdated,
      rawProvider.version
    );
  }
}
