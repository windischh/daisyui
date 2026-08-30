
export class Provider {
  constructor (
    /* to allow comment in json structure - not used by application  */
    public comment: string,
    /**
     * providerId is unique for all providerss in local storage
     * pEvent builds one client issue provider anyway, with type = 1, providerId = 1
     * more providers are added due to configuration - they must have types > 1
     * (only 1 provider with type 2 server)
     */
    public providerId: number,
    /* providerName */
    public providerName: string,
    /* providerUrl provider url for restAPI login
      provider url must be unique in system and should have the same issueProviderId
      (generated from envorinment issueProviders - which should not change during system lifetime ...)
      */
    public providerUrl: string,
     /* providerDocumentsUrl  url for documents */
    public providerDocumentsUrl: string,
    /* detailed  description of provider 	*/
    public description: string,
    /* provider availability is decided in environment
      if set to false in configuration, no attempt to fetch data is made ..
      (might also be set in app - but not used yet)
    */
    public isProviderAvailable: boolean,
    /* number of retries after login data entry
	  */
    public maxProviderRetries: number,
    /* provider type 0 = undefined, 1 = client issue provider, 2 = server issue provider, 3 = jira issue provider, 4 = trello issue provider, ....
	  */
    public type: number,
    /* 0 = undefined
    9 automatic disabled , 90 = manually disabled */
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
