/**
 * Tests ocr extraction for a multi-page raw scan pdf file
 */
var assert = require('assert');
var inspect = require('eyespect').inspector({maxLength:20000});
var path = require('path');
var should = require('should');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');

var pdf = require('../main.js');
var pathHash = require('pathhash');

var get_desired_text = function(text_file_name, callback) {
  var relative_path = path.join('test_data',text_file_name);
  var text_file_path = path.join(__dirname, relative_path);
  fs.readFile(text_file_path, 'utf8', function (err, reply) {
    should.not.exist(err);
    should.exist(reply);
    return callback(err, reply);
  });
};

describe('08 OCR to searchable pdf test', function() {
  var file_name = 'multipage_raw.pdf';
  var relative_path = path.join('test_data',file_name);
  var pdf_path = path.join(__dirname, relative_path);
  var options = {
    type: 'ocr',
    outputSearchablePdf: true,
    ocr_flags: [
      '-l eng',
      '-psm 3'
    ],
    clean: false, // keep the temporary single page pdf files
    doTextCleaning: true
  };

  var hash;
  before(function(done) {
    pathHash(pdf_path, function (err, reply) {
      should.not.exist(err, 'error getting sha1 hash of pdf file at path: ' + pdf_path + '. ' + err);
      should.exist(reply, 'error getting sha1 hash of pdf file at path: ' + pdf_path + '. No hash returned from hashDataAtPath');
      hash = reply;
      done();
    });
  });

  var searchable_pdf_path;
  it('should create searchable pdf from multipage raw scan pdf', function(done) {
    console.log('\nPlease be patient, this test make take a minute or more to complete');
    this.timeout(240*1000);
    this.slow(120*1000);
    var processor = pdf(pdf_path, options, function (err) {
      should.not.exist(err);
    });

    processor.on('error', function(err) {
      should.not.exist(err, 'error in raw processing: ' + err);
      done();
    });

    processor.on('complete', function(data) {
      data.should.have.property('text_pages');
      data.should.have.property('pdf_path');
      data.should.have.property('single_page_pdf_file_paths');
      data.should.have.property('searchable_pdf_file_path');

      inspect(data.searchable_pdf_file_path, 'output');

      var textExtract = pdf(data.searchable_pdf_file_path, { type: 'text' }, function(err) {
        should.not.exist(err);
      });

      textExtract.on('log', function(data) {
        inspect(data, 'log data');
      });

      textExtract.on('complete', function(data) {
        data.should.have.property('text_pages');
        _.each(data.text_pages, function(text_page, i) {
          console.log(text_page);
        });
        done();
      });

      textExtract.on('error', function(err) {
        should.not.exist(err, 'error in extracting text from searchable pdf: ' + err);
        done();
      });
    });
    processor.on('log', function(data) {
      inspect(data, 'log data');
    });

    processor.on('command', function(data) {
      inspect(data, 'command');
    });

    var page_event_fired = false;
    processor.on('page', function(data) {
      page_event_fired = true;
      data.should.have.property('index');
      data.should.have.property('pdf_path');
      data.should.have.property('text');
      data.pdf_path.should.eql(pdf_path);
    });
  });
});
