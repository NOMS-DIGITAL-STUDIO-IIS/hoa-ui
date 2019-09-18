const chai = require('chai');
const expect = chai.expect;

const {validateAddressForm} = require('../../../controllers/helpers/formValidators');

describe('validateAddressForm', () => {
    it('should return error if fewer than 2 non-empty elements', () => {
        const result = validateAddressForm({address:'one ,.'});
        expect(result).to.eql({title: "Enter at least 2 address elements"});
    });

    it('should allow two or more non-blank elements', () => {
        const result = validateAddressForm({address:'one two'});
        expect(result).to.eql(null);
    });
});
