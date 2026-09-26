import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeDeAt from '@angular/common/locales/de-AT';

import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register the locale data
registerLocaleData(localeDeAt, 'de-AT');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
