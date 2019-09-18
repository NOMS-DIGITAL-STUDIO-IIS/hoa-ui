const chai = require('chai');
const expect = chai.expect;

const {validateName} = require('../../data/names');

describe('validateName', () => {
    it('should return error if names contain special characters', () => {
        const result = validateName('ma$£');
        expect(result).to.eql({title: 'A name mustn\'t contain space, numbers or special characters'});
    });

    it('should allow apostrophes', () => {
        const result = validateName('allow\'apostrophe');
        expect(result).to.eql(null);
    });

    it('should allow spaces', () => {
        const result = validateName('allow space');
        expect(result).to.eql(null);
    });

    it('should allow hyphens', () => {
        const result = validateName('allow-hyphen');
        expect(result).to.eql(null);
    });
});
