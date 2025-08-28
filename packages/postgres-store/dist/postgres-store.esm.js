import { get, mapValues, omit, isEqual, uniqBy, orderBy, merge, snakeCase, partition, pick, uniq, last, pickBy, camelCase } from 'lodash-es';
import Ajv from 'ajv';
import { applyOrMap } from '@data-prism/utils';

function getDefaultExportFromCjs$1 (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var dist$1 = {exports: {}};

var formats = {};

var hasRequiredFormats;

function requireFormats () {
	if (hasRequiredFormats) return formats;
	hasRequiredFormats = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
		function fmtDef(validate, compare) {
		    return { validate, compare };
		}
		exports.fullFormats = {
		    // date: http://tools.ietf.org/html/rfc3339#section-5.6
		    date: fmtDef(date, compareDate),
		    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
		    time: fmtDef(getTime(true), compareTime),
		    "date-time": fmtDef(getDateTime(true), compareDateTime),
		    "iso-time": fmtDef(getTime(), compareIsoTime),
		    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
		    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
		    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
		    uri,
		    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
		    // uri-template: https://tools.ietf.org/html/rfc6570
		    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
		    // For the source: https://gist.github.com/dperini/729294
		    // For test cases: https://mathiasbynens.be/demo/url-regex
		    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
		    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
		    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
		    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
		    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
		    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
		    regex,
		    // uuid: http://tools.ietf.org/html/rfc4122
		    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
		    // JSON-pointer: https://tools.ietf.org/html/rfc6901
		    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
		    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
		    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
		    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
		    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
		    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
		    // byte: https://github.com/miguelmota/is-base64
		    byte,
		    // signed 32 bit integer
		    int32: { type: "number", validate: validateInt32 },
		    // signed 64 bit integer
		    int64: { type: "number", validate: validateInt64 },
		    // C-type float
		    float: { type: "number", validate: validateNumber },
		    // C-type double
		    double: { type: "number", validate: validateNumber },
		    // hint to the UI to hide input strings
		    password: true,
		    // unchecked string payload
		    binary: true,
		};
		exports.fastFormats = {
		    ...exports.fullFormats,
		    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
		    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
		    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
		    "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
		    "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
		    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
		    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
		    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
		    // email (sources from jsen validator):
		    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
		    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
		    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
		};
		exports.formatNames = Object.keys(exports.fullFormats);
		function isLeapYear(year) {
		    // https://tools.ietf.org/html/rfc3339#appendix-C
		    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		}
		const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
		const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		function date(str) {
		    // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
		    const matches = DATE.exec(str);
		    if (!matches)
		        return false;
		    const year = +matches[1];
		    const month = +matches[2];
		    const day = +matches[3];
		    return (month >= 1 &&
		        month <= 12 &&
		        day >= 1 &&
		        day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]));
		}
		function compareDate(d1, d2) {
		    if (!(d1 && d2))
		        return undefined;
		    if (d1 > d2)
		        return 1;
		    if (d1 < d2)
		        return -1;
		    return 0;
		}
		const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
		function getTime(strictTimeZone) {
		    return function time(str) {
		        const matches = TIME.exec(str);
		        if (!matches)
		            return false;
		        const hr = +matches[1];
		        const min = +matches[2];
		        const sec = +matches[3];
		        const tz = matches[4];
		        const tzSign = matches[5] === "-" ? -1 : 1;
		        const tzH = +(matches[6] || 0);
		        const tzM = +(matches[7] || 0);
		        if (tzH > 23 || tzM > 59 || (strictTimeZone && !tz))
		            return false;
		        if (hr <= 23 && min <= 59 && sec < 60)
		            return true;
		        // leap second
		        const utcMin = min - tzM * tzSign;
		        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
		        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
		    };
		}
		function compareTime(s1, s2) {
		    if (!(s1 && s2))
		        return undefined;
		    const t1 = new Date("2020-01-01T" + s1).valueOf();
		    const t2 = new Date("2020-01-01T" + s2).valueOf();
		    if (!(t1 && t2))
		        return undefined;
		    return t1 - t2;
		}
		function compareIsoTime(t1, t2) {
		    if (!(t1 && t2))
		        return undefined;
		    const a1 = TIME.exec(t1);
		    const a2 = TIME.exec(t2);
		    if (!(a1 && a2))
		        return undefined;
		    t1 = a1[1] + a1[2] + a1[3];
		    t2 = a2[1] + a2[2] + a2[3];
		    if (t1 > t2)
		        return 1;
		    if (t1 < t2)
		        return -1;
		    return 0;
		}
		const DATE_TIME_SEPARATOR = /t|\s/i;
		function getDateTime(strictTimeZone) {
		    const time = getTime(strictTimeZone);
		    return function date_time(str) {
		        // http://tools.ietf.org/html/rfc3339#section-5.6
		        const dateTime = str.split(DATE_TIME_SEPARATOR);
		        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
		    };
		}
		function compareDateTime(dt1, dt2) {
		    if (!(dt1 && dt2))
		        return undefined;
		    const d1 = new Date(dt1).valueOf();
		    const d2 = new Date(dt2).valueOf();
		    if (!(d1 && d2))
		        return undefined;
		    return d1 - d2;
		}
		function compareIsoDateTime(dt1, dt2) {
		    if (!(dt1 && dt2))
		        return undefined;
		    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
		    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
		    const res = compareDate(d1, d2);
		    if (res === undefined)
		        return undefined;
		    return res || compareTime(t1, t2);
		}
		const NOT_URI_FRAGMENT = /\/|:/;
		const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
		function uri(str) {
		    // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
		    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
		}
		const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
		function byte(str) {
		    BYTE.lastIndex = 0;
		    return BYTE.test(str);
		}
		const MIN_INT32 = -2147483648;
		const MAX_INT32 = 2 ** 31 - 1;
		function validateInt32(value) {
		    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
		}
		function validateInt64(value) {
		    // JSON and javascript max Int is 2**53, so any int that passes isInteger is valid for Int64
		    return Number.isInteger(value);
		}
		function validateNumber() {
		    return true;
		}
		const Z_ANCHOR = /[^\\]\\Z/;
		function regex(str) {
		    if (Z_ANCHOR.test(str))
		        return false;
		    try {
		        new RegExp(str);
		        return true;
		    }
		    catch (e) {
		        return false;
		    }
		}
		
	} (formats));
	return formats;
}

var limit = {};

var codegen$1 = {};

var code$2 = {};

var hasRequiredCode$2;

function requireCode$2 () {
	if (hasRequiredCode$2) return code$2;
	hasRequiredCode$2 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class
		class _CodeOrName {
		}
		exports._CodeOrName = _CodeOrName;
		exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
		class Name extends _CodeOrName {
		    constructor(s) {
		        super();
		        if (!exports.IDENTIFIER.test(s))
		            throw new Error("CodeGen: name must be a valid identifier");
		        this.str = s;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        return false;
		    }
		    get names() {
		        return { [this.str]: 1 };
		    }
		}
		exports.Name = Name;
		class _Code extends _CodeOrName {
		    constructor(code) {
		        super();
		        this._items = typeof code === "string" ? [code] : code;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        if (this._items.length > 1)
		            return false;
		        const item = this._items[0];
		        return item === "" || item === '""';
		    }
		    get str() {
		        var _a;
		        return ((_a = this._str) !== null && _a !== void 0 ? _a : (this._str = this._items.reduce((s, c) => `${s}${c}`, "")));
		    }
		    get names() {
		        var _a;
		        return ((_a = this._names) !== null && _a !== void 0 ? _a : (this._names = this._items.reduce((names, c) => {
		            if (c instanceof Name)
		                names[c.str] = (names[c.str] || 0) + 1;
		            return names;
		        }, {})));
		    }
		}
		exports._Code = _Code;
		exports.nil = new _Code("");
		function _(strs, ...args) {
		    const code = [strs[0]];
		    let i = 0;
		    while (i < args.length) {
		        addCodeArg(code, args[i]);
		        code.push(strs[++i]);
		    }
		    return new _Code(code);
		}
		exports._ = _;
		const plus = new _Code("+");
		function str(strs, ...args) {
		    const expr = [safeStringify(strs[0])];
		    let i = 0;
		    while (i < args.length) {
		        expr.push(plus);
		        addCodeArg(expr, args[i]);
		        expr.push(plus, safeStringify(strs[++i]));
		    }
		    optimize(expr);
		    return new _Code(expr);
		}
		exports.str = str;
		function addCodeArg(code, arg) {
		    if (arg instanceof _Code)
		        code.push(...arg._items);
		    else if (arg instanceof Name)
		        code.push(arg);
		    else
		        code.push(interpolate(arg));
		}
		exports.addCodeArg = addCodeArg;
		function optimize(expr) {
		    let i = 1;
		    while (i < expr.length - 1) {
		        if (expr[i] === plus) {
		            const res = mergeExprItems(expr[i - 1], expr[i + 1]);
		            if (res !== undefined) {
		                expr.splice(i - 1, 3, res);
		                continue;
		            }
		            expr[i++] = "+";
		        }
		        i++;
		    }
		}
		function mergeExprItems(a, b) {
		    if (b === '""')
		        return a;
		    if (a === '""')
		        return b;
		    if (typeof a == "string") {
		        if (b instanceof Name || a[a.length - 1] !== '"')
		            return;
		        if (typeof b != "string")
		            return `${a.slice(0, -1)}${b}"`;
		        if (b[0] === '"')
		            return a.slice(0, -1) + b.slice(1);
		        return;
		    }
		    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
		        return `"${a}${b.slice(1)}`;
		    return;
		}
		function strConcat(c1, c2) {
		    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str `${c1}${c2}`;
		}
		exports.strConcat = strConcat;
		// TODO do not allow arrays here
		function interpolate(x) {
		    return typeof x == "number" || typeof x == "boolean" || x === null
		        ? x
		        : safeStringify(Array.isArray(x) ? x.join(",") : x);
		}
		function stringify(x) {
		    return new _Code(safeStringify(x));
		}
		exports.stringify = stringify;
		function safeStringify(x) {
		    return JSON.stringify(x)
		        .replace(/\u2028/g, "\\u2028")
		        .replace(/\u2029/g, "\\u2029");
		}
		exports.safeStringify = safeStringify;
		function getProperty(key) {
		    return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _ `[${key}]`;
		}
		exports.getProperty = getProperty;
		//Does best effort to format the name properly
		function getEsmExportName(key) {
		    if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
		        return new _Code(`${key}`);
		    }
		    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
		}
		exports.getEsmExportName = getEsmExportName;
		function regexpCode(rx) {
		    return new _Code(rx.toString());
		}
		exports.regexpCode = regexpCode;
		
	} (code$2));
	return code$2;
}

var scope$1 = {};

var hasRequiredScope$1;

function requireScope$1 () {
	if (hasRequiredScope$1) return scope$1;
	hasRequiredScope$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
		const code_1 = requireCode$2();
		class ValueError extends Error {
		    constructor(name) {
		        super(`CodeGen: "code" for ${name} not defined`);
		        this.value = name.value;
		    }
		}
		var UsedValueState;
		(function (UsedValueState) {
		    UsedValueState[UsedValueState["Started"] = 0] = "Started";
		    UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
		})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
		exports.varKinds = {
		    const: new code_1.Name("const"),
		    let: new code_1.Name("let"),
		    var: new code_1.Name("var"),
		};
		class Scope {
		    constructor({ prefixes, parent } = {}) {
		        this._names = {};
		        this._prefixes = prefixes;
		        this._parent = parent;
		    }
		    toName(nameOrPrefix) {
		        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
		    }
		    name(prefix) {
		        return new code_1.Name(this._newName(prefix));
		    }
		    _newName(prefix) {
		        const ng = this._names[prefix] || this._nameGroup(prefix);
		        return `${prefix}${ng.index++}`;
		    }
		    _nameGroup(prefix) {
		        var _a, _b;
		        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || (this._prefixes && !this._prefixes.has(prefix))) {
		            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
		        }
		        return (this._names[prefix] = { prefix, index: 0 });
		    }
		}
		exports.Scope = Scope;
		class ValueScopeName extends code_1.Name {
		    constructor(prefix, nameStr) {
		        super(nameStr);
		        this.prefix = prefix;
		    }
		    setValue(value, { property, itemIndex }) {
		        this.value = value;
		        this.scopePath = (0, code_1._) `.${new code_1.Name(property)}[${itemIndex}]`;
		    }
		}
		exports.ValueScopeName = ValueScopeName;
		const line = (0, code_1._) `\n`;
		class ValueScope extends Scope {
		    constructor(opts) {
		        super(opts);
		        this._values = {};
		        this._scope = opts.scope;
		        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
		    }
		    get() {
		        return this._scope;
		    }
		    name(prefix) {
		        return new ValueScopeName(prefix, this._newName(prefix));
		    }
		    value(nameOrPrefix, value) {
		        var _a;
		        if (value.ref === undefined)
		            throw new Error("CodeGen: ref must be passed in value");
		        const name = this.toName(nameOrPrefix);
		        const { prefix } = name;
		        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
		        let vs = this._values[prefix];
		        if (vs) {
		            const _name = vs.get(valueKey);
		            if (_name)
		                return _name;
		        }
		        else {
		            vs = this._values[prefix] = new Map();
		        }
		        vs.set(valueKey, name);
		        const s = this._scope[prefix] || (this._scope[prefix] = []);
		        const itemIndex = s.length;
		        s[itemIndex] = value.ref;
		        name.setValue(value, { property: prefix, itemIndex });
		        return name;
		    }
		    getValue(prefix, keyOrRef) {
		        const vs = this._values[prefix];
		        if (!vs)
		            return;
		        return vs.get(keyOrRef);
		    }
		    scopeRefs(scopeName, values = this._values) {
		        return this._reduceValues(values, (name) => {
		            if (name.scopePath === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return (0, code_1._) `${scopeName}${name.scopePath}`;
		        });
		    }
		    scopeCode(values = this._values, usedValues, getCode) {
		        return this._reduceValues(values, (name) => {
		            if (name.value === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return name.value.code;
		        }, usedValues, getCode);
		    }
		    _reduceValues(values, valueCode, usedValues = {}, getCode) {
		        let code = code_1.nil;
		        for (const prefix in values) {
		            const vs = values[prefix];
		            if (!vs)
		                continue;
		            const nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
		            vs.forEach((name) => {
		                if (nameSet.has(name))
		                    return;
		                nameSet.set(name, UsedValueState.Started);
		                let c = valueCode(name);
		                if (c) {
		                    const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
		                    code = (0, code_1._) `${code}${def} ${name} = ${c};${this.opts._n}`;
		                }
		                else if ((c = getCode === null || getCode === void 0 ? void 0 : getCode(name))) {
		                    code = (0, code_1._) `${code}${c}${this.opts._n}`;
		                }
		                else {
		                    throw new ValueError(name);
		                }
		                nameSet.set(name, UsedValueState.Completed);
		            });
		        }
		        return code;
		    }
		}
		exports.ValueScope = ValueScope;
		
	} (scope$1));
	return scope$1;
}

var hasRequiredCodegen$1;

function requireCodegen$1 () {
	if (hasRequiredCodegen$1) return codegen$1;
	hasRequiredCodegen$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
		const code_1 = requireCode$2();
		const scope_1 = requireScope$1();
		var code_2 = requireCode$2();
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return code_2._; } });
		Object.defineProperty(exports, "str", { enumerable: true, get: function () { return code_2.str; } });
		Object.defineProperty(exports, "strConcat", { enumerable: true, get: function () { return code_2.strConcat; } });
		Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return code_2.nil; } });
		Object.defineProperty(exports, "getProperty", { enumerable: true, get: function () { return code_2.getProperty; } });
		Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return code_2.stringify; } });
		Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function () { return code_2.regexpCode; } });
		Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return code_2.Name; } });
		var scope_2 = requireScope$1();
		Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return scope_2.Scope; } });
		Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function () { return scope_2.ValueScope; } });
		Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function () { return scope_2.ValueScopeName; } });
		Object.defineProperty(exports, "varKinds", { enumerable: true, get: function () { return scope_2.varKinds; } });
		exports.operators = {
		    GT: new code_1._Code(">"),
		    GTE: new code_1._Code(">="),
		    LT: new code_1._Code("<"),
		    LTE: new code_1._Code("<="),
		    EQ: new code_1._Code("==="),
		    NEQ: new code_1._Code("!=="),
		    NOT: new code_1._Code("!"),
		    OR: new code_1._Code("||"),
		    AND: new code_1._Code("&&"),
		    ADD: new code_1._Code("+"),
		};
		class Node {
		    optimizeNodes() {
		        return this;
		    }
		    optimizeNames(_names, _constants) {
		        return this;
		    }
		}
		class Def extends Node {
		    constructor(varKind, name, rhs) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.rhs = rhs;
		    }
		    render({ es5, _n }) {
		        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
		        const rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
		        return `${varKind} ${this.name}${rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (!names[this.name.str])
		            return;
		        if (this.rhs)
		            this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
		    }
		}
		class Assign extends Node {
		    constructor(lhs, rhs, sideEffects) {
		        super();
		        this.lhs = lhs;
		        this.rhs = rhs;
		        this.sideEffects = sideEffects;
		    }
		    render({ _n }) {
		        return `${this.lhs} = ${this.rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
		            return;
		        this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
		        return addExprNames(names, this.rhs);
		    }
		}
		class AssignOp extends Assign {
		    constructor(lhs, op, rhs, sideEffects) {
		        super(lhs, rhs, sideEffects);
		        this.op = op;
		    }
		    render({ _n }) {
		        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
		    }
		}
		class Label extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        return `${this.label}:` + _n;
		    }
		}
		class Break extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        const label = this.label ? ` ${this.label}` : "";
		        return `break${label};` + _n;
		    }
		}
		class Throw extends Node {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render({ _n }) {
		        return `throw ${this.error};` + _n;
		    }
		    get names() {
		        return this.error.names;
		    }
		}
		class AnyCode extends Node {
		    constructor(code) {
		        super();
		        this.code = code;
		    }
		    render({ _n }) {
		        return `${this.code};` + _n;
		    }
		    optimizeNodes() {
		        return `${this.code}` ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        this.code = optimizeExpr(this.code, names, constants);
		        return this;
		    }
		    get names() {
		        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
		    }
		}
		class ParentNode extends Node {
		    constructor(nodes = []) {
		        super();
		        this.nodes = nodes;
		    }
		    render(opts) {
		        return this.nodes.reduce((code, n) => code + n.render(opts), "");
		    }
		    optimizeNodes() {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            const n = nodes[i].optimizeNodes();
		            if (Array.isArray(n))
		                nodes.splice(i, 1, ...n);
		            else if (n)
		                nodes[i] = n;
		            else
		                nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            // iterating backwards improves 1-pass optimization
		            const n = nodes[i];
		            if (n.optimizeNames(names, constants))
		                continue;
		            subtractNames(names, n.names);
		            nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    get names() {
		        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
		    }
		}
		class BlockNode extends ParentNode {
		    render(opts) {
		        return "{" + opts._n + super.render(opts) + "}" + opts._n;
		    }
		}
		class Root extends ParentNode {
		}
		class Else extends BlockNode {
		}
		Else.kind = "else";
		class If extends BlockNode {
		    constructor(condition, nodes) {
		        super(nodes);
		        this.condition = condition;
		    }
		    render(opts) {
		        let code = `if(${this.condition})` + super.render(opts);
		        if (this.else)
		            code += "else " + this.else.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        super.optimizeNodes();
		        const cond = this.condition;
		        if (cond === true)
		            return this.nodes; // else is ignored here
		        let e = this.else;
		        if (e) {
		            const ns = e.optimizeNodes();
		            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
		        }
		        if (e) {
		            if (cond === false)
		                return e instanceof If ? e : e.nodes;
		            if (this.nodes.length)
		                return this;
		            return new If(not(cond), e instanceof If ? [e] : e.nodes);
		        }
		        if (cond === false || !this.nodes.length)
		            return undefined;
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a;
		        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        if (!(super.optimizeNames(names, constants) || this.else))
		            return;
		        this.condition = optimizeExpr(this.condition, names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        addExprNames(names, this.condition);
		        if (this.else)
		            addNames(names, this.else.names);
		        return names;
		    }
		}
		If.kind = "if";
		class For extends BlockNode {
		}
		For.kind = "for";
		class ForLoop extends For {
		    constructor(iteration) {
		        super();
		        this.iteration = iteration;
		    }
		    render(opts) {
		        return `for(${this.iteration})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iteration = optimizeExpr(this.iteration, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iteration.names);
		    }
		}
		class ForRange extends For {
		    constructor(varKind, name, from, to) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.from = from;
		        this.to = to;
		    }
		    render(opts) {
		        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
		        const { name, from, to } = this;
		        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
		    }
		    get names() {
		        const names = addExprNames(super.names, this.from);
		        return addExprNames(names, this.to);
		    }
		}
		class ForIter extends For {
		    constructor(loop, varKind, name, iterable) {
		        super();
		        this.loop = loop;
		        this.varKind = varKind;
		        this.name = name;
		        this.iterable = iterable;
		    }
		    render(opts) {
		        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iterable = optimizeExpr(this.iterable, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iterable.names);
		    }
		}
		class Func extends BlockNode {
		    constructor(name, args, async) {
		        super();
		        this.name = name;
		        this.args = args;
		        this.async = async;
		    }
		    render(opts) {
		        const _async = this.async ? "async " : "";
		        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
		    }
		}
		Func.kind = "func";
		class Return extends ParentNode {
		    render(opts) {
		        return "return " + super.render(opts);
		    }
		}
		Return.kind = "return";
		class Try extends BlockNode {
		    render(opts) {
		        let code = "try" + super.render(opts);
		        if (this.catch)
		            code += this.catch.render(opts);
		        if (this.finally)
		            code += this.finally.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        var _a, _b;
		        super.optimizeNodes();
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a, _b;
		        super.optimizeNames(names, constants);
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        if (this.catch)
		            addNames(names, this.catch.names);
		        if (this.finally)
		            addNames(names, this.finally.names);
		        return names;
		    }
		}
		class Catch extends BlockNode {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render(opts) {
		        return `catch(${this.error})` + super.render(opts);
		    }
		}
		Catch.kind = "catch";
		class Finally extends BlockNode {
		    render(opts) {
		        return "finally" + super.render(opts);
		    }
		}
		Finally.kind = "finally";
		class CodeGen {
		    constructor(extScope, opts = {}) {
		        this._values = {};
		        this._blockStarts = [];
		        this._constants = {};
		        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
		        this._extScope = extScope;
		        this._scope = new scope_1.Scope({ parent: extScope });
		        this._nodes = [new Root()];
		    }
		    toString() {
		        return this._root.render(this.opts);
		    }
		    // returns unique name in the internal scope
		    name(prefix) {
		        return this._scope.name(prefix);
		    }
		    // reserves unique name in the external scope
		    scopeName(prefix) {
		        return this._extScope.name(prefix);
		    }
		    // reserves unique name in the external scope and assigns value to it
		    scopeValue(prefixOrName, value) {
		        const name = this._extScope.value(prefixOrName, value);
		        const vs = this._values[name.prefix] || (this._values[name.prefix] = new Set());
		        vs.add(name);
		        return name;
		    }
		    getScopeValue(prefix, keyOrRef) {
		        return this._extScope.getValue(prefix, keyOrRef);
		    }
		    // return code that assigns values in the external scope to the names that are used internally
		    // (same names that were returned by gen.scopeName or gen.scopeValue)
		    scopeRefs(scopeName) {
		        return this._extScope.scopeRefs(scopeName, this._values);
		    }
		    scopeCode() {
		        return this._extScope.scopeCode(this._values);
		    }
		    _def(varKind, nameOrPrefix, rhs, constant) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (rhs !== undefined && constant)
		            this._constants[name.str] = rhs;
		        this._leafNode(new Def(varKind, name, rhs));
		        return name;
		    }
		    // `const` declaration (`var` in es5 mode)
		    const(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
		    }
		    // `let` declaration with optional assignment (`var` in es5 mode)
		    let(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
		    }
		    // `var` declaration with optional assignment
		    var(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
		    }
		    // assignment code
		    assign(lhs, rhs, sideEffects) {
		        return this._leafNode(new Assign(lhs, rhs, sideEffects));
		    }
		    // `+=` code
		    add(lhs, rhs) {
		        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
		    }
		    // appends passed SafeExpr to code or executes Block
		    code(c) {
		        if (typeof c == "function")
		            c();
		        else if (c !== code_1.nil)
		            this._leafNode(new AnyCode(c));
		        return this;
		    }
		    // returns code for object literal for the passed argument list of key-value pairs
		    object(...keyValues) {
		        const code = ["{"];
		        for (const [key, value] of keyValues) {
		            if (code.length > 1)
		                code.push(",");
		            code.push(key);
		            if (key !== value || this.opts.es5) {
		                code.push(":");
		                (0, code_1.addCodeArg)(code, value);
		            }
		        }
		        code.push("}");
		        return new code_1._Code(code);
		    }
		    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
		    if(condition, thenBody, elseBody) {
		        this._blockNode(new If(condition));
		        if (thenBody && elseBody) {
		            this.code(thenBody).else().code(elseBody).endIf();
		        }
		        else if (thenBody) {
		            this.code(thenBody).endIf();
		        }
		        else if (elseBody) {
		            throw new Error('CodeGen: "else" body without "then" body');
		        }
		        return this;
		    }
		    // `else if` clause - invalid without `if` or after `else` clauses
		    elseIf(condition) {
		        return this._elseNode(new If(condition));
		    }
		    // `else` clause - only valid after `if` or `else if` clauses
		    else() {
		        return this._elseNode(new Else());
		    }
		    // end `if` statement (needed if gen.if was used only with condition)
		    endIf() {
		        return this._endBlockNode(If, Else);
		    }
		    _for(node, forBody) {
		        this._blockNode(node);
		        if (forBody)
		            this.code(forBody).endFor();
		        return this;
		    }
		    // a generic `for` clause (or statement if `forBody` is passed)
		    for(iteration, forBody) {
		        return this._for(new ForLoop(iteration), forBody);
		    }
		    // `for` statement for a range of values
		    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
		    }
		    // `for-of` statement (in es5 mode replace with a normal for loop)
		    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (this.opts.es5) {
		            const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
		            return this.forRange("_i", 0, (0, code_1._) `${arr}.length`, (i) => {
		                this.var(name, (0, code_1._) `${arr}[${i}]`);
		                forBody(name);
		            });
		        }
		        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
		    }
		    // `for-in` statement.
		    // With option `ownProperties` replaced with a `for-of` loop for object keys
		    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
		        if (this.opts.ownProperties) {
		            return this.forOf(nameOrPrefix, (0, code_1._) `Object.keys(${obj})`, forBody);
		        }
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
		    }
		    // end `for` loop
		    endFor() {
		        return this._endBlockNode(For);
		    }
		    // `label` statement
		    label(label) {
		        return this._leafNode(new Label(label));
		    }
		    // `break` statement
		    break(label) {
		        return this._leafNode(new Break(label));
		    }
		    // `return` statement
		    return(value) {
		        const node = new Return();
		        this._blockNode(node);
		        this.code(value);
		        if (node.nodes.length !== 1)
		            throw new Error('CodeGen: "return" should have one node');
		        return this._endBlockNode(Return);
		    }
		    // `try` statement
		    try(tryBody, catchCode, finallyCode) {
		        if (!catchCode && !finallyCode)
		            throw new Error('CodeGen: "try" without "catch" and "finally"');
		        const node = new Try();
		        this._blockNode(node);
		        this.code(tryBody);
		        if (catchCode) {
		            const error = this.name("e");
		            this._currNode = node.catch = new Catch(error);
		            catchCode(error);
		        }
		        if (finallyCode) {
		            this._currNode = node.finally = new Finally();
		            this.code(finallyCode);
		        }
		        return this._endBlockNode(Catch, Finally);
		    }
		    // `throw` statement
		    throw(error) {
		        return this._leafNode(new Throw(error));
		    }
		    // start self-balancing block
		    block(body, nodeCount) {
		        this._blockStarts.push(this._nodes.length);
		        if (body)
		            this.code(body).endBlock(nodeCount);
		        return this;
		    }
		    // end the current self-balancing block
		    endBlock(nodeCount) {
		        const len = this._blockStarts.pop();
		        if (len === undefined)
		            throw new Error("CodeGen: not in self-balancing block");
		        const toClose = this._nodes.length - len;
		        if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount)) {
		            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
		        }
		        this._nodes.length = len;
		        return this;
		    }
		    // `function` heading (or definition if funcBody is passed)
		    func(name, args = code_1.nil, async, funcBody) {
		        this._blockNode(new Func(name, args, async));
		        if (funcBody)
		            this.code(funcBody).endFunc();
		        return this;
		    }
		    // end function definition
		    endFunc() {
		        return this._endBlockNode(Func);
		    }
		    optimize(n = 1) {
		        while (n-- > 0) {
		            this._root.optimizeNodes();
		            this._root.optimizeNames(this._root.names, this._constants);
		        }
		    }
		    _leafNode(node) {
		        this._currNode.nodes.push(node);
		        return this;
		    }
		    _blockNode(node) {
		        this._currNode.nodes.push(node);
		        this._nodes.push(node);
		    }
		    _endBlockNode(N1, N2) {
		        const n = this._currNode;
		        if (n instanceof N1 || (N2 && n instanceof N2)) {
		            this._nodes.pop();
		            return this;
		        }
		        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
		    }
		    _elseNode(node) {
		        const n = this._currNode;
		        if (!(n instanceof If)) {
		            throw new Error('CodeGen: "else" without "if"');
		        }
		        this._currNode = n.else = node;
		        return this;
		    }
		    get _root() {
		        return this._nodes[0];
		    }
		    get _currNode() {
		        const ns = this._nodes;
		        return ns[ns.length - 1];
		    }
		    set _currNode(node) {
		        const ns = this._nodes;
		        ns[ns.length - 1] = node;
		    }
		}
		exports.CodeGen = CodeGen;
		function addNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) + (from[n] || 0);
		    return names;
		}
		function addExprNames(names, from) {
		    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
		}
		function optimizeExpr(expr, names, constants) {
		    if (expr instanceof code_1.Name)
		        return replaceName(expr);
		    if (!canOptimize(expr))
		        return expr;
		    return new code_1._Code(expr._items.reduce((items, c) => {
		        if (c instanceof code_1.Name)
		            c = replaceName(c);
		        if (c instanceof code_1._Code)
		            items.push(...c._items);
		        else
		            items.push(c);
		        return items;
		    }, []));
		    function replaceName(n) {
		        const c = constants[n.str];
		        if (c === undefined || names[n.str] !== 1)
		            return n;
		        delete names[n.str];
		        return c;
		    }
		    function canOptimize(e) {
		        return (e instanceof code_1._Code &&
		            e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined));
		    }
		}
		function subtractNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) - (from[n] || 0);
		}
		function not(x) {
		    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._) `!${par(x)}`;
		}
		exports.not = not;
		const andCode = mappend(exports.operators.AND);
		// boolean AND (&&) expression with the passed arguments
		function and(...args) {
		    return args.reduce(andCode);
		}
		exports.and = and;
		const orCode = mappend(exports.operators.OR);
		// boolean OR (||) expression with the passed arguments
		function or(...args) {
		    return args.reduce(orCode);
		}
		exports.or = or;
		function mappend(op) {
		    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._) `${par(x)} ${op} ${par(y)}`);
		}
		function par(x) {
		    return x instanceof code_1.Name ? x : (0, code_1._) `(${x})`;
		}
		
	} (codegen$1));
	return codegen$1;
}

var hasRequiredLimit;

function requireLimit () {
	if (hasRequiredLimit) return limit;
	hasRequiredLimit = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.formatLimitDefinition = void 0;
		const ajv_1 = Ajv;
		const codegen_1 = requireCodegen$1();
		const ops = codegen_1.operators;
		const KWDs = {
		    formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
		    formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
		    formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
		    formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE },
		};
		const error = {
		    message: ({ keyword, schemaCode }) => (0, codegen_1.str) `should be ${KWDs[keyword].okStr} ${schemaCode}`,
		    params: ({ keyword, schemaCode }) => (0, codegen_1._) `{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
		};
		exports.formatLimitDefinition = {
		    keyword: Object.keys(KWDs),
		    type: "string",
		    schemaType: "string",
		    $data: true,
		    error,
		    code(cxt) {
		        const { gen, data, schemaCode, keyword, it } = cxt;
		        const { opts, self } = it;
		        if (!opts.validateFormats)
		            return;
		        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
		        if (fCxt.$data)
		            validate$DataFormat();
		        else
		            validateFormat();
		        function validate$DataFormat() {
		            const fmts = gen.scopeValue("formats", {
		                ref: self.formats,
		                code: opts.code.formats,
		            });
		            const fmt = gen.const("fmt", (0, codegen_1._) `${fmts}[${fCxt.schemaCode}]`);
		            cxt.fail$data((0, codegen_1.or)((0, codegen_1._) `typeof ${fmt} != "object"`, (0, codegen_1._) `${fmt} instanceof RegExp`, (0, codegen_1._) `typeof ${fmt}.compare != "function"`, compareCode(fmt)));
		        }
		        function validateFormat() {
		            const format = fCxt.schema;
		            const fmtDef = self.formats[format];
		            if (!fmtDef || fmtDef === true)
		                return;
		            if (typeof fmtDef != "object" ||
		                fmtDef instanceof RegExp ||
		                typeof fmtDef.compare != "function") {
		                throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
		            }
		            const fmt = gen.scopeValue("formats", {
		                key: format,
		                ref: fmtDef,
		                code: opts.code.formats ? (0, codegen_1._) `${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : undefined,
		            });
		            cxt.fail$data(compareCode(fmt));
		        }
		        function compareCode(fmt) {
		            return (0, codegen_1._) `${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
		        }
		    },
		    dependencies: ["format"],
		};
		const formatLimitPlugin = (ajv) => {
		    ajv.addKeyword(exports.formatLimitDefinition);
		    return ajv;
		};
		exports.default = formatLimitPlugin;
		
	} (limit));
	return limit;
}

var hasRequiredDist$1;

function requireDist$1 () {
	if (hasRequiredDist$1) return dist$1.exports;
	hasRequiredDist$1 = 1;
	(function (module, exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		const formats_1 = requireFormats();
		const limit_1 = requireLimit();
		const codegen_1 = requireCodegen$1();
		const fullName = new codegen_1.Name("fullFormats");
		const fastName = new codegen_1.Name("fastFormats");
		const formatsPlugin = (ajv, opts = { keywords: true }) => {
		    if (Array.isArray(opts)) {
		        addFormats(ajv, opts, formats_1.fullFormats, fullName);
		        return ajv;
		    }
		    const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
		    const list = opts.formats || formats_1.formatNames;
		    addFormats(ajv, list, formats, exportName);
		    if (opts.keywords)
		        (0, limit_1.default)(ajv);
		    return ajv;
		};
		formatsPlugin.get = (name, mode = "full") => {
		    const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
		    const f = formats[name];
		    if (!f)
		        throw new Error(`Unknown format "${name}"`);
		    return f;
		};
		function addFormats(ajv, list, fs, exportName) {
		    var _a;
		    var _b;
		    (_a = (_b = ajv.opts.code).formats) !== null && _a !== void 0 ? _a : (_b.formats = (0, codegen_1._) `require("ajv-formats/dist/formats").${exportName}`);
		    for (const f of list)
		        ajv.addFormat(f, fs[f]);
		}
		module.exports = exports = formatsPlugin;
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.default = formatsPlugin;
		
	} (dist$1, dist$1.exports));
	return dist$1.exports;
}

var distExports$1 = requireDist$1();
var addFormats = /*@__PURE__*/getDefaultExportFromCjs$1(distExports$1);

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var dist = {exports: {}};

var codegen = {};

var code$1 = {};

var hasRequiredCode$1;

function requireCode$1 () {
	if (hasRequiredCode$1) return code$1;
	hasRequiredCode$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class
		class _CodeOrName {
		}
		exports._CodeOrName = _CodeOrName;
		exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
		class Name extends _CodeOrName {
		    constructor(s) {
		        super();
		        if (!exports.IDENTIFIER.test(s))
		            throw new Error("CodeGen: name must be a valid identifier");
		        this.str = s;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        return false;
		    }
		    get names() {
		        return { [this.str]: 1 };
		    }
		}
		exports.Name = Name;
		class _Code extends _CodeOrName {
		    constructor(code) {
		        super();
		        this._items = typeof code === "string" ? [code] : code;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        if (this._items.length > 1)
		            return false;
		        const item = this._items[0];
		        return item === "" || item === '""';
		    }
		    get str() {
		        var _a;
		        return ((_a = this._str) !== null && _a !== void 0 ? _a : (this._str = this._items.reduce((s, c) => `${s}${c}`, "")));
		    }
		    get names() {
		        var _a;
		        return ((_a = this._names) !== null && _a !== void 0 ? _a : (this._names = this._items.reduce((names, c) => {
		            if (c instanceof Name)
		                names[c.str] = (names[c.str] || 0) + 1;
		            return names;
		        }, {})));
		    }
		}
		exports._Code = _Code;
		exports.nil = new _Code("");
		function _(strs, ...args) {
		    const code = [strs[0]];
		    let i = 0;
		    while (i < args.length) {
		        addCodeArg(code, args[i]);
		        code.push(strs[++i]);
		    }
		    return new _Code(code);
		}
		exports._ = _;
		const plus = new _Code("+");
		function str(strs, ...args) {
		    const expr = [safeStringify(strs[0])];
		    let i = 0;
		    while (i < args.length) {
		        expr.push(plus);
		        addCodeArg(expr, args[i]);
		        expr.push(plus, safeStringify(strs[++i]));
		    }
		    optimize(expr);
		    return new _Code(expr);
		}
		exports.str = str;
		function addCodeArg(code, arg) {
		    if (arg instanceof _Code)
		        code.push(...arg._items);
		    else if (arg instanceof Name)
		        code.push(arg);
		    else
		        code.push(interpolate(arg));
		}
		exports.addCodeArg = addCodeArg;
		function optimize(expr) {
		    let i = 1;
		    while (i < expr.length - 1) {
		        if (expr[i] === plus) {
		            const res = mergeExprItems(expr[i - 1], expr[i + 1]);
		            if (res !== undefined) {
		                expr.splice(i - 1, 3, res);
		                continue;
		            }
		            expr[i++] = "+";
		        }
		        i++;
		    }
		}
		function mergeExprItems(a, b) {
		    if (b === '""')
		        return a;
		    if (a === '""')
		        return b;
		    if (typeof a == "string") {
		        if (b instanceof Name || a[a.length - 1] !== '"')
		            return;
		        if (typeof b != "string")
		            return `${a.slice(0, -1)}${b}"`;
		        if (b[0] === '"')
		            return a.slice(0, -1) + b.slice(1);
		        return;
		    }
		    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
		        return `"${a}${b.slice(1)}`;
		    return;
		}
		function strConcat(c1, c2) {
		    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str `${c1}${c2}`;
		}
		exports.strConcat = strConcat;
		// TODO do not allow arrays here
		function interpolate(x) {
		    return typeof x == "number" || typeof x == "boolean" || x === null
		        ? x
		        : safeStringify(Array.isArray(x) ? x.join(",") : x);
		}
		function stringify(x) {
		    return new _Code(safeStringify(x));
		}
		exports.stringify = stringify;
		function safeStringify(x) {
		    return JSON.stringify(x)
		        .replace(/\u2028/g, "\\u2028")
		        .replace(/\u2029/g, "\\u2029");
		}
		exports.safeStringify = safeStringify;
		function getProperty(key) {
		    return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _ `[${key}]`;
		}
		exports.getProperty = getProperty;
		//Does best effort to format the name properly
		function getEsmExportName(key) {
		    if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
		        return new _Code(`${key}`);
		    }
		    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
		}
		exports.getEsmExportName = getEsmExportName;
		function regexpCode(rx) {
		    return new _Code(rx.toString());
		}
		exports.regexpCode = regexpCode;
		
	} (code$1));
	return code$1;
}

var scope = {};

var hasRequiredScope;

function requireScope () {
	if (hasRequiredScope) return scope;
	hasRequiredScope = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
		const code_1 = requireCode$1();
		class ValueError extends Error {
		    constructor(name) {
		        super(`CodeGen: "code" for ${name} not defined`);
		        this.value = name.value;
		    }
		}
		var UsedValueState;
		(function (UsedValueState) {
		    UsedValueState[UsedValueState["Started"] = 0] = "Started";
		    UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
		})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
		exports.varKinds = {
		    const: new code_1.Name("const"),
		    let: new code_1.Name("let"),
		    var: new code_1.Name("var"),
		};
		class Scope {
		    constructor({ prefixes, parent } = {}) {
		        this._names = {};
		        this._prefixes = prefixes;
		        this._parent = parent;
		    }
		    toName(nameOrPrefix) {
		        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
		    }
		    name(prefix) {
		        return new code_1.Name(this._newName(prefix));
		    }
		    _newName(prefix) {
		        const ng = this._names[prefix] || this._nameGroup(prefix);
		        return `${prefix}${ng.index++}`;
		    }
		    _nameGroup(prefix) {
		        var _a, _b;
		        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || (this._prefixes && !this._prefixes.has(prefix))) {
		            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
		        }
		        return (this._names[prefix] = { prefix, index: 0 });
		    }
		}
		exports.Scope = Scope;
		class ValueScopeName extends code_1.Name {
		    constructor(prefix, nameStr) {
		        super(nameStr);
		        this.prefix = prefix;
		    }
		    setValue(value, { property, itemIndex }) {
		        this.value = value;
		        this.scopePath = (0, code_1._) `.${new code_1.Name(property)}[${itemIndex}]`;
		    }
		}
		exports.ValueScopeName = ValueScopeName;
		const line = (0, code_1._) `\n`;
		class ValueScope extends Scope {
		    constructor(opts) {
		        super(opts);
		        this._values = {};
		        this._scope = opts.scope;
		        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
		    }
		    get() {
		        return this._scope;
		    }
		    name(prefix) {
		        return new ValueScopeName(prefix, this._newName(prefix));
		    }
		    value(nameOrPrefix, value) {
		        var _a;
		        if (value.ref === undefined)
		            throw new Error("CodeGen: ref must be passed in value");
		        const name = this.toName(nameOrPrefix);
		        const { prefix } = name;
		        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
		        let vs = this._values[prefix];
		        if (vs) {
		            const _name = vs.get(valueKey);
		            if (_name)
		                return _name;
		        }
		        else {
		            vs = this._values[prefix] = new Map();
		        }
		        vs.set(valueKey, name);
		        const s = this._scope[prefix] || (this._scope[prefix] = []);
		        const itemIndex = s.length;
		        s[itemIndex] = value.ref;
		        name.setValue(value, { property: prefix, itemIndex });
		        return name;
		    }
		    getValue(prefix, keyOrRef) {
		        const vs = this._values[prefix];
		        if (!vs)
		            return;
		        return vs.get(keyOrRef);
		    }
		    scopeRefs(scopeName, values = this._values) {
		        return this._reduceValues(values, (name) => {
		            if (name.scopePath === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return (0, code_1._) `${scopeName}${name.scopePath}`;
		        });
		    }
		    scopeCode(values = this._values, usedValues, getCode) {
		        return this._reduceValues(values, (name) => {
		            if (name.value === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return name.value.code;
		        }, usedValues, getCode);
		    }
		    _reduceValues(values, valueCode, usedValues = {}, getCode) {
		        let code = code_1.nil;
		        for (const prefix in values) {
		            const vs = values[prefix];
		            if (!vs)
		                continue;
		            const nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
		            vs.forEach((name) => {
		                if (nameSet.has(name))
		                    return;
		                nameSet.set(name, UsedValueState.Started);
		                let c = valueCode(name);
		                if (c) {
		                    const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
		                    code = (0, code_1._) `${code}${def} ${name} = ${c};${this.opts._n}`;
		                }
		                else if ((c = getCode === null || getCode === void 0 ? void 0 : getCode(name))) {
		                    code = (0, code_1._) `${code}${c}${this.opts._n}`;
		                }
		                else {
		                    throw new ValueError(name);
		                }
		                nameSet.set(name, UsedValueState.Completed);
		            });
		        }
		        return code;
		    }
		}
		exports.ValueScope = ValueScope;
		
	} (scope));
	return scope;
}

