/*!
 * rrule.js - Library for working with recurrence rules for calendar dates.
  * v1.0.0-beta
 * https://github.com/jkbr/rrule
 *
 * Copyright 2010, Jakub Roztocil and Lars Schoning
 * Licenced under the BSD licence.
 * https://github.com/jkbr/rrule/blob/master/LICENCE
 *
 * Based on:
 * python-dateutil - Extensions to the standard Python datetime module.
 * Copyright (c) 2003-2011 - Gustavo Niemeyer <gustavo@niemeyer.net>
 * Copyright (c) 2012 - Tomi Pieviläinen <tomi.pievilainen@iki.fi>
 * https://github.com/jkbr/rrule/blob/master/LICENCE
 *
 */
(function(root){

var serverSide = typeof module !== 'undefined' && module.exports;
var _;

if (serverSide) {
    _ = require('underscore');
} else if (!(_ = root._)) {
    throw 'You need to include underscore.js for rrule to work.'
}


var getnlp = function() {
    if (!getnlp._nlp) {
        if (serverSide) {
            // Lazy, runtime import to avoid circular refs.
            getnlp._nlp = require('./nlp')
        } else if (!(getnlp._nlp = root._RRuleNLP)) {
            throw 'You need to include rrule/nlp.js ' +
                  'for fromText/toText to work.'
        }
    }
    return getnlp._nlp;
}



//=============================================================================
// Date utilities
//=============================================================================

/**
 * General date-related utilities.
 * Also handles several incompatibilities between JavaScript and Python
 *
 */
var dateutil = {

    MONTH_DAYS: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],

    /**
     * Number of milliseconds of one day
     */
    ONE_DAY: 1000 * 60 * 60 * 24,

    /**
     * @see: <http://docs.python.org/library/datetime.html#datetime.MAXYEAR>
     */
    MAXYEAR: 9999,

    /**
     * Python uses 1-Jan-1 as the base for calculating ordinals but we don't
     * want to confuse the JS engine with milliseconds > Number.MAX_NUMBER,
     * therefore we use 1-Jan-1970 instead
     */
    ORDINAL_BASE: new Date(1970, 0, 1),

    /**
     * Python: MO-SU: 0 - 6
     * JS: SU-SAT 0 - 6
     */
    PY_WEEKDAYS: [6, 0, 1, 2, 3, 4, 5],

    /**
     * py_date.timetuple()[7]
     */
    getYearDay: function(date) {
        var dateNoTime = new Date(
            date.getFullYear(), date.getMonth(), date.getDate());
        return Math.ceil(
            (dateNoTime - new Date(date.getFullYear(), 0, 1))
            / dateutil.ONE_DAY) + 1;
    },

    isLeapYear: function(year) {
        if (year instanceof Date) {
            year = year.getFullYear();
        }
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    },

    /**
     * @return {Number} the date's timezone offset in ms
     */
    tzOffset: function(date) {
         return date.getTimezoneOffset() * 60 * 1000
    },

    /**
     * @see: <http://www.mcfedries.com/JavaScript/DaysBetween.asp>
     */
    daysBetween: function(date1, date2) {
        // The number of milliseconds in one day
        // Convert both dates to milliseconds
        var date1_ms = date1.getTime() - dateutil.tzOffset(date1);
        var date2_ms = date2.getTime() - dateutil.tzOffset(date2);
        // Calculate the difference in milliseconds
        var difference_ms = Math.abs(date1_ms - date2_ms);
        // Convert back to days and return
        return Math.round(difference_ms / dateutil.ONE_DAY);
    },

    /**
     * @see: <http://docs.python.org/library/datetime.html#datetime.date.toordinal>
     */
    toOrdinal: function(date) {
        return dateutil.daysBetween(date, dateutil.ORDINAL_BASE);
    },

    /**
     * @see - <http://docs.python.org/library/datetime.html#datetime.date.fromordinal>
     */
    fromOrdinal: function(ordinal) {
        var millisecsFromBase = ordinal * dateutil.ONE_DAY;
        return new Date(dateutil.ORDINAL_BASE.getTime()
                        - dateutil.tzOffset(dateutil.ORDINAL_BASE)
                        +  millisecsFromBase);
    },

    /**
     * @see: <http://docs.python.org/library/calendar.html#calendar.monthrange>
     */
    monthRange: function(year, month) {
        var date = new Date(year, month, 1);
        return [dateutil.getWeekday(date), dateutil.getMonthDays(date)];
    },

    getMonthDays: function(date) {
        var month = date.getMonth();
        return month == 1 && dateutil.isLeapYear(date)
            ? 29 : dateutil.MONTH_DAYS[month];
    },

    /**
     * @return {Number} python-like weekday
     */
    getWeekday: function(date) {
        return dateutil.PY_WEEKDAYS[date.getDay()];
    },

    /**
     * @see: <http://docs.python.org/library/datetime.html#datetime.datetime.combine>
     */
    combine: function(date, time) {
        time = time || date;
        return new Date(
            date.getFullYear(), date.getMonth(), date.getDate(),
            time.getHours(), time.getMinutes(), time.getSeconds()
        );
    },

    clone: function(date) {
        var dolly = new Date(date.getTime());
        dolly.setMilliseconds(0);
        return dolly;
    },

    cloneDates: function(dates) {
        var clones = [];
        for (var i = 0; i < dates.length; i++) {
            clones.push(dateutil.clone(dates[i]));
        }
        return clones;
    },

    /**
     * Sorts an array of Date or dateutil.Time objects
     */
    sort: function(dates) {
        dates.sort(function(a, b){
            return a.getTime() - b.getTime();
        });
    },

    timeToUntilString: function(time) {
        var date = new Date(time);
        var comp, comps = [
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            date.getUTCDate(),
            'T',
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds(),
            'Z'
        ];
        for (var i = 0; i < comps.length; i++) {
            comp = comps[i];
            if (!/[TZ]/.test(comp) && comp < 10) {
                comps[i] = '0' + String(comp);
            }
        }
        return comps.join('');
    }

};

dateutil.Time = function(hour, minute, second) {
    this.hour = hour;
    this.minute = minute;
    this.second = second;
};

dateutil.Time.prototype = {
    getHours: function() {
        return this.hour;
    },
    getMinutes: function() {
        return this.minute;
    },
    getSeconds: function() {
        return this.second;
    },
    getTime: function() {
        return ((this.hour * 60 * 60)
                 + (this.minute * 60)
                 + this.second)
               * 1000;
    }
};


//=============================================================================
// Helper functions
//=============================================================================


/**
 * Simplified version of python's range()
 */
var range = function(start, end) {
    if (arguments.length === 1) {
        end = start;
        start = 0;
    }
    var rang = [];
    for (var i = start; i < end; i++) {
        rang.push(i);
    }
    return rang;
};
var repeat = function(value, times) {
    var i = 0, array = [];
    if (value instanceof Array) {
        for (; i < times; i++) {
            array[i] = [].concat(value);
        }
    } else {
        for (; i < times; i++) {
            array[i] = value;
        }
    }
    return array;
};


/**
 * closure/goog/math/math.js:modulo
 * Copyright 2006 The Closure Library Authors.
 * The % operator in JavaScript returns the remainder of a / b, but differs from
 * some other languages in that the result will have the same sign as the
 * dividend. For example, -1 % 8 == -1, whereas in some other languages
 * (such as Python) the result would be 7. This function emulates the more
 * correct modulo behavior, which is useful for certain applications such as
 * calculating an offset index in a circular list.
 *
 * @param {number} a The dividend.
 * @param {number} b The divisor.
 * @return {number} a % b where the result is between 0 and b (either 0 <= x < b
 *     or b < x <= 0, depending on the sign of b).
 */
var pymod = function(a, b) {
  var r = a % b;
  // If r and b differ in sign, add b to wrap the result to the correct sign.
  return (r * b < 0) ? r + b : r;
};


/**
 * @see: <http://docs.python.org/library/functions.html#divmod>
 */
var divmod = function(a, b) {
    return {div: Math.floor(a / b), mod: pymod(a, b)};
};


/**
 * Python-like boolean
 * @return {Boolean} value of an object/primitive, taking into account
 * the fact that in Python an empty list's/tuple's
 * boolean value is False, whereas in JS it's true
 */
var plb = function(obj) {
    return (obj instanceof Array && obj.length == 0)
        ? false
        : Boolean(obj);
};


//=============================================================================
// Date masks
//=============================================================================

// Every mask is 7 days longer to handle cross-year weekly periods.

var M366MASK = [].concat(
    repeat(1, 31),  repeat(2, 29),  repeat(3, 31),
    repeat(4, 30),  repeat(5, 31),  repeat(6, 30),
    repeat(7, 31),  repeat(8, 31),  repeat(9, 30),
    repeat(10, 31), repeat(11, 30), repeat(12, 31),
    repeat(1, 7)
);
var M365MASK = [].concat(M366MASK);

var
    M29 = range(1, 30),
    M30 = range(1, 31),
    M31 = range(1, 32);

var MDAY366MASK = [].concat(
    M31, M29, M31,
    M30, M31, M30,
    M31, M31, M30,
    M31, M30, M31,
    M31.slice(0, 7)
);
var MDAY365MASK = [].concat(MDAY366MASK);

M29 = range(-29, 0);
M30 = range(-30, 0);
M31 = range(-31, 0);

var NMDAY366MASK = [].concat(
    M31, M29, M31,
    M30, M31, M30,
    M31, M31, M30,
    M31, M30, M31,
    M31.slice(0, 7)
);
var NMDAY365MASK = [].concat(NMDAY366MASK);

var M366RANGE = [0,31,60,91,121,152,182,213,244,274,305,335,366];
var M365RANGE = [0,31,59,90,120,151,181,212,243,273,304,334,365];

var WDAYMASK = (function() {
    for (var wdaymask = [], i = 0; i < 55; i++) {
        wdaymask = wdaymask.concat(range(7));
    }
    return wdaymask;
}());

M29 = M30 = M31 = null;
M365MASK = M365MASK.slice(0, 58).concat(M365MASK.slice(59, M365MASK.length));
MDAY365MASK = MDAY365MASK.slice(0, 58).concat(MDAY365MASK.slice(59));
NMDAY365MASK = NMDAY365MASK.slice(0, 30).concat(NMDAY365MASK.slice(31));


//=============================================================================
// Weekday
//=============================================================================

var Weekday = function(weekday, n) {
    if (n === 0) {
        throw 'Can\'t create weekday with n == 0';
    }
    this.weekday = weekday;
    this.n = n;
};

Weekday.prototype = {

    // __call__ - Cannot call the object directly, do it through
    // e.g. RRule.TH.clone(-1) instead,
    clone: function(n) {
        return this.n == n ? this : new Weekday(this.weekday, n);
    },

    // __eq__
    equals: function(other) {
        return this.weekday == other.weekday && this.n == other.n;
    },

    // __repr__
    toString: function() {
        var s = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][this.weekday];
        if (this.n) {
            s = (this.n > 0 ? '+' : '') + String(this.n) + s;
        }
        return s;
    },

    getJsWeekday: function() {
        return this.weekday == 6 ? 0 : this.weekday + 1;
    }

};


