/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 43);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

var fs = __webpack_require__(2)
var polyfills = __webpack_require__(50)
var legacy = __webpack_require__(52)
var clone = __webpack_require__(54)

var queue = []

var util = __webpack_require__(55)

function noop () {}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function() {
    debug(queue)
    __webpack_require__(13).equal(queue.length, 0)
  })
}

module.exports = patch(clone(fs))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs)
    fs.__patched = true;
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
module.exports.close = (function (fs$close) { return function (fd, cb) {
  return fs$close.call(fs, fd, function (err) {
    if (!err)
      retry()

    if (typeof cb === 'function')
      cb.apply(this, arguments)
  })
}})(fs.close)

module.exports.closeSync = (function (fs$closeSync) { return function (fd) {
  // Note that graceful-fs also retries when fs.closeSync() fails.
  // Looks like a bug to me, although it's probably a harmless one.
  var rval = fs$closeSync.apply(fs, arguments)
  retry()
  return rval
}})(fs.closeSync)

// Only patch fs once, otherwise we'll run into a memory leak if
// graceful-fs is loaded multiple times, such as in test environments that
// reset the loaded modules between tests.
// We look for the string `graceful-fs` from the comment above. This
// way we are not adding any extra properties and it will detect if older
// versions of graceful-fs are installed.
if (!/\bgraceful-fs\b/.test(fs.closeSync.toString())) {
  fs.closeSync = module.exports.closeSync;
  fs.close = module.exports.close;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch
  fs.FileReadStream = ReadStream;  // Legacy name.
  fs.FileWriteStream = WriteStream;  // Legacy name.
  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  function readdir (path, options, cb) {
    var args = [path]
    if (typeof options !== 'function') {
      args.push(options)
    } else {
      cb = options
    }
    args.push(go$readdir$cb)

    return go$readdir(args)

    function go$readdir$cb (err, files) {
      if (files && files.sort)
        files.sort()

      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
        enqueue([go$readdir, [args]])

      else {
        if (typeof cb === 'function')
          cb.apply(this, arguments)
        retry()
      }
    }
  }

  function go$readdir (args) {
    return fs$readdir.apply(fs, args)
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype)
    ReadStream.prototype.open = ReadStream$open
  }

  var fs$WriteStream = fs.WriteStream
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype)
    WriteStream.prototype.open = WriteStream$open
  }

  fs.ReadStream = ReadStream
  fs.WriteStream = WriteStream

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  queue.push(elem)
}

function retry () {
  var elem = queue.shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0].apply(null, elem[1])
  }
}


/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.fromCallback = function (fn) {
  return Object.defineProperty(function () {
    if (typeof arguments[arguments.length - 1] === 'function') fn.apply(this, arguments)
    else {
      return new Promise((resolve, reject) => {
        arguments[arguments.length] = (err, res) => {
          if (err) return reject(err)
          resolve(res)
        }
        arguments.length++
        fn.apply(this, arguments)
      })
    }
  }, 'name', { value: fn.name })
}

exports.fromPromise = function (fn) {
  return Object.defineProperty(function () {
    const cb = arguments[arguments.length - 1]
    if (typeof cb !== 'function') return fn.apply(this, arguments)
    else fn.apply(this, arguments).then(r => cb(null, r), cb)
  }, 'name', { value: fn.name })
}


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const u = __webpack_require__(3).fromCallback
const mkdirs = u(__webpack_require__(57))
const mkdirsSync = __webpack_require__(58)

module.exports = {
  mkdirs,
  mkdirsSync,
  // alias
  mkdirp: mkdirs,
  mkdirpSync: mkdirsSync,
  ensureDir: mkdirs,
  ensureDirSync: mkdirsSync
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const u = __webpack_require__(3).fromPromise
const fs = __webpack_require__(28)

function pathExists (path) {
  return fs.access(path).then(() => true).catch(() => false)
}

module.exports = {
  pathExists: u(pathExists),
  pathExistsSync: fs.existsSync
}


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// Buffer in node 4.x < 4.5.0 doesn't have working Buffer.from
// or Buffer.alloc, and Buffer in node 10 deprecated the ctor.
// .M, this is fine .\^/M..
let B = Buffer
/* istanbul ignore next */
if (!B.alloc) {
  B = __webpack_require__(35).Buffer
}
module.exports = B


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var uri = __webpack_require__(21);

var ValidationError = exports.ValidationError = function ValidationError (message, instance, schema, propertyPath, name, argument) {
  if (propertyPath) {
    this.property = propertyPath;
  }
  if (message) {
    this.message = message;
  }
  if (schema) {
    if (schema.id) {
      this.schema = schema.id;
    } else {
      this.schema = schema;
    }
  }
  if (instance) {
    this.instance = instance;
  }
  this.name = name;
  this.argument = argument;
  this.stack = this.toString();
};

ValidationError.prototype.toString = function toString() {
  return this.property + ' ' + this.message;
};

var ValidatorResult = exports.ValidatorResult = function ValidatorResult(instance, schema, options, ctx) {
  this.instance = instance;
  this.schema = schema;
  this.propertyPath = ctx.propertyPath;
  this.errors = [];
  this.throwError = options && options.throwError;
  this.disableFormat = options && options.disableFormat === true;
};

ValidatorResult.prototype.addError = function addError(detail) {
  var err;
  if (typeof detail == 'string') {
    err = new ValidationError(detail, this.instance, this.schema, this.propertyPath);
  } else {
    if (!detail) throw new Error('Missing error detail');
    if (!detail.message) throw new Error('Missing error message');
    if (!detail.name) throw new Error('Missing validator type');
    err = new ValidationError(detail.message, this.instance, this.schema, this.propertyPath, detail.name, detail.argument);
  }

  if (this.throwError) {
    throw err;
  }
  this.errors.push(err);
  return err;
};

ValidatorResult.prototype.importErrors = function importErrors(res) {
  if (typeof res == 'string' || (res && res.validatorType)) {
    this.addError(res);
  } else if (res && res.errors) {
    Array.prototype.push.apply(this.errors, res.errors);
  }
};

function stringizer (v,i){
  return i+': '+v.toString()+'\n';
}
ValidatorResult.prototype.toString = function toString(res) {
  return this.errors.map(stringizer).join('');
};

Object.defineProperty(ValidatorResult.prototype, "valid", { get: function() {
  return !this.errors.length;
} });

/**
 * Describes a problem with a Schema which prevents validation of an instance
 * @name SchemaError
 * @constructor
 */
var SchemaError = exports.SchemaError = function SchemaError (msg, schema) {
  this.message = msg;
  this.schema = schema;
  Error.call(this, msg);
  Error.captureStackTrace(this, SchemaError);
};
SchemaError.prototype = Object.create(Error.prototype,
  { constructor: {value: SchemaError, enumerable: false}
  , name: {value: 'SchemaError', enumerable: false}
  });

var SchemaContext = exports.SchemaContext = function SchemaContext (schema, options, propertyPath, base, schemas) {
  this.schema = schema;
  this.options = options;
  this.propertyPath = propertyPath;
  this.base = base;
  this.schemas = schemas;
};

SchemaContext.prototype.resolve = function resolve (target) {
  return uri.resolve(this.base, target);
};

SchemaContext.prototype.makeChild = function makeChild(schema, propertyName){
  var propertyPath = (propertyName===undefined) ? this.propertyPath : this.propertyPath+makeSuffix(propertyName);
  var base = uri.resolve(this.base, schema.id||'');
  var ctx = new SchemaContext(schema, this.options, propertyPath, base, Object.create(this.schemas));
  if(schema.id && !ctx.schemas[base]){
    ctx.schemas[base] = schema;
  }
  return ctx;
}

var FORMAT_REGEXPS = exports.FORMAT_REGEXPS = {
  'date-time': /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])[tT ](2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])(\.\d+)?([zZ]|[+-]([0-5][0-9]):(60|[0-5][0-9]))$/,
  'date': /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])$/,
  'time': /^(2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])$/,

  'email': /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/,
  'ip-address': /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  'ipv6': /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
  'uri': /^[a-zA-Z][a-zA-Z0-9+-.]*:[^\s]*$/,

  'color': /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/,

  // hostname regex from: http://stackoverflow.com/a/1420225/5628
  'hostname': /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
  'host-name': /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,

  'alpha': /^[a-zA-Z]+$/,
  'alphanumeric': /^[a-zA-Z0-9]+$/,
  'utc-millisec': function (input) {
    return (typeof input === 'string') && parseFloat(input) === parseInt(input, 10) && !isNaN(input);
  },
  'regex': function (input) {
    var result = true;
    try {
      new RegExp(input);
    } catch (e) {
      result = false;
    }
    return result;
  },
  'style': /\s*(.+?):\s*([^;]+);?/g,
  'phone': /^\+(?:[0-9] ?){6,14}[0-9]$/
};

FORMAT_REGEXPS.regexp = FORMAT_REGEXPS.regex;
FORMAT_REGEXPS.pattern = FORMAT_REGEXPS.regex;
FORMAT_REGEXPS.ipv4 = FORMAT_REGEXPS['ip-address'];

exports.isFormat = function isFormat (input, format, validator) {
  if (typeof input === 'string' && FORMAT_REGEXPS[format] !== undefined) {
    if (FORMAT_REGEXPS[format] instanceof RegExp) {
      return FORMAT_REGEXPS[format].test(input);
    }
    if (typeof FORMAT_REGEXPS[format] === 'function') {
      return FORMAT_REGEXPS[format](input);
    }
  } else if (validator && validator.customFormats &&
      typeof validator.customFormats[format] === 'function') {
    return validator.customFormats[format](input);
  }
  return true;
};

var makeSuffix = exports.makeSuffix = function makeSuffix (key) {
  key = key.toString();
  // This function could be capable of outputting valid a ECMAScript string, but the
  // resulting code for testing which form to use would be tens of thousands of characters long
  // That means this will use the name form for some illegal forms
  if (!key.match(/[.\s\[\]]/) && !key.match(/^[\d]/)) {
    return '.' + key;
  }
  if (key.match(/^\d+$/)) {
    return '[' + key + ']';
  }
  return '[' + JSON.stringify(key) + ']';
};

exports.deepCompareStrict = function deepCompareStrict (a, b) {
  if (typeof a !== typeof b) {
    return false;
  }
  if (a instanceof Array) {
    if (!(b instanceof Array)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    return a.every(function (v, i) {
      return deepCompareStrict(a[i], b[i]);
    });
  }
  if (typeof a === 'object') {
    if (!a || !b) {
      return a === b;
    }
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every(function (v) {
      return deepCompareStrict(a[v], b[v]);
    });
  }
  return a === b;
};

function deepMerger (target, dst, e, i) {
  if (typeof e === 'object') {
    dst[i] = deepMerge(target[i], e)
  } else {
    if (target.indexOf(e) === -1) {
      dst.push(e)
    }
  }
}

function copyist (src, dst, key) {
  dst[key] = src[key];
}

function copyistWithDeepMerge (target, src, dst, key) {
  if (typeof src[key] !== 'object' || !src[key]) {
    dst[key] = src[key];
  }
  else {
    if (!target[key]) {
      dst[key] = src[key];
    } else {
      dst[key] = deepMerge(target[key], src[key])
    }
  }
}

function deepMerge (target, src) {
  var array = Array.isArray(src);
  var dst = array && [] || {};

  if (array) {
    target = target || [];
    dst = dst.concat(target);
    src.forEach(deepMerger.bind(null, target, dst));
  } else {
    if (target && typeof target === 'object') {
      Object.keys(target).forEach(copyist.bind(null, target, dst));
    }
    Object.keys(src).forEach(copyistWithDeepMerge.bind(null, target, src, dst));
  }

  return dst;
};

module.exports.deepMerge = deepMerge;

/**
 * Validates instance against the provided schema
 * Implements URI+JSON Pointer encoding, e.g. "%7e"="~0"=>"~", "~1"="%2f"=>"/"
 * @param o
 * @param s The path to walk o along
 * @return any
 */
exports.objectGetPath = function objectGetPath(o, s) {
  var parts = s.split('/').slice(1);
  var k;
  while (typeof (k=parts.shift()) == 'string') {
    var n = decodeURIComponent(k.replace(/~0/,'~').replace(/~1/g,'/'));
    if (!(n in o)) return;
    o = o[n];
  }
  return o;
};

function pathEncoder (v) {
  return '/'+encodeURIComponent(v).replace(/~/g,'%7E');
}
/**
 * Accept an Array of property names and return a JSON Pointer URI fragment
 * @param Array a
 * @return {String}
 */
exports.encodePath = function encodePointer(a){
	// ~ must be encoded explicitly because hacks
	// the slash is encoded by encodeURIComponent
	return a.map(pathEncoder).join('');
};


/**
 * Calculate the number of decimal places a number uses
 * We need this to get correct results out of multipleOf and divisibleBy
 * when either figure is has decimal places, due to IEEE-754 float issues.
 * @param number
 * @returns {number}
 */
exports.getDecimalPlaces = function getDecimalPlaces(number) {

  var decimalPlaces = 0;
  if (isNaN(number)) return decimalPlaces;

  if (typeof number !== 'number') {
    number = Number(number);
  }

  var parts = number.toString().split('e');
  if (parts.length === 2) {
    if (parts[1][0] !== '-') {
      return decimalPlaces;
    } else {
      decimalPlaces = Number(parts[1].slice(1));
    }
  }

  var decimalParts = parts[0].split('.');
  if (decimalParts.length === 2) {
    decimalPlaces += decimalParts[1].length;
  }

  return decimalPlaces;
};



/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// turn tar(1) style args like `C` into the more verbose things like `cwd`

const argmap = new Map([
  ['C', 'cwd'],
  ['f', 'file'],
  ['z', 'gzip'],
  ['P', 'preservePaths'],
  ['U', 'unlink'],
  ['strip-components', 'strip'],
  ['stripComponents', 'strip'],
  ['keep-newer', 'newer'],
  ['keepNewer', 'newer'],
  ['keep-newer-files', 'newer'],
  ['keepNewerFiles', 'newer'],
  ['k', 'keep'],
  ['keep-existing', 'keep'],
  ['keepExisting', 'keep'],
  ['m', 'noMtime'],
  ['no-mtime', 'noMtime'],
  ['p', 'preserveOwner'],
  ['L', 'follow'],
  ['h', 'follow']
])

const parse = module.exports = opt => opt ? Object.keys(opt).map(k => [
  argmap.has(k) ? argmap.get(k) : k, opt[k]
]).reduce((set, kv) => (set[kv[0]] = kv[1], set), Object.create(null)) : {}


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const EE = __webpack_require__(16)
const Yallist = __webpack_require__(24)
const EOF = Symbol('EOF')
const MAYBE_EMIT_END = Symbol('maybeEmitEnd')
const EMITTED_END = Symbol('emittedEnd')
const CLOSED = Symbol('closed')
const READ = Symbol('read')
const FLUSH = Symbol('flush')
const doIter = process.env._MP_NO_ITERATOR_SYMBOLS_  !== '1'
const ASYNCITERATOR = doIter && Symbol.asyncIterator || Symbol('asyncIterator not implemented')
const ITERATOR = doIter && Symbol.iterator || Symbol('iterator not implemented')
const FLUSHCHUNK = Symbol('flushChunk')
const SD = __webpack_require__(88).StringDecoder
const ENCODING = Symbol('encoding')
const DECODER = Symbol('decoder')
const FLOWING = Symbol('flowing')
const RESUME = Symbol('resume')
const BUFFERLENGTH = Symbol('bufferLength')
const BUFFERPUSH = Symbol('bufferPush')
const BUFFERSHIFT = Symbol('bufferShift')
const OBJECTMODE = Symbol('objectMode')

// Buffer in node 4.x < 4.5.0 doesn't have working Buffer.from
// or Buffer.alloc, and Buffer in node 10 deprecated the ctor.
// .M, this is fine .\^/M..
let B = Buffer
/* istanbul ignore next */
if (!B.alloc) {
  B = __webpack_require__(35).Buffer
}

module.exports = class MiniPass extends EE {
  constructor (options) {
    super()
    this[FLOWING] = false
    this.pipes = new Yallist()
    this.buffer = new Yallist()
    this[OBJECTMODE] = options && options.objectMode || false
    if (this[OBJECTMODE])
      this[ENCODING] = null
    else
      this[ENCODING] = options && options.encoding || null
    if (this[ENCODING] === 'buffer')
      this[ENCODING] = null
    this[DECODER] = this[ENCODING] ? new SD(this[ENCODING]) : null
    this[EOF] = false
    this[EMITTED_END] = false
    this[CLOSED] = false
    this.writable = true
    this.readable = true
    this[BUFFERLENGTH] = 0
  }

  get bufferLength () { return this[BUFFERLENGTH] }

  get encoding () { return this[ENCODING] }
  set encoding (enc) {
    if (this[OBJECTMODE])
      throw new Error('cannot set encoding in objectMode')

    if (this[ENCODING] && enc !== this[ENCODING] &&
        (this[DECODER] && this[DECODER].lastNeed || this[BUFFERLENGTH]))
      throw new Error('cannot change encoding')

    if (this[ENCODING] !== enc) {
      this[DECODER] = enc ? new SD(enc) : null
      if (this.buffer.length)
        this.buffer = this.buffer.map(chunk => this[DECODER].write(chunk))
    }

    this[ENCODING] = enc
  }

  setEncoding (enc) {
    this.encoding = enc
  }

  write (chunk, encoding, cb) {
    if (this[EOF])
      throw new Error('write after end')

    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'

    if (!encoding)
      encoding = 'utf8'

    // fast-path writing strings of same encoding to a stream with
    // an empty buffer, skipping the buffer/decoder dance
    if (typeof chunk === 'string' && !this[OBJECTMODE] &&
        // unless it is a string already ready for us to use
        !(encoding === this[ENCODING] && !this[DECODER].lastNeed)) {
      chunk = B.from(chunk, encoding)
    }

    if (B.isBuffer(chunk) && this[ENCODING])
      chunk = this[DECODER].write(chunk)

    try {
      return this.flowing
        ? (this.emit('data', chunk), this.flowing)
        : (this[BUFFERPUSH](chunk), false)
    } finally {
      this.emit('readable')
      if (cb)
        cb()
    }
  }

  read (n) {
    try {
      if (this[BUFFERLENGTH] === 0 || n === 0 || n > this[BUFFERLENGTH])
        return null

      if (this[OBJECTMODE])
        n = null

      if (this.buffer.length > 1 && !this[OBJECTMODE]) {
        if (this.encoding)
          this.buffer = new Yallist([
            Array.from(this.buffer).join('')
          ])
        else
          this.buffer = new Yallist([
            B.concat(Array.from(this.buffer), this[BUFFERLENGTH])
          ])
      }

      return this[READ](n || null, this.buffer.head.value)
    } finally {
      this[MAYBE_EMIT_END]()
    }
  }

  [READ] (n, chunk) {
    if (n === chunk.length || n === null)
      this[BUFFERSHIFT]()
    else {
      this.buffer.head.value = chunk.slice(n)
      chunk = chunk.slice(0, n)
      this[BUFFERLENGTH] -= n
    }

    this.emit('data', chunk)

    if (!this.buffer.length && !this[EOF])
      this.emit('drain')

    return chunk
  }

  end (chunk, encoding, cb) {
    if (typeof chunk === 'function')
      cb = chunk, chunk = null
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'
    if (chunk)
      this.write(chunk, encoding)
    if (cb)
      this.once('end', cb)
    this[EOF] = true
    this.writable = false
    if (this.flowing)
      this[MAYBE_EMIT_END]()
  }

  // don't let the internal resume be overwritten
  [RESUME] () {
    this[FLOWING] = true
    this.emit('resume')
    if (this.buffer.length)
      this[FLUSH]()
    else if (this[EOF])
      this[MAYBE_EMIT_END]()
    else
      this.emit('drain')
  }

  resume () {
    return this[RESUME]()
  }

  pause () {
    this[FLOWING] = false
  }

  get flowing () {
    return this[FLOWING]
  }

  [BUFFERPUSH] (chunk) {
    if (this[OBJECTMODE])
      this[BUFFERLENGTH] += 1
    else
      this[BUFFERLENGTH] += chunk.length
    return this.buffer.push(chunk)
  }

  [BUFFERSHIFT] () {
    if (this.buffer.length) {
      if (this[OBJECTMODE])
        this[BUFFERLENGTH] -= 1
      else
        this[BUFFERLENGTH] -= this.buffer.head.value.length
    }
    return this.buffer.shift()
  }

  [FLUSH] () {
    do {} while (this[FLUSHCHUNK](this[BUFFERSHIFT]()))

    if (!this.buffer.length && !this[EOF])
      this.emit('drain')
  }

  [FLUSHCHUNK] (chunk) {
    return chunk ? (this.emit('data', chunk), this.flowing) : false
  }

  pipe (dest, opts) {
    if (dest === process.stdout || dest === process.stderr)
      (opts = opts || {}).end = false
    const p = { dest: dest, opts: opts, ondrain: _ => this[RESUME]() }
    this.pipes.push(p)

    dest.on('drain', p.ondrain)
    this[RESUME]()
    return dest
  }

  addListener (ev, fn) {
    return this.on(ev, fn)
  }

  on (ev, fn) {
    try {
      return super.on(ev, fn)
    } finally {
      if (ev === 'data' && !this.pipes.length && !this.flowing)
        this[RESUME]()
      else if (ev === 'end' && this[EMITTED_END]) {
        super.emit('end')
        this.removeAllListeners('end')
      }
    }
  }

  get emittedEnd () {
    return this[EMITTED_END]
  }

  [MAYBE_EMIT_END] () {
    if (!this[EMITTED_END] && this.buffer.length === 0 && this[EOF]) {
      this.emit('end')
      this.emit('prefinish')
      this.emit('finish')
      if (this[CLOSED])
        this.emit('close')
    }
  }

  emit (ev, data) {
    if (ev === 'data') {
      if (!data)
        return

      if (this.pipes.length)
        this.pipes.forEach(p => p.dest.write(data) || this.pause())
    } else if (ev === 'end') {
      if (this[EMITTED_END] === true)
        return

      this[EMITTED_END] = true
      this.readable = false

      if (this[DECODER]) {
        data = this[DECODER].end()
        if (data) {
          this.pipes.forEach(p => p.dest.write(data))
          super.emit('data', data)
        }
      }

      this.pipes.forEach(p => {
        p.dest.removeListener('drain', p.ondrain)
        if (!p.opts || p.opts.end !== false)
          p.dest.end()
      })
    } else if (ev === 'close') {
      this[CLOSED] = true
      // don't emit close before 'end' and 'finish'
      if (!this[EMITTED_END])
        return
    }

    const args = new Array(arguments.length)
    args[0] = ev
    args[1] = data
    if (arguments.length > 2) {
      for (let i = 2; i < arguments.length; i++) {
        args[i] = arguments[i]
      }
    }

    try {
      return super.emit.apply(this, args)
    } finally {
      if (ev !== 'end')
        this[MAYBE_EMIT_END]()
      else
        this.removeAllListeners('end')
    }
  }

  // const all = await stream.collect()
  collect () {
    return new Promise((resolve, reject) => {
      const buf = []
      this.on('data', c => buf.push(c))
      this.on('end', () => resolve(buf))
      this.on('error', reject)
    })
  }

  // for await (let chunk of stream)
  [ASYNCITERATOR] () {
    const next = () => {
      const res = this.read()
      if (res !== null)
        return Promise.resolve({ done: false, value: res })

      if (this[EOF])
        return Promise.resolve({ done: true })

      let resolve = null
      let reject = null
      const onerr = er => {
        this.removeListener('data', ondata)
        this.removeListener('end', onend)
        reject(er)
      }
      const ondata = value => {
        this.removeListener('error', onerr)
        this.removeListener('end', onend)
        this.pause()
        resolve({ value: value, done: !!this[EOF] })
      }
      const onend = () => {
        this.removeListener('error', onerr)
        this.removeListener('data', ondata)
        resolve({ done: true })
      }
      return new Promise((res, rej) => {
        reject = rej
        resolve = res
        this.once('error', onerr)
        this.once('end', onend)
        this.once('data', ondata)
      })
    }

    return { next }
  }

  // for (let chunk of stream)
  [ITERATOR] () {
    const next = () => {
      const value = this.read()
      const done = value === null
      return { value, done }
    }
    return { next }
  }
}


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// parse a 512-byte header block to a data object, or vice-versa
// encode returns `true` if a pax extended header is needed, because
// the data could not be faithfully encoded in a simple header.
// (Also, check header.needPax to see if it needs a pax header.)

const Buffer = __webpack_require__(6)
const types = __webpack_require__(18)
const pathModule = __webpack_require__(0).posix
const large = __webpack_require__(91)

const SLURP = Symbol('slurp')
const TYPE = Symbol('type')

class Header {
  constructor (data, off, ex, gex) {
    this.cksumValid = false
    this.needPax = false
    this.nullBlock = false

    this.block = null
    this.path = null
    this.mode = null
    this.uid = null
    this.gid = null
    this.size = null
    this.mtime = null
    this.cksum = null
    this[TYPE] = '0'
    this.linkpath = null
    this.uname = null
    this.gname = null
    this.devmaj = 0
    this.devmin = 0
    this.atime = null
    this.ctime = null

    if (Buffer.isBuffer(data))
      this.decode(data, off || 0, ex, gex)
    else if (data)
      this.set(data)
  }

  decode (buf, off, ex, gex) {
    if (!off)
      off = 0

    if (!buf || !(buf.length >= off + 512))
      throw new Error('need 512 bytes for header')

    this.path = decString(buf, off, 100)
    this.mode = decNumber(buf, off + 100, 8)
    this.uid = decNumber(buf, off + 108, 8)
    this.gid = decNumber(buf, off + 116, 8)
    this.size = decNumber(buf, off + 124, 12)
    this.mtime = decDate(buf, off + 136, 12)
    this.cksum = decNumber(buf, off + 148, 12)

    // if we have extended or global extended headers, apply them now
    // See https://github.com/npm/node-tar/pull/187
    this[SLURP](ex)
    this[SLURP](gex, true)

    // old tar versions marked dirs as a file with a trailing /
    this[TYPE] = decString(buf, off + 156, 1)
    if (this[TYPE] === '')
      this[TYPE] = '0'
    if (this[TYPE] === '0' && this.path.substr(-1) === '/')
      this[TYPE] = '5'

    // tar implementations sometimes incorrectly put the stat(dir).size
    // as the size in the tarball, even though Directory entries are
    // not able to have any body at all.  In the very rare chance that
    // it actually DOES have a body, we weren't going to do anything with
    // it anyway, and it'll just be a warning about an invalid header.
    if (this[TYPE] === '5')
      this.size = 0

    this.linkpath = decString(buf, off + 157, 100)
    if (buf.slice(off + 257, off + 265).toString() === 'ustar\u000000') {
      this.uname = decString(buf, off + 265, 32)
      this.gname = decString(buf, off + 297, 32)
      this.devmaj = decNumber(buf, off + 329, 8)
      this.devmin = decNumber(buf, off + 337, 8)
      if (buf[off + 475] !== 0) {
        // definitely a prefix, definitely >130 chars.
        const prefix = decString(buf, off + 345, 155)
        this.path = prefix + '/' + this.path
      } else {
        const prefix = decString(buf, off + 345, 130)
        if (prefix)
          this.path = prefix + '/' + this.path
        this.atime = decDate(buf, off + 476, 12)
        this.ctime = decDate(buf, off + 488, 12)
      }
    }

    let sum = 8 * 0x20
    for (let i = off; i < off + 148; i++) {
      sum += buf[i]
    }
    for (let i = off + 156; i < off + 512; i++) {
      sum += buf[i]
    }
    this.cksumValid = sum === this.cksum
    if (this.cksum === null && sum === 8 * 0x20)
      this.nullBlock = true
  }

  [SLURP] (ex, global) {
    for (let k in ex) {
      // we slurp in everything except for the path attribute in
      // a global extended header, because that's weird.
      if (ex[k] !== null && ex[k] !== undefined &&
          !(global && k === 'path'))
        this[k] = ex[k]
    }
  }

  encode (buf, off) {
    if (!buf) {
      buf = this.block = Buffer.alloc(512)
      off = 0
    }

    if (!off)
      off = 0

    if (!(buf.length >= off + 512))
      throw new Error('need 512 bytes for header')

    const prefixSize = this.ctime || this.atime ? 130 : 155
    const split = splitPrefix(this.path || '', prefixSize)
    const path = split[0]
    const prefix = split[1]
    this.needPax = split[2]

    this.needPax = encString(buf, off, 100, path) || this.needPax
    this.needPax = encNumber(buf, off + 100, 8, this.mode) || this.needPax
    this.needPax = encNumber(buf, off + 108, 8, this.uid) || this.needPax
    this.needPax = encNumber(buf, off + 116, 8, this.gid) || this.needPax
    this.needPax = encNumber(buf, off + 124, 12, this.size) || this.needPax
    this.needPax = encDate(buf, off + 136, 12, this.mtime) || this.needPax
    buf[off + 156] = this[TYPE].charCodeAt(0)
    this.needPax = encString(buf, off + 157, 100, this.linkpath) || this.needPax
    buf.write('ustar\u000000', off + 257, 8)
    this.needPax = encString(buf, off + 265, 32, this.uname) || this.needPax
    this.needPax = encString(buf, off + 297, 32, this.gname) || this.needPax
    this.needPax = encNumber(buf, off + 329, 8, this.devmaj) || this.needPax
    this.needPax = encNumber(buf, off + 337, 8, this.devmin) || this.needPax
    this.needPax = encString(buf, off + 345, prefixSize, prefix) || this.needPax
    if (buf[off + 475] !== 0)
      this.needPax = encString(buf, off + 345, 155, prefix) || this.needPax
    else {
      this.needPax = encString(buf, off + 345, 130, prefix) || this.needPax
      this.needPax = encDate(buf, off + 476, 12, this.atime) || this.needPax
      this.needPax = encDate(buf, off + 488, 12, this.ctime) || this.needPax
    }

    let sum = 8 * 0x20
    for (let i = off; i < off + 148; i++) {
      sum += buf[i]
    }
    for (let i = off + 156; i < off + 512; i++) {
      sum += buf[i]
    }
    this.cksum = sum
    encNumber(buf, off + 148, 8, this.cksum)
    this.cksumValid = true

    return this.needPax
  }

  set (data) {
    for (let i in data) {
      if (data[i] !== null && data[i] !== undefined)
        this[i] = data[i]
    }
  }

  get type () {
    return types.name.get(this[TYPE]) || this[TYPE]
  }

  get typeKey () {
    return this[TYPE]
  }

  set type (type) {
    if (types.code.has(type))
      this[TYPE] = types.code.get(type)
    else
      this[TYPE] = type
  }
}

const splitPrefix = (p, prefixSize) => {
  const pathSize = 100
  let pp = p
  let prefix = ''
  let ret
  const root = pathModule.parse(p).root || '.'

  if (Buffer.byteLength(pp) < pathSize)
    ret = [pp, prefix, false]
  else {
    // first set prefix to the dir, and path to the base
    prefix = pathModule.dirname(pp)
    pp = pathModule.basename(pp)

    do {
      // both fit!
      if (Buffer.byteLength(pp) <= pathSize &&
          Buffer.byteLength(prefix) <= prefixSize)
        ret = [pp, prefix, false]

      // prefix fits in prefix, but path doesn't fit in path
      else if (Buffer.byteLength(pp) > pathSize &&
          Buffer.byteLength(prefix) <= prefixSize)
        ret = [pp.substr(0, pathSize - 1), prefix, true]

      else {
        // make path take a bit from prefix
        pp = pathModule.join(pathModule.basename(prefix), pp)
        prefix = pathModule.dirname(prefix)
      }
    } while (prefix !== root && !ret)

    // at this point, found no resolution, just truncate
    if (!ret)
      ret = [p.substr(0, pathSize - 1), '', true]
  }
  return ret
}

const decString = (buf, off, size) =>
  buf.slice(off, off + size).toString('utf8').replace(/\0.*/, '')

const decDate = (buf, off, size) =>
  numToDate(decNumber(buf, off, size))

const numToDate = num => num === null ? null : new Date(num * 1000)

const decNumber = (buf, off, size) =>
  buf[off] & 0x80 ? large.parse(buf.slice(off, off + size))
    : decSmallNumber(buf, off, size)

const nanNull = value => isNaN(value) ? null : value

const decSmallNumber = (buf, off, size) =>
  nanNull(parseInt(
    buf.slice(off, off + size)
      .toString('utf8').replace(/\0.*$/, '').trim(), 8))

// the maximum encodable as a null-terminated octal, by field size
const MAXNUM = {
  12: 0o77777777777,
  8 : 0o7777777
}

const encNumber = (buf, off, size, number) =>
  number === null ? false :
  number > MAXNUM[size] || number < 0
    ? (large.encode(number, buf.slice(off, off + size)), true)
    : (encSmallNumber(buf, off, size, number), false)

const encSmallNumber = (buf, off, size, number) =>
  buf.write(octalString(number, size), off, size, 'ascii')

const octalString = (number, size) =>
  padOctal(Math.floor(number).toString(8), size)

const padOctal = (string, size) =>
  (string.length === size - 1 ? string
  : new Array(size - string.length - 1).join('0') + string + ' ') + '\0'

const encDate = (buf, off, size, date) =>
  date === null ? false :
  encNumber(buf, off, size, date.getTime() / 1000)

// enough to fill the longest string we've got
const NULLS = new Array(156).join('\0')
// pad with nulls, return true if it's longer or non-ascii
const encString = (buf, off, size, string) =>
  string === null ? false :
  (buf.write(string + NULLS, off, size, 'utf8'),
   string.length !== Buffer.byteLength(string) || string.length > size)

module.exports = Header


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const MiniPass = __webpack_require__(9)
const EE = __webpack_require__(16).EventEmitter
const fs = __webpack_require__(2)

// for writev
const binding = process.binding('fs')
const writeBuffers = binding.writeBuffers
const FSReqWrap = binding.FSReqWrap || binding.FSReqCallback

const _autoClose = Symbol('_autoClose')
const _close = Symbol('_close')
const _ended = Symbol('_ended')
const _fd = Symbol('_fd')
const _finished = Symbol('_finished')
const _flags = Symbol('_flags')
const _flush = Symbol('_flush')
const _handleChunk = Symbol('_handleChunk')
const _makeBuf = Symbol('_makeBuf')
const _mode = Symbol('_mode')
const _needDrain = Symbol('_needDrain')
const _onerror = Symbol('_onerror')
const _onopen = Symbol('_onopen')
const _onread = Symbol('_onread')
const _onwrite = Symbol('_onwrite')
const _open = Symbol('_open')
const _path = Symbol('_path')
const _pos = Symbol('_pos')
const _queue = Symbol('_queue')
const _read = Symbol('_read')
const _readSize = Symbol('_readSize')
const _reading = Symbol('_reading')
const _remain = Symbol('_remain')
const _size = Symbol('_size')
const _write = Symbol('_write')
const _writing = Symbol('_writing')
const _defaultFlag = Symbol('_defaultFlag')

class ReadStream extends MiniPass {
  constructor (path, opt) {
    opt = opt || {}
    super(opt)

    this.writable = false

    if (typeof path !== 'string')
      throw new TypeError('path must be a string')

    this[_fd] = typeof opt.fd === 'number' ? opt.fd : null
    this[_path] = path
    this[_readSize] = opt.readSize || 16*1024*1024
    this[_reading] = false
    this[_size] = typeof opt.size === 'number' ? opt.size : Infinity
    this[_remain] = this[_size]
    this[_autoClose] = typeof opt.autoClose === 'boolean' ?
      opt.autoClose : true

    if (typeof this[_fd] === 'number')
      this[_read]()
    else
      this[_open]()
  }

  get fd () { return this[_fd] }
  get path () { return this[_path] }

  write () {
    throw new TypeError('this is a readable stream')
  }

  end () {
    throw new TypeError('this is a readable stream')
  }

  [_open] () {
    fs.open(this[_path], 'r', (er, fd) => this[_onopen](er, fd))
  }

  [_onopen] (er, fd) {
    if (er)
      this[_onerror](er)
    else {
      this[_fd] = fd
      this.emit('open', fd)
      this[_read]()
    }
  }

  [_makeBuf] () {
    return Buffer.allocUnsafe(Math.min(this[_readSize], this[_remain]))
  }

  [_read] () {
    if (!this[_reading]) {
      this[_reading] = true
      const buf = this[_makeBuf]()
      /* istanbul ignore if */
      if (buf.length === 0) return process.nextTick(() => this[_onread](null, 0, buf))
      fs.read(this[_fd], buf, 0, buf.length, null, (er, br, buf) =>
        this[_onread](er, br, buf))
    }
  }

  [_onread] (er, br, buf) {
    this[_reading] = false
    if (er)
      this[_onerror](er)
    else if (this[_handleChunk](br, buf))
      this[_read]()
  }

  [_close] () {
    if (this[_autoClose] && typeof this[_fd] === 'number') {
      fs.close(this[_fd], _ => this.emit('close'))
      this[_fd] = null
    }
  }

  [_onerror] (er) {
    this[_reading] = true
    this[_close]()
    this.emit('error', er)
  }

  [_handleChunk] (br, buf) {
    let ret = false
    // no effect if infinite
    this[_remain] -= br
    if (br > 0)
      ret = super.write(br < buf.length ? buf.slice(0, br) : buf)

    if (br === 0 || this[_remain] <= 0) {
      ret = false
      this[_close]()
      super.end()
    }

    return ret
  }

  emit (ev, data) {
    switch (ev) {
      case 'prefinish':
      case 'finish':
        break

      case 'drain':
        if (typeof this[_fd] === 'number')
          this[_read]()
        break

      default:
        return super.emit(ev, data)
    }
  }
}

class ReadStreamSync extends ReadStream {
  [_open] () {
    let threw = true
    try {
      this[_onopen](null, fs.openSync(this[_path], 'r'))
      threw = false
    } finally {
      if (threw)
        this[_close]()
    }
  }

  [_read] () {
    let threw = true
    try {
      if (!this[_reading]) {
        this[_reading] = true
        do {
          const buf = this[_makeBuf]()
          /* istanbul ignore next */
          const br = buf.length === 0 ? 0 : fs.readSync(this[_fd], buf, 0, buf.length, null)
          if (!this[_handleChunk](br, buf))
            break
        } while (true)
        this[_reading] = false
      }
      threw = false
    } finally {
      if (threw)
        this[_close]()
    }
  }

  [_close] () {
    if (this[_autoClose] && typeof this[_fd] === 'number') {
      try {
        fs.closeSync(this[_fd])
      } catch (er) {}
      this[_fd] = null
      this.emit('close')
    }
  }
}

class WriteStream extends EE {
  constructor (path, opt) {
    opt = opt || {}
    super(opt)
    this.readable = false
    this[_writing] = false
    this[_ended] = false
    this[_needDrain] = false
    this[_queue] = []
    this[_path] = path
    this[_fd] = typeof opt.fd === 'number' ? opt.fd : null
    this[_mode] = opt.mode === undefined ? 0o666 : opt.mode
    this[_pos] = typeof opt.start === 'number' ? opt.start : null
    this[_autoClose] = typeof opt.autoClose === 'boolean' ?
      opt.autoClose : true

    // truncating makes no sense when writing into the middle
    const defaultFlag = this[_pos] !== null ? 'r+' : 'w'
    this[_defaultFlag] = opt.flags === undefined
    this[_flags] = this[_defaultFlag] ? defaultFlag : opt.flags

    if (this[_fd] === null)
      this[_open]()
  }

  get fd () { return this[_fd] }
  get path () { return this[_path] }

  [_onerror] (er) {
    this[_close]()
    this[_writing] = true
    this.emit('error', er)
  }

  [_open] () {
    fs.open(this[_path], this[_flags], this[_mode],
      (er, fd) => this[_onopen](er, fd))
  }

  [_onopen] (er, fd) {
    if (this[_defaultFlag] &&
        this[_flags] === 'r+' &&
        er && er.code === 'ENOENT') {
      this[_flags] = 'w'
      this[_open]()
    } else if (er)
      this[_onerror](er)
    else {
      this[_fd] = fd
      this.emit('open', fd)
      this[_flush]()
    }
  }

  end (buf, enc) {
    if (buf)
      this.write(buf, enc)

    this[_ended] = true

    // synthetic after-write logic, where drain/finish live
    if (!this[_writing] && !this[_queue].length &&
        typeof this[_fd] === 'number')
      this[_onwrite](null, 0)
  }

  write (buf, enc) {
    if (typeof buf === 'string')
      buf = new Buffer(buf, enc)

    if (this[_ended]) {
      this.emit('error', new Error('write() after end()'))
      return false
    }

    if (this[_fd] === null || this[_writing] || this[_queue].length) {
      this[_queue].push(buf)
      this[_needDrain] = true
      return false
    }

    this[_writing] = true
    this[_write](buf)
    return true
  }

  [_write] (buf) {
    fs.write(this[_fd], buf, 0, buf.length, this[_pos], (er, bw) =>
      this[_onwrite](er, bw))
  }

  [_onwrite] (er, bw) {
    if (er)
      this[_onerror](er)
    else {
      if (this[_pos] !== null)
        this[_pos] += bw
      if (this[_queue].length)
        this[_flush]()
      else {
        this[_writing] = false

        if (this[_ended] && !this[_finished]) {
          this[_finished] = true
          this[_close]()
          this.emit('finish')
        } else if (this[_needDrain]) {
          this[_needDrain] = false
          this.emit('drain')
        }
      }
    }
  }

  [_flush] () {
    if (this[_queue].length === 0) {
      if (this[_ended])
        this[_onwrite](null, 0)
    } else if (this[_queue].length === 1)
      this[_write](this[_queue].pop())
    else {
      const iovec = this[_queue]
      this[_queue] = []
      writev(this[_fd], iovec, this[_pos],
        (er, bw) => this[_onwrite](er, bw))
    }
  }

  [_close] () {
    if (this[_autoClose] && typeof this[_fd] === 'number') {
      fs.close(this[_fd], _ => this.emit('close'))
      this[_fd] = null
    }
  }
}

class WriteStreamSync extends WriteStream {
  [_open] () {
    let fd
    try {
      fd = fs.openSync(this[_path], this[_flags], this[_mode])
    } catch (er) {
      if (this[_defaultFlag] &&
          this[_flags] === 'r+' &&
          er && er.code === 'ENOENT') {
        this[_flags] = 'w'
        return this[_open]()
      } else
        throw er
    }
    this[_onopen](null, fd)
  }

  [_close] () {
    if (this[_autoClose] && typeof this[_fd] === 'number') {
      try {
        fs.closeSync(this[_fd])
      } catch (er) {}
      this[_fd] = null
      this.emit('close')
    }
  }

  [_write] (buf) {
    try {
      this[_onwrite](null,
        fs.writeSync(this[_fd], buf, 0, buf.length, this[_pos]))
    } catch (er) {
      this[_onwrite](er, 0)
    }
  }
}

const writev = (fd, iovec, pos, cb) => {
  const done = (er, bw) => cb(er, bw, iovec)
  const req = new FSReqWrap()
  req.oncomplete = done
  binding.writeBuffers(fd, iovec, pos, req)
}

exports.ReadStream = ReadStream
exports.ReadStreamSync = ReadStreamSync

exports.WriteStream = WriteStream
exports.WriteStreamSync = WriteStreamSync


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_REF = '$jsii.byref';
exports.TOKEN_DATE = '$jsii.date';
exports.TOKEN_ENUM = '$jsii.enum';
function isObjRef(value) {
    return typeof value === 'object' && value !== null && exports.TOKEN_REF in value;
}
exports.isObjRef = isObjRef;
function isWireDate(value) {
    return typeof value === 'object' && value !== null && exports.TOKEN_DATE in value;
}
exports.isWireDate = isWireDate;
function isWireEnum(value) {
    return typeof value === 'object' && value !== null && exports.TOKEN_ENUM in value;
}
exports.isWireEnum = isWireEnum;
function isMethodOverride(value) {
    return value.method != null; // Python passes "null"
}
exports.isMethodOverride = isMethodOverride;
function isPropertyOverride(value) {
    return value.property != null; // Python passes "null"
}
exports.isPropertyOverride = isPropertyOverride;


/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = require("assert");

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)

const NODE_VERSION_MAJOR_WITH_BIGINT = 10
const NODE_VERSION_MINOR_WITH_BIGINT = 5
const NODE_VERSION_PATCH_WITH_BIGINT = 0
const nodeVersion = process.versions.node.split('.')
const nodeVersionMajor = Number.parseInt(nodeVersion[0], 10)
const nodeVersionMinor = Number.parseInt(nodeVersion[1], 10)
const nodeVersionPatch = Number.parseInt(nodeVersion[2], 10)

function nodeSupportsBigInt () {
  if (nodeVersionMajor > NODE_VERSION_MAJOR_WITH_BIGINT) {
    return true
  } else if (nodeVersionMajor === NODE_VERSION_MAJOR_WITH_BIGINT) {
    if (nodeVersionMinor > NODE_VERSION_MINOR_WITH_BIGINT) {
      return true
    } else if (nodeVersionMinor === NODE_VERSION_MINOR_WITH_BIGINT) {
      if (nodeVersionPatch >= NODE_VERSION_PATCH_WITH_BIGINT) {
        return true
      }
    }
  }
  return false
}

function getStats (src, dest, cb) {
  if (nodeSupportsBigInt()) {
    fs.stat(src, { bigint: true }, (err, srcStat) => {
      if (err) return cb(err)
      fs.stat(dest, { bigint: true }, (err, destStat) => {
        if (err) {
          if (err.code === 'ENOENT') return cb(null, { srcStat, destStat: null })
          return cb(err)
        }
        return cb(null, { srcStat, destStat })
      })
    })
  } else {
    fs.stat(src, (err, srcStat) => {
      if (err) return cb(err)
      fs.stat(dest, (err, destStat) => {
        if (err) {
          if (err.code === 'ENOENT') return cb(null, { srcStat, destStat: null })
          return cb(err)
        }
        return cb(null, { srcStat, destStat })
      })
    })
  }
}

function getStatsSync (src, dest) {
  let srcStat, destStat
  if (nodeSupportsBigInt()) {
    srcStat = fs.statSync(src, { bigint: true })
  } else {
    srcStat = fs.statSync(src)
  }
  try {
    if (nodeSupportsBigInt()) {
      destStat = fs.statSync(dest, { bigint: true })
    } else {
      destStat = fs.statSync(dest)
    }
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

function checkPaths (src, dest, funcName, cb) {
  getStats(src, dest, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats
    if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
      return cb(new Error('Source and destination must not be the same.'))
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return cb(null, { srcStat, destStat })
  })
}

function checkPathsSync (src, dest, funcName) {
  const { srcStat, destStat } = getStatsSync(src, dest)
  if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
    throw new Error('Source and destination must not be the same.')
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
function checkParentPaths (src, srcStat, dest, funcName, cb) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return cb()
  if (nodeSupportsBigInt()) {
    fs.stat(destParent, { bigint: true }, (err, destStat) => {
      if (err) {
        if (err.code === 'ENOENT') return cb()
        return cb(err)
      }
      if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
        return cb(new Error(errMsg(src, dest, funcName)))
      }
      return checkParentPaths(src, srcStat, destParent, funcName, cb)
    })
  } else {
    fs.stat(destParent, (err, destStat) => {
      if (err) {
        if (err.code === 'ENOENT') return cb()
        return cb(err)
      }
      if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
        return cb(new Error(errMsg(src, dest, funcName)))
      }
      return checkParentPaths(src, srcStat, destParent, funcName, cb)
    })
  }
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return
  let destStat
  try {
    if (nodeSupportsBigInt()) {
      destStat = fs.statSync(destParent, { bigint: true })
    } else {
      destStat = fs.statSync(destParent)
    }
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path.resolve(src).split(path.sep).filter(i => i)
  const destArr = path.resolve(dest).split(path.sep).filter(i => i)
  return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

module.exports = {
  checkPaths,
  checkPathsSync,
  checkParentPaths,
  checkParentPathsSync,
  isSrcSubdir
}


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const rimraf = __webpack_require__(62)

module.exports = {
  remove: u(rimraf),
  removeSync: rimraf.sync
}


/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const types = __webpack_require__(18)
const MiniPass = __webpack_require__(9)

const SLURP = Symbol('slurp')
module.exports = class ReadEntry extends MiniPass {
  constructor (header, ex, gex) {
    super()
    this.extended = ex
    this.globalExtended = gex
    this.header = header
    this.startBlockSize = 512 * Math.ceil(header.size / 512)
    this.blockRemain = this.startBlockSize
    this.remain = header.size
    this.type = header.type
    this.meta = false
    this.ignore = false
    switch (this.type) {
      case 'File':
      case 'OldFile':
      case 'Link':
      case 'SymbolicLink':
      case 'CharacterDevice':
      case 'BlockDevice':
      case 'Directory':
      case 'FIFO':
      case 'ContiguousFile':
      case 'GNUDumpDir':
        break

      case 'NextFileHasLongLinkpath':
      case 'NextFileHasLongPath':
      case 'OldGnuLongPath':
      case 'GlobalExtendedHeader':
      case 'ExtendedHeader':
      case 'OldExtendedHeader':
        this.meta = true
        break

      // NOTE: gnutar and bsdtar treat unrecognized types as 'File'
      // it may be worth doing the same, but with a warning.
      default:
        this.ignore = true
    }

    this.path = header.path
    this.mode = header.mode
    if (this.mode)
      this.mode = this.mode & 0o7777
    this.uid = header.uid
    this.gid = header.gid
    this.uname = header.uname
    this.gname = header.gname
    this.size = header.size
    this.mtime = header.mtime
    this.atime = header.atime
    this.ctime = header.ctime
    this.linkpath = header.linkpath
    this.uname = header.uname
    this.gname = header.gname

    if (ex) this[SLURP](ex)
    if (gex) this[SLURP](gex, true)
  }

  write (data) {
    const writeLen = data.length
    if (writeLen > this.blockRemain)
      throw new Error('writing more to entry than is appropriate')

    const r = this.remain
    const br = this.blockRemain
    this.remain = Math.max(0, r - writeLen)
    this.blockRemain = Math.max(0, br - writeLen)
    if (this.ignore)
      return true

    if (r >= writeLen)
      return super.write(data)

    // r < writeLen
    return super.write(data.slice(0, r))
  }

  [SLURP] (ex, global) {
    for (let k in ex) {
      // we slurp in everything except for the path attribute in
      // a global extended header, because that's weird.
      if (ex[k] !== null && ex[k] !== undefined &&
          !(global && k === 'path'))
        this[k] = ex[k]
    }
  }
}


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// map types from key to human-friendly name
exports.name = new Map([
  ['0', 'File'],
  // same as File
  ['', 'OldFile'],
  ['1', 'Link'],
  ['2', 'SymbolicLink'],
  // Devices and FIFOs aren't fully supported
  // they are parsed, but skipped when unpacking
  ['3', 'CharacterDevice'],
  ['4', 'BlockDevice'],
  ['5', 'Directory'],
  ['6', 'FIFO'],
  // same as File
  ['7', 'ContiguousFile'],
  // pax headers
  ['g', 'GlobalExtendedHeader'],
  ['x', 'ExtendedHeader'],
  // vendor-specific stuff
  // skip
  ['A', 'SolarisACL'],
  // like 5, but with data, which should be skipped
  ['D', 'GNUDumpDir'],
  // metadata only, skip
  ['I', 'Inode'],
  // data = link path of next file
  ['K', 'NextFileHasLongLinkpath'],
  // data = path of next file
  ['L', 'NextFileHasLongPath'],
  // skip
  ['M', 'ContinuationFile'],
  // like L
  ['N', 'OldGnuLongPath'],
  // skip
  ['S', 'SparseFile'],
  // skip
  ['V', 'TapeVolumeHeader'],
  // like x
  ['X', 'OldExtendedHeader']
])

// map the other direction
exports.code = new Map(Array.from(exports.name).map(kv => [kv[1], kv[0]]))


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// this[BUFFER] is the remainder of a chunk if we're waiting for
// the full 512 bytes of a header to come in.  We will Buffer.concat()
// it to the next write(), which is a mem copy, but a small one.
//
// this[QUEUE] is a Yallist of entries that haven't been emitted
// yet this can only get filled up if the user keeps write()ing after
// a write() returns false, or does a write() with more than one entry
//
// We don't buffer chunks, we always parse them and either create an
// entry, or push it into the active entry.  The ReadEntry class knows
// to throw data away if .ignore=true
//
// Shift entry off the buffer when it emits 'end', and emit 'entry' for
// the next one in the list.
//
// At any time, we're pushing body chunks into the entry at WRITEENTRY,
// and waiting for 'end' on the entry at READENTRY
//
// ignored entries get .resume() called on them straight away

const warner = __webpack_require__(26)
const path = __webpack_require__(0)
const Header = __webpack_require__(10)
const EE = __webpack_require__(16)
const Yallist = __webpack_require__(24)
const maxMetaEntrySize = 1024 * 1024
const Entry = __webpack_require__(17)
const Pax = __webpack_require__(25)
const zlib = __webpack_require__(37)
const Buffer = __webpack_require__(6)

const gzipHeader = Buffer.from([0x1f, 0x8b])
const STATE = Symbol('state')
const WRITEENTRY = Symbol('writeEntry')
const READENTRY = Symbol('readEntry')
const NEXTENTRY = Symbol('nextEntry')
const PROCESSENTRY = Symbol('processEntry')
const EX = Symbol('extendedHeader')
const GEX = Symbol('globalExtendedHeader')
const META = Symbol('meta')
const EMITMETA = Symbol('emitMeta')
const BUFFER = Symbol('buffer')
const QUEUE = Symbol('queue')
const ENDED = Symbol('ended')
const EMITTEDEND = Symbol('emittedEnd')
const EMIT = Symbol('emit')
const UNZIP = Symbol('unzip')
const CONSUMECHUNK = Symbol('consumeChunk')
const CONSUMECHUNKSUB = Symbol('consumeChunkSub')
const CONSUMEBODY = Symbol('consumeBody')
const CONSUMEMETA = Symbol('consumeMeta')
const CONSUMEHEADER = Symbol('consumeHeader')
const CONSUMING = Symbol('consuming')
const BUFFERCONCAT = Symbol('bufferConcat')
const MAYBEEND = Symbol('maybeEnd')
const WRITING = Symbol('writing')
const ABORTED = Symbol('aborted')
const DONE = Symbol('onDone')

const noop = _ => true

module.exports = warner(class Parser extends EE {
  constructor (opt) {
    opt = opt || {}
    super(opt)

    if (opt.ondone)
      this.on(DONE, opt.ondone)
    else
      this.on(DONE, _ => {
        this.emit('prefinish')
        this.emit('finish')
        this.emit('end')
        this.emit('close')
      })

    this.strict = !!opt.strict
    this.maxMetaEntrySize = opt.maxMetaEntrySize || maxMetaEntrySize
    this.filter = typeof opt.filter === 'function' ? opt.filter : noop

    // have to set this so that streams are ok piping into it
    this.writable = true
    this.readable = false

    this[QUEUE] = new Yallist()
    this[BUFFER] = null
    this[READENTRY] = null
    this[WRITEENTRY] = null
    this[STATE] = 'begin'
    this[META] = ''
    this[EX] = null
    this[GEX] = null
    this[ENDED] = false
    this[UNZIP] = null
    this[ABORTED] = false
    if (typeof opt.onwarn === 'function')
      this.on('warn', opt.onwarn)
    if (typeof opt.onentry === 'function')
      this.on('entry', opt.onentry)
  }

  [CONSUMEHEADER] (chunk, position) {
    const header = new Header(chunk, position, this[EX], this[GEX])

    if (header.nullBlock)
      this[EMIT]('nullBlock')
    else if (!header.cksumValid)
      this.warn('invalid entry', header)
    else if (!header.path)
      this.warn('invalid: path is required', header)
    else {
      const type = header.type
      if (/^(Symbolic)?Link$/.test(type) && !header.linkpath)
        this.warn('invalid: linkpath required', header)
      else if (!/^(Symbolic)?Link$/.test(type) && header.linkpath)
        this.warn('invalid: linkpath forbidden', header)
      else {
        const entry = this[WRITEENTRY] = new Entry(header, this[EX], this[GEX])

        if (entry.meta) {
          if (entry.size > this.maxMetaEntrySize) {
            entry.ignore = true
            this[EMIT]('ignoredEntry', entry)
            this[STATE] = 'ignore'
          } else if (entry.size > 0) {
            this[META] = ''
            entry.on('data', c => this[META] += c)
            this[STATE] = 'meta'
          }
        } else {

          this[EX] = null
          entry.ignore = entry.ignore || !this.filter(entry.path, entry)
          if (entry.ignore) {
            this[EMIT]('ignoredEntry', entry)
            this[STATE] = entry.remain ? 'ignore' : 'begin'
          } else {
            if (entry.remain)
              this[STATE] = 'body'
            else {
              this[STATE] = 'begin'
              entry.end()
            }

            if (!this[READENTRY]) {
              this[QUEUE].push(entry)
              this[NEXTENTRY]()
            } else
              this[QUEUE].push(entry)
          }
        }
      }
    }
  }

  [PROCESSENTRY] (entry) {
    let go = true

    if (!entry) {
      this[READENTRY] = null
      go = false
    } else if (Array.isArray(entry))
      this.emit.apply(this, entry)
    else {
      this[READENTRY] = entry
      this.emit('entry', entry)
      if (!entry.emittedEnd) {
        entry.on('end', _ => this[NEXTENTRY]())
        go = false
      }
    }

    return go
  }

  [NEXTENTRY] () {
    do {} while (this[PROCESSENTRY](this[QUEUE].shift()))

    if (!this[QUEUE].length) {
      // At this point, there's nothing in the queue, but we may have an
      // entry which is being consumed (readEntry).
      // If we don't, then we definitely can handle more data.
      // If we do, and either it's flowing, or it has never had any data
      // written to it, then it needs more.
      // The only other possibility is that it has returned false from a
      // write() call, so we wait for the next drain to continue.
      const re = this[READENTRY]
      const drainNow = !re || re.flowing || re.size === re.remain
      if (drainNow) {
        if (!this[WRITING])
          this.emit('drain')
      } else
        re.once('drain', _ => this.emit('drain'))
     }
  }

  [CONSUMEBODY] (chunk, position) {
    // write up to but no  more than writeEntry.blockRemain
    const entry = this[WRITEENTRY]
    const br = entry.blockRemain
    const c = (br >= chunk.length && position === 0) ? chunk
      : chunk.slice(position, position + br)

    entry.write(c)

    if (!entry.blockRemain) {
      this[STATE] = 'begin'
      this[WRITEENTRY] = null
      entry.end()
    }

    return c.length
  }

  [CONSUMEMETA] (chunk, position) {
    const entry = this[WRITEENTRY]
    const ret = this[CONSUMEBODY](chunk, position)

    // if we finished, then the entry is reset
    if (!this[WRITEENTRY])
      this[EMITMETA](entry)

    return ret
  }

  [EMIT] (ev, data, extra) {
    if (!this[QUEUE].length && !this[READENTRY])
      this.emit(ev, data, extra)
    else
      this[QUEUE].push([ev, data, extra])
  }

  [EMITMETA] (entry) {
    this[EMIT]('meta', this[META])
    switch (entry.type) {
      case 'ExtendedHeader':
      case 'OldExtendedHeader':
        this[EX] = Pax.parse(this[META], this[EX], false)
        break

      case 'GlobalExtendedHeader':
        this[GEX] = Pax.parse(this[META], this[GEX], true)
        break

      case 'NextFileHasLongPath':
      case 'OldGnuLongPath':
        this[EX] = this[EX] || Object.create(null)
        this[EX].path = this[META].replace(/\0.*/, '')
        break

      case 'NextFileHasLongLinkpath':
        this[EX] = this[EX] || Object.create(null)
        this[EX].linkpath = this[META].replace(/\0.*/, '')
        break

      /* istanbul ignore next */
      default: throw new Error('unknown meta: ' + entry.type)
    }
  }

  abort (msg, error) {
    this[ABORTED] = true
    this.warn(msg, error)
    this.emit('abort', error)
    this.emit('error', error)
  }

  write (chunk) {
    if (this[ABORTED])
      return

    // first write, might be gzipped
    if (this[UNZIP] === null && chunk) {
      if (this[BUFFER]) {
        chunk = Buffer.concat([this[BUFFER], chunk])
        this[BUFFER] = null
      }
      if (chunk.length < gzipHeader.length) {
        this[BUFFER] = chunk
        return true
      }
      for (let i = 0; this[UNZIP] === null && i < gzipHeader.length; i++) {
        if (chunk[i] !== gzipHeader[i])
          this[UNZIP] = false
      }
      if (this[UNZIP] === null) {
        const ended = this[ENDED]
        this[ENDED] = false
        this[UNZIP] = new zlib.Unzip()
        this[UNZIP].on('data', chunk => this[CONSUMECHUNK](chunk))
        this[UNZIP].on('error', er =>
          this.abort(er.message, er))
        this[UNZIP].on('end', _ => {
          this[ENDED] = true
          this[CONSUMECHUNK]()
        })
        this[WRITING] = true
        const ret = this[UNZIP][ended ? 'end' : 'write' ](chunk)
        this[WRITING] = false
        return ret
      }
    }

    this[WRITING] = true
    if (this[UNZIP])
      this[UNZIP].write(chunk)
    else
      this[CONSUMECHUNK](chunk)
    this[WRITING] = false

    // return false if there's a queue, or if the current entry isn't flowing
    const ret =
      this[QUEUE].length ? false :
      this[READENTRY] ? this[READENTRY].flowing :
      true

    // if we have no queue, then that means a clogged READENTRY
    if (!ret && !this[QUEUE].length)
      this[READENTRY].once('drain', _ => this.emit('drain'))

    return ret
  }

  [BUFFERCONCAT] (c) {
    if (c && !this[ABORTED])
      this[BUFFER] = this[BUFFER] ? Buffer.concat([this[BUFFER], c]) : c
  }

  [MAYBEEND] () {
    if (this[ENDED] &&
        !this[EMITTEDEND] &&
        !this[ABORTED] &&
        !this[CONSUMING]) {
      this[EMITTEDEND] = true
      const entry = this[WRITEENTRY]
      if (entry && entry.blockRemain) {
        const have = this[BUFFER] ? this[BUFFER].length : 0
        this.warn('Truncated input (needed ' + entry.blockRemain +
                  ' more bytes, only ' + have + ' available)', entry)
        if (this[BUFFER])
          entry.write(this[BUFFER])
        entry.end()
      }
      this[EMIT](DONE)
    }
  }

  [CONSUMECHUNK] (chunk) {
    if (this[CONSUMING]) {
      this[BUFFERCONCAT](chunk)
    } else if (!chunk && !this[BUFFER]) {
      this[MAYBEEND]()
    } else {
      this[CONSUMING] = true
      if (this[BUFFER]) {
        this[BUFFERCONCAT](chunk)
        const c = this[BUFFER]
        this[BUFFER] = null
        this[CONSUMECHUNKSUB](c)
      } else {
        this[CONSUMECHUNKSUB](chunk)
      }

      while (this[BUFFER] && this[BUFFER].length >= 512 && !this[ABORTED]) {
        const c = this[BUFFER]
        this[BUFFER] = null
        this[CONSUMECHUNKSUB](c)
      }
      this[CONSUMING] = false
    }

    if (!this[BUFFER] || this[ENDED])
      this[MAYBEEND]()
  }

  [CONSUMECHUNKSUB] (chunk) {
    // we know that we are in CONSUMING mode, so anything written goes into
    // the buffer.  Advance the position and put any remainder in the buffer.
    let position = 0
    let length = chunk.length
    while (position + 512 <= length && !this[ABORTED]) {
      switch (this[STATE]) {
        case 'begin':
          this[CONSUMEHEADER](chunk, position)
          position += 512
          break

        case 'ignore':
        case 'body':
          position += this[CONSUMEBODY](chunk, position)
          break

        case 'meta':
          position += this[CONSUMEMETA](chunk, position)
          break

        /* istanbul ignore next */
        default:
          throw new Error('invalid state: ' + this[STATE])
      }
    }

    if (position < length) {
      if (this[BUFFER])
        this[BUFFER] = Buffer.concat([chunk.slice(position), this[BUFFER]])
      else
        this[BUFFER] = chunk.slice(position)
    }
  }

  end (chunk) {
    if (!this[ABORTED]) {
      if (this[UNZIP])
        this[UNZIP].end(chunk)
      else {
        this[ENDED] = true
        this.write(chunk)
      }
    }
  }
})


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const jsonFile = __webpack_require__(70)

module.exports = {
  // jsonfile exports
  readJson: u(jsonFile.readFile),
  readJsonSync: jsonFile.readFileSync,
  writeJson: u(jsonFile.writeFile),
  writeJsonSync: jsonFile.writeFileSync
}


/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("url");

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {


var urilib = __webpack_require__(21);
var helpers = __webpack_require__(7);

module.exports.SchemaScanResult = SchemaScanResult;
function SchemaScanResult(found, ref){
  this.id = found;
  this.ref = ref;
}

/**
 * Adds a schema with a certain urn to the Validator instance.
 * @param string uri
 * @param object schema
 * @return {Object}
 */
module.exports.scan = function scan(base, schema){
  function scanSchema(baseuri, schema){
    if(!schema || typeof schema!='object') return;
    // Mark all referenced schemas so we can tell later which schemas are referred to, but never defined
    if(schema.$ref){
      var resolvedUri = urilib.resolve(baseuri, schema.$ref);
      ref[resolvedUri] = ref[resolvedUri] ? ref[resolvedUri]+1 : 0;
      return;
    }
    var ourBase = schema.id ? urilib.resolve(baseuri, schema.id) : baseuri;
    if (ourBase) {
      // If there's no fragment, append an empty one
      if(ourBase.indexOf('#')<0) ourBase += '#';
      if(found[ourBase]){
        if(!helpers.deepCompareStrict(found[ourBase], schema)){
          throw new Error('Schema <'+schema+'> already exists with different definition');
        }
        return found[ourBase];
      }
      found[ourBase] = schema;
      // strip trailing fragment
      if(ourBase[ourBase.length-1]=='#'){
        found[ourBase.substring(0, ourBase.length-1)] = schema;
      }
    }
    scanArray(ourBase+'/items', ((schema.items instanceof Array)?schema.items:[schema.items]));
    scanArray(ourBase+'/extends', ((schema.extends instanceof Array)?schema.extends:[schema.extends]));
    scanSchema(ourBase+'/additionalItems', schema.additionalItems);
    scanObject(ourBase+'/properties', schema.properties);
    scanSchema(ourBase+'/additionalProperties', schema.additionalProperties);
    scanObject(ourBase+'/definitions', schema.definitions);
    scanObject(ourBase+'/patternProperties', schema.patternProperties);
    scanObject(ourBase+'/dependencies', schema.dependencies);
    scanArray(ourBase+'/disallow', schema.disallow);
    scanArray(ourBase+'/allOf', schema.allOf);
    scanArray(ourBase+'/anyOf', schema.anyOf);
    scanArray(ourBase+'/oneOf', schema.oneOf);
    scanSchema(ourBase+'/not', schema.not);
  }
  function scanArray(baseuri, schemas){
    if(!(schemas instanceof Array)) return;
    for(var i=0; i<schemas.length; i++){
      scanSchema(baseuri+'/'+i, schemas[i]);
    }
  }
  function scanObject(baseuri, schemas){
    if(!schemas || typeof schemas!='object') return;
    for(var p in schemas){
      scanSchema(baseuri+'/'+p, schemas[p]);
    }
  }

  var found = {};
  var ref = {};
  var schemaUri = base;
  scanSchema(base, schema);
  return new SchemaScanResult(found, ref);
}


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const Buffer = __webpack_require__(6)

// A readable tar stream creator
// Technically, this is a transform stream that you write paths into,
// and tar format comes out of.
// The `add()` method is like `write()` but returns this,
// and end() return `this` as well, so you can
// do `new Pack(opt).add('files').add('dir').end().pipe(output)
// You could also do something like:
// streamOfPaths().pipe(new Pack()).pipe(new fs.WriteStream('out.tar'))

class PackJob {
  constructor (path, absolute) {
    this.path = path || './'
    this.absolute = absolute
    this.entry = null
    this.stat = null
    this.readdir = null
    this.pending = false
    this.ignore = false
    this.piped = false
  }
}

const MiniPass = __webpack_require__(9)
const zlib = __webpack_require__(37)
const ReadEntry = __webpack_require__(17)
const WriteEntry = __webpack_require__(38)
const WriteEntrySync = WriteEntry.Sync
const WriteEntryTar = WriteEntry.Tar
const Yallist = __webpack_require__(24)
const EOF = Buffer.alloc(1024)
const ONSTAT = Symbol('onStat')
const ENDED = Symbol('ended')
const QUEUE = Symbol('queue')
const CURRENT = Symbol('current')
const PROCESS = Symbol('process')
const PROCESSING = Symbol('processing')
const PROCESSJOB = Symbol('processJob')
const JOBS = Symbol('jobs')
const JOBDONE = Symbol('jobDone')
const ADDFSENTRY = Symbol('addFSEntry')
const ADDTARENTRY = Symbol('addTarEntry')
const STAT = Symbol('stat')
const READDIR = Symbol('readdir')
const ONREADDIR = Symbol('onreaddir')
const PIPE = Symbol('pipe')
const ENTRY = Symbol('entry')
const ENTRYOPT = Symbol('entryOpt')
const WRITEENTRYCLASS = Symbol('writeEntryClass')
const WRITE = Symbol('write')
const ONDRAIN = Symbol('ondrain')

const fs = __webpack_require__(2)
const path = __webpack_require__(0)
const warner = __webpack_require__(26)

const Pack = warner(class Pack extends MiniPass {
  constructor (opt) {
    super(opt)
    opt = opt || Object.create(null)
    this.opt = opt
    this.cwd = opt.cwd || process.cwd()
    this.maxReadSize = opt.maxReadSize
    this.preservePaths = !!opt.preservePaths
    this.strict = !!opt.strict
    this.noPax = !!opt.noPax
    this.prefix = (opt.prefix || '').replace(/(\\|\/)+$/, '')
    this.linkCache = opt.linkCache || new Map()
    this.statCache = opt.statCache || new Map()
    this.readdirCache = opt.readdirCache || new Map()

    this[WRITEENTRYCLASS] = WriteEntry
    if (typeof opt.onwarn === 'function')
      this.on('warn', opt.onwarn)

    this.zip = null
    if (opt.gzip) {
      if (typeof opt.gzip !== 'object')
        opt.gzip = {}
      this.zip = new zlib.Gzip(opt.gzip)
      this.zip.on('data', chunk => super.write(chunk))
      this.zip.on('end', _ => super.end())
      this.zip.on('drain', _ => this[ONDRAIN]())
      this.on('resume', _ => this.zip.resume())
    } else
      this.on('drain', this[ONDRAIN])

    this.portable = !!opt.portable
    this.noDirRecurse = !!opt.noDirRecurse
    this.follow = !!opt.follow
    this.noMtime = !!opt.noMtime
    this.mtime = opt.mtime || null

    this.filter = typeof opt.filter === 'function' ? opt.filter : _ => true

    this[QUEUE] = new Yallist
    this[JOBS] = 0
    this.jobs = +opt.jobs || 4
    this[PROCESSING] = false
    this[ENDED] = false
  }

  [WRITE] (chunk) {
    return super.write(chunk)
  }

  add (path) {
    this.write(path)
    return this
  }

  end (path) {
    if (path)
      this.write(path)
    this[ENDED] = true
    this[PROCESS]()
    return this
  }

  write (path) {
    if (this[ENDED])
      throw new Error('write after end')

    if (path instanceof ReadEntry)
      this[ADDTARENTRY](path)
    else
      this[ADDFSENTRY](path)
    return this.flowing
  }

  [ADDTARENTRY] (p) {
    const absolute = path.resolve(this.cwd, p.path)
    if (this.prefix)
      p.path = this.prefix + '/' + p.path.replace(/^\.(\/+|$)/, '')

    // in this case, we don't have to wait for the stat
    if (!this.filter(p.path, p))
      p.resume()
    else {
      const job = new PackJob(p.path, absolute, false)
      job.entry = new WriteEntryTar(p, this[ENTRYOPT](job))
      job.entry.on('end', _ => this[JOBDONE](job))
      this[JOBS] += 1
      this[QUEUE].push(job)
    }

    this[PROCESS]()
  }

  [ADDFSENTRY] (p) {
    const absolute = path.resolve(this.cwd, p)
    if (this.prefix)
      p = this.prefix + '/' + p.replace(/^\.(\/+|$)/, '')

    this[QUEUE].push(new PackJob(p, absolute))
    this[PROCESS]()
  }

  [STAT] (job) {
    job.pending = true
    this[JOBS] += 1
    const stat = this.follow ? 'stat' : 'lstat'
    fs[stat](job.absolute, (er, stat) => {
      job.pending = false
      this[JOBS] -= 1
      if (er)
        this.emit('error', er)
      else
        this[ONSTAT](job, stat)
    })
  }

  [ONSTAT] (job, stat) {
    this.statCache.set(job.absolute, stat)
    job.stat = stat

    // now we have the stat, we can filter it.
    if (!this.filter(job.path, stat))
      job.ignore = true

    this[PROCESS]()
  }

  [READDIR] (job) {
    job.pending = true
    this[JOBS] += 1
    fs.readdir(job.absolute, (er, entries) => {
      job.pending = false
      this[JOBS] -= 1
      if (er)
        return this.emit('error', er)
      this[ONREADDIR](job, entries)
    })
  }

  [ONREADDIR] (job, entries) {
    this.readdirCache.set(job.absolute, entries)
    job.readdir = entries
    this[PROCESS]()
  }

  [PROCESS] () {
    if (this[PROCESSING])
      return

    this[PROCESSING] = true
    for (let w = this[QUEUE].head;
         w !== null && this[JOBS] < this.jobs;
         w = w.next) {
      this[PROCESSJOB](w.value)
      if (w.value.ignore) {
        const p = w.next
        this[QUEUE].removeNode(w)
        w.next = p
      }
    }

    this[PROCESSING] = false

    if (this[ENDED] && !this[QUEUE].length && this[JOBS] === 0) {
      if (this.zip)
        this.zip.end(EOF)
      else {
        super.write(EOF)
        super.end()
      }
    }
  }

  get [CURRENT] () {
    return this[QUEUE] && this[QUEUE].head && this[QUEUE].head.value
  }

  [JOBDONE] (job) {
    this[QUEUE].shift()
    this[JOBS] -= 1
    this[PROCESS]()
  }

  [PROCESSJOB] (job) {
    if (job.pending)
      return

    if (job.entry) {
      if (job === this[CURRENT] && !job.piped)
        this[PIPE](job)
      return
    }

    if (!job.stat) {
      if (this.statCache.has(job.absolute))
        this[ONSTAT](job, this.statCache.get(job.absolute))
      else
        this[STAT](job)
    }
    if (!job.stat)
      return

    // filtered out!
    if (job.ignore)
      return

    if (!this.noDirRecurse && job.stat.isDirectory() && !job.readdir) {
      if (this.readdirCache.has(job.absolute))
        this[ONREADDIR](job, this.readdirCache.get(job.absolute))
      else
        this[READDIR](job)
      if (!job.readdir)
        return
    }

    // we know it doesn't have an entry, because that got checked above
    job.entry = this[ENTRY](job)
    if (!job.entry) {
      job.ignore = true
      return
    }

    if (job === this[CURRENT] && !job.piped)
      this[PIPE](job)
  }

  [ENTRYOPT] (job) {
    return {
      onwarn: (msg, data) => {
        this.warn(msg, data)
      },
      noPax: this.noPax,
      cwd: this.cwd,
      absolute: job.absolute,
      preservePaths: this.preservePaths,
      maxReadSize: this.maxReadSize,
      strict: this.strict,
      portable: this.portable,
      linkCache: this.linkCache,
      statCache: this.statCache,
      noMtime: this.noMtime,
      mtime: this.mtime
    }
  }

  [ENTRY] (job) {
    this[JOBS] += 1
    try {
      return new this[WRITEENTRYCLASS](job.path, this[ENTRYOPT](job))
        .on('end', () => this[JOBDONE](job))
        .on('error', er => this.emit('error', er))
    } catch (er) {
      this.emit('error', er)
    }
  }

  [ONDRAIN] () {
    if (this[CURRENT] && this[CURRENT].entry)
      this[CURRENT].entry.resume()
  }

  // like .pipe() but using super, because our write() is special
  [PIPE] (job) {
    job.piped = true

    if (job.readdir)
      job.readdir.forEach(entry => {
        const p = this.prefix ?
          job.path.slice(this.prefix.length + 1) || './'
          : job.path

        const base = p === './' ? '' : p.replace(/\/*$/, '/')
        this[ADDFSENTRY](base + entry)
      })

    const source = job.entry
    const zip = this.zip

    if (zip)
      source.on('data', chunk => {
        if (!zip.write(chunk))
          source.pause()
      })
    else
      source.on('data', chunk => {
        if (!super.write(chunk))
          source.pause()
      })
  }

  pause () {
    if (this.zip)
      this.zip.pause()
    return super.pause()
  }
})

class PackSync extends Pack {
  constructor (opt) {
    super(opt)
    this[WRITEENTRYCLASS] = WriteEntrySync
  }

  // pause/resume are no-ops in sync streams.
  pause () {}
  resume () {}

  [STAT] (job) {
    const stat = this.follow ? 'statSync' : 'lstatSync'
    this[ONSTAT](job, fs[stat](job.absolute))
  }

  [READDIR] (job, stat) {
    this[ONREADDIR](job, fs.readdirSync(job.absolute))
  }

  // gotta get it all in this tick
  [PIPE] (job) {
    const source = job.entry
    const zip = this.zip

    if (job.readdir)
      job.readdir.forEach(entry => {
        const p = this.prefix ?
          job.path.slice(this.prefix.length + 1) || './'
          : job.path

        const base = p === './' ? '' : p.replace(/\/*$/, '/')
        this[ADDFSENTRY](base + entry)
      })

    if (zip)
      source.on('data', chunk => {
        zip.write(chunk)
      })
    else
      source.on('data', chunk => {
        super[WRITE](chunk)
      })
  }
}

Pack.Sync = PackSync

module.exports = Pack


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = Yallist

Yallist.Node = Node
Yallist.create = Yallist

function Yallist (list) {
  var self = this
  if (!(self instanceof Yallist)) {
    self = new Yallist()
  }

  self.tail = null
  self.head = null
  self.length = 0

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item)
    })
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i])
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next
  var prev = node.prev

  if (next) {
    next.prev = prev
  }

  if (prev) {
    prev.next = next
  }

  if (node === this.head) {
    this.head = next
  }
  if (node === this.tail) {
    this.tail = prev
  }

  node.list.length--
  node.next = null
  node.prev = null
  node.list = null
}

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var head = this.head
  node.list = this
  node.next = head
  if (head) {
    head.prev = node
  }

  this.head = node
  if (!this.tail) {
    this.tail = node
  }
  this.length++
}

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var tail = this.tail
  node.list = this
  node.prev = tail
  if (tail) {
    tail.next = node
  }

  this.tail = node
  if (!this.head) {
    this.head = node
  }
  this.length++
}

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.pop = function () {
  if (!this.tail) {
    return undefined
  }

  var res = this.tail.value
  this.tail = this.tail.prev
  if (this.tail) {
    this.tail.next = null
  } else {
    this.head = null
  }
  this.length--
  return res
}

Yallist.prototype.shift = function () {
  if (!this.head) {
    return undefined
  }

  var res = this.head.value
  this.head = this.head.next
  if (this.head) {
    this.head.prev = null
  } else {
    this.tail = null
  }
  this.length--
  return res
}

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.next
  }
}

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.prev
  }
}

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.head; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.next
  }
  return res
}

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.prev
  }
  return res
}

Yallist.prototype.reduce = function (fn, initial) {
  var acc
  var walker = this.head
  if (arguments.length > 1) {
    acc = initial
  } else if (this.head) {
    walker = this.head.next
    acc = this.head.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i)
    walker = walker.next
  }

  return acc
}

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc
  var walker = this.tail
  if (arguments.length > 1) {
    acc = initial
  } else if (this.tail) {
    walker = this.tail.prev
    acc = this.tail.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i)
    walker = walker.prev
  }

  return acc
}

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.next
  }
  return arr
}

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.prev
  }
  return arr
}

Yallist.prototype.slice = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.reverse = function () {
  var head = this.head
  var tail = this.tail
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev
    walker.prev = walker.next
    walker.next = p
  }
  this.head = tail
  this.tail = head
  return this
}

function push (self, item) {
  self.tail = new Node(item, self.tail, null, self)
  if (!self.head) {
    self.head = self.tail
  }
  self.length++
}

function unshift (self, item) {
  self.head = new Node(item, null, self.head, self)
  if (!self.tail) {
    self.tail = self.head
  }
  self.length++
}

function Node (value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list)
  }

  this.list = list
  this.value = value

  if (prev) {
    prev.next = this
    this.prev = prev
  } else {
    this.prev = null
  }

  if (next) {
    next.prev = this
    this.next = next
  } else {
    this.next = null
  }
}

try {
  // add if support for Symbol.iterator is present
  __webpack_require__(87)(Yallist)
} catch (er) {}


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const Buffer = __webpack_require__(6)
const Header = __webpack_require__(10)
const path = __webpack_require__(0)

class Pax {
  constructor (obj, global) {
    this.atime = obj.atime || null
    this.charset = obj.charset || null
    this.comment = obj.comment || null
    this.ctime = obj.ctime || null
    this.gid = obj.gid || null
    this.gname = obj.gname || null
    this.linkpath = obj.linkpath || null
    this.mtime = obj.mtime || null
    this.path = obj.path || null
    this.size = obj.size || null
    this.uid = obj.uid || null
    this.uname = obj.uname || null
    this.dev = obj.dev || null
    this.ino = obj.ino || null
    this.nlink = obj.nlink || null
    this.global = global || false
  }

  encode () {
    const body = this.encodeBody()
    if (body === '')
      return null

    const bodyLen = Buffer.byteLength(body)
    // round up to 512 bytes
    // add 512 for header
    const bufLen = 512 * Math.ceil(1 + bodyLen / 512)
    const buf = Buffer.allocUnsafe(bufLen)

    // 0-fill the header section, it might not hit every field
    for (let i = 0; i < 512; i++) {
      buf[i] = 0
    }

    new Header({
      // XXX split the path
      // then the path should be PaxHeader + basename, but less than 99,
      // prepend with the dirname
      path: ('PaxHeader/' + path.basename(this.path)).slice(0, 99),
      mode: this.mode || 0o644,
      uid: this.uid || null,
      gid: this.gid || null,
      size: bodyLen,
      mtime: this.mtime || null,
      type: this.global ? 'GlobalExtendedHeader' : 'ExtendedHeader',
      linkpath: '',
      uname: this.uname || '',
      gname: this.gname || '',
      devmaj: 0,
      devmin: 0,
      atime: this.atime || null,
      ctime: this.ctime || null
    }).encode(buf)

    buf.write(body, 512, bodyLen, 'utf8')

    // null pad after the body
    for (let i = bodyLen + 512; i < buf.length; i++) {
      buf[i] = 0
    }

    return buf
  }

  encodeBody () {
    return (
      this.encodeField('path') +
      this.encodeField('ctime') +
      this.encodeField('atime') +
      this.encodeField('dev') +
      this.encodeField('ino') +
      this.encodeField('nlink') +
      this.encodeField('charset') +
      this.encodeField('comment') +
      this.encodeField('gid') +
      this.encodeField('gname') +
      this.encodeField('linkpath') +
      this.encodeField('mtime') +
      this.encodeField('size') +
      this.encodeField('uid') +
      this.encodeField('uname')
    )
  }

  encodeField (field) {
    if (this[field] === null || this[field] === undefined)
      return ''
    const v = this[field] instanceof Date ? this[field].getTime() / 1000
      : this[field]
    const s = ' ' +
      (field === 'dev' || field === 'ino' || field === 'nlink'
       ? 'SCHILY.' : '') +
      field + '=' + v + '\n'
    const byteLen = Buffer.byteLength(s)
    // the digits includes the length of the digits in ascii base-10
    // so if it's 9 characters, then adding 1 for the 9 makes it 10
    // which makes it 11 chars.
    let digits = Math.floor(Math.log(byteLen) / Math.log(10)) + 1
    if (byteLen + digits >= Math.pow(10, digits))
      digits += 1
    const len = digits + byteLen
    return len + s
  }
}

Pax.parse = (string, ex, g) => new Pax(merge(parseKV(string), ex), g)

const merge = (a, b) =>
  b ? Object.keys(a).reduce((s, k) => (s[k] = a[k], s), b) : a

const parseKV = string =>
  string
    .replace(/\n$/, '')
    .split('\n')
    .reduce(parseKVLine, Object.create(null))

const parseKVLine = (set, line) => {
  const n = parseInt(line, 10)

  // XXX Values with \n in them will fail this.
  // Refactor to not be a naive line-by-line parse.
  if (n !== Buffer.byteLength(line) + 1)
    return set

  line = line.substr((n + ' ').length)
  const kv = line.split('=')
  const k = kv.shift().replace(/^SCHILY\.(dev|ino|nlink)/, '$1')
  if (!k)
    return set

  const v = kv.join('=')
  set[k] = /^([A-Z]+\.)?([mac]|birth|creation)time$/.test(k)
    ?  new Date(v * 1000)
    : /^[0-9]+$/.test(v) ? +v
    : v
  return set
}

module.exports = Pax


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = Base => class extends Base {
  warn (msg, data) {
    if (!this.strict)
      this.emit('warn', msg, data)
    else if (data instanceof Error)
      this.emit('error', data)
    else {
      const er = new Error(msg)
      er.data = data
      this.emit('error', er)
    }
  }
}


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const Buffer = __webpack_require__(6)

// XXX: This shares a lot in common with extract.js
// maybe some DRY opportunity here?

// tar -t
const hlo = __webpack_require__(8)
const Parser = __webpack_require__(19)
const fs = __webpack_require__(2)
const fsm = __webpack_require__(11)
const path = __webpack_require__(0)

const t = module.exports = (opt_, files, cb) => {
  if (typeof opt_ === 'function')
    cb = opt_, files = null, opt_ = {}
  else if (Array.isArray(opt_))
    files = opt_, opt_ = {}

  if (typeof files === 'function')
    cb = files, files = null

  if (!files)
    files = []
  else
    files = Array.from(files)

  const opt = hlo(opt_)

  if (opt.sync && typeof cb === 'function')
    throw new TypeError('callback not supported for sync tar functions')

  if (!opt.file && typeof cb === 'function')
    throw new TypeError('callback only supported with file option')

  if (files.length)
    filesFilter(opt, files)

  if (!opt.noResume)
    onentryFunction(opt)

  return opt.file && opt.sync ? listFileSync(opt)
    : opt.file ? listFile(opt, cb)
    : list(opt)
}

const onentryFunction = opt => {
  const onentry = opt.onentry
  opt.onentry = onentry ? e => {
    onentry(e)
    e.resume()
  } : e => e.resume()
}

// construct a filter that limits the file entries listed
// include child entries if a dir is included
const filesFilter = (opt, files) => {
  const map = new Map(files.map(f => [f.replace(/\/+$/, ''), true]))
  const filter = opt.filter

  const mapHas = (file, r) => {
    const root = r || path.parse(file).root || '.'
    const ret = file === root ? false
      : map.has(file) ? map.get(file)
      : mapHas(path.dirname(file), root)

    map.set(file, ret)
    return ret
  }

  opt.filter = filter
    ? (file, entry) => filter(file, entry) && mapHas(file.replace(/\/+$/, ''))
    : file => mapHas(file.replace(/\/+$/, ''))
}

const listFileSync = opt => {
  const p = list(opt)
  const file = opt.file
  let threw = true
  let fd
  try {
    const stat = fs.statSync(file)
    const readSize = opt.maxReadSize || 16*1024*1024
    if (stat.size < readSize) {
      p.end(fs.readFileSync(file))
    } else {
      let pos = 0
      const buf = Buffer.allocUnsafe(readSize)
      fd = fs.openSync(file, 'r')
      while (pos < stat.size) {
        let bytesRead = fs.readSync(fd, buf, 0, readSize, pos)
        pos += bytesRead
        p.write(buf.slice(0, bytesRead))
      }
      p.end()
    }
    threw = false
  } finally {
    if (threw && fd)
      try { fs.closeSync(fd) } catch (er) {}
  }
}

const listFile = (opt, cb) => {
  const parse = new Parser(opt)
  const readSize = opt.maxReadSize || 16*1024*1024

  const file = opt.file
  const p = new Promise((resolve, reject) => {
    parse.on('error', reject)
    parse.on('end', resolve)

    fs.stat(file, (er, stat) => {
      if (er)
        reject(er)
      else {
        const stream = new fsm.ReadStream(file, {
          readSize: readSize,
          size: stat.size
        })
        stream.on('error', reject)
        stream.pipe(parse)
      }
    })
  })
  return cb ? p.then(cb, cb) : p
}

const list = opt => new Parser(opt)


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = __webpack_require__(3).fromCallback
const fs = __webpack_require__(1)

const api = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'lchown',
  'lchmod',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'readFile',
  'readdir',
  'readlink',
  'realpath',
  'rename',
  'rmdir',
  'stat',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile'
].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.copyFile was added in Node.js v8.5.0
  // fs.mkdtemp was added in Node.js v5.10.0
  // fs.lchown is not available on at least some Linux
  return typeof fs[key] === 'function'
})

// Export all keys:
Object.keys(fs).forEach(key => {
  if (key === 'promises') {
    // fs.promises is a getter property that triggers ExperimentalWarning
    // Don't re-export it here, the getter is defined in "lib/index.js"
    return
  }
  exports[key] = fs[key]
})

// Universalify async methods:
api.forEach(method => {
  exports[method] = u(fs[method])
})

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return fs.exists(filename, callback)
  }
  return new Promise(resolve => {
    return fs.exists(filename, resolve)
  })
}

// fs.read() & fs.write need special treatment due to multiple callback args

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return fs.read(fd, buffer, offset, length, position, callback)
  }
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffer })
    })
  })
}

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
exports.write = function (fd, buffer, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.write(fd, buffer, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffer })
    })
  })
}

// fs.realpath.native only available in Node v9.2+
if (typeof fs.realpath.native === 'function') {
  exports.realpath.native = u(fs.realpath.native)
}


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {
  copySync: __webpack_require__(56)
}


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const path = __webpack_require__(0)

// get drive on windows
function getRootPath (p) {
  p = path.normalize(path.resolve(p)).split(path.sep)
  if (p.length > 0) return p[0]
  return null
}

// http://stackoverflow.com/a/62888/10333 contains more accurate
// TODO: expand to include the rest
const INVALID_PATH_CHARS = /[<>:"|?*]/

function invalidWin32Path (p) {
  const rp = getRootPath(p)
  p = p.replace(rp, '')
  return INVALID_PATH_CHARS.test(p)
}

module.exports = {
  getRootPath,
  invalidWin32Path
}


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const os = __webpack_require__(32)
const path = __webpack_require__(0)

// HFS, ext{2,3}, FAT do not, Node.js v0.10 does not
function hasMillisResSync () {
  let tmpfile = path.join('millis-test-sync' + Date.now().toString() + Math.random().toString().slice(2))
  tmpfile = path.join(os.tmpdir(), tmpfile)

  // 550 millis past UNIX epoch
  const d = new Date(1435410243862)
  fs.writeFileSync(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141')
  const fd = fs.openSync(tmpfile, 'r+')
  fs.futimesSync(fd, d, d)
  fs.closeSync(fd)
  return fs.statSync(tmpfile).mtime > 1435410243000
}

function hasMillisRes (callback) {
  let tmpfile = path.join('millis-test' + Date.now().toString() + Math.random().toString().slice(2))
  tmpfile = path.join(os.tmpdir(), tmpfile)

  // 550 millis past UNIX epoch
  const d = new Date(1435410243862)
  fs.writeFile(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141', err => {
    if (err) return callback(err)
    fs.open(tmpfile, 'r+', (err, fd) => {
      if (err) return callback(err)
      fs.futimes(fd, d, d, err => {
        if (err) return callback(err)
        fs.close(fd, err => {
          if (err) return callback(err)
          fs.stat(tmpfile, (err, stats) => {
            if (err) return callback(err)
            callback(null, stats.mtime > 1435410243000)
          })
        })
      })
    })
  })
}

function timeRemoveMillis (timestamp) {
  if (typeof timestamp === 'number') {
    return Math.floor(timestamp / 1000) * 1000
  } else if (timestamp instanceof Date) {
    return new Date(Math.floor(timestamp.getTime() / 1000) * 1000)
  } else {
    throw new Error('fs-extra: timeRemoveMillis() unknown parameter type')
  }
}

function utimesMillis (path, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  fs.open(path, 'r+', (err, fd) => {
    if (err) return callback(err)
    fs.futimes(fd, atime, mtime, futimesErr => {
      fs.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr)
      })
    })
  })
}

function utimesMillisSync (path, atime, mtime) {
  const fd = fs.openSync(path, 'r+')
  fs.futimesSync(fd, atime, mtime)
  return fs.closeSync(fd)
}

module.exports = {
  hasMillisRes,
  hasMillisResSync,
  timeRemoveMillis,
  utimesMillis,
  utimesMillisSync
}


/***/ }),
/* 32 */
/***/ (function(module, exports) {

module.exports = require("os");

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
module.exports = {
  copy: u(__webpack_require__(60))
}


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(78));
__export(__webpack_require__(79));
__export(__webpack_require__(80));


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

/* eslint-disable node/no-deprecated-api */
var buffer = __webpack_require__(36)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),
/* 36 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const assert = __webpack_require__(13)
const Buffer = __webpack_require__(36).Buffer
const realZlib = __webpack_require__(89)

const constants = exports.constants = __webpack_require__(90)
const MiniPass = __webpack_require__(9)

const OriginalBufferConcat = Buffer.concat

class ZlibError extends Error {
  constructor (msg, errno) {
    super('zlib: ' + msg)
    this.errno = errno
    this.code = codes.get(errno)
  }

  get name () {
    return 'ZlibError'
  }
}

// translation table for return codes.
const codes = new Map([
  [constants.Z_OK, 'Z_OK'],
  [constants.Z_STREAM_END, 'Z_STREAM_END'],
  [constants.Z_NEED_DICT, 'Z_NEED_DICT'],
  [constants.Z_ERRNO, 'Z_ERRNO'],
  [constants.Z_STREAM_ERROR, 'Z_STREAM_ERROR'],
  [constants.Z_DATA_ERROR, 'Z_DATA_ERROR'],
  [constants.Z_MEM_ERROR, 'Z_MEM_ERROR'],
  [constants.Z_BUF_ERROR, 'Z_BUF_ERROR'],
  [constants.Z_VERSION_ERROR, 'Z_VERSION_ERROR']
])

const validFlushFlags = new Set([
  constants.Z_NO_FLUSH,
  constants.Z_PARTIAL_FLUSH,
  constants.Z_SYNC_FLUSH,
  constants.Z_FULL_FLUSH,
  constants.Z_FINISH,
  constants.Z_BLOCK
])

const strategies = new Set([
  constants.Z_FILTERED,
  constants.Z_HUFFMAN_ONLY,
  constants.Z_RLE,
  constants.Z_FIXED,
  constants.Z_DEFAULT_STRATEGY
])

// the Zlib class they all inherit from
// This thing manages the queue of requests, and returns
// true or false if there is anything in the queue when
// you call the .write() method.
const _opts = Symbol('opts')
const _flushFlag = Symbol('flushFlag')
const _finishFlush = Symbol('finishFlush')
const _handle = Symbol('handle')
const _onError = Symbol('onError')
const _level = Symbol('level')
const _strategy = Symbol('strategy')
const _ended = Symbol('ended')

class Zlib extends MiniPass {
  constructor (opts, mode) {
    super(opts)
    this[_ended] = false
    this[_opts] = opts = opts || {}
    if (opts.flush && !validFlushFlags.has(opts.flush)) {
      throw new TypeError('Invalid flush flag: ' + opts.flush)
    }
    if (opts.finishFlush && !validFlushFlags.has(opts.finishFlush)) {
      throw new TypeError('Invalid flush flag: ' + opts.finishFlush)
    }

    this[_flushFlag] = opts.flush || constants.Z_NO_FLUSH
    this[_finishFlush] = typeof opts.finishFlush !== 'undefined' ?
      opts.finishFlush : constants.Z_FINISH

    if (opts.chunkSize) {
      if (opts.chunkSize < constants.Z_MIN_CHUNK) {
        throw new RangeError('Invalid chunk size: ' + opts.chunkSize)
      }
    }

    if (opts.windowBits) {
      if (opts.windowBits < constants.Z_MIN_WINDOWBITS ||
          opts.windowBits > constants.Z_MAX_WINDOWBITS) {
        throw new RangeError('Invalid windowBits: ' + opts.windowBits)
      }
    }

    if (opts.level) {
      if (opts.level < constants.Z_MIN_LEVEL ||
          opts.level > constants.Z_MAX_LEVEL) {
        throw new RangeError('Invalid compression level: ' + opts.level)
      }
    }

    if (opts.memLevel) {
      if (opts.memLevel < constants.Z_MIN_MEMLEVEL ||
          opts.memLevel > constants.Z_MAX_MEMLEVEL) {
        throw new RangeError('Invalid memLevel: ' + opts.memLevel)
      }
    }

    if (opts.strategy && !(strategies.has(opts.strategy)))
      throw new TypeError('Invalid strategy: ' + opts.strategy)

    if (opts.dictionary) {
      if (!(opts.dictionary instanceof Buffer)) {
        throw new TypeError('Invalid dictionary: it should be a Buffer instance')
      }
    }

    this[_handle] = new realZlib[mode](opts)

    this[_onError] = (err) => {
      // there is no way to cleanly recover.
      // continuing only obscures problems.
      this.close()

      const error = new ZlibError(err.message, err.errno)
      this.emit('error', error)
    }
    this[_handle].on('error', this[_onError])

    const level = typeof opts.level === 'number' ? opts.level
                : constants.Z_DEFAULT_COMPRESSION

    var strategy = typeof opts.strategy === 'number' ? opts.strategy
                 : constants.Z_DEFAULT_STRATEGY

    // API changed in node v9
    /* istanbul ignore next */

    this[_level] = level
    this[_strategy] = strategy

    this.once('end', this.close)
  }

  close () {
    if (this[_handle]) {
      this[_handle].close()
      this[_handle] = null
      this.emit('close')
    }
  }

  params (level, strategy) {
    if (!this[_handle])
      throw new Error('cannot switch params when binding is closed')

    // no way to test this without also not supporting params at all
    /* istanbul ignore if */
    if (!this[_handle].params)
      throw new Error('not supported in this implementation')

    if (level < constants.Z_MIN_LEVEL ||
        level > constants.Z_MAX_LEVEL) {
      throw new RangeError('Invalid compression level: ' + level)
    }

    if (!(strategies.has(strategy)))
      throw new TypeError('Invalid strategy: ' + strategy)

    if (this[_level] !== level || this[_strategy] !== strategy) {
      this.flush(constants.Z_SYNC_FLUSH)
      assert(this[_handle], 'zlib binding closed')
      // .params() calls .flush(), but the latter is always async in the
      // core zlib. We override .flush() temporarily to intercept that and
      // flush synchronously.
      const origFlush = this[_handle].flush
      this[_handle].flush = (flushFlag, cb) => {
        this[_handle].flush = origFlush
        this.flush(flushFlag)
        cb()
      }
      this[_handle].params(level, strategy)
      /* istanbul ignore else */
      if (this[_handle]) {
        this[_level] = level
        this[_strategy] = strategy
      }
    }
  }

  reset () {
    assert(this[_handle], 'zlib binding closed')
    return this[_handle].reset()
  }

  flush (kind) {
    if (kind === undefined)
      kind = constants.Z_FULL_FLUSH

    if (this.ended)
      return

    const flushFlag = this[_flushFlag]
    this[_flushFlag] = kind
    this.write(Buffer.alloc(0))
    this[_flushFlag] = flushFlag
  }

  end (chunk, encoding, cb) {
    if (chunk)
      this.write(chunk, encoding)
    this.flush(this[_finishFlush])
    this[_ended] = true
    return super.end(null, null, cb)
  }

  get ended () {
    return this[_ended]
  }

  write (chunk, encoding, cb) {
    // process the chunk using the sync process
    // then super.write() all the outputted chunks
    if (typeof encoding === 'function')
      cb = encoding, encoding = 'utf8'

    if (typeof chunk === 'string')
      chunk = Buffer.from(chunk, encoding)

    assert(this[_handle], 'zlib binding closed')

    // _processChunk tries to .close() the native handle after it's done, so we
    // intercept that by temporarily making it a no-op.
    const nativeHandle = this[_handle]._handle
    const originalNativeClose = nativeHandle.close
    nativeHandle.close = () => {}
    const originalClose = this[_handle].close
    this[_handle].close = () => {}
    // It also calls `Buffer.concat()` at the end, which may be convenient
    // for some, but which we are not interested in as it slows us down.
    Buffer.concat = (args) => args
    let result
    try {
      result = this[_handle]._processChunk(chunk, this[_flushFlag])
    } catch (err) {
      this[_onError](err)
    } finally {
      Buffer.concat = OriginalBufferConcat
      if (this[_handle]) {
        // Core zlib resets `_handle` to null after attempting to close the
        // native handle. Our no-op handler prevented actual closure, but we
        // need to restore the `._handle` property.
        this[_handle]._handle = nativeHandle
        nativeHandle.close = originalNativeClose
        this[_handle].close = originalClose
        // `_processChunk()` adds an 'error' listener. If we don't remove it
        // after each call, these handlers start piling up.
        this[_handle].removeAllListeners('error')
      }
    }

    let writeReturn
    if (result) {
      if (Array.isArray(result) && result.length > 0) {
        // The first buffer is always `handle._outBuffer`, which would be
        // re-used for later invocations; so, we always have to copy that one.
        writeReturn = super.write(Buffer.from(result[0]))
        for (let i = 1; i < result.length; i++) {
          writeReturn = super.write(result[i])
        }
      } else {
        writeReturn = super.write(Buffer.from(result))
      }
    }

    if (cb)
      cb()
    return writeReturn
  }
}

// minimal 2-byte header
class Deflate extends Zlib {
  constructor (opts) {
    super(opts, 'Deflate')
  }
}

class Inflate extends Zlib {
  constructor (opts) {
    super(opts, 'Inflate')
  }
}

// gzip - bigger header, same deflate compression
class Gzip extends Zlib {
  constructor (opts) {
    super(opts, 'Gzip')
  }
}

class Gunzip extends Zlib {
  constructor (opts) {
    super(opts, 'Gunzip')
  }
}

// raw - no header
class DeflateRaw extends Zlib {
  constructor (opts) {
    super(opts, 'DeflateRaw')
  }
}

class InflateRaw extends Zlib {
  constructor (opts) {
    super(opts, 'InflateRaw')
  }
}

// auto-detect header.
class Unzip extends Zlib {
  constructor (opts) {
    super(opts, 'Unzip')
  }
}

exports.Deflate = Deflate
exports.Inflate = Inflate
exports.Gzip = Gzip
exports.Gunzip = Gunzip
exports.DeflateRaw = DeflateRaw
exports.InflateRaw = InflateRaw
exports.Unzip = Unzip


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const Buffer = __webpack_require__(6)
const MiniPass = __webpack_require__(9)
const Pax = __webpack_require__(25)
const Header = __webpack_require__(10)
const ReadEntry = __webpack_require__(17)
const fs = __webpack_require__(2)
const path = __webpack_require__(0)

const types = __webpack_require__(18)
const maxReadSize = 16 * 1024 * 1024
const PROCESS = Symbol('process')
const FILE = Symbol('file')
const DIRECTORY = Symbol('directory')
const SYMLINK = Symbol('symlink')
const HARDLINK = Symbol('hardlink')
const HEADER = Symbol('header')
const READ = Symbol('read')
const LSTAT = Symbol('lstat')
const ONLSTAT = Symbol('onlstat')
const ONREAD = Symbol('onread')
const ONREADLINK = Symbol('onreadlink')
const OPENFILE = Symbol('openfile')
const ONOPENFILE = Symbol('onopenfile')
const CLOSE = Symbol('close')
const MODE = Symbol('mode')
const warner = __webpack_require__(26)
const winchars = __webpack_require__(39)

const modeFix = __webpack_require__(92)

const WriteEntry = warner(class WriteEntry extends MiniPass {
  constructor (p, opt) {
    opt = opt || {}
    super(opt)
    if (typeof p !== 'string')
      throw new TypeError('path is required')
    this.path = p
    // suppress atime, ctime, uid, gid, uname, gname
    this.portable = !!opt.portable
    // until node has builtin pwnam functions, this'll have to do
    this.myuid = process.getuid && process.getuid()
    this.myuser = process.env.USER || ''
    this.maxReadSize = opt.maxReadSize || maxReadSize
    this.linkCache = opt.linkCache || new Map()
    this.statCache = opt.statCache || new Map()
    this.preservePaths = !!opt.preservePaths
    this.cwd = opt.cwd || process.cwd()
    this.strict = !!opt.strict
    this.noPax = !!opt.noPax
    this.noMtime = !!opt.noMtime
    this.mtime = opt.mtime || null

    if (typeof opt.onwarn === 'function')
      this.on('warn', opt.onwarn)

    if (!this.preservePaths && path.win32.isAbsolute(p)) {
      // absolutes on posix are also absolutes on win32
      // so we only need to test this one to get both
      const parsed = path.win32.parse(p)
      this.warn('stripping ' + parsed.root + ' from absolute path', p)
      this.path = p.substr(parsed.root.length)
    }

    this.win32 = !!opt.win32 || process.platform === 'win32'
    if (this.win32) {
      this.path = winchars.decode(this.path.replace(/\\/g, '/'))
      p = p.replace(/\\/g, '/')
    }

    this.absolute = opt.absolute || path.resolve(this.cwd, p)

    if (this.path === '')
      this.path = './'

    if (this.statCache.has(this.absolute))
      this[ONLSTAT](this.statCache.get(this.absolute))
    else
      this[LSTAT]()
  }

  [LSTAT] () {
    fs.lstat(this.absolute, (er, stat) => {
      if (er)
        return this.emit('error', er)
      this[ONLSTAT](stat)
    })
  }

  [ONLSTAT] (stat) {
    this.statCache.set(this.absolute, stat)
    this.stat = stat
    if (!stat.isFile())
      stat.size = 0
    this.type = getType(stat)
    this.emit('stat', stat)
    this[PROCESS]()
  }

  [PROCESS] () {
    switch (this.type) {
      case 'File': return this[FILE]()
      case 'Directory': return this[DIRECTORY]()
      case 'SymbolicLink': return this[SYMLINK]()
      // unsupported types are ignored.
      default: return this.end()
    }
  }

  [MODE] (mode) {
    return modeFix(mode, this.type === 'Directory')
  }

  [HEADER] () {
    if (this.type === 'Directory' && this.portable)
      this.noMtime = true

    this.header = new Header({
      path: this.path,
      linkpath: this.linkpath,
      // only the permissions and setuid/setgid/sticky bitflags
      // not the higher-order bits that specify file type
      mode: this[MODE](this.stat.mode),
      uid: this.portable ? null : this.stat.uid,
      gid: this.portable ? null : this.stat.gid,
      size: this.stat.size,
      mtime: this.noMtime ? null : this.mtime || this.stat.mtime,
      type: this.type,
      uname: this.portable ? null :
        this.stat.uid === this.myuid ? this.myuser : '',
      atime: this.portable ? null : this.stat.atime,
      ctime: this.portable ? null : this.stat.ctime
    })

    if (this.header.encode() && !this.noPax)
      this.write(new Pax({
        atime: this.portable ? null : this.header.atime,
        ctime: this.portable ? null : this.header.ctime,
        gid: this.portable ? null : this.header.gid,
        mtime: this.noMtime ? null : this.mtime || this.header.mtime,
        path: this.path,
        linkpath: this.linkpath,
        size: this.header.size,
        uid: this.portable ? null : this.header.uid,
        uname: this.portable ? null : this.header.uname,
        dev: this.portable ? null : this.stat.dev,
        ino: this.portable ? null : this.stat.ino,
        nlink: this.portable ? null : this.stat.nlink
      }).encode())
    this.write(this.header.block)
  }

  [DIRECTORY] () {
    if (this.path.substr(-1) !== '/')
      this.path += '/'
    this.stat.size = 0
    this[HEADER]()
    this.end()
  }

  [SYMLINK] () {
    fs.readlink(this.absolute, (er, linkpath) => {
      if (er)
        return this.emit('error', er)
      this[ONREADLINK](linkpath)
    })
  }

  [ONREADLINK] (linkpath) {
    this.linkpath = linkpath
    this[HEADER]()
    this.end()
  }

  [HARDLINK] (linkpath) {
    this.type = 'Link'
    this.linkpath = path.relative(this.cwd, linkpath)
    this.stat.size = 0
    this[HEADER]()
    this.end()
  }

  [FILE] () {
    if (this.stat.nlink > 1) {
      const linkKey = this.stat.dev + ':' + this.stat.ino
      if (this.linkCache.has(linkKey)) {
        const linkpath = this.linkCache.get(linkKey)
        if (linkpath.indexOf(this.cwd) === 0)
          return this[HARDLINK](linkpath)
      }
      this.linkCache.set(linkKey, this.absolute)
    }

    this[HEADER]()
    if (this.stat.size === 0)
      return this.end()

    this[OPENFILE]()
  }

  [OPENFILE] () {
    fs.open(this.absolute, 'r', (er, fd) => {
      if (er)
        return this.emit('error', er)
      this[ONOPENFILE](fd)
    })
  }

  [ONOPENFILE] (fd) {
    const blockLen = 512 * Math.ceil(this.stat.size / 512)
    const bufLen = Math.min(blockLen, this.maxReadSize)
    const buf = Buffer.allocUnsafe(bufLen)
    this[READ](fd, buf, 0, buf.length, 0, this.stat.size, blockLen)
  }

  [READ] (fd, buf, offset, length, pos, remain, blockRemain) {
    fs.read(fd, buf, offset, length, pos, (er, bytesRead) => {
      if (er)
        return this[CLOSE](fd, _ => this.emit('error', er))
      this[ONREAD](fd, buf, offset, length, pos, remain, blockRemain, bytesRead)
    })
  }

  [CLOSE] (fd, cb) {
    fs.close(fd, cb)
  }

  [ONREAD] (fd, buf, offset, length, pos, remain, blockRemain, bytesRead) {
    if (bytesRead <= 0 && remain > 0) {
      const er = new Error('encountered unexpected EOF')
      er.path = this.absolute
      er.syscall = 'read'
      er.code = 'EOF'
      this[CLOSE](fd)
      return this.emit('error', er)
    }

    if (bytesRead > remain) {
      const er = new Error('did not encounter expected EOF')
      er.path = this.absolute
      er.syscall = 'read'
      er.code = 'EOF'
      this[CLOSE](fd)
      return this.emit('error', er)
    }

    // null out the rest of the buffer, if we could fit the block padding
    if (bytesRead === remain) {
      for (let i = bytesRead; i < length && bytesRead < blockRemain; i++) {
        buf[i + offset] = 0
        bytesRead ++
        remain ++
      }
    }

    const writeBuf = offset === 0 && bytesRead === buf.length ?
      buf : buf.slice(offset, offset + bytesRead)
    remain -= bytesRead
    blockRemain -= bytesRead
    pos += bytesRead
    offset += bytesRead

    this.write(writeBuf)

    if (!remain) {
      if (blockRemain)
        this.write(Buffer.alloc(blockRemain))
      this.end()
      this[CLOSE](fd, _ => _)
      return
    }

    if (offset >= length) {
      buf = Buffer.allocUnsafe(length)
      offset = 0
    }
    length = buf.length - offset
    this[READ](fd, buf, offset, length, pos, remain, blockRemain)
  }
})

class WriteEntrySync extends WriteEntry {
  constructor (path, opt) {
    super(path, opt)
  }

  [LSTAT] () {
    this[ONLSTAT](fs.lstatSync(this.absolute))
  }

  [SYMLINK] () {
    this[ONREADLINK](fs.readlinkSync(this.absolute))
  }

  [OPENFILE] () {
    this[ONOPENFILE](fs.openSync(this.absolute, 'r'))
  }

  [READ] (fd, buf, offset, length, pos, remain, blockRemain) {
    let threw = true
    try {
      const bytesRead = fs.readSync(fd, buf, offset, length, pos)
      this[ONREAD](fd, buf, offset, length, pos, remain, blockRemain, bytesRead)
      threw = false
    } finally {
      if (threw)
        try { this[CLOSE](fd) } catch (er) {}
    }
  }

  [CLOSE] (fd) {
    fs.closeSync(fd)
  }
}

const WriteEntryTar = warner(class WriteEntryTar extends MiniPass {
  constructor (readEntry, opt) {
    opt = opt || {}
    super(opt)
    this.preservePaths = !!opt.preservePaths
    this.portable = !!opt.portable
    this.strict = !!opt.strict
    this.noPax = !!opt.noPax
    this.noMtime = !!opt.noMtime

    this.readEntry = readEntry
    this.type = readEntry.type
    if (this.type === 'Directory' && this.portable)
      this.noMtime = true

    this.path = readEntry.path
    this.mode = this[MODE](readEntry.mode)
    this.uid = this.portable ? null : readEntry.uid
    this.gid = this.portable ? null : readEntry.gid
    this.uname = this.portable ? null : readEntry.uname
    this.gname = this.portable ? null : readEntry.gname
    this.size = readEntry.size
    this.mtime = this.noMtime ? null : opt.mtime || readEntry.mtime
    this.atime = this.portable ? null : readEntry.atime
    this.ctime = this.portable ? null : readEntry.ctime
    this.linkpath = readEntry.linkpath

    if (typeof opt.onwarn === 'function')
      this.on('warn', opt.onwarn)

    if (path.isAbsolute(this.path) && !this.preservePaths) {
      const parsed = path.parse(this.path)
      this.warn(
        'stripping ' + parsed.root + ' from absolute path',
        this.path
      )
      this.path = this.path.substr(parsed.root.length)
    }

    this.remain = readEntry.size
    this.blockRemain = readEntry.startBlockSize

    this.header = new Header({
      path: this.path,
      linkpath: this.linkpath,
      // only the permissions and setuid/setgid/sticky bitflags
      // not the higher-order bits that specify file type
      mode: this.mode,
      uid: this.portable ? null : this.uid,
      gid: this.portable ? null : this.gid,
      size: this.size,
      mtime: this.noMtime ? null : this.mtime,
      type: this.type,
      uname: this.portable ? null : this.uname,
      atime: this.portable ? null : this.atime,
      ctime: this.portable ? null : this.ctime
    })

    if (this.header.encode() && !this.noPax)
      super.write(new Pax({
        atime: this.portable ? null : this.atime,
        ctime: this.portable ? null : this.ctime,
        gid: this.portable ? null : this.gid,
        mtime: this.noMtime ? null : this.mtime,
        path: this.path,
        linkpath: this.linkpath,
        size: this.size,
        uid: this.portable ? null : this.uid,
        uname: this.portable ? null : this.uname,
        dev: this.portable ? null : this.readEntry.dev,
        ino: this.portable ? null : this.readEntry.ino,
        nlink: this.portable ? null : this.readEntry.nlink
      }).encode())

    super.write(this.header.block)
    readEntry.pipe(this)
  }

  [MODE] (mode) {
    return modeFix(mode, this.type === 'Directory')
  }

  write (data) {
    const writeLen = data.length
    if (writeLen > this.blockRemain)
      throw new Error('writing more to entry than is appropriate')
    this.blockRemain -= writeLen
    return super.write(data)
  }

  end () {
    if (this.blockRemain)
      this.write(Buffer.alloc(this.blockRemain))
    return super.end()
  }
})

WriteEntry.Sync = WriteEntrySync
WriteEntry.Tar = WriteEntryTar

const getType = stat =>
  stat.isFile() ? 'File'
  : stat.isDirectory() ? 'Directory'
  : stat.isSymbolicLink() ? 'SymbolicLink'
  : 'Unsupported'

module.exports = WriteEntry


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// When writing files on Windows, translate the characters to their
// 0xf000 higher-encoded versions.

const raw = [
  '|',
  '<',
  '>',
  '?',
  ':'
]

const win = raw.map(char =>
  String.fromCharCode(0xf000 + char.charCodeAt(0)))

const toWin = new Map(raw.map((char, i) => [char, win[i]]))
const toRaw = new Map(win.map((char, i) => [char, raw[i]]))

module.exports = {
  encode: s => raw.reduce((s, c) => s.split(c).join(toWin.get(c)), s),
  decode: s => win.reduce((s, c) => s.split(c).join(toRaw.get(c)), s)
}


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const Buffer = __webpack_require__(6)

// tar -r
const hlo = __webpack_require__(8)
const Pack = __webpack_require__(23)
const Parse = __webpack_require__(19)
const fs = __webpack_require__(2)
const fsm = __webpack_require__(11)
const t = __webpack_require__(27)
const path = __webpack_require__(0)

// starting at the head of the file, read a Header
// If the checksum is invalid, that's our position to start writing
// If it is, jump forward by the specified size (round up to 512)
// and try again.
// Write the new Pack stream starting there.

const Header = __webpack_require__(10)

const r = module.exports = (opt_, files, cb) => {
  const opt = hlo(opt_)

  if (!opt.file)
    throw new TypeError('file is required')

  if (opt.gzip)
    throw new TypeError('cannot append to compressed archives')

  if (!files || !Array.isArray(files) || !files.length)
    throw new TypeError('no files or directories specified')

  files = Array.from(files)

  return opt.sync ? replaceSync(opt, files)
    : replace(opt, files, cb)
}

const replaceSync = (opt, files) => {
  const p = new Pack.Sync(opt)

  let threw = true
  let fd
  let position

  try {
    try {
      fd = fs.openSync(opt.file, 'r+')
    } catch (er) {
      if (er.code === 'ENOENT')
        fd = fs.openSync(opt.file, 'w+')
      else
        throw er
    }

    const st = fs.fstatSync(fd)
    const headBuf = Buffer.alloc(512)

    POSITION: for (position = 0; position < st.size; position += 512) {
      for (let bufPos = 0, bytes = 0; bufPos < 512; bufPos += bytes) {
        bytes = fs.readSync(
          fd, headBuf, bufPos, headBuf.length - bufPos, position + bufPos
        )

        if (position === 0 && headBuf[0] === 0x1f && headBuf[1] === 0x8b)
          throw new Error('cannot append to compressed archives')

        if (!bytes)
          break POSITION
      }

      let h = new Header(headBuf)
      if (!h.cksumValid)
        break
      let entryBlockSize = 512 * Math.ceil(h.size / 512)
      if (position + entryBlockSize + 512 > st.size)
        break
      // the 512 for the header we just parsed will be added as well
      // also jump ahead all the blocks for the body
      position += entryBlockSize
      if (opt.mtimeCache)
        opt.mtimeCache.set(h.path, h.mtime)
    }
    threw = false

    streamSync(opt, p, position, fd, files)
  } finally {
    if (threw)
      try { fs.closeSync(fd) } catch (er) {}
  }
}

const streamSync = (opt, p, position, fd, files) => {
  const stream = new fsm.WriteStreamSync(opt.file, {
    fd: fd,
    start: position
  })
  p.pipe(stream)
  addFilesSync(p, files)
}

const replace = (opt, files, cb) => {
  files = Array.from(files)
  const p = new Pack(opt)

  const getPos = (fd, size, cb_) => {
    const cb = (er, pos) => {
      if (er)
        fs.close(fd, _ => cb_(er))
      else
        cb_(null, pos)
    }

    let position = 0
    if (size === 0)
      return cb(null, 0)

    let bufPos = 0
    const headBuf = Buffer.alloc(512)
    const onread = (er, bytes) => {
      if (er)
        return cb(er)
      bufPos += bytes
      if (bufPos < 512 && bytes)
        return fs.read(
          fd, headBuf, bufPos, headBuf.length - bufPos,
          position + bufPos, onread
        )

      if (position === 0 && headBuf[0] === 0x1f && headBuf[1] === 0x8b)
        return cb(new Error('cannot append to compressed archives'))

      // truncated header
      if (bufPos < 512)
        return cb(null, position)

      const h = new Header(headBuf)
      if (!h.cksumValid)
        return cb(null, position)

      const entryBlockSize = 512 * Math.ceil(h.size / 512)
      if (position + entryBlockSize + 512 > size)
        return cb(null, position)

      position += entryBlockSize + 512
      if (position >= size)
        return cb(null, position)

      if (opt.mtimeCache)
        opt.mtimeCache.set(h.path, h.mtime)
      bufPos = 0
      fs.read(fd, headBuf, 0, 512, position, onread)
    }
    fs.read(fd, headBuf, 0, 512, position, onread)
  }

  const promise = new Promise((resolve, reject) => {
    p.on('error', reject)
    let flag = 'r+'
    const onopen = (er, fd) => {
      if (er && er.code === 'ENOENT' && flag === 'r+') {
        flag = 'w+'
        return fs.open(opt.file, flag, onopen)
      }

      if (er)
        return reject(er)

      fs.fstat(fd, (er, st) => {
        if (er)
          return reject(er)
        getPos(fd, st.size, (er, position) => {
          if (er)
            return reject(er)
          const stream = new fsm.WriteStream(opt.file, {
            fd: fd,
            start: position
          })
          p.pipe(stream)
          stream.on('error', reject)
          stream.on('close', resolve)
          addFilesAsync(p, files)
        })
      })
    }
    fs.open(opt.file, flag, onopen)
  })

  return cb ? promise.then(cb, cb) : promise
}

const addFilesSync = (p, files) => {
  files.forEach(file => {
    if (file.charAt(0) === '@')
      t({
        file: path.resolve(p.cwd, file.substr(1)),
        sync: true,
        noResume: true,
        onentry: entry => p.add(entry)
      })
    else
      p.add(file)
  })
  p.end()
}

const addFilesAsync = (p, files) => {
  while (files.length) {
    const file = files.shift()
    if (file.charAt(0) === '@')
      return t({
        file: path.resolve(p.cwd, file.substr(1)),
        noResume: true,
        onentry: entry => p.add(entry)
      }).then(_ => addFilesAsync(p, files))
    else
      p.add(file)
  }
  p.end()
}


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const assert = __webpack_require__(13)
const EE = __webpack_require__(16).EventEmitter
const Parser = __webpack_require__(19)
const fs = __webpack_require__(2)
const fsm = __webpack_require__(11)
const path = __webpack_require__(0)
const mkdir = __webpack_require__(95)
const mkdirSync = mkdir.sync
const wc = __webpack_require__(39)

const ONENTRY = Symbol('onEntry')
const CHECKFS = Symbol('checkFs')
const ISREUSABLE = Symbol('isReusable')
const MAKEFS = Symbol('makeFs')
const FILE = Symbol('file')
const DIRECTORY = Symbol('directory')
const LINK = Symbol('link')
const SYMLINK = Symbol('symlink')
const HARDLINK = Symbol('hardlink')
const UNSUPPORTED = Symbol('unsupported')
const UNKNOWN = Symbol('unknown')
const CHECKPATH = Symbol('checkPath')
const MKDIR = Symbol('mkdir')
const ONERROR = Symbol('onError')
const PENDING = Symbol('pending')
const PEND = Symbol('pend')
const UNPEND = Symbol('unpend')
const ENDED = Symbol('ended')
const MAYBECLOSE = Symbol('maybeClose')
const SKIP = Symbol('skip')
const DOCHOWN = Symbol('doChown')
const UID = Symbol('uid')
const GID = Symbol('gid')
const crypto = __webpack_require__(98)

// Unlinks on Windows are not atomic.
//
// This means that if you have a file entry, followed by another
// file entry with an identical name, and you cannot re-use the file
// (because it's a hardlink, or because unlink:true is set, or it's
// Windows, which does not have useful nlink values), then the unlink
// will be committed to the disk AFTER the new file has been written
// over the old one, deleting the new file.
//
// To work around this, on Windows systems, we rename the file and then
// delete the renamed file.  It's a sloppy kludge, but frankly, I do not
// know of a better way to do this, given windows' non-atomic unlink
// semantics.
//
// See: https://github.com/npm/node-tar/issues/183
/* istanbul ignore next */
const unlinkFile = (path, cb) => {
  if (process.platform !== 'win32')
    return fs.unlink(path, cb)

  const name = path + '.DELETE.' + crypto.randomBytes(16).toString('hex')
  fs.rename(path, name, er => {
    if (er)
      return cb(er)
    fs.unlink(name, cb)
  })
}

/* istanbul ignore next */
const unlinkFileSync = path => {
  if (process.platform !== 'win32')
    return fs.unlinkSync(path)

  const name = path + '.DELETE.' + crypto.randomBytes(16).toString('hex')
  fs.renameSync(path, name)
  fs.unlinkSync(name)
}

// this.gid, entry.gid, this.processUid
const uint32 = (a, b, c) =>
  a === a >>> 0 ? a
  : b === b >>> 0 ? b
  : c

class Unpack extends Parser {
  constructor (opt) {
    if (!opt)
      opt = {}

    opt.ondone = _ => {
      this[ENDED] = true
      this[MAYBECLOSE]()
    }

    super(opt)

    this.transform = typeof opt.transform === 'function' ? opt.transform : null

    this.writable = true
    this.readable = false

    this[PENDING] = 0
    this[ENDED] = false

    this.dirCache = opt.dirCache || new Map()

    if (typeof opt.uid === 'number' || typeof opt.gid === 'number') {
      // need both or neither
      if (typeof opt.uid !== 'number' || typeof opt.gid !== 'number')
        throw new TypeError('cannot set owner without number uid and gid')
      if (opt.preserveOwner)
        throw new TypeError(
          'cannot preserve owner in archive and also set owner explicitly')
      this.uid = opt.uid
      this.gid = opt.gid
      this.setOwner = true
    } else {
      this.uid = null
      this.gid = null
      this.setOwner = false
    }

    // default true for root
    if (opt.preserveOwner === undefined && typeof opt.uid !== 'number')
      this.preserveOwner = process.getuid && process.getuid() === 0
    else
      this.preserveOwner = !!opt.preserveOwner

    this.processUid = (this.preserveOwner || this.setOwner) && process.getuid ?
      process.getuid() : null
    this.processGid = (this.preserveOwner || this.setOwner) && process.getgid ?
      process.getgid() : null

    // mostly just for testing, but useful in some cases.
    // Forcibly trigger a chown on every entry, no matter what
    this.forceChown = opt.forceChown === true

    // turn ><?| in filenames into 0xf000-higher encoded forms
    this.win32 = !!opt.win32 || process.platform === 'win32'

    // do not unpack over files that are newer than what's in the archive
    this.newer = !!opt.newer

    // do not unpack over ANY files
    this.keep = !!opt.keep

    // do not set mtime/atime of extracted entries
    this.noMtime = !!opt.noMtime

    // allow .., absolute path entries, and unpacking through symlinks
    // without this, warn and skip .., relativize absolutes, and error
    // on symlinks in extraction path
    this.preservePaths = !!opt.preservePaths

    // unlink files and links before writing. This breaks existing hard
    // links, and removes symlink directories rather than erroring
    this.unlink = !!opt.unlink

    this.cwd = path.resolve(opt.cwd || process.cwd())
    this.strip = +opt.strip || 0
    this.processUmask = process.umask()
    this.umask = typeof opt.umask === 'number' ? opt.umask : this.processUmask
    // default mode for dirs created as parents
    this.dmode = opt.dmode || (0o0777 & (~this.umask))
    this.fmode = opt.fmode || (0o0666 & (~this.umask))
    this.on('entry', entry => this[ONENTRY](entry))
  }

  [MAYBECLOSE] () {
    if (this[ENDED] && this[PENDING] === 0) {
      this.emit('prefinish')
      this.emit('finish')
      this.emit('end')
      this.emit('close')
    }
  }

  [CHECKPATH] (entry) {
    if (this.strip) {
      const parts = entry.path.split(/\/|\\/)
      if (parts.length < this.strip)
        return false
      entry.path = parts.slice(this.strip).join('/')

      if (entry.type === 'Link') {
        const linkparts = entry.linkpath.split(/\/|\\/)
        if (linkparts.length >= this.strip)
          entry.linkpath = linkparts.slice(this.strip).join('/')
      }
    }

    if (!this.preservePaths) {
      const p = entry.path
      if (p.match(/(^|\/|\\)\.\.(\\|\/|$)/)) {
        this.warn('path contains \'..\'', p)
        return false
      }

      // absolutes on posix are also absolutes on win32
      // so we only need to test this one to get both
      if (path.win32.isAbsolute(p)) {
        const parsed = path.win32.parse(p)
        this.warn('stripping ' + parsed.root + ' from absolute path', p)
        entry.path = p.substr(parsed.root.length)
      }
    }

    // only encode : chars that aren't drive letter indicators
    if (this.win32) {
      const parsed = path.win32.parse(entry.path)
      entry.path = parsed.root === '' ? wc.encode(entry.path)
        : parsed.root + wc.encode(entry.path.substr(parsed.root.length))
    }

    if (path.isAbsolute(entry.path))
      entry.absolute = entry.path
    else
      entry.absolute = path.resolve(this.cwd, entry.path)

    return true
  }

  [ONENTRY] (entry) {
    if (!this[CHECKPATH](entry))
      return entry.resume()

    assert.equal(typeof entry.absolute, 'string')

    switch (entry.type) {
      case 'Directory':
      case 'GNUDumpDir':
        if (entry.mode)
          entry.mode = entry.mode | 0o700

      case 'File':
      case 'OldFile':
      case 'ContiguousFile':
      case 'Link':
      case 'SymbolicLink':
        return this[CHECKFS](entry)

      case 'CharacterDevice':
      case 'BlockDevice':
      case 'FIFO':
        return this[UNSUPPORTED](entry)
    }
  }

  [ONERROR] (er, entry) {
    // Cwd has to exist, or else nothing works. That's serious.
    // Other errors are warnings, which raise the error in strict
    // mode, but otherwise continue on.
    if (er.name === 'CwdError')
      this.emit('error', er)
    else {
      this.warn(er.message, er)
      this[UNPEND]()
      entry.resume()
    }
  }

  [MKDIR] (dir, mode, cb) {
    mkdir(dir, {
      uid: this.uid,
      gid: this.gid,
      processUid: this.processUid,
      processGid: this.processGid,
      umask: this.processUmask,
      preserve: this.preservePaths,
      unlink: this.unlink,
      cache: this.dirCache,
      cwd: this.cwd,
      mode: mode
    }, cb)
  }

  [DOCHOWN] (entry) {
    // in preserve owner mode, chown if the entry doesn't match process
    // in set owner mode, chown if setting doesn't match process
    return this.forceChown ||
      this.preserveOwner &&
      ( typeof entry.uid === 'number' && entry.uid !== this.processUid ||
        typeof entry.gid === 'number' && entry.gid !== this.processGid )
      ||
      ( typeof this.uid === 'number' && this.uid !== this.processUid ||
        typeof this.gid === 'number' && this.gid !== this.processGid )
  }

  [UID] (entry) {
    return uint32(this.uid, entry.uid, this.processUid)
  }

  [GID] (entry) {
    return uint32(this.gid, entry.gid, this.processGid)
  }

  [FILE] (entry) {
    const mode = entry.mode & 0o7777 || this.fmode
    const stream = new fsm.WriteStream(entry.absolute, {
      mode: mode,
      autoClose: false
    })
    stream.on('error', er => this[ONERROR](er, entry))

    let actions = 1
    const done = er => {
      if (er)
        return this[ONERROR](er, entry)

      if (--actions === 0)
        fs.close(stream.fd, _ => this[UNPEND]())
    }

    stream.on('finish', _ => {
      // if futimes fails, try utimes
      // if utimes fails, fail with the original error
      // same for fchown/chown
      const abs = entry.absolute
      const fd = stream.fd

      if (entry.mtime && !this.noMtime) {
        actions++
        const atime = entry.atime || new Date()
        const mtime = entry.mtime
        fs.futimes(fd, atime, mtime, er =>
          er ? fs.utimes(abs, atime, mtime, er2 => done(er2 && er))
          : done())
      }

      if (this[DOCHOWN](entry)) {
        actions++
        const uid = this[UID](entry)
        const gid = this[GID](entry)
        fs.fchown(fd, uid, gid, er =>
          er ? fs.chown(abs, uid, gid, er2 => done(er2 && er))
          : done())
      }

      done()
    })

    const tx = this.transform ? this.transform(entry) || entry : entry
    if (tx !== entry) {
      tx.on('error', er => this[ONERROR](er, entry))
      entry.pipe(tx)
    }
    tx.pipe(stream)
  }

  [DIRECTORY] (entry) {
    const mode = entry.mode & 0o7777 || this.dmode
    this[MKDIR](entry.absolute, mode, er => {
      if (er)
        return this[ONERROR](er, entry)

      let actions = 1
      const done = _ => {
        if (--actions === 0) {
          this[UNPEND]()
          entry.resume()
        }
      }

      if (entry.mtime && !this.noMtime) {
        actions++
        fs.utimes(entry.absolute, entry.atime || new Date(), entry.mtime, done)
      }

      if (this[DOCHOWN](entry)) {
        actions++
        fs.chown(entry.absolute, this[UID](entry), this[GID](entry), done)
      }

      done()
    })
  }

  [UNSUPPORTED] (entry) {
    this.warn('unsupported entry type: ' + entry.type, entry)
    entry.resume()
  }

  [SYMLINK] (entry) {
    this[LINK](entry, entry.linkpath, 'symlink')
  }

  [HARDLINK] (entry) {
    this[LINK](entry, path.resolve(this.cwd, entry.linkpath), 'link')
  }

  [PEND] () {
    this[PENDING]++
  }

  [UNPEND] () {
    this[PENDING]--
    this[MAYBECLOSE]()
  }

  [SKIP] (entry) {
    this[UNPEND]()
    entry.resume()
  }

  // Check if we can reuse an existing filesystem entry safely and
  // overwrite it, rather than unlinking and recreating
  // Windows doesn't report a useful nlink, so we just never reuse entries
  [ISREUSABLE] (entry, st) {
    return entry.type === 'File' &&
      !this.unlink &&
      st.isFile() &&
      st.nlink <= 1 &&
      process.platform !== 'win32'
  }

  // check if a thing is there, and if so, try to clobber it
  [CHECKFS] (entry) {
    this[PEND]()
    this[MKDIR](path.dirname(entry.absolute), this.dmode, er => {
      if (er)
        return this[ONERROR](er, entry)
      fs.lstat(entry.absolute, (er, st) => {
        if (st && (this.keep || this.newer && st.mtime > entry.mtime))
          this[SKIP](entry)
        else if (er || this[ISREUSABLE](entry, st))
          this[MAKEFS](null, entry)
        else if (st.isDirectory()) {
          if (entry.type === 'Directory') {
            if (!entry.mode || (st.mode & 0o7777) === entry.mode)
              this[MAKEFS](null, entry)
            else
              fs.chmod(entry.absolute, entry.mode, er => this[MAKEFS](er, entry))
          } else
            fs.rmdir(entry.absolute, er => this[MAKEFS](er, entry))
        } else
          unlinkFile(entry.absolute, er => this[MAKEFS](er, entry))
      })
    })
  }

  [MAKEFS] (er, entry) {
    if (er)
      return this[ONERROR](er, entry)

    switch (entry.type) {
      case 'File':
      case 'OldFile':
      case 'ContiguousFile':
        return this[FILE](entry)

      case 'Link':
        return this[HARDLINK](entry)

      case 'SymbolicLink':
        return this[SYMLINK](entry)

      case 'Directory':
      case 'GNUDumpDir':
        return this[DIRECTORY](entry)
    }
  }

  [LINK] (entry, linkpath, link) {
    // XXX: get the type ('file' or 'dir') for windows
    fs[link](linkpath, entry.absolute, er => {
      if (er)
        return this[ONERROR](er, entry)
      this[UNPEND]()
      entry.resume()
    })
  }
}

class UnpackSync extends Unpack {
  constructor (opt) {
    super(opt)
  }

  [CHECKFS] (entry) {
    const er = this[MKDIR](path.dirname(entry.absolute), this.dmode)
    if (er)
      return this[ONERROR](er, entry)
    try {
      const st = fs.lstatSync(entry.absolute)
      if (this.keep || this.newer && st.mtime > entry.mtime)
        return this[SKIP](entry)
      else if (this[ISREUSABLE](entry, st))
        return this[MAKEFS](null, entry)
      else {
        try {
          if (st.isDirectory()) {
            if (entry.type === 'Directory') {
              if (entry.mode && (st.mode & 0o7777) !== entry.mode)
                fs.chmodSync(entry.absolute, entry.mode)
            } else
              fs.rmdirSync(entry.absolute)
          } else
            unlinkFileSync(entry.absolute)
          return this[MAKEFS](null, entry)
        } catch (er) {
          return this[ONERROR](er, entry)
        }
      }
    } catch (er) {
      return this[MAKEFS](null, entry)
    }
  }

  [FILE] (entry) {
    const mode = entry.mode & 0o7777 || this.fmode

    const oner = er => {
      try { fs.closeSync(fd) } catch (_) {}
      if (er)
        this[ONERROR](er, entry)
    }

    let stream
    let fd
    try {
      fd = fs.openSync(entry.absolute, 'w', mode)
    } catch (er) {
      return oner(er)
    }
    const tx = this.transform ? this.transform(entry) || entry : entry
    if (tx !== entry) {
      tx.on('error', er => this[ONERROR](er, entry))
      entry.pipe(tx)
    }

    tx.on('data', chunk => {
      try {
        fs.writeSync(fd, chunk, 0, chunk.length)
      } catch (er) {
        oner(er)
      }
    })

    tx.on('end', _ => {
      let er = null
      // try both, falling futimes back to utimes
      // if either fails, handle the first error
      if (entry.mtime && !this.noMtime) {
        const atime = entry.atime || new Date()
        const mtime = entry.mtime
        try {
          fs.futimesSync(fd, atime, mtime)
        } catch (futimeser) {
          try {
            fs.utimesSync(entry.absolute, atime, mtime)
          } catch (utimeser) {
            er = futimeser
          }
        }
      }

      if (this[DOCHOWN](entry)) {
        const uid = this[UID](entry)
        const gid = this[GID](entry)

        try {
          fs.fchownSync(fd, uid, gid)
        } catch (fchowner) {
          try {
            fs.chownSync(entry.absolute, uid, gid)
          } catch (chowner) {
            er = er || fchowner
          }
        }
      }

      oner(er)
    })
  }

  [DIRECTORY] (entry) {
    const mode = entry.mode & 0o7777 || this.dmode
    const er = this[MKDIR](entry.absolute, mode)
    if (er)
      return this[ONERROR](er, entry)
    if (entry.mtime && !this.noMtime) {
      try {
        fs.utimesSync(entry.absolute, entry.atime || new Date(), entry.mtime)
      } catch (er) {}
    }
    if (this[DOCHOWN](entry)) {
      try {
        fs.chownSync(entry.absolute, this[UID](entry), this[GID](entry))
      } catch (er) {}
    }
    entry.resume()
  }

  [MKDIR] (dir, mode) {
    try {
      return mkdir.sync(dir, {
        uid: this.uid,
        gid: this.gid,
        processUid: this.processUid,
        processGid: this.processGid,
        umask: this.processUmask,
        preserve: this.preservePaths,
        unlink: this.unlink,
        cache: this.dirCache,
        cwd: this.cwd,
        mode: mode
      })
    } catch (er) {
      return er
    }
  }

  [LINK] (entry, linkpath, link) {
    try {
      fs[link + 'Sync'](linkpath, entry.absolute)
      entry.resume()
    } catch (er) {
      return this[ONERROR](er, entry)
    }
  }
}

Unpack.Sync = UnpackSync
module.exports = Unpack


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const api = __webpack_require__(12);
/**
 * Symbol under which we store the { type -> objid } map on object instances
 */
const OBJID_SYMBOL = Symbol('$__jsii__objid__$');
/**
 * Symbol we use to tag the constructor of a JSII class
 */
const JSII_SYMBOL = Symbol('__jsii__');
/**
 * Get the JSII fqn for an object (if available)
 *
 * This will return something if the object was constructed from a JSII-enabled
 * class/constructor, or if a literal object was annotated with type
 * information.
 */
function jsiiTypeFqn(obj) {
    const jsii = obj.constructor[JSII_SYMBOL];
    return jsii && jsii.fqn;
}
exports.jsiiTypeFqn = jsiiTypeFqn;
/**
 * If this object was previously serialized under a given reference, return the same reference
 *
 * This is to retain object identity across invocations.
 */
function objectReference(obj) {
    // If this object as already returned
    if (obj[OBJID_SYMBOL]) {
        return { [api.TOKEN_REF]: obj[OBJID_SYMBOL] };
    }
    return undefined;
}
exports.objectReference = objectReference;
function tagObject(obj, objid) {
    obj[OBJID_SYMBOL] = objid;
}
/**
 * Ensure there's a hidden map with the given symbol name on the given object, and return it
 */
function hiddenMap(obj, mapSymbol) {
    let map = obj[mapSymbol];
    if (!map) {
        map = {};
        Object.defineProperty(obj, mapSymbol, {
            value: map,
            configurable: false,
            enumerable: false,
            writable: false
        });
    }
    return map;
}
exports.hiddenMap = hiddenMap;
/**
 * Set the JSII FQN for classes produced by a given constructor
 */
function tagJsiiConstructor(constructor, fqn) {
    Object.defineProperty(constructor, JSII_SYMBOL, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: { fqn }
    });
}
exports.tagJsiiConstructor = tagJsiiConstructor;
/**
 * Table of JSII objects
 *
 * There can be multiple references to the same object, each under a different requested
 * type.
 */
class ObjectTable {
    constructor() {
        this.objects = {};
        this.nextid = 10000;
    }
    /**
     * Register the given object with the given type
     *
     * Return the existing registration if available.
     */
    registerObject(obj, fqn) {
        if (fqn === undefined) {
            throw new Error('FQN cannot be undefined');
        }
        const existingRef = objectReference(obj);
        if (existingRef) {
            return existingRef;
        }
        const objid = this.makeId(fqn);
        this.objects[objid] = { instance: obj, fqn };
        tagObject(obj, objid);
        return { [api.TOKEN_REF]: objid };
    }
    /**
     * Find the object and registered type for the given ObjRef
     */
    findObject(objref) {
        if (typeof (objref) !== 'object' || !(api.TOKEN_REF in objref)) {
            throw new Error(`Malformed object reference: ${JSON.stringify(objref)}`);
        }
        const objid = objref[api.TOKEN_REF];
        const obj = this.objects[objid];
        if (!obj) {
            throw new Error(`Object ${objid} not found`);
        }
        return obj;
    }
    /**
     * Delete the registration with the given objref
     */
    deleteObject(objref) {
        this.findObject(objref); // make sure object exists
        delete this.objects[objref[api.TOKEN_REF]];
    }
    get count() {
        return Object.keys(this.objects).length;
    }
    makeId(fqn) {
        return `${fqn}@${this.nextid++}`;
    }
}
exports.ObjectTable = ObjectTable;


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const packageInfo = __webpack_require__(44);
const host_1 = __webpack_require__(45);
const in_out_1 = __webpack_require__(102);
const name = packageInfo.name;
const version = packageInfo.version;
const noStack = !!process.env.JSII_NOSTACK;
const debug = !!process.env.JSII_DEBUG;
const inout = new in_out_1.InputOutput();
const host = new host_1.KernelHost(inout, { debug, noStack });
// say hello
inout.write({ hello: `${name}@${version}` });
inout.debug = debug; // we don't want "hello" emitted
host.run();


/***/ }),
/* 44 */
/***/ (function(module) {

module.exports = JSON.parse("{\"name\":\"jsii-runtime\",\"version\":\"0.14.3\",\"description\":\"jsii runtime kernel process\",\"main\":\"lib/index.js\",\"types\":\"lib/index.d.ts\",\"bin\":{\"jsii-runtime\":\"bin/jsii-runtime\"},\"scripts\":{\"build\":\"tsc --build && chmod +x bin/jsii-runtime && /bin/bash ./bundle.sh\",\"watch\":\"tsc --build -w\",\"test\":\"/bin/bash test/playback-test.sh\",\"package\":\"package-js\"},\"devDependencies\":{\"@scope/jsii-calc-base\":\"file:../jsii-calc-base\",\"@scope/jsii-calc-lib\":\"file:../jsii-calc-lib\",\"jsii-build-tools\":\"file:../jsii-build-tools\",\"jsii-calc\":\"file:../jsii-calc\",\"nodeunit\":\"^0.11.3\",\"source-map\":\"^0.7.3\",\"source-map-loader\":\"^0.2.4\",\"typescript\":\"^3.5.3\",\"wasm-loader\":\"^1.3.0\",\"webpack\":\"^4.38.0\",\"webpack-cli\":\"^3.3.5\"},\"dependencies\":{\"jsii-kernel\":\"^0.14.3\",\"jsii-spec\":\"^0.14.3\"},\"author\":{\"name\":\"Amazon Web Services\",\"url\":\"https://aws.amazon.com\"},\"license\":\"Apache-2.0\",\"repository\":{\"type\":\"git\",\"url\":\"https://github.com/aws/jsii.git\",\"directory\":\"packages/jsii-runtime\"}}");

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const jsii_kernel_1 = __webpack_require__(46);
class KernelHost {
    constructor(inout, opts = {}) {
        this.inout = inout;
        this.opts = opts;
        this.kernel = new jsii_kernel_1.Kernel(cb => this.callbackHandler(cb));
        this.kernel.traceEnabled = opts.debug ? true : false;
    }
    run() {
        const req = this.inout.read();
        if (!req) {
            return; // done
        }
        this.processRequest(req, () => this.run());
    }
    callbackHandler(callback) {
        // write a "callback" response, which is a special response that tells
        // the client that there's synchonous callback it needs to invoke and
        // bring back the result via a "complete" request.
        this.inout.write({ callback });
        const self = this;
        return completeCallback();
        function completeCallback() {
            const req = self.inout.read();
            if (!req) {
                throw new Error('Interrupted before callback returned');
            }
            // if this is a completion for the current callback, then we can
            // finally stop this nonsense and return the result.
            const completeReq = req;
            if ('complete' in completeReq && completeReq.complete.cbid === callback.cbid) {
                if (completeReq.complete.err) {
                    throw new Error(completeReq.complete.err);
                }
                return completeReq.complete.result;
            }
            // otherwise, process the request normally, but continue to wait for
            // our callback to be completed. sync=true to enforce that `completeCallback`
            // will be called synchronously and return value will be chained back so we can
            // return it to the callback handler.
            return self.processRequest(req, completeCallback, /* sync */ true);
        }
    }
    /**
     * Processes the input request `req` and writes the output response to
     * stdout. This method invokes `next` when the request was fully processed.
     * This either happens synchronously or asynchronously depending on the api
     * (e.g. the "end" api will wait for an async promise to be fulfilled before
     * it writes the response)
     *
     * @param req The input request
     * @param next A callback to invoke to continue
     * @param sync If this is 'true', "next" must be called synchronously. This means
     *             that we won't process any async activity (begin/complete). The kernel
     *             doesn't allow any async operations during a sync callback, so this shouldn't
     *             happen, so we assert in this case to find bugs.
     */
    processRequest(req, next, sync = false) {
        if ('callback' in req) {
            throw new Error('Unexpected `callback` result. This request should have been processed by a callback handler');
        }
        if (!('api' in req)) {
            throw new Error('Malformed request, "api" field is required');
        }
        const apiReq = req;
        const fn = this.findApi(apiReq.api);
        try {
            const ret = fn.call(this.kernel, req);
            // special case for 'begin' and 'complete' which are on an async
            // promise path. in order to allow the kernel to actually fulfill
            // the promise, and continue any async flows (which may potentially
            // start other promises), we respond only within a setImmediate
            // block, which is scheduled in the same micro-tasks queue as
            // promises. see the kernel test 'async overrides: two overrides'
            // for an example for this use case.
            if (apiReq.api === 'begin' || apiReq.api === 'complete') {
                checkIfAsyncIsAllowed();
                this.debug('processing pending promises before responding');
                setImmediate(() => {
                    this.writeOkay(ret);
                    next();
                });
                return;
            }
            // if this is an async method, return immediately and
            // call next only when the promise is fulfilled.
            if (this.isPromise(ret)) {
                checkIfAsyncIsAllowed();
                this.debug('waiting for promise to be fulfilled');
                const promise = ret;
                promise
                    .then(val => {
                    this.debug('promise succeeded:', val);
                    this.writeOkay(val);
                    next();
                })
                    .catch(e => {
                    this.debug('promise failed:', e);
                    this.writeError(e);
                    next();
                });
                return;
            }
            this.writeOkay(ret);
        }
        catch (e) {
            this.writeError(e);
        }
        // indicate this request was processed (synchronously).
        return next();
        function checkIfAsyncIsAllowed() {
            if (sync) {
                throw new Error('Cannot handle async operations while waiting for a sync callback to return');
            }
        }
    }
    /**
     * Writes an "ok" result to stdout.
     */
    writeOkay(result) {
        const res = { ok: result };
        this.inout.write(res);
    }
    /**
     * Writes an "error" result to stdout.
     */
    writeError(error) {
        const res = { error: error.message, stack: undefined };
        if (!this.opts.noStack) {
            res.stack = error.stack;
        }
        this.inout.write(res);
    }
    /**
     * Returns true if the value is a promise.
     */
    isPromise(v) {
        return v && v.then && typeof (v.then) === 'function';
    }
    /**
     * Given a kernel api name, returns the function to invoke.
     */
    findApi(apiName) {
        const fn = this.kernel[apiName];
        if (typeof fn !== 'function') {
            throw new Error('Invalid kernel api call: ' + apiName);
        }
        return fn;
    }
    debug(...args) {
        if (!this.opts.debug) {
            return;
        }
        // tslint:disable-next-line: no-console
        console.error(...args);
    }
}
exports.KernelHost = KernelHost;


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(47));
const api = __webpack_require__(12);
exports.api = api;


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(module) {
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __webpack_require__(49);
const spec = __webpack_require__(34);
const os = __webpack_require__(32);
const path = __webpack_require__(0);
const tar = __webpack_require__(85);
const vm = __webpack_require__(99);
const api = __webpack_require__(12);
const api_1 = __webpack_require__(12);
const objects_1 = __webpack_require__(42);
const wire = __webpack_require__(100);
class Kernel {
    /**
     * Creates a jsii kernel object.
     *
     * @param callbackHandler This handler is invoked when a synchronous callback is called.
     *                        It's responsibility is to execute the callback and return it's
     *                        result (or throw an error).
     */
    constructor(callbackHandler) {
        // `setImmediate` is required for tests to pass (it is otherwise
        // impossible to wait for in-VM promises to complete)
        this.callbackHandler = callbackHandler;
        /**
         * Set to true for verbose debugging.
         */
        this.traceEnabled = false;
        this.assemblies = {};
        this.objects = new objects_1.ObjectTable();
        this.cbs = {};
        this.waiting = {};
        this.promises = {};
        this.nextid = 20000; // incrementing counter for objid, cbid, promiseid
        this.sourceMaps = {};
        // `Buffer` is required when using simple-resource-bundler.
        // HACK: when we webpack jsii-runtime, all "require" statements get transpiled,
        // so modules can be resolved within the pack. However, here we actually want to
        // let loaded modules to use the native node "require" method.
        // I wonder if webpack has some pragma that allows opting-out at certain points
        // in the code.
        const moduleLoad = __webpack_require__(101).Module._load;
        const nodeRequire = (p) => moduleLoad(p, module, false);
        this.sandbox = vm.createContext({
            Buffer,
            setImmediate,
            require: nodeRequire // modules need to "require"
        });
    }
    async load(req) {
        this._debug('load', req);
        if ('assembly' in req) {
            throw new Error('`assembly` field is deprecated for "load", use `name`, `version` and `tarball` instead');
        }
        if (!this.installDir) {
            this.installDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsii-kernel-'));
            await fs.mkdirp(path.join(this.installDir, 'node_modules'));
            this._debug('creating jsii-kernel modules workdir:', this.installDir);
            process.on('exit', () => {
                if (this.installDir) {
                    this._debug('removing install dir', this.installDir);
                    fs.removeSync(this.installDir); // can't use async version during exit
                }
            });
        }
        const pkgname = req.name;
        const pkgver = req.version;
        // check if we already have such a module
        const packageDir = path.join(this.installDir, 'node_modules', pkgname);
        if (await fs.pathExists(packageDir)) {
            // module exists, verify version
            const epkg = await fs.readJson(path.join(packageDir, 'package.json'));
            if (epkg.version !== pkgver) {
                throw new Error(`Multiple versions ${pkgver} and ${epkg.version} of the `
                    + `package '${pkgname}' cannot be loaded together since this is unsupported by `
                    + `some runtime environments`);
            }
            // same version, no-op
            this._debug('look up already-loaded assembly', pkgname);
            const assm = this.assemblies[pkgname];
            return {
                assembly: assm.metadata.name,
                types: Object.keys(assm.metadata.types || {}).length,
            };
        }
        else {
            // untar the archive to a staging directory, read the jsii spec from it
            // and then move it to the node_modules directory of the kernel.
            const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'jsii-kernel-install-staging-'));
            try {
                await tar.extract({ strict: true, file: req.tarball, cwd: staging });
                // read .jsii metadata from the root of the package
                const jsiiMetadataFile = path.join(staging, 'package', spec.SPEC_FILE_NAME);
                if (!(await fs.pathExists(jsiiMetadataFile))) {
                    throw new Error(`Package tarball ${req.tarball} must have a file named ${spec.SPEC_FILE_NAME} at the root`);
                }
                const assmSpec = await fs.readJson(jsiiMetadataFile);
                // "install" to "node_modules" directory
                await fs.move(path.join(staging, 'package'), packageDir);
                // load the module and capture it's closure
                const closure = this._execute(`require(String.raw\`${packageDir}\`)`, packageDir);
                const assm = new Assembly(assmSpec, closure);
                this._addAssembly(assm);
                return {
                    assembly: assmSpec.name,
                    types: Object.keys(assmSpec.types || {}).length,
                };
            }
            finally {
                this._debug('removing staging directory:', staging);
                await fs.remove(staging);
            }
        }
    }
    create(req) {
        return this._create(req);
    }
    del(req) {
        const { objref } = req;
        this._debug('del', objref);
        this.objects.deleteObject(objref);
        return {};
    }
    sget(req) {
        const { fqn, property } = req;
        const symbol = `${fqn}.${property}`;
        this._debug('sget', symbol);
        const ti = this._typeInfoForProperty(fqn, property);
        if (!ti.static) {
            throw new Error(`property ${symbol} is not static`);
        }
        const prototype = this._findSymbol(fqn);
        const value = this._ensureSync(`property ${property}`, () => this._wrapSandboxCode(() => prototype[property]));
        this._debug('value:', value);
        const ret = this._fromSandbox(value, ti);
        this._debug('ret', ret);
        return { value: ret };
    }
    sset(req) {
        const { fqn, property, value } = req;
        const symbol = `${fqn}.${property}`;
        this._debug('sset', symbol);
        const ti = this._typeInfoForProperty(fqn, property);
        if (!ti.static) {
            throw new Error(`property ${symbol} is not static`);
        }
        if (ti.immutable) {
            throw new Error(`static property ${symbol} is readonly`);
        }
        const prototype = this._findSymbol(fqn);
        this._ensureSync(`property ${property}`, () => this._wrapSandboxCode(() => prototype[property] = this._toSandbox(value, ti)));
        return {};
    }
    get(req) {
        const { objref, property } = req;
        this._debug('get', objref, property);
        const { instance, fqn } = this.objects.findObject(objref);
        const ti = this._typeInfoForProperty(fqn, property);
        // if the property is overridden by the native code and "get" is called on the object, it
        // means that the native code is trying to access the "super" property. in order to enable
        // that, we actually keep a copy of the original property descriptor when we override,
        // so `findPropertyTarget` will return either the original property name ("property") or
        // the "super" property name (somehing like "$jsii$super$<property>$").
        const propertyToGet = this._findPropertyTarget(instance, property);
        // make the actual "get", and block any async calls that might be performed
        // by jsii overrides.
        const value = this._ensureSync(`property '${objref[api_1.TOKEN_REF]}.${propertyToGet}'`, () => this._wrapSandboxCode(() => instance[propertyToGet]));
        this._debug('value:', value);
        const ret = this._fromSandbox(value, ti);
        this._debug('ret:', ret);
        return { value: ret };
    }
    set(req) {
        const { objref, property, value } = req;
        this._debug('set', objref, property, value);
        const { instance, fqn } = this.objects.findObject(objref);
        const propInfo = this._typeInfoForProperty(fqn, req.property);
        if (propInfo.immutable) {
            throw new Error(`Cannot set value of immutable property ${req.property} to ${req.value}`);
        }
        const propertyToSet = this._findPropertyTarget(instance, property);
        this._ensureSync(`property '${objref[api_1.TOKEN_REF]}.${propertyToSet}'`, () => this._wrapSandboxCode(() => instance[propertyToSet] = this._toSandbox(value, propInfo)));
        return {};
    }
    invoke(req) {
        const { objref, method } = req;
        const args = req.args || [];
        this._debug('invoke', objref, method, args);
        const { ti, obj, fn } = this._findInvokeTarget(objref, method, args);
        // verify this is not an async method
        if (ti.async) {
            throw new Error(`${method} is an async method, use "begin" instead`);
        }
        const ret = this._ensureSync(`method '${objref[api_1.TOKEN_REF]}.${method}'`, () => {
            return this._wrapSandboxCode(() => fn.apply(obj, this._toSandboxValues(args, ti.parameters)));
        });
        const result = this._fromSandbox(ret, ti.returns || 'void');
        this._debug('invoke result', result);
        return { result };
    }
    sinvoke(req) {
        const { fqn, method } = req;
        const args = req.args || [];
        this._debug('sinvoke', fqn, method, args);
        const ti = this._typeInfoForMethod(fqn, method);
        if (!ti.static) {
            throw new Error(`${fqn}.${method} is not a static method`);
        }
        // verify this is not an async method
        if (ti.async) {
            throw new Error(`${method} is an async method, use "begin" instead`);
        }
        const prototype = this._findSymbol(fqn);
        const fn = prototype[method];
        const ret = this._ensureSync(`method '${fqn}.${method}'`, () => {
            return this._wrapSandboxCode(() => fn.apply(prototype, this._toSandboxValues(args, ti.parameters)));
        });
        this._debug('method returned:', ret);
        return { result: this._fromSandbox(ret, ti.returns || 'void') };
    }
    begin(req) {
        const { objref, method } = req;
        const args = req.args || [];
        this._debug('begin', objref, method, args);
        if (this.syncInProgress) {
            // tslint:disable-next-line:max-line-length
            throw new Error(`Cannot invoke async method '${req.objref[api_1.TOKEN_REF]}.${req.method}' while sync ${this.syncInProgress} is being processed`);
        }
        const { ti, obj, fn } = this._findInvokeTarget(objref, method, args);
        // verify this is indeed an async method
        if (!ti.async) {
            throw new Error(`Method ${method} is expected to be an async method`);
        }
        const promise = this._wrapSandboxCode(() => fn.apply(obj, this._toSandboxValues(args, ti.parameters)));
        // since we are planning to resolve this promise in a different scope
        // we need to handle rejections here [1]
        // [1]: https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously/40921505
        promise.catch(_ => undefined);
        const prid = this._makeprid();
        this.promises[prid] = {
            promise,
            method: ti
        };
        return { promiseid: prid };
    }
    async end(req) {
        const { promiseid } = req;
        this._debug('end', promiseid);
        const { promise, method } = this.promises[promiseid];
        if (!promise) {
            throw new Error(`Cannot find promise with ID: ${promiseid}`);
        }
        let result;
        try {
            result = await promise;
            this._debug('promise result:', result);
        }
        catch (e) {
            this._debug('promise error:', e);
            throw mapSource(e, this.sourceMaps);
        }
        return { result: this._fromSandbox(result, method.returns || 'void') };
    }
    callbacks(_req) {
        this._debug('callbacks');
        const ret = Object.keys(this.cbs).map(cbid => {
            const cb = this.cbs[cbid];
            this.waiting[cbid] = cb; // move to waiting
            const callback = {
                cbid,
                cookie: cb.override.cookie,
                invoke: {
                    objref: cb.objref,
                    method: cb.override.method,
                    args: cb.args
                },
            };
            return callback;
        });
        // move all callbacks to the wait queue and clean the callback queue.
        this.cbs = {};
        return { callbacks: ret };
    }
    complete(req) {
        const { cbid, err, result } = req;
        this._debug('complete', cbid, err, result);
        if (!(cbid in this.waiting)) {
            throw new Error(`Callback ${cbid} not found`);
        }
        const cb = this.waiting[cbid];
        if (err) {
            this._debug('completed with error:', err);
            cb.fail(new Error(err));
        }
        else {
            const sandoxResult = this._toSandbox(result, cb.expectedReturnType || 'void');
            this._debug('completed with result:', sandoxResult);
            cb.succeed(sandoxResult);
        }
        delete this.waiting[cbid];
        return { cbid };
    }
    /**
     * Returns the language-specific names for a jsii module.
     * @param assemblyName The name of the jsii module (i.e. jsii$jsii_calculator_lib$)
     */
    naming(req) {
        const assemblyName = req.assembly;
        this._debug('naming', assemblyName);
        const assembly = this._assemblyFor(assemblyName);
        const targets = assembly.metadata.targets;
        if (!targets) {
            throw new Error(`Unexpected - "targets" for ${assemblyName} is missing!`);
        }
        return { naming: targets };
    }
    stats(_req) {
        return {
            objectCount: this.objects.count
        };
    }
    _addAssembly(assm) {
        this.assemblies[assm.metadata.name] = assm;
        // add the __jsii__.fqn property on every constructor. this allows
        // traversing between the javascript and jsii worlds given any object.
        for (const fqn of Object.keys(assm.metadata.types || {})) {
            const typedef = assm.metadata.types[fqn];
            switch (typedef.kind) {
                case spec.TypeKind.Interface:
                    continue; // interfaces don't really exist
                case spec.TypeKind.Class:
                case spec.TypeKind.Enum:
                    const constructor = this._findSymbol(fqn);
                    objects_1.tagJsiiConstructor(constructor, fqn);
            }
        }
    }
    // find the javascript constructor function for a jsii FQN.
    _findCtor(fqn, args) {
        if (fqn === wire.EMPTY_OBJECT_FQN) {
            return { ctor: Object };
        }
        const typeinfo = this._typeInfoForFqn(fqn);
        switch (typeinfo.kind) {
            case spec.TypeKind.Class:
                const classType = typeinfo;
                this._validateMethodArguments(classType.initializer, args);
                return { ctor: this._findSymbol(fqn), parameters: classType.initializer && classType.initializer.parameters };
            case spec.TypeKind.Interface:
                throw new Error(`Cannot create an object with an FQN of an interface: ${fqn}`);
            default:
                throw new Error(`Unexpected FQN kind: ${fqn}`);
        }
    }
    // prefixed with _ to allow calling this method internally without
    // getting it recorded for testing.
    _create(req) {
        this._debug('create', req);
        const { fqn, overrides } = req;
        const requestArgs = req.args || [];
        const ctorResult = this._findCtor(fqn, requestArgs);
        const ctor = ctorResult.ctor;
        const obj = this._wrapSandboxCode(() => new ctor(...this._toSandboxValues(requestArgs, ctorResult.parameters)));
        const objref = this.objects.registerObject(obj, fqn);
        // overrides: for each one of the override method names, installs a
        // method on the newly created object which represents the remote "reverse proxy".
        if (overrides) {
            this._debug('overrides', overrides);
            const overrideTypeErrorMessage = 'Override can either be "method" or "property"';
            const methods = new Set();
            const properties = new Set();
            for (const override of overrides) {
                if (api.isMethodOverride(override)) {
                    if (api.isPropertyOverride(override)) {
                        throw new Error(overrideTypeErrorMessage);
                    }
                    if (methods.has(override.method)) {
                        throw new Error(`Duplicate override for method '${override.method}'`);
                    }
                    methods.add(override.method);
                    this._applyMethodOverride(obj, objref, fqn, override);
                }
                else if (api.isPropertyOverride(override)) {
                    if (api.isMethodOverride(override)) {
                        throw new Error(overrideTypeErrorMessage);
                    }
                    if (properties.has(override.property)) {
                        throw Error(`Duplicate override for property '${override.property}'`);
                    }
                    properties.add(override.property);
                    this._applyPropertyOverride(obj, objref, fqn, override);
                }
                else {
                    throw new Error(overrideTypeErrorMessage);
                }
            }
        }
        return objref;
    }
    _getSuperPropertyName(name) {
        return `$jsii$super$${name}$`;
    }
    _applyPropertyOverride(obj, objref, typeFqn, override) {
        let propInfo;
        if (typeFqn !== wire.EMPTY_OBJECT_FQN) {
            // error if we can find a method with this name
            if (this._tryTypeInfoForMethod(typeFqn, override.property)) {
                throw new Error(`Trying to override method '${override.property}' as a property`);
            }
            propInfo = this._tryTypeInfoForProperty(typeFqn, override.property);
        }
        // if this is a private property (i.e. doesn't have `propInfo` the object has a key)
        if (!propInfo && override.property in obj) {
            this._debug(`Skipping override of private property ${override.property}`);
            return;
        }
        if (!propInfo) {
            // We've overriding a property on an object we have NO type information on (probably
            // because it's an anonymous object).
            // Pretend it's 'prop: any';
            //
            // FIXME: We could do better type checking during the conversion if JSII clients
            // would tell us the intended interface type.
            propInfo = {
                name: override.property,
                type: spec.CANONICAL_ANY,
            };
        }
        this._defineOverridenProperty(obj, objref, override, propInfo);
    }
    _defineOverridenProperty(obj, objref, override, propInfo) {
        const self = this;
        const propertyName = override.property;
        this._debug('apply override', propertyName);
        // save the old property under $jsii$super$<prop>$ so that property overrides
        // can still access it via `super.<prop>`.
        const prev = Object.getOwnPropertyDescriptor(obj, propertyName) || {
            value: undefined,
            writable: true,
            enumerable: true,
            configurable: true
        };
        const prevEnumerable = prev.enumerable;
        prev.enumerable = false;
        Object.defineProperty(obj, this._getSuperPropertyName(propertyName), prev);
        // we add callbacks for both 'get' and 'set', even if the property
        // is readonly. this is fine because if you try to set() a readonly
        // property, it will fail.
        Object.defineProperty(obj, propertyName, {
            enumerable: prevEnumerable,
            configurable: prev.configurable,
            get: () => {
                self._debug('virtual get', objref, propertyName, { cookie: override.cookie });
                const result = self.callbackHandler({
                    cookie: override.cookie,
                    cbid: self._makecbid(),
                    get: { objref, property: propertyName }
                });
                this._debug('callback returned', result);
                return this._toSandbox(result, propInfo);
            },
            set: (value) => {
                self._debug('virtual set', objref, propertyName, { cookie: override.cookie });
                self.callbackHandler({
                    cookie: override.cookie,
                    cbid: self._makecbid(),
                    set: { objref, property: propertyName, value: self._fromSandbox(value, propInfo) }
                });
            }
        });
    }
    _applyMethodOverride(obj, objref, typeFqn, override) {
        let methodInfo;
        if (typeFqn !== wire.EMPTY_OBJECT_FQN) {
            // error if we can find a property with this name
            if (this._tryTypeInfoForProperty(typeFqn, override.method)) {
                throw new Error(`Trying to override property '${override.method}' as a method`);
            }
            methodInfo = this._tryTypeInfoForMethod(typeFqn, override.method);
        }
        // If this is a private method (doesn't have methodInfo, key resolves on the object), we
        // are going to skip the override.
        if (!methodInfo && obj[override.method]) {
            this._debug(`Skipping override of private method ${override.method}`);
            return;
        }
        if (!methodInfo) {
            // We've overriding a method on an object we have NO type information on (probably
            // because it's an anonymous object).
            // Pretend it's an (...args: any[]) => any
            //
            // FIXME: We could do better type checking during the conversion if JSII clients
            // would tell us the intended interface type.
            methodInfo = {
                name: override.method,
                returns: { type: spec.CANONICAL_ANY },
                parameters: [{
                        name: 'args',
                        type: spec.CANONICAL_ANY,
                        variadic: true
                    }],
                variadic: true
            };
        }
        this._defineOverridenMethod(obj, objref, override, methodInfo);
    }
    _defineOverridenMethod(obj, objref, override, methodInfo) {
        const self = this;
        const methodName = override.method;
        if (methodInfo.async) {
            // async method override
            Object.defineProperty(obj, methodName, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: (...methodArgs) => {
                    self._debug('invoke async method override', override);
                    const args = self._toSandboxValues(methodArgs, methodInfo.parameters);
                    return new Promise((succeed, fail) => {
                        const cbid = self._makecbid();
                        self._debug('adding callback to queue', cbid);
                        self.cbs[cbid] = {
                            objref,
                            override,
                            args,
                            expectedReturnType: methodInfo.returns || 'void',
                            succeed,
                            fail
                        };
                    });
                }
            });
        }
        else {
            // sync method override (method info is not required)
            Object.defineProperty(obj, methodName, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: (...methodArgs) => {
                    self._debug('invoke sync method override', override, 'args', methodArgs);
                    // We should be validating the actual arguments according to the
                    // declared parameters here, but let's just assume the JSII runtime on the
                    // other end has done its work.
                    const result = self.callbackHandler({
                        cookie: override.cookie,
                        cbid: self._makecbid(),
                        invoke: {
                            objref,
                            method: methodName,
                            args: this._fromSandboxValues(methodArgs, methodInfo.parameters),
                        }
                    });
                    self._debug('Result', result);
                    return this._toSandbox(result, methodInfo.returns || 'void');
                }
            });
        }
    }
    _findInvokeTarget(objref, methodName, args) {
        const { instance, fqn } = this.objects.findObject(objref);
        const ti = this._typeInfoForMethod(fqn, methodName);
        this._validateMethodArguments(ti, args);
        // always first look up the method in the prototype. this practically bypasses
        // any methods overridden by derived classes (which are by definition native
        // methods). this serves to allow native call to invoke "super.method()" when
        // overriding the method.
        // if we didn't find the method on the prototype, it could be a literal object
        // that implements an interface, so we look if we have the method on the object
        // itself. if we do, we invoke it.
        let fn = instance.constructor.prototype[methodName];
        if (!fn) {
            fn = instance[methodName];
            if (!fn) {
                throw new Error(`Cannot find ${methodName} on object`);
            }
        }
        return { ti, obj: instance, fn };
    }
    _validateMethodArguments(method, args) {
        const params = (method && method.parameters) || [];
        // error if args > params
        if (args.length > params.length && !(method && method.variadic)) {
            throw new Error(`Too many arguments (method accepts ${params.length} parameters, got ${args.length} arguments)`);
        }
        for (let i = 0; i < params.length; ++i) {
            const param = params[i];
            const arg = args[i];
            if (param.variadic) {
                if (params.length <= i) {
                    return;
                } // No vararg was provided
                for (let j = i; j < params.length; j++) {
                    if (!param.optional && params[j] === undefined) {
                        // tslint:disable-next-line:max-line-length
                        throw new Error(`Unexpected 'undefined' value at index ${j - i} of variadic argument '${param.name}' of type '${spec.describeTypeReference(param.type)}'`);
                    }
                }
            }
            else if (!param.optional && arg === undefined) {
                // tslint:disable-next-line:max-line-length
                throw new Error(`Not enough arguments. Missing argument for the required parameter '${param.name}' of type '${spec.describeTypeReference(param.type)}'`);
            }
        }
    }
    _assemblyFor(assemblyName) {
        const assembly = this.assemblies[assemblyName];
        if (!assembly) {
            throw new Error(`Could not find assembly: ${assemblyName}`);
        }
        return assembly;
    }
    _findSymbol(fqn) {
        const [assemblyName, ...parts] = fqn.split('.');
        const assembly = this._assemblyFor(assemblyName);
        let curr = assembly.closure;
        while (true) {
            const name = parts.shift();
            if (!name) {
                break;
            }
            curr = curr[name];
        }
        if (!curr) {
            throw new Error(`Could not find symbol ${fqn}`);
        }
        return curr;
    }
    _typeInfoForFqn(fqn) {
        const components = fqn.split('.');
        const moduleName = components[0];
        const assembly = this.assemblies[moduleName];
        if (!assembly) {
            throw new Error(`Module '${moduleName}' not found`);
        }
        const types = assembly.metadata.types || {};
        const fqnInfo = types[fqn];
        if (!fqnInfo) {
            throw new Error(`Type '${fqn}' not found`);
        }
        return fqnInfo;
    }
    _typeInfoForMethod(fqn, methodName) {
        const ti = this._tryTypeInfoForMethod(fqn, methodName);
        if (!ti) {
            throw new Error(`Class ${fqn} doesn't have a method '${methodName}'`);
        }
        return ti;
    }
    _tryTypeInfoForMethod(fqn, methodName) {
        const typeinfo = this._typeInfoForFqn(fqn);
        const methods = typeinfo.methods || [];
        const bases = [
            typeinfo.base,
            ...(typeinfo.interfaces || [])
        ];
        for (const m of methods) {
            if (m.name === methodName) {
                return m;
            }
        }
        // recursion to parent type (if exists)
        for (const base of bases) {
            if (!base) {
                continue;
            }
            const found = this._tryTypeInfoForMethod(base, methodName);
            if (found) {
                return found;
            }
        }
        return undefined;
    }
    _tryTypeInfoForProperty(fqn, property) {
        if (!fqn) {
            throw new Error('missing "fqn"');
        }
        const typeInfo = this._typeInfoForFqn(fqn);
        let properties;
        let bases;
        if (spec.isClassType(typeInfo)) {
            const classTypeInfo = typeInfo;
            properties = classTypeInfo.properties;
            bases = classTypeInfo.base ? [classTypeInfo.base] : [];
        }
        else if (spec.isInterfaceType(typeInfo)) {
            const interfaceTypeInfo = typeInfo;
            properties = interfaceTypeInfo.properties;
            bases = interfaceTypeInfo.interfaces || [];
        }
        else {
            throw new Error(`Type of kind ${typeInfo.kind} does not have properties`);
        }
        for (const p of properties || []) {
            if (p.name === property) {
                return p;
            }
        }
        // recurse to parent type (if exists)
        for (const baseFqn of bases) {
            const ret = this._tryTypeInfoForProperty(baseFqn, property);
            if (ret) {
                return ret;
            }
        }
        return undefined;
    }
    _typeInfoForProperty(fqn, property) {
        const typeInfo = this._tryTypeInfoForProperty(fqn, property);
        if (!typeInfo) {
            throw new Error(`Type ${fqn} doesn't have a property '${property}'`);
        }
        return typeInfo;
    }
    _toSandbox(v, expectedType) {
        const serTypes = wire.serializationType(expectedType, this._typeInfoForFqn.bind(this));
        this._debug('toSandbox', v, JSON.stringify(serTypes));
        const host = {
            objects: this.objects,
            debug: this._debug.bind(this),
            findSymbol: this._findSymbol.bind(this),
            lookupType: this._typeInfoForFqn.bind(this),
            recurse: this._toSandbox.bind(this),
        };
        const errors = new Array();
        for (const { serializationClass, typeRef } of serTypes) {
            try {
                return wire.SERIALIZERS[serializationClass].deserialize(v, typeRef, host);
            }
            catch (e) {
                // If no union (99% case), rethrow immediately to preserve stack trace
                if (serTypes.length === 1) {
                    throw e;
                }
                errors.push(e.message);
            }
        }
        throw new Error(`Value did not match any type in union: ${errors}`);
    }
    _fromSandbox(v, targetType) {
        const serTypes = wire.serializationType(targetType, this._typeInfoForFqn.bind(this));
        this._debug('fromSandbox', v, JSON.stringify(serTypes));
        const host = {
            objects: this.objects,
            debug: this._debug.bind(this),
            findSymbol: this._findSymbol.bind(this),
            lookupType: this._typeInfoForFqn.bind(this),
            recurse: this._fromSandbox.bind(this),
        };
        const errors = new Array();
        for (const { serializationClass, typeRef } of serTypes) {
            try {
                return wire.SERIALIZERS[serializationClass].serialize(v, typeRef, host);
            }
            catch (e) {
                // If no union (99% case), rethrow immediately to preserve stack trace
                if (serTypes.length === 1) {
                    throw e;
                }
                errors.push(e.message);
            }
        }
        throw new Error(`Value did not match any type in union: ${errors}`);
    }
    _toSandboxValues(xs, parameters) {
        return this._boxUnboxParameters(xs, parameters, this._toSandbox.bind(this));
    }
    _fromSandboxValues(xs, parameters) {
        return this._boxUnboxParameters(xs, parameters, this._fromSandbox.bind(this));
    }
    _boxUnboxParameters(xs, parameters, boxUnbox) {
        parameters = [...(parameters || [])];
        const variadic = parameters.length > 0 && !!parameters[parameters.length - 1].variadic;
        // Repeat the last (variadic) type to match the number of actual arguments
        while (variadic && parameters.length < xs.length) {
            parameters.push(parameters[parameters.length - 1]);
        }
        if (xs.length > parameters.length) {
            throw new Error(`Argument list (${JSON.stringify(xs)}) not same size as expected argument list (length ${parameters.length})`);
        }
        return xs.map((x, i) => boxUnbox(x, parameters[i]));
    }
    _debug(...args) {
        if (this.traceEnabled) {
            // tslint:disable-next-line:no-console
            console.error.apply(console, [
                '[jsii-kernel]',
                ...args
            ]);
        }
    }
    /**
     * Ensures that `fn` is called and defends against beginning to invoke
     * async methods until fn finishes (successfully or not).
     */
    _ensureSync(desc, fn) {
        this.syncInProgress = desc;
        try {
            return fn();
        }
        catch (e) {
            throw e;
        }
        finally {
            delete this.syncInProgress;
        }
    }
    _findPropertyTarget(obj, property) {
        const superProp = this._getSuperPropertyName(property);
        if (superProp in obj) {
            return superProp;
        }
        else {
            return property;
        }
    }
    //
    // type information
    //
    _makecbid() {
        return `jsii::callback::${this.nextid++}`;
    }
    _makeprid() {
        return `jsii::promise::${this.nextid++}`;
    }
    _wrapSandboxCode(fn) {
        try {
            return fn();
        }
        catch (err) {
            throw mapSource(err, this.sourceMaps);
        }
    }
    /**
     * Executes arbitrary code in a VM sandbox.
     *
     * @param code       JavaScript code to be executed in the VM
     * @param sandbox    a VM context to use for running the code
     * @param sourceMaps source maps to be used in case an exception is thrown
     * @param filename   the file name to use for the executed code
     *
     * @returns the result of evaluating the code
     */
    _execute(code, filename) {
        const script = new vm.Script(code, { filename });
        try {
            return script.runInContext(this.sandbox, { displayErrors: true });
        }
        catch (err) {
            throw mapSource(err, this.sourceMaps);
        }
    }
}
exports.Kernel = Kernel;
class Assembly {
    constructor(metadata, closure) {
        this.metadata = metadata;
        this.closure = closure;
    }
}
/**
 * Applies source maps to an error's stack trace and returns the mapped error,
 * and stitches stack trace elements to adapt the context to the current trace.
 *
 * @param err        is the error to be mapped
 * @param sourceMaps the source maps to be used
 *
 * @returns the mapped error
 */
function mapSource(err, sourceMaps) {
    if (!err.stack) {
        return err;
    }
    const oldFrames = err.stack.split("\n");
    const obj = { stack: '' };
    const previousLimit = Error.stackTraceLimit;
    try {
        Error.stackTraceLimit = err.stack.split("\n").length;
        Error.captureStackTrace(obj, mapSource);
        const realFrames = obj.stack.split('\n').slice(1);
        const topFrame = realFrames[0].substring(0, realFrames[0].indexOf(' ('));
        err.stack = [
            ...oldFrames.slice(0, oldFrames.findIndex(frame => frame.startsWith(topFrame))).map(applyMaps),
            ...realFrames
        ].join("\n");
        return err;
    }
    finally {
        Error.stackTraceLimit = previousLimit;
    }
    function applyMaps(frame) {
        const mappable = /^(\s*at\s+.+)\(jsii\/(.+)\.js:(\d+):(\d+)\)$/;
        const matches = mappable.exec(frame);
        if (!matches) {
            return frame;
        }
        const assm = matches[2];
        if (!(assm in sourceMaps)) {
            return frame;
        }
        const prefix = matches[1];
        const line = parseInt(matches[3], 10);
        const column = parseInt(matches[4], 10);
        const sourceMap = sourceMaps[assm];
        const pos = sourceMap.originalPositionFor({ line, column });
        if (pos.source != null && pos.line != null) {
            const source = pos.source.replace(/^webpack:\/\//, `${assm}`);
            return `${prefix}(${source}:${pos.line}:${pos.column || 0})`;
        }
        return frame;
    }
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(48)(module)))

/***/ }),
/* 48 */
/***/ (function(module, exports) {

module.exports = function(module) {
	if (!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if (!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = Object.assign(
  {},
  // Export promiseified graceful-fs:
  __webpack_require__(28),
  // Export extra methods:
  __webpack_require__(29),
  __webpack_require__(33),
  __webpack_require__(61),
  __webpack_require__(63),
  __webpack_require__(69),
  __webpack_require__(4),
  __webpack_require__(73),
  __webpack_require__(75),
  __webpack_require__(77),
  __webpack_require__(5),
  __webpack_require__(15)
)

// Export fs.promises as a getter property so that we don't trigger
// ExperimentalWarning before fs.promises is actually accessed.
const fs = __webpack_require__(2)
if (Object.getOwnPropertyDescriptor(fs, 'promises')) {
  Object.defineProperty(module.exports, 'promises', {
    get () { return fs.promises }
  })
}


/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

var constants = __webpack_require__(51)

var origCwd = process.cwd
var cwd = null

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

var chdir = process.chdir
process.chdir = function(d) {
  cwd = null
  chdir.call(process, d)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chmodFix(fs.chmod)
  fs.fchmod = chmodFix(fs.fchmod)
  fs.lchmod = chmodFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chmodFixSync(fs.chmodSync)
  fs.fchmodSync = chmodFixSync(fs.fchmodSync)
  fs.lchmodSync = chmodFixSync(fs.lchmodSync)

  fs.stat = statFix(fs.stat)
  fs.fstat = statFix(fs.fstat)
  fs.lstat = statFix(fs.lstat)

  fs.statSync = statFixSync(fs.statSync)
  fs.fstatSync = statFixSync(fs.fstatSync)
  fs.lstatSync = statFixSync(fs.lstatSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now()
      var backoff = 0;
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 60000) {
          setTimeout(function() {
            fs.stat(to, function (stater, st) {
              if (stater && stater.code === "ENOENT")
                fs$rename(from, to, CB);
              else
                cb(er)
            })
          }, backoff)
          if (backoff < 100)
            backoff += 10;
          return;
        }
        if (cb) cb(er)
      })
    }})(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = (function (fs$read) { return function (fd, buffer, offset, length, position, callback_) {
    var callback
    if (callback_ && typeof callback_ === 'function') {
      var eagCounter = 0
      callback = function (er, _, __) {
        if (er && er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          return fs$read.call(fs, fd, buffer, offset, length, position, callback)
        }
        callback_.apply(this, arguments)
      }
    }
    return fs$read.call(fs, fd, buffer, offset, length, position, callback)
  }})(fs.read)

  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err)
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2)
          })
        })
      })
    }

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true
      var ret
      try {
        ret = fs.fchmodSync(fd, mode)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK")) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er)
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2)
            })
          })
        })
      }

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK)
        var ret
        var threw = true
        try {
          ret = fs.futimesSync(fd, at, mt)
          threw = false
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd)
            } catch (er) {}
          } else {
            fs.closeSync(fd)
          }
        }
        return ret
      }

    } else {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb) }
      fs.lutimesSync = function () {}
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options
        options = null
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000
          if (stats.gid < 0) stats.gid += 0x100000000
        }
        if (cb) cb.apply(this, arguments)
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target)
      if (stats.uid < 0) stats.uid += 0x100000000
      if (stats.gid < 0) stats.gid += 0x100000000
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}


/***/ }),
/* 51 */
/***/ (function(module, exports) {

module.exports = require("constants");

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

var Stream = __webpack_require__(53).Stream

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}


/***/ }),
/* 53 */
/***/ (function(module, exports) {

module.exports = require("stream");

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = clone

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: obj.__proto__ }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}


/***/ }),
/* 55 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const mkdirpSync = __webpack_require__(4).mkdirsSync
const utimesSync = __webpack_require__(31).utimesMillisSync
const stat = __webpack_require__(14)

function copySync (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts = opts || {}
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`)
  }

  const { srcStat, destStat } = stat.checkPathsSync(src, dest, 'copy')
  stat.checkParentPathsSync(src, srcStat, dest, 'copy')
  return handleFilterAndCopy(destStat, src, dest, opts)
}

function handleFilterAndCopy (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path.dirname(dest)
  if (!fs.existsSync(destParent)) mkdirpSync(destParent)
  return startCopy(destStat, src, dest, opts)
}

function startCopy (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  return getStats(destStat, src, dest, opts)
}

function getStats (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs.statSync : fs.lstatSync
  const srcStat = statSync(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)
  return mayCopyFile(srcStat, src, dest, opts)
}

function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs.unlinkSync(dest)
    return copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile (srcStat, src, dest, opts) {
  if (typeof fs.copyFileSync === 'function') {
    fs.copyFileSync(src, dest)
    fs.chmodSync(dest, srcStat.mode)
    if (opts.preserveTimestamps) {
      return utimesSync(dest, srcStat.atime, srcStat.mtime)
    }
    return
  }
  return copyFileFallback(srcStat, src, dest, opts)
}

function copyFileFallback (srcStat, src, dest, opts) {
  const BUF_LENGTH = 64 * 1024
  const _buff = __webpack_require__(59)(BUF_LENGTH)

  const fdr = fs.openSync(src, 'r')
  const fdw = fs.openSync(dest, 'w', srcStat.mode)
  let pos = 0

  while (pos < srcStat.size) {
    const bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos)
    fs.writeSync(fdw, _buff, 0, bytesRead)
    pos += bytesRead
  }

  if (opts.preserveTimestamps) fs.futimesSync(fdw, srcStat.atime, srcStat.mtime)

  fs.closeSync(fdr)
  fs.closeSync(fdw)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat, src, dest, opts)
  if (destStat && !destStat.isDirectory()) {
    throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
  }
  return copyDir(src, dest, opts)
}

function mkDirAndCopy (srcStat, src, dest, opts) {
  fs.mkdirSync(dest)
  copyDir(src, dest, opts)
  return fs.chmodSync(dest, srcStat.mode)
}

function copyDir (src, dest, opts) {
  fs.readdirSync(src).forEach(item => copyDirItem(item, src, dest, opts))
}

function copyDirItem (item, src, dest, opts) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  const { destStat } = stat.checkPathsSync(srcItem, destItem, 'copy')
  return startCopy(destStat, srcItem, destItem, opts)
}

function onLink (destStat, src, dest, opts) {
  let resolvedSrc = fs.readlinkSync(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }

  if (!destStat) {
    return fs.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest
    try {
      resolvedDest = fs.readlinkSync(dest)
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path.resolve(process.cwd(), resolvedDest)
    }
    if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (fs.statSync(dest).isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
    return copyLink(resolvedSrc, dest)
  }
}

function copyLink (resolvedSrc, dest) {
  fs.unlinkSync(dest)
  return fs.symlinkSync(resolvedSrc, dest)
}

module.exports = copySync


/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const invalidWin32Path = __webpack_require__(30).invalidWin32Path

const o777 = parseInt('0777', 8)

function mkdirs (p, opts, callback, made) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  } else if (!opts || typeof opts !== 'object') {
    opts = { mode: opts }
  }

  if (process.platform === 'win32' && invalidWin32Path(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.')
    errInval.code = 'EINVAL'
    return callback(errInval)
  }

  let mode = opts.mode
  const xfs = opts.fs || fs

  if (mode === undefined) {
    mode = o777 & (~process.umask())
  }
  if (!made) made = null

  callback = callback || function () {}
  p = path.resolve(p)

  xfs.mkdir(p, mode, er => {
    if (!er) {
      made = made || p
      return callback(null, made)
    }
    switch (er.code) {
      case 'ENOENT':
        if (path.dirname(p) === p) return callback(er)
        mkdirs(path.dirname(p), opts, (er, made) => {
          if (er) callback(er, made)
          else mkdirs(p, opts, callback, made)
        })
        break

      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
      default:
        xfs.stat(p, (er2, stat) => {
          // if the stat fails, then that's super weird.
          // let the original error be the failure reason.
          if (er2 || !stat.isDirectory()) callback(er, made)
          else callback(null, made)
        })
        break
    }
  })
}

module.exports = mkdirs


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const invalidWin32Path = __webpack_require__(30).invalidWin32Path

const o777 = parseInt('0777', 8)

function mkdirsSync (p, opts, made) {
  if (!opts || typeof opts !== 'object') {
    opts = { mode: opts }
  }

  let mode = opts.mode
  const xfs = opts.fs || fs

  if (process.platform === 'win32' && invalidWin32Path(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.')
    errInval.code = 'EINVAL'
    throw errInval
  }

  if (mode === undefined) {
    mode = o777 & (~process.umask())
  }
  if (!made) made = null

  p = path.resolve(p)

  try {
    xfs.mkdirSync(p, mode)
    made = made || p
  } catch (err0) {
    if (err0.code === 'ENOENT') {
      if (path.dirname(p) === p) throw err0
      made = mkdirsSync(path.dirname(p), opts, made)
      mkdirsSync(p, opts, made)
    } else {
      // In the case of any other error, just see if there's a dir there
      // already. If so, then hooray!  If not, then something is borked.
      let stat
      try {
        stat = xfs.statSync(p)
      } catch (err1) {
        throw err0
      }
      if (!stat.isDirectory()) throw err0
    }
  }

  return made
}

module.exports = mkdirsSync


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/* eslint-disable node/no-deprecated-api */
module.exports = function (size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    try {
      return Buffer.allocUnsafe(size)
    } catch (e) {
      return new Buffer(size)
    }
  }
  return new Buffer(size)
}


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const mkdirp = __webpack_require__(4).mkdirs
const pathExists = __webpack_require__(5).pathExists
const utimes = __webpack_require__(31).utimesMillis
const stat = __webpack_require__(14)

function copy (src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts
    opts = {}
  } else if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  cb = cb || function () {}
  opts = opts || {}

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`)
  }

  stat.checkPaths(src, dest, 'copy', (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats
    stat.checkParentPaths(src, srcStat, dest, 'copy', err => {
      if (err) return cb(err)
      if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb)
      return checkParentDir(destStat, src, dest, opts, cb)
    })
  })
}

function checkParentDir (destStat, src, dest, opts, cb) {
  const destParent = path.dirname(dest)
  pathExists(destParent, (err, dirExists) => {
    if (err) return cb(err)
    if (dirExists) return startCopy(destStat, src, dest, opts, cb)
    mkdirp(destParent, err => {
      if (err) return cb(err)
      return startCopy(destStat, src, dest, opts, cb)
    })
  })
}

function handleFilter (onInclude, destStat, src, dest, opts, cb) {
  Promise.resolve(opts.filter(src, dest)).then(include => {
    if (include) return onInclude(destStat, src, dest, opts, cb)
    return cb()
  }, error => cb(error))
}

function startCopy (destStat, src, dest, opts, cb) {
  if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb)
  return getStats(destStat, src, dest, opts, cb)
}

function getStats (destStat, src, dest, opts, cb) {
  const stat = opts.dereference ? fs.stat : fs.lstat
  stat(src, (err, srcStat) => {
    if (err) return cb(err)

    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isFile() ||
             srcStat.isCharacterDevice() ||
             srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb)
  })
}

function onFile (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return copyFile(srcStat, src, dest, opts, cb)
  return mayCopyFile(srcStat, src, dest, opts, cb)
}

function mayCopyFile (srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    fs.unlink(dest, err => {
      if (err) return cb(err)
      return copyFile(srcStat, src, dest, opts, cb)
    })
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`))
  } else return cb()
}

function copyFile (srcStat, src, dest, opts, cb) {
  if (typeof fs.copyFile === 'function') {
    return fs.copyFile(src, dest, err => {
      if (err) return cb(err)
      return setDestModeAndTimestamps(srcStat, dest, opts, cb)
    })
  }
  return copyFileFallback(srcStat, src, dest, opts, cb)
}

function copyFileFallback (srcStat, src, dest, opts, cb) {
  const rs = fs.createReadStream(src)
  rs.on('error', err => cb(err)).once('open', () => {
    const ws = fs.createWriteStream(dest, { mode: srcStat.mode })
    ws.on('error', err => cb(err))
      .on('open', () => rs.pipe(ws))
      .once('close', () => setDestModeAndTimestamps(srcStat, dest, opts, cb))
  })
}

function setDestModeAndTimestamps (srcStat, dest, opts, cb) {
  fs.chmod(dest, srcStat.mode, err => {
    if (err) return cb(err)
    if (opts.preserveTimestamps) {
      return utimes(dest, srcStat.atime, srcStat.mtime, cb)
    }
    return cb()
  })
}

function onDir (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return mkDirAndCopy(srcStat, src, dest, opts, cb)
  if (destStat && !destStat.isDirectory()) {
    return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`))
  }
  return copyDir(src, dest, opts, cb)
}

function mkDirAndCopy (srcStat, src, dest, opts, cb) {
  fs.mkdir(dest, err => {
    if (err) return cb(err)
    copyDir(src, dest, opts, err => {
      if (err) return cb(err)
      return fs.chmod(dest, srcStat.mode, cb)
    })
  })
}

function copyDir (src, dest, opts, cb) {
  fs.readdir(src, (err, items) => {
    if (err) return cb(err)
    return copyDirItems(items, src, dest, opts, cb)
  })
}

function copyDirItems (items, src, dest, opts, cb) {
  const item = items.pop()
  if (!item) return cb()
  return copyDirItem(items, item, src, dest, opts, cb)
}

function copyDirItem (items, item, src, dest, opts, cb) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  stat.checkPaths(srcItem, destItem, 'copy', (err, stats) => {
    if (err) return cb(err)
    const { destStat } = stats
    startCopy(destStat, srcItem, destItem, opts, err => {
      if (err) return cb(err)
      return copyDirItems(items, src, dest, opts, cb)
    })
  })
}

function onLink (destStat, src, dest, opts, cb) {
  fs.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err)
    if (opts.dereference) {
      resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
    }

    if (!destStat) {
      return fs.symlink(resolvedSrc, dest, cb)
    } else {
      fs.readlink(dest, (err, resolvedDest) => {
        if (err) {
          // dest exists and is a regular file or directory,
          // Windows may throw UNKNOWN error. If dest already exists,
          // fs throws error anyway, so no need to guard against it here.
          if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlink(resolvedSrc, dest, cb)
          return cb(err)
        }
        if (opts.dereference) {
          resolvedDest = path.resolve(process.cwd(), resolvedDest)
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`))
        }

        // do not copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.
        if (destStat.isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`))
        }
        return copyLink(resolvedSrc, dest, cb)
      })
    }
  })
}

function copyLink (resolvedSrc, dest, cb) {
  fs.unlink(dest, err => {
    if (err) return cb(err)
    return fs.symlink(resolvedSrc, dest, cb)
  })
}

module.exports = copy


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const mkdir = __webpack_require__(4)
const remove = __webpack_require__(15)

const emptyDir = u(function emptyDir (dir, callback) {
  callback = callback || function () {}
  fs.readdir(dir, (err, items) => {
    if (err) return mkdir.mkdirs(dir, callback)

    items = items.map(item => path.join(dir, item))

    deleteItem()

    function deleteItem () {
      const item = items.pop()
      if (!item) return callback()
      remove.remove(item, err => {
        if (err) return callback(err)
        deleteItem()
      })
    }
  })
})

function emptyDirSync (dir) {
  let items
  try {
    items = fs.readdirSync(dir)
  } catch (err) {
    return mkdir.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path.join(dir, item)
    remove.removeSync(item)
  })
}

module.exports = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
}


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const assert = __webpack_require__(13)

const isWindows = (process.platform === 'win32')

function defaults (options) {
  const methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(m => {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
}

function rimraf (p, options, cb) {
  let busyTries = 0

  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string')
  assert.strictEqual(typeof cb, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object')

  defaults(options)

  rimraf_(p, options, function CB (er) {
    if (er) {
      if ((er.code === 'EBUSY' || er.code === 'ENOTEMPTY' || er.code === 'EPERM') &&
          busyTries < options.maxBusyTries) {
        busyTries++
        const time = busyTries * 100
        // try again, with the same exact callback as this one.
        return setTimeout(() => rimraf_(p, options, CB), time)
      }

      // already gone
      if (er.code === 'ENOENT') er = null
    }

    cb(er)
  })
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, (er, st) => {
    if (er && er.code === 'ENOENT') {
      return cb(null)
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === 'EPERM' && isWindows) {
      return fixWinEPERM(p, options, er, cb)
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, er, cb)
    }

    options.unlink(p, er => {
      if (er) {
        if (er.code === 'ENOENT') {
          return cb(null)
        }
        if (er.code === 'EPERM') {
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        }
        if (er.code === 'EISDIR') {
          return rmdir(p, options, er, cb)
        }
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er) {
    assert(er instanceof Error)
  }

  options.chmod(p, 0o666, er2 => {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : er)
    } else {
      options.stat(p, (er3, stats) => {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : er)
        } else if (stats.isDirectory()) {
          rmdir(p, options, er, cb)
        } else {
          options.unlink(p, cb)
        }
      })
    }
  })
}

function fixWinEPERMSync (p, options, er) {
  let stats

  assert(p)
  assert(options)
  if (er) {
    assert(er instanceof Error)
  }

  try {
    options.chmodSync(p, 0o666)
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  try {
    stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, er)
  } else {
    options.unlinkSync(p)
  }
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr) {
    assert(originalEr instanceof Error)
  }
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, er => {
    if (er && (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM')) {
      rmkids(p, options, cb)
    } else if (er && er.code === 'ENOTDIR') {
      cb(originalEr)
    } else {
      cb(er)
    }
  })
}

function rmkids (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, (er, files) => {
    if (er) return cb(er)

    let n = files.length
    let errState

    if (n === 0) return options.rmdir(p, cb)

    files.forEach(f => {
      rimraf(path.join(p, f), options, er => {
        if (errState) {
          return
        }
        if (er) return cb(errState = er)
        if (--n === 0) {
          options.rmdir(p, cb)
        }
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  let st

  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object')

  try {
    st = options.lstatSync(p)
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er.code === 'EPERM' && isWindows) {
      fixWinEPERMSync(p, options, er)
    }
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory()) {
      rmdirSync(p, options, null)
    } else {
      options.unlinkSync(p)
    }
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    } else if (er.code === 'EPERM') {
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
    } else if (er.code !== 'EISDIR') {
      throw er
    }
    rmdirSync(p, options, er)
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr) {
    assert(originalEr instanceof Error)
  }

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === 'ENOTDIR') {
      throw originalEr
    } else if (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM') {
      rmkidsSync(p, options)
    } else if (er.code !== 'ENOENT') {
      throw er
    }
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(f => rimrafSync(path.join(p, f), options))

  if (isWindows) {
    // We only end up here once we got ENOTEMPTY at least once, and
    // at this point, we are guaranteed to have removed all the kids.
    // So, we know that it won't be ENOENT or ENOTDIR or anything else.
    // try really hard to delete stuff on windows, because it has a
    // PROFOUNDLY annoying habit of not closing handles promptly when
    // files are deleted, resulting in spurious ENOTEMPTY errors.
    const startTime = Date.now()
    do {
      try {
        const ret = options.rmdirSync(p, options)
        return ret
      } catch (er) { }
    } while (Date.now() - startTime < 500) // give up after 500ms
  } else {
    const ret = options.rmdirSync(p, options)
    return ret
  }
}

module.exports = rimraf
rimraf.sync = rimrafSync


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const file = __webpack_require__(64)
const link = __webpack_require__(65)
const symlink = __webpack_require__(66)

module.exports = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
}


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const path = __webpack_require__(0)
const fs = __webpack_require__(1)
const mkdir = __webpack_require__(4)
const pathExists = __webpack_require__(5).pathExists

function createFile (file, callback) {
  function makeFile () {
    fs.writeFile(file, '', err => {
      if (err) return callback(err)
      callback()
    })
  }

  fs.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback()
    const dir = path.dirname(file)
    pathExists(dir, (err, dirExists) => {
      if (err) return callback(err)
      if (dirExists) return makeFile()
      mkdir.mkdirs(dir, err => {
        if (err) return callback(err)
        makeFile()
      })
    })
  })
}

function createFileSync (file) {
  let stats
  try {
    stats = fs.statSync(file)
  } catch (e) {}
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    mkdir.mkdirsSync(dir)
  }

  fs.writeFileSync(file, '')
}

module.exports = {
  createFile: u(createFile),
  createFileSync
}


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const path = __webpack_require__(0)
const fs = __webpack_require__(1)
const mkdir = __webpack_require__(4)
const pathExists = __webpack_require__(5).pathExists

function createLink (srcpath, dstpath, callback) {
  function makeLink (srcpath, dstpath) {
    fs.link(srcpath, dstpath, err => {
      if (err) return callback(err)
      callback(null)
    })
  }

  pathExists(dstpath, (err, destinationExists) => {
    if (err) return callback(err)
    if (destinationExists) return callback(null)
    fs.lstat(srcpath, (err) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink')
        return callback(err)
      }

      const dir = path.dirname(dstpath)
      pathExists(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return makeLink(srcpath, dstpath)
        mkdir.mkdirs(dir, err => {
          if (err) return callback(err)
          makeLink(srcpath, dstpath)
        })
      })
    })
  })
}

function createLinkSync (srcpath, dstpath) {
  const destinationExists = fs.existsSync(dstpath)
  if (destinationExists) return undefined

  try {
    fs.lstatSync(srcpath)
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  const dir = path.dirname(dstpath)
  const dirExists = fs.existsSync(dir)
  if (dirExists) return fs.linkSync(srcpath, dstpath)
  mkdir.mkdirsSync(dir)

  return fs.linkSync(srcpath, dstpath)
}

module.exports = {
  createLink: u(createLink),
  createLinkSync
}


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const path = __webpack_require__(0)
const fs = __webpack_require__(1)
const _mkdirs = __webpack_require__(4)
const mkdirs = _mkdirs.mkdirs
const mkdirsSync = _mkdirs.mkdirsSync

const _symlinkPaths = __webpack_require__(67)
const symlinkPaths = _symlinkPaths.symlinkPaths
const symlinkPathsSync = _symlinkPaths.symlinkPathsSync

const _symlinkType = __webpack_require__(68)
const symlinkType = _symlinkType.symlinkType
const symlinkTypeSync = _symlinkType.symlinkTypeSync

const pathExists = __webpack_require__(5).pathExists

function createSymlink (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type

  pathExists(dstpath, (err, destinationExists) => {
    if (err) return callback(err)
    if (destinationExists) return callback(null)
    symlinkPaths(srcpath, dstpath, (err, relative) => {
      if (err) return callback(err)
      srcpath = relative.toDst
      symlinkType(relative.toCwd, type, (err, type) => {
        if (err) return callback(err)
        const dir = path.dirname(dstpath)
        pathExists(dir, (err, dirExists) => {
          if (err) return callback(err)
          if (dirExists) return fs.symlink(srcpath, dstpath, type, callback)
          mkdirs(dir, err => {
            if (err) return callback(err)
            fs.symlink(srcpath, dstpath, type, callback)
          })
        })
      })
    })
  })
}

function createSymlinkSync (srcpath, dstpath, type) {
  const destinationExists = fs.existsSync(dstpath)
  if (destinationExists) return undefined

  const relative = symlinkPathsSync(srcpath, dstpath)
  srcpath = relative.toDst
  type = symlinkTypeSync(relative.toCwd, type)
  const dir = path.dirname(dstpath)
  const exists = fs.existsSync(dir)
  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir)
  return fs.symlinkSync(srcpath, dstpath, type)
}

module.exports = {
  createSymlink: u(createSymlink),
  createSymlinkSync
}


/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const path = __webpack_require__(0)
const fs = __webpack_require__(1)
const pathExists = __webpack_require__(5).pathExists

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

function symlinkPaths (srcpath, dstpath, callback) {
  if (path.isAbsolute(srcpath)) {
    return fs.lstat(srcpath, (err) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink')
        return callback(err)
      }
      return callback(null, {
        'toCwd': srcpath,
        'toDst': srcpath
      })
    })
  } else {
    const dstdir = path.dirname(dstpath)
    const relativeToDst = path.join(dstdir, srcpath)
    return pathExists(relativeToDst, (err, exists) => {
      if (err) return callback(err)
      if (exists) {
        return callback(null, {
          'toCwd': relativeToDst,
          'toDst': srcpath
        })
      } else {
        return fs.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink')
            return callback(err)
          }
          return callback(null, {
            'toCwd': srcpath,
            'toDst': path.relative(dstdir, srcpath)
          })
        })
      }
    })
  }
}

function symlinkPathsSync (srcpath, dstpath) {
  let exists
  if (path.isAbsolute(srcpath)) {
    exists = fs.existsSync(srcpath)
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      'toCwd': srcpath,
      'toDst': srcpath
    }
  } else {
    const dstdir = path.dirname(dstpath)
    const relativeToDst = path.join(dstdir, srcpath)
    exists = fs.existsSync(relativeToDst)
    if (exists) {
      return {
        'toCwd': relativeToDst,
        'toDst': srcpath
      }
    } else {
      exists = fs.existsSync(srcpath)
      if (!exists) throw new Error('relative srcpath does not exist')
      return {
        'toCwd': srcpath,
        'toDst': path.relative(dstdir, srcpath)
      }
    }
  }
}

module.exports = {
  symlinkPaths,
  symlinkPathsSync
}


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)

function symlinkType (srcpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type
  if (type) return callback(null, type)
  fs.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file')
    type = (stats && stats.isDirectory()) ? 'dir' : 'file'
    callback(null, type)
  })
}

function symlinkTypeSync (srcpath, type) {
  let stats

  if (type) return type
  try {
    stats = fs.lstatSync(srcpath)
  } catch (e) {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

module.exports = {
  symlinkType,
  symlinkTypeSync
}


/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const jsonFile = __webpack_require__(20)

jsonFile.outputJson = u(__webpack_require__(71))
jsonFile.outputJsonSync = __webpack_require__(72)
// aliases
jsonFile.outputJSON = jsonFile.outputJson
jsonFile.outputJSONSync = jsonFile.outputJsonSync
jsonFile.writeJSON = jsonFile.writeJson
jsonFile.writeJSONSync = jsonFile.writeJsonSync
jsonFile.readJSON = jsonFile.readJson
jsonFile.readJSONSync = jsonFile.readJsonSync

module.exports = jsonFile


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

var _fs
try {
  _fs = __webpack_require__(1)
} catch (_) {
  _fs = __webpack_require__(2)
}

function readFile (file, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }

  if (typeof options === 'string') {
    options = {encoding: options}
  }

  options = options || {}
  var fs = options.fs || _fs

  var shouldThrow = true
  if ('throws' in options) {
    shouldThrow = options.throws
  }

  fs.readFile(file, options, function (err, data) {
    if (err) return callback(err)

    data = stripBom(data)

    var obj
    try {
      obj = JSON.parse(data, options ? options.reviver : null)
    } catch (err2) {
      if (shouldThrow) {
        err2.message = file + ': ' + err2.message
        return callback(err2)
      } else {
        return callback(null, null)
      }
    }

    callback(null, obj)
  })
}

function readFileSync (file, options) {
  options = options || {}
  if (typeof options === 'string') {
    options = {encoding: options}
  }

  var fs = options.fs || _fs

  var shouldThrow = true
  if ('throws' in options) {
    shouldThrow = options.throws
  }

  try {
    var content = fs.readFileSync(file, options)
    content = stripBom(content)
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = file + ': ' + err.message
      throw err
    } else {
      return null
    }
  }
}

function stringify (obj, options) {
  var spaces
  var EOL = '\n'
  if (typeof options === 'object' && options !== null) {
    if (options.spaces) {
      spaces = options.spaces
    }
    if (options.EOL) {
      EOL = options.EOL
    }
  }

  var str = JSON.stringify(obj, options ? options.replacer : null, spaces)

  return str.replace(/\n/g, EOL) + EOL
}

function writeFile (file, obj, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }
  options = options || {}
  var fs = options.fs || _fs

  var str = ''
  try {
    str = stringify(obj, options)
  } catch (err) {
    // Need to return whether a callback was passed or not
    if (callback) callback(err, null)
    return
  }

  fs.writeFile(file, str, options, callback)
}

function writeFileSync (file, obj, options) {
  options = options || {}
  var fs = options.fs || _fs

  var str = stringify(obj, options)
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

function stripBom (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8')
  content = content.replace(/^\uFEFF/, '')
  return content
}

var jsonfile = {
  readFile: readFile,
  readFileSync: readFileSync,
  writeFile: writeFile,
  writeFileSync: writeFileSync
}

module.exports = jsonfile


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const path = __webpack_require__(0)
const mkdir = __webpack_require__(4)
const pathExists = __webpack_require__(5).pathExists
const jsonFile = __webpack_require__(20)

function outputJson (file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const dir = path.dirname(file)

  pathExists(dir, (err, itDoes) => {
    if (err) return callback(err)
    if (itDoes) return jsonFile.writeJson(file, data, options, callback)

    mkdir.mkdirs(dir, err => {
      if (err) return callback(err)
      jsonFile.writeJson(file, data, options, callback)
    })
  })
}

module.exports = outputJson


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const mkdir = __webpack_require__(4)
const jsonFile = __webpack_require__(20)

function outputJsonSync (file, data, options) {
  const dir = path.dirname(file)

  if (!fs.existsSync(dir)) {
    mkdir.mkdirsSync(dir)
  }

  jsonFile.writeJsonSync(file, data, options)
}

module.exports = outputJsonSync


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {
  moveSync: __webpack_require__(74)
}


/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const copySync = __webpack_require__(29).copySync
const removeSync = __webpack_require__(15).removeSync
const mkdirpSync = __webpack_require__(4).mkdirpSync
const stat = __webpack_require__(14)

function moveSync (src, dest, opts) {
  opts = opts || {}
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat } = stat.checkPathsSync(src, dest, 'move')
  stat.checkParentPathsSync(src, srcStat, dest, 'move')
  mkdirpSync(path.dirname(dest))
  return doRename(src, dest, overwrite)
}

function doRename (src, dest, overwrite) {
  if (overwrite) {
    removeSync(dest)
    return rename(src, dest, overwrite)
  }
  if (fs.existsSync(dest)) throw new Error('dest already exists.')
  return rename(src, dest, overwrite)
}

function rename (src, dest, overwrite) {
  try {
    fs.renameSync(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice(src, dest, overwrite)
  }
}

function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true
  }
  copySync(src, dest, opts)
  return removeSync(src)
}

module.exports = moveSync


/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
module.exports = {
  move: u(__webpack_require__(76))
}


/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const copy = __webpack_require__(33).copy
const remove = __webpack_require__(15).remove
const mkdirp = __webpack_require__(4).mkdirp
const pathExists = __webpack_require__(5).pathExists
const stat = __webpack_require__(14)

function move (src, dest, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  const overwrite = opts.overwrite || opts.clobber || false

  stat.checkPaths(src, dest, 'move', (err, stats) => {
    if (err) return cb(err)
    const { srcStat } = stats
    stat.checkParentPaths(src, srcStat, dest, 'move', err => {
      if (err) return cb(err)
      mkdirp(path.dirname(dest), err => {
        if (err) return cb(err)
        return doRename(src, dest, overwrite, cb)
      })
    })
  })
}

function doRename (src, dest, overwrite, cb) {
  if (overwrite) {
    return remove(dest, err => {
      if (err) return cb(err)
      return rename(src, dest, overwrite, cb)
    })
  }
  pathExists(dest, (err, destExists) => {
    if (err) return cb(err)
    if (destExists) return cb(new Error('dest already exists.'))
    return rename(src, dest, overwrite, cb)
  })
}

function rename (src, dest, overwrite, cb) {
  fs.rename(src, dest, err => {
    if (!err) return cb()
    if (err.code !== 'EXDEV') return cb(err)
    return moveAcrossDevice(src, dest, overwrite, cb)
  })
}

function moveAcrossDevice (src, dest, overwrite, cb) {
  const opts = {
    overwrite,
    errorOnExist: true
  }
  copy(src, dest, opts, err => {
    if (err) return cb(err)
    return remove(src, cb)
  })
}

module.exports = move


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const u = __webpack_require__(3).fromCallback
const fs = __webpack_require__(1)
const path = __webpack_require__(0)
const mkdir = __webpack_require__(4)
const pathExists = __webpack_require__(5).pathExists

function outputFile (file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding
    encoding = 'utf8'
  }

  const dir = path.dirname(file)
  pathExists(dir, (err, itDoes) => {
    if (err) return callback(err)
    if (itDoes) return fs.writeFile(file, data, encoding, callback)

    mkdir.mkdirs(dir, err => {
      if (err) return callback(err)

      fs.writeFile(file, data, encoding, callback)
    })
  })
}

function outputFileSync (file, ...args) {
  const dir = path.dirname(file)
  if (fs.existsSync(dir)) {
    return fs.writeFileSync(file, ...args)
  }
  mkdir.mkdirsSync(dir)
  fs.writeFileSync(file, ...args)
}

module.exports = {
  outputFile: u(outputFile),
  outputFileSync
}


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A tree of all names in a module. A node represent a type (terminal)
 * and may represent another node in the namespace (at the same time).
 * Therefore, a key of '_' represents a terminal and references the fqn
 * of the type.
 *
 * For example, say we have the following types:
 *   - aws.ec2.Host
 *   - aws.ec2.Instance
 *   - aws.ec2.Instance.Subtype
 *
 * the the name tree will look like this:
 *
 * module: {
 *   children: {
 *     aws: {
 *       children {
 *         ec2: {
 *           children: {
 *             Host: {
 *               fqn: 'aws.ec2.Host',
 *               children: {}
 *             },
 *             Instance: {
 *               fqn: 'aws.ec2.Host',
 *               children: {
 *                 Subtype: {
 *                   fqn: 'aws.ec2.Host.Subtype',
 *                   children: {}
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
class NameTree {
    /* NameTree.of(assembly) should be used. */
    constructor() {
        this._children = {};
    }
    static of(assm) {
        const nameTree = new NameTree();
        for (const type of Object.values(assm.types || {})) {
            nameTree.register(type.fqn);
        }
        return nameTree;
    }
    /** The children of this node, by name. */
    get children() {
        return this._children;
    }
    /** The fully qualified name of the type at this node, if there is one. */
    get fqn() {
        return this._fqn;
    }
    /**
     * Adds a type to this ``NameTree``.
     *
     * @param type the type to be added.
     * @param path the path at which to add the node under this tree.
     */
    register(fqn, path = fqn.split('.')) {
        if (path.length === 0) {
            this._fqn = fqn;
        }
        else {
            const [head, ...rest] = path;
            if (!this._children[head]) {
                this._children[head] = new NameTree();
            }
            this._children[head].register(fqn, rest);
        }
        return this;
    }
}
exports.NameTree = NameTree;


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEC_FILE_NAME = '.jsii';
/**
 * Versions of the JSII Assembly Specification.
 */
var SchemaVersion;
(function (SchemaVersion) {
    SchemaVersion["LATEST"] = "jsii/0.10.0";
})(SchemaVersion = exports.SchemaVersion || (exports.SchemaVersion = {}));
/**
 * API Stability levels. These are modeled after the `node` stability index.
 *
 * @see https://nodejs.org/api/documentation.html#documentation_stability_index.
 */
var Stability;
(function (Stability) {
    /**
     * The API may emit warnings. Backward compatibility is not guaranteed.
     *
     * More information about the deprecation can usually be found in the
     * `deprecated` field.
     */
    Stability["Deprecated"] = "deprecated";
    /**
     * This API is still under active development and subject to non-backward
     * compatible changes or removal in any future version. Use of the API is
     * not recommended in production environments. Experimental APIs are not
     * subject to the Semantic Versioning model.
     */
    Stability["Experimental"] = "experimental";
    /**
     * This API is subject to the Semantic Versioning model and may not change
     * in breaking ways in a subsequent minor or patch version.
     */
    Stability["Stable"] = "stable";
    /**
     * This API is an representation of an API managed elsewhere and follows
     * the other API's versioning model.
     */
    Stability["External"] = "external";
})(Stability = exports.Stability || (exports.Stability = {}));
/**
 * Kinds of collections.
 */
var CollectionKind;
(function (CollectionKind) {
    /**
     * An array, or a list of some element type.
     */
    CollectionKind["Array"] = "array";
    /**
     * A map of a string to some element type.
     */
    CollectionKind["Map"] = "map";
})(CollectionKind = exports.CollectionKind || (exports.CollectionKind = {}));
/**
 * Kinds of primitive types.
 */
var PrimitiveType;
(function (PrimitiveType) {
    /**
     * A JSON date (represented as it's ISO-8601 string form).
     */
    PrimitiveType["Date"] = "date";
    /**
     * A plain string.
     */
    PrimitiveType["String"] = "string";
    /**
     * A number (integer or float).
     */
    PrimitiveType["Number"] = "number";
    /**
     * A boolean value.
     */
    PrimitiveType["Boolean"] = "boolean";
    /**
     * A JSON object
     */
    PrimitiveType["Json"] = "json";
    /**
     * Value with "any" or "unknown" type (aka Object). Values typed `any` may
     * be `null` or `undefined`.
     */
    PrimitiveType["Any"] = "any";
})(PrimitiveType = exports.PrimitiveType || (exports.PrimitiveType = {}));
/**
 * The standard representation of the `any` type (includes optionality marker).
 */
exports.CANONICAL_ANY = { primitive: PrimitiveType.Any };
function isNamedTypeReference(ref) {
    return ref != null && !!ref.fqn;
}
exports.isNamedTypeReference = isNamedTypeReference;
function isPrimitiveTypeReference(ref) {
    return ref != null && !!ref.primitive;
}
exports.isPrimitiveTypeReference = isPrimitiveTypeReference;
function isCollectionTypeReference(ref) {
    return ref != null && !!ref.collection;
}
exports.isCollectionTypeReference = isCollectionTypeReference;
function isUnionTypeReference(ref) {
    return ref != null && !!ref.union;
}
exports.isUnionTypeReference = isUnionTypeReference;
/**
 * Determines whether a Callable is a Method or not.
 *
 * @param callable the callable to be checked.
 */
function isMethod(callable) {
    return !!callable.name;
}
exports.isMethod = isMethod;
/**
 * Kinds of types.
 */
var TypeKind;
(function (TypeKind) {
    TypeKind["Class"] = "class";
    TypeKind["Enum"] = "enum";
    TypeKind["Interface"] = "interface";
})(TypeKind = exports.TypeKind || (exports.TypeKind = {}));
function isClassType(type) {
    return type != null && type.kind === TypeKind.Class;
}
exports.isClassType = isClassType;
function isInterfaceType(type) {
    return type != null && type.kind === TypeKind.Interface;
}
exports.isInterfaceType = isInterfaceType;
function isEnumType(type) {
    return type != null && type.kind === TypeKind.Enum;
}
exports.isEnumType = isEnumType;
/**
 * Return whether this type is a class or interface type
 */
function isClassOrInterfaceType(type) {
    return isClassType(type) || isInterfaceType(type);
}
exports.isClassOrInterfaceType = isClassOrInterfaceType;
/**
 * Return a string representation of the given type reference.
 */
function describeTypeReference(type) {
    if (type === undefined) {
        return 'void';
    }
    if (isNamedTypeReference(type)) {
        return type.fqn;
    }
    if (isPrimitiveTypeReference(type)) {
        return type.primitive;
    }
    if (isCollectionTypeReference(type)) {
        return `${type.collection.kind}<${describeTypeReference(type.collection.elementtype)}>`;
    }
    if (isUnionTypeReference(type)) {
        const unionType = type.union.types.map(describeTypeReference).join(' | ');
        return unionType;
    }
    throw new Error('Unrecognized type reference');
}
exports.describeTypeReference = describeTypeReference;
/**
 * Determines whether an entity is deprecated.
 *
 * @param entity the entity to be checked.
 *
 * @returns true if the entity is marked as deprecated.
 */
function isDeprecated(entity) {
    return entity.docs != null && entity.docs.stability === Stability.Deprecated;
}
exports.isDeprecated = isDeprecated;


/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const jsonschema = __webpack_require__(81);
// tslint:disable-next-line:no-var-requires
exports.schema = __webpack_require__(84);
function validateAssembly(obj) {
    const validator = new jsonschema.Validator();
    validator.addSchema(exports.schema); // For definitions
    const result = validator.validate(obj, exports.schema, { nestedErrors: true }); // nestedErrors does exist but is not in the TypeScript definitions
    if (result.valid) {
        return obj;
    }
    throw new Error(`Invalid assembly:\n${result}`);
}
exports.validateAssembly = validateAssembly;


/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Validator = module.exports.Validator = __webpack_require__(82);

module.exports.ValidatorResult = __webpack_require__(7).ValidatorResult;
module.exports.ValidationError = __webpack_require__(7).ValidationError;
module.exports.SchemaError = __webpack_require__(7).SchemaError;
module.exports.SchemaScanResult = __webpack_require__(22).SchemaScanResult;
module.exports.scan = __webpack_require__(22).scan;

module.exports.validate = function (instance, schema, options) {
  var v = new Validator();
  return v.validate(instance, schema, options);
};


/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var urilib = __webpack_require__(21);

var attribute = __webpack_require__(83);
var helpers = __webpack_require__(7);
var scanSchema = __webpack_require__(22).scan;
var ValidatorResult = helpers.ValidatorResult;
var SchemaError = helpers.SchemaError;
var SchemaContext = helpers.SchemaContext;
//var anonymousBase = 'vnd.jsonschema:///';
var anonymousBase = '/';

/**
 * Creates a new Validator object
 * @name Validator
 * @constructor
 */
var Validator = function Validator () {
  // Allow a validator instance to override global custom formats or to have their
  // own custom formats.
  this.customFormats = Object.create(Validator.prototype.customFormats);
  this.schemas = {};
  this.unresolvedRefs = [];

  // Use Object.create to make this extensible without Validator instances stepping on each other's toes.
  this.types = Object.create(types);
  this.attributes = Object.create(attribute.validators);
};

// Allow formats to be registered globally.
Validator.prototype.customFormats = {};

// Hint at the presence of a property
Validator.prototype.schemas = null;
Validator.prototype.types = null;
Validator.prototype.attributes = null;
Validator.prototype.unresolvedRefs = null;

/**
 * Adds a schema with a certain urn to the Validator instance.
 * @param schema
 * @param urn
 * @return {Object}
 */
Validator.prototype.addSchema = function addSchema (schema, base) {
  var self = this;
  if (!schema) {
    return null;
  }
  var scan = scanSchema(base||anonymousBase, schema);
  var ourUri = base || schema.id;
  for(var uri in scan.id){
    this.schemas[uri] = scan.id[uri];
  }
  for(var uri in scan.ref){
    this.unresolvedRefs.push(uri);
  }
  this.unresolvedRefs = this.unresolvedRefs.filter(function(uri){
    return typeof self.schemas[uri]==='undefined';
  });
  return this.schemas[ourUri];
};

Validator.prototype.addSubSchemaArray = function addSubSchemaArray(baseuri, schemas) {
  if(!(schemas instanceof Array)) return;
  for(var i=0; i<schemas.length; i++){
    this.addSubSchema(baseuri, schemas[i]);
  }
};

Validator.prototype.addSubSchemaObject = function addSubSchemaArray(baseuri, schemas) {
  if(!schemas || typeof schemas!='object') return;
  for(var p in schemas){
    this.addSubSchema(baseuri, schemas[p]);
  }
};



/**
 * Sets all the schemas of the Validator instance.
 * @param schemas
 */
Validator.prototype.setSchemas = function setSchemas (schemas) {
  this.schemas = schemas;
};

/**
 * Returns the schema of a certain urn
 * @param urn
 */
Validator.prototype.getSchema = function getSchema (urn) {
  return this.schemas[urn];
};

/**
 * Validates instance against the provided schema
 * @param instance
 * @param schema
 * @param [options]
 * @param [ctx]
 * @return {Array}
 */
Validator.prototype.validate = function validate (instance, schema, options, ctx) {
  if (!options) {
    options = {};
  }
  var propertyName = options.propertyName || 'instance';
  // This will work so long as the function at uri.resolve() will resolve a relative URI to a relative URI
  var base = urilib.resolve(options.base||anonymousBase, schema.id||'');
  if(!ctx){
    ctx = new SchemaContext(schema, options, propertyName, base, Object.create(this.schemas));
    if (!ctx.schemas[base]) {
      ctx.schemas[base] = schema;
    }
    var found = scanSchema(base, schema);
    for(var n in found.id){
      var sch = found.id[n];
      ctx.schemas[n] = sch;
    }
  }
  if (schema) {
    var result = this.validateSchema(instance, schema, options, ctx);
    if (!result) {
      throw new Error('Result undefined');
    }
    return result;
  }
  throw new SchemaError('no schema specified', schema);
};

/**
* @param Object schema
* @return mixed schema uri or false
*/
function shouldResolve(schema) {
  var ref = (typeof schema === 'string') ? schema : schema.$ref;
  if (typeof ref=='string') return ref;
  return false;
}

/**
 * Validates an instance against the schema (the actual work horse)
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @private
 * @return {ValidatorResult}
 */
Validator.prototype.validateSchema = function validateSchema (instance, schema, options, ctx) {
  var result = new ValidatorResult(instance, schema, options, ctx);

    // Support for the true/false schemas
  if(typeof schema==='boolean') {
    if(schema===true){
      // `true` is always valid
      schema = {};
    }else if(schema===false){
      // `false` is always invalid
      schema = {type: []};
    }
  }else if(!schema){
    // This might be a string
    throw new Error("schema is undefined");
  }

  if (schema['extends']) {
    if (schema['extends'] instanceof Array) {
      var schemaobj = {schema: schema, ctx: ctx};
      schema['extends'].forEach(this.schemaTraverser.bind(this, schemaobj));
      schema = schemaobj.schema;
      schemaobj.schema = null;
      schemaobj.ctx = null;
      schemaobj = null;
    } else {
      schema = helpers.deepMerge(schema, this.superResolve(schema['extends'], ctx));
    }
  }

  // If passed a string argument, load that schema URI
  var switchSchema;
  if (switchSchema = shouldResolve(schema)) {
    var resolved = this.resolve(schema, switchSchema, ctx);
    var subctx = new SchemaContext(resolved.subschema, options, ctx.propertyPath, resolved.switchSchema, ctx.schemas);
    return this.validateSchema(instance, resolved.subschema, options, subctx);
  }

  var skipAttributes = options && options.skipAttributes || [];
  // Validate each schema attribute against the instance
  for (var key in schema) {
    if (!attribute.ignoreProperties[key] && skipAttributes.indexOf(key) < 0) {
      var validatorErr = null;
      var validator = this.attributes[key];
      if (validator) {
        validatorErr = validator.call(this, instance, schema, options, ctx);
      } else if (options.allowUnknownAttributes === false) {
        // This represents an error with the schema itself, not an invalid instance
        throw new SchemaError("Unsupported attribute: " + key, schema);
      }
      if (validatorErr) {
        result.importErrors(validatorErr);
      }
    }
  }

  if (typeof options.rewrite == 'function') {
    var value = options.rewrite.call(this, instance, schema, options, ctx);
    result.instance = value;
  }
  return result;
};

/**
* @private
* @param Object schema
* @param SchemaContext ctx
* @returns Object schema or resolved schema
*/
Validator.prototype.schemaTraverser = function schemaTraverser (schemaobj, s) {
  schemaobj.schema = helpers.deepMerge(schemaobj.schema, this.superResolve(s, schemaobj.ctx));
}

/**
* @private
* @param Object schema
* @param SchemaContext ctx
* @returns Object schema or resolved schema
*/
Validator.prototype.superResolve = function superResolve (schema, ctx) {
  var ref;
  if(ref = shouldResolve(schema)) {
    return this.resolve(schema, ref, ctx).subschema;
  }
  return schema;
}

/**
* @private
* @param Object schema
* @param Object switchSchema
* @param SchemaContext ctx
* @return Object resolved schemas {subschema:String, switchSchema: String}
* @throws SchemaError
*/
Validator.prototype.resolve = function resolve (schema, switchSchema, ctx) {
  switchSchema = ctx.resolve(switchSchema);
  // First see if the schema exists under the provided URI
  if (ctx.schemas[switchSchema]) {
    return {subschema: ctx.schemas[switchSchema], switchSchema: switchSchema};
  }
  // Else try walking the property pointer
  var parsed = urilib.parse(switchSchema);
  var fragment = parsed && parsed.hash;
  var document = fragment && fragment.length && switchSchema.substr(0, switchSchema.length - fragment.length);
  if (!document || !ctx.schemas[document]) {
    throw new SchemaError("no such schema <" + switchSchema + ">", schema);
  }
  var subschema = helpers.objectGetPath(ctx.schemas[document], fragment.substr(1));
  if(subschema===undefined){
    throw new SchemaError("no such schema " + fragment + " located in <" + document + ">", schema);
  }
  return {subschema: subschema, switchSchema: switchSchema};
};

/**
 * Tests whether the instance if of a certain type.
 * @private
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @param type
 * @return {boolean}
 */
Validator.prototype.testType = function validateType (instance, schema, options, ctx, type) {
  if (typeof this.types[type] == 'function') {
    return this.types[type].call(this, instance);
  }
  if (type && typeof type == 'object') {
    var res = this.validateSchema(instance, type, options, ctx);
    return res === undefined || !(res && res.errors.length);
  }
  // Undefined or properties not on the list are acceptable, same as not being defined
  return true;
};

var types = Validator.prototype.types = {};
types.string = function testString (instance) {
  return typeof instance == 'string';
};
types.number = function testNumber (instance) {
  // isFinite returns false for NaN, Infinity, and -Infinity
  return typeof instance == 'number' && isFinite(instance);
};
types.integer = function testInteger (instance) {
  return (typeof instance == 'number') && instance % 1 === 0;
};
types.boolean = function testBoolean (instance) {
  return typeof instance == 'boolean';
};
types.array = function testArray (instance) {
  return Array.isArray(instance);
};
types['null'] = function testNull (instance) {
  return instance === null;
};
types.date = function testDate (instance) {
  return instance instanceof Date;
};
types.any = function testAny (instance) {
  return true;
};
types.object = function testObject (instance) {
  // TODO: fix this - see #15
  return instance && (typeof instance) === 'object' && !(instance instanceof Array) && !(instance instanceof Date);
};

module.exports = Validator;


/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var helpers = __webpack_require__(7);

/** @type ValidatorResult */
var ValidatorResult = helpers.ValidatorResult;
/** @type SchemaError */
var SchemaError = helpers.SchemaError;

var attribute = {};

attribute.ignoreProperties = {
  // informative properties
  'id': true,
  'default': true,
  'description': true,
  'title': true,
  // arguments to other properties
  'exclusiveMinimum': true,
  'exclusiveMaximum': true,
  'additionalItems': true,
  // special-handled properties
  '$schema': true,
  '$ref': true,
  'extends': true
};

/**
 * @name validators
 */
var validators = attribute.validators = {};

/**
 * Validates whether the instance if of a certain type
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {ValidatorResult|null}
 */
validators.type = function validateType (instance, schema, options, ctx) {
  // Ignore undefined instances
  if (instance === undefined) {
    return null;
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  var types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.some(this.testType.bind(this, instance, schema, options, ctx))) {
    var list = types.map(function (v) {
      return v.id && ('<' + v.id + '>') || (v+'');
    });
    result.addError({
      name: 'type',
      argument: list,
      message: "is not of a type(s) " + list,
    });
  }
  return result;
};

function testSchemaNoThrow(instance, options, ctx, callback, schema){
  var throwError = options.throwError;
  options.throwError = false;
  var res = this.validateSchema(instance, schema, options, ctx);
  options.throwError = throwError;

  if (! res.valid && callback instanceof Function) {
    callback(res);
  }
  return res.valid;
}

/**
 * Validates whether the instance matches some of the given schemas
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {ValidatorResult|null}
 */
validators.anyOf = function validateAnyOf (instance, schema, options, ctx) {
  // Ignore undefined instances
  if (instance === undefined) {
    return null;
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  var inner = new ValidatorResult(instance, schema, options, ctx);
  if (!Array.isArray(schema.anyOf)){
    throw new SchemaError("anyOf must be an array");
  }
  if (!schema.anyOf.some(
    testSchemaNoThrow.bind(
      this, instance, options, ctx, function(res){inner.importErrors(res);}
      ))) {
    var list = schema.anyOf.map(function (v, i) {
      return (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
    });
    if (options.nestedErrors) {
      result.importErrors(inner);
    }
    result.addError({
      name: 'anyOf',
      argument: list,
      message: "is not any of " + list.join(','),
    });
  }
  return result;
};

/**
 * Validates whether the instance matches every given schema
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null}
 */
validators.allOf = function validateAllOf (instance, schema, options, ctx) {
  // Ignore undefined instances
  if (instance === undefined) {
    return null;
  }
  if (!Array.isArray(schema.allOf)){
    throw new SchemaError("allOf must be an array");
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  var self = this;
  schema.allOf.forEach(function(v, i){
    var valid = self.validateSchema(instance, v, options, ctx);
    if(!valid.valid){
      var msg = (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
      result.addError({
        name: 'allOf',
        argument: { id: msg, length: valid.errors.length, valid: valid },
        message: 'does not match allOf schema ' + msg + ' with ' + valid.errors.length + ' error[s]:',
      });
      result.importErrors(valid);
    }
  });
  return result;
};

/**
 * Validates whether the instance matches exactly one of the given schemas
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null}
 */
validators.oneOf = function validateOneOf (instance, schema, options, ctx) {
  // Ignore undefined instances
  if (instance === undefined) {
    return null;
  }
  if (!Array.isArray(schema.oneOf)){
    throw new SchemaError("oneOf must be an array");
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  var inner = new ValidatorResult(instance, schema, options, ctx);
  var count = schema.oneOf.filter(
    testSchemaNoThrow.bind(
      this, instance, options, ctx, function(res) {inner.importErrors(res);}
      ) ).length;
  var list = schema.oneOf.map(function (v, i) {
    return (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
  });
  if (count!==1) {
    if (options.nestedErrors) {
      result.importErrors(inner);
    }
    result.addError({
      name: 'oneOf',
      argument: list,
      message: "is not exactly one from " + list.join(','),
    });
  }
  return result;
};

/**
 * Validates properties
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null|ValidatorResult}
 */
validators.properties = function validateProperties (instance, schema, options, ctx) {
  if(!this.types.object(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var properties = schema.properties || {};
  for (var property in properties) {
    if (typeof options.preValidateProperty == 'function') {
      options.preValidateProperty(instance, property, properties[property], options, ctx);
    }

    var prop = Object.hasOwnProperty.call(instance, property) ? instance[property] : undefined;
    var res = this.validateSchema(prop, properties[property], options, ctx.makeChild(properties[property], property));
    if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
    result.importErrors(res);
  }
  return result;
};

/**
 * Test a specific property within in instance against the additionalProperties schema attribute
 * This ignores properties with definitions in the properties schema attribute, but no other attributes.
 * If too many more types of property-existance tests pop up they may need their own class of tests (like `type` has)
 * @private
 * @return {boolean}
 */
function testAdditionalProperty (instance, schema, options, ctx, property, result) {
  if(!this.types.object(instance)) return;
  if (schema.properties && schema.properties[property] !== undefined) {
    return;
  }
  if (schema.additionalProperties === false) {
    result.addError({
      name: 'additionalProperties',
      argument: property,
      message: "additionalProperty " + JSON.stringify(property) + " exists in instance when not allowed",
    });
  } else {
    var additionalProperties = schema.additionalProperties || {};

    if (typeof options.preValidateProperty == 'function') {
      options.preValidateProperty(instance, property, additionalProperties, options, ctx);
    }

    var res = this.validateSchema(instance[property], additionalProperties, options, ctx.makeChild(additionalProperties, property));
    if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
    result.importErrors(res);
  }
}

/**
 * Validates patternProperties
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null|ValidatorResult}
 */
validators.patternProperties = function validatePatternProperties (instance, schema, options, ctx) {
  if(!this.types.object(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var patternProperties = schema.patternProperties || {};

  for (var property in instance) {
    var test = true;
    for (var pattern in patternProperties) {
      var expr = new RegExp(pattern);
      if (!expr.test(property)) {
        continue;
      }
      test = false;

      if (typeof options.preValidateProperty == 'function') {
        options.preValidateProperty(instance, property, patternProperties[pattern], options, ctx);
      }

      var res = this.validateSchema(instance[property], patternProperties[pattern], options, ctx.makeChild(patternProperties[pattern], property));
      if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
      result.importErrors(res);
    }
    if (test) {
      testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
    }
  }

  return result;
};

/**
 * Validates additionalProperties
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null|ValidatorResult}
 */
validators.additionalProperties = function validateAdditionalProperties (instance, schema, options, ctx) {
  if(!this.types.object(instance)) return;
  // if patternProperties is defined then we'll test when that one is called instead
  if (schema.patternProperties) {
    return null;
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  for (var property in instance) {
    testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
  }
  return result;
};

/**
 * Validates whether the instance value is at least of a certain length, when the instance value is a string.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.minProperties = function validateMinProperties (instance, schema, options, ctx) {
  if (!this.types.object(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var keys = Object.keys(instance);
  if (!(keys.length >= schema.minProperties)) {
    result.addError({
      name: 'minProperties',
      argument: schema.minProperties,
      message: "does not meet minimum property length of " + schema.minProperties,
    })
  }
  return result;
};

/**
 * Validates whether the instance value is at most of a certain length, when the instance value is a string.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.maxProperties = function validateMaxProperties (instance, schema, options, ctx) {
  if (!this.types.object(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var keys = Object.keys(instance);
  if (!(keys.length <= schema.maxProperties)) {
    result.addError({
      name: 'maxProperties',
      argument: schema.maxProperties,
      message: "does not meet maximum property length of " + schema.maxProperties,
    });
  }
  return result;
};

/**
 * Validates items when instance is an array
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null|ValidatorResult}
 */
validators.items = function validateItems (instance, schema, options, ctx) {
  var self = this;
  if (!this.types.array(instance)) return;
  if (!schema.items) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  instance.every(function (value, i) {
    var items = Array.isArray(schema.items) ? (schema.items[i] || schema.additionalItems) : schema.items;
    if (items === undefined) {
      return true;
    }
    if (items === false) {
      result.addError({
        name: 'items',
        message: "additionalItems not permitted",
      });
      return false;
    }
    var res = self.validateSchema(value, items, options, ctx.makeChild(items, i));
    if(res.instance !== result.instance[i]) result.instance[i] = res.instance;
    result.importErrors(res);
    return true;
  });
  return result;
};

/**
 * Validates minimum and exclusiveMinimum when the type of the instance value is a number.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.minimum = function validateMinimum (instance, schema, options, ctx) {
  if (!this.types.number(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var valid = true;
  if (schema.exclusiveMinimum && schema.exclusiveMinimum === true) {
    valid = instance > schema.minimum;
  } else {
    valid = instance >= schema.minimum;
  }
  if (!valid) {
    result.addError({
      name: 'minimum',
      argument: schema.minimum,
      message: "must have a minimum value of " + schema.minimum,
    });
  }
  return result;
};

/**
 * Validates maximum and exclusiveMaximum when the type of the instance value is a number.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.maximum = function validateMaximum (instance, schema, options, ctx) {
  if (!this.types.number(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var valid;
  if (schema.exclusiveMaximum && schema.exclusiveMaximum === true) {
    valid = instance < schema.maximum;
  } else {
    valid = instance <= schema.maximum;
  }
  if (!valid) {
    result.addError({
      name: 'maximum',
      argument: schema.maximum,
      message: "must have a maximum value of " + schema.maximum,
    });
  }
  return result;
};

/**
 * Perform validation for multipleOf and divisibleBy, which are essentially the same.
 * @param instance
 * @param schema
 * @param validationType
 * @param errorMessage
 * @returns {String|null}
 */
var validateMultipleOfOrDivisbleBy = function validateMultipleOfOrDivisbleBy (instance, schema, options, ctx, validationType, errorMessage) {
  if (!this.types.number(instance)) return;

  var validationArgument = schema[validationType];
  if (validationArgument == 0) {
    throw new SchemaError(validationType + " cannot be zero");
  }

  var result = new ValidatorResult(instance, schema, options, ctx);

  var instanceDecimals = helpers.getDecimalPlaces(instance);
  var divisorDecimals = helpers.getDecimalPlaces(validationArgument);

  var maxDecimals = Math.max(instanceDecimals , divisorDecimals);
  var multiplier = Math.pow(10, maxDecimals);

  if (Math.round(instance * multiplier) % Math.round(validationArgument * multiplier) !== 0) {
    result.addError({
      name: validationType,
      argument:  validationArgument,
      message: errorMessage + JSON.stringify(validationArgument)
    });
  }

  return result;
};

/**
 * Validates divisibleBy when the type of the instance value is a number.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.multipleOf = function validateMultipleOf (instance, schema, options, ctx) {
 return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "multipleOf", "is not a multiple of (divisible by) ");
};

/**
 * Validates multipleOf when the type of the instance value is a number.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.divisibleBy = function validateDivisibleBy (instance, schema, options, ctx) {
  return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "divisibleBy", "is not divisible by (multiple of) ");
};

/**
 * Validates whether the instance value is present.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.required = function validateRequired (instance, schema, options, ctx) {
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (instance === undefined && schema.required === true) {
    // A boolean form is implemented for reverse-compatability with schemas written against older drafts
    result.addError({
      name: 'required',
      message: "is required"
    });
  } else if (this.types.object(instance) && Array.isArray(schema.required)) {
    schema.required.forEach(function(n){
      if(instance[n]===undefined){
        result.addError({
          name: 'required',
          argument: n,
          message: "requires property " + JSON.stringify(n),
        });
      }
    });
  }
  return result;
};

/**
 * Validates whether the instance value matches the regular expression, when the instance value is a string.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.pattern = function validatePattern (instance, schema, options, ctx) {
  if (!this.types.string(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!instance.match(schema.pattern)) {
    result.addError({
      name: 'pattern',
      argument: schema.pattern,
      message: "does not match pattern " + JSON.stringify(schema.pattern),
    });
  }
  return result;
};

/**
 * Validates whether the instance value is of a certain defined format or a custom
 * format.
 * The following formats are supported for string types:
 *   - date-time
 *   - date
 *   - time
 *   - ip-address
 *   - ipv6
 *   - uri
 *   - color
 *   - host-name
 *   - alpha
 *   - alpha-numeric
 *   - utc-millisec
 * @param instance
 * @param schema
 * @param [options]
 * @param [ctx]
 * @return {String|null}
 */
validators.format = function validateFormat (instance, schema, options, ctx) {
  if (instance===undefined) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!result.disableFormat && !helpers.isFormat(instance, schema.format, this)) {
    result.addError({
      name: 'format',
      argument: schema.format,
      message: "does not conform to the " + JSON.stringify(schema.format) + " format",
    });
  }
  return result;
};

/**
 * Validates whether the instance value is at least of a certain length, when the instance value is a string.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.minLength = function validateMinLength (instance, schema, options, ctx) {
  if (!this.types.string(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var hsp = instance.match(/[\uDC00-\uDFFF]/g);
  var length = instance.length - (hsp ? hsp.length : 0);
  if (!(length >= schema.minLength)) {
    result.addError({
      name: 'minLength',
      argument: schema.minLength,
      message: "does not meet minimum length of " + schema.minLength,
    });
  }
  return result;
};

/**
 * Validates whether the instance value is at most of a certain length, when the instance value is a string.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.maxLength = function validateMaxLength (instance, schema, options, ctx) {
  if (!this.types.string(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  // TODO if this was already computed in "minLength", use that value instead of re-computing
  var hsp = instance.match(/[\uDC00-\uDFFF]/g);
  var length = instance.length - (hsp ? hsp.length : 0);
  if (!(length <= schema.maxLength)) {
    result.addError({
      name: 'maxLength',
      argument: schema.maxLength,
      message: "does not meet maximum length of " + schema.maxLength,
    });
  }
  return result;
};

/**
 * Validates whether instance contains at least a minimum number of items, when the instance is an Array.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.minItems = function validateMinItems (instance, schema, options, ctx) {
  if (!this.types.array(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!(instance.length >= schema.minItems)) {
    result.addError({
      name: 'minItems',
      argument: schema.minItems,
      message: "does not meet minimum length of " + schema.minItems,
    });
  }
  return result;
};

/**
 * Validates whether instance contains no more than a maximum number of items, when the instance is an Array.
 * @param instance
 * @param schema
 * @return {String|null}
 */
validators.maxItems = function validateMaxItems (instance, schema, options, ctx) {
  if (!this.types.array(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!(instance.length <= schema.maxItems)) {
    result.addError({
      name: 'maxItems',
      argument: schema.maxItems,
      message: "does not meet maximum length of " + schema.maxItems,
    });
  }
  return result;
};

/**
 * Validates that every item in an instance array is unique, when instance is an array
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {String|null|ValidatorResult}
 */
validators.uniqueItems = function validateUniqueItems (instance, schema, options, ctx) {
  if (!this.types.array(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  function testArrays (v, i, a) {
    for (var j = i + 1; j < a.length; j++) if (helpers.deepCompareStrict(v, a[j])) {
      return false;
    }
    return true;
  }
  if (!instance.every(testArrays)) {
    result.addError({
      name: 'uniqueItems',
      message: "contains duplicate item",
    });
  }
  return result;
};

/**
 * Deep compares arrays for duplicates
 * @param v
 * @param i
 * @param a
 * @private
 * @return {boolean}
 */
function testArrays (v, i, a) {
  var j, len = a.length;
  for (j = i + 1, len; j < len; j++) {
    if (helpers.deepCompareStrict(v, a[j])) {
      return false;
    }
  }
  return true;
}

/**
 * Validates whether there are no duplicates, when the instance is an Array.
 * @param instance
 * @return {String|null}
 */
validators.uniqueItems = function validateUniqueItems (instance, schema, options, ctx) {
  if (!this.types.array(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!instance.every(testArrays)) {
    result.addError({
      name: 'uniqueItems',
      message: "contains duplicate item",
    });
  }
  return result;
};

/**
 * Validate for the presence of dependency properties, if the instance is an object.
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {null|ValidatorResult}
 */
validators.dependencies = function validateDependencies (instance, schema, options, ctx) {
  if (!this.types.object(instance)) return;
  var result = new ValidatorResult(instance, schema, options, ctx);
  for (var property in schema.dependencies) {
    if (instance[property] === undefined) {
      continue;
    }
    var dep = schema.dependencies[property];
    var childContext = ctx.makeChild(dep, property);
    if (typeof dep == 'string') {
      dep = [dep];
    }
    if (Array.isArray(dep)) {
      dep.forEach(function (prop) {
        if (instance[prop] === undefined) {
          result.addError({
            // FIXME there's two different "dependencies" errors here with slightly different outputs
            // Can we make these the same? Or should we create different error types?
            name: 'dependencies',
            argument: childContext.propertyPath,
            message: "property " + prop + " not found, required by " + childContext.propertyPath,
          });
        }
      });
    } else {
      var res = this.validateSchema(instance, dep, options, childContext);
      if(result.instance !== res.instance) result.instance = res.instance;
      if (res && res.errors.length) {
        result.addError({
          name: 'dependencies',
          argument: childContext.propertyPath,
          message: "does not meet dependency required by " + childContext.propertyPath,
        });
        result.importErrors(res);
      }
    }
  }
  return result;
};

/**
 * Validates whether the instance value is one of the enumerated values.
 *
 * @param instance
 * @param schema
 * @return {ValidatorResult|null}
 */
validators['enum'] = function validateEnum (instance, schema, options, ctx) {
  if (instance === undefined) {
    return null;
  }
  if (!Array.isArray(schema['enum'])) {
    throw new SchemaError("enum expects an array", schema);
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!schema['enum'].some(helpers.deepCompareStrict.bind(null, instance))) {
    result.addError({
      name: 'enum',
      argument: schema['enum'],
      message: "is not one of enum values: " + schema['enum'].map(String).join(','),
    });
  }
  return result;
};

/**
 * Validates whether the instance exactly matches a given value
 *
 * @param instance
 * @param schema
 * @return {ValidatorResult|null}
 */
validators['const'] = function validateEnum (instance, schema, options, ctx) {
  if (instance === undefined) {
    return null;
  }
  var result = new ValidatorResult(instance, schema, options, ctx);
  if (!helpers.deepCompareStrict(schema['const'], instance)) {
    result.addError({
      name: 'const',
      argument: schema['const'],
      message: "does not exactly match expected constant: " + schema['const'],
    });
  }
  return result;
};

/**
 * Validates whether the instance if of a prohibited type.
 * @param instance
 * @param schema
 * @param options
 * @param ctx
 * @return {null|ValidatorResult}
 */
validators.not = validators.disallow = function validateNot (instance, schema, options, ctx) {
  var self = this;
  if(instance===undefined) return null;
  var result = new ValidatorResult(instance, schema, options, ctx);
  var notTypes = schema.not || schema.disallow;
  if(!notTypes) return null;
  if(!Array.isArray(notTypes)) notTypes=[notTypes];
  notTypes.forEach(function (type) {
    if (self.testType(instance, schema, options, ctx, type)) {
      var schemaId = type && type.id && ('<' + type.id + '>') || type;
      result.addError({
        name: 'not',
        argument: schemaId,
        message: "is of prohibited type " + schemaId,
      });
    }
  });
  return result;
};

module.exports = attribute;


/***/ }),
/* 84 */
/***/ (function(module) {

module.exports = JSON.parse("{\"$ref\":\"#/definitions/Assembly\",\"$schema\":\"http://json-schema.org/draft-07/schema#\",\"definitions\":{\"Assembly\":{\"description\":\"A JSII assembly specification.\",\"properties\":{\"author\":{\"$ref\":\"#/definitions/Person\",\"description\":\"The main author of this package.\"},\"bundled\":{\"additionalProperties\":{\"type\":\"string\"},\"default\":\"none\",\"description\":\"List if bundled dependencies (these are not expected to be jsii\\nassemblies).\",\"type\":\"object\"},\"contributors\":{\"default\":\"none\",\"description\":\"Additional contributors to this package.\",\"items\":{\"$ref\":\"#/definitions/Person\"},\"type\":\"array\"},\"dependencies\":{\"additionalProperties\":{\"$ref\":\"#/definitions/PackageVersion\"},\"default\":\"none\",\"description\":\"Direct dependencies on other assemblies (with semver), the key is the JSII\\nassembly name.\",\"type\":\"object\"},\"dependencyClosure\":{\"additionalProperties\":{\"$ref\":\"#/definitions/PackageVersion\"},\"default\":\"none\",\"description\":\"Closure of all dependency assemblies, direct and transitive.\",\"type\":\"object\"},\"description\":{\"description\":\"Description of the assembly, maps to \\\"description\\\" from package.json\\nThis is required since some package managers (like Maven) require it.\",\"type\":\"string\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"fingerprint\":{\"description\":\"A fingerprint that can be used to determine if the specification has\\nchanged.\",\"minLength\":1,\"type\":\"string\"},\"homepage\":{\"description\":\"The url to the project homepage. Maps to \\\"homepage\\\" from package.json.\",\"type\":\"string\"},\"jsiiVersion\":{\"description\":\"The version of the jsii compiler that was used to produce this Assembly.\",\"minLength\":1,\"type\":\"string\"},\"license\":{\"description\":\"The SPDX name of the license this assembly is distributed on.\",\"type\":\"string\"},\"metadata\":{\"additionalProperties\":{},\"default\":\"none\",\"description\":\"Arbitrary key-value pairs of metadata, which the maintainer chose to\\ndocument with the assembly. These entries do not carry normative\\nsemantics and their interpretation is up to the assembly maintainer.\",\"type\":\"object\"},\"name\":{\"description\":\"The name of the assembly\",\"minLength\":1,\"type\":\"string\"},\"readme\":{\"default\":\"none\",\"description\":\"The top-level readme document for this assembly (if any).\",\"properties\":{\"markdown\":{\"type\":\"string\"}},\"required\":[\"markdown\"],\"type\":\"object\"},\"repository\":{\"description\":\"The module repository, maps to \\\"repository\\\" from package.json\\nThis is required since some package managers (like Maven) require it.\",\"properties\":{\"directory\":{\"default\":\"the root of the repository\",\"description\":\"If the package is not in the root directory (for example, when part\\nof a monorepo), you should specify the directory in which it lives.\",\"type\":\"string\"},\"type\":{\"description\":\"The type of the repository (``git``, ``svn``, ...)\",\"type\":\"string\"},\"url\":{\"description\":\"The URL of the repository.\",\"type\":\"string\"}},\"required\":[\"type\",\"url\"],\"type\":\"object\"},\"schema\":{\"description\":\"The version of the spec schema\",\"enum\":[\"jsii/0.10.0\"],\"type\":\"string\"},\"targets\":{\"$ref\":\"#/definitions/AssemblyTargets\",\"default\":\"none\",\"description\":\"A map of target name to configuration, which is used when generating\\npackages for various languages.\"},\"types\":{\"additionalProperties\":{\"anyOf\":[{\"allOf\":[{\"$ref\":\"#/definitions/TypeBase\"},{\"$ref\":\"#/definitions/ClassType\"}]},{\"allOf\":[{\"$ref\":\"#/definitions/TypeBase\"},{\"$ref\":\"#/definitions/EnumType\"}]},{\"allOf\":[{\"$ref\":\"#/definitions/TypeBase\"},{\"$ref\":\"#/definitions/InterfaceType\"}]}]},\"default\":\"none\",\"description\":\"All types in the assembly, keyed by their fully-qualified-name\",\"type\":\"object\"},\"version\":{\"description\":\"The version of the assembly\",\"minLength\":1,\"type\":\"string\"}},\"required\":[\"author\",\"description\",\"fingerprint\",\"homepage\",\"jsiiVersion\",\"license\",\"name\",\"repository\",\"schema\",\"version\"],\"type\":\"object\"},\"AssemblyTargets\":{\"additionalProperties\":{\"additionalProperties\":{},\"type\":\"object\"},\"description\":\"Configurable targets for an asembly.\",\"type\":\"object\"},\"Callable\":{\"description\":\"An Initializer or a Method.\",\"properties\":{\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"overrides\":{\"default\":\"this member is not overriding anything\",\"description\":\"The FQN of the parent type (class or interface) that this entity\\noverrides or implements. If undefined, then this entity is the first in\\nit's hierarchy to declare this entity.\",\"type\":\"string\"},\"parameters\":{\"default\":\"none\",\"description\":\"The parameters of the Initializer or Method.\",\"items\":{\"$ref\":\"#/definitions/Parameter\"},\"type\":\"array\"},\"protected\":{\"default\":false,\"description\":\"Indicates if this Initializer or Method is protected (otherwise it is\\npublic, since private members are not modeled).\",\"type\":\"boolean\"},\"variadic\":{\"default\":false,\"description\":\"Indicates whether this Initializer or Method is variadic or not. When\\n``true``, the last element of ``#parameters`` will also be flagged\\n``#variadic``.\",\"type\":\"boolean\"}},\"type\":\"object\"},\"ClassType\":{\"description\":\"Represents classes.\",\"properties\":{\"abstract\":{\"default\":false,\"description\":\"Indicates if this class is an abstract class.\",\"type\":\"boolean\"},\"assembly\":{\"description\":\"The name of the assembly the type belongs to.\",\"minLength\":1,\"type\":\"string\"},\"base\":{\"default\":\"no base class\",\"description\":\"The FQN of the base class of this class, if it has one.\",\"type\":\"string\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"fqn\":{\"description\":\"The fully qualified name of the type (``<assembly>.<namespace>.<name>``)\",\"minLength\":3,\"type\":\"string\"},\"initializer\":{\"$ref\":\"#/definitions/Callable\",\"default\":\"no initializer\",\"description\":\"Initializer (constructor) method.\"},\"interfaces\":{\"default\":\"none\",\"description\":\"The FQNs of the interfaces this class implements, if any.\",\"items\":{\"type\":\"string\"},\"type\":\"array\",\"uniqueItems\":true},\"kind\":{\"description\":\"The kind of the type.\",\"enum\":[\"class\"],\"type\":\"string\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"methods\":{\"default\":\"none\",\"description\":\"List of methods.\",\"items\":{\"$ref\":\"#/definitions/Method\"},\"type\":\"array\"},\"name\":{\"description\":\"The simple name of the type (MyClass).\",\"minLength\":1,\"type\":\"string\"},\"namespace\":{\"default\":\"none\",\"description\":\"The namespace of the type (``foo.bar.baz``). When undefined, the type is located at the root of the assembly\\n(it's ``fqn`` would be like ``<assembly>.<name>``). If the `namespace` corresponds to an existing type's\\nnamespace-qualified (e.g: ``<namespace>.<name>``), then the current type is a nested type.\",\"type\":\"string\"},\"properties\":{\"default\":\"none\",\"description\":\"List of properties.\",\"items\":{\"$ref\":\"#/definitions/Property\"},\"type\":\"array\"}},\"required\":[\"assembly\",\"fqn\",\"kind\",\"name\"],\"type\":\"object\"},\"CollectionKind\":{\"description\":\"Kinds of collections.\",\"enum\":[\"array\",\"map\"],\"type\":\"string\"},\"CollectionTypeReference\":{\"description\":\"Reference to a collection type.\",\"properties\":{\"collection\":{\"properties\":{\"elementtype\":{\"anyOf\":[{\"$ref\":\"#/definitions/NamedTypeReference\"},{\"$ref\":\"#/definitions/PrimitiveTypeReference\"},{\"$ref\":\"#/definitions/CollectionTypeReference\"},{\"$ref\":\"#/definitions/UnionTypeReference\"}],\"description\":\"The type of an element (map keys are always strings).\"},\"kind\":{\"$ref\":\"#/definitions/CollectionKind\",\"description\":\"The kind of collection.\"}},\"required\":[\"elementtype\",\"kind\"],\"type\":\"object\"}},\"required\":[\"collection\"],\"type\":\"object\"},\"Docs\":{\"description\":\"Key value pairs of documentation nodes.\\nBased on TSDoc.\",\"properties\":{\"custom\":{\"additionalProperties\":{\"type\":\"string\"},\"default\":\"none\",\"description\":\"Custom tags that are not any of the default ones\",\"type\":\"object\"},\"default\":{\"default\":\"none\",\"description\":\"Description of the default\",\"type\":\"string\"},\"deprecated\":{\"default\":\"none\",\"description\":\"If present, this block indicates that an API item is no longer supported\\nand may be removed in a future release.  The `@deprecated` tag must be\\nfollowed by a sentence describing the recommended alternative.\\nDeprecation recursively applies to members of a container. For example,\\nif a class is deprecated, then so are all of its members.\",\"type\":\"string\"},\"example\":{\"default\":\"none\",\"description\":\"Example showing the usage of this API item\\n\\nStarts off in running text mode, may switch to code using fenced code\\nblocks.\",\"type\":\"string\"},\"remarks\":{\"default\":\"none\",\"description\":\"Detailed information about an API item.\\n\\nEither the explicitly tagged `@remarks` section, otherwise everything\\npast the first paragraph if there is no `@remarks` tag.\",\"type\":\"string\"},\"returns\":{\"default\":\"none\",\"description\":\"The `@returns` block for this doc comment, or undefined if there is not\\none.\",\"type\":\"string\"},\"see\":{\"default\":\"none\",\"description\":\"A `@see` link with more information\",\"type\":\"string\"},\"stability\":{\"description\":\"Whether the API item is beta/experimental quality\",\"enum\":[\"deprecated\",\"experimental\",\"external\",\"stable\"],\"type\":\"string\"},\"subclassable\":{\"default\":false,\"description\":\"Whether this class or interface was intended to be subclassed/implemented\\nby library users.\\n\\nClasses intended for subclassing, and interfaces intended to be\\nimplemented by consumers, are held to stricter standards of API\\ncompatibility.\",\"type\":\"boolean\"},\"summary\":{\"default\":\"none\",\"description\":\"Summary documentation for an API item.\\n\\nThe first part of the documentation before hitting a `@remarks` tags, or\\nthe first line of the doc comment block if there is no `@remarks` tag.\",\"type\":\"string\"}},\"type\":\"object\"},\"EnumMember\":{\"description\":\"Represents a member of an enum.\",\"properties\":{\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"name\":{\"description\":\"The name/symbol of the member.\",\"type\":\"string\"}},\"required\":[\"name\"],\"type\":\"object\"},\"EnumType\":{\"description\":\"Represents an enum type.\",\"properties\":{\"assembly\":{\"description\":\"The name of the assembly the type belongs to.\",\"minLength\":1,\"type\":\"string\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"fqn\":{\"description\":\"The fully qualified name of the type (``<assembly>.<namespace>.<name>``)\",\"minLength\":3,\"type\":\"string\"},\"kind\":{\"description\":\"The kind of the type.\",\"enum\":[\"enum\"],\"type\":\"string\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"members\":{\"description\":\"Members of the enum.\",\"items\":{\"$ref\":\"#/definitions/EnumMember\"},\"type\":\"array\"},\"name\":{\"description\":\"The simple name of the type (MyClass).\",\"minLength\":1,\"type\":\"string\"},\"namespace\":{\"default\":\"none\",\"description\":\"The namespace of the type (``foo.bar.baz``). When undefined, the type is located at the root of the assembly\\n(it's ``fqn`` would be like ``<assembly>.<name>``). If the `namespace` corresponds to an existing type's\\nnamespace-qualified (e.g: ``<namespace>.<name>``), then the current type is a nested type.\",\"type\":\"string\"}},\"required\":[\"assembly\",\"fqn\",\"kind\",\"members\",\"name\"],\"type\":\"object\"},\"InterfaceType\":{\"properties\":{\"assembly\":{\"description\":\"The name of the assembly the type belongs to.\",\"minLength\":1,\"type\":\"string\"},\"datatype\":{\"default\":false,\"description\":\"True if this interface only contains properties. Different backends might\\nhave idiomatic ways to allow defining concrete instances such interfaces.\\nFor example, in Java, the generator will produce a PoJo and a builder\\nwhich will allow users to create a concrete object with data which\\nadheres to this interface.\",\"type\":\"boolean\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"fqn\":{\"description\":\"The fully qualified name of the type (``<assembly>.<namespace>.<name>``)\",\"minLength\":3,\"type\":\"string\"},\"interfaces\":{\"default\":\"none\",\"description\":\"The FQNs of the interfaces this interface extends, if any.\",\"items\":{\"type\":\"string\"},\"type\":\"array\",\"uniqueItems\":true},\"kind\":{\"description\":\"The kind of the type.\",\"enum\":[\"interface\"],\"type\":\"string\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"methods\":{\"default\":\"none\",\"description\":\"List of methods.\",\"items\":{\"$ref\":\"#/definitions/Method\"},\"type\":\"array\"},\"name\":{\"description\":\"The simple name of the type (MyClass).\",\"minLength\":1,\"type\":\"string\"},\"namespace\":{\"default\":\"none\",\"description\":\"The namespace of the type (``foo.bar.baz``). When undefined, the type is located at the root of the assembly\\n(it's ``fqn`` would be like ``<assembly>.<name>``). If the `namespace` corresponds to an existing type's\\nnamespace-qualified (e.g: ``<namespace>.<name>``), then the current type is a nested type.\",\"type\":\"string\"},\"properties\":{\"default\":\"none\",\"description\":\"List of properties.\",\"items\":{\"$ref\":\"#/definitions/Property\"},\"type\":\"array\"}},\"required\":[\"assembly\",\"fqn\",\"kind\",\"name\"],\"type\":\"object\"},\"Method\":{\"description\":\"A method with a name (i.e: not an initializer).\",\"properties\":{\"abstract\":{\"default\":false,\"description\":\"Is this method an abstract method (this means the class will also be an abstract class)\",\"type\":\"boolean\"},\"async\":{\"default\":false,\"description\":\"Indicates if this is an asynchronous method (it will return a promise).\",\"type\":\"boolean\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"name\":{\"description\":\"The name of the method. Undefined if this method is a initializer.\",\"type\":\"string\"},\"overrides\":{\"default\":\"this member is not overriding anything\",\"description\":\"The FQN of the parent type (class or interface) that this entity\\noverrides or implements. If undefined, then this entity is the first in\\nit's hierarchy to declare this entity.\",\"type\":\"string\"},\"parameters\":{\"default\":\"none\",\"description\":\"The parameters of the Initializer or Method.\",\"items\":{\"$ref\":\"#/definitions/Parameter\"},\"type\":\"array\"},\"protected\":{\"default\":false,\"description\":\"Indicates if this Initializer or Method is protected (otherwise it is\\npublic, since private members are not modeled).\",\"type\":\"boolean\"},\"returns\":{\"$ref\":\"#/definitions/OptionalValue\",\"default\":\"void\",\"description\":\"The return type of the method (`undefined` if `void`)\"},\"static\":{\"default\":false,\"description\":\"Indicates if this is a static method.\",\"type\":\"boolean\"},\"variadic\":{\"default\":false,\"description\":\"Indicates whether this Initializer or Method is variadic or not. When\\n``true``, the last element of ``#parameters`` will also be flagged\\n``#variadic``.\",\"type\":\"boolean\"}},\"required\":[\"name\"],\"type\":\"object\"},\"NamedTypeReference\":{\"description\":\"Reference to a named type, defined by this assembly or one of its\\ndependencies.\",\"properties\":{\"fqn\":{\"description\":\"The fully-qualified-name of the type (can be located in the\\n``spec.types[fqn]``` of the assembly that defines the type).\",\"type\":\"string\"}},\"required\":[\"fqn\"],\"type\":\"object\"},\"OptionalValue\":{\"description\":\"A value that can possibly be optional.\",\"properties\":{\"optional\":{\"default\":false,\"description\":\"Determines whether the value is, indeed, optional.\",\"type\":\"boolean\"},\"type\":{\"anyOf\":[{\"$ref\":\"#/definitions/NamedTypeReference\"},{\"$ref\":\"#/definitions/PrimitiveTypeReference\"},{\"$ref\":\"#/definitions/CollectionTypeReference\"},{\"$ref\":\"#/definitions/UnionTypeReference\"}],\"description\":\"The declared type of the value, when it's present.\"}},\"required\":[\"type\"],\"type\":\"object\"},\"PackageVersion\":{\"description\":\"The version of a package.\",\"properties\":{\"targets\":{\"$ref\":\"#/definitions/AssemblyTargets\",\"default\":\"none\",\"description\":\"Targets for a given assembly.\"},\"version\":{\"description\":\"Version of the package.\",\"minLength\":1,\"type\":\"string\"}},\"required\":[\"version\"],\"type\":\"object\"},\"Parameter\":{\"description\":\"Represents a method parameter.\",\"properties\":{\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"name\":{\"description\":\"The name of the parameter.\",\"minLength\":1,\"type\":\"string\"},\"optional\":{\"default\":false,\"description\":\"Determines whether the value is, indeed, optional.\",\"type\":\"boolean\"},\"type\":{\"anyOf\":[{\"$ref\":\"#/definitions/NamedTypeReference\"},{\"$ref\":\"#/definitions/PrimitiveTypeReference\"},{\"$ref\":\"#/definitions/CollectionTypeReference\"},{\"$ref\":\"#/definitions/UnionTypeReference\"}],\"description\":\"The declared type of the value, when it's present.\"},\"variadic\":{\"default\":false,\"description\":\"Whether this is the last parameter of a variadic method. In such cases,\\nthe `#type` attribute is the type of each individual item of the variadic\\narguments list (as opposed to some array type, as for example TypeScript\\nwould model it).\",\"type\":\"boolean\"}},\"required\":[\"name\",\"type\"],\"type\":\"object\"},\"Person\":{\"description\":\"Metadata about people or organizations associated with the project that\\nresulted in the Assembly. Some of this metadata is required in order to\\npublish to certain package repositories (for example, Maven Central), but is\\nnot normalized, and the meaning of fields (role, for example), is up to each\\nproject maintainer.\",\"properties\":{\"email\":{\"default\":\"none\",\"description\":\"The email of the person\",\"type\":\"string\"},\"name\":{\"description\":\"The name of the person\",\"type\":\"string\"},\"organization\":{\"default\":false,\"description\":\"If true, this person is, in fact, an organization\",\"type\":\"boolean\"},\"roles\":{\"description\":\"A list of roles this person has in the project, for example `maintainer`,\\n`contributor`, `owner`, ...\",\"items\":{\"type\":\"string\"},\"type\":\"array\"},\"url\":{\"default\":\"none\",\"description\":\"The URL for the person\",\"type\":\"string\"}},\"required\":[\"name\",\"roles\"],\"type\":\"object\"},\"PrimitiveType\":{\"description\":\"Kinds of primitive types.\",\"enum\":[\"any\",\"boolean\",\"date\",\"json\",\"number\",\"string\"],\"type\":\"string\"},\"PrimitiveTypeReference\":{\"description\":\"Reference to a primitive type.\",\"properties\":{\"primitive\":{\"$ref\":\"#/definitions/PrimitiveType\",\"description\":\"If this is a reference to a primitive type, this will include the\\nprimitive type kind.\"}},\"required\":[\"primitive\"],\"type\":\"object\"},\"Property\":{\"description\":\"A class property.\",\"properties\":{\"abstract\":{\"default\":false,\"description\":\"Indicates if this property is abstract\",\"type\":\"boolean\"},\"const\":{\"default\":false,\"description\":\"A hint that indicates that this static, immutable property is initialized\\nduring startup. This allows emitting \\\"const\\\" idioms in different target\\nlanguages. Implies `static` and `immutable`.\",\"type\":\"boolean\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"immutable\":{\"default\":false,\"description\":\"Indicates if this property only has a getter (immutable).\",\"type\":\"boolean\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"name\":{\"description\":\"The name of the property.\",\"minLength\":1,\"type\":\"string\"},\"optional\":{\"default\":false,\"description\":\"Determines whether the value is, indeed, optional.\",\"type\":\"boolean\"},\"overrides\":{\"default\":\"this member is not overriding anything\",\"description\":\"The FQN of the parent type (class or interface) that this entity\\noverrides or implements. If undefined, then this entity is the first in\\nit's hierarchy to declare this entity.\",\"type\":\"string\"},\"protected\":{\"default\":false,\"description\":\"Indicates if this property is protected (otherwise it is public)\",\"type\":\"boolean\"},\"static\":{\"default\":false,\"description\":\"Indicates if this is a static property.\",\"type\":\"boolean\"},\"type\":{\"anyOf\":[{\"$ref\":\"#/definitions/NamedTypeReference\"},{\"$ref\":\"#/definitions/PrimitiveTypeReference\"},{\"$ref\":\"#/definitions/CollectionTypeReference\"},{\"$ref\":\"#/definitions/UnionTypeReference\"}],\"description\":\"The declared type of the value, when it's present.\"}},\"required\":[\"name\",\"type\"],\"type\":\"object\"},\"SourceLocation\":{\"description\":\"Where in the module source the definition for this API item was found\",\"properties\":{\"filename\":{\"description\":\"Relative filename\",\"type\":\"string\"},\"line\":{\"description\":\"1-based line number in the indicated file\",\"type\":\"number\"}},\"required\":[\"filename\",\"line\"],\"type\":\"object\"},\"TypeBase\":{\"description\":\"Common attributes of a type definition.\",\"properties\":{\"assembly\":{\"description\":\"The name of the assembly the type belongs to.\",\"minLength\":1,\"type\":\"string\"},\"docs\":{\"$ref\":\"#/definitions/Docs\",\"default\":\"none\",\"description\":\"Documentation for this entity.\"},\"fqn\":{\"description\":\"The fully qualified name of the type (``<assembly>.<namespace>.<name>``)\",\"minLength\":3,\"type\":\"string\"},\"kind\":{\"$ref\":\"#/definitions/TypeKind\",\"description\":\"The kind of the type.\"},\"locationInModule\":{\"$ref\":\"#/definitions/SourceLocation\",\"default\":\"none\",\"description\":\"Where in the module this definition was found\\n\\nWhy is this not `locationInAssembly`? Because the assembly is the JSII\\nfile combining compiled code and its manifest, whereas this is referring\\nto the location of the source in the module the assembly was built from.\"},\"name\":{\"description\":\"The simple name of the type (MyClass).\",\"minLength\":1,\"type\":\"string\"},\"namespace\":{\"default\":\"none\",\"description\":\"The namespace of the type (``foo.bar.baz``). When undefined, the type is located at the root of the assembly\\n(it's ``fqn`` would be like ``<assembly>.<name>``). If the `namespace` corresponds to an existing type's\\nnamespace-qualified (e.g: ``<namespace>.<name>``), then the current type is a nested type.\",\"type\":\"string\"}},\"required\":[\"assembly\",\"fqn\",\"kind\",\"name\"],\"type\":\"object\"},\"TypeKind\":{\"description\":\"Kinds of types.\",\"enum\":[\"class\",\"enum\",\"interface\"],\"type\":\"string\"},\"UnionTypeReference\":{\"description\":\"Reference to a union type.\",\"properties\":{\"union\":{\"description\":\"Indicates that this is a union type, which means it can be one of a set\\nof types.\",\"properties\":{\"types\":{\"description\":\"All the possible types (including the primary type).\",\"items\":{\"anyOf\":[{\"$ref\":\"#/definitions/NamedTypeReference\"},{\"$ref\":\"#/definitions/PrimitiveTypeReference\"},{\"$ref\":\"#/definitions/CollectionTypeReference\"},{\"$ref\":\"#/definitions/UnionTypeReference\"}]},\"minItems\":2,\"type\":\"array\"}},\"required\":[\"types\"],\"type\":\"object\"}},\"required\":[\"union\"],\"type\":\"object\"}}}");

/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// high-level commands
exports.c = exports.create = __webpack_require__(86)
exports.r = exports.replace = __webpack_require__(40)
exports.t = exports.list = __webpack_require__(27)
exports.u = exports.update = __webpack_require__(93)
exports.x = exports.extract = __webpack_require__(94)

// classes
exports.Pack = __webpack_require__(23)
exports.Unpack = __webpack_require__(41)
exports.Parse = __webpack_require__(19)
exports.ReadEntry = __webpack_require__(17)
exports.WriteEntry = __webpack_require__(38)
exports.Header = __webpack_require__(10)
exports.Pax = __webpack_require__(25)
exports.types = __webpack_require__(18)


/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// tar -c
const hlo = __webpack_require__(8)

const Pack = __webpack_require__(23)
const fs = __webpack_require__(2)
const fsm = __webpack_require__(11)
const t = __webpack_require__(27)
const path = __webpack_require__(0)

const c = module.exports = (opt_, files, cb) => {
  if (typeof files === 'function')
    cb = files

  if (Array.isArray(opt_))
    files = opt_, opt_ = {}

  if (!files || !Array.isArray(files) || !files.length)
    throw new TypeError('no files or directories specified')

  files = Array.from(files)

  const opt = hlo(opt_)

  if (opt.sync && typeof cb === 'function')
    throw new TypeError('callback not supported for sync tar functions')

  if (!opt.file && typeof cb === 'function')
    throw new TypeError('callback only supported with file option')

  return opt.file && opt.sync ? createFileSync(opt, files)
    : opt.file ? createFile(opt, files, cb)
    : opt.sync ? createSync(opt, files)
    : create(opt, files)
}

const createFileSync = (opt, files) => {
  const p = new Pack.Sync(opt)
  const stream = new fsm.WriteStreamSync(opt.file, {
    mode: opt.mode || 0o666
  })
  p.pipe(stream)
  addFilesSync(p, files)
}

const createFile = (opt, files, cb) => {
  const p = new Pack(opt)
  const stream = new fsm.WriteStream(opt.file, {
    mode: opt.mode || 0o666
  })
  p.pipe(stream)

  const promise = new Promise((res, rej) => {
    stream.on('error', rej)
    stream.on('close', res)
    p.on('error', rej)
  })

  addFilesAsync(p, files)

  return cb ? promise.then(cb, cb) : promise
}

const addFilesSync = (p, files) => {
  files.forEach(file => {
    if (file.charAt(0) === '@')
      t({
        file: path.resolve(p.cwd, file.substr(1)),
        sync: true,
        noResume: true,
        onentry: entry => p.add(entry)
      })
    else
      p.add(file)
  })
  p.end()
}

const addFilesAsync = (p, files) => {
  while (files.length) {
    const file = files.shift()
    if (file.charAt(0) === '@')
      return t({
        file: path.resolve(p.cwd, file.substr(1)),
        noResume: true,
        onentry: entry => p.add(entry)
      }).then(_ => addFilesAsync(p, files))
    else
      p.add(file)
  }
  p.end()
}

const createSync = (opt, files) => {
  const p = new Pack.Sync(opt)
  addFilesSync(p, files)
  return p
}

const create = (opt, files) => {
  const p = new Pack(opt)
  addFilesAsync(p, files)
  return p
}


/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = function (Yallist) {
  Yallist.prototype[Symbol.iterator] = function* () {
    for (let walker = this.head; walker; walker = walker.next) {
      yield walker.value
    }
  }
}


/***/ }),
/* 88 */
/***/ (function(module, exports) {

module.exports = require("string_decoder");

/***/ }),
/* 89 */
/***/ (function(module, exports) {

module.exports = require("zlib");

/***/ }),
/* 90 */
/***/ (function(module, exports) {

module.exports = Object.freeze({
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_VERSION_ERROR: -6,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  ZLIB_VERNUM: 4736,
  DEFLATE: 1,
  INFLATE: 2,
  GZIP: 3,
  GUNZIP: 4,
  DEFLATERAW: 5,
  INFLATERAW: 6,
  UNZIP: 7,
  Z_MIN_WINDOWBITS: 8,
  Z_MAX_WINDOWBITS: 15,
  Z_DEFAULT_WINDOWBITS: 15,
  Z_MIN_CHUNK: 64,
  Z_MAX_CHUNK: Infinity,
  Z_DEFAULT_CHUNK: 16384,
  Z_MIN_MEMLEVEL: 1,
  Z_MAX_MEMLEVEL: 9,
  Z_DEFAULT_MEMLEVEL: 8,
  Z_MIN_LEVEL: -1,
  Z_MAX_LEVEL: 9,
  Z_DEFAULT_LEVEL: -1
})


/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Tar can encode large and negative numbers using a leading byte of
// 0xff for negative, and 0x80 for positive.

const encode = exports.encode = (num, buf) => {
  if (!Number.isSafeInteger(num))
    // The number is so large that javascript cannot represent it with integer
    // precision.
    throw TypeError('cannot encode number outside of javascript safe integer range')
  else if (num < 0)
    encodeNegative(num, buf)
  else
    encodePositive(num, buf)
  return buf
}

const encodePositive = (num, buf) => {
  buf[0] = 0x80

  for (var i = buf.length; i > 1; i--) {
    buf[i-1] = num & 0xff
    num = Math.floor(num / 0x100)
  }
}

const encodeNegative = (num, buf) => {
  buf[0] = 0xff
  var flipped = false
  num = num * -1
  for (var i = buf.length; i > 1; i--) {
    var byte = num & 0xff
    num = Math.floor(num / 0x100)
    if (flipped)
      buf[i-1] = onesComp(byte)
    else if (byte === 0)
      buf[i-1] = 0
    else {
      flipped = true
      buf[i-1] = twosComp(byte)
    }
  }
}

const parse = exports.parse = (buf) => {
  var post = buf[buf.length - 1]
  var pre = buf[0]
  var value;
  if (pre === 0x80)
    value = pos(buf.slice(1, buf.length))
  else if (pre === 0xff)
    value = twos(buf)
  else
    throw TypeError('invalid base256 encoding')

  if (!Number.isSafeInteger(value))
    // The number is so large that javascript cannot represent it with integer
    // precision.
    throw TypeError('parsed number outside of javascript safe integer range')

  return value
}

const twos = (buf) => {
  var len = buf.length
  var sum = 0
  var flipped = false
  for (var i = len - 1; i > -1; i--) {
    var byte = buf[i]
    var f
    if (flipped)
      f = onesComp(byte)
    else if (byte === 0)
      f = byte
    else {
      flipped = true
      f = twosComp(byte)
    }
    if (f !== 0)
      sum -= f * Math.pow(256, len - i - 1)
  }
  return sum
}

const pos = (buf) => {
  var len = buf.length
  var sum = 0
  for (var i = len - 1; i > -1; i--) {
    var byte = buf[i]
    if (byte !== 0)
      sum += byte * Math.pow(256, len - i - 1)
  }
  return sum
}

const onesComp = byte => (0xff ^ byte) & 0xff

const twosComp = byte => ((0xff ^ byte) + 1) & 0xff


/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = (mode, isDir) => {
  mode &= 0o7777
  // if dirs are readable, then they should be listable
  if (isDir) {
    if (mode & 0o400)
      mode |= 0o100
    if (mode & 0o40)
      mode |= 0o10
    if (mode & 0o4)
      mode |= 0o1
  }
  return mode
}


/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// tar -u

const hlo = __webpack_require__(8)
const r = __webpack_require__(40)
// just call tar.r with the filter and mtimeCache

const u = module.exports = (opt_, files, cb) => {
  const opt = hlo(opt_)

  if (!opt.file)
    throw new TypeError('file is required')

  if (opt.gzip)
    throw new TypeError('cannot append to compressed archives')

  if (!files || !Array.isArray(files) || !files.length)
    throw new TypeError('no files or directories specified')

  files = Array.from(files)

  mtimeFilter(opt)
  return r(opt, files, cb)
}

const mtimeFilter = opt => {
  const filter = opt.filter

  if (!opt.mtimeCache)
    opt.mtimeCache = new Map()

  opt.filter = filter ? (path, stat) =>
    filter(path, stat) && !(opt.mtimeCache.get(path) > stat.mtime)
    : (path, stat) => !(opt.mtimeCache.get(path) > stat.mtime)
}


/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// tar -x
const hlo = __webpack_require__(8)
const Unpack = __webpack_require__(41)
const fs = __webpack_require__(2)
const fsm = __webpack_require__(11)
const path = __webpack_require__(0)

const x = module.exports = (opt_, files, cb) => {
  if (typeof opt_ === 'function')
    cb = opt_, files = null, opt_ = {}
  else if (Array.isArray(opt_))
    files = opt_, opt_ = {}

  if (typeof files === 'function')
    cb = files, files = null

  if (!files)
    files = []
  else
    files = Array.from(files)

  const opt = hlo(opt_)

  if (opt.sync && typeof cb === 'function')
    throw new TypeError('callback not supported for sync tar functions')

  if (!opt.file && typeof cb === 'function')
    throw new TypeError('callback only supported with file option')

  if (files.length)
    filesFilter(opt, files)

  return opt.file && opt.sync ? extractFileSync(opt)
    : opt.file ? extractFile(opt, cb)
    : opt.sync ? extractSync(opt)
    : extract(opt)
}

// construct a filter that limits the file entries listed
// include child entries if a dir is included
const filesFilter = (opt, files) => {
  const map = new Map(files.map(f => [f.replace(/\/+$/, ''), true]))
  const filter = opt.filter

  const mapHas = (file, r) => {
    const root = r || path.parse(file).root || '.'
    const ret = file === root ? false
      : map.has(file) ? map.get(file)
      : mapHas(path.dirname(file), root)

    map.set(file, ret)
    return ret
  }

  opt.filter = filter
    ? (file, entry) => filter(file, entry) && mapHas(file.replace(/\/+$/, ''))
    : file => mapHas(file.replace(/\/+$/, ''))
}

const extractFileSync = opt => {
  const u = new Unpack.Sync(opt)

  const file = opt.file
  let threw = true
  let fd
  const stat = fs.statSync(file)
  // This trades a zero-byte read() syscall for a stat
  // However, it will usually result in less memory allocation
  const readSize = opt.maxReadSize || 16*1024*1024
  const stream = new fsm.ReadStreamSync(file, {
    readSize: readSize,
    size: stat.size
  })
  stream.pipe(u)
}

const extractFile = (opt, cb) => {
  const u = new Unpack(opt)
  const readSize = opt.maxReadSize || 16*1024*1024

  const file = opt.file
  const p = new Promise((resolve, reject) => {
    u.on('error', reject)
    u.on('close', resolve)

    // This trades a zero-byte read() syscall for a stat
    // However, it will usually result in less memory allocation
    fs.stat(file, (er, stat) => {
      if (er)
        reject(er)
      else {
        const stream = new fsm.ReadStream(file, {
          readSize: readSize,
          size: stat.size
        })
        stream.on('error', reject)
        stream.pipe(u)
      }
    })
  })
  return cb ? p.then(cb, cb) : p
}

const extractSync = opt => {
  return new Unpack.Sync(opt)
}

const extract = opt => {
  return new Unpack(opt)
}


/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// wrapper around mkdirp for tar's needs.

// TODO: This should probably be a class, not functionally
// passing around state in a gazillion args.

const mkdirp = __webpack_require__(96)
const fs = __webpack_require__(2)
const path = __webpack_require__(0)
const chownr = __webpack_require__(97)

class SymlinkError extends Error {
  constructor (symlink, path) {
    super('Cannot extract through symbolic link')
    this.path = path
    this.symlink = symlink
  }

  get name () {
    return 'SylinkError'
  }
}

class CwdError extends Error {
  constructor (path, code) {
    super(code + ': Cannot cd into \'' + path + '\'')
    this.path = path
    this.code = code
  }

  get name () {
    return 'CwdError'
  }
}

const mkdir = module.exports = (dir, opt, cb) => {
  // if there's any overlap between mask and mode,
  // then we'll need an explicit chmod
  const umask = opt.umask
  const mode = opt.mode | 0o0700
  const needChmod = (mode & umask) !== 0

  const uid = opt.uid
  const gid = opt.gid
  const doChown = typeof uid === 'number' &&
    typeof gid === 'number' &&
    ( uid !== opt.processUid || gid !== opt.processGid )

  const preserve = opt.preserve
  const unlink = opt.unlink
  const cache = opt.cache
  const cwd = opt.cwd

  const done = (er, created) => {
    if (er)
      cb(er)
    else {
      cache.set(dir, true)
      if (created && doChown)
        chownr(created, uid, gid, er => done(er))
      else if (needChmod)
        fs.chmod(dir, mode, cb)
      else
        cb()
    }
  }

  if (cache && cache.get(dir) === true)
    return done()

  if (dir === cwd)
    return fs.stat(dir, (er, st) => {
      if (er || !st.isDirectory())
        er = new CwdError(dir, er && er.code || 'ENOTDIR')
      done(er)
    })

  if (preserve)
    return mkdirp(dir, mode, done)

  const sub = path.relative(cwd, dir)
  const parts = sub.split(/\/|\\/)
  mkdir_(cwd, parts, mode, cache, unlink, cwd, null, done)
}

const mkdir_ = (base, parts, mode, cache, unlink, cwd, created, cb) => {
  if (!parts.length)
    return cb(null, created)
  const p = parts.shift()
  const part = base + '/' + p
  if (cache.get(part))
    return mkdir_(part, parts, mode, cache, unlink, cwd, created, cb)
  fs.mkdir(part, mode, onmkdir(part, parts, mode, cache, unlink, cwd, created, cb))
}

const onmkdir = (part, parts, mode, cache, unlink, cwd, created, cb) => er => {
  if (er) {
    if (er.path && path.dirname(er.path) === cwd &&
        (er.code === 'ENOTDIR' || er.code === 'ENOENT'))
      return cb(new CwdError(cwd, er.code))

    fs.lstat(part, (statEr, st) => {
      if (statEr)
        cb(statEr)
      else if (st.isDirectory())
        mkdir_(part, parts, mode, cache, unlink, cwd, created, cb)
      else if (unlink)
        fs.unlink(part, er => {
          if (er)
            return cb(er)
          fs.mkdir(part, mode, onmkdir(part, parts, mode, cache, unlink, cwd, created, cb))
        })
      else if (st.isSymbolicLink())
        return cb(new SymlinkError(part, part + '/' + parts.join('/')))
      else
        cb(er)
    })
  } else {
    created = created || part
    mkdir_(part, parts, mode, cache, unlink, cwd, created, cb)
  }
}

const mkdirSync = module.exports.sync = (dir, opt) => {
  // if there's any overlap between mask and mode,
  // then we'll need an explicit chmod
  const umask = opt.umask
  const mode = opt.mode | 0o0700
  const needChmod = (mode & umask) !== 0

  const uid = opt.uid
  const gid = opt.gid
  const doChown = typeof uid === 'number' &&
    typeof gid === 'number' &&
    ( uid !== opt.processUid || gid !== opt.processGid )

  const preserve = opt.preserve
  const unlink = opt.unlink
  const cache = opt.cache
  const cwd = opt.cwd

  const done = (created) => {
    cache.set(dir, true)
    if (created && doChown)
      chownr.sync(created, uid, gid)
    if (needChmod)
      fs.chmodSync(dir, mode)
  }

  if (cache && cache.get(dir) === true)
    return done()

  if (dir === cwd) {
    let ok = false
    let code = 'ENOTDIR'
    try {
      ok = fs.statSync(dir).isDirectory()
    } catch (er) {
      code = er.code
    } finally {
      if (!ok)
        throw new CwdError(dir, code)
    }
    done()
    return
  }

  if (preserve)
    return done(mkdirp.sync(dir, mode))

  const sub = path.relative(cwd, dir)
  const parts = sub.split(/\/|\\/)
  let created = null
  for (let p = parts.shift(), part = cwd;
       p && (part += '/' + p);
       p = parts.shift()) {

    if (cache.get(part))
      continue

    try {
      fs.mkdirSync(part, mode)
      created = created || part
      cache.set(part, true)
    } catch (er) {
      if (er.path && path.dirname(er.path) === cwd &&
          (er.code === 'ENOTDIR' || er.code === 'ENOENT'))
        return new CwdError(cwd, er.code)

      const st = fs.lstatSync(part)
      if (st.isDirectory()) {
        cache.set(part, true)
        continue
      } else if (unlink) {
        fs.unlinkSync(part)
        fs.mkdirSync(part, mode)
        created = created || part
        cache.set(part, true)
        continue
      } else if (st.isSymbolicLink())
        return new SymlinkError(part, part + '/' + parts.join('/'))
    }
  }

  return done(created)
}


/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

var path = __webpack_require__(0);
var fs = __webpack_require__(2);
var _0777 = parseInt('0777', 8);

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const fs = __webpack_require__(2)
const path = __webpack_require__(0)

/* istanbul ignore next */
const LCHOWN = fs.lchown ? 'lchown' : 'chown'
/* istanbul ignore next */
const LCHOWNSYNC = fs.lchownSync ? 'lchownSync' : 'chownSync'

const needEISDIRHandled = fs.lchown &&
  !process.version.match(/v1[1-9]+\./) &&
  !process.version.match(/v10\.[6-9]/)

/* istanbul ignore next */
const handleEISDIR =
  needEISDIRHandled ? (path, uid, gid, cb) => er => {
    // Node prior to v10 had a very questionable implementation of
    // fs.lchown, which would always try to call fs.open on a directory
    // Fall back to fs.chown in those cases.
    if (!er || er.code !== 'EISDIR')
      cb(er)
    else
      fs.chown(path, uid, gid, cb)
  }
  : (_, __, ___, cb) => cb

/* istanbul ignore next */
const handleEISDirSync =
  needEISDIRHandled ? (path, uid, gid) => {
    try {
      return fs[LCHOWNSYNC](path, uid, gid)
    } catch (er) {
      if (er.code !== 'EISDIR')
        throw er
      fs.chownSync(path, uid, gid)
    }
  }
  : fs[LCHOWNSYNC]

// fs.readdir could only accept an options object as of node v6
const nodeVersion = process.version
let readdir = (path, options, cb) => fs.readdir(path, options, cb)
let readdirSync = (path, options) => fs.readdirSync(path, options)
/* istanbul ignore next */
if (/^v4\./.test(nodeVersion))
  readdir = (path, options, cb) => fs.readdir(path, cb)

const chownrKid = (p, child, uid, gid, cb) => {
  if (typeof child === 'string')
    return fs.lstat(path.resolve(p, child), (er, stats) => {
      if (er)
        return cb(er)
      stats.name = child
      chownrKid(p, stats, uid, gid, cb)
    })

  if (child.isDirectory()) {
    chownr(path.resolve(p, child.name), uid, gid, er => {
      if (er)
        return cb(er)
      const cpath = path.resolve(p, child.name)
      fs[LCHOWN](cpath, uid, gid, handleEISDIR(cpath, uid, gid, cb))
    })
  } else {
    const cpath = path.resolve(p, child.name)
    fs[LCHOWN](cpath, uid, gid, handleEISDIR(cpath, uid, gid, cb))
  }
}


const chownr = (p, uid, gid, cb) => {
  readdir(p, { withFileTypes: true }, (er, children) => {
    // any error other than ENOTDIR or ENOTSUP means it's not readable,
    // or doesn't exist.  give up.
    if (er && er.code !== 'ENOTDIR' && er.code !== 'ENOTSUP')
      return cb(er)
    if (er || !children.length)
      return fs[LCHOWN](p, uid, gid, handleEISDIR(p, uid, gid, cb))

    let len = children.length
    let errState = null
    const then = er => {
      if (errState)
        return
      if (er)
        return cb(errState = er)
      if (-- len === 0)
        return fs[LCHOWN](p, uid, gid, handleEISDIR(p, uid, gid, cb))
    }

    children.forEach(child => chownrKid(p, child, uid, gid, then))
  })
}

const chownrKidSync = (p, child, uid, gid) => {
  if (typeof child === 'string') {
    const stats = fs.lstatSync(path.resolve(p, child))
    stats.name = child
    child = stats
  }

  if (child.isDirectory())
    chownrSync(path.resolve(p, child.name), uid, gid)

  handleEISDirSync(path.resolve(p, child.name), uid, gid)
}

const chownrSync = (p, uid, gid) => {
  let children
  try {
    children = readdirSync(p, { withFileTypes: true })
  } catch (er) {
    if (er && er.code === 'ENOTDIR' && er.code !== 'ENOTSUP')
      return handleEISDirSync(p, uid, gid)
    throw er
  }

  if (children.length)
    children.forEach(child => chownrKidSync(p, child, uid, gid))

  return handleEISDirSync(p, uid, gid)
}

module.exports = chownr
chownr.sync = chownrSync


/***/ }),
/* 98 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 99 */
/***/ (function(module, exports) {

module.exports = require("vm");

/***/ }),
/* 100 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// tslint:disable:max-line-length
/**
 * Handling of types in JSII
 *
 * Types will be serialized according to the following table:
 *
 *                         ┬───────────────────────────────────────────────────────────────────────────────────────────────┐
 *                         │ JAVASCRIPT TYPE                                                                               │
 *                         ┼────────────────┬───────────┬────────────┬───────────────┬───────────────────┬─────────────────┤
 *                         │ undefined/null │   date    │ scalar (*) │     array     │ JSII-class object │ literal object  │
 * ├──────────┼────────────┼────────────────┼───────────┼────────────┼───────────────┼───────────────────┼─────────────────┤
 * │ DECLARED │ void       │ undefined      │ undefined │ undefined  │ undefined     │ undefined         │ undefined       │
 * │ TYPE     │ date       │ undefined(†)   │ { date }  │ -          │ -             │ -                 │ -               │
 * │          │ scalar (*) │ undefined(†)   │ -         │ value      │ -             │ -                 │ -               │
 * │          │ json       │ undefined      │ string    │ value      │ array/R(json) │ -                 │ byvalue/R(json) │
 * │          │ enum       │ undefined(†)   │ -         │ { enum }   │ -             │ -                 │ -               │
 * │          │ array of T │ undefined(†)   │ -         │ -          │ array/R(T)    │ -                 │ -               │
 * │          │ map of T   │ undefined(†)   │ -         │ -          │ -             │ -                 │ byvalue/R(T)    │
 * │          │ interface  │ undefined(†)   │ -         │ -          │ -             │ { ref }           │ { ref: proxy }  │
 * │          │ struct     │ undefined(†)   │ -         │ -          │ -             │ -                 │ byvalue/R(T[k]) │
 * │          │ class      │ undefined(†)   │ -         │ -          │ -             │ { ref }           │ { ref: proxy }  │
 * │          │ any        │ undefined      │ { date }  │ value      │ array/R(any)  │ { ref }           │ byvalue/R(any)  │
 * └──────────┴────────────┴────────────────┴───────────┴────────────┴───────────────┴───────────────────┴─────────────────┘
 *
 *  - (*) scalar means 'string | number | boolean'
 *  - (†) throw if not nullable
 *  - /R(t) recurse with declared type t
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:enable:max-line-length
const spec = __webpack_require__(34);
const api_1 = __webpack_require__(12);
const objects_1 = __webpack_require__(42);
/**
 * A special FQN that can be used to create empty javascript objects.
 */
exports.EMPTY_OBJECT_FQN = 'Object';
exports.SERIALIZERS = {
    // ----------------------------------------------------------------------
    ["Void" /* Void */]: {
        serialize(value, _type, host) {
            if (value != null) {
                host.debug('Expected void, got', value);
            }
            return undefined;
        },
        deserialize(value, _type, host) {
            if (value != null) {
                host.debug('Expected void, got', value);
            }
            return undefined;
        },
    },
    // ----------------------------------------------------------------------
    ["Date" /* Date */]: {
        serialize(value, optionalValue) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (!isDate(value)) {
                throw new Error(`Expected Date, got ${JSON.stringify(value)}`);
            }
            return serializeDate(value);
        },
        deserialize(value, optionalValue) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (!api_1.isWireDate(value)) {
                throw new Error(`Expected Date, got ${JSON.stringify(value)}`);
            }
            return deserializeDate(value);
        },
    },
    // ----------------------------------------------------------------------
    ["Scalar" /* Scalar */]: {
        serialize(value, optionalValue) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            const primitiveType = optionalValue.type;
            if (!isScalar(value)) {
                throw new Error(`Expected Scalar, got ${JSON.stringify(value)}`);
            }
            if (typeof value !== primitiveType.primitive) {
                throw new Error(`Expected '${primitiveType.primitive}', got ${JSON.stringify(value)} (${typeof value})`);
            }
            return value;
        },
        deserialize(value, optionalValue) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            const primitiveType = optionalValue.type;
            if (!isScalar(value)) {
                throw new Error(`Expected Scalar, got ${JSON.stringify(value)}`);
            }
            if (typeof value !== primitiveType.primitive) {
                throw new Error(`Expected '${primitiveType.primitive}', got ${JSON.stringify(value)} (${typeof value})`);
            }
            return value;
        },
    },
    // ----------------------------------------------------------------------
    ["Json" /* Json */]: {
        serialize(value) {
            // Just whatever. Dates will automatically serialize themselves to strings.
            return value;
        },
        deserialize(value, optionalValue) {
            // /!\ Top-level "null" will turn to undefined, but any null nested in the value is valid JSON, so it'll stay!
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            return value;
        },
    },
    // ----------------------------------------------------------------------
    ["Enum" /* Enum */]: {
        serialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (typeof value !== 'string' && typeof value !== 'number') {
                throw new Error(`Expected enum value, got ${JSON.stringify(value)}`);
            }
            host.debug('Serializing enum');
            const enumType = optionalValue.type;
            return { [api_1.TOKEN_ENUM]: `${enumType.fqn}/${host.findSymbol(enumType.fqn)[value]}` };
        },
        deserialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (!api_1.isWireEnum(value)) {
                throw new Error(`Expected enum value, got ${JSON.stringify(value)}`);
            }
            return deserializeEnum(value, host.findSymbol);
        },
    },
    // ----------------------------------------------------------------------
    ["Array" /* Array */]: {
        serialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (!Array.isArray(value)) {
                throw new Error(`Expected array type, got ${JSON.stringify(value)}`);
            }
            const arrayType = optionalValue.type;
            return value.map(x => host.recurse(x, { type: arrayType.collection.elementtype }));
        },
        deserialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (!Array.isArray(value)) {
                throw new Error(`Expected array type, got ${JSON.stringify(value)}`);
            }
            const arrayType = optionalValue.type;
            return value.map(x => host.recurse(x, { type: arrayType.collection.elementtype }));
        },
    },
    // ----------------------------------------------------------------------
    ["Map" /* Map */]: {
        serialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            const mapType = optionalValue.type;
            return mapValues(value, v => host.recurse(v, { type: mapType.collection.elementtype }));
        },
        deserialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            const mapType = optionalValue.type;
            return mapValues(value, v => host.recurse(v, { type: mapType.collection.elementtype }));
        },
    },
    // ----------------------------------------------------------------------
    ["Struct" /* Struct */]: {
        serialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (typeof value !== 'object' || value == null) {
                throw new Error(`Expected object, got ${JSON.stringify(value)}`);
            }
            // This looks odd, but if an object was originally passed in/out as a by-ref
            // class, and it happens to conform to a datatype interface we say we're
            // returning, return the actual object instead of the serialized value.
            // NOTE: Not entirely sure yet whether this is a bug masquerading as a
            // feature or not.
            const prevRef = objects_1.objectReference(value);
            if (prevRef) {
                return prevRef;
            }
            /*
              This is what we'd like to do, but we can't because at least the Java client
              does not understand by-value serialized interface types, so we'll have to
              serialize by-reference for now:
              https://github.com/aws/jsii/issues/400
      
            const props = propertiesOf(namedType);
      
            return mapValues(value, (v, key) => {
              if (!props[key]) { return undefined; } // Don't map if unknown property
              return host.recurse(v, props[key].type);
            });
            */
            host.debug('Returning value type as reference type for now (awslabs/jsii#400)');
            const wireFqn = selectWireType(value, optionalValue.type, host.lookupType);
            return host.objects.registerObject(value, wireFqn);
        },
        deserialize(value, optionalValue, host) {
            if (typeof value === 'object' && Object.keys(value || {}).length === 0) {
                // Treat empty structs as `undefined` (see https://github.com/aws/jsii/issues/411)
                value = undefined;
            }
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (typeof value !== 'object' || value == null) {
                throw new Error(`Expected object reference, got ${JSON.stringify(value)}`);
            }
            const namedType = host.lookupType(optionalValue.type.fqn);
            const props = propertiesOf(namedType, host.lookupType);
            if (Array.isArray(value)) {
                throw new Error(`Got an array where a ${namedType.fqn} was expected. Did you mean to pass a variable number of arguments?`);
            }
            // Similarly to serialization, we might be getting a reference type where we're
            // expecting a value type. Accept this for now (but also validate that object
            // for presence of the right properties).
            if (api_1.isObjRef(value)) {
                host.debug('Expected value type but got reference type, accepting for now (awslabs/jsii#400)');
                // Return same INSTANCE (shouldn't matter but we don't know for sure that it doesn't)
                return validateRequiredProps(host.objects.findObject(value).instance, namedType.fqn, props);
            }
            value = validateRequiredProps(value, namedType.fqn, props);
            // Return a dict COPY, we have by-value semantics anyway.
            return mapValues(value, (v, key) => {
                if (!props[key]) {
                    return undefined;
                } // Don't map if unknown property
                return host.recurse(v, props[key]);
            });
        },
    },
    // ----------------------------------------------------------------------
    ["RefType" /* ReferenceType */]: {
        serialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            if (typeof value !== 'object' || value == null) {
                throw new Error(`Expected object reference, got ${JSON.stringify(value)}`);
            }
            const prevRef = objects_1.objectReference(value);
            if (prevRef) {
                return prevRef;
            }
            const wireFqn = selectWireType(value, optionalValue.type, host.lookupType);
            return host.objects.registerObject(value, wireFqn);
        },
        deserialize(value, optionalValue, host) {
            if (nullAndOk(value, optionalValue)) {
                return undefined;
            }
            if (optionalValue === 'void') {
                throw new Error('Encountered unexpected `void` type');
            }
            // The only way to pass a by-ref object is to have created it
            // previously inside JSII kernel, so it must have an objref already.
            if (!api_1.isObjRef(value)) {
                throw new Error(`Expected object reference, got ${JSON.stringify(value)}`);
            }
            const { instance, fqn } = host.objects.findObject(value);
            const namedTypeRef = optionalValue.type;
            if (namedTypeRef.fqn !== exports.EMPTY_OBJECT_FQN) {
                const namedType = host.lookupType(namedTypeRef.fqn);
                // Check that the object we got is of the right type
                // We only do this for classes, not interfaces, since Java might pass us objects that
                // privately implement some interface and we can't prove they don't.
                // https://github.com/aws/jsii/issues/399
                const declaredType = optionalValue.type;
                if (spec.isClassType(namedType) && !isAssignable(fqn, declaredType, host.lookupType)) {
                    throw new Error(`Object of type ${fqn} is not convertible to ${declaredType.fqn}`);
                }
            }
            return instance;
        },
    },
    // ----------------------------------------------------------------------
    ["Any" /* Any */]: {
        serialize(value, _type, host) {
            if (value == null) {
                return undefined;
            }
            if (isDate(value)) {
                return serializeDate(value);
            }
            if (isScalar(value)) {
                return value;
            }
            if (Array.isArray(value)) {
                return value.map(e => host.recurse(e, { type: spec.CANONICAL_ANY }));
            }
            // Note: no case for "ENUM" here, without type declaration we can't tell the difference
            // between an enum member and a scalar.
            if (typeof value !== 'object' || value == null) {
                throw new Error(`JSII kernel assumption violated, ${JSON.stringify(value)} is not an object`);
            }
            // To make sure people aren't going to try and return Map<> or Set<> out, test for
            // those and throw a descriptive error message. We can't detect these cases any other
            // way, and the by-value serialized object will be quite useless.
            if (value instanceof Set || value instanceof Map) {
                throw new Error(`Can't return objects of type Set or Map`);
            }
            // Use a previous reference to maintain object identity. NOTE: this may cause us to return
            // a different type than requested! This is just how it is right now.
            // https://github.com/aws/jsii/issues/399
            const prevRef = objects_1.objectReference(value);
            if (prevRef) {
                return prevRef;
            }
            // If this is or should be a reference type, pass or make the reference
            // (Like regular reftype serialization, but without the type derivation to an interface)
            const jsiiType = objects_1.jsiiTypeFqn(value);
            if (jsiiType) {
                return host.objects.registerObject(value, jsiiType);
            }
            // At this point we have an object that is not of an exported type. Either an object
            // literal, or an instance of a fully private class (cannot distinguish those cases).
            // We will serialize by-value, but recurse for serialization so that if
            // the object contains reference objects, they will be serialized appropriately.
            // (Basically, serialize anything else as a map of 'any').
            return mapValues(value, (v) => host.recurse(v, { type: spec.CANONICAL_ANY }));
        },
        deserialize(value, _type, host) {
            if (value == null) {
                return undefined;
            }
            if (api_1.isWireDate(value)) {
                host.debug('ANY is a Date');
                return deserializeDate(value);
            }
            if (isScalar(value)) {
                host.debug('ANY is a Scalar');
                return value;
            }
            if (Array.isArray(value)) {
                host.debug('ANY is an Array');
                return value.map(e => host.recurse(e, { type: spec.CANONICAL_ANY }));
            }
            if (api_1.isWireEnum(value)) {
                host.debug('ANY is an Enum');
                return deserializeEnum(value, host.findSymbol);
            }
            if (api_1.isObjRef(value)) {
                host.debug('ANY is a Ref');
                return host.objects.findObject(value).instance;
            }
            // At this point again, deserialize by-value.
            host.debug('ANY is a Map');
            return mapValues(value, (v) => host.recurse(v, { type: spec.CANONICAL_ANY }));
        },
    },
};
function serializeDate(value) {
    return { [api_1.TOKEN_DATE]: value.toISOString() };
}
function deserializeDate(value) {
    return new Date(value[api_1.TOKEN_DATE]);
}
function deserializeEnum(value, lookup) {
    const enumLocator = value[api_1.TOKEN_ENUM];
    const sep = enumLocator.lastIndexOf('/');
    if (sep === -1) {
        throw new Error(`Malformed enum value: ${JSON.stringify(value)}`);
    }
    const typeName = enumLocator.substr(0, sep);
    const valueName = enumLocator.substr(sep + 1);
    const enumValue = lookup(typeName)[valueName];
    if (enumValue === undefined) {
        throw new Error(`No enum member named ${valueName} in ${typeName}`);
    }
    return enumValue;
}
/**
 * From a type reference, return the possible serialization types
 *
 * There can be multiple, because the type can be a type union.
 */
function serializationType(typeRef, lookup) {
    if (typeRef == null) {
        throw new Error(`Kernel error: expected type information, got 'undefined'`);
    }
    if (typeRef === 'void') {
        return [{ serializationClass: "Void" /* Void */, typeRef }];
    }
    if (spec.isPrimitiveTypeReference(typeRef.type)) {
        switch (typeRef.type.primitive) {
            case spec.PrimitiveType.Any: return [{ serializationClass: "Any" /* Any */, typeRef }];
            case spec.PrimitiveType.Date: return [{ serializationClass: "Date" /* Date */, typeRef }];
            case spec.PrimitiveType.Json: return [{ serializationClass: "Json" /* Json */, typeRef }];
            case spec.PrimitiveType.Boolean:
            case spec.PrimitiveType.Number:
            case spec.PrimitiveType.String:
                return [{ serializationClass: "Scalar" /* Scalar */, typeRef }];
        }
        throw new Error('Unknown primitive type');
    }
    if (spec.isCollectionTypeReference(typeRef.type)) {
        return [{
                serializationClass: typeRef.type.collection.kind === spec.CollectionKind.Array ? "Array" /* Array */ : "Map" /* Map */,
                typeRef
            }];
    }
    if (spec.isUnionTypeReference(typeRef.type)) {
        const compoundTypes = flatMap(typeRef.type.union.types, t => serializationType({ type: t }, lookup));
        // Propagate the top-level 'optional' field to each individual subtype
        for (const t of compoundTypes) {
            if (t.typeRef !== 'void') {
                t.typeRef.optional = typeRef.optional;
            }
        }
        return compoundTypes;
    }
    // The next part of the conversion is lookup-dependent
    const type = lookup(typeRef.type.fqn);
    if (spec.isEnumType(type)) {
        return [{ serializationClass: "Enum" /* Enum */, typeRef }];
    }
    if (spec.isInterfaceType(type) && type.datatype) {
        return [{ serializationClass: "Struct" /* Struct */, typeRef }];
    }
    return [{ serializationClass: "RefType" /* ReferenceType */, typeRef }];
}
exports.serializationType = serializationType;
function nullAndOk(x, type) {
    if (x != null) {
        return false;
    }
    if (type !== 'void' && !type.optional) {
        throw new Error(`Got 'undefined' for non-optional instance of ${JSON.stringify(type)}`);
    }
    return true;
}
function isDate(x) {
    return typeof x === 'object' && Object.prototype.toString.call(x) === '[object Date]';
}
function isScalar(x) {
    return typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean';
}
function flatMap(xs, fn) {
    const ret = new Array();
    for (const x of xs) {
        ret.push(...fn(x));
    }
    return ret;
}
/**
 * Map an object's values, skipping 'undefined' values'
 */
function mapValues(value, fn) {
    if (typeof value !== 'object' || value == null) {
        throw new Error(`Expected object type, got ${JSON.stringify(value)}`);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        const wireValue = fn(v, k);
        if (wireValue === undefined) {
            continue;
        }
        out[k] = wireValue;
    }
    return out;
}
function propertiesOf(t, lookup) {
    if (!spec.isClassOrInterfaceType(t)) {
        return {};
    }
    let ret = {};
    if (t.interfaces) {
        for (const iface of t.interfaces) {
            ret = { ...ret, ...propertiesOf(lookup(iface), lookup) };
        }
    }
    if (spec.isClassType(t) && t.base) {
        ret = { ...ret, ...propertiesOf(lookup(t.base), lookup) };
    }
    for (const prop of t.properties || []) {
        ret[prop.name] = prop;
    }
    return ret;
}
const WIRE_TYPE_MAP = Symbol('$__jsii_wire_type__$');
/**
 * Select the wire type for the given object and requested type
 *
 * Should return the most specific type that is in the JSII assembly and
 * assignable to the required type.
 *
 * We actually don't need to search much; because of prototypal constructor
 * linking, object.constructor.__jsii__ will have the FQN of the most specific
 * exported JSII class this object is an instance of.
 *
 * Either that's assignable to the requested type, in which case we return it,
 * or it's not, in which case there's a hidden class that implements the interface
 * and we just return the interface so the other side can instantiate an interface
 * proxy for it.
 *
 * Cache the analysis on the object to avoid having to do too many searches through
 * the type system for repeated accesses on the same object.
 */
function selectWireType(obj, expectedType, lookup) {
    const map = objects_1.hiddenMap(obj, WIRE_TYPE_MAP);
    if (!(expectedType.fqn in map)) {
        const jsiiType = objects_1.jsiiTypeFqn(obj);
        if (jsiiType) {
            const assignable = isAssignable(jsiiType, expectedType, lookup);
            // If we're not assignable and both types are class types, this cannot be satisfied.
            if (!assignable && spec.isClassType(lookup(expectedType.fqn))) {
                throw new Error(`Object of type ${jsiiType} is not convertible to ${expectedType.fqn}`);
            }
            map[expectedType.fqn] = assignable ? jsiiType : expectedType.fqn;
        }
        else {
            map[expectedType.fqn] = expectedType.fqn;
        }
    }
    return map[expectedType.fqn];
}
/**
 * Tests whether a given type (by it's FQN) can be assigned to a named type reference.
 *
 * @param actualTypeFqn the FQN of the type that is being tested.
 * @param requiredType  the required reference type.
 *
 * @returns true if ``requiredType`` is a super-type (base class or implemented interface) of the type designated by
 *          ``actualTypeFqn``.
 */
function isAssignable(actualTypeFqn, requiredType, lookup) {
    // The empty object is assignable to everything
    if (actualTypeFqn === exports.EMPTY_OBJECT_FQN) {
        return true;
    }
    if (requiredType.fqn === actualTypeFqn) {
        return true;
    }
    const actualType = lookup(actualTypeFqn);
    if (spec.isClassType(actualType)) {
        if (actualType.base && isAssignable(actualType.base, requiredType, lookup)) {
            return true;
        }
    }
    if (spec.isClassOrInterfaceType(actualType) && actualType.interfaces) {
        return actualType.interfaces.find(iface => isAssignable(iface, requiredType, lookup)) != null;
    }
    return false;
}
function validateRequiredProps(actualProps, typeName, specProps) {
    // Check for required properties
    const missingRequiredProps = Object.keys(specProps)
        .filter(name => !specProps[name].optional)
        .filter(name => !(name in actualProps));
    if (missingRequiredProps.length > 0) {
        throw new Error(`Missing required properties for ${typeName}: ${missingRequiredProps}`);
    }
    return actualProps;
}


/***/ }),
/* 101 */
/***/ (function(module, exports) {

module.exports = require("module");

/***/ }),
/* 102 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const sync_stdio_1 = __webpack_require__(103);
class InputOutput {
    constructor() {
        this.debug = false;
        this.stdio = new sync_stdio_1.SyncStdio();
    }
    write(obj) {
        const output = JSON.stringify(obj);
        this.stdio.writeLine(output);
        if (this.debug) {
            this.stdio.writeErrorLine('< ' + output);
        }
    }
    read() {
        let reqLine = this.stdio.readLine();
        if (!reqLine) {
            return undefined;
        }
        // skip recorded responses
        if (reqLine.indexOf('< ') === 0) {
            return this.read();
        }
        // stip "> " from recorded requests
        if (reqLine.indexOf('> ') === 0) {
            reqLine = reqLine.substr(2);
        }
        const input = JSON.parse(reqLine);
        if (this.debug) {
            this.stdio.writeErrorLine('> ' + JSON.stringify(input));
        }
        return input;
    }
}
exports.InputOutput = InputOutput;


/***/ }),
/* 103 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const fs = __webpack_require__(2);
const STDIN_FD = 0;
const STDOUT_FD = 1;
const STDERR_FD = 2;
const INPUT_BUFFER_SIZE = 1024 * 1024; // not related to max line length
class SyncStdio {
    constructor() {
        this.inputQueue = new Array();
        this.currentLine = '';
    }
    writeErrorLine(line) {
        this.writeBuffer(Buffer.from(`${line}\n`), STDERR_FD);
    }
    writeLine(line) {
        this.writeBuffer(Buffer.from(`${line}\n`), STDOUT_FD);
    }
    readLine() {
        if (this.inputQueue.length > 0) {
            return this.inputQueue.shift();
        }
        const buff = Buffer.alloc(INPUT_BUFFER_SIZE);
        const read = fs.readSync(STDIN_FD, buff, 0, buff.length, null);
        if (read === 0) {
            return undefined;
        }
        const str = buff.slice(0, read).toString();
        for (let i = 0; i < str.length; ++i) {
            const ch = str[i];
            if (ch === '\n') {
                this.inputQueue.push(this.currentLine);
                this.currentLine = '';
            }
            else {
                this.currentLine += ch;
            }
        }
        const next = this.inputQueue.shift();
        if (next == null) {
            return this.readLine();
        }
        return next;
    }
    writeBuffer(buffer, fd) {
        let offset = 0;
        while (offset < buffer.length) {
            try {
                offset += fs.writeSync(fd, buffer, offset);
            }
            catch (e) {
                if (e.code !== 'EAGAIN') {
                    throw e;
                }
            }
        }
    }
}
exports.SyncStdio = SyncStdio;


/***/ })
/******/ ]);
//# sourceMappingURL=jsii-runtime.js.map