var hasRequiredCodegen;

function requireCodegen () {
	if (hasRequiredCodegen) return codegen;
	hasRequiredCodegen = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
		const code_1 = requireCode$1();
		const scope_1 = requireScope();
		var code_2 = requireCode$1();
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return code_2._; } });
		Object.defineProperty(exports, "str", { enumerable: true, get: function () { return code_2.str; } });
		Object.defineProperty(exports, "strConcat", { enumerable: true, get: function () { return code_2.strConcat; } });
		Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return code_2.nil; } });
		Object.defineProperty(exports, "getProperty", { enumerable: true, get: function () { return code_2.getProperty; } });
		Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return code_2.stringify; } });
		Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function () { return code_2.regexpCode; } });
		Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return code_2.Name; } });
		var scope_2 = requireScope();
		Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return scope_2.Scope; } });
		Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function () { return scope_2.ValueScope; } });
		Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function () { return scope_2.ValueScopeName; } });
		Object.defineProperty(exports, "varKinds", { enumerable: true, get: function () { return scope_2.varKinds; } });
		exports.operators = {
		    GT: new code_1._Code(">"),
		    GTE: new code_1._Code(">="),
		    LT: new code_1._Code("<"),
		    LTE: new code_1._Code("<="),
		    EQ: new code_1._Code("==="),
		    NEQ: new code_1._Code("!=="),
		    NOT: new code_1._Code("!"),
		    OR: new code_1._Code("||"),
		    AND: new code_1._Code("&&"),
		    ADD: new code_1._Code("+"),
		};
		class Node {
		    optimizeNodes() {
		        return this;
		    }
		    optimizeNames(_names, _constants) {
		        return this;
		    }
		}
		class Def extends Node {
		    constructor(varKind, name, rhs) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.rhs = rhs;
		    }
		    render({ es5, _n }) {
		        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
		        const rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
		        return `${varKind} ${this.name}${rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (!names[this.name.str])
		            return;
		        if (this.rhs)
		            this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
		    }
		}
		class Assign extends Node {
		    constructor(lhs, rhs, sideEffects) {
		        super();
		        this.lhs = lhs;
		        this.rhs = rhs;
		        this.sideEffects = sideEffects;
		    }
		    render({ _n }) {
		        return `${this.lhs} = ${this.rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
		            return;
		        this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
		        return addExprNames(names, this.rhs);
		    }
		}
		class AssignOp extends Assign {
		    constructor(lhs, op, rhs, sideEffects) {
		        super(lhs, rhs, sideEffects);
		        this.op = op;
		    }
		    render({ _n }) {
		        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
		    }
		}
		class Label extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        return `${this.label}:` + _n;
		    }
		}
		class Break extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        const label = this.label ? ` ${this.label}` : "";
		        return `break${label};` + _n;
		    }
		}
		class Throw extends Node {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render({ _n }) {
		        return `throw ${this.error};` + _n;
		    }
		    get names() {
		        return this.error.names;
		    }
		}
		class AnyCode extends Node {
		    constructor(code) {
		        super();
		        this.code = code;
		    }
		    render({ _n }) {
		        return `${this.code};` + _n;
		    }
		    optimizeNodes() {
		        return `${this.code}` ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        this.code = optimizeExpr(this.code, names, constants);
		        return this;
		    }
		    get names() {
		        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
		    }
		}
		class ParentNode extends Node {
		    constructor(nodes = []) {
		        super();
		        this.nodes = nodes;
		    }
		    render(opts) {
		        return this.nodes.reduce((code, n) => code + n.render(opts), "");
		    }
		    optimizeNodes() {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            const n = nodes[i].optimizeNodes();
		            if (Array.isArray(n))
		                nodes.splice(i, 1, ...n);
		            else if (n)
		                nodes[i] = n;
		            else
		                nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            // iterating backwards improves 1-pass optimization
		            const n = nodes[i];
		            if (n.optimizeNames(names, constants))
		                continue;
		            subtractNames(names, n.names);
		            nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    get names() {
		        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
		    }
		}
		class BlockNode extends ParentNode {
		    render(opts) {
		        return "{" + opts._n + super.render(opts) + "}" + opts._n;
		    }
		}
		class Root extends ParentNode {
		}
		class Else extends BlockNode {
		}
		Else.kind = "else";
		class If extends BlockNode {
		    constructor(condition, nodes) {
		        super(nodes);
		        this.condition = condition;
		    }
		    render(opts) {
		        let code = `if(${this.condition})` + super.render(opts);
		        if (this.else)
		            code += "else " + this.else.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        super.optimizeNodes();
		        const cond = this.condition;
		        if (cond === true)
		            return this.nodes; // else is ignored here
		        let e = this.else;
		        if (e) {
		            const ns = e.optimizeNodes();
		            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
		        }
		        if (e) {
		            if (cond === false)
		                return e instanceof If ? e : e.nodes;
		            if (this.nodes.length)
		                return this;
		            return new If(not(cond), e instanceof If ? [e] : e.nodes);
		        }
		        if (cond === false || !this.nodes.length)
		            return undefined;
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a;
		        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        if (!(super.optimizeNames(names, constants) || this.else))
		            return;
		        this.condition = optimizeExpr(this.condition, names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        addExprNames(names, this.condition);
		        if (this.else)
		            addNames(names, this.else.names);
		        return names;
		    }
		}
		If.kind = "if";
		class For extends BlockNode {
		}
		For.kind = "for";
		class ForLoop extends For {
		    constructor(iteration) {
		        super();
		        this.iteration = iteration;
		    }
		    render(opts) {
		        return `for(${this.iteration})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iteration = optimizeExpr(this.iteration, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iteration.names);
		    }
		}
		class ForRange extends For {
		    constructor(varKind, name, from, to) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.from = from;
		        this.to = to;
		    }
		    render(opts) {
		        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
		        const { name, from, to } = this;
		        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
		    }
		    get names() {
		        const names = addExprNames(super.names, this.from);
		        return addExprNames(names, this.to);
		    }
		}
		class ForIter extends For {
		    constructor(loop, varKind, name, iterable) {
		        super();
		        this.loop = loop;
		        this.varKind = varKind;
		        this.name = name;
		        this.iterable = iterable;
		    }
		    render(opts) {
		        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iterable = optimizeExpr(this.iterable, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iterable.names);
		    }
		}
		class Func extends BlockNode {
		    constructor(name, args, async) {
		        super();
		        this.name = name;
		        this.args = args;
		        this.async = async;
		    }
		    render(opts) {
		        const _async = this.async ? "async " : "";
		        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
		    }
		}
		Func.kind = "func";
		class Return extends ParentNode {
		    render(opts) {
		        return "return " + super.render(opts);
		    }
		}
		Return.kind = "return";
		class Try extends BlockNode {
		    render(opts) {
		        let code = "try" + super.render(opts);
		        if (this.catch)
		            code += this.catch.render(opts);
		        if (this.finally)
		            code += this.finally.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        var _a, _b;
		        super.optimizeNodes();
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a, _b;
		        super.optimizeNames(names, constants);
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        if (this.catch)
		            addNames(names, this.catch.names);
		        if (this.finally)
		            addNames(names, this.finally.names);
		        return names;
		    }
		}
		class Catch extends BlockNode {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render(opts) {
		        return `catch(${this.error})` + super.render(opts);
		    }
		}
		Catch.kind = "catch";
		class Finally extends BlockNode {
		    render(opts) {
		        return "finally" + super.render(opts);
		    }
		}
		Finally.kind = "finally";
		class CodeGen {
		    constructor(extScope, opts = {}) {
		        this._values = {};
		        this._blockStarts = [];
		        this._constants = {};
		        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
		        this._extScope = extScope;
		        this._scope = new scope_1.Scope({ parent: extScope });
		        this._nodes = [new Root()];
		    }
		    toString() {
		        return this._root.render(this.opts);
		    }
		    // returns unique name in the internal scope
		    name(prefix) {
		        return this._scope.name(prefix);
		    }
		    // reserves unique name in the external scope
		    scopeName(prefix) {
		        return this._extScope.name(prefix);
		    }
		    // reserves unique name in the external scope and assigns value to it
		    scopeValue(prefixOrName, value) {
		        const name = this._extScope.value(prefixOrName, value);
		        const vs = this._values[name.prefix] || (this._values[name.prefix] = new Set());
		        vs.add(name);
		        return name;
		    }
		    getScopeValue(prefix, keyOrRef) {
		        return this._extScope.getValue(prefix, keyOrRef);
		    }
		    // return code that assigns values in the external scope to the names that are used internally
		    // (same names that were returned by gen.scopeName or gen.scopeValue)
		    scopeRefs(scopeName) {
		        return this._extScope.scopeRefs(scopeName, this._values);
		    }
		    scopeCode() {
		        return this._extScope.scopeCode(this._values);
		    }
		    _def(varKind, nameOrPrefix, rhs, constant) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (rhs !== undefined && constant)
		            this._constants[name.str] = rhs;
		        this._leafNode(new Def(varKind, name, rhs));
		        return name;
		    }
		    // `const` declaration (`var` in es5 mode)
		    const(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
		    }
		    // `let` declaration with optional assignment (`var` in es5 mode)
		    let(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
		    }
		    // `var` declaration with optional assignment
		    var(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
		    }
		    // assignment code
		    assign(lhs, rhs, sideEffects) {
		        return this._leafNode(new Assign(lhs, rhs, sideEffects));
		    }
		    // `+=` code
		    add(lhs, rhs) {
		        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
		    }
		    // appends passed SafeExpr to code or executes Block
		    code(c) {
		        if (typeof c == "function")
		            c();
		        else if (c !== code_1.nil)
		            this._leafNode(new AnyCode(c));
		        return this;
		    }
		    // returns code for object literal for the passed argument list of key-value pairs
		    object(...keyValues) {
		        const code = ["{"];
		        for (const [key, value] of keyValues) {
		            if (code.length > 1)
		                code.push(",");
		            code.push(key);
		            if (key !== value || this.opts.es5) {
		                code.push(":");
		                (0, code_1.addCodeArg)(code, value);
		            }
		        }
		        code.push("}");
		        return new code_1._Code(code);
		    }
		    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
		    if(condition, thenBody, elseBody) {
		        this._blockNode(new If(condition));
		        if (thenBody && elseBody) {
		            this.code(thenBody).else().code(elseBody).endIf();
		        }
		        else if (thenBody) {
		            this.code(thenBody).endIf();
		        }
		        else if (elseBody) {
		            throw new Error('CodeGen: "else" body without "then" body');
		        }
		        return this;
		    }
		    // `else if` clause - invalid without `if` or after `else` clauses
		    elseIf(condition) {
		        return this._elseNode(new If(condition));
		    }
		    // `else` clause - only valid after `if` or `else if` clauses
		    else() {
		        return this._elseNode(new Else());
		    }
		    // end `if` statement (needed if gen.if was used only with condition)
		    endIf() {
		        return this._endBlockNode(If, Else);
		    }
		    _for(node, forBody) {
		        this._blockNode(node);
		        if (forBody)
		            this.code(forBody).endFor();
		        return this;
		    }
		    // a generic `for` clause (or statement if `forBody` is passed)
		    for(iteration, forBody) {
		        return this._for(new ForLoop(iteration), forBody);
		    }
		    // `for` statement for a range of values
		    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
		    }
		    // `for-of` statement (in es5 mode replace with a normal for loop)
		    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (this.opts.es5) {
		            const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
		            return this.forRange("_i", 0, (0, code_1._) `${arr}.length`, (i) => {
		                this.var(name, (0, code_1._) `${arr}[${i}]`);
		                forBody(name);
		            });
		        }
		        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
		    }
		    // `for-in` statement.
		    // With option `ownProperties` replaced with a `for-of` loop for object keys
		    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
		        if (this.opts.ownProperties) {
		            return this.forOf(nameOrPrefix, (0, code_1._) `Object.keys(${obj})`, forBody);
		        }
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
		    }
		    // end `for` loop
		    endFor() {
		        return this._endBlockNode(For);
		    }
		    // `label` statement
		    label(label) {
		        return this._leafNode(new Label(label));
		    }
		    // `break` statement
		    break(label) {
		        return this._leafNode(new Break(label));
		    }
		    // `return` statement
		    return(value) {
		        const node = new Return();
		        this._blockNode(node);
		        this.code(value);
		        if (node.nodes.length !== 1)
		            throw new Error('CodeGen: "return" should have one node');
		        return this._endBlockNode(Return);
		    }
		    // `try` statement
		    try(tryBody, catchCode, finallyCode) {
		        if (!catchCode && !finallyCode)
		            throw new Error('CodeGen: "try" without "catch" and "finally"');
		        const node = new Try();
		        this._blockNode(node);
		        this.code(tryBody);
		        if (catchCode) {
		            const error = this.name("e");
		            this._currNode = node.catch = new Catch(error);
		            catchCode(error);
		        }
		        if (finallyCode) {
		            this._currNode = node.finally = new Finally();
		            this.code(finallyCode);
		        }
		        return this._endBlockNode(Catch, Finally);
		    }
		    // `throw` statement
		    throw(error) {
		        return this._leafNode(new Throw(error));
		    }
		    // start self-balancing block
		    block(body, nodeCount) {
		        this._blockStarts.push(this._nodes.length);
		        if (body)
		            this.code(body).endBlock(nodeCount);
		        return this;
		    }
		    // end the current self-balancing block
		    endBlock(nodeCount) {
		        const len = this._blockStarts.pop();
		        if (len === undefined)
		            throw new Error("CodeGen: not in self-balancing block");
		        const toClose = this._nodes.length - len;
		        if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount)) {
		            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
		        }
		        this._nodes.length = len;
		        return this;
		    }
		    // `function` heading (or definition if funcBody is passed)
		    func(name, args = code_1.nil, async, funcBody) {
		        this._blockNode(new Func(name, args, async));
		        if (funcBody)
		            this.code(funcBody).endFunc();
		        return this;
		    }
		    // end function definition
		    endFunc() {
		        return this._endBlockNode(Func);
		    }
		    optimize(n = 1) {
		        while (n-- > 0) {
		            this._root.optimizeNodes();
		            this._root.optimizeNames(this._root.names, this._constants);
		        }
		    }
		    _leafNode(node) {
		        this._currNode.nodes.push(node);
		        return this;
		    }
		    _blockNode(node) {
		        this._currNode.nodes.push(node);
		        this._nodes.push(node);
		    }
		    _endBlockNode(N1, N2) {
		        const n = this._currNode;
		        if (n instanceof N1 || (N2 && n instanceof N2)) {
		            this._nodes.pop();
		            return this;
		        }
		        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
		    }
		    _elseNode(node) {
		        const n = this._currNode;
		        if (!(n instanceof If)) {
		            throw new Error('CodeGen: "else" without "if"');
		        }
		        this._currNode = n.else = node;
		        return this;
		    }
		    get _root() {
		        return this._nodes[0];
		    }
		    get _currNode() {
		        const ns = this._nodes;
		        return ns[ns.length - 1];
		    }
		    set _currNode(node) {
		        const ns = this._nodes;
		        ns[ns.length - 1] = node;
		    }
		}
		exports.CodeGen = CodeGen;
		function addNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) + (from[n] || 0);
		    return names;
		}
		function addExprNames(names, from) {
		    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
		}
		function optimizeExpr(expr, names, constants) {
		    if (expr instanceof code_1.Name)
		        return replaceName(expr);
		    if (!canOptimize(expr))
		        return expr;
		    return new code_1._Code(expr._items.reduce((items, c) => {
		        if (c instanceof code_1.Name)
		            c = replaceName(c);
		        if (c instanceof code_1._Code)
		            items.push(...c._items);
		        else
		            items.push(c);
		        return items;
		    }, []));
		    function replaceName(n) {
		        const c = constants[n.str];
		        if (c === undefined || names[n.str] !== 1)
		            return n;
		        delete names[n.str];
		        return c;
		    }
		    function canOptimize(e) {
		        return (e instanceof code_1._Code &&
		            e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined));
		    }
		}
		function subtractNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) - (from[n] || 0);
		}
		function not(x) {
		    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._) `!${par(x)}`;
		}
		exports.not = not;
		const andCode = mappend(exports.operators.AND);
		// boolean AND (&&) expression with the passed arguments
		function and(...args) {
		    return args.reduce(andCode);
		}
		exports.and = and;
		const orCode = mappend(exports.operators.OR);
		// boolean OR (||) expression with the passed arguments
		function or(...args) {
		    return args.reduce(orCode);
		}
		exports.or = or;
		function mappend(op) {
		    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._) `${par(x)} ${op} ${par(y)}`);
		}
		function par(x) {
		    return x instanceof code_1.Name ? x : (0, code_1._) `(${x})`;
		}
		
	} (codegen));
	return codegen;
}

var validate = {};

var boolSchema = {};

var errors = {};

var util = {};

var hasRequiredUtil;

function requireUtil () {
	if (hasRequiredUtil) return util;
	hasRequiredUtil = 1;
	Object.defineProperty(util, "__esModule", { value: true });
	util.checkStrictMode = util.getErrorPath = util.Type = util.useFunc = util.setEvaluated = util.evaluatedPropsToName = util.mergeEvaluated = util.eachItem = util.unescapeJsonPointer = util.escapeJsonPointer = util.escapeFragment = util.unescapeFragment = util.schemaRefOrVal = util.schemaHasRulesButRef = util.schemaHasRules = util.checkUnknownRules = util.alwaysValidSchema = util.toHash = void 0;
	const codegen_1 = requireCodegen();
	const code_1 = requireCode$1();
	// TODO refactor to use Set
	function toHash(arr) {
	    const hash = {};
	    for (const item of arr)
	        hash[item] = true;
	    return hash;
	}
	util.toHash = toHash;
	function alwaysValidSchema(it, schema) {
	    if (typeof schema == "boolean")
	        return schema;
	    if (Object.keys(schema).length === 0)
	        return true;
	    checkUnknownRules(it, schema);
	    return !schemaHasRules(schema, it.self.RULES.all);
	}
	util.alwaysValidSchema = alwaysValidSchema;
	function checkUnknownRules(it, schema = it.schema) {
	    const { opts, self } = it;
	    if (!opts.strictSchema)
	        return;
	    if (typeof schema === "boolean")
	        return;
	    const rules = self.RULES.keywords;
	    for (const key in schema) {
	        if (!rules[key])
	            checkStrictMode(it, `unknown keyword: "${key}"`);
	    }
	}
	util.checkUnknownRules = checkUnknownRules;
	function schemaHasRules(schema, rules) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (rules[key])
	            return true;
	    return false;
	}
	util.schemaHasRules = schemaHasRules;
	function schemaHasRulesButRef(schema, RULES) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (key !== "$ref" && RULES.all[key])
	            return true;
	    return false;
	}
	util.schemaHasRulesButRef = schemaHasRulesButRef;
	function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
	    if (!$data) {
	        if (typeof schema == "number" || typeof schema == "boolean")
	            return schema;
	        if (typeof schema == "string")
	            return (0, codegen_1._) `${schema}`;
	    }
	    return (0, codegen_1._) `${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
	}
	util.schemaRefOrVal = schemaRefOrVal;
	function unescapeFragment(str) {
	    return unescapeJsonPointer(decodeURIComponent(str));
	}
	util.unescapeFragment = unescapeFragment;
	function escapeFragment(str) {
	    return encodeURIComponent(escapeJsonPointer(str));
	}
	util.escapeFragment = escapeFragment;
	function escapeJsonPointer(str) {
	    if (typeof str == "number")
	        return `${str}`;
	    return str.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	util.escapeJsonPointer = escapeJsonPointer;
	function unescapeJsonPointer(str) {
	    return str.replace(/~1/g, "/").replace(/~0/g, "~");
	}
	util.unescapeJsonPointer = unescapeJsonPointer;
	function eachItem(xs, f) {
	    if (Array.isArray(xs)) {
	        for (const x of xs)
	            f(x);
	    }
	    else {
	        f(xs);
	    }
	}
	util.eachItem = eachItem;
	function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName, }) {
	    return (gen, from, to, toName) => {
	        const res = to === undefined
	            ? from
	            : to instanceof codegen_1.Name
	                ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to)
	                : from instanceof codegen_1.Name
	                    ? (mergeToName(gen, to, from), from)
	                    : mergeValues(from, to);
	        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
	    };
	}
	util.mergeEvaluated = {
	    props: makeMergeEvaluated({
	        mergeNames: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true && ${from} !== undefined`, () => {
	            gen.if((0, codegen_1._) `${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._) `${to} || {}`).code((0, codegen_1._) `Object.assign(${to}, ${from})`));
	        }),
	        mergeToName: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true`, () => {
	            if (from === true) {
	                gen.assign(to, true);
	            }
	            else {
	                gen.assign(to, (0, codegen_1._) `${to} || {}`);
	                setEvaluated(gen, to, from);
	            }
	        }),
	        mergeValues: (from, to) => (from === true ? true : { ...from, ...to }),
	        resultToName: evaluatedPropsToName,
	    }),
	    items: makeMergeEvaluated({
	        mergeNames: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._) `${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
	        mergeToName: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._) `${to} > ${from} ? ${to} : ${from}`)),
	        mergeValues: (from, to) => (from === true ? true : Math.max(from, to)),
	        resultToName: (gen, items) => gen.var("items", items),
	    }),
	};
	function evaluatedPropsToName(gen, ps) {
	    if (ps === true)
	        return gen.var("props", true);
	    const props = gen.var("props", (0, codegen_1._) `{}`);
	    if (ps !== undefined)
	        setEvaluated(gen, props, ps);
	    return props;
	}
	util.evaluatedPropsToName = evaluatedPropsToName;
	function setEvaluated(gen, props, ps) {
	    Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._) `${props}${(0, codegen_1.getProperty)(p)}`, true));
	}
	util.setEvaluated = setEvaluated;
	const snippets = {};
	function useFunc(gen, f) {
	    return gen.scopeValue("func", {
	        ref: f,
	        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code)),
	    });
	}
	util.useFunc = useFunc;
	var Type;
	(function (Type) {
	    Type[Type["Num"] = 0] = "Num";
	    Type[Type["Str"] = 1] = "Str";
	})(Type || (util.Type = Type = {}));
	function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
	    // let path
	    if (dataProp instanceof codegen_1.Name) {
	        const isNumber = dataPropType === Type.Num;
	        return jsPropertySyntax
	            ? isNumber
	                ? (0, codegen_1._) `"[" + ${dataProp} + "]"`
	                : (0, codegen_1._) `"['" + ${dataProp} + "']"`
	            : isNumber
	                ? (0, codegen_1._) `"/" + ${dataProp}`
	                : (0, codegen_1._) `"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`; // TODO maybe use global escapePointer
	    }
	    return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
	}
	util.getErrorPath = getErrorPath;
	function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
	    if (!mode)
	        return;
	    msg = `strict mode: ${msg}`;
	    if (mode === true)
	        throw new Error(msg);
	    it.self.logger.warn(msg);
	}
	util.checkStrictMode = checkStrictMode;
	
	return util;
}

