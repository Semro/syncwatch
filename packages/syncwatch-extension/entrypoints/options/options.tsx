import React from 'react';
import ReactDOM from 'react-dom/client';

import '@gravity-ui/uikit/styles/styles.css';
import '@/css/theme.css';
import { Button, Flex, Label, Text, TextInput, ThemeProvider } from '@gravity-ui/uikit';

function Options() {
  const title = browser.i18n.getMessage('options_server');
  const saveButton = browser.i18n.getMessage('options_button_save');

  const [connectionUrl, setConnectonUrl] = useState('');
  const [status, setStatus] = useState('');

  function saveOptions(formData: FormData) {
    const serverUrl = formData.get('serverUrl') as string | null;

    browser.storage.sync.set(
      {
        connectionUrl: serverUrl,
      },
      () => {
        serverUrl && setConnectonUrl(serverUrl);
        setStatus(browser.i18n.getMessage('options_saved'));
        setTimeout(() => {
          setStatus('');
        }, 1000);
      },
    );
  }

  useEffect(() => {
    browser.storage.sync.get('connectionUrl').then((cu) => {
      setConnectonUrl(cu['connectionUrl']);
    });
  }, []);

  return (
    <Flex direction="column" gap={2} data-testId="screenshot">
      <Text variant="header-1">{title}</Text>
      <form action={saveOptions}>
        <Flex direction="column" gap="2">
          <TextInput
            label="URL: "
            type="url"
            name="serverUrl"
            defaultValue={connectionUrl}
            id="input-server-url"
          />
          <Flex justifyContent={'right'} alignItems={'center'} gap="2">
            <Label theme="success" size="s">
              {status}
            </Label>
            <Button type="submit" name="save" view="action">
              {saveButton}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Flex>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Options />
    </ThemeProvider>
  </React.StrictMode>,
);
