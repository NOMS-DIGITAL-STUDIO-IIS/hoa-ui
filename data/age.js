'use strict';

let content = require('./content.js');

module.exports = {
    validate: function(val, callback) {

        let err = {
            title: content.errMsg.CANNOT_SUBMIT,
            items: [{ageRange: 'Re-enter age or range'}],
            desc: content.errMsg.INVALID_AGE
        };

        if (!isAgeOrAgeRange(val.replace(/ /g, ''))) {
            return callback(err);
        }

        return callback(null);
    },

    getDateRange: function(val, callback) {
        let arrDateRange;

        val = val.replace(/ /g, '');

        if (val.indexOf('-') === -1) {
            let birthYear = parseInt(new Date().getFullYear()) - val;
            arrDateRange = [birthYear + '0101', birthYear + '1231'];
        } else {
            let arrVal = val.split('-');
            let yearFrom = parseInt(new Date().getFullYear()) - arrVal[1];
            let yearTo = parseInt(new Date().getFullYear()) - arrVal[0];
            arrDateRange = [yearFrom + '0101', yearTo + '1231'];
        }

        callback(arrDateRange);
    }
};

function isAgeOrAgeRange(v) {
    if (!/^[1-9][0-9]$|^[1-9][0-9]-[1-9][0-9]$/.test(v)) {
        return false;
    }

    if (v.indexOf('-') === -1) {
        return true;
    } else {
        v = v.split('-');
        return (v[0] <= v[1]);
    }
}
