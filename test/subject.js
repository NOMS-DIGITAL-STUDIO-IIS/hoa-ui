process.env.NODE_ENV = 'test';

const proxyquire = require('proxyquire');
proxyquire.noCallThru();

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const TYPES = require('tedious').TYPES;

describe('Subject data', () => {
    let standardResponse;
    let getCollectionStub;
    let subjectProxy;
    let expectedReturnValue;

    beforeEach(() => {
        standardResponse = [{
            JSON1: {
                value: JSON.stringify({
                    prisonNumber: 'AB111111',
                    summary: {
                        identifier: {
                            prisonNumber: 'AB111111',
                            person: 1234567891,
                            pnc: '012345\/99A',
                            cro: '012345\/99C',
                            parole: [{ref: 'AA12311'}]
                        },
                        name: {
                            initial: 'F',
                            first: 'FIRSTA',
                            middle: 'MIDDLEA',
                            last: 'SURNAMEA'
                        },
                        sex: 'M'
                    },
                    hdcRecall: [{
                        createdDate: '2001-01-01',
                        curfewEndDate: '2001-01-02',
                        outcomeDate: '2001-01-02',
                        outcome: 'Licence revoked: recalled',
                        reason: 'BREACH CONDITIONS 38A1(a)'
                    }]
                })
            }
        }];

        getCollectionStub = sinon.stub().callsArgWith(2, standardResponse);

        subjectProxy = (getCollection = getCollectionStub) => {
            return proxyquire('../data/subject', {
                './dataAccess/iisData': {
                    getCollection: getCollection
                }
            });
        };

        expectedReturnValue = {
            prisonNumber: 'AB111111',
            summary: {
                identifier: {
                    prisonNumber: 'AB111111',
                    person: 1234567891,
                    pnc: '012345\/99A',
                    cro: '012345\/99C',
                    parole: [{ref: 'AA12311'}]
                },
                name: {
                    initial: 'F',
                    first: 'FIRSTA',
                    middle: 'MIDDLEA',
                    last: 'SURNAMEA'
                },
                sex: 'M'
            },
            hdcRecall: [{
                createdDate: '2001-01-01',
                curfewEndDate: '2001-01-02',
                outcomeDate: '2001-01-02',
                outcome: 'Licence revoked: recalled',
                reason: 'BREACH CONDITIONS 38A1(a)'
            }]
        };
    });

    afterEach(() => {
        sinon.reset();
    });

    it('should return expected info object', async () => {
        const data = await subjectProxy().getSubject('AB111111', ['summary']);

        expect(data).to.deep.equal(expectedReturnValue);
    });

    it('should return expected object when response is split', async () => {
        const splitJson = standardResponse[0].JSON1.value.split(/("M")/);
        const splitResponse = [
            {
                JSON1: {value: splitJson[0], meta: 'something'}
            },
            {
                JSON2: {value: splitJson[1].concat(splitJson[2]), meta: 'somethingElse'}
            }
        ];

        const getCollectionStub = sinon.stub().callsArgWith(2, splitResponse);
        const data = await subjectProxy(getCollectionStub).getSubject('AB111111', ['summary']);

        expect(data).to.deep.equal(expectedReturnValue);
    });

    describe('select clause', () => {
        const options = [
            {page: 'addresses', sql: ', JSON_QUERY(ADDRESSES) AS addresses'},
            {page: 'aliases', sql: ', JSON_QUERY(ALIASES) AS aliases'},
            {page: 'courtHearings', sql: ', JSON_QUERY(COURT_HEARINGS) AS courtHearings'},
            {page: 'hdcInfo', sql: ', JSON_QUERY(HDC_INFO) AS hdcInfo'},
            {page: 'hdcRecall', sql: ', JSON_QUERY(HDC_RECALL) AS hdcRecall'},
            {page: 'movements', sql: ', JSON_QUERY(MOVEMENTS) AS movements'},
            {page: 'offences', sql: ', JSON_QUERY(OFFENCES) AS offences'},
            {page: 'offencesInCustody', sql: ', JSON_QUERY(ADJUDICATIONS) AS offencesInCustody'},
            {page: 'sentencing', sql: ', JSON_QUERY(SENTENCING) AS sentencing'},
        ];

        it('should always request summary data', () => {
            options.forEach(option => {
                subjectProxy().getSubject('AB111111', [option.page]);
                expect(getCollectionStub).to.have.callCount(1);
                const sql = getCollectionStub.getCalls()[0].args[0];

                expect(sql).to.contain('JSON_QUERY(PERSONAL_DETAILS) AS summary');
                sinon.reset();
            });
        });

        it('should include the specific data needed', () => {
            options.forEach(option => {
                subjectProxy().getSubject('AB111111', [option.page]);
                expect(getCollectionStub).to.have.callCount(1);
                const sql = getCollectionStub.getCalls()[0].args[0];

                expect(sql).to.contain(option.sql);
                sinon.reset();
            });
        });

        it('should be able to hand multiple requests', () => {
            subjectProxy().getSubject('AB111111', ['offences', 'sentencing']);
            expect(getCollectionStub).to.have.callCount(1);
            const sql = getCollectionStub.getCalls()[0].args[0];

            expect(sql).to.contain('JSON_QUERY(PERSONAL_DETAILS) AS summary, ' +
                'JSON_QUERY(OFFENCES) AS offences, ' +
                'JSON_QUERY(SENTENCING) AS sentencing');
            sinon.reset();
        });
    });

    describe('getSubjectsForComparison', () => {

        it('should call getCollection', () => {
            subjectProxy().getSubjectsForComparison(['AB111111', 'AB111112']);
            expect(getCollectionStub).to.have.callCount(1);
        });

        it('should pass in the correct sql', () => {

            const expectedSql = `SELECT JSON_QUERY(PERSONAL_DETAILS) AS summary, JSON_QUERY(ADDRESSES) AS addresses, JSON_QUERY(ALIASES) AS aliases
               FROM HPA.PRISONER_DETAILS
               WHERE PK_PRISON_NUMBER = @PK_PRISON_NUMBER_0 OR PK_PRISON_NUMBER = @PK_PRISON_NUMBER_1
               FOR JSON PATH`;

            subjectProxy().getSubjectsForComparison(['AB111111', 'AB111112']);
            const sql = getCollectionStub.getCalls()[0].args[0];
            expect(sql).to.eql(expectedSql);
        });

        it('should pass in the correct sql if only one prionNumber passed in', () => {

            const expectedSql = `SELECT JSON_QUERY(PERSONAL_DETAILS) AS summary, JSON_QUERY(ADDRESSES) AS addresses, JSON_QUERY(ALIASES) AS aliases
               FROM HPA.PRISONER_DETAILS
               WHERE PK_PRISON_NUMBER = @PK_PRISON_NUMBER_0
               FOR JSON PATH`;

            subjectProxy().getSubjectsForComparison(['AB111111']);
            const sql = getCollectionStub.getCalls()[0].args[0];
            expect(sql).to.eql(expectedSql);
        });

        it('should pass in the correct sql if > 2 prison numbers passed in', () => {

            const expectedSql = `SELECT JSON_QUERY(PERSONAL_DETAILS) AS summary, JSON_QUERY(ADDRESSES) AS addresses, JSON_QUERY(ALIASES) AS aliases
               FROM HPA.PRISONER_DETAILS
               WHERE PK_PRISON_NUMBER = @PK_PRISON_NUMBER_0 OR PK_PRISON_NUMBER = @PK_PRISON_NUMBER_1 OR PK_PRISON_NUMBER = @PK_PRISON_NUMBER_2
               FOR JSON PATH`;

            subjectProxy().getSubjectsForComparison(['AB111111', 'AB111112', 'AB111113']);
            const sql = getCollectionStub.getCalls()[0].args[0];
            expect(sql).to.eql(expectedSql);
        });

        it('should pass in the correct parameters', () => {

            const expectedParams = [{
                column: `PK_PRISON_NUMBER_0`,
                type: TYPES.VarChar,
                value: 'AB111111'
            },
            {
                column: `PK_PRISON_NUMBER_1`,
                type: TYPES.VarChar,
                value: 'AB111112'
            }];

            subjectProxy().getSubjectsForComparison(['AB111111', 'AB111112']);
            const params = getCollectionStub.getCalls()[0].args[1];
            expect(params).to.eql(expectedParams);
        });

        it('should pass in the correct parameters if 1 prison number passed in', () => {

            const expectedParams = [{
                column: `PK_PRISON_NUMBER_0`,
                type: TYPES.VarChar,
                value: 'AB111111'
            }];

            subjectProxy().getSubjectsForComparison(['AB111111']);
            const params = getCollectionStub.getCalls()[0].args[1];
            expect(params).to.eql(expectedParams);
        });

        it('should pass in the correct parameters for > 2 prisonNumbers', () => {

            const expectedParams = [{
                column: `PK_PRISON_NUMBER_0`,
                type: TYPES.VarChar,
                value: 'AB111111'
            },
            {
                column: `PK_PRISON_NUMBER_1`,
                type: TYPES.VarChar,
                value: 'AB111112'
            },
            {
                column: `PK_PRISON_NUMBER_2`,
                type: TYPES.VarChar,
                value: 'AB111113'
            }];

            subjectProxy().getSubjectsForComparison(['AB111111', 'AB111112', 'AB111113']);
            const params = getCollectionStub.getCalls()[0].args[1];
            expect(params).to.eql(expectedParams);
        });
    });

});