//=============================================================================
// RRule
//=============================================================================

/**
 *
 * @param {String} freq - one of RRule.YEARLY, RRule.MONTHLY, ...
 * @param {Object?} options - see <http://labix.org/python-dateutil/#head-cf004ee9a75592797e076752b2a889c10f445418>
 * @constructor
 */
var RRule = function(freq, options) {

    // RFC string
    this._string = null;

    this._cache = {
        all: false,
        before: [],
        after: [],
        between: []
    };

    var defaults = {
        cache:       true,
        dtstart:     null,
        interval:    1,
        wkst:        0,
        count:      null,
        until:      null,
        bysetpos:    null,
        bymonth:     null,
        bymonthday:  null,
        byyearday:   null,
        byweekno:    null,
        byweekday:   null,
        byhour:      null,
        byminute:    null,
        bysecond:    null,
        // not implemented:
        byeaster:    null
    };

    var invalid = _(options)
        .chain()
        .keys()
        .reject(function(name){
            return _.has(defaults, name)
        })
        .value();
    if (invalid.length) {
        throw 'Invalid options: ' + invalid.join(', ')
    }

    // used by toString()
    this.origOptions = _.clone(options);

    var opts;
    this.freq = freq;
    this.options = opts = _.extend(defaults, options);

    if (opts.byeaster !== null) {
        throw new Error('byeaster not implemented');
    }

    if (!opts.dtstart) {
        opts.dtstart = new Date();
        opts.dtstart.setMilliseconds(0);
    }

    if (opts.wkst === null) {
        opts.wkst = RRule.MO.weekday;
    } else if (typeof opts.wkst == 'number') {
        // cool, just keep it like that
    } else {
        opts.wkst = opts.wkst.weekday;
    }

    if (opts.bysetpos !== null) {
        if (typeof opts.bysetpos == 'number') {
            opts.bysetpos = [opts.bysetpos];
        }
        for (var i = 0; i < opts.bysetpos.length; i++) {
            var v = opts.bysetpos[i];
            if (v == 0 || !(-366 <= v && v <= 366)) {
                throw 'bysetpos must be between 1 and 366, or between -366 and -1';
            }
        }
    }

    if (!(plb(opts.byweekno) || plb(opts.byyearday)
        || plb(opts.bymonthday) || opts.byweekday !== null
        || opts.byeaster !== null))
    {
        switch (this.freq) {
            case RRule.YEARLY:
                if (!opts.bymonth) {
                    opts.bymonth = opts.dtstart.getMonth() + 1;
                }
                opts.bymonthday = opts.dtstart.getDate();
                break;
            case RRule.MONTHLY:
                opts.bymonthday = opts.dtstart.getDate();
                break;
            case RRule.WEEKLY:
                opts.byweekday = dateutil.getWeekday(
                                            opts.dtstart);
                break;
        }
    }

    // bymonth
    if (opts.bymonth !== null
        && !(opts.bymonth instanceof Array)) {
        opts.bymonth = [opts.bymonth];
    }

    // byyearday
    if (opts.byyearday !== null
        && !(opts.byyearday instanceof Array)) {
        opts.byyearday = [opts.byyearday];
    }

    // bymonthday
    if (opts.bymonthday === null) {
        opts.bymonthday = [];
        opts.bynmonthday = [];
    } else if (opts.bymonthday instanceof Array) {
        var bymonthday = [], bynmonthday = [];

        for (i = 0; i < opts.bymonthday.length; i++) {
            var v = opts.bymonthday[i];
            if (v > 0) {
                bymonthday.push(v);
            } else if (v < 0) {
                bynmonthday.push(v);
            }
        }
        opts.bymonthday = bymonthday;
        opts.bynmonthday = bynmonthday;
    } else {
        if (opts.bymonthday < 0) {
            opts.bynmonthday = [opts.bymonthday];
            opts.bymonthday = [];
        } else {
            opts.bynmonthday = [];
            opts.bymonthday = [opts.bymonthday];
        }
    }

    // byweekno
    if (opts.byweekno !== null
        && !(opts.byweekno instanceof Array)) {
        opts.byweekno = [opts.byweekno];
    }

    // byweekday / bynweekday
    if (opts.byweekday === null) {
        opts.bynweekday = null;
    } else if (typeof opts.byweekday == 'number') {
        opts.byweekday = [opts.byweekday];
        opts.bynweekday = null;

    } else if (opts.byweekday instanceof Weekday) {

        if (!opts.byweekday.n || this.freq > RRule.MONTHLY) {
            opts.byweekday = [opts.byweekday.weekday];
            opts.bynweekday = null;
        } else {
            opts.bynweekday = [
                [opts.byweekday.weekday,
                 opts.byweekday.n]
            ];
            opts.byweekday = null;
        }

    } else {
        var byweekday = [], bynweekday = [];

        for (i = 0; i < opts.byweekday.length; i++) {
            var wday = opts.byweekday[i];

            if (typeof wday == 'number') {
                byweekday.push(wday);
            } else if (!wday.n || this.freq > RRule.MONTHLY) {
                byweekday.push(wday.weekday);
            } else {
                bynweekday.push([wday.weekday, wday.n]);
            }
        }
        opts.byweekday = plb(byweekday) ? byweekday : null;
        opts.bynweekday = plb(bynweekday) ? bynweekday : null;
    }

    // byhour
    if (opts.byhour === null) {
        opts.byhour = (this.freq < RRule.HOURLY)
            ? [opts.dtstart.getHours()]
            : null;
    } else if (typeof opts.byhour == 'number') {
        opts.byhour = [opts.byhour];
    }

    // byminute
    if (opts.byminute === null) {
        opts.byminute = (this.freq < RRule.MINUTELY)
            ? [opts.dtstart.getMinutes()]
            : null;
    } else if (typeof opts.byminute == 'number') {
        opts.byminute = [opts.byminute];
    }

    // bysecond
    if (opts.bysecond === null) {
        opts.bysecond = (this.freq < RRule.SECONDLY)
            ? [opts.dtstart.getSeconds()]
            : null;
    } else if (typeof opts.bysecond == 'number') {
        opts.bysecond = [opts.bysecond];
    }

    if (this.freq >= RRule.HOURLY) {
        this.timeset = null;
    } else {
        this.timeset = [];
        for (i = 0; i < opts.byhour.length; i++) {
            var hour = opts.byhour[i];
            for (var j = 0; j < opts.byminute.length; j++) {
                var minute = opts.byminute[j];
                for (var k = 0; k < opts.bysecond.length; k++) {
                    var second = opts.bysecond[k];
                    // python:
                    // datetime.time(hour, minute, second,
                    // tzinfo=self._tzinfo))
                    this.timeset.push(new dateutil.Time(hour, minute, second));
                }
            }
        }
        dateutil.sort(this.timeset);
    }

};
//}}}