var names = {};

var hasRequiredNames;

function requireNames () {
	if (hasRequiredNames) return names;
	hasRequiredNames = 1;
	Object.defineProperty(names, "__esModule", { value: true });
	const codegen_1 = requireCodegen();
	const names$1 = {
	    // validation function arguments
	    data: new codegen_1.Name("data"), // data passed to validation function
	    // args passed from referencing schema
	    valCxt: new codegen_1.Name("valCxt"), // validation/data context - should not be used directly, it is destructured to the names below
	    instancePath: new codegen_1.Name("instancePath"),
	    parentData: new codegen_1.Name("parentData"),
	    parentDataProperty: new codegen_1.Name("parentDataProperty"),
	    rootData: new codegen_1.Name("rootData"), // root data - same as the data passed to the first/top validation function
	    dynamicAnchors: new codegen_1.Name("dynamicAnchors"), // used to support recursiveRef and dynamicRef
	    // function scoped variables
	    vErrors: new codegen_1.Name("vErrors"), // null or array of validation errors
	    errors: new codegen_1.Name("errors"), // counter of validation errors
	    this: new codegen_1.Name("this"),
	    // "globals"
	    self: new codegen_1.Name("self"),
	    scope: new codegen_1.Name("scope"),
	    // JTD serialize/parse name for JSON string and position
	    json: new codegen_1.Name("json"),
	    jsonPos: new codegen_1.Name("jsonPos"),
	    jsonLen: new codegen_1.Name("jsonLen"),
	    jsonPart: new codegen_1.Name("jsonPart"),
	};
	names.default = names$1;
	
	return names;
}

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors;
	hasRequiredErrors = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
		const codegen_1 = requireCodegen();
		const util_1 = requireUtil();
		const names_1 = requireNames();
		exports.keywordError = {
		    message: ({ keyword }) => (0, codegen_1.str) `must pass "${keyword}" keyword validation`,
		};
		exports.keyword$DataError = {
		    message: ({ keyword, schemaType }) => schemaType
		        ? (0, codegen_1.str) `"${keyword}" keyword must be ${schemaType} ($data)`
		        : (0, codegen_1.str) `"${keyword}" keyword is invalid ($data)`,
		};
		function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
		    const { it } = cxt;
		    const { gen, compositeRule, allErrors } = it;
		    const errObj = errorObjectCode(cxt, error, errorPaths);
		    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : (compositeRule || allErrors)) {
		        addError(gen, errObj);
		    }
		    else {
		        returnErrors(it, (0, codegen_1._) `[${errObj}]`);
		    }
		}
		exports.reportError = reportError;
		function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
		    const { it } = cxt;
		    const { gen, compositeRule, allErrors } = it;
		    const errObj = errorObjectCode(cxt, error, errorPaths);
		    addError(gen, errObj);
		    if (!(compositeRule || allErrors)) {
		        returnErrors(it, names_1.default.vErrors);
		    }
		}
		exports.reportExtraError = reportExtraError;
		function resetErrorsCount(gen, errsCount) {
		    gen.assign(names_1.default.errors, errsCount);
		    gen.if((0, codegen_1._) `${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._) `${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
		}
		exports.resetErrorsCount = resetErrorsCount;
		function extendErrors({ gen, keyword, schemaValue, data, errsCount, it, }) {
		    /* istanbul ignore if */
		    if (errsCount === undefined)
		        throw new Error("ajv implementation error");
		    const err = gen.name("err");
		    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
		        gen.const(err, (0, codegen_1._) `${names_1.default.vErrors}[${i}]`);
		        gen.if((0, codegen_1._) `${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._) `${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
		        gen.assign((0, codegen_1._) `${err}.schemaPath`, (0, codegen_1.str) `${it.errSchemaPath}/${keyword}`);
		        if (it.opts.verbose) {
		            gen.assign((0, codegen_1._) `${err}.schema`, schemaValue);
		            gen.assign((0, codegen_1._) `${err}.data`, data);
		        }
		    });
		}
		exports.extendErrors = extendErrors;
		function addError(gen, errObj) {
		    const err = gen.const("err", errObj);
		    gen.if((0, codegen_1._) `${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._) `[${err}]`), (0, codegen_1._) `${names_1.default.vErrors}.push(${err})`);
		    gen.code((0, codegen_1._) `${names_1.default.errors}++`);
		}
		function returnErrors(it, errs) {
		    const { gen, validateName, schemaEnv } = it;
		    if (schemaEnv.$async) {
		        gen.throw((0, codegen_1._) `new ${it.ValidationError}(${errs})`);
		    }
		    else {
		        gen.assign((0, codegen_1._) `${validateName}.errors`, errs);
		        gen.return(false);
		    }
		}
		const E = {
		    keyword: new codegen_1.Name("keyword"),
		    schemaPath: new codegen_1.Name("schemaPath"), // also used in JTD errors
		    params: new codegen_1.Name("params"),
		    propertyName: new codegen_1.Name("propertyName"),
		    message: new codegen_1.Name("message"),
		    schema: new codegen_1.Name("schema"),
		    parentSchema: new codegen_1.Name("parentSchema"),
		};
		function errorObjectCode(cxt, error, errorPaths) {
		    const { createErrors } = cxt.it;
		    if (createErrors === false)
		        return (0, codegen_1._) `{}`;
		    return errorObject(cxt, error, errorPaths);
		}
		function errorObject(cxt, error, errorPaths = {}) {
		    const { gen, it } = cxt;
		    const keyValues = [
		        errorInstancePath(it, errorPaths),
		        errorSchemaPath(cxt, errorPaths),
		    ];
		    extraErrorProps(cxt, error, keyValues);
		    return gen.object(...keyValues);
		}
		function errorInstancePath({ errorPath }, { instancePath }) {
		    const instPath = instancePath
		        ? (0, codegen_1.str) `${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}`
		        : errorPath;
		    return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
		}
		function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
		    let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str) `${errSchemaPath}/${keyword}`;
		    if (schemaPath) {
		        schPath = (0, codegen_1.str) `${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
		    }
		    return [E.schemaPath, schPath];
		}
		function extraErrorProps(cxt, { params, message }, keyValues) {
		    const { keyword, data, schemaValue, it } = cxt;
		    const { opts, propertyName, topSchemaRef, schemaPath } = it;
		    keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._) `{}`]);
		    if (opts.messages) {
		        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
		    }
		    if (opts.verbose) {
		        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._) `${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
		    }
		    if (propertyName)
		        keyValues.push([E.propertyName, propertyName]);
		}
		
	} (errors));
	return errors;
}

var hasRequiredBoolSchema;

function requireBoolSchema () {
	if (hasRequiredBoolSchema) return boolSchema;
	hasRequiredBoolSchema = 1;
	Object.defineProperty(boolSchema, "__esModule", { value: true });
	boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
	const errors_1 = requireErrors();
	const codegen_1 = requireCodegen();
	const names_1 = requireNames();
	const boolError = {
	    message: "boolean schema is false",
	};
	function topBoolOrEmptySchema(it) {
	    const { gen, schema, validateName } = it;
	    if (schema === false) {
	        falseSchemaError(it, false);
	    }
	    else if (typeof schema == "object" && schema.$async === true) {
	        gen.return(names_1.default.data);
	    }
	    else {
	        gen.assign((0, codegen_1._) `${validateName}.errors`, null);
	        gen.return(true);
	    }
	}
	boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
	function boolOrEmptySchema(it, valid) {
	    const { gen, schema } = it;
	    if (schema === false) {
	        gen.var(valid, false); // TODO var
	        falseSchemaError(it);
	    }
	    else {
	        gen.var(valid, true); // TODO var
	    }
	}
	boolSchema.boolOrEmptySchema = boolOrEmptySchema;
	function falseSchemaError(it, overrideAllErrors) {
	    const { gen, data } = it;
	    // TODO maybe some other interface should be used for non-keyword validation errors...
	    const cxt = {
	        gen,
	        keyword: "false schema",
	        data,
	        schema: false,
	        schemaCode: false,
	        schemaValue: false,
	        params: {},
	        it,
	    };
	    (0, errors_1.reportError)(cxt, boolError, undefined, overrideAllErrors);
	}
	
	return boolSchema;
}

var dataType = {};

var rules = {};

var hasRequiredRules;

function requireRules () {
	if (hasRequiredRules) return rules;
	hasRequiredRules = 1;
	Object.defineProperty(rules, "__esModule", { value: true });
	rules.getRules = rules.isJSONType = void 0;
	const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
	const jsonTypes = new Set(_jsonTypes);
	function isJSONType(x) {
	    return typeof x == "string" && jsonTypes.has(x);
	}
	rules.isJSONType = isJSONType;
	function getRules() {
	    const groups = {
	        number: { type: "number", rules: [] },
	        string: { type: "string", rules: [] },
	        array: { type: "array", rules: [] },
	        object: { type: "object", rules: [] },
	    };
	    return {
	        types: { ...groups, integer: true, boolean: true, null: true },
	        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
	        post: { rules: [] },
	        all: {},
	        keywords: {},
	    };
	}
	rules.getRules = getRules;
	
	return rules;
}

var applicability = {};

var hasRequiredApplicability;

function requireApplicability () {
	if (hasRequiredApplicability) return applicability;
	hasRequiredApplicability = 1;
	Object.defineProperty(applicability, "__esModule", { value: true });
	applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
	function schemaHasRulesForType({ schema, self }, type) {
	    const group = self.RULES.types[type];
	    return group && group !== true && shouldUseGroup(schema, group);
	}
	applicability.schemaHasRulesForType = schemaHasRulesForType;
	function shouldUseGroup(schema, group) {
	    return group.rules.some((rule) => shouldUseRule(schema, rule));
	}
	applicability.shouldUseGroup = shouldUseGroup;
	function shouldUseRule(schema, rule) {
	    var _a;
	    return (schema[rule.keyword] !== undefined ||
	        ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== undefined)));
	}
	applicability.shouldUseRule = shouldUseRule;
	
	return applicability;
}

var hasRequiredDataType;

function requireDataType () {
	if (hasRequiredDataType) return dataType;
	hasRequiredDataType = 1;
	Object.defineProperty(dataType, "__esModule", { value: true });
	dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
	const rules_1 = requireRules();
	const applicability_1 = requireApplicability();
	const errors_1 = requireErrors();
	const codegen_1 = requireCodegen();
	const util_1 = requireUtil();
	var DataType;
	(function (DataType) {
	    DataType[DataType["Correct"] = 0] = "Correct";
	    DataType[DataType["Wrong"] = 1] = "Wrong";
	})(DataType || (dataType.DataType = DataType = {}));
	function getSchemaTypes(schema) {
	    const types = getJSONTypes(schema.type);
	    const hasNull = types.includes("null");
	    if (hasNull) {
	        if (schema.nullable === false)
	            throw new Error("type: null contradicts nullable: false");
	    }
	    else {
	        if (!types.length && schema.nullable !== undefined) {
	            throw new Error('"nullable" cannot be used without "type"');
	        }
	        if (schema.nullable === true)
	            types.push("null");
	    }
	    return types;
	}
	dataType.getSchemaTypes = getSchemaTypes;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	function getJSONTypes(ts) {
	    const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
	    if (types.every(rules_1.isJSONType))
	        return types;
	    throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
	}
	dataType.getJSONTypes = getJSONTypes;
	function coerceAndCheckDataType(it, types) {
	    const { gen, data, opts } = it;
	    const coerceTo = coerceToTypes(types, opts.coerceTypes);
	    const checkTypes = types.length > 0 &&
	        !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
	    if (checkTypes) {
	        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
	        gen.if(wrongType, () => {
	            if (coerceTo.length)
	                coerceData(it, types, coerceTo);
	            else
	                reportTypeError(it);
	        });
	    }
	    return checkTypes;
	}
	dataType.coerceAndCheckDataType = coerceAndCheckDataType;
	const COERCIBLE = new Set(["string", "number", "integer", "boolean", "null"]);
	function coerceToTypes(types, coerceTypes) {
	    return coerceTypes
	        ? types.filter((t) => COERCIBLE.has(t) || (coerceTypes === "array" && t === "array"))
	        : [];
	}
	function coerceData(it, types, coerceTo) {
	    const { gen, data, opts } = it;
	    const dataType = gen.let("dataType", (0, codegen_1._) `typeof ${data}`);
	    const coerced = gen.let("coerced", (0, codegen_1._) `undefined`);
	    if (opts.coerceTypes === "array") {
	        gen.if((0, codegen_1._) `${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen
	            .assign(data, (0, codegen_1._) `${data}[0]`)
	            .assign(dataType, (0, codegen_1._) `typeof ${data}`)
	            .if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
	    }
	    gen.if((0, codegen_1._) `${coerced} !== undefined`);
	    for (const t of coerceTo) {
	        if (COERCIBLE.has(t) || (t === "array" && opts.coerceTypes === "array")) {
	            coerceSpecificType(t);
	        }
	    }
	    gen.else();
	    reportTypeError(it);
	    gen.endIf();
	    gen.if((0, codegen_1._) `${coerced} !== undefined`, () => {
	        gen.assign(data, coerced);
	        assignParentData(it, coerced);
	    });
	    function coerceSpecificType(t) {
	        switch (t) {
	            case "string":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} == "number" || ${dataType} == "boolean"`)
	                    .assign(coerced, (0, codegen_1._) `"" + ${data}`)
	                    .elseIf((0, codegen_1._) `${data} === null`)
	                    .assign(coerced, (0, codegen_1._) `""`);
	                return;
	            case "number":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`)
	                    .assign(coerced, (0, codegen_1._) `+${data}`);
	                return;
	            case "integer":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`)
	                    .assign(coerced, (0, codegen_1._) `+${data}`);
	                return;
	            case "boolean":
	                gen
	                    .elseIf((0, codegen_1._) `${data} === "false" || ${data} === 0 || ${data} === null`)
	                    .assign(coerced, false)
	                    .elseIf((0, codegen_1._) `${data} === "true" || ${data} === 1`)
	                    .assign(coerced, true);
	                return;
	            case "null":
	                gen.elseIf((0, codegen_1._) `${data} === "" || ${data} === 0 || ${data} === false`);
	                gen.assign(coerced, null);
	                return;
	            case "array":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`)
	                    .assign(coerced, (0, codegen_1._) `[${data}]`);
	        }
	    }
	}
	function assignParentData({ gen, parentData, parentDataProperty }, expr) {
	    // TODO use gen.property
	    gen.if((0, codegen_1._) `${parentData} !== undefined`, () => gen.assign((0, codegen_1._) `${parentData}[${parentDataProperty}]`, expr));
	}
	function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
	    const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
	    let cond;
	    switch (dataType) {
	        case "null":
	            return (0, codegen_1._) `${data} ${EQ} null`;
	        case "array":
	            cond = (0, codegen_1._) `Array.isArray(${data})`;
	            break;
	        case "object":
	            cond = (0, codegen_1._) `${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
	            break;
	        case "integer":
	            cond = numCond((0, codegen_1._) `!(${data} % 1) && !isNaN(${data})`);
	            break;
	        case "number":
	            cond = numCond();
	            break;
	        default:
	            return (0, codegen_1._) `typeof ${data} ${EQ} ${dataType}`;
	    }
	    return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
	    function numCond(_cond = codegen_1.nil) {
	        return (0, codegen_1.and)((0, codegen_1._) `typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._) `isFinite(${data})` : codegen_1.nil);
	    }
	}
	dataType.checkDataType = checkDataType;
	function checkDataTypes(dataTypes, data, strictNums, correct) {
	    if (dataTypes.length === 1) {
	        return checkDataType(dataTypes[0], data, strictNums, correct);
	    }
	    let cond;
	    const types = (0, util_1.toHash)(dataTypes);
	    if (types.array && types.object) {
	        const notObj = (0, codegen_1._) `typeof ${data} != "object"`;
	        cond = types.null ? notObj : (0, codegen_1._) `!${data} || ${notObj}`;
	        delete types.null;
	        delete types.array;
	        delete types.object;
	    }
	    else {
	        cond = codegen_1.nil;
	    }
	    if (types.number)
	        delete types.integer;
	    for (const t in types)
	        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
	    return cond;
	}
	dataType.checkDataTypes = checkDataTypes;
	const typeError = {
	    message: ({ schema }) => `must be ${schema}`,
	    params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._) `{type: ${schema}}` : (0, codegen_1._) `{type: ${schemaValue}}`,
	};
	function reportTypeError(it) {
	    const cxt = getTypeErrorContext(it);
	    (0, errors_1.reportError)(cxt, typeError);
	}
	dataType.reportTypeError = reportTypeError;
	function getTypeErrorContext(it) {
	    const { gen, data, schema } = it;
	    const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
	    return {
	        gen,
	        keyword: "type",
	        data,
	        schema: schema.type,
	        schemaCode,
	        schemaValue: schemaCode,
	        parentSchema: schema,
	        params: {},
	        it,
	    };
	}
	
	return dataType;
}

var defaults = {};

var hasRequiredDefaults;

function requireDefaults () {
	if (hasRequiredDefaults) return defaults;
	hasRequiredDefaults = 1;
	Object.defineProperty(defaults, "__esModule", { value: true });
	defaults.assignDefaults = void 0;
	const codegen_1 = requireCodegen();
	const util_1 = requireUtil();
	function assignDefaults(it, ty) {
	    const { properties, items } = it.schema;
	    if (ty === "object" && properties) {
	        for (const key in properties) {
	            assignDefault(it, key, properties[key].default);
	        }
	    }
	    else if (ty === "array" && Array.isArray(items)) {
	        items.forEach((sch, i) => assignDefault(it, i, sch.default));
	    }
	}
	defaults.assignDefaults = assignDefaults;
	function assignDefault(it, prop, defaultValue) {
	    const { gen, compositeRule, data, opts } = it;
	    if (defaultValue === undefined)
	        return;
	    const childData = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(prop)}`;
	    if (compositeRule) {
	        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
	        return;
	    }
	    let condition = (0, codegen_1._) `${childData} === undefined`;
	    if (opts.useDefaults === "empty") {
	        condition = (0, codegen_1._) `${condition} || ${childData} === null || ${childData} === ""`;
	    }
	    // `${childData} === undefined` +
	    // (opts.useDefaults === "empty" ? ` || ${childData} === null || ${childData} === ""` : "")
	    gen.if(condition, (0, codegen_1._) `${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
	}
	
	return defaults;
}

var keyword = {};

var code = {};

var hasRequiredCode;

function requireCode () {
	if (hasRequiredCode) return code;
	hasRequiredCode = 1;
	Object.defineProperty(code, "__esModule", { value: true });
	code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
	const codegen_1 = requireCodegen();
	const util_1 = requireUtil();
	const names_1 = requireNames();
	const util_2 = requireUtil();
	function checkReportMissingProp(cxt, prop) {
	    const { gen, data, it } = cxt;
	    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
	        cxt.setParams({ missingProperty: (0, codegen_1._) `${prop}` }, true);
	        cxt.error();
	    });
	}
	code.checkReportMissingProp = checkReportMissingProp;
	function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
	    return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._) `${missing} = ${prop}`)));
	}
	code.checkMissingProp = checkMissingProp;
	function reportMissingProp(cxt, missing) {
	    cxt.setParams({ missingProperty: missing }, true);
	    cxt.error();
	}
	code.reportMissingProp = reportMissingProp;
	function hasPropFunc(gen) {
	    return gen.scopeValue("func", {
	        // eslint-disable-next-line @typescript-eslint/unbound-method
	        ref: Object.prototype.hasOwnProperty,
	        code: (0, codegen_1._) `Object.prototype.hasOwnProperty`,
	    });
	}
	code.hasPropFunc = hasPropFunc;
	function isOwnProperty(gen, data, property) {
	    return (0, codegen_1._) `${hasPropFunc(gen)}.call(${data}, ${property})`;
	}
	code.isOwnProperty = isOwnProperty;
	function propertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
	    return ownProperties ? (0, codegen_1._) `${cond} && ${isOwnProperty(gen, data, property)}` : cond;
	}
	code.propertyInData = propertyInData;
	function noPropertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} === undefined`;
	    return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
	}
	code.noPropertyInData = noPropertyInData;
	function allSchemaProperties(schemaMap) {
	    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
	}
	code.allSchemaProperties = allSchemaProperties;
	function schemaProperties(it, schemaMap) {
	    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
	}
	code.schemaProperties = schemaProperties;
	function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
	    const dataAndSchema = passSchema ? (0, codegen_1._) `${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
	    const valCxt = [
	        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
	        [names_1.default.parentData, it.parentData],
	        [names_1.default.parentDataProperty, it.parentDataProperty],
	        [names_1.default.rootData, names_1.default.rootData],
	    ];
	    if (it.opts.dynamicRef)
	        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
	    const args = (0, codegen_1._) `${dataAndSchema}, ${gen.object(...valCxt)}`;
	    return context !== codegen_1.nil ? (0, codegen_1._) `${func}.call(${context}, ${args})` : (0, codegen_1._) `${func}(${args})`;
	}
	code.callValidateCode = callValidateCode;
	const newRegExp = (0, codegen_1._) `new RegExp`;
	function usePattern({ gen, it: { opts } }, pattern) {
	    const u = opts.unicodeRegExp ? "u" : "";
	    const { regExp } = opts.code;
	    const rx = regExp(pattern, u);
	    return gen.scopeValue("pattern", {
	        key: rx.toString(),
	        ref: rx,
	        code: (0, codegen_1._) `${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
	    });
	}
	code.usePattern = usePattern;
	function validateArray(cxt) {
	    const { gen, data, keyword, it } = cxt;
	    const valid = gen.name("valid");
	    if (it.allErrors) {
	        const validArr = gen.let("valid", true);
	        validateItems(() => gen.assign(validArr, false));
	        return validArr;
	    }
	    gen.var(valid, true);
	    validateItems(() => gen.break());
	    return valid;
	    function validateItems(notValid) {
	        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	        gen.forRange("i", 0, len, (i) => {
	            cxt.subschema({
	                keyword,
	                dataProp: i,
	                dataPropType: util_1.Type.Num,
	            }, valid);
	            gen.if((0, codegen_1.not)(valid), notValid);
	        });
	    }
	}
	code.validateArray = validateArray;
	function validateUnion(cxt) {
	    const { gen, schema, keyword, it } = cxt;
	    /* istanbul ignore if */
	    if (!Array.isArray(schema))
	        throw new Error("ajv implementation error");
	    const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
	    if (alwaysValid && !it.opts.unevaluated)
	        return;
	    const valid = gen.let("valid", false);
	    const schValid = gen.name("_valid");
	    gen.block(() => schema.forEach((_sch, i) => {
	        const schCxt = cxt.subschema({
	            keyword,
	            schemaProp: i,
	            compositeRule: true,
	        }, schValid);
	        gen.assign(valid, (0, codegen_1._) `${valid} || ${schValid}`);
	        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
	        // can short-circuit if `unevaluatedProperties/Items` not supported (opts.unevaluated !== true)
	        // or if all properties and items were evaluated (it.props === true && it.items === true)
	        if (!merged)
	            gen.if((0, codegen_1.not)(valid));
	    }));
	    cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
	}
	code.validateUnion = validateUnion;
	
	return code;
}

var hasRequiredKeyword;

function requireKeyword () {
	if (hasRequiredKeyword) return keyword;
	hasRequiredKeyword = 1;
	Object.defineProperty(keyword, "__esModule", { value: true });
	keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
	const codegen_1 = requireCodegen();
	const names_1 = requireNames();
	const code_1 = requireCode();
	const errors_1 = requireErrors();
	function macroKeywordCode(cxt, def) {
	    const { gen, keyword, schema, parentSchema, it } = cxt;
	    const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
	    const schemaRef = useKeyword(gen, keyword, macroSchema);
	    if (it.opts.validateSchema !== false)
	        it.self.validateSchema(macroSchema, true);
	    const valid = gen.name("valid");
	    cxt.subschema({
	        schema: macroSchema,
	        schemaPath: codegen_1.nil,
	        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
	        topSchemaRef: schemaRef,
	        compositeRule: true,
	    }, valid);
	    cxt.pass(valid, () => cxt.error(true));
	}
	keyword.macroKeywordCode = macroKeywordCode;
	function funcKeywordCode(cxt, def) {
	    var _a;
	    const { gen, keyword, schema, parentSchema, $data, it } = cxt;
	    checkAsyncKeyword(it, def);
	    const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
	    const validateRef = useKeyword(gen, keyword, validate);
	    const valid = gen.let("valid");
	    cxt.block$data(valid, validateKeyword);
	    cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
	    function validateKeyword() {
	        if (def.errors === false) {
	            assignValid();
	            if (def.modifying)
	                modifyData(cxt);
	            reportErrs(() => cxt.error());
	        }
	        else {
	            const ruleErrs = def.async ? validateAsync() : validateSync();
	            if (def.modifying)
	                modifyData(cxt);
	            reportErrs(() => addErrs(cxt, ruleErrs));
	        }
	    }
	    function validateAsync() {
	        const ruleErrs = gen.let("ruleErrs", null);
	        gen.try(() => assignValid((0, codegen_1._) `await `), (e) => gen.assign(valid, false).if((0, codegen_1._) `${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._) `${e}.errors`), () => gen.throw(e)));
	        return ruleErrs;
	    }
	    function validateSync() {
	        const validateErrs = (0, codegen_1._) `${validateRef}.errors`;
	        gen.assign(validateErrs, null);
	        assignValid(codegen_1.nil);
	        return validateErrs;
	    }
	    function assignValid(_await = def.async ? (0, codegen_1._) `await ` : codegen_1.nil) {
	        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
	        const passSchema = !(("compile" in def && !$data) || def.schema === false);
	        gen.assign(valid, (0, codegen_1._) `${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
	    }
	    function reportErrs(errors) {
	        var _a;
	        gen.if((0, codegen_1.not)((_a = def.valid) !== null && _a !== void 0 ? _a : valid), errors);
	    }
	}
	keyword.funcKeywordCode = funcKeywordCode;
	function modifyData(cxt) {
	    const { gen, data, it } = cxt;
	    gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._) `${it.parentData}[${it.parentDataProperty}]`));
	}
	function addErrs(cxt, errs) {
	    const { gen } = cxt;
	    gen.if((0, codegen_1._) `Array.isArray(${errs})`, () => {
	        gen
	            .assign(names_1.default.vErrors, (0, codegen_1._) `${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`)
	            .assign(names_1.default.errors, (0, codegen_1._) `${names_1.default.vErrors}.length`);
	        (0, errors_1.extendErrors)(cxt);
	    }, () => cxt.error());
	}
	function checkAsyncKeyword({ schemaEnv }, def) {
	    if (def.async && !schemaEnv.$async)
	        throw new Error("async keyword in sync schema");
	}
	function useKeyword(gen, keyword, result) {
	    if (result === undefined)
	        throw new Error(`keyword "${keyword}" failed to compile`);
	    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
	}
	function validSchemaType(schema, schemaType, allowUndefined = false) {
	    // TODO add tests
	    return (!schemaType.length ||
	        schemaType.some((st) => st === "array"
	            ? Array.isArray(schema)
	            : st === "object"
	                ? schema && typeof schema == "object" && !Array.isArray(schema)
	                : typeof schema == st || (allowUndefined && typeof schema == "undefined")));
	}
	keyword.validSchemaType = validSchemaType;
	function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
	    /* istanbul ignore if */
	    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
	        throw new Error("ajv implementation error");
	    }
	    const deps = def.dependencies;
	    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
	        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
	    }
	    if (def.validateSchema) {
	        const valid = def.validateSchema(schema[keyword]);
	        if (!valid) {
	            const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
	                self.errorsText(def.validateSchema.errors);
	            if (opts.validateSchema === "log")
	                self.logger.error(msg);
	            else
	                throw new Error(msg);
	        }
	    }
	}
	keyword.validateKeywordUsage = validateKeywordUsage;
	
	return keyword;
}

var subschema = {};

var hasRequiredSubschema;

function requireSubschema () {
	if (hasRequiredSubschema) return subschema;
	hasRequiredSubschema = 1;
	Object.defineProperty(subschema, "__esModule", { value: true });
	subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
	const codegen_1 = requireCodegen();
	const util_1 = requireUtil();
	function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
	    if (keyword !== undefined && schema !== undefined) {
	        throw new Error('both "keyword" and "schema" passed, only one allowed');
	    }
	    if (keyword !== undefined) {
	        const sch = it.schema[keyword];
	        return schemaProp === undefined
	            ? {
	                schema: sch,
	                schemaPath: (0, codegen_1._) `${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
	                errSchemaPath: `${it.errSchemaPath}/${keyword}`,
	            }
	            : {
	                schema: sch[schemaProp],
	                schemaPath: (0, codegen_1._) `${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
	                errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`,
	            };
	    }
	    if (schema !== undefined) {
	        if (schemaPath === undefined || errSchemaPath === undefined || topSchemaRef === undefined) {
	            throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
	        }
	        return {
	            schema,
	            schemaPath,
	            topSchemaRef,
	            errSchemaPath,
	        };
	    }
	    throw new Error('either "keyword" or "schema" must be passed');
	}
	subschema.getSubschema = getSubschema;
	function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
	    if (data !== undefined && dataProp !== undefined) {
	        throw new Error('both "data" and "dataProp" passed, only one allowed');
	    }
	    const { gen } = it;
	    if (dataProp !== undefined) {
	        const { errorPath, dataPathArr, opts } = it;
	        const nextData = gen.let("data", (0, codegen_1._) `${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
	        dataContextProps(nextData);
	        subschema.errorPath = (0, codegen_1.str) `${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
	        subschema.parentDataProperty = (0, codegen_1._) `${dataProp}`;
	        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
	    }
	    if (data !== undefined) {
	        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true); // replaceable if used once?
	        dataContextProps(nextData);
	        if (propertyName !== undefined)
	            subschema.propertyName = propertyName;
	        // TODO something is possibly wrong here with not changing parentDataProperty and not appending dataPathArr
	    }
	    if (dataTypes)
	        subschema.dataTypes = dataTypes;
	    function dataContextProps(_nextData) {
	        subschema.data = _nextData;
	        subschema.dataLevel = it.dataLevel + 1;
	        subschema.dataTypes = [];
	        it.definedProperties = new Set();
	        subschema.parentData = it.data;
	        subschema.dataNames = [...it.dataNames, _nextData];
	    }
	}
	subschema.extendSubschemaData = extendSubschemaData;
	function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
	    if (compositeRule !== undefined)
	        subschema.compositeRule = compositeRule;
	    if (createErrors !== undefined)
	        subschema.createErrors = createErrors;
	    if (allErrors !== undefined)
	        subschema.allErrors = allErrors;
	    subschema.jtdDiscriminator = jtdDiscriminator; // not inherited
	    subschema.jtdMetadata = jtdMetadata; // not inherited
	}
	subschema.extendSubschemaMode = extendSubschemaMode;
	
	return subschema;
}

