let csvLocales = require('csv-locales');

let params = {
  csvPath: 'locales.csv',
  dirPath: '../plugin/_locales',
};

csvLocales(params, (err) => {
  if (err) {
    throw err;
  }
});
