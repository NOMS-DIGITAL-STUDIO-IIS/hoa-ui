require('jsdom-global/register');
const chai = require('chai');
const $ = require('jquery');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
chai.use(sinonChai);

proxyquire.noCallThru();

const initialPage = '<html><head></head><body>' +
    '<div id="resultsBody"></div>' +
    '<form id="idForm" method="post">' +
    '<input name="_csrf" type="hidden" value="4">' +
    '<input id="prisonNumber" type="text" name="prisonNumber">' +
    '<button id="submitId">Search</button>' +
    '</form>' +
    '<form id="descriptionForm" method="post">' +
    '<input name="_csrf" type="hidden" value="4">' +
    '<input id="forename" type="text" name="forename">' +
    '<input id="forename2" type="text" name="forename2">' +
    '<input id="surname" type="text" name="surname">' +
    '<input id="dobDay" name="dobDay" type="number">' +
    '<input id="dobMonth" name="dobMonth" type="number">' +
    '<input id="dobYear" name="dobYear" type="number" >' +
    '<input id="age" name="age" type="text">' +
    '<button id="submitNonId">Search</button>' +
    '</form>' +
    '</body></html>';

describe('Client side search form', () => {

    let validatorStub;
    let searchValidator;

    beforeEach(() => {
        document.body.innerHTML = initialPage;
        validatorStub = sinon.stub().returns(null);
        searchValidator = (validator = validatorStub) => {
            return proxyquire('../../assets/javascripts/validation/index', {
                '../../../controllers/helpers/formValidators': {
                    validateDescriptionForm: validator
                }
            }).init;
        };
    });

    afterEach(() => {
        sinon.reset();
    });

    it('should display an error if empty form submitted', () => {
        searchValidator();
        $('#submitId').click();

        expect($('#errors').length).to.equal(1);
    });

    it('should not display an error if no errors returned from validator', () => {
        searchValidator();
        $('#prisonNumber').val('4');
        $('#submitId').click();

        expect($('#errors').length).to.equal(0);
    });

    it('should display an error if one returned from validator', () => {
        validatorStub = sinon.stub().returns({title: 'error'});
        searchValidator(validatorStub);
        $('#surname').val('W');
        $('#submitNonId').click();

        expect($('#errors').length).to.equal(1);
    });

});