var resolve = {};

var fastDeepEqual;
var hasRequiredFastDeepEqual;

function requireFastDeepEqual () {
	if (hasRequiredFastDeepEqual) return fastDeepEqual;
	hasRequiredFastDeepEqual = 1;

	// do not edit .js files directly - edit src/index.jst



	fastDeepEqual = function equal(a, b) {
	  if (a === b) return true;

	  if (a && b && typeof a == 'object' && typeof b == 'object') {
	    if (a.constructor !== b.constructor) return false;

	    var length, i, keys;
	    if (Array.isArray(a)) {
	      length = a.length;
	      if (length != b.length) return false;
	      for (i = length; i-- !== 0;)
	        if (!equal(a[i], b[i])) return false;
	      return true;
	    }



	    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
	    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
	    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

	    keys = Object.keys(a);
	    length = keys.length;
	    if (length !== Object.keys(b).length) return false;

	    for (i = length; i-- !== 0;)
	      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

	    for (i = length; i-- !== 0;) {
	      var key = keys[i];

	      if (!equal(a[key], b[key])) return false;
	    }

	    return true;
	  }

	  // true if both NaN, false otherwise
	  return a!==a && b!==b;
	};
	return fastDeepEqual;
}

var jsonSchemaTraverse = {exports: {}};

var hasRequiredJsonSchemaTraverse;

function requireJsonSchemaTraverse () {
	if (hasRequiredJsonSchemaTraverse) return jsonSchemaTraverse.exports;
	hasRequiredJsonSchemaTraverse = 1;

	var traverse = jsonSchemaTraverse.exports = function (schema, opts, cb) {
	  // Legacy support for v0.3.1 and earlier.
	  if (typeof opts == 'function') {
	    cb = opts;
	    opts = {};
	  }

	  cb = opts.cb || cb;
	  var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
	  var post = cb.post || function() {};

	  _traverse(opts, pre, post, schema, '', schema);
	};


	traverse.keywords = {
	  additionalItems: true,
	  items: true,
	  contains: true,
	  additionalProperties: true,
	  propertyNames: true,
	  not: true,
	  if: true,
	  then: true,
	  else: true
	};

	traverse.arrayKeywords = {
	  items: true,
	  allOf: true,
	  anyOf: true,
	  oneOf: true
	};

	traverse.propsKeywords = {
	  $defs: true,
	  definitions: true,
	  properties: true,
	  patternProperties: true,
	  dependencies: true
	};

	traverse.skipKeywords = {
	  default: true,
	  enum: true,
	  const: true,
	  required: true,
	  maximum: true,
	  minimum: true,
	  exclusiveMaximum: true,
	  exclusiveMinimum: true,
	  multipleOf: true,
	  maxLength: true,
	  minLength: true,
	  pattern: true,
	  format: true,
	  maxItems: true,
	  minItems: true,
	  uniqueItems: true,
	  maxProperties: true,
	  minProperties: true
	};


	function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
	  if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
	    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
	    for (var key in schema) {
	      var sch = schema[key];
	      if (Array.isArray(sch)) {
	        if (key in traverse.arrayKeywords) {
	          for (var i=0; i<sch.length; i++)
	            _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
	        }
	      } else if (key in traverse.propsKeywords) {
	        if (sch && typeof sch == 'object') {
	          for (var prop in sch)
	            _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
	        }
	      } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
	        _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
	      }
	    }
	    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
	  }
	}


	function escapeJsonPtr(str) {
	  return str.replace(/~/g, '~0').replace(/\//g, '~1');
	}
	return jsonSchemaTraverse.exports;
}

var hasRequiredResolve;

function requireResolve () {
	if (hasRequiredResolve) return resolve;
	hasRequiredResolve = 1;
	Object.defineProperty(resolve, "__esModule", { value: true });
	resolve.getSchemaRefs = resolve.resolveUrl = resolve.normalizeId = resolve._getFullPath = resolve.getFullPath = resolve.inlineRef = void 0;
	const util_1 = requireUtil();
	const equal = requireFastDeepEqual();
	const traverse = requireJsonSchemaTraverse();
	// TODO refactor to use keyword definitions
	const SIMPLE_INLINED = new Set([
	    "type",
	    "format",
	    "pattern",
	    "maxLength",
	    "minLength",
	    "maxProperties",
	    "minProperties",
	    "maxItems",
	    "minItems",
	    "maximum",
	    "minimum",
	    "uniqueItems",
	    "multipleOf",
	    "required",
	    "enum",
	    "const",
	]);
	function inlineRef(schema, limit = true) {
	    if (typeof schema == "boolean")
	        return true;
	    if (limit === true)
	        return !hasRef(schema);
	    if (!limit)
	        return false;
	    return countKeys(schema) <= limit;
	}
	resolve.inlineRef = inlineRef;
	const REF_KEYWORDS = new Set([
	    "$ref",
	    "$recursiveRef",
	    "$recursiveAnchor",
	    "$dynamicRef",
	    "$dynamicAnchor",
	]);
	function hasRef(schema) {
	    for (const key in schema) {
	        if (REF_KEYWORDS.has(key))
	            return true;
	        const sch = schema[key];
	        if (Array.isArray(sch) && sch.some(hasRef))
	            return true;
	        if (typeof sch == "object" && hasRef(sch))
	            return true;
	    }
	    return false;
	}
	function countKeys(schema) {
	    let count = 0;
	    for (const key in schema) {
	        if (key === "$ref")
	            return Infinity;
	        count++;
	        if (SIMPLE_INLINED.has(key))
	            continue;
	        if (typeof schema[key] == "object") {
	            (0, util_1.eachItem)(schema[key], (sch) => (count += countKeys(sch)));
	        }
	        if (count === Infinity)
	            return Infinity;
	    }
	    return count;
	}
	function getFullPath(resolver, id = "", normalize) {
	    if (normalize !== false)
	        id = normalizeId(id);
	    const p = resolver.parse(id);
	    return _getFullPath(resolver, p);
	}
	resolve.getFullPath = getFullPath;
	function _getFullPath(resolver, p) {
	    const serialized = resolver.serialize(p);
	    return serialized.split("#")[0] + "#";
	}
	resolve._getFullPath = _getFullPath;
	const TRAILING_SLASH_HASH = /#\/?$/;
	function normalizeId(id) {
	    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
	}
	resolve.normalizeId = normalizeId;
	function resolveUrl(resolver, baseId, id) {
	    id = normalizeId(id);
	    return resolver.resolve(baseId, id);
	}
	resolve.resolveUrl = resolveUrl;
	const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
	function getSchemaRefs(schema, baseId) {
	    if (typeof schema == "boolean")
	        return {};
	    const { schemaId, uriResolver } = this.opts;
	    const schId = normalizeId(schema[schemaId] || baseId);
	    const baseIds = { "": schId };
	    const pathPrefix = getFullPath(uriResolver, schId, false);
	    const localRefs = {};
	    const schemaRefs = new Set();
	    traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
	        if (parentJsonPtr === undefined)
	            return;
	        const fullPath = pathPrefix + jsonPtr;
	        let innerBaseId = baseIds[parentJsonPtr];
	        if (typeof sch[schemaId] == "string")
	            innerBaseId = addRef.call(this, sch[schemaId]);
	        addAnchor.call(this, sch.$anchor);
	        addAnchor.call(this, sch.$dynamicAnchor);
	        baseIds[jsonPtr] = innerBaseId;
	        function addRef(ref) {
	            // eslint-disable-next-line @typescript-eslint/unbound-method
	            const _resolve = this.opts.uriResolver.resolve;
	            ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
	            if (schemaRefs.has(ref))
	                throw ambiguos(ref);
	            schemaRefs.add(ref);
	            let schOrRef = this.refs[ref];
	            if (typeof schOrRef == "string")
	                schOrRef = this.refs[schOrRef];
	            if (typeof schOrRef == "object") {
	                checkAmbiguosRef(sch, schOrRef.schema, ref);
	            }
	            else if (ref !== normalizeId(fullPath)) {
	                if (ref[0] === "#") {
	                    checkAmbiguosRef(sch, localRefs[ref], ref);
	                    localRefs[ref] = sch;
	                }
	                else {
	                    this.refs[ref] = fullPath;
	                }
	            }
	            return ref;
	        }
	        function addAnchor(anchor) {
	            if (typeof anchor == "string") {
	                if (!ANCHOR.test(anchor))
	                    throw new Error(`invalid anchor "${anchor}"`);
	                addRef.call(this, `#${anchor}`);
	            }
	        }
	    });
	    return localRefs;
	    function checkAmbiguosRef(sch1, sch2, ref) {
	        if (sch2 !== undefined && !equal(sch1, sch2))
	            throw ambiguos(ref);
	    }
	    function ambiguos(ref) {
	        return new Error(`reference "${ref}" resolves to more than one schema`);
	    }
	}
	resolve.getSchemaRefs = getSchemaRefs;
	
	return resolve;
}

var hasRequiredValidate;

function requireValidate () {
	if (hasRequiredValidate) return validate;
	hasRequiredValidate = 1;
	Object.defineProperty(validate, "__esModule", { value: true });
	validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
	const boolSchema_1 = requireBoolSchema();
	const dataType_1 = requireDataType();
	const applicability_1 = requireApplicability();
	const dataType_2 = requireDataType();
	const defaults_1 = requireDefaults();
	const keyword_1 = requireKeyword();
	const subschema_1 = requireSubschema();
	const codegen_1 = requireCodegen();
	const names_1 = requireNames();
	const resolve_1 = requireResolve();
	const util_1 = requireUtil();
	const errors_1 = requireErrors();
	// schema compilation - generates validation function, subschemaCode (below) is used for subschemas
	function validateFunctionCode(it) {
	    if (isSchemaObj(it)) {
	        checkKeywords(it);
	        if (schemaCxtHasRules(it)) {
	            topSchemaObjCode(it);
	            return;
	        }
	    }
	    validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
	}
	validate.validateFunctionCode = validateFunctionCode;
	function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
	    if (opts.code.es5) {
	        gen.func(validateName, (0, codegen_1._) `${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
	            gen.code((0, codegen_1._) `"use strict"; ${funcSourceUrl(schema, opts)}`);
	            destructureValCxtES5(gen, opts);
	            gen.code(body);
	        });
	    }
	    else {
	        gen.func(validateName, (0, codegen_1._) `${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
	    }
	}
	function destructureValCxt(opts) {
	    return (0, codegen_1._) `{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._) `, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
	}
	function destructureValCxtES5(gen, opts) {
	    gen.if(names_1.default.valCxt, () => {
	        gen.var(names_1.default.instancePath, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.instancePath}`);
	        gen.var(names_1.default.parentData, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.parentData}`);
	        gen.var(names_1.default.parentDataProperty, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
	        gen.var(names_1.default.rootData, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.rootData}`);
	        if (opts.dynamicRef)
	            gen.var(names_1.default.dynamicAnchors, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
	    }, () => {
	        gen.var(names_1.default.instancePath, (0, codegen_1._) `""`);
	        gen.var(names_1.default.parentData, (0, codegen_1._) `undefined`);
	        gen.var(names_1.default.parentDataProperty, (0, codegen_1._) `undefined`);
	        gen.var(names_1.default.rootData, names_1.default.data);
	        if (opts.dynamicRef)
	            gen.var(names_1.default.dynamicAnchors, (0, codegen_1._) `{}`);
	    });
	}
	function topSchemaObjCode(it) {
	    const { schema, opts, gen } = it;
	    validateFunction(it, () => {
	        if (opts.$comment && schema.$comment)
	            commentKeyword(it);
	        checkNoDefault(it);
	        gen.let(names_1.default.vErrors, null);
	        gen.let(names_1.default.errors, 0);
	        if (opts.unevaluated)
	            resetEvaluated(it);
	        typeAndKeywords(it);
	        returnResults(it);
	    });
	    return;
	}
	function resetEvaluated(it) {
	    // TODO maybe some hook to execute it in the end to check whether props/items are Name, as in assignEvaluated
	    const { gen, validateName } = it;
	    it.evaluated = gen.const("evaluated", (0, codegen_1._) `${validateName}.evaluated`);
	    gen.if((0, codegen_1._) `${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._) `${it.evaluated}.props`, (0, codegen_1._) `undefined`));
	    gen.if((0, codegen_1._) `${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._) `${it.evaluated}.items`, (0, codegen_1._) `undefined`));
	}
	function funcSourceUrl(schema, opts) {
	    const schId = typeof schema == "object" && schema[opts.schemaId];
	    return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._) `/*# sourceURL=${schId} */` : codegen_1.nil;
	}
	// schema compilation - this function is used recursively to generate code for sub-schemas
	function subschemaCode(it, valid) {
	    if (isSchemaObj(it)) {
	        checkKeywords(it);
	        if (schemaCxtHasRules(it)) {
	            subSchemaObjCode(it, valid);
	            return;
	        }
	    }
	    (0, boolSchema_1.boolOrEmptySchema)(it, valid);
	}
	function schemaCxtHasRules({ schema, self }) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (self.RULES.all[key])
	            return true;
	    return false;
	}
	function isSchemaObj(it) {
	    return typeof it.schema != "boolean";
	}
	function subSchemaObjCode(it, valid) {
	    const { schema, gen, opts } = it;
	    if (opts.$comment && schema.$comment)
	        commentKeyword(it);
	    updateContext(it);
	    checkAsyncSchema(it);
	    const errsCount = gen.const("_errs", names_1.default.errors);
	    typeAndKeywords(it, errsCount);
	    // TODO var
	    gen.var(valid, (0, codegen_1._) `${errsCount} === ${names_1.default.errors}`);
	}
	function checkKeywords(it) {
	    (0, util_1.checkUnknownRules)(it);
	    checkRefsAndKeywords(it);
	}
	function typeAndKeywords(it, errsCount) {
	    if (it.opts.jtd)
	        return schemaKeywords(it, [], false, errsCount);
	    const types = (0, dataType_1.getSchemaTypes)(it.schema);
	    const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
	    schemaKeywords(it, types, !checkedTypes, errsCount);
	}
	function checkRefsAndKeywords(it) {
	    const { schema, errSchemaPath, opts, self } = it;
	    if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
	        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
	    }
	}
	function checkNoDefault(it) {
	    const { schema, opts } = it;
	    if (schema.default !== undefined && opts.useDefaults && opts.strictSchema) {
	        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
	    }
	}
	function updateContext(it) {
	    const schId = it.schema[it.opts.schemaId];
	    if (schId)
	        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
	}
	function checkAsyncSchema(it) {
	    if (it.schema.$async && !it.schemaEnv.$async)
	        throw new Error("async schema in sync schema");
	}
	function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
	    const msg = schema.$comment;
	    if (opts.$comment === true) {
	        gen.code((0, codegen_1._) `${names_1.default.self}.logger.log(${msg})`);
	    }
	    else if (typeof opts.$comment == "function") {
	        const schemaPath = (0, codegen_1.str) `${errSchemaPath}/$comment`;
	        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
	        gen.code((0, codegen_1._) `${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
	    }
	}
	function returnResults(it) {
	    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
	    if (schemaEnv.$async) {
	        // TODO assign unevaluated
	        gen.if((0, codegen_1._) `${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._) `new ${ValidationError}(${names_1.default.vErrors})`));
	    }
	    else {
	        gen.assign((0, codegen_1._) `${validateName}.errors`, names_1.default.vErrors);
	        if (opts.unevaluated)
	            assignEvaluated(it);
	        gen.return((0, codegen_1._) `${names_1.default.errors} === 0`);
	    }
	}
	function assignEvaluated({ gen, evaluated, props, items }) {
	    if (props instanceof codegen_1.Name)
	        gen.assign((0, codegen_1._) `${evaluated}.props`, props);
	    if (items instanceof codegen_1.Name)
	        gen.assign((0, codegen_1._) `${evaluated}.items`, items);
	}
	function schemaKeywords(it, types, typeErrors, errsCount) {
	    const { gen, schema, data, allErrors, opts, self } = it;
	    const { RULES } = self;
	    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
	        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition)); // TODO typecast
	        return;
	    }
	    if (!opts.jtd)
	        checkStrictTypes(it, types);
	    gen.block(() => {
	        for (const group of RULES.rules)
	            groupKeywords(group);
	        groupKeywords(RULES.post);
	    });
	    function groupKeywords(group) {
	        if (!(0, applicability_1.shouldUseGroup)(schema, group))
	            return;
	        if (group.type) {
	            gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
	            iterateKeywords(it, group);
	            if (types.length === 1 && types[0] === group.type && typeErrors) {
	                gen.else();
	                (0, dataType_2.reportTypeError)(it);
	            }
	            gen.endIf();
	        }
	        else {
	            iterateKeywords(it, group);
	        }
	        // TODO make it "ok" call?
	        if (!allErrors)
	            gen.if((0, codegen_1._) `${names_1.default.errors} === ${errsCount || 0}`);
	    }
	}
	function iterateKeywords(it, group) {
	    const { gen, schema, opts: { useDefaults }, } = it;
	    if (useDefaults)
	        (0, defaults_1.assignDefaults)(it, group.type);
	    gen.block(() => {
	        for (const rule of group.rules) {
	            if ((0, applicability_1.shouldUseRule)(schema, rule)) {
	                keywordCode(it, rule.keyword, rule.definition, group.type);
	            }
	        }
	    });
	}
	function checkStrictTypes(it, types) {
	    if (it.schemaEnv.meta || !it.opts.strictTypes)
	        return;
	    checkContextTypes(it, types);
	    if (!it.opts.allowUnionTypes)
	        checkMultipleTypes(it, types);
	    checkKeywordTypes(it, it.dataTypes);
	}
	function checkContextTypes(it, types) {
	    if (!types.length)
	        return;
	    if (!it.dataTypes.length) {
	        it.dataTypes = types;
	        return;
	    }
	    types.forEach((t) => {
	        if (!includesType(it.dataTypes, t)) {
	            strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
	        }
	    });
	    narrowSchemaTypes(it, types);
	}
	function checkMultipleTypes(it, ts) {
	    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
	        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
	    }
	}
	function checkKeywordTypes(it, ts) {
	    const rules = it.self.RULES.all;
	    for (const keyword in rules) {
	        const rule = rules[keyword];
	        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
	            const { type } = rule.definition;
	            if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
	                strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
	            }
	        }
	    }
	}
	function hasApplicableType(schTs, kwdT) {
	    return schTs.includes(kwdT) || (kwdT === "number" && schTs.includes("integer"));
	}
	function includesType(ts, t) {
	    return ts.includes(t) || (t === "integer" && ts.includes("number"));
	}
	function narrowSchemaTypes(it, withTypes) {
	    const ts = [];
	    for (const t of it.dataTypes) {
	        if (includesType(withTypes, t))
	            ts.push(t);
	        else if (withTypes.includes("integer") && t === "number")
	            ts.push("integer");
	    }
	    it.dataTypes = ts;
	}
	function strictTypesError(it, msg) {
	    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
	    msg += ` at "${schemaPath}" (strictTypes)`;
	    (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
	}
	class KeywordCxt {
	    constructor(it, def, keyword) {
	        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
	        this.gen = it.gen;
	        this.allErrors = it.allErrors;
	        this.keyword = keyword;
	        this.data = it.data;
	        this.schema = it.schema[keyword];
	        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
	        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
	        this.schemaType = def.schemaType;
	        this.parentSchema = it.schema;
	        this.params = {};
	        this.it = it;
	        this.def = def;
	        if (this.$data) {
	            this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
	        }
	        else {
	            this.schemaCode = this.schemaValue;
	            if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
	                throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
	            }
	        }
	        if ("code" in def ? def.trackErrors : def.errors !== false) {
	            this.errsCount = it.gen.const("_errs", names_1.default.errors);
	        }
	    }
	    result(condition, successAction, failAction) {
	        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
	    }
	    failResult(condition, successAction, failAction) {
	        this.gen.if(condition);
	        if (failAction)
	            failAction();
	        else
	            this.error();
	        if (successAction) {
	            this.gen.else();
	            successAction();
	            if (this.allErrors)
	                this.gen.endIf();
	        }
	        else {
	            if (this.allErrors)
	                this.gen.endIf();
	            else
	                this.gen.else();
	        }
	    }
	    pass(condition, failAction) {
	        this.failResult((0, codegen_1.not)(condition), undefined, failAction);
	    }
	    fail(condition) {
	        if (condition === undefined) {
	            this.error();
	            if (!this.allErrors)
	                this.gen.if(false); // this branch will be removed by gen.optimize
	            return;
	        }
	        this.gen.if(condition);
	        this.error();
	        if (this.allErrors)
	            this.gen.endIf();
	        else
	            this.gen.else();
	    }
	    fail$data(condition) {
	        if (!this.$data)
	            return this.fail(condition);
	        const { schemaCode } = this;
	        this.fail((0, codegen_1._) `${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
	    }
	    error(append, errorParams, errorPaths) {
	        if (errorParams) {
	            this.setParams(errorParams);
	            this._error(append, errorPaths);
	            this.setParams({});
	            return;
	        }
	        this._error(append, errorPaths);
	    }
	    _error(append, errorPaths) {
	        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
	    }
	    $dataError() {
	        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
	    }
	    reset() {
	        if (this.errsCount === undefined)
	            throw new Error('add "trackErrors" to keyword definition');
	        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
	    }
	    ok(cond) {
	        if (!this.allErrors)
	            this.gen.if(cond);
	    }
	    setParams(obj, assign) {
	        if (assign)
	            Object.assign(this.params, obj);
	        else
	            this.params = obj;
	    }
	    block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
	        this.gen.block(() => {
	            this.check$data(valid, $dataValid);
	            codeBlock();
	        });
	    }
	    check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
	        if (!this.$data)
	            return;
	        const { gen, schemaCode, schemaType, def } = this;
	        gen.if((0, codegen_1.or)((0, codegen_1._) `${schemaCode} === undefined`, $dataValid));
	        if (valid !== codegen_1.nil)
	            gen.assign(valid, true);
	        if (schemaType.length || def.validateSchema) {
	            gen.elseIf(this.invalid$data());
	            this.$dataError();
	            if (valid !== codegen_1.nil)
	                gen.assign(valid, false);
	        }
	        gen.else();
	    }
	    invalid$data() {
	        const { gen, schemaCode, schemaType, def, it } = this;
	        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
	        function wrong$DataType() {
	            if (schemaType.length) {
	                /* istanbul ignore if */
	                if (!(schemaCode instanceof codegen_1.Name))
	                    throw new Error("ajv implementation error");
	                const st = Array.isArray(schemaType) ? schemaType : [schemaType];
	                return (0, codegen_1._) `${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
	            }
	            return codegen_1.nil;
	        }
	        function invalid$DataSchema() {
	            if (def.validateSchema) {
	                const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema }); // TODO value.code for standalone
	                return (0, codegen_1._) `!${validateSchemaRef}(${schemaCode})`;
	            }
	            return codegen_1.nil;
	        }
	    }
	    subschema(appl, valid) {
	        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
	        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
	        (0, subschema_1.extendSubschemaMode)(subschema, appl);
	        const nextContext = { ...this.it, ...subschema, items: undefined, props: undefined };
	        subschemaCode(nextContext, valid);
	        return nextContext;
	    }
	    mergeEvaluated(schemaCxt, toName) {
	        const { it, gen } = this;
	        if (!it.opts.unevaluated)
	            return;
	        if (it.props !== true && schemaCxt.props !== undefined) {
	            it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
	        }
	        if (it.items !== true && schemaCxt.items !== undefined) {
	            it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
	        }
	    }
	    mergeValidEvaluated(schemaCxt, valid) {
	        const { it, gen } = this;
	        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
	            gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
	            return true;
	        }
	    }
	}
	validate.KeywordCxt = KeywordCxt;
	function keywordCode(it, keyword, def, ruleType) {
	    const cxt = new KeywordCxt(it, def, keyword);
	    if ("code" in def) {
	        def.code(cxt, ruleType);
	    }
	    else if (cxt.$data && def.validate) {
	        (0, keyword_1.funcKeywordCode)(cxt, def);
	    }
	    else if ("macro" in def) {
	        (0, keyword_1.macroKeywordCode)(cxt, def);
	    }
	    else if (def.compile || def.validate) {
	        (0, keyword_1.funcKeywordCode)(cxt, def);
	    }
	}
	const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
	const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function getData($data, { dataLevel, dataNames, dataPathArr }) {
	    let jsonPointer;
	    let data;
	    if ($data === "")
	        return names_1.default.rootData;
	    if ($data[0] === "/") {
	        if (!JSON_POINTER.test($data))
	            throw new Error(`Invalid JSON-pointer: ${$data}`);
	        jsonPointer = $data;
	        data = names_1.default.rootData;
	    }
	    else {
	        const matches = RELATIVE_JSON_POINTER.exec($data);
	        if (!matches)
	            throw new Error(`Invalid JSON-pointer: ${$data}`);
	        const up = +matches[1];
	        jsonPointer = matches[2];
	        if (jsonPointer === "#") {
	            if (up >= dataLevel)
	                throw new Error(errorMsg("property/index", up));
	            return dataPathArr[dataLevel - up];
	        }
	        if (up > dataLevel)
	            throw new Error(errorMsg("data", up));
	        data = dataNames[dataLevel - up];
	        if (!jsonPointer)
	            return data;
	    }
	    let expr = data;
	    const segments = jsonPointer.split("/");
	    for (const segment of segments) {
	        if (segment) {
	            data = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
	            expr = (0, codegen_1._) `${expr} && ${data}`;
	        }
	    }
	    return expr;
	    function errorMsg(pointerType, up) {
	        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
	    }
	}
	validate.getData = getData;
	
	return validate;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist.exports;
	hasRequiredDist = 1;
	(function (module, exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		const ajv_1 = Ajv;
		const codegen_1 = requireCodegen();
		const code_1 = requireCode$1();
		const validate_1 = requireValidate();
		const errors_1 = requireErrors();
		const names_1 = requireNames();
		const keyword = "errorMessage";
		const used = new ajv_1.Name("emUsed");
		const KEYWORD_PROPERTY_PARAMS = {
		    required: "missingProperty",
		    dependencies: "property",
		    dependentRequired: "property",
		};
		const INTERPOLATION = /\$\{[^}]+\}/;
		const INTERPOLATION_REPLACE = /\$\{([^}]+)\}/g;
		const EMPTY_STR = /^""\s*\+\s*|\s*\+\s*""$/g;
		function errorMessage(options) {
		    return {
		        keyword,
		        schemaType: ["string", "object"],
		        post: true,
		        code(cxt) {
		            const { gen, data, schema, schemaValue, it } = cxt;
		            if (it.createErrors === false)
		                return;
		            const sch = schema;
		            const instancePath = codegen_1.strConcat(names_1.default.instancePath, it.errorPath);
		            gen.if(ajv_1._ `${names_1.default.errors} > 0`, () => {
		                if (typeof sch == "object") {
		                    const [kwdPropErrors, kwdErrors] = keywordErrorsConfig(sch);
		                    if (kwdErrors)
		                        processKeywordErrors(kwdErrors);
		                    if (kwdPropErrors)
		                        processKeywordPropErrors(kwdPropErrors);
		                    processChildErrors(childErrorsConfig(sch));
		                }
		                const schMessage = typeof sch == "string" ? sch : sch._;
		                if (schMessage)
		                    processAllErrors(schMessage);
		                if (!options.keepErrors)
		                    removeUsedErrors();
		            });
		            function childErrorsConfig({ properties, items }) {
		                const errors = {};
		                if (properties) {
		                    errors.props = {};
		                    for (const p in properties)
		                        errors.props[p] = [];
		                }
		                if (items) {
		                    errors.items = {};
		                    for (let i = 0; i < items.length; i++)
		                        errors.items[i] = [];
		                }
		                return errors;
		            }
		            function keywordErrorsConfig(emSchema) {
		                let propErrors;
		                let errors;
		                for (const k in emSchema) {
		                    if (k === "properties" || k === "items")
		                        continue;
		                    const kwdSch = emSchema[k];
		                    if (typeof kwdSch == "object") {
		                        propErrors || (propErrors = {});
		                        const errMap = (propErrors[k] = {});
		                        for (const p in kwdSch)
		                            errMap[p] = [];
		                    }
		                    else {
		                        errors || (errors = {});
		                        errors[k] = [];
		                    }
		                }
		                return [propErrors, errors];
		            }
		            function processKeywordErrors(kwdErrors) {
		                const kwdErrs = gen.const("emErrors", ajv_1.stringify(kwdErrors));
		                const templates = gen.const("templates", getTemplatesCode(kwdErrors, schema));
		                gen.forOf("err", names_1.default.vErrors, (err) => gen.if(matchKeywordError(err, kwdErrs), () => gen.code(ajv_1._ `${kwdErrs}[${err}.keyword].push(${err})`).assign(ajv_1._ `${err}.${used}`, true)));
		                const { singleError } = options;
		                if (singleError) {
		                    const message = gen.let("message", ajv_1._ `""`);
		                    const paramsErrors = gen.let("paramsErrors", ajv_1._ `[]`);
		                    loopErrors((key) => {
		                        gen.if(message, () => gen.code(ajv_1._ `${message} += ${typeof singleError == "string" ? singleError : ";"}`));
		                        gen.code(ajv_1._ `${message} += ${errMessage(key)}`);
		                        gen.assign(paramsErrors, ajv_1._ `${paramsErrors}.concat(${kwdErrs}[${key}])`);
		                    });
		                    errors_1.reportError(cxt, { message, params: ajv_1._ `{errors: ${paramsErrors}}` });
		                }
		                else {
		                    loopErrors((key) => errors_1.reportError(cxt, {
		                        message: errMessage(key),
		                        params: ajv_1._ `{errors: ${kwdErrs}[${key}]}`,
		                    }));
		                }
		                function loopErrors(body) {
		                    gen.forIn("key", kwdErrs, (key) => gen.if(ajv_1._ `${kwdErrs}[${key}].length`, () => body(key)));
		                }
		                function errMessage(key) {
		                    return ajv_1._ `${key} in ${templates} ? ${templates}[${key}]() : ${schemaValue}[${key}]`;
		                }
		            }
		            function processKeywordPropErrors(kwdPropErrors) {
		                const kwdErrs = gen.const("emErrors", ajv_1.stringify(kwdPropErrors));
		                const templatesCode = [];
		                for (const k in kwdPropErrors) {
		                    templatesCode.push([
		                        k,
		                        getTemplatesCode(kwdPropErrors[k], schema[k]),
		                    ]);
		                }
		                const templates = gen.const("templates", gen.object(...templatesCode));
		                const kwdPropParams = gen.scopeValue("obj", {
		                    ref: KEYWORD_PROPERTY_PARAMS,
		                    code: ajv_1.stringify(KEYWORD_PROPERTY_PARAMS),
		                });
		                const propParam = gen.let("emPropParams");
		                const paramsErrors = gen.let("emParamsErrors");
		                gen.forOf("err", names_1.default.vErrors, (err) => gen.if(matchKeywordError(err, kwdErrs), () => {
		                    gen.assign(propParam, ajv_1._ `${kwdPropParams}[${err}.keyword]`);
		                    gen.assign(paramsErrors, ajv_1._ `${kwdErrs}[${err}.keyword][${err}.params[${propParam}]]`);
		                    gen.if(paramsErrors, () => gen.code(ajv_1._ `${paramsErrors}.push(${err})`).assign(ajv_1._ `${err}.${used}`, true));
		                }));
		                gen.forIn("key", kwdErrs, (key) => gen.forIn("keyProp", ajv_1._ `${kwdErrs}[${key}]`, (keyProp) => {
		                    gen.assign(paramsErrors, ajv_1._ `${kwdErrs}[${key}][${keyProp}]`);
		                    gen.if(ajv_1._ `${paramsErrors}.length`, () => {
		                        const tmpl = gen.const("tmpl", ajv_1._ `${templates}[${key}] && ${templates}[${key}][${keyProp}]`);
		                        errors_1.reportError(cxt, {
		                            message: ajv_1._ `${tmpl} ? ${tmpl}() : ${schemaValue}[${key}][${keyProp}]`,
		                            params: ajv_1._ `{errors: ${paramsErrors}}`,
		                        });
		                    });
		                }));
		            }
		            function processChildErrors(childErrors) {
		                const { props, items } = childErrors;
		                if (!props && !items)
		                    return;
		                const isObj = ajv_1._ `typeof ${data} == "object"`;
		                const isArr = ajv_1._ `Array.isArray(${data})`;
		                const childErrs = gen.let("emErrors");
		                let childKwd;
		                let childProp;
		                const templates = gen.let("templates");
		                if (props && items) {
		                    childKwd = gen.let("emChildKwd");
		                    gen.if(isObj);
		                    gen.if(isArr, () => {
		                        init(items, schema.items);
		                        gen.assign(childKwd, ajv_1.str `items`);
		                    }, () => {
		                        init(props, schema.properties);
		                        gen.assign(childKwd, ajv_1.str `properties`);
		                    });
		                    childProp = ajv_1._ `[${childKwd}]`;
		                }
		                else if (items) {
		                    gen.if(isArr);
		                    init(items, schema.items);
		                    childProp = ajv_1._ `.items`;
		                }
		                else if (props) {
		                    gen.if(codegen_1.and(isObj, codegen_1.not(isArr)));
		                    init(props, schema.properties);
		                    childProp = ajv_1._ `.properties`;
		                }
		                gen.forOf("err", names_1.default.vErrors, (err) => ifMatchesChildError(err, childErrs, (child) => gen.code(ajv_1._ `${childErrs}[${child}].push(${err})`).assign(ajv_1._ `${err}.${used}`, true)));
		                gen.forIn("key", childErrs, (key) => gen.if(ajv_1._ `${childErrs}[${key}].length`, () => {
		                    errors_1.reportError(cxt, {
		                        message: ajv_1._ `${key} in ${templates} ? ${templates}[${key}]() : ${schemaValue}${childProp}[${key}]`,
		                        params: ajv_1._ `{errors: ${childErrs}[${key}]}`,
		                    });
		                    gen.assign(ajv_1._ `${names_1.default.vErrors}[${names_1.default.errors}-1].instancePath`, ajv_1._ `${instancePath} + "/" + ${key}.replace(/~/g, "~0").replace(/\\//g, "~1")`);
		                }));
		                gen.endIf();
		                function init(children, msgs) {
		                    gen.assign(childErrs, ajv_1.stringify(children));
		                    gen.assign(templates, getTemplatesCode(children, msgs));
		                }
		            }
		            function processAllErrors(schMessage) {
		                const errs = gen.const("emErrs", ajv_1._ `[]`);
		                gen.forOf("err", names_1.default.vErrors, (err) => gen.if(matchAnyError(err), () => gen.code(ajv_1._ `${errs}.push(${err})`).assign(ajv_1._ `${err}.${used}`, true)));
		                gen.if(ajv_1._ `${errs}.length`, () => errors_1.reportError(cxt, {
		                    message: templateExpr(schMessage),
		                    params: ajv_1._ `{errors: ${errs}}`,
		                }));
		            }
		            function removeUsedErrors() {
		                const errs = gen.const("emErrs", ajv_1._ `[]`);
		                gen.forOf("err", names_1.default.vErrors, (err) => gen.if(ajv_1._ `!${err}.${used}`, () => gen.code(ajv_1._ `${errs}.push(${err})`)));
		                gen.assign(names_1.default.vErrors, errs).assign(names_1.default.errors, ajv_1._ `${errs}.length`);
		            }
		            function matchKeywordError(err, kwdErrs) {
		                return codegen_1.and(ajv_1._ `${err}.keyword !== ${keyword}`, ajv_1._ `!${err}.${used}`, ajv_1._ `${err}.instancePath === ${instancePath}`, ajv_1._ `${err}.keyword in ${kwdErrs}`, 
		                // TODO match the end of the string?
		                ajv_1._ `${err}.schemaPath.indexOf(${it.errSchemaPath}) === 0`, ajv_1._ `/^\\/[^\\/]*$/.test(${err}.schemaPath.slice(${it.errSchemaPath.length}))`);
		            }
		            function ifMatchesChildError(err, childErrs, thenBody) {
		                gen.if(codegen_1.and(ajv_1._ `${err}.keyword !== ${keyword}`, ajv_1._ `!${err}.${used}`, ajv_1._ `${err}.instancePath.indexOf(${instancePath}) === 0`), () => {
		                    const childRegex = gen.scopeValue("pattern", {
		                        ref: /^\/([^/]*)(?:\/|$)/,
		                        code: ajv_1._ `new RegExp("^\\\/([^/]*)(?:\\\/|$)")`,
		                    });
		                    const matches = gen.const("emMatches", ajv_1._ `${childRegex}.exec(${err}.instancePath.slice(${instancePath}.length))`);
		                    const child = gen.const("emChild", ajv_1._ `${matches} && ${matches}[1].replace(/~1/g, "/").replace(/~0/g, "~")`);
		                    gen.if(ajv_1._ `${child} !== undefined && ${child} in ${childErrs}`, () => thenBody(child));
		                });
		            }
		            function matchAnyError(err) {
		                return codegen_1.and(ajv_1._ `${err}.keyword !== ${keyword}`, ajv_1._ `!${err}.${used}`, codegen_1.or(ajv_1._ `${err}.instancePath === ${instancePath}`, codegen_1.and(ajv_1._ `${err}.instancePath.indexOf(${instancePath}) === 0`, ajv_1._ `${err}.instancePath[${instancePath}.length] === "/"`)), ajv_1._ `${err}.schemaPath.indexOf(${it.errSchemaPath}) === 0`, ajv_1._ `${err}.schemaPath[${it.errSchemaPath}.length] === "/"`);
		            }
		            function getTemplatesCode(keys, msgs) {
		                const templatesCode = [];
		                for (const k in keys) {
		                    const msg = msgs[k];
		                    if (INTERPOLATION.test(msg))
		                        templatesCode.push([k, templateFunc(msg)]);
		                }
		                return gen.object(...templatesCode);
		            }
		            function templateExpr(msg) {
		                if (!INTERPOLATION.test(msg))
		                    return ajv_1.stringify(msg);
		                return new code_1._Code(code_1.safeStringify(msg)
		                    .replace(INTERPOLATION_REPLACE, (_s, ptr) => `" + JSON.stringify(${validate_1.getData(ptr, it)}) + "`)
		                    .replace(EMPTY_STR, ""));
		            }
		            function templateFunc(msg) {
		                return ajv_1._ `function(){return ${templateExpr(msg)}}`;
		            }
		        },
		        metaSchema: {
		            anyOf: [
		                { type: "string" },
		                {
		                    type: "object",
		                    properties: {
		                        properties: { $ref: "#/$defs/stringMap" },
		                        items: { $ref: "#/$defs/stringList" },
		                        required: { $ref: "#/$defs/stringOrMap" },
		                        dependencies: { $ref: "#/$defs/stringOrMap" },
		                    },
		                    additionalProperties: { type: "string" },
		                },
		            ],
		            $defs: {
		                stringMap: {
		                    type: "object",
		                    additionalProperties: { type: "string" },
		                },
		                stringOrMap: {
		                    anyOf: [{ type: "string" }, { $ref: "#/$defs/stringMap" }],
		                },
		                stringList: { type: "array", items: { type: "string" } },
		            },
		        },
		    };
		}
		const ajvErrors = (ajv, options = {}) => {
		    if (!ajv.opts.allErrors)
		        throw new Error("ajv-errors: Ajv option allErrors must be true");
		    if (ajv.opts.jsPropertySyntax) {
		        throw new Error("ajv-errors: ajv option jsPropertySyntax is not supported");
		    }
		    return ajv.addKeyword(errorMessage(options));
		};
		exports.default = ajvErrors;
		module.exports = ajvErrors;
		module.exports.default = ajvErrors;
		
	} (dist, dist.exports));
	return dist.exports;
}

