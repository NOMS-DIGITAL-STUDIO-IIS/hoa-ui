const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('formValidators', () => {
    describe('validateDescriptionForm', () => {
        let validateDobStub, validateAgeStub, validateNameStub, ui, validateDescriptionForm;

        beforeEach(() => {
            validateDobStub = sinon.stub().returns(null);
            validateAgeStub = sinon.stub().returns(null);
            validateNameStub = sinon.stub().returns(null);

            ui = {
                dobDay: '12',
                dobMonth: '12',
                dobYear: '12',
                age: '12',
                surname: 'Whitfield',
                forename: 'Whitfield',
                forename2: 'Whitfield'
            };

            validateDescriptionForm = (validateDob = validateDobStub,
                validateAge = validateAgeStub,
                validateName = validateNameStub) => {
                    return proxyquire('../../../controllers/helpers/formValidators', {
                        '../../data/dob': {
                            validateDob: validateDob,
                            validateAge: validateAge
                        },
                        '../../data/names': {
                            validateName: validateName
                        }
                    }).validateDescriptionForm;
                };
        });

        it('should call validator for each input if no errors', () => {
            const result = validateDescriptionForm()(ui);

            expect(validateAgeStub).to.have.callCount(1);
            expect(validateDobStub).to.have.callCount(1);
            expect(validateNameStub).to.have.callCount(3);
            expect(result).to.eql(null);
        });

        it('should return first failure', () => {
            validateNameStub = sinon.stub().returns({err: 'error'});

            const result = validateDescriptionForm()(ui);

            expect(validateAgeStub).to.have.callCount(1);
            expect(validateDobStub).to.have.callCount(1);
            expect(validateNameStub).to.have.callCount(1);
            expect(result).to.eql({err: 'error'});
        });

        it('should return first failure if age', () => {
            validateAgeStub = sinon.stub().returns({err: 'error'});

            const result = validateDescriptionForm()(ui);

            expect(validateAgeStub).to.have.callCount(1);
            expect(validateDobStub).to.have.callCount(1);
            expect(validateNameStub).to.have.callCount(0);
            expect(result).to.eql({err: 'error'});
        });

        it('should return first failure if dob', () => {
            validateDobStub = sinon.stub().returns({err: 'error'});

            const result = validateDescriptionForm()(ui);

            expect(validateAgeStub).to.have.callCount(0);
            expect(validateDobStub).to.have.callCount(1);
            expect(validateNameStub).to.have.callCount(0);
            expect(result).to.eql({err: 'error'});
        });
    });
});
