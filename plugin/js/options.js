const serverUrlElement = document.getElementById('serverUrl');

function saveOptions() {
  chrome.storage.sync.set(
    {
      connectionUrl: serverUrlElement.value
    },
    () => {
      const status = document.getElementById('status');
      status.innerText = 'Options saved.';
      setTimeout(() => {
        status.innerText = '';
      }, 1000);
    }
  );
}

function restoreOptions() {
  chrome.storage.sync.get('connectionUrl', obj => {
    serverUrlElement.value = obj.connectionUrl;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
