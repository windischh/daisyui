export const environment = {
  production: false,
  systemName: 'daisytest development test ng serve :4360/:3360',
  // info for user in status line about test server environment
  userEnvironmentInfo: 'test ng serve',
  providers: [
    {"comment": "web server provider stores data at WEBDAV server - used only for server logs in the moment",
    "providerName": "web server",
    "providerUrl": "/data",
    "isProviderAvailable": true,
    "maxProviderRetries": 3,
    "type": 2
    },
    {"comment": "immich provider for images",
    "providerName": "immich test server",
    "providerUrl": "/api",
    "providerDocumentsUrl": "/linkedDocuments",
    "isProviderAvailable": true,
    "maxProviderRetries": 3,
    "type": 5
    }
  ],
  // contact service level
  sessionConfiguration: {"contactServiceLevel": 1, "sessionDuration": 30},
  // shall messages for user be shown at bottom of view
  userMessages: true,
  // logLevel 1 for debug
  logLevel: 1,
  logPublishers: [
    {
      "loggerName": "console",
      "loggerLocation": "",
      "isActive": true
    },
    {
      "loggerName": "localStorage",
      "loggerLocation": "logging",
      "isActive": true
    },
    {
      "loggerName": "webApi",
      "loggerLocation": "",
      "isActive": false
    },
    {
      "loggerName": "webServer",
      "loggerLocation": "/log/daisytest-logfile/logs.json",
      "loggerUser": "admin",
      "loggerAuth": "admin_pw",
      "isActive": true
    },
    {
      "loggerName": "webDirectory",
      // logs are sent anyway to a location beneath log url
      // at /logs the log files are archived and reorganized ...
      "loggerLocation": "/logs",
      "isActive": true
    }
  ]
};
