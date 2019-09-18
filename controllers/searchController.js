const content = require('../data/content');
const logger = require('../log');
const {getSearchResultsCount, getSearchResults} = require('../data/search');
const utils = require('../data/utils');
const audit = require('../data/audit');
const resultsPerPage = require('../server/config').searchResultsPerPage;
const {validateDescriptionForm, validateAddressForm} = require('./helpers/formValidators');

const url = require('url');

const {
    getInputtedFilters,
    removeAllFilters
} = require('./helpers/filterHelpers');
const {
    getQueryStringsForSearch,
    mergeIntoQuery,
    toggleFromQueryItem,
    getUrlAsObject,
    createUrl,
    retainUrlQuery
} = require('./helpers/urlHelpers');
const {
    getSearchSuggestions
} = require('./helpers/suggestionHelpers');

const comparisonEnabled = require('../server/config').features.comparison;
const addressEnabled = require('../server/config').features.addressSearch;

const availableSearchOptions = exports.availableSearchOptions = {
    identifier: ['prisonNumber', 'pncNumber', 'croNumber'],
    nameAge: ['forename', 'surname', 'dobDay', 'dobMonth', 'dobYear', 'age'],
    other: ['address']
};

const allAcceptableFields = Object.keys(availableSearchOptions).reduce((acceptableFields, searchOptionKey) => {
    return acceptableFields.concat(...availableSearchOptions[searchOptionKey]);
}, []);

function isIdentifierSearch(userInput) {
    const intersection = [...Object.keys(userInput)].filter(input => {
        return availableSearchOptions.identifier.includes(input);
    });
    return intersection.length > 0;
}

function isAddressSearch(userInput) {
    const intersection = [...Object.keys(userInput)].filter(input => {
        return availableSearchOptions.other.includes(input);
    });
    return intersection.length > 0;
}

exports.getIndex = function(req, res) {
    logger.debug('GET /search');

    const error = req.query.error ? getDbErrorData(req.query.error) : null;
    req.session.userInput = {};
    return res.render('search/index', parseResultsPageData(req, 0, null, null, error));
};

exports.postSearchForm = function(req, res) {

    const theQuery = getUrlAsObject(req.get('referrer')).query;

    const userInput = userInputFromSearchForm(req.body);
    const validationError = inputValidates(userInput);

    if (validationError) {
        logger.info('Server side input validation used');
        return res.render('search/index', parseResultsPageData(req, 0, null, null, validationError));
    }

    req.session.visited = [];
    req.session.userInput = userInput;

    if (theQuery.shortList) {
        const queryStrings = getQueryStrings(req, theQuery);
        const resultsWithShortlist = '/search/results' + url.format({query: queryStrings});
        return res.redirect(resultsWithShortlist);
    }

    res.redirect('/search/results');
};

function getQueryStrings(req, theQuery) {

    if(req.body.newsearch && theQuery.shortList) {
        return {shortList: theQuery.shortList};
    }

    return theQuery;
}

exports.getResults = function(req, res) {
    logger.info('GET /search/results');
    if (!req.headers.referer) {
        return res.redirect('/search');
    }

    req.session.userInput = addFiltersToUserInput(req.session.userInput, req.query);

    audit.record('SEARCH', req.user.email, req.session.userInput);

    return getSearchResultsCount(req.session.userInput)
        .then(returnedRows => getSearchResultsAndRender(req, res)(returnedRows[0]))
        .catch(error => {
            logger.error('Error during number of rows search: ' + error.message);
            const query = {error: error.code};
            return res.redirect(createUrl('/search', query));
        });
};

function getSearchResultsAndRender(req, res) {

    const currentPage = getCurrentPage(req.query);
    req.session.userInput.page = currentPage;

    return function(rowCountData) {
        const rowCount = rowCountData.totalRows.value;
        if (rowCount === 0) {
            return res.render('search/index', parseResultsPageData(req, rowCount));
        }

        if (!isValidPage(currentPage, rowCount)) {
            return res.redirect(getReferrerUrlWithInvalidPage(req, currentPage));
        }

        return getSearchResults(req.session.userInput).then(searchResult => {
            const results = !searchResult || Array.isArray(searchResult) ? searchResult : [searchResult];
            return res.render('search/index', parseResultsPageData(req, rowCount, results, currentPage));
        }).catch(error => {
            logger.error('Error during inmate search: ' + error.message);
            const query = {error: error.code};
            return res.redirect(createUrl('/search', query));
        });
    };
}

exports.getSuggestions = function(req, res) {
    return res.render('search/suggestions', {
        content: content.view.suggestions,
        returnQuery: retainUrlQuery(req.url),
        suggestions: getSearchSuggestions(req.session.userInput)
    });
};

exports.getSuggestion = function(req, res) {
    req.session.userInput = applySuggestionsToUserInput(req.session.userInput, req.query, req.session);
    res.redirect('/search/results');
};

function parseResultsPageData(req, rowCount, searchResults, page, error) {
    const searchedFor = getUserInput(req.session.userInput);
    const shortList = getShortList(req);
    const data = createDataObjects(searchResults, req.session, shortList);
    const queryStrings = getQueryStringsForSearch(req.url);

    return {
        content: {
            title: 'HPA Prisoner Search'
        },
        rowCount,
        pagination: (rowCount > resultsPerPage ) ? utils.pagination(rowCount, page) : null,
        data,
        err: error || getPaginationErrors(req.query),
        filtersForView: getInputtedFilters(req.query, 'VIEW'),
        queryStrings,
        formContents: searchedFor,
        usePlaceholder: Object.keys(searchedFor).length === 0,
        idSearch: availableSearchOptions.identifier.includes(Object.keys(searchedFor)[0]),
        nameSearch: availableSearchOptions.nameAge.includes(Object.keys(searchedFor)[0]),
        otherSearch: availableSearchOptions.other.includes(Object.keys(searchedFor)[0]),
        suggestions: getSearchSuggestions(req.session.userInput),
        shortList,
        moment: require('moment'),
        setCase: require('case'),
        comparisonEnabled,
        addressEnabled
    };
}