var distExports = requireDist();
var addErrors = /*@__PURE__*/getDefaultExportFromCjs(distExports);

const $isDefined = {
	name: "$isDefined",
	apply: (_, inputData) => inputData !== undefined,
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$isDefined evaluate form requires array operand: [value]",
			);
		}

		const [value] = operand;
		return value !== undefined;
	},
};

const $ensurePath = {
	name: "$ensurePath",
	apply: (operand, inputData) => {
		const go = (curValue, paths, used = []) => {
			if (paths.length === 0) return;

			const [head, ...tail] = paths;
			if (!(head in curValue)) {
				throw new Error(
					`"${head}" was not found along the path ${used.join(".")}`,
				);
			}

			go(curValue[head], tail, [...used, head]);
		};

		go(inputData, operand.split("."));
		return inputData;
	},
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$ensurePath evaluate form requires array operand: [object, path]",
			);
		}

		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $get = {
	name: "$get",
	apply: (operand, inputData) => get(inputData, operand),
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$get evaluate form requires array operand: [object, path]",
			);
		}

		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $literal = {
	name: "$literal",
	apply: (operand) => operand,
	evaluate: () => {
		throw new Error("handled in expressions.js");
	},
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({ $literal: operand }),
};

const $debug = {
	name: "$debug",
	apply: (evaluatedOperand) => {
		console.log(evaluatedOperand);
		return evaluatedOperand;
	},
	evaluate(evaluatedOperand) {
		console.log(evaluatedOperand);
		return evaluatedOperand;
	},
};

const $compose = {
	name: "$compose",
	apply: (operand, inputData, { apply, isExpression }) =>
		operand.reduceRight((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: ([exprs, init], { apply }) => apply({ $compose: exprs }, init),
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$compose: operand,
	}),
};

const $pipe = {
	name: "$pipe",
	apply: (operand, inputData, { apply, isExpression }) =>
		operand.reduce((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: ([exprs, init], { apply }) => apply({ $pipe: exprs }, init),
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$pipe: operand,
	}),
};

const coreDefinitions = {
	$compose,
	$debug,
	$get,
	$isDefined,
	$literal,
	$pipe,
	$ensurePath,
};

const $count = {
	name: "$count",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.length,
};

const $max = {
	name: "$max",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((max, v) => Math.max(max, v)),
};

const $min = {
	name: "$min",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((min, v) => Math.min(min, v)),
};

const $sum = {
	name: "$sum",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.reduce((sum, v) => sum + v, 0),
};

const $mean = {
	name: "$mean",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((sum, v) => sum + v, 0) / operand.length,
};

const $median = {
	name: "$median",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const sorted = [...operand].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	},
};

const $mode = {
	name: "$mode",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const frequency = {};
		let maxCount = 0;
		let modes = [];

		// Count frequencies
		for (const value of operand) {
			frequency[value] = (frequency[value] ?? 0) + 1;
			if (frequency[value] > maxCount) {
				maxCount = frequency[value];
				modes = [value];
			} else if (frequency[value] === maxCount && !modes.includes(value)) {
				modes.push(value);
			}
		}

		// Return single mode if only one, array if multiple, or undefined if all values appear once
		return maxCount === 1
			? undefined
			: modes.length === 1
				? modes[0]
				: modes.sort((a, b) => a - b);
	},
};

const aggregativeDefinitions = {
	$count,
	$max,
	$mean,
	$median,
	$min,
	$mode,
	$sum,
};

const createComparativeWhereCompiler =
	(exprName) =>
	(operand, { attribute }) =>
		attribute
			? { $pipe: [{ $get: attribute }, { [exprName]: operand }] }
			: { [exprName]: operand };

const $eq = {
	name: "$eq",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$eq"),
};

const $ne = {
	name: "$ne",
	apply: (operand, inputData) => !isEqual(operand, inputData),
	evaluate: ([left, right]) => !isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$ne"),
};

const $gt = {
	name: "$gt",
	apply: (operand, inputData) => inputData > operand,
	evaluate: ([left, right]) => left > right,
	normalizeWhere: createComparativeWhereCompiler("$gt"),
};

const $gte = {
	name: "$gte",
	apply: (operand, inputData) => inputData >= operand,
	evaluate: ([left, right]) => left >= right,
	normalizeWhere: createComparativeWhereCompiler("$gte"),
};

const $lt = {
	name: "$lt",
	apply: (operand, inputData) => inputData < operand,
	evaluate: ([left, right]) => left < right,
	normalizeWhere: createComparativeWhereCompiler("$lt"),
};

const $lte = {
	name: "$lte",
	apply: (operand, inputData) => inputData <= operand,
	evaluate: ([left, right]) => left <= right,
	normalizeWhere: createComparativeWhereCompiler("$lte"),
};

const $in = {
	name: "$in",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$in parameter must be an array");
		}
		return operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$in"),
};

const $nin = {
	name: "$nin",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$nin parameter must be an array");
		}
		return !operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$nin"),
};

/**
 * Tests if a string matches a regular expression pattern.
 *
 * **Uses PCRE (Perl Compatible Regular Expression) semantics** as the canonical standard
 * for consistent behavior across all Data Prism store implementations.
 *
 * Supports inline flags using the syntax (?flags)pattern where flags can be:
 * - i: case insensitive matching
 * - m: multiline mode (^ and $ match line boundaries)
 * - s: dotall mode (. matches newlines)
 *
 * PCRE defaults (when no flags specified):
 * - Case-sensitive matching
 * - ^ and $ match string boundaries (not line boundaries)
 * - . does not match newlines
 *
 * @example
 * // Basic pattern matching
 * apply("hello", "hello world") // true
 * apply("\\d+", "abc123") // true
 *
 * @example
 * // With inline flags
 * apply("(?i)hello", "HELLO WORLD") // true (case insensitive)
 * apply("(?m)^line2", "line1\nline2") // true (multiline)
 * apply("(?s)hello.world", "hello\nworld") // true (dotall)
 * apply("(?ims)^hello.world$", "HELLO\nWORLD") // true (combined flags)
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesRegex: "^[A-Z].*" } } // Names starting with capital letter
 * { email: { $matchesRegex: "(?i).*@example\\.com$" } } // Case-insensitive email domain check
 */
const $matchesRegex = {
	name: "$matchesRegex",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesRegex requires string input");
		}

		// Extract inline flags and clean pattern
		const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
		if (flagMatch) {
			const [, flags, pattern] = flagMatch;
			let jsFlags = "";

			// PCRE flag mapping - JavaScript RegExp aligns well with PCRE semantics
			if (flags.includes("i")) {
				jsFlags += "i";
			}
			if (flags.includes("m")) {
				jsFlags += "m";
			}
			if (flags.includes("s")) {
				jsFlags += "s";
			}

			const regex = new RegExp(pattern, jsFlags);
			return regex.test(inputData);
		}

		// Check for unsupported inline flags and strip them
		const unsupportedFlagMatch = operand.match(/^\(\?[^)]*\)(.*)/);
		if (unsupportedFlagMatch) {
			// Unsupported flags detected, use pattern without flags (PCRE defaults)
			const [, pattern] = unsupportedFlagMatch;
			const regex = new RegExp(pattern);
			return regex.test(inputData);
		}

		// No inline flags - use PCRE defaults
		// ^ and $ match string boundaries, . doesn't match newlines, case-sensitive
		const regex = new RegExp(operand);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesRegex"),
};

/**
 * Tests if a string matches a SQL LIKE pattern.
 *
 * Provides database-agnostic LIKE pattern matching with SQL standard semantics:
 * - % matches any sequence of characters (including none)
 * - _ matches exactly one character
 * - Case-sensitive matching (consistent across databases)
 *
 * @example
 * // Basic LIKE patterns
 * apply("hello%", "hello world") // true
 * apply("%world", "hello world") // true
 * apply("h_llo", "hello") // true
 * apply("h_llo", "hallo") // true
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesLike: "John%" } } // Names starting with "John"
 * { email: { $matchesLike: "%@gmail.com" } } // Gmail addresses
 * { code: { $matchesLike: "A_B_" } } // Codes like "A1B2", "AXBY"
 */
const $matchesLike = {
	name: "$matchesLike",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesLike requires string input");
		}

		// Convert SQL LIKE pattern to JavaScript regex
		// Escape regex special characters except % and _
		let regexPattern = operand
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
			.replace(/%/g, ".*") // % becomes .*
			.replace(/_/g, "."); // _ becomes .

		// Anchor the pattern to match the entire string
		regexPattern = "^" + regexPattern + "$";

		const regex = new RegExp(regexPattern);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesLike"),
};

/**
 * Tests if a string matches a Unix shell GLOB pattern.
 *
 * Provides database-agnostic GLOB pattern matching with Unix shell semantics:
 * - * matches any sequence of characters (including none)
 * - ? matches exactly one character
 * - [chars] matches any single character in the set
 * - [!chars] or [^chars] matches any character not in the set
 * - Case-sensitive matching
 *
 * @example
 * // Basic GLOB patterns
 * apply("hello*", "hello world") // true
 * apply("*world", "hello world") // true
 * apply("h?llo", "hello") // true
 * apply("h?llo", "hallo") // true
 * apply("[hw]ello", "hello") // true
 * apply("[hw]ello", "wello") // true
 * apply("[!hw]ello", "bello") // true
 *
 * @example
 * // In WHERE clauses
 * { filename: { $matchesGlob: "*.txt" } } // Text files
 * { name: { $matchesGlob: "[A-Z]*" } } // Names starting with capital
 * { code: { $matchesGlob: "IMG_[0-9][0-9][0-9][0-9]" } } // Image codes
 */
const $matchesGlob = {
	name: "$matchesGlob",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesGlob requires string input");
		}

		// Convert GLOB pattern to JavaScript regex
		let regexPattern = "";
		let i = 0;

		while (i < operand.length) {
			const char = operand[i];

			if (char === "*") {
				regexPattern += ".*";
			} else if (char === "?") {
				regexPattern += ".";
			} else if (char === "[") {
				// Handle character classes
				let j = i + 1;
				let isNegated = false;

				// Check for negation
				if (j < operand.length && (operand[j] === "!" || operand[j] === "^")) {
					isNegated = true;
					j++;
				}

				// Find the closing bracket
				let classContent = "";
				while (j < operand.length && operand[j] !== "]") {
					classContent += operand[j];
					j++;
				}

				if (j < operand.length) {
					// Valid character class
					regexPattern +=
						"[" +
						(isNegated ? "^" : "") +
						classContent.replace(/\\/g, "\\\\") +
						"]";
					i = j;
				} else {
					// No closing bracket, treat as literal
					regexPattern += "\\[";
				}
			} else {
				// Escape regex special characters
				regexPattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			}
			i++;
		}

		// Anchor the pattern to match the entire string
		regexPattern = "^" + regexPattern + "$";

		const regex = new RegExp(regexPattern);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesGlob"),
};

const comparativeDefinitions = {
	$eq,
	$gt,
	$gte,
	$lt,
	$lte,
	$ne,
	$in,
	$nin,
	$matchesRegex,
	$matchesLike,
	$matchesGlob,
};

const $if = {
	name: "$if",
	apply: (operand, inputData, { apply, isExpression }) => {
		if (
			!isExpression(operand.if) &&
			operand.if !== true &&
			operand.if !== false
		) {
			throw new Error('"if" must be an expression, true, or false');
		}

		const outcome = apply(operand.if, inputData) ? operand.then : operand.else;
		return isExpression(outcome) ? apply(outcome, inputData) : outcome;
	},
	evaluate: (operand, { evaluate }) => {
		const conditionResult =
			typeof operand.if === "boolean" ? operand.if : evaluate(operand.if);
		const outcome = conditionResult ? operand.then : operand.else;
		return typeof outcome === "object" && outcome !== null
			? evaluate(outcome)
			: outcome;
	},
	controlsEvaluation: true,
	normalizeWhere: (operand, context) => ({
		$if: {
			if: context.normalizeWhere(operand.if, null),
			then:
				typeof operand.then === "object" && operand.then !== null
					? context.normalizeWhere(operand.then, context)
					: operand.then,
			else:
				typeof operand.else === "object" && operand.else !== null
					? context.normalizeWhere(operand.else, context)
					: operand.else,
		},
	}),
};

const $case = {
	name: "$case",
	apply: (operand, inputData, { apply, isExpression }) => {
		// Evaluate the value once
		const value = isExpression(operand.value)
			? apply(operand.value, inputData)
			: operand.value;

		// Check each case
		for (const caseItem of operand.cases) {
			let matches = false;

			// Handle both simple equality and complex expressions
			if (isExpression(caseItem.when)) {
				// For expressions that access properties from the original object (like $get),
				// we need to evaluate with the original argument.
				// For comparison expressions, we typically want to evaluate with the value.
				const whenExpressionName = Object.keys(caseItem.when)[0];
				const evaluationContext =
					whenExpressionName === "$get" ? inputData : value;
				matches = apply(caseItem.when, evaluationContext);
			} else {
				// Simple equality comparison
				matches = value === caseItem.when;
			}

			if (matches) {
				return isExpression(caseItem.then)
					? apply(caseItem.then, inputData)
					: caseItem.then;
			}
		}

		// Return default if no case matches
		return isExpression(operand.default)
			? apply(operand.default, inputData)
			: operand.default;
	},
	evaluate(operand, context) {
		const [trueOperand, value] = operand;
		return this.apply(trueOperand, value, context);
	},
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$case: {
			value: operand.value,
			cases: operand.cases.map((caseItem) => ({
				when: caseItem.when,
				then: caseItem.then,
			})),
			default: operand.default,
		},
	}),
};

const conditionalDefinitions = { $if, $case };

const $random = {
	name: "$random",
	apply: (operand = {}) => {
		const { min = 0, max = 1, precision = null } = operand;
		const value = Math.random() * (max - min) + min;

		if (precision == null) {
			return value;
		}

		if (precision >= 0) {
			// Positive precision: decimal places
			return Number(value.toFixed(precision));
		} else {
			// Negative precision: round to 10^(-precision)
			const factor = Math.pow(10, -precision);
			return Math.round(value / factor) * factor;
		}
	},
	evaluate(operand = {}) {
		return this.apply(operand);
	},
};

const $uuid = {
	name: "$uuid",
	apply: () => crypto.randomUUID(),
	evaluate: () => crypto.randomUUID(),
};

const generativeDefinitions = {
	$random,
	$uuid,
};

const $filter = {
	apply: (operand, inputData, { apply }) =>
		inputData.filter((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $filter: fn }, items);
	},
};

const $flatMap = {
	apply: (operand, inputData, { apply }) =>
		inputData.flatMap((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $flatMap: fn }, items);
	},
};

const $map = {
	apply: (operand, inputData, { apply }) =>
		inputData.map((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $map: fn }, items);
	},
};

const $any = {
	apply: (operand, inputData, { apply }) =>
		inputData.some((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $any: predicate }, array);
	},
};

const $all = {
	apply: (operand, inputData, { apply }) =>
		inputData.every((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $all: predicate }, array);
	},
};

const $find = {
	apply: (operand, inputData, { apply }) =>
		inputData.find((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $find: predicate }, array);
	},
};

const $concat = {
	apply: (operand, inputData) => inputData.concat(operand),
	evaluate([arrayToConcat, baseArray]) {
		return this.apply(arrayToConcat, baseArray);
	},
};

const $join = {
	apply: (operand, inputData) => inputData.join(operand),
	evaluate([separator, array]) {
		return this.apply(separator, array);
	},
};

