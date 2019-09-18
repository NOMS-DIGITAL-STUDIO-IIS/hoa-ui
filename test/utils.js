const expect = require('chai').expect;
const utils = require('../data/utils');
const moment = require('moment');
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('Utility methods', () => {
    let originalGetCurrentTime = null;

    before(() => {
        originalGetCurrentTime = utils.getCurrentTime;
        utils.getCurrentTime = () => {
            const now = moment();
            now.set('year', 2017);
            now.set('month', 'March');
            now.set('date', 15);
            return now;
        };
    });

    after(() => {
        utils.getCurrentTime = originalGetCurrentTime;
    });

    it('should return an array when an age has been passed', () => {
        expect(utils.getDateRange('36'))
            .to.be.an('array')
            .to.contain('19800316')
            .to.contain('19810315');
    });

    it('should return an array when an age range has been passed', () => {
        expect(utils.getDateRange('36-40'))
            .to.be.an('array')
            .to.contain('19760316')
            .to.contain('19810315');
    });

    it('should add leading zero if a single digit is passed', () => {
        expect(utils.pad(9)).to.equal('09');
    });

    it('should not add leading zero if a double digit is passed', () => {
        expect(utils.pad(19)).to.equal(19);
    });

    describe('pagination', () => {
        const pagePosition = 1;
        const resultsPerPage = 10;
        const rows = 19;

        const pagination = proxyquire('../data/utils', {
            '../server/config': {
                searchResultsPerPage: resultsPerPage
            }
        }).pagination;

        it('should return a total of 2 pages for the above settings', () => {
            expect(pagination(rows, pagePosition).totalPages)
                .to.equal(2);
        });

        it('should return same position as being passed', () => {
            expect(pagination(rows, pagePosition).currPage)
                .to.equal(1);
        });

        it('should return showPrev=false when page position is at 1', () => {
            expect(pagination(rows, pagePosition).showPrev)
                .to.equal(false);
        });

        it('should return showPrev=true when page position is at 2', () => {
            expect(pagination(rows, pagePosition + 1).showPrev)
                .to.equal(true);
        });

        it('should return showNext=true when page position is at 1', () => {
            expect(pagination(rows, pagePosition).showNext)
                .to.equal(true);
        });

        it('should return showNext=false when page position is at 2', () => {
            expect(pagination(rows, pagePosition + 1).showNext)
                .to.equal(false);
        });
    });

    it('should convert the accronyms to uppercase', () => {
        expect(utils.acronymsToUpperCase('Hdc is Home Detention Curfew. And ard is actual release date'))
            .to.equal('HDC is Home Detention Curfew. And ARD is actual release date');
    });

    it('should not convert the accronym letters in a word', () => {
        expect(utils.acronymsToUpperCase('This code was done by a beardy guy, chilling in a barnyard.'))
            .to.equal('This code was done by a beardy guy, chilling in a barnyard.');
    });

    describe('cleanAddressSearch', () => {
        it('should split on spaces and join terms with commas', () => {
            expect(utils.cleanAddressSearch('a b ccc ccc')).to.equal('a, b, ccc, ccc');
        });

        it('should change comma to space and join terms with commas', () => {
            expect(utils.cleanAddressSearch('a,b ccc,ccc')).to.equal('a, b, ccc, ccc');
        });

        it('should change period to space and join terms with commas', () => {
            expect(utils.cleanAddressSearch('a.b ccc.ccc')).to.equal('a, b, ccc, ccc');
        });

        it('should remove quotes and join terms with commas', () => {
            expect(utils.cleanAddressSearch(`a'b ccc'ccc`)).to.equal('ab, cccccc');
        });
    });
});
