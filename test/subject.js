'use strict';

let expect = require('chai').expect;
let db = require('../server/db');
let subject = require("../data/subject");

let EventEmitter = require("events").EventEmitter;

function prepareFakeDB(onRequest) {
    db.setFakeFactory(function fakeDBFactory() {
        let fake = new EventEmitter();
        process.nextTick(function() {
            fake.emit("connect");
        });
        fake.execSql = function(req) {
            onRequest(req);
        };
        return fake;
    });
}

describe('Subject data', function() {


    it("should return expected info object", function(done) {

        let infoResponse = {
            PK_PRISON_NUMBER: {value: 'AA112233'},
            INMATE_SURNAME: {value: 'SURNAME'},
            INMATE_FORENAME_1: {value: 'FORENAMEA'},
            INMATE_FORENAME_2: {value: 'FORENAME2'},
            PNC: {value: 'ABC/99A'},
            CRO: {value: 'XYZ/11Z'},
            PAROLE_REF_LIST: {value: 'AAA1,BB2'}
        };

        prepareFakeDB((req) => {
            req.callback(null, 1, [infoResponse]);
        });

        let expectedInfo = {
            prisonNumber: 'AA112233',
            surname: 'SURNAME',
            forename: 'FORENAMEA',
            forename2: 'FORENAME2',
            pnc: 'ABC/99A',
            cro: 'XYZ/11Z',
            paroleRefList: 'AAA1,BB2'
        };

        subject.info('AA112233', function(err, data) {

            expect(err).to.be.null;
            expect(data).to.deep.equal(expectedInfo);

            done();
        });
    });

    it("should return array of expected addresses objects", function(done) {

        let address1 = {
            INMATE_ADDRESS_1: {value: '1 STREET'},
            INMATE_ADDRESS_2: {value: 'A TOWN'},
            INMATE_ADDRESS_4: {value: 'REGIONA'},
            ADDRESS_TYPE: {value: 'H'},
            PERSON_DETS: {value: 'NAME A'}
        };

        let address2 = {
            INMATE_ADDRESS_1: {value: '2 STREET'},
            INMATE_ADDRESS_2: {value: 'B TOWN'},
            INMATE_ADDRESS_4: {value: ''},
            ADDRESS_TYPE: {value: ' '},
            PERSON_DETS: {value: ''}
        };

        prepareFakeDB((req) => {
            req.callback(null, 1, [address1, address2]);
        });

        let expectedAddresses = [{
            addressLine1: '1 Street',
            addressLine2: 'A Town',
            addressLine4: 'Regiona',
            type: 'Home',
            name: 'Name A'
        }, {
            addressLine1: '2 Street',
            addressLine2: 'B Town',
            addressLine4: '',
            type: 'Unknown',
            name: ''
        }];

        subject.addresses({prisonNumber: 'AA112233'}, function(err, data) {

            expect(err).to.be.null;
            expect(data).to.deep.equal(expectedAddresses);

            done();
        });
    });

    it("should return expected HDC history object", function(done) {

        let historyResponse = {
            STAGE_DATE: {value: '19990101'},
            STAGE: {value: '2'},
            HDC_STATUS: {value: '8'},
            HDC_REASON: {value: '1'}
        };

        prepareFakeDB((req) => {
            req.callback(null, 1, [historyResponse]);
        });

        let expectedHdcHistory = [{
            date: '01/01/1999',
            stage: 'HDC eligibility',
            status: 'Eligible',
            reason: 'HDC granted enhanced board'
        }];

        subject.hdcinfo({prisonNumber: 'AA112233'}, function(err, data) {

            expect(err).to.be.null;
            expect(data).to.deep.equal(expectedHdcHistory);

            done();
        });
    });
});
