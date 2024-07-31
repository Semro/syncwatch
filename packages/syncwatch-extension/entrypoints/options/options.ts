const statusElement = document.getElementById('status') as HTMLElement;
const titleElement = document.getElementById('options_server') as HTMLElement;
const warningElement = document.getElementById('options_server_warning') as HTMLElement;

const serverUrlInputElement = document.getElementById('serverUrl') as HTMLInputElement;
const saveButtonElement = document.getElementById('save') as HTMLButtonElement;

function saveOptions() {
  chrome.storage.sync.set(
    {
      connectionUrl: serverUrlInputElement.value,
    },
    () => {
      statusElement.innerText = chrome.i18n.getMessage('options_saved');
      setTimeout(() => {
        statusElement.innerText = '';
      }, 1000);
    },
  );
}

function restoreOptions() {
  titleElement.innerText = chrome.i18n.getMessage('options_server');
  warningElement.innerText = chrome.i18n.getMessage('options_server_warning');
  saveButtonElement.value = chrome.i18n.getMessage('options_button_save');

  chrome.storage.sync.get('connectionUrl', (obj) => {
    serverUrlInputElement.value = obj.connectionUrl;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
saveButtonElement.addEventListener('click', saveOptions);