function createDataObjects(searchResults, session, shortList) {

    if (!searchResults) {
        return [];
    }

    return searchResults.map(inmate => {
        inmate.visited = session.visited ? session.visited.includes(inmate.prisonNumber) : false;
        inmate.shortListed = shortList ? shortList.prisonNumbers.includes(inmate.prisonNumber) : false;
        return inmate;
    });
}

function getUserInput(userInput) {
    return Object.keys(userInput).reduce((contents, field) => {
        if (allAcceptableFields.includes(field)) {
            return Object.assign({}, contents, {[field]: userInput[field]});
        }
        return contents;
    }, {});
}

function getShortList(req) {

    if (!req.query.shortList) {
        return null;
    }

    const shortList = Array.isArray(req.query.shortList) ? req.query.shortList : [req.query.shortList];

    return {
        prisonNumbers: shortList,
        href: `/comparison/${shortList.join(',')}`,
        latestName: req.query.shortListName || null
    };
}

function getDbErrorData(errorCode) {
    return {
        title: getMessageToDisplayFor(errorCode),
        desc: content.errMsg.DB_ERROR_DESC
    };
}

function getMessageToDisplayFor(errorCode) {

    let message = content.dbErrorCodeMessages[errorCode];
    if (message) return message;

    logger.error('content.dbErrorCodeMessages has no message for', {error: errorCode});
    return content.errMsg.DB_ERROR;
}

const userInputFromSearchForm = requestBody => {

    const allowedfields = availableSearchOptions[requestBody.searchFormType].filter(field => requestBody[field]);

    const collatedData = {};

    allowedfields.forEach(field => collatedData[field] = requestBody[field].trim());

    return collatedData;
};


const inputValidates = userInput => {

    if (!Object.keys(userInput).length > 0) {
        return {
            title: 'Please enter a value for at least one field'
        };
    }

    if (isIdentifierSearch(userInput)) {
        return null;
    }

    if (isAddressSearch(userInput)) {
        return validateAddressForm(userInput);
    }

    return validateDescriptionForm(userInput);
};

exports.postPagination = function(req, res) {
    const query = mergeIntoQuery(req.query, {page: req.body.pageNumber});

    res.redirect(createUrl('/search/results', query));
};

exports.postFilters = function(req, res) {
    const acceptableFilters = ['Male', 'Female', 'HDC', 'Lifer'];
    const [filterPressed] = acceptableFilters.filter(filter => filter === req.body.filter);

    const newQueryObject = toggleFromQueryItem(req, 'filters', filterPressed, 'referrer');

    newQueryObject.page = '1';

    res.redirect(createUrl('/search/results', newQueryObject));
};

exports.postAddToShortlist = function(req, res) {

    if (req.body.viewShortlist) {
        const theQuery = getUrlAsObject(req.get('referrer')).query;
        const shortlistHref = `/comparison/${asArray(theQuery.shortList).join(',')}`;
        res.redirect(createUrl(shortlistHref, theQuery));
    }

    const prisonNumberAdded = req.body.addToShortList;
    const nameAdded = req.body.addToShortListName;

    const newQueryObject = toggleFromQueryItem(req, 'shortList', prisonNumberAdded, 'referrer');
    const objWithName = nameAdded ? Object.assign({}, newQueryObject, {shortListName: nameAdded}) : newQueryObject;

    res.redirect(createUrl('/search/results', objWithName));
};

const getPaginationErrors = query => {
    if (query.invalidPage) {
        return {
            title: 'Invalid selection',
            desc: `The page number ${query.invalidPage} does not exist`
        };
    }
    return null;
};

function getReferrerUrlWithInvalidPage(req, attemptedPage) {
    const urlObj = getUrlAsObject(req.get('referrer'));
    urlObj.query.invalidPage = attemptedPage;

    return createUrl(urlObj.pathname, urlObj.query);
}

const isNumeric = value => /^\d+$/.test(value);

function isValidPage(page, rowCount) {
    return isNumeric(page) && page > 0 && !(rowCount > 0 && page > Math.ceil(rowCount / resultsPerPage));
}

function getCurrentPage(query) {
    const page = query ? Number(query.page) : 1;
    return Number.isNaN(page) ? 1 : page;
}

function addFiltersToUserInput(userInput, query) {
    const filtersForQuery = getInputtedFilters(query, 'QUERY');
    const cleanInput = removeAllFilters(userInput);

    if (!filtersForQuery) {
        return Object.assign({}, cleanInput);
    }
    return Object.assign({}, cleanInput, filtersForQuery);
}

function applySuggestionsToUserInput(userInput, query, session) {

    if (!query.suggest || !query.field) return userInput;

    const suggestions = getSearchSuggestions(session.userInput);

    const suggestionsToApply = suggestions[query.field].filter(suggestion =>
        suggestion.type === query.suggest
    );

    if (!suggestionsToApply || suggestionsToApply.length === 0) return userInput;

    return Object.assign({}, userInput, suggestionsToApply.reduce(newValues, {}));
}

function newValues(newValues, suggestion) {
    return Object.assign({}, newValues, {[suggestion.term]: suggestion.value});
}

function asArray(possibleArray) {
    return typeof possibleArray === 'string' ? [possibleArray] : possibleArray;
}
