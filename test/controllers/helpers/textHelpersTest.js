const {
    capitalWithAcronyms,
    sentenceWithAcronyms
} = require('../../../controllers/helpers/textHelpers');
const chai = require('chai');
const expect = chai.expect;

describe('textHelpers', () => {
    describe('capitalWithAcronyms', () => {
        it('should return sentence in capital case', () => {
            const input = 'A SENTENCE IS HERE';

            const result = capitalWithAcronyms(input);
            expect(result).to.eql('A Sentence Is Here');
        });

        it('should have known acronyms in capital', () => {
            const input = 'A SENTENCE HDC IS HERE';

            const result = capitalWithAcronyms(input);
            expect(result).to.eql('A Sentence HDC Is Here');
        });

        it('should not replace acronyms if they are part of a word', () => {
            const input = 'A SENTENCE HDCIS HERE';

            const result = capitalWithAcronyms(input);
            expect(result).to.eql('A Sentence Hdcis Here');
        });
    });

    describe('sentenceWithAcronyms', () => {
        it('should return sentence in sentence case', () => {
            const input = 'A SENTENCE IS HERE';

            const result = sentenceWithAcronyms(input);
            expect(result).to.eql('A sentence is here');
        });

        it('should have known acronyms in capital', () => {
            const input = 'A SENTENCE GOAD IS HERE';

            const result = sentenceWithAcronyms(input);
            expect(result).to.eql('A sentence GOAD is here');
        });

        it('should not replace acronyms if they are part of a word', () => {
            const input = 'A SENTENCE GOADIS HERE';

            const result = sentenceWithAcronyms(input);
            expect(result).to.eql('A sentence goadis here');
        });
    });
});
