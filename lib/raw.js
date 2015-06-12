/**
 * Module which extracts the text out of an electronic pdf file
 * This module can handle multi-page pdf files

 */
var sys = require('sys');
var events = require('events');
var fs = require('fs');
var async = require('async');
var split = require('./split.js');
var convert = require('./convert.js');
var pathHash = require('pathhash');
var ocr = require('./ocr.js');
var ocrToSearchPdf = require('./ocr_to_searchable_pdf');
var rimraf = require('rimraf');
var combine = require('./combine');


function Raw(){
  if(false === (this instanceof Raw)) {
    return new Raw();
  }
}
sys.inherits(Raw, events.EventEmitter);
module.exports = Raw;

/**
 * @param {String} pdf_path path to the pdf file on disk
 * @param {Boolean} params.clean true to remove the temporary single-page pdf
 *   files from disk. Sometimes however you might want to be able to use those
 *   single page pdfs after the ocr completes. In this case pass clean = false
 *
 * @return {Array} text_pages an array of the extracted text where
 *   each entry is the text for the page at the given index
 * @return callback(<maybe error>, text_pages)
 */
Raw.prototype.process = function(pdf_path, options) {
  var self = this;
  var text_pages = [];
  var split_output;
  if (!options) {
    options = {};
  }
  // default to removing the single page pdfs after ocr completes
  if (!options.hasOwnProperty('clean')) {
    options.clean = true;
  }
  fs.exists(pdf_path, function (exists) {
    if (!exists) {
      var err = 'no file exists at the path you specified: ' + pdf_path;
      self.emit('error', { error: err, pdf_path: pdf_path});
      return
    }
    pathHash(pdf_path, function (err, hash) {
      if (err) {
        err = 'error hashing file at the path you specified: ' + pdf_path + '. ' + err;
        self.emit('error', { error: err, pdf_path: pdf_path});
        return;
      }
      split(pdf_path, function (err, output) {
        if (err) {
          self.emit('error', { error: err, pdf_path: pdf_path});
          return
        }
        if (!output) {
          err = 'no files returned from split';
          self.emit('error', { error: err, pdf_path: pdf_path});
          return;
        }
        self.emit('log', 'finished splitting pages for file at path ' + pdf_path);
        split_output = output;
        var pdf_folder = output.folder;
        var pdf_files = output.files;
        if (!pdf_files || pdf_files.length == 0) {
          err = 'error, no pages where found in your pdf document';
          self.emit('error', { error: err, pdf_path: pdf_path});
          return;
        }
        var index = 0;
        var num_pages = pdf_files.length;
        var single_page_pdf_file_paths = [];
        async.forEachSeries(
          pdf_files,
          // extract the text for each page via ocr
          function (pdf_file, cb) {
            var quality = 300;
            if (options.hasOwnProperty('quality') && options.quality) {
              quality = options.quality;
            }
            convert(pdf_file.file_path, quality, function (err, tif_path) {
              var zeroBasedNumPages = num_pages-1;
              self.emit('log', 'converted page to intermediate tiff file, page '+ index+ ' (0-based indexing) of '+ zeroBasedNumPages);
              if (err) { return cb(err); }

              if (options.outputSearchablePdf) {
                var ocr_flags = [
                  '-psm 6'
                ];
                if (options.ocr_flags) {
                  ocr_flags = options.ocr_flags;
                }
                ocrToSearchPdf(tif_path, options, function(err, single_search_pdf_path) {
                  fs.unlink(tif_path, function (tif_cleanup_err, reply) {
                    if (tif_cleanup_err) {
                      err += ', error removing temporary tif file: "'+tif_cleanup_err+'"';
                    }
                    if (err) { return cb(err); }
                    var page_number = index+1;
                    self.emit('log', 'raw ocr: page ' + index + ' (0-based indexing) of ' +zeroBasedNumPages + ' complete');
                    single_page_pdf_file_paths.push(single_search_pdf_path);
                    self.emit('page', { hash: hash, text: null, index: index, num_pages: num_pages, pdf_path: pdf_path, single_page_pdf_path: single_search_pdf_path});
                    text_pages.push('');
                    index++;
                    return cb();
                  });
                });
              } else {
                var ocr_flags = [
                  '-psm 6'
                ];
                if (options.ocr_flags) {
                  ocr_flags = options.ocr_flags;
                }
                ocr(tif_path, ocr_flags, function (err, extract) {
                  fs.unlink(tif_path, function (tif_cleanup_err, reply) {
                    if (tif_cleanup_err) {
                      err += ', error removing temporary tif file: "'+tif_cleanup_err+'"';
                    }
                    if (err) { return cb(err); }
                    var page_number = index+1;
                    self.emit('log', 'raw ocr: page ' + index + ' (0-based indexing) of ' +zeroBasedNumPages + ' complete');
                    single_page_pdf_file_paths.push(pdf_file.file_path);
                    self.emit('page', { hash: hash, text: extract, index: index, num_pages: num_pages, pdf_path: pdf_path, single_page_pdf_path: pdf_file.file_path});
                    text_pages.push(extract);
                    index++;
                    return cb();
                  });
                });
              }
            });
          }, function (err) {
            if (err) {
              self.emit('error', err);
              return;
            }

            if (options.outputSearchablePdf) {
                rimraf(pdf_folder, function(err) {
                  if (err) {
                    err += ', error removing folder containing temporary single page pdf files "' + err + '"';
                    self.emit('error', err);
                  } else {
                    combine(single_page_pdf_file_paths, function(err, searchable_pdf_path) {
                      if (err) {
                        err += ', error combining single searchable pdfs';
                        self.emit('error', err);
                      } else {
                        self.emit('complete', { hash: hash, text_pages: null, pdf_path: pdf_path, single_page_pdf_file_paths: single_page_pdf_file_paths, searchable_pdf_file_path: searchable_pdf_path});
                      }
                    });
                  }
                });
            } else {
              self.emit('complete', { hash: hash, text_pages: text_pages, pdf_path: pdf_path, single_page_pdf_file_paths: single_page_pdf_file_paths});
            }
          });
      });
    });
  });
}
