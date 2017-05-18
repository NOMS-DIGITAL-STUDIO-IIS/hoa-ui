'use strict';

let changeCase = require('change-case');
let TYPES = require('tedious').TYPES;

let db = require('../server/db.js');
let {describeCode} = require('../data/codes.js');
let utils = require('../data/utils.js');
let logger = require('../log.js');


module.exports = {

    info: function(prisonNumber, callback) {

        logger.debug('Subject info search');

        let params = [
            {column: 'PK_PRISON_NUMBER', type: TYPES.VarChar, value: prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            PK_PRISON_NUMBER, 
                            INMATE_SURNAME, 
                            INMATE_FORENAME_1, 
                            INMATE_FORENAME_2,
                            (
                            SELECT
                              TOP 1 PERSON_IDENTIFIER_VALUE
                            FROM
                              IIS.IIS_IDENTIFIER
                            WHERE
                              PERSON_IDENT_TYPE_CODE = 'PNC'
                              AND
                              FK_PERSON_IDENTIFIER=LOSS_OF_LIBERTY.FK_PERSON_IDENTIFIER
                            ) PNC,
                            (
                            SELECT
                              TOP 1 PERSON_IDENTIFIER_VALUE
                            FROM
                              IIS.IIS_IDENTIFIER
                            WHERE
                              PERSON_IDENT_TYPE_CODE = 'CRO'
                              AND
                              FK_PERSON_IDENTIFIER=LOSS_OF_LIBERTY.FK_PERSON_IDENTIFIER
                            ) CRO,
                            (
                            STUFF(
                                (SELECT DISTINCT
                                  ', ' + CAST(PAROLE_REF_NUMBER AS VARCHAR(7))
                                FROM
                                  IIS.PAROLE_REVIEW
                                WHERE FK_PRISON_NUMBER = @PK_PRISON_NUMBER
                                FOR XML PATH('')), 1, 1, '')
                            ) PAROLE_REF_LIST
                    FROM 
                            IIS.LOSS_OF_LIBERTY 
                    WHERE 
                            PK_PRISON_NUMBER = @PK_PRISON_NUMBER;`;
        /* eslint-enable */

        logger.debug('Subject info search', sql);

        // why 'err' and not simply 'error'?
        db.getTuple(sql, params, function(err, cols) {
            if (err) {
                logger.error('Error searching database', err);
                return callback(new Error('No results')); // Why is the message no results when there was an error?

            } else if (cols === 0) {
                logger.debug('No results');
                return callback(new Error('No results')); // why is it an error if no results?

            }

            return callback(null, formatInfoRow(cols));
        });
    },

    summary: function(obj, callback) {

        logger.debug('Subject summary search');

        let params = [
            {column: 'PK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            PK_PRISON_NUMBER, 
                            INMATE_SURNAME, 
                            INMATE_FORENAME_1, 
                            INMATE_FORENAME_2,
                            INMATE_BIRTH_DATE DOB, 
                            FK_PERSON_IDENTIFIER,
                            BIRTH_COUNTRY_CODE,
                            MARITAL_STATUS_CODE,
                            ETHNIC_GROUP_CODE,
                            NATIONALITY_CODE,                            
                            (
                            CASE INMATE_SEX 
                            WHEN 'M' THEN 'Male' 
                            WHEN 'F' THEN 'FEMALE' 
                            ELSE '' 
                            END
                            ) INMATE_SEX
                    FROM 
                            IIS.LOSS_OF_LIBERTY 
                    WHERE 
                            PK_PRISON_NUMBER = @PK_PRISON_NUMBER;`;
        /* eslint-enable */

        // Whay are we replioating this structure multiple times?
        db.getTuple(sql, params, function(err, cols) {
            if (err || cols === 0) {
                return callback(new Error('No results'));
            }

            return callback(null, formatSummaryRow(cols));
        });
    },

    movements: function(obj, callback) {
        let params = [
            {column: 'FK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT  
                            DATE_OF_MOVE, 
                            MOVEMENT_CODE, 
                            TYPE_OF_MOVE,
                            (
                             SELECT 
                                    ESTABLISHMENT_NAME 
                             FROM 
                                    IIS.ESTABLISHMENT 
                             WHERE 
                                    PK_ESTABLISHMENT_CODE = SUBSTRING(ESTAB_COMP_OF_MOVE,1,2)
                            ) ESTAB_COMP_OF_MOVE
                    FROM 
                            IIS.INMATE_MOVEMENT 
                    WHERE 
                            FK_PRISON_NUMBER = @FK_PRISON_NUMBER 
                    ORDER BY 
                            DATE_OF_MOVE DESC, TIME_OF_MOVE DESC;`;
        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatMovementRows) : 0);
        });
    },

    aliases: function(obj, callback) {
        let params = [
            {column: 'FK_PERSON_IDENTIFIER', type: TYPES.VarChar, value: obj.personIdentifier}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            PERSON_SURNAME, 
                            PERSON_FORENAME_1, 
                            PERSON_FORENAME_2, 
                            PERSON_BIRTH_DATE
                    FROM 
                            IIS.KNOWN_AS
                    WHERE 
                            FK_PERSON_IDENTIFIER = @FK_PERSON_IDENTIFIER;`;
        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatAliasRows) : 0);
        });
    },

    addresses: function(obj, callback) {
        let params = [
            {column: 'FK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            INMATE_ADDRESS_1, 
                            INMATE_ADDRESS_2,
                            INMATE_ADDRESS_4,
                            ADDRESS_TYPE,
                            PERSON_DETS
                    FROM 
                            IIS.INMATE_ADDRESS
                    WHERE 
                            FK_PRISON_NUMBER = @FK_PRISON_NUMBER;`;

        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatAddressRows) : 0);
        });
    },

    offences: function(obj, callback) {
        let params = [
            {column: 'FK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            o.IIS_OFFENCE_CODE, 
                            c.CASE_DATE, 
                            c.CASE_ESTAB_COMP_CODE,
                            (
                             SELECT 
                                    ESTABLISHMENT_NAME 
                             FROM 
                                    IIS.ESTABLISHMENT 
                             WHERE 
                                    PK_ESTABLISHMENT_CODE = SUBSTRING(c.CASE_ESTAB_COMP_CODE,1,2)
                            ) ESTABLISHMENT
                    FROM 
                            IIS.CASE_OFFENCE o, 
                            IIS.INMATE_CASE c
                    WHERE 
                            c.PKTS_INMATE_CASE = o.FK_CASE
                    AND 
                            c.FK_PRISON_NUMBER = @FK_PRISON_NUMBER;`;
        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatOffenceRows) : 0);
        });
    },

    hdcinfo: function(obj, callback) {
        let params = [
            {column: 'FK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            STAGE_DATE,
                            STAGE,
                            HDC_STATUS,
                            (
                                SELECT
                                    REASON
                                FROM
                                    IIS.HDC_REASON r
                                WHERE
                                    r.FK_HDC_HISTORY = h.PKTS_HDC_HISTORY
                            ) HDC_REASON
                    FROM
                            IIS.HDC_HISTORY h
                    WHERE 
                            FK_PRISON_NUMBER = @FK_PRISON_NUMBER
                    ORDER BY 
                            STAGE_DATE DESC;`;
        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatHdcInfoRows) : 0);
        });
    },

    hdcrecall: function(obj, callback) {
        let params = [
            {column: 'FK_PRISON_NUMBER', type: TYPES.VarChar, value: obj.prisonNumber}
        ];

        /* eslint-disable */
        let sql = `SELECT 
                            RECALL_DATE_CREATED,
                            RECALL_OUTCOME,
                            RECALL_OUTCOME_DATE
                    FROM 
                            IIS.HDC_RECALL
                    WHERE 
                            FK_PRISON_NUMBER = @FK_PRISON_NUMBER
                    ORDER BY 
                            HDC_RECALL_NUMBER ASC;`;
        /* eslint-enable */

        db.getCollection(sql, params, function(err, rows) {
            if (err) {
                return callback(new Error('No results'));
            }

            return callback(null, rows.length > 0 ? rows.map(formatHdcRecallRows) : 0);
        });
    }

};

function formatInfoRow(dbRow) {
    let info = {
        prisonNumber: dbRow.PK_PRISON_NUMBER.value,
        surname: dbRow.INMATE_SURNAME.value,
        forename: dbRow.INMATE_FORENAME_1.value,
        forename2: dbRow.INMATE_FORENAME_2.value,
        pnc: dbRow.PNC.value,
        cro: dbRow.CRO.value,
        paroleRefList: dbRow.PAROLE_REF_LIST.value
    };
    logger.debug('Subject info result', info);
    return info;
}

function formatSummaryRow(dbRow) {
    return {
        dob: dbRow.DOB.value ? utils.getFormattedDateFromString(dbRow.DOB.value) : 'Unknown',
        countryOfBirth: changeCase.titleCase(describeCode('BIRTH_COUNTRY', dbRow.BIRTH_COUNTRY_CODE.value)),
        maritalStatus: changeCase.titleCase(describeCode('MARITAL_STATUS', dbRow.MARITAL_STATUS_CODE.value)),
        ethnicity: changeCase.titleCase(describeCode('ETHNIC_GROUP', dbRow.ETHNIC_GROUP_CODE.value)),
        nationality: changeCase.titleCase(describeCode('NATIONALITY', dbRow.NATIONALITY_CODE.value)),
        sex: dbRow.INMATE_SEX.value ? changeCase.sentenceCase(dbRow.INMATE_SEX.value) : 'Unknown'
    };
}

function formatMovementRows(dbRow) {
    return {
        establishment: dbRow.ESTAB_COMP_OF_MOVE.value ? changeCase.titleCase(dbRow.ESTAB_COMP_OF_MOVE.value) : 'Establishment unknown',
        date: utils.getFormattedDateFromString(dbRow.DATE_OF_MOVE.value),
        type: dbRow.TYPE_OF_MOVE.value,
        status: dbRow.TYPE_OF_MOVE.value && dbRow.MOVEMENT_CODE.value ? formatMovementCode(dbRow) : 'Status unknown'

    };
}

function formatMovementCode(dbRow) {
    let status = dbRow.TYPE_OF_MOVE.value === 'R' ?
        describeCode('MOVEMENT_RETURN', dbRow.MOVEMENT_CODE.value.trim())
        : describeCode('MOVEMENT_DISCHARGE', dbRow.MOVEMENT_CODE.value.trim());

    return utils.acronymsToUpperCase(changeCase.sentenceCase(status));
}

function formatAliasRows(dbRow) {
    return {
        surname: dbRow.PERSON_SURNAME.value,
        forename: dbRow.PERSON_FORENAME_1.value,
        forename2: dbRow.PERSON_FORENAME_2.value,
        dob: utils.getFormattedDateFromString(dbRow.PERSON_BIRTH_DATE.value)
    };
}

function formatAddressRows(dbRow) {
    return {
        addressLine1: dbRow.INMATE_ADDRESS_1.value ? changeCase.titleCase(dbRow.INMATE_ADDRESS_1.value) : '',
        addressLine2: dbRow.INMATE_ADDRESS_2.value ? changeCase.titleCase(dbRow.INMATE_ADDRESS_2.value) : '',
        addressLine4: dbRow.INMATE_ADDRESS_4.value ? changeCase.titleCase(dbRow.INMATE_ADDRESS_4.value) : '',
        type: dbRow.ADDRESS_TYPE.value ? changeCase.titleCase(describeCode('ADDRESS', dbRow.ADDRESS_TYPE.value)) : 'Unknown',
        name: dbRow.PERSON_DETS.value ? changeCase.titleCase(dbRow.PERSON_DETS.value) : ''
    };
}

function formatOffenceRows(dbRow) {
    return {
        offenceCode: dbRow.IIS_OFFENCE_CODE.value ? dbRow.IIS_OFFENCE_CODE.value : 'Unknown offence code',
        caseDate: dbRow.CASE_DATE.value ? utils.getFormattedDateFromString(dbRow.CASE_DATE.value) : 'Unknown case date',
        establishment_code: dbRow.CASE_ESTAB_COMP_CODE.value ? changeCase.upperCase(dbRow.CASE_ESTAB_COMP_CODE.value) : 'Unknown establishment',
        establishment: dbRow.ESTABLISHMENT.value ? changeCase.titleCase(dbRow.ESTABLISHMENT.value) : 'Unknown establishment'
    };
}

function formatHdcInfoRows(dbRow) {
    return {
        date: dbRow.STAGE_DATE.value ? utils.getFormattedDateFromString(dbRow.STAGE_DATE.value.trim()) : 'Date unknown',
        stage: dbRow.STAGE.value ? formatHdcStageCode(dbRow.STAGE.value) : 'Stage unknown',
        status: dbRow.HDC_STATUS.value ? formatHdcStatusCode(dbRow.HDC_STATUS.value) : 'Status unknown',
        reason: dbRow.HDC_REASON.value ? formatHdcReasonCode(dbRow.HDC_REASON.value) : '',
    };
}

function formatHdcStageCode(code) {
    return utils.acronymsToUpperCase(changeCase.sentenceCase(describeCode('HDC_STAGE', code)));
}

function formatHdcStatusCode(code) {
    return utils.acronymsToUpperCase(changeCase.sentenceCase(describeCode('HDC_STATUS', code)));
}

function formatHdcReasonCode(code) {
    return utils.acronymsToUpperCase(changeCase.sentenceCase(describeCode('HDC_REASON', code)));
}

function formatHdcRecallRows(dbRow) {
    return {
        date: utils.getFormattedDateFromString(dbRow.RECALL_DATE_CREATED.value),
        outcome: dbRow.RECALL_OUTCOME.value,
        outcomeDate: utils.getFormattedDateFromString(dbRow.RECALL_OUTCOME_DATE.value)
    };
}
