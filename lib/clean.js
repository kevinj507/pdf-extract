/**
 * Clean image to be ocr friendly
 *
 */
var temp = require('temp');
var path = require('path');
var exec = require('child_process').exec;
var fs = require('fs');

/**
 * @param tif_path path to the single page file on disk containing a scanned image of text
 * @param {Array} options is an optional list of flags to pass to the tesseract command
 * @return {String} extract the extracted ocr text output
 * @return callback(<maybe error>, stdout)
 */
module.exports = function(tif_path, options, callback) {
  fs.exists(tif_path, function (exists) {
    if (!exists) { return callback('error, no file exists at the path you specified: ' + tif_path); }
    var output_path = temp.path({prefix: 'tif_clean_output', suffix: '.tif'});

    if (!options) {
      // default text cleaner flags
      options = [
      '-e none',
      '-f 10',
      '-o 5'
      ];
    }

    var cmd = 'textcleaner ' + options.join(' ') + ' "' + tif_path + '" "' + output_path + '"';
    console.log(cmd);
    var child = exec(cmd, function (err, stdout, stderr) {
      if (err) { return callback(err); }
      return callback(null, output_path);
    });

    return true;
  });
};
