/**
 * Converts a pdf file at a given path to a tiff file with
 * the GraphicsMagick command "combine"
 */
var temp = require('temp');
var path = require('path');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');


/**
 * @param input_path the path to a pdf file on disk. Since GhostScript requires random file access, we need a path
 *   to an actual file rather than accepting a stream
 * @param {String} quality is an optional flag that controls the quality of the pdf to tiff conversion.
 * @return {String} output_path the path to the converted tif file
 * @return callback(<maybe error>, output_path)
 */
exports = module.exports = function combine(input_paths, callback) {
  // options is an optional parameter
  if (!callback || typeof callback != "function") {
    callback = quality;   // callback must be the second parameter
    quality = undefined;  // no option passed
  }

  var output_path = temp.path({prefix: 'ocr_searchable_output', suffix:'.pdf'});
  var options = [
    '-sDEVICE=pdfwrite',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sOutputFile=' + output_path,
    input_paths.join(' ')
  ];
  var cmd = 'gs ' + options.join(' ');
  console.log(cmd);
  var child = exec(cmd, function (err, stderr, stdout) {
    if (err) {
      return callback(err);
    }
    return callback(null, output_path);
  });
}
