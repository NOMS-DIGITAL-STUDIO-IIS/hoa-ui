const {
    getSearchSuggestions,
    getSearchTermsFromInput,
    useInitial,
    addWildcard,
    addShorterWildcard,
    useFirst,
    useLast
} = require('../../../controllers/helpers/suggestionHelpers');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

describe('suggestionHelpers', () => {
    const suggestUseInitial = {
        type: 'useInitial',
        term: 'forename',
        value: 'F'
    };

    const suggestAddWildcard = {
        type: 'addWildcard',
        term: 'surname',
        value: 'Last%'
    };

    const suggestAddShorterWildcard = {
        type: 'addShorterWildcard',
        term: 'surname',
        value: 'La%'
    };

    const suggestSwapLast = {
        type: 'swap',
        term: 'surname',
        value: 'First'
    };

    const suggestSwapFirst = {
        type: 'swap',
        term: 'forename',
        value: 'Last'
    };

    const suggestWidenAgeRange = {
        type: 'widenAgeRange',
        term: 'age',
        value: '28-32'
    };

    const suggestConvertToAgeRange = {
        type: 'convertToAgeRange',
        term: 'age',
        value: '30-34'
    };

    const suggestClearDobFields = [
        {
            type: 'convertToAgeRange',
            term: 'dobDay',
            value: ''
        },
        {
            type: 'convertToAgeRange',
            term: 'dobMonth',
            value: ''
        },
        {
            type: 'convertToAgeRange',
            term: 'dobYear',
            value: ''
        }
    ];

    describe('getSearchSuggestion', () => {
        it('should suggest nothing when no suggestable inputs', () => {
            const userInput = {prisonNumber: 'AB123456'};

            expect(getSearchSuggestions(userInput)).to.eql(null);
        });

        it('should suggest changing forename to initial', () => {
            const userInput = {forename: 'first'};
            const expected = {forename: [suggestUseInitial]};

            expect(getSearchSuggestions(userInput)).to.eql(expected);
        });

        it('should suggest adding wildcard and shorter wildcard to surname', () => {
            const userInput = {surname: 'last'};
            const expected = {surname: [suggestAddWildcard, suggestAddShorterWildcard]};

            expect(getSearchSuggestions(userInput)).to.eql(expected);
        });

        it('should suggest swapping surname and forename', () => {
            const userInput = {forename: 'first', surname: 'last'};
            const expected = {
                forename: [suggestUseInitial],
                surname: [suggestAddWildcard, suggestAddShorterWildcard],
                firstLast: [suggestSwapFirst, suggestSwapLast]
            };

            expect(getSearchSuggestions(userInput)).to.eql(expected);
        });

        it('should suggest changing age to age range', () => {
            const userInput = {age: '30'};
            const expected = {age: [suggestWidenAgeRange]};

            expect(getSearchSuggestions(userInput)).to.eql(expected);
        });

        it('should suggest changing dob to age range', () => {
            const userInput = {dobOrAge: 'dob', dobDay: '01', dobMonth: '08', dobYear: '1987'};
            const expected = {dob: [suggestConvertToAgeRange].concat(suggestClearDobFields)};
            expect(getSearchSuggestions(userInput)).to.eql(expected);
        });
    });

    describe('getSearchTermsFromInput', () => {
        it('should convert dob elements to single field', () => {
            const userInput = {dobOrAge: 'dob', dobDay: '01', dobMonth: '08', dobYear: '1987'};

            expect(getSearchTermsFromInput(userInput)['dob']).to.eql('1987-08-01');
        });

        it('should add first/last when forename and surname present', () => {
            const userInput = {forename: 'first', surname: 'last'};

            expect(getSearchTermsFromInput(userInput)['firstLast']).to.eql({first: 'first', last: 'last'});
        });

        it('should not add first/last when either forename or surname not present', () => {
            const userInput = {forename: 'first'};

            expect(Object.keys(getSearchTermsFromInput(userInput)).includes('firstLast')).to.equal(false);
        });
    });

    describe('converterFunctions', () => {
        describe('useInitial', () => {
            it('should take first letter of name and capitalize', () => {
                expect(useInitial('first')).to.eql('F');
            });

            it('should give null if name not longer than 1 character', () => {
                expect(useInitial('f')).to.eql(null);
            });
        });

        describe('addWildcard', () => {
            it('should append wildcard character to name and capitalize', () => {
                expect(addWildcard('last')).to.eql('Last%');
            });

            it('should give null if name already has wildcard', () => {
                expect(addWildcard('last%')).to.eql(null);
            });
        });

        describe('addShorterWildcard', () => {
            it('should shorten by 2 chars and append wildcard character to name and capitalize', () => {
                expect(addShorterWildcard('last')).to.eql('La%');
            });

            it('should give null if name already has wildcard', () => {
                expect(addShorterWildcard('last%')).to.eql(null);
            });

            it('should give null if name not longer than 2 characters', () => {
                expect(addShorterWildcard('la')).to.eql(null);
            });
        });

        describe('swapNames', () => {
            it('should retrieve first and capitalize', () => {
                const names = {first: 'first', last: 'last'};
                expect(useFirst(names)).to.eql('First');
            });

            it('should retrieve last and capitalize', () => {
                const names = {first: 'first', last: 'last'};
                expect(useLast(names)).to.eql('Last');
            });
        });
    });
});
