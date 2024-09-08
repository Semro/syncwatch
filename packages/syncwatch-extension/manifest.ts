const manifest = {
  '{{firefox}}.manifest_version': 2,
  '{{chrome}}.manifest_version': 3,
  name: '__MSG_appName__',
  description: '__MSG_appDesc__',
  version: '0.520',
  default_locale: 'en',
  options_ui: {
    page: 'options.html',
    open_in_tab: false,
  },
  '{{firefox}}.background': {
    persistent: true,
    scripts: ['js/background.ts'],
  },
  '{{chrome}}.background': {
    service_worker: 'js/background.ts',
  },
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '96': 'icons/icon96.png',
    '128': 'icons/icon128.png',
  },
  '{{firefox}}.browser_action': {
    default_icon: 'icons/icon128.png',
    default_title: 'SyncWatch',
    default_popup: 'popup.html',
  },
  '{{chrome}}.action': {
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '96': 'icons/icon96.png',
      '128': 'icons/icon128.png',
    },
    default_title: 'SyncWatch',
    default_popup: 'popup.html',
  },
  '{{chrome}}.incognito': 'split',
  '{{firefox}}.permissions': ['<all_urls>', 'tabs', 'storage', 'notifications'],
  '{{chrome}}.permissions': ['tabs', 'storage', 'notifications', 'scripting'],
  '{{chrome}}.host_permissions': ['<all_urls>'],
  content_scripts: [
    {
      matches: ['https://www.netflix.com/*'],
      js: ['js/players/netflix/loadNetflix.js'],
    },
  ],
  '{{firefox}}.web_accessible_resources': ['js/players/netflix/netflix.js'],
  '{{chrome}}.web_accessible_resources': [
    {
      resources: ['js/players/netflix/netflix.js'],
      matches: ['https://www.netflix.com/*'],
    },
  ],
  '{{firefox}}.browser_specific_settings': {
    gecko: {
      id: '{7558bb02-8595-4b93-b3bc-9f34319e9c4a}',
    },
  },
} as const;

export default manifest;
