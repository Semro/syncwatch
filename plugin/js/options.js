const serverUrlElement = document.getElementById('serverUrl');

function saveOptions() {
  chrome.storage.sync.set(
    {
      connectionUrl: serverUrlElement.value
    },
    () => {
      const status = document.getElementById('status');
      status.innerText = chrome.i18n.getMessage('options_saved');
      setTimeout(() => {
        status.innerText = '';
      }, 1000);
    }
  );
}

function restoreOptions() {
  document.getElementById('options_server').innerText = chrome.i18n.getMessage('options_server');
  document.getElementById('options_server_warning').innerText = chrome.i18n.getMessage(
    'options_server_warning'
  );
  document.getElementById('save').value = chrome.i18n.getMessage('options_button_save');

  chrome.storage.sync.get('connectionUrl', obj => {
    serverUrlElement.value = obj.connectionUrl;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
