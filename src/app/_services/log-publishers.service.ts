import { IAuthorization } from '../_interfaces/i-authorization';
import { Injectable, Inject } from '@angular/core';

import { LogPublisher, LogConsole, LogLocalStorage, LogWebApi, LogWebServer, LogWebDirectory } from './log-publishers';
import { FetchApiService } from './fetch-api.service';

import { environment } from '../../environments/environment';


/* in the moment all publisher configuration is done via environment configuration
const PUBLISHERS_FILE =
  'assets/log-publishers.json';
*/


/**
 * LogPublisherConfig objects are built from configuration, in /assets, in json format
 */
class LogPublisherConfig {
    loggerName!: string;
    loggerLocation!: string;
    isActive!: boolean;
  }

/**
 * LogPublisherService builds the configured publishers inside the service object
 */
@Injectable({
  providedIn: 'root'
})
export class LogPublishersService {

  name = 'LogPublishersService';

  // public properties
  publishers: LogPublisher[] = [];

  constructor(
    private fetch: FetchApiService) {
    // Build publishers array
    this.buildPublishers();
  }

  /**
   * buildPublishers - depending on PUBLISHERS
  */
  buildPublishers() {
    let logPub: LogPublisher | null;
    // console.log('config array: ', response);
    // in case of config error we use default configuration:
    if (environment.logPublishers === undefined || environment.logPublishers === null || environment.logPublishers.length === 0) {
      // Create instance of LogConsole Class
      const pubConsole = new LogConsole();
      pubConsole.name = 'console';
      this.publishers.push(pubConsole);
      // Create instance of LogLocalStorage Class
      const pubLocalStorage = new LogLocalStorage();
      pubLocalStorage.name = 'localStoragee';
      this.publishers.push(pubLocalStorage);
    } else {
      for (const pub of environment.logPublishers.filter(p => p.isActive)) {
        switch (pub.loggerName.toLowerCase()) {
          case 'console':
            logPub = new LogConsole();
            break;
          case 'localstorage':
            logPub = new LogLocalStorage();
            break;
          case 'webapi':
            logPub = new LogWebApi(this.fetch);
            break;
          case 'webserver':
            logPub = new LogWebServer(this.fetch);
            break;
          case 'webdirectory':
            logPub = new LogWebDirectory(this.fetch);
            break;
          default:
            logPub = null;
        }
        if (logPub) {
          // Set location of logging
          logPub.location = pub.loggerLocation;
          logPub.user = pub.loggerUser ?? '';
          logPub.auth = pub.loggerAuth ?? '';
          logPub.name = pub.loggerName;
          // Add publisher to array
          this.publishers.push(logPub);
          logPub = null;
        }
      }
    }
  }
}


