[![GitHub release](https://img.shields.io/github/v/release/semro/syncwatch.svg)](https://github.com/semro/syncwatch/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE.md)
[![Telegram](https://img.shields.io/badge/telegram-syncwatch-blue.svg?logo=telegram&label=Telegram)](https://t.me/syncwatch)
[![Discord](https://discordapp.com/api/guilds/483775330524332032/widget.png?style=shield)](https://discord.gg/7AYpju4)
<img src="plugin/icons/icon128.png" alt="SyncWatch logo" align="right" />

# SyncWatch

SyncWatch is extension for browsers which lets you watch videos together with friends synchrounosly.

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />Firefox ](https://addons.mozilla.org/firefox/addon/syncwatch/) | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />Chrome](https://chrome.google.com/webstore/detail/syncwatch/ggiafipgeeaaahnjamgpjcgkdpanhddg) | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px" />Opera](https://addons.opera.com/extensions/details/syncwatch/) |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## How to use

1. Install extension.
1. Click on plugin icon.
1. Write your name and room name. (If room is not exist it will be created)
1. Click 'connect'.
1. Share name of the room with friends. They must follow this instruction (1-4 steps).
1. Go to the page where video is located.
1. Click 'share' to send link in room.
1. Other in room should open this link.

## Run server locally

To get a local copy up and running follow these simple steps.

1. Clone the repo

```sh
git clone https://github.com/Semro/syncwatch.git
```

2. Move to the project directory

```sh
cd syncwatch
```

3. Install NPM packages

```sh
npm ci
```

4. Run the server

```sh
npm run start
```

- Run the server on other port

```sh
  npx cross-env PORT=8080 node server.js
```

## How to add a localization

1. Determine an ISO language code such as `en` referring to [kLanguageInfoTable](https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc).
1. Add a column to [locales.csv](locales/locales.csv) with language code at the top cell.
1. Add translated messages in following cells.
1. Generate localized files with `npm run locales` (optional step, you can just pull request .csv file).

## License

[MIT](https://choosealicense.com/licenses/mit/)