const $reverse = {
	apply: (_, inputData) => inputData.slice().reverse(),
	evaluate(array) {
		return this.apply(null, array);
	},
};

const iterativeDefinitions = {
	$all,
	$any,
	$concat,
	$filter,
	$find,
	$flatMap,
	$join,
	$map,
	$reverse,
};

const $and = {
	name: "$and",
	apply: (operand, inputData, { apply }) =>
		operand.every((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.every(Boolean);
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$and: operand.map((pred) => normalizeWhere(pred, attribute)),
	}),
};

const $or = {
	name: "$or",
	apply: (operand, inputData, { apply }) =>
		operand.some((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.some(Boolean);
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$or: operand.map((pred) => normalizeWhere(pred, attribute)),
	}),
};

const $not = {
	name: "$not",
	apply: (operand, inputData, { apply }) => !apply(operand, inputData),
	controlsEvaluation: true,
	evaluate(operand, { evaluate }) {
		const value = typeof operand === "boolean" ? operand : evaluate(operand);
		return !value;
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$not: normalizeWhere(operand, attribute),
	}),
};

const logicalDefinitions = {
	$and,
	$not,
	$or,
};

const $nowLocal = {
	name: "$nowLocal",
	apply: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60)
			.toString()
			.padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	evaluate() {
		return this.apply();
	},
};

const $nowUTC = {
	name: "$nowUTC",
	apply: () => new Date().toISOString(),
	evaluate() {
		return this.apply();
	},
};

const $timestamp = {
	name: "$timestamp",
	apply: () => Date.now(),
	evaluate() {
		return this.apply();
	},
};

const temporalDefinitions = {
	$nowLocal,
	$nowUTC,
	$timestamp,
};

const $add = {
	name: "$add",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$add apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$add apply form requires number input data");
		}
		return inputData + operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error("$add evaluate form requires array of exactly 2 numbers");
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error("$add evaluate form requires array of exactly 2 numbers");
		}
		return operand[0] + operand[1];
	},
};

const $subtract = {
	name: "$subtract",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$subtract apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$subtract apply form requires number input data");
		}
		return inputData - operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		}
		return operand[0] - operand[1];
	},
};

const $multiply = {
	name: "$multiply",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$multiply apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$multiply apply form requires number input data");
		}
		return inputData * operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		}
		return operand[0] * operand[1];
	},
};

const $divide = {
	name: "$divide",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$divide apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$divide apply form requires number input data");
		}
		if (operand === 0) {
			throw new Error("Division by zero");
		}
		return inputData / operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		}
		if (operand[1] === 0) {
			throw new Error("Division by zero");
		}
		return operand[0] / operand[1];
	},
};

const $modulo = {
	name: "$modulo",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$modulo apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$modulo apply form requires number input data");
		}
		if (operand === 0) {
			throw new Error("Modulo by zero");
		}
		return inputData % operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		}
		if (operand[1] === 0) {
			throw new Error("Modulo by zero");
		}
		return operand[0] % operand[1];
	},
};

const mathDefinitions = {
	$add,
	$subtract,
	$multiply,
	$divide,
	$modulo,
};

/**
 * @typedef {object} ApplicativeExpression
 */

/**
 * @typedef {object} Expression
 */

/**
 * @typedef {object} WhereClause
 */

/**
 * @template Args, Input, Output
 * @typedef {object} Expression
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {string} [name]
 * @property {object} schema
 */

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 * @property {function(WhereClause): Expression} normalizeWhereClause
 */

/**
 * @template Args, Input, Output
 * @typedef {function(...any): Expression} FunctionExpression
 */

/**
 * @param {object} definitions
 * @returns {ExpressionEngine}
 */
function createExpressionEngine(customExpressions) {
	const expressions = { ...coreDefinitions, ...customExpressions }; // mutated later
	const isExpression = (val) => {
		const expressionKeys = new Set(Object.keys(expressions));

		return (
			val !== null &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			Object.keys(val).length === 1 &&
			expressionKeys.has(Object.keys(val)[0])
		);
	};

	const apply = (rootExpression, inputData) => {
		const step = (expression) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(step)
					: typeof expression === "object"
						? mapValues(expression, step)
						: expression;
			}

			const [expressionName, operand] = Object.entries(expression)[0];
			const expressionDef = expressions[expressionName];

			if (expressionDef.controlsEvaluation) {
				return expressionDef.apply(operand, inputData, { apply, isExpression });
			}

			const evaluatedOperand = step(operand);
			return expressionDef.apply(evaluatedOperand, inputData);
		};

		return step(rootExpression);
	};

	const evaluate = (expression) => {
		if (!isExpression(expression)) {
			return Array.isArray(expression)
				? expression.map(evaluate)
				: typeof expression === "object"
					? mapValues(expression, evaluate)
					: expression;
		}

		const [expressionName, operand] = Object.entries(expression)[0];

		// special case
		if (expressionName === "$literal") return expression[expressionName];

		const expressionDef = expressions[expressionName];
		if (expressionDef.controlsEvaluation) {
			return expressionDef.evaluate(operand, {
				apply,
				evaluate,
				isExpression,
			});
		}

		const evaluatedOperand = evaluate(operand);
		return expressionDef.evaluate(evaluatedOperand);
	};

	const normalizeWhereClause = (where) => {
		const compileNode = (node, attribute) => {
			if (Array.isArray(node)) {
				throw new Error(
					"Array found in where clause. Where clauses must be objects or expressions that test conditions.",
				);
			}

			if (typeof node === "object") {
				if (isExpression(node)) {
					const [expressionName, operand] = Object.entries(node)[0];
					const expression = expressions[expressionName];

					if (!("normalizeWhere" in expression)) {
						throw new Error(
							`Expression ${expressionName} cannot be used in where clauses. Where clauses require expressions that test conditions (comparisons like $eq, $gt or logical operators like $and, $or).`,
						);
					}

					return expression.normalizeWhere(operand, {
						attribute,
						normalizeWhere: compileNode,
					});
				}

				// not an expression
				return Object.entries(node).length === 1
					? compileNode(Object.entries(node)[0][1], Object.entries(node)[0][0])
					: {
							$and: Object.entries(node).map(([attr, value]) =>
								compileNode(value, attr),
							),
						};
			}

			return { $pipe: [{ $get: attribute }, { $eq: node }] };
		};

		return compileNode(where, null);
	};

	return {
		apply,
		evaluate,
		expressionNames: Object.keys(expressions),
		isExpression,
		normalizeWhereClause,
	};
}

const defaultExpressions = {
	...coreDefinitions,
	...aggregativeDefinitions,
	...comparativeDefinitions,
	...conditionalDefinitions,
	...generativeDefinitions,
	...iterativeDefinitions,
	...logicalDefinitions,
	...mathDefinitions,
	...temporalDefinitions,
};

const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);

/**
 * @typedef {Object} StandardError
 * @property {string} message
 * @property {string} path
 * @property {string} code
 * @property {string} value
 */


/**
 * Wraps a validation function so that if it returns any standardized errors, an Error is thrown.
 *
 * @param {Function} validationFn - Function that validates input and returns an array of error objects.
 * @returns {Function} Wrapped function that calls `validationFn` with the same arguments and throws
 * an Error if any errors are returned. The thrown Error will have its `cause` property set to the
 * original array of errors, and its message will be a comma-separated list of error messages.
 */
function ensure(validationFn) {
	return (...args) => {
		const errors = validationFn(...args);

		if (errors.length > 0) {
			throw new Error(errors.map((e) => e.message).join("\n"), {
				cause: errors,
			});
		}
	};
}

/**
 * Manages a cache with multiple objects for keys. The object references should be STABLE or this cache will do very little.
 *
 * @returns {Function} Function that takes each object as an argument. Returns a function with hit, value, and set.
 */
function createDeepCache() {
	const rootCache = new WeakMap();

	return (...rootKeys) => {
		const go = (keys, curCache) => {
			const [head, ...tail] = keys;

			if (tail.length === 0) {
				return {
					hit: curCache.has(head),
					value: curCache.get(head),
					set: (val) => curCache.set(head, val),
				};
			}

			let nextCache = curCache.get(head);
			if (!nextCache) {
				nextCache = new WeakMap();
				curCache.set(head, nextCache);
			}

			return go(tail, nextCache);
		};

		return go(rootKeys, rootCache);
	};
}

const errorKeywordFormatters = {
	enum: (error, dataVar) =>
		`${dataVar}${error.instancePath} ${error.message} (${error.params?.allowedValues?.join(", ")})`,
};

/**
 * Converts AJV validation errors to standardized errors.
 *
 * @param {import('ajv').DefinedError[]} ajvErrors
 * @param {*} [subject=null] - The data being validated against the schema.
 * @param {string} [dataVar="data"] - A prefix to add to error paths.
 * @returns {Object[]} Standardized error objects
 */
function translateAjvErrors(
	ajvErrors,
	subject = null,
	dataVar = "data",
) {
	const customErrors = ajvErrors.filter(
		(err) => err.keyword === "errorMessage",
	);
	const candidateErrors = customErrors.length > 0 ? customErrors : ajvErrors;
	const maxDepth = candidateErrors.reduce(
		(acc, err) => Math.max(acc, err.instancePath.split("/").length),
		-Infinity,
	);

	const topErrors = uniqBy(
		candidateErrors.filter(
			(err) => err.instancePath.split("/").length === maxDepth,
		),
		(err) => err.instancePath,
	);

	return topErrors.map((error) => ({
		...error,
		message: errorKeywordFormatters[error.keyword]
			? errorKeywordFormatters[error.keyword](error, dataVar)
			: `${dataVar}${error.instancePath} ${error.message}`,
		path: error.instancePath ?? error.schemaPath,
		code: error.keyword,
		value: get(subject, error.instancePath?.replaceAll("/", ".")?.slice(1)),
		otherErrors: ajvErrors,
	}));
}

var $schema$1 = "http://json-schema.org/draft-07/schema#";
var type$1 = "object";
var required$1 = [
	"type"
];
var $ref = "#/definitions/query";
var definitions$1 = {
	subquery: {
		type: "object",
		allOf: [
			{
				not: {
					required: [
						"id"
					]
				}
			},
			{
				$ref: "#/definitions/query"
			}
		]
	},
	query: {
		type: "object",
		required: [
			"select"
		],
		properties: {
			type: {
				type: "string"
			},
			select: {
				anyOf: [
					{
						$ref: "#/definitions/select"
					},
					{
					}
				]
			}
		}
	},
	selectObject: {
		type: "object",
		properties: {
			"*": {
			}
		},
		additionalProperties: {
			anyOf: [
				{
					type: "string"
				},
				{
					$ref: "#/definitions/subquery"
				}
			]
		}
	},
	select: {
		oneOf: [
			{
				type: "string"
			},
			{
				type: "array",
				items: {
					oneOf: [
						{
							type: "string"
						},
						{
							$ref: "#/definitions/selectObject"
						}
					]
				}
			},
			{
				$ref: "#/definitions/selectObject"
			}
		]
	}
};
var baseQuerySchema = {
	$schema: $schema$1,
	type: type$1,
	required: required$1,
	$ref: $ref,
	definitions: definitions$1
};

/**
 * @typedef {Object} Expression
 * @property {*} [key] - Dynamic expression properties
 */

/**
 * @typedef {Object} Query
 * @property {string} [id]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object|Object[]} [order] - Single order object or array of order objects
 * @property {Array|Object|string} select - Select clause: array, object, or "*"
 * @property {string} [type]
 * @property {Object} [where] - Where conditions
 */

/**
 * @typedef {Query} RootQuery
 * @property {string} type - Required type for root queries
 */

/**
 * @typedef {Query} NormalQuery
 * @property {Object} select - Normalized select object
 * @property {Object[]} [order] - Array of order objects
 * @property {string} type - Required type
 */

const getResourceSchemaCache = createDeepCache();
const getResourceSchemaEECache = createDeepCache();

let validateQueryShape;

const isExpressionLike = (obj) =>
	typeof obj === "object" &&
	!Array.isArray(obj) &&
	Object.keys(obj).length === 1 &&
	!obj.select;

const isValidAttribute = (attributeName, resourceSchema) =>
	attributeName in resourceSchema.attributes;

const createErrorReporter =
	(pathPrefix = "query") =>
	(message, path, value) => ({
		message: `[${pathPrefix}/${path.join("/")}] ${message}`,
		value,
	});

function getResourceStructureValidator(schema, resourceType, expressionEngine) {
	let resourceSchemaCache = expressionEngine
		? getResourceSchemaEECache(schema, expressionEngine)
		: getResourceSchemaCache(schema);

	let resourceSchemasByType;
	if (!resourceSchemaCache.value) {
		resourceSchemasByType = new Map();
		resourceSchemaCache.set(resourceSchemasByType);
	} else {
		resourceSchemasByType = resourceSchemaCache.value;
		const resourceSchema = resourceSchemasByType.get(resourceType);
		if (resourceSchema) return resourceSchema;
	}

	const extraExpressionRules = expressionEngine
		? {
				additionalProperties: false,
				properties: expressionEngine.expressionNames.reduce(
					(acc, n) => ({ ...acc, [n]: {} }),
					{},
				),
			}
		: {};

	const ajvSchema = {
		type: "object",
		required: ["select"],
		properties: {
			type: { type: "string", const: resourceType },
			id: { type: "string" },
			select: {}, // validated programatically
			limit: { type: "integer", minimum: 1 },
			offset: { type: "integer", minimum: 0 },
			where: {
				anyOf: [
					{ $ref: "#/definitions/expression" },
					{
						type: "object",
						properties: mapValues(
							schema.resources[resourceType].attributes,
							() => ({}),
						),
						additionalProperties: {
							not: true,
							errorMessage:
								"is neither be an expression nor an object that uses valid attributes as keys",
						},
					},
				],
			},
			order: {
				oneOf: [
					{
						$ref: "#/definitions/orderItem",
					},
					{
						type: "array",
						items: {
							$ref: "#/definitions/orderItem",
						},
					},
				],
				errorMessage:
					'must be a value or array of values of the form { "attribute": "asc/desc" }',
			},
		},
		definitions: {
			expression: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				...extraExpressionRules,
			},
			orderItem: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				properties: mapValues(
					schema.resources[resourceType].attributes,
					() => ({}),
				),
				additionalProperties: false,
				errorMessage: {
					maxProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
					minProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
				},
			},
		},
	};
	const compiled = defaultValidator.compile(ajvSchema);

	resourceSchemasByType.set(resourceType, compiled);
	return compiled;
}

function validateStructure(schema, query, type, expressionEngine) {
	const errors = [];
	const validator = getResourceStructureValidator(
		schema,
		type,
		expressionEngine,
	);

	// Structure validation first
	const structureIsValid = validator(query);
	if (!structureIsValid) {
		translateAjvErrors(validator.errors, query, "query").forEach((err) =>
			errors.push(err),
		);
	}

	return errors;
}

/**
 * Validates that a query is valid against the schema
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @param {Object} [options]
 * @param {Object} [options.expressionEngine] - a @data-prism/graph expression engine
 * @return {import('./lib/helpers.js').StandardError[]}
 */
function validateQuery(schema, rootQuery, options = {}) {
	const { expressionEngine } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof rootQuery !== "object") {
		return [
			{ message: "Invalid query: expected object, got " + typeof rootQuery },
		];
	}
	if (expressionEngine && typeof expressionEngine !== "object") {
		return [{ message: "[data-prism] expressionEngine must be an object" }];
	}
	if (!rootQuery.type) {
		return [{ message: "Missing query type: required for validation" }];
	}

	// Shape validation
	if (!validateQueryShape) {
		validateQueryShape = defaultValidator.compile(baseQuerySchema);
	}
	const shapeResult = validateQueryShape(rootQuery);
	if (!shapeResult) return validateQueryShape.errors;

	const errors = [];
	const addError = (message, path, value) => {
		errors.push(createErrorReporter()(message, path, value));
	};

	const go = (query, type, path) => {
		// validate the structure of the resource first
		const structureErrors = validateStructure(
			schema,
			query,
			type,
			expressionEngine,
		);
		if (structureErrors) {
			errors.push(...structureErrors);
			if (typeof query !== "object") return errors;
		}

		// Semantic validation second
		const isValidExpression = expressionEngine
			? expressionEngine.isExpression
			: isExpressionLike;

		const resSchema = schema.resources[type];

		// Validate where clause semantics
		if (query.where) {
			if (
				!isValidExpression(query.where) &&
				Object.keys(query.where).some((k) => !(k in resSchema.attributes))
			) {
				addError(
					"Invalid where clause: unknown attribute names. Use valid attributes or an expression.",
					[...path, "where"],
					query.where,
				);
			}
		}

		// Validate select semantics
		const validateSelectObject = (selectObj, prevPath) => {
			Object.entries(selectObj).forEach(([key, val]) => {
				const currentPath = [...prevPath, key];

				if (key === "*") return;

				if (key in resSchema.relationships) {
					if (typeof val !== "object") {
						addError(
							`Invalid value for relationship "${key}": expected object, got ${typeof val} "${val}".`,
							currentPath,
							val,
						);
					} else {
						go(val, resSchema.relationships[key].type, [...path, key]);
					}

					return;
				}

				if (Array.isArray(val)) {
					addError(
						`Invalid selection "${key}": arrays not allowed in object selects.`,
						currentPath,
					);
					return;
				}

				if (typeof val === "object") {
					if (!isValidExpression(val)) {
						addError(
							`Invalid selection "${key}": not a valid relationship name. Object values must be expressions or subqueries.`,
							currentPath,
						);
					}
					return;
				}

				if (typeof val === "string") {
					if (!isValidAttribute(val, resSchema)) {
						addError(
							`Invalid attribute "${val}": not a valid attribute name.`,
							currentPath,
							val,
						);
					}
				}
			});
		};

		const validateSelectArray = (selectArray) => {
			selectArray.forEach((val, idx) => {
				const currentPath = [...path, "select", idx];

				if (val === "*") return;

				if (Array.isArray(val)) {
					addError(
						"Invalid selection: nested arrays not allowed.",
						currentPath,
						val,
					);
					return;
				}

				if (typeof val === "object") {
					validateSelectObject(val, currentPath);
					return;
				}

				if (typeof val === "string") {
					if (!isValidAttribute(val, resSchema)) {
						addError(
							`Invalid attribute "${val}" in select array: use "*" or a valid attribute name.`,
							currentPath,
							val,
						);
					}
				}
			});
		};

		if (Array.isArray(query.select)) validateSelectArray(query.select);
		else if (typeof query.select === "object") {
			validateSelectObject(query.select, [...path, "select"]);
		} else if (query.select !== "*") {
			addError(
				'Invalid select value: must be "*", an object, or an array.',
				[...path, "select"],
				query.select,
			);
		}

		return errors;
	};

	return go(rootQuery, rootQuery.type, []);
}

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @param {Object} [options]
 * @param {import('./expressions/expressions.js').ExpressionEngine} [options.expressionEngine] - a @data-prism/graph expression engine
 * @returns {NormalQuery} The normalized query
 */
function normalizeQuery(schema, rootQuery, options = {}) {
	const { expressionEngine = defaultExpressionEngine } = options;

	ensure(validateQuery)(schema, rootQuery, expressionEngine);

	const go = (query, type) => {
		const { select } = query;
		const resSchema = schema.resources[type];

		const selectWithExpandedStar =
			select === "*" ? Object.keys(resSchema.attributes) : select;

		const selectObj = Array.isArray(selectWithExpandedStar)
			? (() => {
					const result = {};
					for (const item of selectWithExpandedStar) {
						if (typeof item === "string") {
							result[item] = item;
						} else {
							Object.assign(result, item);
						}
					}
					return result;
				})()
			: select;

		const selectWithStar = selectObj["*"]
			? (() => {
					const result = {};
					for (const attr of Object.keys(resSchema.attributes)) {
						result[attr] = attr;
					}
					Object.assign(result, omit(selectObj, ["*"]));
					return result;
				})()
			: selectObj;

		const selectWithSubqueries = mapValues(selectWithStar, (sel, key) => {
			if (
				key in schema.resources[type].relationships &&
				typeof sel === "object"
			) {
				const relType = schema.resources[type].relationships[key].type;
				return go(sel, relType);
			}
			return sel;
		});

		const orderObj = query.order
			? { order: !Array.isArray(query.order) ? [query.order] : query.order }
			: {};

		const whereObj = query.where
			? { where: expressionEngine.normalizeWhereClause(query.where) }
			: {};

		return {
			...query,
			select: selectWithSubqueries,
			type,
			...orderObj,
			...whereObj,
		};
	};

	return go(rootQuery, rootQuery.type);
}

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} BaseResource
 * @property {string} type
 */

/**
 * @typedef {BaseResource & {
 *   id: string,
 *   attributes: Object<string, *>,
 *   relationships: Object<string, Ref|Ref[]|null>,
 * }} NormalResource
 */

/**
 * @typedef {BaseResource & {
 *   id?: string,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} PartialNormalResource
 */

/**
 * @typedef {BaseResource & {
 *   id?: number|string,
 *   new?: true,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} CreateResource
 */

/**
 * @typedef {BaseResource & {
 *   id: number|string,
 *   new?: false,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} UpdateResource

/**
 * @typedef {Ref & {
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} DeleteResource
 */

/**
 * @typedef {Object} Store
 * @property {function(CreateResource): Promise<NormalResource>} create - Creates a new resource
 * @property {function(UpdateResource): Promise<NormalResource>} update - Updates an existing resource
 * @property {function(DeleteResource): Promise<DeleteResource>} delete - Deletes a resource
 * @property {function(CreateResource | UpdateResource): Promise<NormalResource>} upsert - Creates or updates a resource
 * @property {function(import('./query.js').RootQuery): Promise<*>} query - Queries the store
 */

const defaultValidator = new Ajv({
	allErrors: true,
	allowUnionTypes: true,
});
addFormats(defaultValidator);
addErrors(defaultValidator);

/**
 * Creates a new validator instance
 * @param {Object} options
 * @param {Array} [options.ajvSchemas] - Additional schemas to add
 * @returns {Ajv} Configured validator instance
 */
const createValidator = ({ ajvSchemas = [] } = {}) => {
	const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
	addFormats(ajv);
	addErrors(ajv);

	ajvSchemas.forEach((schema) => ajv.addSchema(schema, schema.$id));

	return ajv;
};

const resourceValidationProperties = (schema, resource, options = {}) => {
	const { allowExtraAttributes = false } = options;

	const resSchema = schema.resources[resource.type];
	const requiredRelationships = resSchema.requiredRelationships ?? [];

	return {
		type: { const: resource.type },
		id: { type: "string" },
		attributes: {
			type: "object",
			required: resSchema.requiredAttributes ?? [],
			properties: resSchema.attributes,
			...(allowExtraAttributes
				? {}
				: {
						additionalProperties: {
							not: true,
							errorMessage:
								"attributes must not have extra properties; extra property is ${0#}",
							// errorMessage: "Unknown attribute \"${0#}\": not defined in schema",
						},
					}),
		},
		relationships: {
			type: "object",
			required: resSchema.requiredRelationships,
			additionalProperties: false,
			properties: mapValues(resSchema.relationships, (relSchema, relName) =>
				relSchema.cardinality === "one"
					? requiredRelationships.includes(relName)
						? {
								type: "object",
								required: ["type", "id"],
								properties: {
									type: { const: relSchema.type },
									id: { type: "string" },
								},
							}
						: {
								oneOf: [
									{
										type: "object",
										required: ["type", "id"],
										properties: {
											type: { const: relSchema.type },
											id: { type: "string" },
										},
									},
									{ type: "null" },
								],
							}
					: {
							type: "array",
							items: {
								type: "object",
								required: ["type", "id"],
								properties: {
									type: { const: relSchema.type },
									id: { type: "string" },
								},
							},
						},
			),
		},
	};
};
const getCreateResourceCache = createDeepCache();
const getUpdateResourceCache = createDeepCache();
const getMergeResourceCache = createDeepCache();

/**
 * Validates a create resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {CreateResource} resource - The resource to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
function validateCreateResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}

	const cache = getCreateResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidator = schemaCache.get(resource.type);
	if (!compiledValidator) {
		const resSchema = schema.resources[resource.type];
		const required = ["type"];
		if ((resSchema.requiredAttributes ?? []).length > 0) {
			required.push("attributes");
		}
		if ((resSchema.requiredRelationships ?? []).length > 0) {
			required.push("relationships");
		}

		compiledValidator = validator.compile({
			type: "object",
			required,
			properties: resourceValidationProperties(schema, { type: resource.type }),
		});

		schemaCache.set(resource.type, compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

/**
 * Validates an update resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {UpdateResource} resource - The resource to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
function validateUpdateResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}

	const cache = getUpdateResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidator = schemaCache.get(resource.type);
	if (!compiledValidator) {
		const resSchema = schema.resources[resource.type];
		if ((resSchema.requiredAttributes ?? []).length > 0) ;
		if ((resSchema.requiredRelationships ?? []).length > 0) ;

		compiledValidator = validator.compile({
			type: "object",
			required: ["type", "id"],
			properties: resourceValidationProperties(schema, { type: resource.type }),
		});

		schemaCache.set(resource.type, compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

/**
 * Validates a delete resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {DeleteResource} resource - The resource to validate
 * @returns {Array} Array of validation errors
 */
function validateDeleteResource(schema, resource) {
	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof resource !== "object") {
		return [
			{ message: "Invalid resource: expected object, got " + typeof resource },
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}
	if (!resource.id) {
		return [{ message: "Missing resource ID: required for delete operation" }];
	}
	return [];
}

/**
 * Validates a resource tree that will be merged into a graph
 *
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
function validateMergeResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}

	const cache = getMergeResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidators = schemaCache.get(resource.type);
	if (!compiledValidators) {
		const toOneRefOfType = (type, required) => ({
			anyOf: [
				...(required ? [] : [{ type: "null" }]),
				{
					type: "object",
					required: ["type", "id"],
					additionalProperties: false,
					properties: { type: { const: type }, id: { type: "string" } },
				},
				{ $ref: `#/definitions/create/${type}` },
				{ $ref: `#/definitions/update/${type}` },
			],
		});
		const toManyRefOfType = (type) => ({
			type: "array",
			items: toOneRefOfType(type, true),
		});

		const definitions = { create: {}, update: {} };
		Object.entries(schema.resources).forEach(([resName, resSchema]) => {
			const required = ["type"];
			if ((resSchema.requiredAttributes ?? []).length > 0) {
				required.push("attributes");
			}
			if ((resSchema.requiredRelationships ?? []).length > 0) {
				required.push("relationships");
			}

			const requiredRelationships = resSchema.requiredRelationships ?? [];

			definitions.create[resName] = {
				type: "object",
				required,
				additionalProperties: false,
				properties: {
					type: { const: resName },
					new: { type: "boolean", const: true },
					attributes: {
						type: "object",
						required: resSchema.requiredAttributes,
						additionalProperties: false,
						properties: resSchema.attributes,
					},
					relationships: {
						type: "object",
						required: requiredRelationships,
						additionalProperties: false,
						properties: mapValues(
							resSchema.relationships,
							(relSchema, resName) =>
								relSchema.cardinality === "one"
									? requiredRelationships.includes(resName)
										? toOneRefOfType(relSchema.type, true)
										: toOneRefOfType(relSchema.type, false)
									: toManyRefOfType(relSchema.type),
						),
					},
				},
			};

			definitions.update[resName] = {
				type: "object",
				required: ["type", "id"],
				additionalProperties: false,
				properties: {
					type: { const: resName },
					id: { type: "string" },
					new: { type: "boolean", const: false },
					attributes: {
						type: "object",
						additionalProperties: false,
						properties: mapValues(resSchema.attributes, (a) =>
							omit(a, ["required"]),
						),
					},
					relationships: {
						type: "object",
						additionalProperties: false,
						properties: mapValues(resSchema.relationships, (relSchema) =>
							relSchema.cardinality === "one"
								? relSchema.required
									? toOneRefOfType(relSchema.type, true)
									: toOneRefOfType(relSchema.type, false)
								: toManyRefOfType(relSchema.type),
						),
					},
				},
			};
		});

		compiledValidators = {
			create: validator.compile({
				$ref: `#/definitions/create/${resource.type}`,
				definitions,
			}),
			update: validator.compile({
				$ref: `#/definitions/update/${resource.type}`,
				definitions,
			}),
		};

		schemaCache.set(resource.type, compiledValidators);
	}

	const compiledValidator =
		resource.id && !resource.new
			? compiledValidators.update
			: compiledValidators.create;

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

var $schema = "http://json-schema.org/draft-07/schema#";
var $id = "https://raw.githubusercontent.com/jakesower/data-prism/main/schemas/data-prism-schema.1.0.schema.json";
var title = "Data Prism Schema";
var description = "A metaschema for Data Prism schemas.";
var type = "object";
var required = [
	"resources"
];
var properties = {
	$id: {
		type: "string"
	},
	$comment: {
		type: "string"
	},
	$schema: {
		type: "string"
	},
	version: {
		type: "string"
	},
	resources: {
		type: "object",
		minProperties: 1,
		patternProperties: {
			"[^.$]": {
				$ref: "#/definitions/resource"
			}
		}
	}
};
var definitions = {
	attribute: {
		$ref: "http://json-schema.org/draft-07/schema#"
	},
	relationship: {
		type: "object",
		required: [
			"type",
			"cardinality"
		],
		properties: {
			type: {
				type: "string"
			},
			cardinality: {
				type: "string",
				"enum": [
					"one",
					"many"
				]
			},
			inverse: {
				type: "string"
			}
		}
	},
	resource: {
		type: "object",
		required: [
			"attributes",
			"relationships"
		],
		properties: {
			plural: {
				type: "string"
			},
			singular: {
				type: "string"
			},
			idAttribute: {
				type: "string"
			},
			requiredAttributes: {
				type: "array",
				items: {
					type: "string"
				},
				"default": [
				]
			},
			requiredRelationships: {
				type: "array",
				items: {
					type: "string"
				},
				"default": [
				]
			},
			attributes: {
				type: "object",
				patternProperties: {
					"[^.$]": {
						$ref: "#/definitions/attribute"
					}
				}
			},
			relationships: {
				type: "object",
				patternProperties: {
					"[^.$]": {
						$ref: "#/definitions/relationship"
					}
				}
			}
		}
	}
};
var metaschema = {
	$schema: $schema,
	$id: $id,
	title: title,
	description: description,
	type: type,
	required: required,
	properties: properties,
	definitions: definitions
};

/**
 * @typedef {"object"|"array"|"boolean"|"string"|"number"|"integer"|"null"} JSONSchemaType
 */

