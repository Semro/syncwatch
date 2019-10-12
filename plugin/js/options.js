function saveOptions(obj) {
  chrome.storage.sync.set(obj);
}

function restoreOptions() {
  chrome.storage.sync.get('options', obj => {
    console.log(obj);
  });
}
saveOptions({
  options: {
    server: {
      servers: [
        {
          name: 'Official',
          url: 'https://syncevent.herokuapp.com',
          selected: true
        },
        {
          name: 'localhost',
          url: 'https://localhost:8080',
          selected: false
        }
      ]
    }
  }
});
restoreOptions();