// RRule class 'constants'

RRule.FREQUENCIES = [
    'YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY',
    'HOURLY', 'MINUTELY', 'SECONDLY'
];

RRule.YEARLY   = 0;
RRule.MONTHLY  = 1;
RRule.WEEKLY   = 2;
RRule.DAILY    = 3;
RRule.HOURLY   = 4;
RRule.MINUTELY = 5;
RRule.SECONDLY = 6;

RRule.MO = new Weekday(0);
RRule.TU = new Weekday(1);
RRule.WE = new Weekday(2);
RRule.TH = new Weekday(3);
RRule.FR = new Weekday(4);
RRule.SA = new Weekday(5);
RRule.SU = new Weekday(6);


RRule.fromText = function(text, dtstart, language) {
    return getnlp().fromText(text, dtstart, language)
}

RRule.prototype = {

    /**
     * @param {Function} iterator - optional function that will be called
     *                   on each date that is added. It can return false
     *                   to stop the iteration.
     * @return Array containing all recurrences.
     */
    all: function(iterator) {
        if (iterator) {
            return this._iter(new CallbackIterResult('all', {}, iterator));
        } else {
            var result = this._cacheGet('all');
            if (result === false) {
                result = this._iter(new IterResult('all', {}));
                this._cacheAdd('all', result);
            }
            return result;
        }
    },

    /**
     * Returns all the occurrences of the rrule between after and before.
     * The inc keyword defines what happens if after and/or before are
     * themselves occurrences. With inc == True, they will be included in the
     * list, if they are found in the recurrence set.
     * @return Array
     */
    between: function(after, before, inc, iterator) {
        var args = {
                before: before,
                after: after,
                inc: inc
            }

        if (iterator) {
            return this._iter(
                new CallbackIterResult('between', args, iterator));
        } else {
            var result = this._cacheGet('between', args);
            if (result === false) {
                result = this._iter(new IterResult('between', args));
                this._cacheAdd('between', result, args);
            }
            return result;
        }
    },

    /**
     * Returns the last recurrence before the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     * @return Date or null
     */
    before: function(dt, inc) {
        var args = {
                dt: dt,
                inc: inc
            },
            result = this._cacheGet('before', args);
        if (result === false) {
            result = this._iter(new IterResult('before', args));
            this._cacheAdd('before', result, args);
        }
        return result;
    },

    /**
     * Returns the first recurrence after the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     * @return Date or null
     */
    after: function(dt, inc) {
        var args = {
                dt: dt,
                inc: inc
            },
            result = this._cacheGet('after', args);
        if (result === false) {
            result = this._iter(new IterResult('after', args));
            this._cacheAdd('after', result, args);
        }
        return result;
    },

    /**
     * Returns the number of recurrences in this set. It will have go trough
     * the whole recurrence, if this hasn't been done before.
     */
    count: function() {
        return this.all().length;
    },

    /**
     * Converts the rrule into its string representation
     * @see <http://www.ietf.org/rfc/rfc2445.txt>
     * @return String
     */
    toString: function() {
        var attrs = [], key, keys, value,
            origValue, currentValue, strValues;

        if (this._string) {
            return this._string;
        }

        keys = [
            'byhour', 'byminute', 'bymonth',
            'bymonthday', 'bysecond', 'bysetpos',
            'byweekday', 'byweekno', 'byyearday',
            'count', 'interval', 'until', 'wkst'
        ];

        attrs.push(['FREQ', RRule.FREQUENCIES[this.freq]]);

        for (var i = 0; i < keys.length; i++) {

            key = keys[i];

            // Only attributes specified in the options argument
            // passed to the constructor will be included in the string
            // representation
            if (typeof this.origOptions[key] == 'undefined') {
                continue;
            }

            // Do not modify the currentValue array, use this instead
            // to store string values
            strValues = [];

            // Some values are taken from the original options array
            // (this.origOptions), and some from the modified version
            // (this.options).
            currentValue = this.options[key];
            origValue = this.origOptions[key];

            key = key.toUpperCase();

            switch (key) {
                case 'WKST':
                    value = new Weekday(currentValue).toString();
                    break;
                case 'BYWEEKDAY':
                    key = 'BYDAY';
                    // XXX: always use origValue, this won't work as expected
                    //      when byweekday contains +n and also -n
                    value = (currentValue === null)
                                ? this.options.bynweekday
                                : currentValue;
                    for (var wday, j = 0; j < value.length; j++) {
                        wday = value[j];
                        if (wday instanceof Array) {
                            wday = new Weekday(wday[0], wday[1]);
                        } else {
                            wday = new Weekday(wday);
                        }
                        strValues[j] = wday.toString();
                    }
                    value = strValues;
                    break;
                case'UNTIL':
                    value = dateutil.timeToUntilString(currentValue);
                    break;
                default:
                    if (origValue instanceof Array) {
                        for (var j = 0; j < origValue.length; j++) {
                            strValues[j] = String(origValue[j]);
                        }
                        value = strValues;
                    } else {
                        value = String(origValue);
                    }

            }
            attrs.push([key, value]);
        }

        var strings = [];
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            strings.push(attr[0] + '=' + attr[1].toString());
        }
        this._string = strings.join(';');
        return this._string;

    },

	/**
	* Will convert all rules described in nlp:ToText
	* to text.
	*/
	toText: function(today, today, gettext, language) {
        if (!_.has(this, '_text')) {
            this._text = getnlp().toText(this, today, gettext, language);
        }
        return this._text;
	},

    isFullyConvertibleToText: function() {
        return getnlp().isFullyConvertible(this)
    },

    /**
     * @param {String} what - all/before/after/between
     * @param {Array,Date} value - an array of dates, one date, or null
     * @param {Object?} args - _iter arguments
     */
    _cacheAdd: function(what, value, args) {

        if (!this.options.cache) return;

        if (value) {
            value = (value instanceof Date)
                        ? dateutil.clone(value)
                        : dateutil.cloneDates(value);
        }

        if (what == 'all') {
                this._cache.all = value;
        } else {
            args._value = value;
            this._cache[what].push(args);
        }

    },

    /**
     * @return false - not in the cache
     *         null  - cached, but zero occurrences (before/after)
     *         Date  - cached (before/after)
     *         []    - cached, but zero occurrences (all/between)
     *         [Date1, DateN] - cached (all/between)
     */
    _cacheGet: function(what, args) {

        if (!this.options.cache) {
            return false;
        }

        var cached = false;

        if (what == 'all') {
            cached = this._cache.all;
        } else {
            // Let's see whether we've already called the
            // 'what' method with the same 'args'
            loopItems:
            for (var item, i = 0; i < this._cache[what].length; i++) {
                item = this._cache[what][i];
                for (var k in args) {
                    if (args.hasOwnProperty(k)
                        && String(args[k]) != String(item[k])) {
                        continue loopItems;
                    }
                }
                cached = item._value;
                break;
            }
        }

        if (!cached && this._cache.all) {
            // Not in the cache, but we already know all the occurrences,
            // so we can find the correct dates from the cached ones.
            var iterResult = new IterResult(what, args);
            for (var i = 0; i < this._cache.all.length; i++) {
                if (!iterResult.accept(this._cache.all[i])) {
                    break;
                }
            }
            cached = iterResult.getValue();
            this._cacheAdd(what, cached, args);
        }

        return cached instanceof Array
            ? dateutil.cloneDates(cached)
            : (cached instanceof Date
                ? dateutil.clone(cached)
                : cached);
    },

    /**
     * @return a RRule instance with the same freq and options
     *          as this one (cache is not cloned)
     */
    clone: function() {
        return new RRule(this.freq, this.origOptions);
    },

    _iter: function(iterResult) {

        /* Since JavaScript doesn't have the python's yield operator (<1.7),
           we use the IterResult object that tells us when to stop iterating.

        */

        var dtstart = this.options.dtstart;

        var
            year = dtstart.getFullYear(),
            month = dtstart.getMonth() + 1,
            day = dtstart.getDate(),
            hour = dtstart.getHours(),
            minute = dtstart.getMinutes(),
            second = dtstart.getSeconds(),
            weekday = dateutil.getWeekday(dtstart),
            yearday = dateutil.getYearDay(dtstart);

        // Some local variables to speed things up a bit
        var
            freq = this.freq,
            interval = this.options.interval,
            wkst = this.options.wkst,
            until = this.options.until,
            bymonth = this.options.bymonth,
            byweekno = this.options.byweekno,
            byyearday = this.options.byyearday,
            byweekday = this.options.byweekday,
            byeaster = this.options.byeaster,
            bymonthday = this.options.bymonthday,
            bynmonthday = this.options.bynmonthday,
            bysetpos = this.options.bysetpos,
            byhour = this.options.byhour,
            byminute = this.options.byminute,
            bysecond = this.options.bysecond;

        var ii = new Iterinfo(this);
        ii.rebuild(year, month);

        var getdayset = {};
        getdayset[RRule.YEARLY]   = ii.ydayset;
        getdayset[RRule.MONTHLY]  = ii.mdayset;
        getdayset[RRule.WEEKLY]   = ii.wdayset;
        getdayset[RRule.DAILY]    = ii.ddayset;
        getdayset[RRule.HOURLY]   = ii.ddayset;
        getdayset[RRule.MINUTELY] = ii.ddayset;
        getdayset[RRule.SECONDLY] = ii.ddayset;

        getdayset = getdayset[freq];

        var timeset;
        if (freq < RRule.HOURLY) {
            timeset = this.timeset;
        } else {
            var gettimeset = {};
            gettimeset[RRule.HOURLY]   = ii.htimeset;
            gettimeset[RRule.MINUTELY] = ii.mtimeset;
            gettimeset[RRule.SECONDLY] = ii.stimeset;
            gettimeset = gettimeset[freq];
            if ((freq >= RRule.HOURLY   && plb(byhour)   && !_.include(byhour, hour)) ||
                (freq >= RRule.MINUTELY && plb(byminute) && !_.include(byminute, minute)) ||
                (freq >= RRule.SECONDLY && plb(bysecond) && !_.include(bysecond, minute)))
            {
                timeset = [];
            } else {
                timeset = gettimeset.call(ii, hour, minute, second);
            }
        }

        var filtered, total = 0, count = this.options.count;

        var iterNo = 0;

        var i, j, k, dm, div, mod, tmp, pos, dayset, start, end, fixday;

        while (true) {

            // Get dayset with the right frequency
            tmp = getdayset.call(ii, year, month, day);
            dayset = tmp[0]; start = tmp[1]; end = tmp[2];

            // Do the "hard" work ;-)
            filtered = false;
            for (j = start; j < end; j++) {

                i = dayset[j];

                if ((plb(bymonth) && !_.include(bymonth, ii.mmask[i])) ||
                    (plb(byweekno) && !ii.wnomask[i]) ||
                    (plb(byweekday) && !_.include(byweekday, ii.wdaymask[i])) ||
                    (plb(ii.nwdaymask) && !ii.nwdaymask[i]) ||
                    (plb(byeaster) && !ii.eastermask[i]) ||
                    (
                        (plb(bymonthday) || plb(bynmonthday)) &&
                        !_.include(bymonthday, ii.mdaymask[i]) &&
                        !_.include(bynmonthday, ii.nmdaymask[i])
                    )
                    ||
                    (
                        plb(byyearday)
                        &&
                        (
                            (
                                i < ii.yearlen &&
                                !_.include(byyearday, i + 1) &&
                                !_.include(byyearday, -ii.yearlen + i)
                            )
                            ||
                            (
                                i >= ii.yearlen &&
                                !_.include(byyearday, i + 1 - ii.yearlen) &&
                                !_.include(byyearday, -ii.nextyearlen + i - ii.yearlen)
                            )
                        )
                    )
                )
                {
                    dayset[i] = null;
                    filtered = true;
                }
            }

            // Output results
            if (plb(bysetpos) && plb(timeset)) {

                var daypos, timepos, poslist = [];

                for (i, j = 0; j < bysetpos.length; j++) {
                    var pos = bysetpos[j];
                    if (pos < 0) {
                        daypos = Math.floor(pos / timeset.length);
                        timepos = pymod(pos, timeset.length);
                    } else {
                        daypos = Math.floor((pos - 1) / timeset.length);
                        timepos = pymod((pos - 1), timeset.length);
                    }

                    try {
                        tmp = [];
                        for (k = start; k < end; k++) {
                            var val = dayset[k];
                            if (val === null) {
                                continue;
                            }
                            tmp.push(val);
                        }
                        if (daypos < 0) {
                            // we're trying to emulate python's aList[-n]
                            i = tmp.slice(daypos)[0];
                        } else {
                            i = tmp[daypos];
                        }

                        var time = timeset[timepos];

                        var date = dateutil.fromOrdinal(ii.yearordinal + i);
                        var res = dateutil.combine(date, time);
                        // XXX: can this ever be in the array?
                        // - compare the actual date instead?
                        if (!_.include(poslist, res)) {
                            poslist.push(res);
                        }
                    } catch (e) {}
                }

                dateutil.sort(poslist);

                for (j = 0; j < poslist.length; j++) {
                    var res = poslist[j];
                    if (until && res > until) {
                        this._len = total;
                        return iterResult.getValue();
                    } else if (res >= dtstart) {
                        ++total;
                        if (!iterResult.accept(res)) {
                            return iterResult.getValue();
                        }
                        if (count) {
                            --count;
                            if (!count) {
                                this._len = total;
                                return iterResult.getValue();
                            }
                        }
                    }
                }

            } else {
                for (j = start; j < end; j++) {
                    i = dayset[j];
                    if (i !== null) {
                        var date = dateutil.fromOrdinal(ii.yearordinal + i);
                        for (k = 0; k < timeset.length; k++) {
                            var time = timeset[k];
                            var res = dateutil.combine(date, time);
                            if (until && res > until) {
                                this._len = total;
                                return iterResult.getValue();
                            } else if (res >= dtstart) {
                                ++total;
                                if (!iterResult.accept(res)) {
                                    return iterResult.getValue();
                                }
                                if (count) {
                                    --count;
                                    if (!count) {
                                        this._len = total;
                                        return iterResult.getValue();
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Handle frequency and interval
            fixday = false;
            if (freq == RRule.YEARLY) {
                year += interval;
                if (year > dateutil.MAXYEAR) {
                    this._len = total;
                    return iterResult.getValue();
                }
                ii.rebuild(year, month);
            } else if (freq == RRule.MONTHLY) {
                month += interval;
                if (month > 12) {
                    div = Math.floor(month / 12);
                    mod = pymod(month, 12);
                    month = mod;
                    year += div;
                    if (month == 0) {
                        month = 12;
                        --year;
                    }
                    if (year > dateutil.MAXYEAR) {
                        this._len = total;
                        return iterResult.getValue();
                    }
                }
                ii.rebuild(year, month);
            } else if (freq == RRule.WEEKLY) {
                if (wkst > weekday) {
                    day += -(weekday + 1 + (6 - wkst)) + interval * 7;
                } else {
                    day += -(weekday - wkst) + interval * 7;
                }
                weekday = wkst;
                fixday = true;
            } else if (freq == RRule.DAILY) {
                day += interval;
                fixday = true;
            } else if (freq == RRule.HOURLY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    hour += Math.floor((23 - hour) / interval) * interval;
                }
                while (true) {
                    hour += interval;
                    dm = divmod(hour, 24);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        hour = mod;
                        day += div;
                        fixday = true;
                    }
                    if (!plb(byhour) || _.include(byhour, hour)) {
                        break;
                    }
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            } else if (freq == RRule.MINUTELY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    minute += Math.floor(
                        (1439 - (hour * 60 + minute)) / interval) * interval;
                }
                while(true) {
                    minute += interval;
                    dm = divmod(minute, 60);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        minute = mod;
                        hour += div;
                        dm = divmod(hour, 24);
                        div = dm.div;
                        mod = dm.mod;
                        if (div) {
                            hour = mod;
                            day += div;
                            fixday = true;
                            filtered = false;
                        }
                    }
                    if ((!plb(byhour) || _.include(byhour, hour)) &&
                        (!plb(byminute) || _.include(byminute, minute))) {
                        break;
                    }
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            } else if (freq == RRule.SECONDLY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    second += Math.floor(
                        (86399 - (hour * 3600 + minute * 60 + second))
                        / interval) * interval;
                }
                while (true) {
                    second += interval;
                    dm = divmod(second, 60);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        second = mod;
                        minute += div;
                        dm = divmod(minute, 60);
                        div = dm.div;
                        mod = dm.mod;
                        if (div) {
                            minute = mod;
                            hour += div;
                            dm = divmod(hour, 24);
                            div = dm.div;
                            mod = dm.mod;
                            if (div) {
                                hour = mod;
                                day += div;
                                fixday = true;
                            }
                        }
                    }
                    if ((!plb(byhour) || _.include(byhour, hour)) &&
                        (!plb(byminute) || _.include(byminute, minute)) &&
                        (!plb(bysecond) || _.include(bysecond, second)))
                    {
                        break;
                    }
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            }

            if (fixday && day > 28) {
                var daysinmonth = dateutil.monthRange(year, month - 1)[1];
                if (day > daysinmonth) {
                    while (day > daysinmonth) {
                        day -= daysinmonth;
                        ++month;
                        if (month == 13) {
                            month = 1;
                            ++year;
                            if (year > dateutil.MAXYEAR) {
                                this._len = total;
                                return iterResult.getValue();
                            }
                        }
                        daysinmonth = dateutil.monthRange(year, month - 1)[1];
                    }
                    ii.rebuild(year, month);
                }
            }
        }
    }

};

RRule.fromString = function(string, dtstart) {
    var i, j, key, value, freq, attr,
        attrs = string.split(';'),
        options = {};

    for (i = 0; i < attrs.length; i++) {
        attr = attrs[i].split('=');
        key = attr[0];
        value = attr[1];
        switch (key) {
            case 'FREQ':
                freq = RRule[value];
                break;
            case 'WKST':
                options.wkst = RRule[value].weekday;
                break;
            case 'COUNT':
            case 'INTERVAL':
            case 'BYSETPOS':
            case 'BYMONTH':
            case 'BYMONTHDAY':
            case 'BYYEARDAY':
            case 'BYWEEKNO':
            case 'BYHOUR':
            case 'BYMINUTE':
            case 'BYSECOND':
                if (value.indexOf(',') != -1) {
                    value = value.split(',');
                    for (j = 0; j < value.length; j++) {
                        if (/^[+-]?\d+$/.test(value[j])) {
                            value[j] = Number(value[j]);
                        }
                    }
                } else if (/^[+-]?\d+$/.test(value)) {
                    value = Number(value);
                }
                key = key.toLowerCase();
                options[key] = value;
                break;
            case 'BYDAY': // => byweekday
                var n, wday, day, days = value.split(',');
                options.byweekday = [];
                for (j = 0; j < days.length; j++) {
                    day = days[j];
                    if (day.length == 2) { // MO, TU, ...
                        wday = RRule[day]; // wday instanceof Weekday
                        options.byweekday.push(wday);
                    } else { // -1MO, +3FR, 1SO, ...
                        day = day.match(/^([+-]?\d)([A-Z]{2})$/);
                        n = Number(day[1]);
                        wday = day[2];
                        wday = RRule[wday].weekday;
                        options.byweekday.push(new Weekday(wday, n));
                    }
                }
                break;
            case 'UNTIL':
                var date = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(value);
                options.until = new Date(
                    Date.UTC(date[1], date[2] - 1,
                        date[3], date[4], date[5], date[6]));
                break;
            default:
                throw new Error("Unknown attribute '" + key + "'");
        }
    }

    options.dtstart = dtstart;
    return new RRule(freq, options);

};

//=============================================================================
// Iterinfo
//=============================================================================

var Iterinfo = function(rrule) {
    this.rrule = rrule;
    this.lastyear = null;
    this.lastmonth = null;
    this.yearlen = null;
    this.nextyearlen = null;
    this.yearordinal = null;
    this.yearweekday = null;
    this.mmask = null;
    this.mrange = null;
    this.mdaymask = null;
    this.nmdaymask = null;
    this.wdaymask = null;
    this.wnomask = null;
    this.nwdaymask = null;
    this.eastermask = null;
};


Iterinfo.prototype.rebuild = function(year, month) {

    var rr = this.rrule;

    if (year != this.lastyear) {

        this.yearlen = dateutil.isLeapYear(year) ? 366 : 365;
        this.nextyearlen = dateutil.isLeapYear(year + 1) ? 366 : 365;
        var firstyday = new Date(year, 0, 1);

        this.yearordinal = dateutil.toOrdinal(firstyday);
        this.yearweekday = dateutil.getWeekday(firstyday);

        var wday = dateutil.getWeekday(new Date(year, 0, 1));

        if (this.yearlen == 365) {
            this.mmask = [].concat(M365MASK);
            this.mdaymask = [].concat(MDAY365MASK);
            this.nmdaymask = [].concat(NMDAY365MASK);
            this.wdaymask = WDAYMASK.slice(wday);
            this.mrange = [].concat(M365RANGE);
        } else {
            this.mmask = [].concat(M366MASK);
            this.mdaymask = [].concat(MDAY366MASK);
            this.nmdaymask = [].concat(NMDAY366MASK);
            this.wdaymask = WDAYMASK.slice(wday);
            this.mrange = [].concat(M366RANGE);
        }

        if (!plb(rr.options.byweekno)) {
            this.wnomask = null;
        } else {
            this.wnomask = repeat(0, this.yearlen + 7);
            var no1wkst, firstwkst, wyearlen;
            no1wkst = firstwkst = pymod(
                7 - this.yearweekday + rr.options.wkst, 7);
            if (no1wkst >= 4) {
                no1wkst = 0;
                // Number of days in the year, plus the days we got
                // from last year.
                wyearlen = this.yearlen + pymod(
                    this.yearweekday - rr.options.wkst, 7);
            } else {
                // Number of days in the year, minus the days we
                // left in last year.
                wyearlen = this.yearlen - no1wkst;
            }
            var div = Math.floor(wyearlen / 7);
            var mod = pymod(wyearlen, 7);
            var numweeks = Math.floor(div + (mod / 4));
            for (var n, i, j = 0; j < rr.options.byweekno.length; j++) {
                n = rr.options.byweekno[j];
                if (n < 0) {
                    n += numweeks + 1;
                } if (!(0 < n && n <= numweeks)) {
                    continue;
                } if (n > 1) {
                    i = no1wkst + (n - 1) * 7;
                    if (no1wkst != firstwkst) {
                        i -= 7-firstwkst;
                    }
                } else {
                    i = no1wkst;
                }
                for (var k = 0; k < 7; k++) {
                    this.wnomask[i] = 1;
                    i++;
                    if (this.wdaymask[i] == rr.options.wkst) {
                        break;
                    }
                }
            }

            if (_.include(rr.options.byweekno, 1)) {
                // Check week number 1 of next year as well
                // orig-TODO : Check -numweeks for next year.
                var i = no1wkst + numweeks * 7;
                if (no1wkst != firstwkst) {
                    i -= 7 - firstwkst;
                }
                if (i < this.yearlen) {
                    // If week starts in next year, we
                    // don't care about it.
                    for (var j = 0; j < 7; j++) {
                        this.wnomask[i] = 1;
                        i += 1;
                        if (this.wdaymask[i] == rr.options.wkst) {
                            break;
                        }
                    }
                }
            }

            if (no1wkst) {
                // Check last week number of last year as
                // well. If no1wkst is 0, either the year
                // started on week start, or week number 1
                // got days from last year, so there are no
                // days from last year's last week number in
                // this year.
                var lnumweeks;
                if (!_.include(rr.options.byweekno, -1)) {
                    var lyearweekday = dateutil.getWeekday(
                        new Date(year - 1, 0, 1));
                    var lno1wkst = pymod(
                        7 - lyearweekday + rr.options.wkst, 7);
                    var lyearlen = dateutil.isLeapYear(year - 1) ? 366 : 365;
                    if (lno1wkst >= 4) {
                        lno1wkst = 0;
                        lnumweeks = Math.floor(
                            52
                            + pymod(
                                lyearlen + pymod(
                                    lyearweekday - rr.options.wkst, 7), 7)
                            / 4);
                    } else {
                        lnumweeks = Math.floor(
                            52 + pymod(this.yearlen - no1wkst, 7) / 4);
                    }
                } else {
                    lnumweeks = -1;
                }
                if (_.include(rr.options.byweekno, lnumweeks)) {
                    for (var i = 0; i < no1wkst; i++) {
                        this.wnomask[i] = 1;
                    }
                }
            }
        }

    }

    if (plb(rr.options.bynweekday)
        && (month != this.lastmonth || year != this.lastyear)) {
        var ranges = [];
        if (rr.freq == RRule.YEARLY) {
            if (plb(rr.options.bymonth)) {
                for (j = 0; j < rr.options.bymonth.length; j++) {
                    month = rr.options.bymonth[j];
                    ranges.push(this.mrange.slice(month - 1, month + 1));
                }
            } else {
                ranges = [[0, this.yearlen]];
            }
        } else if (rr.freq == RRule.MONTHLY) {
            ranges = [this.mrange.slice(month - 1, month + 1)];
        }
        if (plb(ranges)) {
            // Weekly frequency won't get here, so we may not
            // care about cross-year weekly periods.
            this.nwdaymask = repeat(0, this.yearlen);

            for (var j = 0; j < ranges.length; j++) {
                var rang = ranges[j];
                var first = rang[0], last = rang[1];
                last -= 1;
                for (var k = 0; k < rr.options.bynweekday.length; k++) {
                    var wday = rr.options.bynweekday[k][0],
                        n = rr.options.bynweekday[k][1];
                    if (n < 0) {
                        i = last + (n + 1) * 7;
                        i -= pymod(this.wdaymask[i] - wday, 7);
                    } else {
                        i = first + (n - 1) * 7;
                        i += pymod(7 - this.wdaymask[i] + wday, 7);
                    }
                    if (first <= i && i <= last) {
                        this.nwdaymask[i] = 1;
                    }
                }
            }

        }

        if (plb(rr.options.byeaster)) {/* not implemented */}

        this.lastyear = year;
        this.lastmonth = month;
    }

};

Iterinfo.prototype.ydayset = function(year, month, day) {
    return [range(this.yearlen), 0, this.yearlen];
};

Iterinfo.prototype.mdayset = function(year, month, day) {
    var set = repeat(null, this.yearlen);
    var start = this.mrange[month-1];
    var end = this.mrange[month];
    for (var i = start; i < end; i++) {
        set[i] = i;
    }
    return [set, start, end];
};

Iterinfo.prototype.wdayset = function(year, month, day) {

    // We need to handle cross-year weeks here.
    var set = repeat(null, this.yearlen + 7);
    var i = dateutil.toOrdinal(
        new Date(year, month - 1, day)) - this.yearordinal;
    var start = i;
    for (var j = 0; j < 7; j++) {
        set[i] = i;
        ++i;
        if (this.wdaymask[i] == this.rrule.options.wkst) {
            break;
        }
    }
    return [set, start, i];
};

Iterinfo.prototype.ddayset = function(year, month, day) {
    var set = repeat(null, this.yearlen);
    var i = dateutil.toOrdinal(
        new Date(year, month - 1, day)) - this.yearordinal;
    set[i] = i;
    return [set, i, i + 1];
};

Iterinfo.prototype.htimeset = function(hour, minute, second) {
    var set = [], rr = this.rrule;
    for (var i = 0; i < rr.options.byminute.length; i++) {
        minute = rr.options.byminute[i];
        for (var j = 0; j < rr.options.bysecond.length; j++) {
            second = rr.options.bysecond[j];
            set.push(new dateutil.Time(hour, minute, second));
        }
    }
    dateutil.sort(set);
    return set;
};

Iterinfo.prototype.mtimeset = function(hour, minute, second) {
    var set = [], rr = this.rrule;
    for (var j = 0; j < rr.options.bysecond.length; j++) {
        second = rr.options.bysecond[j];
        set.push(new dateutil.Time(hour, minute, second));
    }
    dateutil.sort(set);
    return set;
};

Iterinfo.prototype.stimeset = function(hour, minute, second) {
    return [new dateutil.Time(hour, minute, second)];
};


//=============================================================================
// Results
//=============================================================================

/**
 * This class helps us to emulate python's generators, sorta.
 */
var IterResult = function(method, args) {
    this.init(method, args)
};

IterResult.prototype = {

    init: function(method, args) {
        this.method = method;
        this.args = args;

        this._result = [];

        this.minDate = null;
        this.maxDate = null;

        if (method == 'between') {
            this.maxDate = args.inc
                ? args.before
                : new Date(args.before.getTime() - 1);
            this.minDate = args.inc
                ? args.after
                : new Date(args.after.getTime() + 1);
        } else if (method == 'before') {
            this.maxDate = args.inc ? args.dt : new Date(args.dt.getTime() - 1);
        } else if (method == 'after') {
            this.minDate = args.inc ? args.dt : new Date(args.dt.getTime() + 1);
        }
    },

    /**
     * Possibly adds a date into the result.
     *
     * @param {Date} date - the date isn't necessarly added to the result
     *                      list (if it is too late/too early)
     * @return {Boolean} true if it makes sense to continue the iteration;
     *                   false if we're done.
     */
    accept: function(date) {
        var tooEarly = this.minDate && date < this.minDate,
            tooLate = this.maxDate && date > this.maxDate;

        if (this.method == 'between') {
            if (tooEarly)
                return true;
            if (tooLate)
                return false;
        } else if (this.method == 'before') {
            if (tooLate)
                return false;
        } else if (this.method == 'after') {
            if (tooEarly)
                return true;
            this.add(date);
            return false;
        }

        return this.add(date);

    },

    /**
     *
     * @param {Date} date that is part of the result.
     * @return {Boolean} whether we are interested in more values.
     */
    add: function(date) {
        this._result.push(date);
        return true;
    },

    /**
     * 'before' and 'after' return only one date, whereas 'all'
     * and 'between' an array.
     * @return {Date,Array?}
     */
    getValue: function() {
        switch (this.method) {
            case 'all':
            case 'between':
                return this._result;
            case 'before':
            case 'after':
                return this._result.length
                    ? this._result[this._result.length - 1]
                    : null;
        }
    }

};


/**
 * IterResult subclass that calls a callback funciton on each add,
 * and stops iterating when the callback returns false.
 */
var CallbackIterResult = function(method, args, iterator) {
    var allowedMethods = ['all', 'between'];
    if (!_.include(allowedMethods, method)) {
        throw 'Invalid method "' + method
            + '". Only all and between works with iterator.'
    }
    this.add = function(date) {
        this._result.push(date);
        return iterator(date, this._result.length) !== false;
    };

    this.init(method, args);

};
CallbackIterResult.prototype = IterResult.prototype;


//=============================================================================
// Export
//=============================================================================

if (serverSide) {
    module.exports = {
        RRule: RRule,
        // rruleset: rruleset
    }
} else {
  root['RRule'] = RRule;
  // root['rruleset'] = rruleset;
}


}(this));
