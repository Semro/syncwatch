import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/css/ui.css';
import './options.css';

function Options() {
  const title = chrome.i18n.getMessage('options_server');
  const saveButton = chrome.i18n.getMessage('options_button_save');

  const [connectionUrl, setConnectonUrl] = useState('');
  const [status, setStatus] = useState('');

  function saveOptions(formData: FormData) {
    const serverUrl = formData.get('serverUrl') as string | null;

    chrome.storage.sync.set(
      {
        connectionUrl: serverUrl,
      },
      () => {
        serverUrl && setConnectonUrl(serverUrl);
        setStatus(chrome.i18n.getMessage('options_saved'));
        setTimeout(() => {
          setStatus('');
        }, 1000);
      },
    );
  }

  useEffect(() => {
    chrome.storage.sync.get('connectionUrl').then((cu) => {
      setConnectonUrl(cu['connectionUrl']);
    });
  }, []);

  return (
    <div id="main">
      <div>
        <h1 id="options_server">{title}</h1>
        <div id="status">{status}</div>
      </div>
      <form action={saveOptions}>
        <span>URL: </span>
        <input
          className="block"
          id="serverUrl"
          type="url"
          name="serverUrl"
          defaultValue={connectionUrl}
        />
        <button className="block button" id="save" type="submit" name="save">
          {saveButton}
        </button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
