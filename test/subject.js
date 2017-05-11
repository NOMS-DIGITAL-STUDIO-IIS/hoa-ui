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

    let infoResponse = {
        PK_PRISON_NUMBER: {value: 'AA112233'},
        INMATE_SURNAME: {value: 'SURNAME'},
        INMATE_FORENAME_1: {value: 'FORENAMEA'},
        INMATE_FORENAME_2: {value: 'FORENAME2'},
        PNC: {value: 'ABC/99A'},
        PAROLE_REF_LIST: {value: 'AAA1,BB2'}
    };

    it("should return expected info object", function(done) {

        prepareFakeDB((req) => {
            req.callback(null, 1, [infoResponse]);
        });

        let expectedInfo = {
            prisonNumber: 'AA112233',
            surname: 'SURNAME',
            forename: 'FORENAMEA',
            forename2: 'FORENAME2',
            pnc: 'ABC/99A',
            paroleRefList: 'AAA1,BB2'
        };

        subject.info('AA112233', function(err, data) {

            expect(err).to.be.null;

            expect(data).to.deep.equal(expectedInfo);

            done();
        });
    });
});
