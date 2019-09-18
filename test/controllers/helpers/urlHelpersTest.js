const {
    getQueryStringsForSearch,
    mergeIntoQuery,
    toggleFromQueryItem,
    getUrlAsObject,
    createUrl
} = require('../../../controllers/helpers/urlHelpers');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

describe('urlHelpers', () => {
    describe('getQueryStringsForSearch', () => {
        it('should return a query string containing all current items from string', () => {
            const url = 'http://something.com/search/results?page=3&filters=Female&filters=HDC';
            const result = getQueryStringsForSearch(url);
            expect(result.thisPage).to.eql('?page=3&filters=Female&filters=HDC');
        });

        it('should return a query string for the next page', () => {
            const url = 'http://something.com/search/results?page=3&filters=Female&filters=HDC';
            const result = getQueryStringsForSearch(url);
            expect(result.nextPage).to.eql('?page=4&filters=Female&filters=HDC');
        });

        it('should return a query string for previous page', () => {
            const url = 'http://something.com/search/results?page=3&filters=Female&filters=HDC';
            const result = getQueryStringsForSearch(url);
            expect(result.prevPage).to.eql('?page=2&filters=Female&filters=HDC');
        });

        it('should handle no page being passed in', () => {
            const url = 'http://something.com/search/results';
            const result = getQueryStringsForSearch(url);
            expect(result.prevPage).to.eql('?page=0');
            expect(result.nextPage).to.eql('?page=2');
        });
    });

    describe('mergeIntoQuery', () => {
        let reqMock;

        beforeEach(() => {
            reqMock = {
                query: {
                    filters: ['Female', 'Male']
                }
            };
        });

        it('should append to existing query object and return', () => {
            const result = mergeIntoQuery(reqMock.query, {page: 3});
            const expectedResult = {
                filters: ['Female', 'Male'],
                page: 3
            };
            expect(result).to.eql(expectedResult);
        });

        it('should work when no existing querys', () => {
            reqMock.query = {};
            const result = mergeIntoQuery(reqMock.query, {page: 3});
            const expectedResult = {
                page: 3
            };
            expect(result).to.eql(expectedResult);
        });
    });

    describe('toggleFromQueryItem', () => {
        let reqMock;

        beforeEach(() => {
            reqMock = {
                query: {
                    filters: ['Female', 'Male']
                },
                get: item => 'http://something.com/search/referrer?page=2&filters=Male'
            };
        });

        it('should append to existing filter item', () => {
            const result = toggleFromQueryItem(reqMock, 'filters', 'NewFilter');
            const expectedResult = {
                filters: ['Female', 'Male', 'NewFilter']
            };
            expect(result).to.eql(expectedResult);
        });

        it('should work when no existing filter item', () => {
            reqMock.query = {};
            const result = toggleFromQueryItem(reqMock, 'filters', 'NewFilter');
            const expectedResult = {
                filters: 'NewFilter'
            };
            expect(result).to.eql(expectedResult);
        });

        it('should work when one existing filter item', () => {
            reqMock.query = {filters: 'OldFilter'};
            const result = toggleFromQueryItem(reqMock, 'filters', 'NewFilter');
            const expectedResult = {
                filters: ['OldFilter', 'NewFilter']
            };
            expect(result).to.eql(expectedResult);
        });

        it('should remove item if it already exists', () => {
            reqMock.query = {filters: 'OldFilter'};
            const result = toggleFromQueryItem(reqMock, 'filters', 'OldFilter');
            const expectedResult = {
                filters: []
            };
            expect(result).to.eql(expectedResult);
        });

        it('should not affect any other query items', () => {
            reqMock.query = {filters: 'OldFilter', otherFiler: 'hello'};
            const result = toggleFromQueryItem(reqMock, 'filters', 'OldFilter');
            const expectedResult = {
                filters: [],
                otherFiler: 'hello'
            };
            expect(result).to.eql(expectedResult);
        });

        it('should use referer rather than query if 4th argument is truthy', () => {
            reqMock.query = {filters: 'OldFilter'};
            const result = toggleFromQueryItem(reqMock, 'filters', 'NewFilter', 'referrer');
            const expectedResult = {
                page: '2',
                filters: ['Male', 'NewFilter']
            };
            expect(result).to.eql(expectedResult);
        });
    });

    describe('getUrlAsObject', () => {
        it('should return a url object', () => {
            const url = 'http://something.com/search/results?page=3&filters=Female&filters=HDC';
            const result = getUrlAsObject(url);
            expect(result.pathname).to.eql('/search/results');
            expect(result.query).to.eql({
                page: '3',
                filters: ['Female', 'HDC']
            });
        });
    });

    describe('createUrl', () => {
        it('should return a url string from an object', () => {
            const path = '/search/results';
            const query = {
                page: 3,
                filters: ['Female', 'HDC']
            };
            const result = createUrl(path, query);
            expect(result).to.eql('/search/results?page=3&filters=Female&filters=HDC');
        });
    });
});
