/* eslint-disable node/no-unpublished-require */
/* eslint-disable import/no-extraneous-dependencies */
const csvLocales = require('csv-locales');

const params = {
  csvPath: 'locales/locales.csv',
  dirPath: 'plugin/_locales',
};

csvLocales(params, (err) => {
  if (err) {
    throw err;
  }
});