/**
 * @typedef {Object} JSONSchema
 * @property {JSONSchemaType} [type]
 * @property {JSONSchema|JSONSchema[]} [items]
 * @property {Object<string, JSONSchema>} [properties]
 * @property {string[]} [required]
 * @property {boolean|JSONSchema} [additionalProperties]
 * @property {string} [$id]
 * @property {string} [$schema]
 * @property {string} [$ref]
 * @property {string} [title]
 * @property {string} [description]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {any[]} [enum]
 * @property {any} [const]
 * @property {JSONSchema[]} [oneOf]
 * @property {JSONSchema[]} [anyOf]
 * @property {JSONSchema[]} [allOf]
 * @property {Object<string, JSONSchema>} [patternProperties]
 * @property {string} [pattern]
 * @property {Object<string, *>} [definitions]
 * @property {Object<string, *>} [$defs]
 * @property {boolean} [readOnly]
 * @property {boolean} [writeOnly]
 * @property {string} [format]
 * @property {any} [default]
 */

/**
 * @typedef {Object} TypedObject
 * @property {JSONSchemaType} type
 */

/**
 * @typedef {Object} SchemaRelationship
 * @property {string} type
 * @property {"one"|"many"} cardinality
 * @property {string} [inverse]
 * @property {boolean} [required]
 */

/**
 * @typedef {Object} SchemaResource
 * @property {string} [idAttribute]
 * @property {Object<string, JSONSchema>} attributes
 * @property {Object<string, SchemaRelationship>} relationships
 */

/**
 * @typedef {Object} Schema
 * @property {string} [$schema]
 * @property {string} [$id]
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [meta]
 * @property {string} [version]
 * @property {Object<string, SchemaResource>} resources
 */

const metaschemaWithErrors = (() => {
	const out = merge(structuredClone(metaschema), {
		definitions: {
			attribute: {
				$ref: "http://json-schema.org/draft-07/schema#",
			},
			relationship: {
				properties: {
					cardinality: {
						errorMessage: 'must be "one" or "many"',
					},
				},
			},
		},
	});
	delete out.$id;
	return out;
})();

const getValidateSchemaCache = createDeepCache();

/**
 * Validates that a schema is valid
 * @param {Schema} schema - The schema to validate
 * @param {Object} options
 * @param {import('ajv').Ajv} options.validator
 * @throws {Error} If the schema is invalid
 */
function validateSchema(schema, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	const validatorCache = getValidateSchemaCache(schema, validator);
	if (validatorCache.hit) return validatorCache.value;

	const baseValidate = validator.compile(metaschemaWithErrors);
	if (!baseValidate(schema)) {
		const result = translateAjvErrors(baseValidate.errors, schema, "schema");
		validatorCache.set(result);
		return result;
	}

	const attributeSchemaErrors = [];
	Object.entries(schema.resources).forEach(([resName, resSchema]) =>
		Object.entries(resSchema.attributes).forEach(([attrName, attrSchema]) => {
			try {
				validator.compile(attrSchema);
			} catch (err) {
				attributeSchemaErrors.push({
					message: `Invalid attribute schema "${resName}.${attrName}": ${err.message}`,
				});
			}
		}),
	);

	if (attributeSchemaErrors.length > 0) {
		validatorCache.set(attributeSchemaErrors);
		return attributeSchemaErrors;
	}

	const introspectiveSchema = merge(structuredClone(metaschema), {
		properties: {
			resources: {
				properties: mapValues(schema.resources, (_, resName) => ({
					$ref: `#/definitions/resources/${resName}`,
				})),
			},
		},
		definitions: {
			resources: mapValues(schema.resources, (resSchema, resName) => ({
				allOf: [
					{ $ref: "#/definitions/resource" },
					{
						type: "object",
						properties: {
							type: { const: resName },
							attributes: {
								type: "object",
								required: [
									resSchema.idAttribute ?? "id",
									...(resSchema.requiredAttributes ?? []),
								],
							},
							relationships: {
								type: "object",
								required: resSchema.requiredRelationships ?? [],
							},
						},
					},
				],
			})),
			relationship: {
				properties: {
					type: {
						enum: Object.keys(schema.resources),
						errorMessage: `Invalid resource type "\${0}": use one of (${Object.keys(schema.resources).join(", ")})`,
					},
				},
			},
		},
	});
	delete introspectiveSchema.$id;
	delete introspectiveSchema.properties.resources.patternProperties;

	const introspectiveValidate = validator.compile(introspectiveSchema);
	const introspectiveResult = introspectiveValidate(schema)
		? []
		: translateAjvErrors(introspectiveValidate.errors, schema, "schema");

	validatorCache.set(introspectiveResult);
	return introspectiveResult;
}

// import { mapValues } from "lodash-es";
// import { defaultExpressionEngine } from "../expressions/expressions.js";

/**
 * @typedef {Object<string, any>} Projection
 */

const TERMINAL_EXPRESSIONS = new Set(["$get", "$prop", "$literal"]);

/**
 * @param {any} expression
 * @param {any} expressionEngine
 * @returns {any}
 */
function distributeStrings(expression, expressionEngine) {
	// const { isExpression } = expressionEngine;

	if (typeof expression === "string") {
		const [iteratee, ...rest] = expression.split(".$.");
		if (rest.length === 0) return { $get: expression };

		return {
			$pipe: [
				{ $get: iteratee },
				{ $flatMap: distributeStrings(rest.join(".$.")) },
				{ $filter: { $isDefined: {} } },
			],
		};
	}

	const [expressionName, expressionArgs] = Object.entries(expression)[0];

	return TERMINAL_EXPRESSIONS.has(expressionName)
		? expression
		: { [expressionName]: distributeStrings(expressionArgs) };
}

// /**
//  * Takes a query and returns the fields that will need to be fetched to ensure
//  * all expressions within the query are usable.
//  *
//  * @param {Projection} projection - Projection
//  * @returns {Object}
//  */
// export function projectionQueryProperties(projection) {
// 	const { isExpression } = defaultExpressionEngine;
// 	const projectionTerminalExpressions = ["$literal", "$prop"];

// 	const go = (val) => {
// 		if (isExpression(val)) {
// 			const [exprName, exprVal] = Object.entries(val)[0];
// 			if (projectionTerminalExpressions.includes(exprName)) return [];

// 			return go(exprVal);
// 		}

// 		if (Array.isArray(val)) return val.map(go);

// 		if (typeof val === "object") return Object.values(val).map(go);

// 		return [val.split(".").filter((v) => v !== "$")];
// 	};

// 	// mutates!
// 	const makePath = (obj, path) => {
// 		const [head, ...tail] = path;

// 		if (tail.length === 0) {
// 			obj[head] = head;
// 			return;
// 		}

// 		if (!obj[head]) obj[head] = { properties: {} };
// 		makePath(obj[head].properties, tail);
// 	};

// 	const propertyPaths = Object.values(projection).flatMap(go);
// 	const query = {};
// 	propertyPaths.forEach((path) => makePath(query, path));

// 	return query;
// }

/**
 * @param {import('../expressions/expressions.js').Expression} expression
 * @param {any} expressionEngine
 * @returns {function(any): any}
 */
function createExpressionProjector(expression, expressionEngine) {
	const { apply } = expressionEngine;
	const expr = distributeStrings(expression);

	return (result) => apply(expr, result);
}

/**
 * @typedef {Object<string, unknown>} Result
 */

/**
 * @typedef {Object} QueryGraph
 * @property {function(import('../query.js').RootQuery): Result} query
 */

const ID = Symbol("id");
const TYPE = Symbol("type");
const RAW = Symbol("raw");

/**
 * @param {import('../graph.js').Graph} graph
 * @returns {Object}
 */
function prepGraph(graph) {
	const data = {};
	Object.entries(graph).forEach(([resType, ressOfType]) => {
		data[resType] = {};
		Object.entries(ressOfType).forEach(([resId, res]) => {
			const defaultedRes = {
				attributes: {},
				relationships: {},
				...res,
			};

			const val = {};

			val[TYPE] = resType;
			val[ID] = resId;
			val[RAW] = {
				...defaultedRes,
				id: resId,
				resType: resType,
			};

			Object.entries(res.attributes ?? {}).forEach(([attrName, attrVal]) => {
				val[attrName] = attrVal;
			});

			Object.entries(res.relationships ?? {}).forEach(([relName, relVal]) => {
				Object.defineProperty(val, relName, {
					get() {
						const dereffed = applyOrMap(
							relVal,
							(rel) => data[rel.type][rel.id],
						);
						Object.defineProperty(this, relName, {
							value: dereffed,
							writable: false,
							configurable: false,
						});

						return dereffed;
					},
					configurable: true,
					enumerable: true,
				});
			});

			data[resType][resId] = val;
		});
	});

	return data;
}

/**
 * @param {import('../query.js').NormalQuery} rootQuery
 * @param {Object} data
 * @returns {Result}
 */
function runQuery(rootQuery, data) {
	const go = (query) => {
		if (query.id && !data[query.type][query.id]) return null;

		// these are in order of execution
		const operationDefinitions = {
			where(results) {
				if (Object.keys(query.where).length === 0) return results;

				return results.filter((result) => {
					return defaultExpressionEngine.apply(query.where, result);
				});
			},
			order(results) {
				const order = Array.isArray(query.order) ? query.order : [query.order];
				const properties = order.flatMap((o) => Object.keys(o));
				const dirs = order.flatMap((o) => Object.values(o));

				const first = results[0];
				if (first && properties.some((p) => !(p in first))) {
					const missing = properties.find((p) => !(p in first));
					throw new Error(
						`invalid "order" clause: '${missing} is not a valid attribute`,
					);
				}

				return orderBy(results, properties, dirs);
			},
			limit(results) {
				const { limit, offset = 0 } = query;
				if (limit < 1) throw new Error("`limit` must be at least 1");

				return results.slice(offset, limit + offset);
			},
			offset(results) {
				if (query.offset < 0) throw new Error("`offset` must be at least 0");
				return query.limit ? results : results.slice(query.offset);
			},
			select(results) {
				const { select } = query;
				const projectors = mapValues(select, (propQuery, propName) => {
					// possibilities: (1) property (2) expression (3) subquery
					if (typeof propQuery === "string") {
						// nested / shallow property
						const extractPath = (curValue, path) => {
							if (curValue === null) return null;
							if (path.length === 0) return curValue;

							const [head, ...tail] = path;

							if (head === "$") {
								return curValue.map((v) => extractPath(v, tail));
							}
							if (!(head in curValue)) return undefined;

							return extractPath(curValue?.[head], tail);
						};

						return (result) =>
							propQuery in result[RAW].relationships
								? result[RAW].relationships[propQuery]
								: extractPath(result, propQuery.split("."));
					}

					// expression
					if (defaultExpressionEngine.isExpression(propQuery)) {
						return createExpressionProjector(
							propQuery,
							defaultExpressionEngine,
						);
					}

					// subquery
					return (result) => {
						if (result[propName] === undefined) {
							throw new Error(
								`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably have an invalid schema or constructed your graph wrong. Try linking the inverses (via "linkInverses"), check your schema to make sure all inverses have been defined correctly there, and make sure all resources have been loaded into the graph.`,
							);
						}

						if (Array.isArray(result[propName])) {
							return result[propName]
								.map((r) => {
									if (r === undefined) {
										throw new Error(
											`A related resource was not found on resource ${
												query.type
											}.${query.id}. ${propName}: ${JSON.stringify(
												result[propName],
											)}. Check that all of the relationship refs in ${
												query.type
											}.${query.id} are valid.`,
										);
									}

									return go({ ...propQuery, type: r[TYPE], id: r[ID] });
								})
								.filter(Boolean);
						}

						if (result[propName] === undefined) {
							throw new Error(
								`A related resource was not found on resource ${query.type}.${
									query.id
								}. ${propName}: ${JSON.stringify(
									result[RAW].relationships[propName],
								)}. Check that all of the relationship refs in ${query.type}.${
									query.id
								} are valid.`,
							);
						}

						if (result[propName] === null) return null;

						return go({
							...propQuery,
							type: result[propName][TYPE],
							id: result[propName][ID],
						});
					};
				});

				return results.map((result) =>
					mapValues(projectors, (project) => project(result)),
				);
			},
		};

		const results = query.id
			? [data[query.type][query.id]]
			: Object.values(data[query.type]);

		const processed = Object.entries(operationDefinitions).reduce(
			(acc, [opName, fn]) => (opName in query ? fn(acc) : acc),
			results,
		);

		return query.id ? processed[0] : processed;
	};

	return go(rootQuery);
}

/**
 * @param {import('../schema.js').Schema} schema
 * @param {import('../query.js').RootQuery} query
 * @param {import('../graph.js').Graph} graph
 * @returns {Result}
 */
function queryGraph(schema, query, graph) {
	const preppedGraph = prepGraph(graph);
	const normalQuery = normalizeQuery(schema, query);

	return runQuery(normalQuery, preppedGraph);
}

const ensureValidSchema = ensure(validateSchema);

/**
 * @typedef {Object} QueryBreakdownItem
 * @property {string[]} path - Path to this query level
 * @property {any} attributes - Selected attributes
 * @property {any} relationships - Selected relationships
 * @property {string} type - Resource type
 * @property {import('@data-prism/core').Query} query - The query object
 * @property {boolean} ref - Whether this is a reference-only query
 * @property {import('@data-prism/core').Query|null} parentQuery - Parent query if any
 * @property {QueryBreakdownItem|null} parent - Parent breakdown item if any
 * @property {string|null} parentRelationship - Parent relationship name if any
 */

/**
 * @typedef {QueryBreakdownItem[]} QueryBreakdown
 */

/**
 * Flattens a nested query into a linear array of query breakdown items
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} rootQuery - The root query to flatten
 * @returns {QueryBreakdown} Flattened query breakdown
 */
function flattenQuery(schema, rootQuery) {
	const go = (query, type, path, parent = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const { idAttribute = "id" } = resDef;
		const [attributesEntries, relationshipsEntries] = partition(
			Object.entries(query.select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" &&
				(propVal in resDef.attributes || propVal === idAttribute),
		);

		const attributes = attributesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			attributes,
			query,
			ref: !query.select,
			relationships: pick(query.select, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.select[relKey];

				return go(subquery, relDef.type, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}

/**
 * Maps over each query in a flattened query structure
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => any} fn - Mapping function
 * @returns {any[]} Mapped results
 */
function flatMapQuery(schema, query, fn) {
	return flattenQuery(schema, query).flatMap((info) => fn(info.query, info));
}

/**
 * Iterates over each query in a flattened query structure
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => void} fn - Iteration function
 */
function forEachQuery(schema, query, fn) {
	return flattenQuery(schema, query).forEach((info) => fn(info.query, info));
}

/**
 * Tests whether some query in a flattened query structure matches a condition
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => boolean} fn - Test function
 * @returns {boolean} Whether any query matches the condition
 */
function someQuery(schema, query, fn) {
	return flattenQuery(schema, query).some((q) => fn(q.query, q));
}

/**
 * Replaces ? placeholders with PostgreSQL $n placeholders
 * @param {string} inputString - Input SQL string with ? placeholders
 * @returns {string} SQL string with $n placeholders
 */
function replacePlaceholders(inputString) {
	let counter = 1;
	return inputString.replace(/\?/g, () => `$${counter++}`);
}

/**
 * @typedef {Object} RelBuilderParams
 * @property {any} foreignConfig - Foreign resource configuration
 * @property {string} foreignTableAlias - Alias for foreign table
 * @property {any} localConfig - Local resource configuration
 * @property {string} localQueryTableName - Local query table name
 * @property {string} relName - Relationship name
 * @property {string} foreignIdCol - Foreign ID column
 * @property {string} [localIdCol] - Local ID column
 * @property {any} [localResSchema] - Local resource schema
 */

/**
 * @typedef {Object} RelBuilders
 * @property {Object} one - One-to-* relationship builders
 * @property {(params: RelBuilderParams) => string[]} one.one - One-to-one builder
 * @property {(params: RelBuilderParams) => string[]} one.many - One-to-many builder
 * @property {Object} many - Many-to-* relationship builders
 * @property {(params: RelBuilderParams) => string[]} many.one - Many-to-one builder
 * @property {(params: RelBuilderParams) => string[]} many.many - Many-to-many builder
 * @property {Object} none - No inverse relationship builders
 * @property {(params: RelBuilderParams) => string[]} none.many - None-to-many builder
 */

/**
 * Creates relationship builders for different cardinality combinations
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @returns {RelBuilders} The relationship builders
 */
function makeRelationshipBuilders(schema) {
	return {
		one: {
			one(params) {
				const {
					foreignConfig,
					foreignTableAlias,
					localConfig,
					localQueryTableName,
					relName,
					foreignIdCol,
				} = params;

				const { localColumn } = localConfig.joins[relName];
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localColumn} = ${foreignTableAlias}.${foreignIdCol}`,
				];
			},
			many(params) {
				const {
					foreignConfig,
					localIdCol,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
				} = params;

				const foreignTable = foreignConfig.table;
				const foreignJoinColumn = localConfig.joins[relName].foreignColumn;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localIdCol} = ${foreignTableAlias}.${foreignJoinColumn}`,
				];
			},
		},
		many: {
			one(params) {
				const {
					localConfig,
					localQueryTableName,
					relName,
					foreignConfig,
					foreignTableAlias,
					foreignIdCol,
				} = params;

				const localJoinColumn = localConfig.joins[relName].localColumn;
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localJoinColumn} = ${foreignTableAlias}.${foreignIdCol}`,
				];
			},
			many(params) {
				const {
					foreignConfig,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
					localIdCol,
					foreignIdCol,
				} = params;

				const foreignTable = foreignConfig.table;

				const joinTableName = `${localQueryTableName}$$${relName}`;
				const { joinTable, localJoinColumn, foreignJoinColumn } =
					localConfig.joins[relName];

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localQueryTableName}.${localIdCol} = ${joinTableName}.${localJoinColumn}`,
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${foreignTableAlias}.${foreignIdCol} = ${joinTableName}.${foreignJoinColumn}`,
				];
			},
		},
		none: {
			many({
				localResSchema,
				localQueryTableName,
				relName,
				foreignTableAlias,
			}) {
				const localRelDef = localResSchema.attributes[relName];
				const localJoinColumn = localRelDef.store.join.joinColumn;

				const foreignResSchema = schema.resources[localRelDef.relatedType];
				const foreignTable = foreignResSchema.store.table;
				const foreignRelDef =
					foreignResSchema?.attributes?.[localRelDef.inverse];
				const foreignJoinColumn = foreignRelDef
					? foreignRelDef.store.join.joinColumn
					: localRelDef.store.join.foreignJoinColumn;

				const { joinTable } = localRelDef.store.join;
				const joinTableName = `${localQueryTableName}$$${relName}`;

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localQueryTableName}.id = ${joinTableName}.${localJoinColumn}`,
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${foreignTableAlias}.id = ${joinTableName}.${foreignJoinColumn}`,
				];
			},
		},
	};
}

/**
 * @typedef {Object} QueryContext
 * @property {any} config - Database configuration
 * @property {any} queryInfo - Query information
 * @property {import('@data-prism/core').RootQuery} rootQuery - Root query
 * @property {import('@data-prism/core').Schema} schema - Schema
 */

/**
 * Handles pre-query relationship setup for JOIN clauses
 * @param {QueryContext} context - Query context
 * @returns {Object} Object with join clauses
 */
const preQueryRelationships = (context) => {
	const { config, queryInfo, rootQuery, schema } = context;
	const { parent, path: queryPath } = queryInfo;

	if (queryPath.length === 0) return {};

	const parentPath = queryPath.slice(0, -1);
	const tablePath = [rootQuery.type, ...queryPath];
	const parentTablePath = [rootQuery.type, ...parentPath];
	const relName = last(queryPath);

	const relationshipBuilders = makeRelationshipBuilders(schema);
	const localQueryTableName = parentTablePath.join("$");

	const localConfig = config.resources[parent.type];
	const localResSchema = schema.resources[parent.type];
	const localIdCol = snakeCase(localResSchema.idAttribute ?? "id");
	const localRelDef = localResSchema.relationships[relName];

	const foreignConfig = config.resources[localRelDef.type];
	const foreignResSchema = schema.resources[localRelDef.type];
	const foreignIdCol = snakeCase(foreignResSchema.idAttribute ?? "id");
	const foreignRelDef = foreignResSchema.relationships[localRelDef.inverse];
	const foreignTableAlias = tablePath.join("$");

	const localResCardinality = localRelDef.cardinality;
	const foreignResCardinality = foreignRelDef?.cardinality ?? "none";

	const builderArgs = {
		localConfig,
		localRelDef,
		localResSchema,
		localQueryTableName,
		localIdCol,
		relName,
		foreignConfig,
		foreignTableAlias,
		foreignIdCol,
	};

	const join =
		relationshipBuilders[foreignResCardinality][localResCardinality](
			builderArgs,
		);

	return { join };
};

/**
 * @typedef {Object} SelectClauseItem
 * @property {string} value - The select clause value
 */

/**
 * @typedef {Object} GraphExtractContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {import('data-prism').RootQuery} query - The root query
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers for data extraction
 */

/**
 * @typedef {Object.<string, Object.<string, any>>} Graph
 */

// Path string utilities
const buildPathString = (path) => (path.length > 0 ? `$${path.join("$")}` : "");
const buildParentPath = (path) =>
	path.length > 1 ? `$${path.slice(0, -1).join("$")}` : "";

// Resource creation utilities
const findOrCreateResource = (context) => {
	const { graph, type, id, schema } = context;
	const resourceSchema = schema.resources[type];
	const { idAttribute = "id" } = resourceSchema;

	if (!graph[type][id]) {
		graph[type][id] = {
			[idAttribute]: id,
			id,
			type,
			attributes: {},
			relationships: {},
		};
	}
	return graph[type][id];
};

const processRelationship = (context) => {
	const { parent, relationshipName, relationshipDef, childType, childId } =
		context;

	if (relationshipDef.cardinality === "one") {
		parent.relationships[relationshipName] = childId
			? { id: childId, type: childType }
			: null;
	} else {
		parent.relationships[relationshipName] =
			parent.relationships[relationshipName] ?? [];

		if (!parent.relationships[relationshipName].some((r) => r.id === childId)) {
			if (childId !== null) {
				parent.relationships[relationshipName].push({
					type: childType,
					id: childId,
				});
			}
		}
	}
};

/**
 * Extracts a resource graph from raw SQL query results
 * @param {any[][]} rawResults - Raw SQL query results
 * @param {SelectClauseItem[]} selectClause - The select clause items
 * @param {GraphExtractContext} context - Extract context with schema and query
 * @returns {Graph} The extracted resource graph organized by type and ID
 */
function extractGraph$1(rawResults, selectClause, context) {
	const { schema, query: rootQuery, columnTypeModifiers = {} } = context;
	const graph = mapValues(schema.resources, () => ({}));

	const extractors = flatMapQuery(schema, rootQuery, (_, info) => {
		const { parent, parentQuery, parentRelationship, attributes, type } = info;
		const resSchema = schema.resources[type];
		const { idAttribute = "id" } = resSchema;

		const selectAttributeMap = {};
		selectClause.forEach((attr, idx) => {
			selectAttributeMap[attr.value] = idx;
		});

		const parentType = parent?.type;
		const parentRelDef =
			parentQuery &&
			schema.resources[parentType].relationships[parentRelationship];

		const pathStr = buildPathString(info.path);
		const idPath = `${rootQuery.type}${pathStr}.${snakeCase(idAttribute)}`;
		const idIdx = selectAttributeMap[idPath];

		return (result) => {
			const id = result[idIdx];

			if (parentQuery) {
				const parentResSchema = schema.resources[parentType];
				const parentId =
					result[
						selectAttributeMap[
							`${rootQuery.type}${buildParentPath(info.path)}.${snakeCase(
								parentResSchema.idAttribute ?? "id",
							)}`
						]
					];

				const parent = findOrCreateResource({
					graph,
					type: parentType,
					id: parentId,
					schema,
				});

				processRelationship({
					parent,
					relationshipName: parentRelationship,
					relationshipDef: parentRelDef,
					childType: type,
					childId: id,
				});
			}

			if (!id) return;

			findOrCreateResource({
				graph,
				type,
				id,
				schema,
			});

			if (attributes.length > 0) {
				attributes.forEach((attr) => {
					const resultIdx =
						selectAttributeMap[
							`${rootQuery.type}${pathStr}.${snakeCase(attr)}`
						];
					const resourceSchema = schema.resources[type];
					const attrType = resourceSchema.attributes[attr]?.type;

					graph[type][id].attributes[attr] = columnTypeModifiers[attrType]
						? columnTypeModifiers[attrType].extract(result[resultIdx])
						: result[resultIdx];
				});
			} else {
				graph[type][id].id = id;
				graph[type][id].type = type;
			}
		};
	});

	rawResults.forEach((row) =>
		extractors.forEach((extractor) => extractor(row)),
	);

	return graph;
}

/**
 * @typedef {Object} StoreContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers for query processing
 */

/**
 * @typedef {Object} QueryClauseContext
 * @property {any} queryInfo - Query information
 * @property {import('data-prism').Schema} schema - Schema
 * @property {string} table - Table name
 * @property {import('data-prism').Query} query - Current query
 * @property {import('data-prism').RootQuery} rootQuery - Root query
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers
 */

/**
 * @typedef {Object} ParsedClause
 * @property {string[]} [where] - WHERE clauses
 * @property {any[]} [vars] - SQL variables
 * @property {any[]} [orderBy] - ORDER BY clauses
 * @property {number} [limit] - LIMIT value
 * @property {number} [offset] - OFFSET value
 * @property {any[]} [select] - SELECT clauses
 * @property {any[]} [join] - JOIN clauses
 */

/**
 * Checks if a query has any to-many relationships
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The query to check
 * @returns {boolean} Whether the query has to-many relationships
 */
const hasToManyRelationship = (schema, query) => {
	return someQuery(schema, query, (_, info) =>
		Object.keys(info.relationships).some(
			(relName) =>
				schema.resources[info.type].relationships[relName].cardinality ===
				"many",
		),
	);
};

/**
 * Query clause extractors for different query parts
 * @type {Object<string, (value: any, context: QueryClauseContext) => ParsedClause>}
 */
const QUERY_CLAUSE_EXTRACTORS = {
	id: (id, { queryInfo, schema }) => {
		if (!id) return {};

		const { idAttribute = "id" } = schema.resources[queryInfo.type];

		return {
			where: [`${queryInfo.type}.${snakeCase(idAttribute)} = ?`],
			vars: [id],
		};
	},
	where: (where) => ({ where: [where], vars: [where] }),
	order: (order, { table }) => {
		return {
			orderBy: (Array.isArray(order) ? order : [order]).map((orderEntry) => {
				const k = Object.keys(orderEntry)[0];
				return {
					property: k,
					direction: orderEntry[k],
					table,
				};
			}),
		};
	},
	limit: (limit, { query, queryInfo, schema }) => {
		if (limit < 0) {
			throw new Error("`limit` must be at least 0");
		}

		return queryInfo.path.length > 0 || hasToManyRelationship(schema, query)
			? {}
			: { limit, offset: query.offset ?? 0 };
	},
	offset: (offset, { query }) => {
		if (offset < 0) {
			throw new Error("`offset` must be at least 0");
		}

		if (!query.limit) {
			return { offset };
		}
		return {};
	},
	select: (select, context) => {
		const { schema, table, queryInfo, columnTypeModifiers = {} } = context;
		const { type } = queryInfo;
		const { idAttribute = "id" } = schema.resources[type];
		const resSchema = schema.resources[type];

		const attributeProps = Object.values(select).filter(
			(p) => typeof p === "string",
		);

		const relationshipsModifiers = preQueryRelationships(context);

		return {
			select: uniq([idAttribute, ...attributeProps]).map((col) => {
				const attrSchema = resSchema.attributes[col];
				const value = `${table}.${snakeCase(col)}`;

				return {
					value,
					sql:
						attrSchema && columnTypeModifiers[attrSchema.type]
							? columnTypeModifiers[attrSchema.type].select(value)
							: value,
				};
			}),
			...relationshipsModifiers,
		};
	},
};

/**
 * Parses a query into SQL clauses
 * @param {import('data-prism').RootQuery} query - The query to parse
 * @param {StoreContext} context - Store context
 * @returns {ParsedClause[]} Array of parsed query clauses
 */
function extractQueryClauses$1(query, context) {
	const { schema } = context;
	const clauses = [];

	forEachQuery(schema, query, (subquery, queryInfo) => {
		const table = [query.type, ...queryInfo.path].join("$");

		Object.entries(subquery).forEach(([key, val]) => {
			if (QUERY_CLAUSE_EXTRACTORS[key]) {
				clauses.push(
					QUERY_CLAUSE_EXTRACTORS[key](val, {
						...context,
						queryInfo,
						rootQuery: query,
						query: subquery,
						table,
					}),
				);
			}
		});
	});

	return clauses;
}

/**
 * @typedef {Object} ColumnModifier
 * @property {(val: string) => any} extract - Function to extract/parse stored value
 * @property {(col: string) => string} select - Function to generate SQL for selecting value
 */

/**
 * Column type modifiers for different data types in PostgreSQL
 * @type {Object<string, ColumnModifier>}
 */
const columnTypeModifiers = {
	geojson: {
		extract: (val) => JSON.parse(val),
		select: (val) => `ST_AsGeoJSON(${val})`,
	},
};

// Now using shared sql-helpers package

/**
 * @typedef {import('./query.js').StoreContext} StoreContext
 */

// Wrapper function that provides columnTypeModifiers to the shared extractQueryClauses
function extractQueryClauses(query, context) {
	return extractQueryClauses$1(query, {
		...context,
		columnTypeModifiers,
	});
}

/**
 * @typedef {Object} SqlExpression
 * @property {string} name - Human readable name for the expression
 * @property {(operand: any[]) => string} where - Function to generate WHERE clause SQL
 * @property {(operand: any[]) => any} vars - Function to extract variables for SQL operand
 * @property {boolean} [controlsEvaluation] - Whether this expression controls evaluation
 */

/**
 * SQL expression definitions for building WHERE clauses and extracting variables
 * @type {Object<string, SqlExpression>}
 */
const sqlExpressions = {
	$and: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) =>
			`(${operand.map(evaluate).join(" AND ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$or: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `(${operand.map(evaluate).join(" OR ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$not: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `NOT (${evaluate(operand)})`,
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$eq: {
		where: () => " = ?",
		vars: (operand) => operand,
	},
	$gt: {
		where: () => " > ?",
		vars: (operand) => operand,
	},
	$gte: {
		where: () => " >= ?",
		vars: (operand) => operand,
	},
	$lt: {
		where: () => " < ?",
		vars: (operand) => operand,
	},
	$lte: {
		where: () => " <= ?",
		vars: (operand) => operand,
	},
	$ne: {
		where: () => " != ?",
		vars: (operand) => operand,
	},
	$in: {
		where: (operand) => ` IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$nin: {
		where: (operand) => ` NOT IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$matchesRegex: {
		where: (operand) => {
			// Extract inline flags and clean pattern
			const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
			if (flagMatch) {
				const [, flags] = flagMatch;
				// Case-insensitive flag in PostgreSQL
				if (flags.includes("i")) {
					return " ~* ?";
				}
			}
			// Default case-sensitive regex (PCRE defaults)
			return " ~ ?";
		},
		vars: (operand) => {
			// Extract inline flags and clean pattern
			const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
			if (flagMatch) {
				const [, flags, pattern] = flagMatch;
				let processedPattern = pattern;

				// Handle multiline flag FIRST - PCRE 'm' flag makes ^ and $ match line boundaries
				// PostgreSQL doesn't have direct equivalent, so we need to transform the pattern
				if (flags.includes("m")) {
					// Transform ^ to match start of line (after newline or start of string)
					processedPattern = processedPattern.replace(/\^/g, "(^|(?<=\\n))");
					// Transform $ to match end of line (before newline or end of string)
					processedPattern = processedPattern.replace(/\$/g, "(?=\\n|$)");
				}

				// Handle dotall flag AFTER multiline - PCRE 's' flag makes . match newlines
				// We need to be explicit about . behavior when flags are present
				if (flags.includes("s")) {
					// Make . explicitly match newlines by replacing . with [\s\S]
					processedPattern = processedPattern.replace(/\./g, "[\\s\\S]");
				} else if (processedPattern.includes(".")) {
					// If 's' flag is NOT present but pattern contains ., ensure . does NOT match newlines
					// Replace . with [^\n] to exclude newlines explicitly
					processedPattern = processedPattern.replace(/\./g, "[^\\n]");
				}

				return [processedPattern];
			}
			// No inline flags - need to handle default PostgreSQL behavior
			// PostgreSQL . might match newlines by default, so make it explicit to match PCRE behavior
			let processedPattern = operand;
			if (processedPattern.includes(".")) {
				processedPattern = processedPattern.replace(/\./g, "[^\\n]");
			}
			return [processedPattern];
		},
	},
	$get: {
		where: (operand) => snakeCase(operand),
		vars: () => [],
	},
	$pipe: {
		where: (operand) => operand.join(" "),
		vars: (operand) => operand.flat(),
	},
	$compose: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
		vars: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
	},
	$literal: {
		where: (operand) => String(operand),
		vars: () => [],
		controlsEvaluation: true,
	},
	$if: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const condition = evaluate(operand.if);
			const thenClause = isExpression(operand.then)
				? evaluate(operand.then)
				: "?";
			const elseClause = isExpression(operand.else)
				? evaluate(operand.else)
				: "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const ifResult = evaluate(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = evaluate(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = evaluate(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
	$case: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const value = isExpression(operand.value) ? evaluate(operand.value) : "?";
			let sql = `CASE ${value}`;

			for (const caseItem of operand.cases) {
				const whenClause = isExpression(caseItem.when)
					? evaluate(caseItem.when)
					: "?";
				const thenClause = isExpression(caseItem.then)
					? evaluate(caseItem.then)
					: "?";
				sql += ` WHEN ${whenClause} THEN ${thenClause}`;
			}

			const defaultClause = isExpression(operand.default)
				? evaluate(operand.default)
				: "?";
			sql += ` ELSE ${defaultClause} END`;

			return sql;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const vars = [];

			if (isExpression(operand.value)) {
				vars.push(...evaluate(operand.value));
			} else {
				vars.push(operand.value);
			}

			for (const caseItem of operand.cases) {
				if (isExpression(caseItem.when)) {
					vars.push(...evaluate(caseItem.when));
				} else {
					vars.push(caseItem.when);
				}
				if (isExpression(caseItem.then)) {
					vars.push(...evaluate(caseItem.then));
				} else {
					vars.push(caseItem.then);
				}
			}

			if (isExpression(operand.default)) {
				vars.push(...evaluate(operand.default));
			} else {
				vars.push(operand.default);
			}

			return vars.flat();
		},
	},
	$debug: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate(operand),
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$matchesLike: {
		name: "$matchesLike",
		where: () => " LIKE ?",
		vars: (operand) => operand,
	},
	$matchesGlob: {
		name: "$matchesGlob",
		where: () => " SIMILAR TO ?", // PostgreSQL equivalent to GLOB
		vars: (operand) => {
			// Convert GLOB pattern to PostgreSQL SIMILAR TO pattern
			let pattern = operand
				.replace(/\*/g, "%") // * becomes %
				.replace(/\?/g, "_"); // ? becomes _
			return [pattern];
		},
	},
};

/**
 * Expression engine for generating WHERE clause SQL
 */
const whereExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.where })),
);

/**
 * Expression engine for extracting SQL variables/parameters
 */
const varsExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.vars })),
);

