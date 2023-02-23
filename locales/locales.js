/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable-next-line node/no-unpublished-import */
import csvLocales from 'csv-locales';

const params = {
  csvPath: 'locales/locales.csv',
  dirPath: 'plugin/_locales',
};

csvLocales(params, (err) => {
  if (err) {
    throw err;
  }
});
