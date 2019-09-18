const chai = require('chai');
const expect = chai.expect;
const content = require('../../data/content');

const {
    validateDob,
    validateAge
} = require('../../data/dob');

describe('dob', () => {
    describe('validateDob', () => {
        it('should return error if an invalid date is passed', () => {
            const result = validateDob('29', '02', '2017');
            expect(result).to.eql({title: 'Enter a valid date of birth in the format DD/MM/YYYY'});
        });

        it('should return error if an invalid date is passed', () => {
            const result = validateDob('20', '12', '2040');
            expect(result).to.eql({title: 'The date of birth cannot be in the future'});
        });

        it('should return error if date is in wrong format', () => {
            const result = validateDob('20', '12', '85');
            expect(result).to.eql({title: 'Enter a valid date of birth in the format DD/MM/YYYY'});
        });

        it('should not return error if date is fine', () => {
            const result = validateDob('10', '06', '1960');
            expect(result).to.eql(null);
        });
    });

    describe('validateAge', () => {
        let error;

        beforeEach(() => {
            error = {
                title: content.errMsg.CANNOT_SUBMIT,
                items: [{ageRange: 'Re-enter age or range'}],
                desc: content.errMsg.INVALID_AGE
            };
        });

        it('should return error if an invalid date is passed', () => {
            const result = validateAge('-13');
            expect(result).to.eql(error);
        });

        it('should return error if negative age range', () => {
            const result = validateAge('33-30');
            error.desc = content.errMsg.INVALID_AGE_RANGE;
            expect(result).to.eql(error);
        });

        it('should return error if range > 10 years', () => {
            const result = validateAge('33-44');
            error.desc = content.errMsg.INVALID_AGE_RANGE
            expect(result).to.eql(error);
        });

        it('should not return error if age is fine', () => {
            const result = validateAge('10-15');
            expect(result).to.eql(null);
        });
    });
});