/**
 * @typedef {Object} SqlClauseHandler
 * @property {any} initVal - Initial value for the clause
 * @property {(val: any) => string} toSql - Function to convert value to SQL
 * @property {(left: any, right: any) => any} compose - Function to compose multiple values
 */

// Array composition helper
const composeArrays = (acc, item) => uniq([...(acc ?? []), ...(item ?? [])]);

// Complex SQL generation functions
const generateWhereSql = (val) =>
	val.length > 0
		? `WHERE ${whereExpressionEngine.evaluate({ $and: val })}`
		: "";

const generateOrderBySql = (val) => {
	if (val.length === 0) return "";

	const orderClauses = val.map(
		({ property, direction, table }) =>
			`${table}.${snakeCase(property)}${direction === "desc" ? " DESC" : ""}`,
	);
	return `ORDER BY ${orderClauses.join(", ")}`;
};

/**
 * SQL clause configuration for different query parts
 * @type {Object<string, SqlClauseHandler>}
 */
const SQL_CLAUSE_CONFIG = {
	select: {
		initVal: [],
		compose: composeArrays,
		toSql: (val) => `SELECT ${val.map((v) => v.sql).join(", ")}`,
	},
	vars: {
		initVal: [],
		compose: composeArrays,
		toSql: () => "",
	},
	from: {
		initVal: null,
		compose: (_, val) => val,
		toSql: (val) => `FROM ${val}`,
	},
	join: {
		initVal: [],
		compose: composeArrays,
		toSql: (val) => val.join("\n"),
	},
	where: {
		initVal: [],
		compose: composeArrays,
		toSql: generateWhereSql,
	},
	orderBy: {
		initVal: [],
		compose: composeArrays,
		toSql: generateOrderBySql,
	},
	limit: {
		initVal: Infinity,
		compose: (acc, item) => Math.min(acc, item),
		toSql: (val) => (val < Infinity ? `LIMIT ${val}` : ""),
	},
	offset: {
		initVal: 0,
		compose: (_, item) => item,
		toSql: (val) => (val > 0 ? `OFFSET ${val}` : ""),
	},
};

/**
 * Combines parsed query clauses into single values for each clause type
 * @param {any[]} clauseBreakdown - Array of clause objects from extractQueryClauses
 * @param {Object} initialClauses - Initial values for each clause type
 * @returns {Object} Object with composed clause values
 */
function composeSqlClauses(clauseBreakdown, initialClauses) {
	return clauseBreakdown.reduce(
		(acc, clause) => ({
			...acc,
			...mapValues(clause, (val, key) =>
				SQL_CLAUSE_CONFIG[key].compose(acc[key], val),
			),
		}),
		initialClauses,
	);
}

/**
 * Generates SQL string from composed clause values
 * @param {Object} composedClauses - Composed clause values
 * @returns {string} Complete SQL query string with $n placeholders
 */
function assembleSqlQuery(composedClauses) {
	return replacePlaceholders(
		Object.entries(SQL_CLAUSE_CONFIG)
			.map(([k, v]) => v.toSql(composedClauses[k]))
			.filter(Boolean)
			.join("\n"),
	);
}

/**
 * Extracts SQL parameters/variables from composed clause values
 * @param {Object} composedClauses - Composed clause values
 * @returns {any[]} Array of SQL parameters
 */
function extractSqlVariables(composedClauses) {
	return varsExpressionEngine.evaluate({
		$and: composedClauses.vars,
	});
}

// Now using shared sql-helpers package

// Wrapper function that provides columnTypeModifiers to the shared extractGraph
function extractGraph(rawResults, selectClause, context) {
	return extractGraph$1(rawResults, selectClause, {
		...context,
		columnTypeModifiers,
	});
}

/**
 * Processes raw SQL results into final query response
 * @param {any[][]} rawResults - Raw SQL query results
 * @param {Object} composedClauses - Composed SQL clauses
 * @param {import('data-prism').RootQuery} query - Original query
 * @param {Object} context - Query context with schema and config
 * @returns {any} Final query results
 */
function processQueryResults(
	rawResults,
	composedClauses,
	query,
	context,
) {
	const { schema } = context;

	// Determine if we have to-many relationships that affect result processing
	const hasToManyJoin = Object.keys(normalizeQuery(schema, query).select).some(
		(k) =>
			schema.resources[query.type].relationships[k]?.cardinality === "many",
	);

	const handledClauses = hasToManyJoin
		? ["where"]
		: ["limit", "offset", "where"];

	// Transform raw results into resource graph
	const graph = extractGraph(rawResults, composedClauses.select, context);

	// Strip handled clauses from query for final processing
	const strippedQuery = omit(query, handledClauses);

	return queryGraph(schema, strippedQuery, graph);
}

/**
 * @typedef {Object} StoreContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {import('data-prism').RootQuery} query - The root query
 * @property {any} config - Database configuration
 */

/**
 * Executes a query against PostgreSQL using a 5-step pipeline:
 * 1. Parse query into clause components
 * 2. Reduce clause arrays into single values
 * 3. Generate SQL strings and parameters
 * 4. Execute against database
 * 5. Transform results into resource graph
 *
 * @param {import('data-prism').RootQuery} query - The query to execute
 * @param {StoreContext} context - Store context with config and schema
 * @returns {Promise<any>} Query results
 */
async function query(query, context) {
	const { config } = context;
	const { db } = config;

	// Step 1: Extract and flatten query and subqueries by clause type
	const clauseBreakdown = extractQueryClauses(query, context);

	// Step 2: Combine the flattened clauses into single values
	const initialClauses = {
		...mapValues(SQL_CLAUSE_CONFIG, (c) => c.initVal),
		from: `${config.resources[query.type].table} AS ${query.type}`,
	};
	const composedClauses = composeSqlClauses(clauseBreakdown, initialClauses);

	// Step 3: Generate the SQL and extract parameters
	const sql = assembleSqlQuery(composedClauses);
	const vars = extractSqlVariables(composedClauses);

	// Step 4: Execute the query
	const rawResults =
		(await db.query({ rowMode: "array", text: sql }, vars))?.rows ?? null;

	// Step 5: Transform raw results into final response
	return processQueryResults(rawResults, composedClauses, query, context);
}

/**
 * @typedef {import('./postgres-store.js').CreateResource} CreateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Creates a new resource in the database
 * @param {CreateResource} resource - The resource to create
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The created resource
 */
async function create(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const attributeColumns = Object.keys(resource.attributes).map(snakeCase);

	const localRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].localColumn,
	);

	const relationshipColumns = Object.keys(localRelationships).map(
		(r) => resConfig.joins[r].localColumn,
	);

	const idColumns = resource.id ? [snakeCase(idAttribute)] : [];
	const idVars = resource.id ? [resource.id] : [];

	const columns = [...attributeColumns, ...relationshipColumns, ...idColumns];
	const placeholders = replacePlaceholders(columns.map(() => "?").join(", "));
	const vars = [
		...Object.values(resource.attributes),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	const sql = `
    INSERT INTO ${table}
      (${columns.join(", ")})
    VALUES
      (${placeholders})
		RETURNING *
  `;

	const { rows } = await db.query(sql, vars);
	const created = {};
	Object.entries(rows[0]).forEach(([k, v]) => {
		created[camelCase(k)] = v;
	});

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, val]) => {
			const { foreignColumn } = joins[relName];
			const foreignIdAttribute =
				schema.resources[resSchema.relationships[relName].type].idAttribute ??
				"id";
			const foreignTable =
				config.resources[resSchema.relationships[relName].type].table;

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = NULL
				WHERE ${foreignColumn} = $1
			`,
				[resource.id],
			);

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = $1
				WHERE ${foreignIdAttribute} = ANY ($2)
			`,
				[created[idAttribute], val.map((v) => v.id)],
			);
		}),
	);

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	await Promise.all(
		Object.entries(m2mForeignRelationships).map(async ([relName, val]) => {
			const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

			await Promise.all(
				val.map((v) =>
					db.query(
						`
							INSERT INTO ${joinTable}
							(${localJoinColumn}, ${foreignJoinColumn})
							VALUES ($1, $2)
							ON CONFLICT DO NOTHING
			`,
						[created[idAttribute], v.id],
					),
				),
			);
		}),
	);

	return {
		type: resource.type,
		id: created[idAttribute],
		attributes: pick(created, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * @typedef {import('./postgres-store.js').DeleteResource} DeleteResource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Deletes a resource from the database
 * @param {DeleteResource} resource - The resource to delete
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<DeleteResource>} The deleted resource reference
 */
async function deleteResource(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins = {}, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const sql = `
    DELETE FROM ${table}
    WHERE ${snakeCase(idAttribute)} = $1
		RETURNING *
  `;

	await db.query(sql, [resource.id]);

	// handle to-one foreign columns
	const foreignRelationships = pickBy(joins, (jr) => jr.foreignColumn);
	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, join]) => {
			const { foreignColumn } = join;
			const foreignTable =
				config.resources[resSchema.relationships[relName].type].table;

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = NULL
				WHERE ${foreignColumn} = $1
			`,
				[resource.id],
			);
		}),
	);

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(joins, (jr) => jr.joinTable);
	await Promise.all(
		Object.values(m2mForeignRelationships).map(async (join) => {
			const { joinTable, localJoinColumn } = join;

			await db.query(
				`
				DELETE FROM ${joinTable}
				WHERE ${localJoinColumn} = $1
				`,
				[resource.id],
			);
		}),
	);

	return {
		type: resource.type,
		id: resource.id,
	};
}

/**
 * @typedef {import('./postgres-store.js').UpdateResource} UpdateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Updates an existing resource in the database
 * @param {UpdateResource} resource - The resource to update
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The updated resource
 */
async function update(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const attributeColumns = Object.keys(resource.attributes ?? {}).map(
		snakeCase,
	);

	const localRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].localColumn,
	);

	const relationshipColumns = Object.keys(localRelationships).map(
		(r) => resConfig.joins[r].localColumn,
	);

	const columns = [...attributeColumns, ...relationshipColumns];
	const columnsWithPlaceholders = columns
		.map((col, idx) => `${col} = $${idx + 1}`)
		.join(", ");

	const vars = [
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r.id),
	];

	const updated = {};
	let firstResult;
	if (columnsWithPlaceholders.length > 0) {
		const sql = `
			UPDATE ${table}
				SET ${columnsWithPlaceholders}
			WHERE ${snakeCase(idAttribute)} = $${columns.length + 1}
			RETURNING *
		`;

		const { rows } = await db.query(sql, [...vars, resource.id]);
		firstResult = rows[0];
	} else {
		const { rows } = await db.query(
			`SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
			[resource.id],
		);
		firstResult = rows[0];
	}

	Object.entries(firstResult).forEach(([k, v]) => {
		updated[camelCase(k)] = v;
	});

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, val]) => {
			const { foreignColumn } = joins[relName];
			const foreignIdAttribute =
				schema.resources[resSchema.relationships[relName].type].idAttribute ??
				"id";
			const foreignTable =
				config.resources[resSchema.relationships[relName].type].table;

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = NULL
				WHERE ${foreignColumn} = $1
			`,
				[resource.id],
			);

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = $1
				WHERE ${foreignIdAttribute} = ANY ($2)
			`,
				[updated[idAttribute], val.map((v) => v.id)],
			);
		}),
	);

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	await Promise.all(
		Object.entries(m2mForeignRelationships).map(async ([relName, val]) => {
			const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

			await Promise.all(
				val.map((v) =>
					db.query(
						`
							INSERT INTO ${joinTable}
							(${localJoinColumn}, ${foreignJoinColumn})
							VALUES ($1, $2)
			`,
						[updated[idAttribute], v.id],
					),
				),
			);
		}),
	);

	return {
		type: resource.type,
		id: updated[idAttribute],
		attributes: pick(updated, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * @typedef {import('./postgres-store.js').Context} Context
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').LocalJoin} LocalJoin
 * @typedef {import('./postgres-store.js').ForeignJoin} ForeignJoin
 * @typedef {import('./postgres-store.js').ManyToManyJoin} ManyToManyJoin
 */

/**
 * @typedef {Object} GetOptions
 * @property {boolean} [includeRelationships]
 */

/**
 * @typedef {Context & {options: GetOptions}} GetContext
 */

/**
 * Gets a single resource by type and ID
 * @param {string} type - Resource type
 * @param {string} id - Resource ID
 * @param {GetContext} context - Get context with config, schema, and options
 * @returns {Promise<Resource>} The resource
 */
async function getOne(type, id, context) {
	const { config, options = {}, schema } = context;
	const { includeRelationships = true } = options;
	const { db } = config;

	const resConfig = config.resources[type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[type];
	const { idAttribute = "id" } = resSchema;
	const attrNames = Object.keys(resSchema.attributes);

	const output = { type, id, attributes: {}, relationships: {} };

	const localRelationships = Object.entries(joins).filter(
		([, j]) => "localColumn" in j,
	);
	const foreignRelationships = Object.entries(joins).filter(
		([, j]) => "foreignColumn" in j,
	);
	const manyToManyRelationships = Object.entries(joins).filter(
		([, j]) => "localJoinColumn" in j,
	);

	const foreignQueries = includeRelationships
		? [
				...foreignRelationships.map(async ([joinName, joinInfo]) => {
					const { foreignColumn } = joinInfo;
					const relSchema = resSchema.relationships[joinName];
					const relResSchema = schema.resources[relSchema.type];
					const relConfig = config.resources[relSchema.type];
					const foreignTable = relConfig.table;
					const foreignId = snakeCase(relResSchema.idAttribute ?? "id");

					const { rows } = await db.query(
						{
							rowMode: "array",
							text: `SELECT ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} = $1`,
						},
						[id],
					);

					output.relationships[joinName] =
						relSchema.cardinality === "one"
							? rows[0]
								? { type: relSchema.type, id: rows[0][0] }
								: null
							: rows.map((r) => ({ type: relSchema.type, id: r[0] }));
				}),
				...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
					const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
					const relSchema = resSchema.relationships[joinName];

					const { rows } = await db.query(
						{
							rowMode: "array",
							text: `SELECT ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} = $1`,
						},
						[id],
					);

					output.relationships[joinName] = rows.map((r) => ({
						type: relSchema.type,
						id: r[0],
					}));
				}),
			]
		: [];

	const cols = [
		...attrNames.map((attrName) =>
			columnTypeModifiers[resSchema.attributes[attrName].type]
				? columnTypeModifiers[resSchema.attributes[attrName].type].select(
						snakeCase(attrName),
					)
				: snakeCase(attrName),
		),
		...localRelationships.map(([, r]) => snakeCase(r.localColumn)),
	].join(", ");
	const localQuery = db.query(
		{
			rowMode: "array",
			text: `SELECT ${cols} FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
		},
		[id],
	);

	const [localResult] = await Promise.all([localQuery, ...foreignQueries]);

	const { rows } = localResult;
	const row = rows[0];
	if (!row) return null;

	attrNames.forEach((attr, idx) => {
		const attrType = resSchema.attributes[attr].type;

		output.attributes[attr] =
			typeof row[idx] === "string" && columnTypeModifiers[attrType]
				? columnTypeModifiers[attrType].extract(row[idx])
				: row[idx];
	});

	if (includeRelationships) {
		localRelationships.forEach(([relName], idx) => {
			const id = row[idx + attrNames.length];
			output.relationships[relName] = id
				? {
						type: resSchema.relationships[relName].type,
						id,
					}
				: null;
		});
	}

	return output;
}

/**
 * Gets all resources of a given type
 * @param {string} type - Resource type
 * @param {GetContext} context - Get context with config, schema, and options
 * @returns {Promise<Resource[]>} Array of resources
 */
async function getAll(type, context) {
	const { config, options = {}, schema } = context;
	const { includeRelationships = true } = options;
	const { db } = config;

	const resConfig = config.resources[type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[type];
	const attrNames = Object.keys(resSchema.attributes);

	const resources = {};

	const localRelationships = Object.entries(joins).filter(
		([, j]) => "localColumn" in j,
	);

	const cols = [
		snakeCase(resSchema.idAttribute ?? "id"),
		...attrNames.map((attrName) =>
			columnTypeModifiers[resSchema.attributes[attrName].type]
				? columnTypeModifiers[resSchema.attributes[attrName].type].select(
						snakeCase(attrName),
					)
				: snakeCase(attrName),
		),
		...localRelationships.map(([, r]) => snakeCase(r.localColumn)),
	].join(", ");
	const localQuery = db.query({
		rowMode: "array",
		text: `SELECT ${cols} FROM ${table}`,
	});

	const { rows } = await localQuery;

	rows.forEach((row) => {
		const resource = { type, id: row[0], attributes: {} };
		if (includeRelationships) {
			resource.relationships = mapValues(resSchema.relationships, (rel) =>
				rel.cardinality === "one" ? null : [],
			);
		}

		attrNames.forEach((attr, idx) => {
			const attrType = resSchema.attributes[attr].type;

			resource.attributes[attr] =
				typeof row[idx + 1] === "string" && columnTypeModifiers[attrType]
					? columnTypeModifiers[attrType].extract(row[idx + 1])
					: row[idx + 1];
		});

		if (includeRelationships) {
			localRelationships.forEach(([relName], idx) => {
				const id = row[idx + attrNames.length + 1];
				resource.relationships[relName] = id
					? {
							type: resSchema.relationships[relName].type,
							id,
						}
					: null;
			});
		}

		resources[resource.id] = resource;
	});

	if (includeRelationships) {
		const foreignRelationships = Object.entries(joins).filter(
			([, j]) => "foreignColumn" in j,
		);
		const manyToManyRelationships = Object.entries(joins).filter(
			([, j]) => "localJoinColumn" in j,
		);

		const foreignQueries = [
			...foreignRelationships.map(async ([joinName, joinInfo]) => {
				const { foreignColumn } = joinInfo;
				const relSchema = resSchema.relationships[joinName];
				const relResSchema = schema.resources[relSchema.type];
				const relConfig = config.resources[relSchema.type];
				const foreignTable = relConfig.table;
				const foreignId = snakeCase(relResSchema.idAttribute ?? "id");

				const { rows } = await db.query({
					rowMode: "array",
					text: `SELECT ${foreignColumn}, ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} IS NOT NULL`,
				});

				rows.forEach((row) => {
					const resource = resources[row[0]];

					if (relSchema.cardinality === "one") {
						resource.relationships[joinName] = {
							type: relSchema.type,
							id: row[1],
						};
					} else {
						resource.relationships[joinName].push({
							type: relSchema.type,
							id: row[1],
						});
					}
				});
			}),
			...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
				const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
				const relSchema = resSchema.relationships[joinName];

				const { rows } = await db.query({
					rowMode: "array",
					text: `SELECT ${localJoinColumn}, ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} IS NOT NULL`,
				});

				rows.forEach((row) => {
					const resource = resources[row[0]];

					resource.relationships[joinName].push({
						type: relSchema.type,
						id: row[1],
					});
				});
			}),
		];

		await Promise.all([...foreignQueries]);
	}

	return Object.values(resources);
}

/**
 * @typedef {import('./postgres-store.js').CreateResource} CreateResource
 * @typedef {import('./postgres-store.js').UpdateResource} UpdateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Upserts a resource row (INSERT ... ON CONFLICT ... DO UPDATE)
 * @param {CreateResource|UpdateResource} resource - The resource to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The upserted resource
 */
async function upsertResourceRow(resource, context) {
	const { config, schema } = context;
	const { db } = config;

	const resSchema = schema.resources[resource.type];
	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const { idAttribute = "id" } = resSchema;

	const attributeColumns = Object.keys(resource.attributes ?? {}).map(
		snakeCase,
	);

	const localRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].localColumn,
	);

	const relationshipColumns = Object.keys(localRelationships).map(
		(r) => resConfig.joins[r].localColumn,
	);

	const idColumns = resource.id ? [snakeCase(idAttribute)] : [];
	const idVars = resource.id ? [resource.id] : [];

	const columns = [...attributeColumns, ...relationshipColumns, ...idColumns];
	const placeholders = replacePlaceholders(columns.map(() => "?").join(", "));
	const vars = [
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	const updateColumns = [...attributeColumns, ...relationshipColumns]
		.map((col) => `${col} = EXCLUDED.${col}`)
		.join(", ");

	const conflictClause =
		updateColumns.length === 0
			? "DO NOTHING"
			: `DO UPDATE SET ${updateColumns}`;

	const sql = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
		ON CONFLICT(${snakeCase(idAttribute)})
			${conflictClause}
		RETURNING *
  `;

	const { rows } = await db.query(sql, vars);
	const upserted = { [idAttribute]: resource.id };
	Object.entries(rows[0] ?? {}).forEach(([k, v]) => {
		upserted[camelCase(k)] = v;
	});

	return {
		type: resource.type,
		id: upserted[idAttribute],
		attributes: pick(upserted, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * Upserts foreign relationship rows for a resource
 * @param {Resource} resource - The resource with relationships to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The resource with upserted relationships
 */
async function upsertForeignRelationshipRows(resource, context) {
	const { config, schema } = context;
	const { db } = config;

	const resSchema = schema.resources[resource.type];
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, val]) => {
			const { foreignColumn } = joins[relName];
			const foreignIdAttribute =
				schema.resources[resSchema.relationships[relName].type].idAttribute ??
				"id";
			const foreignTable =
				config.resources[resSchema.relationships[relName].type].table;

			await db.query(
				`
					UPDATE ${foreignTable}
					SET ${foreignColumn} = NULL
					WHERE ${foreignColumn} = $1
				`,
				[resource.id],
			);

			await db.query(
				`
					UPDATE ${foreignTable}
					SET ${foreignColumn} = $1
					WHERE ${foreignIdAttribute} = ANY ($2)
				`,
				[resource.id, val.map((v) => v.id)],
			);
		}),
	);

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	await Promise.all(
		Object.entries(m2mForeignRelationships).map(async ([relName, val]) => {
			const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

			await Promise.all(
				val.map(async (v) => {
					await db.query(
						`
								DELETE FROM ${joinTable}
								WHERE ${localJoinColumn} = $1
							`,
						[resource.id],
					);
					await db.query(
						`
								INSERT INTO ${joinTable}
								(${localJoinColumn}, ${foreignJoinColumn})
								VALUES ($1, $2)
								ON CONFLICT DO NOTHING
							`,
						[resource.id, v.id],
					);
				}),
			);
		}),
	);

	return {
		type: resource.type,
		id: resource.id,
		attributes: pick(resource, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * Upserts a resource (INSERT or UPDATE) including relationships
 * @param {CreateResource|UpdateResource} resource - The resource to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The upserted resource
 */
async function upsert(resource, context) {
	const upserted = await upsertResourceRow(resource, context);
	return upsertForeignRelationshipRows(upserted, context);
}

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} Resource
 * @property {string} type
 * @property {any} id
 * @property {Object<string, unknown>} attributes
 * @property {Object<string, Ref|Ref[]>} relationships
 */

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref|Ref[]>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {any} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref|Ref[]>} [relationships]
 */

/**
 * @typedef {Object} DeleteResource
 * @property {string} type
 * @property {any} id
 */

/**
 * @typedef {Object} LocalJoin
 * @property {string} localColumn
 * @property {string} [localColumnType]
 */

/**
 * @typedef {Object} ForeignJoin
 * @property {string} foreignColumn
 * @property {string} [foreignColumnType]
 */

/**
 * @typedef {Object} ManyToManyJoin
 * @property {string} joinTable
 * @property {string} localJoinColumn
 * @property {string} [localJoinColumnType]
 * @property {string} foreignJoinColumn
 * @property {string} [foreignJoinColumnType]
 */

/**
 * @typedef {Object} Config
 * @property {import('pg').Client} db
 * @property {Object<string, {
 *   table: string,
 *   idType?: string,
 *   columns?: Object<string, {
 *     select?: (table: string, col: string) => string
 *   }>,
 *   joins?: Object<string, LocalJoin|ForeignJoin|ManyToManyJoin>
 * }>} resources
 * @property {import('ajv').Ajv} [validator]
 */

/**
 * @typedef {Object} Context
 * @property {Config} config
 * @property {import('data-prism').Schema} schema
 */

/**
 * @typedef {Object} GetOptions
 * @property {Object<string, "asc"|"desc">} [order]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object<string, unknown>} [where]
 */

/**
 * @typedef {Object} PostgresStore
 * @property {(type: string, options?: GetOptions) => Promise<Resource[]>} getAll
 * @property {(type: string, id: string, options?: GetOptions) => Promise<Resource>} getOne
 * @property {(resource: CreateResource) => Promise<Resource>} create
 * @property {(resource: UpdateResource) => Promise<Resource>} update
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} upsert
 * @property {(resource: DeleteResource) => Promise<DeleteResource>} delete
 * @property {(query: import('data-prism').RootQuery) => Promise<any>} query
 */

/**
 * Creates a PostgreSQL store instance
 * @param {import('data-prism').Schema} schema - The schema object
 * @param {Config} config - Store configuration
 * @returns {PostgresStore} The PostgreSQL store instance
 */
function createPostgresStore(schema, config) {
	const { validator = createValidator() } = config;

	ensureValidSchema(schema, { validator });

	return {
		async getAll(type, options = {}) {
			return getAll(type, { config, options, schema });
		},

		async getOne(type, id, options = {}) {
			return getOne(type, id, { config, options, schema });
		},

		async create(resource) {
			const errors = validateCreateResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return create(resource, { config, schema });
		},

		async update(resource) {
			const errors = validateUpdateResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return update(resource, { config, schema });
		},

		async upsert(resource) {
			const errors = validateMergeResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return upsert(resource, { config, schema });
		},

		async delete(resource) {
			const errors = validateDeleteResource(schema, resource);
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return deleteResource(resource, { config, schema });
		},

		async query(query$1) {
			const normalized = normalizeQuery(schema, query$1);
			return query(normalized, {
				config,
				schema,
				query: normalized,
			});
		},
	};
}

export { createPostgresStore };
