'use strict';

const config = require('../server/config');
const logger = require('../log.js');

const superagent = require('superagent');
const url = require('url');

const {translateQuery} = require('./nomis/queryTranslator');
const {translateResult} = require('./nomis/resultTranslator');


const timeoutSpec = {
    response: config.nomis.timeout.response,
    deadline: config.nomis.timeout.deadline
};

const userSpec = {
    username: config.nomis.user,
    password: config.nomis.password
};

const loginUrl = url.resolve(`${config.nomis.apiUrl}`, 'api/users/login');
const queryUrl = url.resolve(`${config.nomis.apiUrl}`, 'api/v2/prisoners');

module.exports = {
    searchNomis,
    getNomisResults,
    getNomisToken,
    clearToken,
    onlyPrisonNumber
};

let token;
let retries = config.nomis.errorRetries;

function clearToken() {
    token = null;
}

function reduceRetries() {
    retries--;
}

function resetRetries() {
    retries = config.nomis.errorRetries;
}

function searchNomis(userInput) {

    logger.info('Searching NOMIS');

    if (!config.nomis.enabled) {
        return new Promise((resolve, reject) => {
            logger.warn('NOMIS search is disabled');
            return resolve('disabled');
        });
    }

    if (!token) {
        return getNomisToken().then(newToken => {
            token = newToken;
            return doSearch(userInput);
        });
    }

    return doSearch(userInput);
}

function doSearch(userInput) {
    return getNomisResults(token, userInput)
        .then(result => {
            resetRetries();
            return result;
        })
        .catch(error => {

            if(retries <= 0 ) {
                logger.error('NOMIS error: ' + error);
                throw {code: 'NOMIS'};
            }

            if (error.status === 401) {
                logger.error('NOMIS 401 error - retrying');
                clearToken();
            }

            reduceRetries();
            return searchNomis(userInput);
        });
}

function getNomisResults(token, userInput) {
    return new Promise((resolve, reject) => {

        if(onlyPrisonNumber(userInput)) {
            return resolve([]);
        }

        const nomisQuery = translateQuery(userInput);

        if (isEmpty(nomisQuery)) {
            return reject({code: 'emptySubmission'});
        }

        superagent
            .get(queryUrl)
            .query(nomisQuery)
            .set('Authorization', token)
            .set('Accept', 'application/json')
            .timeout(timeoutSpec)
            .end((error, res) => {
                try {
                    if (error) {
                        logger.error('Error querying NOMIS: ' + error);
                        return reject(error);
                    }

                    if (res.body) {
                        return resolve(translateResult(res.body));
                    }

                    logger.error('Invalid nomis search response');
                    return reject({message: 'invalid search response', status: 500});

                } catch (exception) {
                    logger.error('Exception querying NOMIS: ' + exception);
                    return reject(exception);
                }
            });
    });
}

function getNomisToken() {
    return new Promise((resolve, reject) => {

        if (!config.nomis.enabled) {
            logger.warn('NOMIS integration disabled');
            return reject('NOMIS integration disabled');
        }

        superagent
            .post(loginUrl)
            .set('content-type', 'application/json')
            .send(userSpec)
            .timeout(timeoutSpec)
            .end((error, res) => {
                try {
                    if (error) {
                        logger.error('Error getting NOMIS token: ' + error);
                        return reject(error);
                    }

                    if (res.body && res.body.token) {
                        return resolve(res.body.token);
                    }

                    logger.error('Invalid nomis token response');
                    return reject({message: 'invalid token response', status: 500});

                } catch (exception) {
                    logger.error('Exception getting NOMIS token: ' + exception);
                    return reject(exception);
                }
            });
    });
}

function onlyPrisonNumber(userInput) {

    const searchTerms = ['forename', 'forename2', 'surname', 'dobYear', 'age', 'pncNumber', 'croNumber'];

    const otherTerm = Object.keys(userInput).some(v => {
        return searchTerms.includes(v);
    });

    return !otherTerm && Object.keys(userInput).includes('prisonNumber');
}

function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}