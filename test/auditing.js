process.env.NODE_ENV = 'test';

const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const audit = require('../data/audit');
const app = require('../server/app');
const proxyquire = require('proxyquire');
proxyquire.noCallThru();
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const TYPES = require('tedious').TYPES;

describe('Auditing', () => {
    beforeEach(() => {
        sinon.stub(audit, 'record');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should record login event', async () => {
        await request(app).get('/disclaimer')
            .expect(200);

        sinon.assert.calledOnce(audit.record);
        sinon.assert.calledWith(audit.record, 'LOG_IN', 'test@test.com');
    });

    it('should record disclaimer accepted event', async () => {
        await request(app).post('/disclaimer')
            .send({disclaimer: 'disclaimer'})
            .expect(302);

        sinon.assert.calledOnce(audit.record);
        sinon.assert.calledWith(audit.record, 'DISCLAIMER_ACCEPTED', 'test@test.com');
    });
});

describe('Audit', () => {
    let addRowStub, record;

    beforeEach(() => {
        addRowStub = sinon.stub().callsArgWith(2, 14);

        record = (addRow = addRowStub) => {
            return proxyquire('../data/audit', {
                './dataAccess/auditData': {
                    addRow: addRow
                }
            }).record;
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('inmate', () => {
        it('should reject if unspecified key', () => {
            expect(() => record()('Key', 'a@y.com', {data: 'data'})).to.throw(Error);
        });

        it('should call auditData.addRow', async () => {
            await record()('SEARCH', 'a@y.com', {data: 'data'});

            expect(addRowStub).to.have.callCount(1);
        });

        it('should pass the sql paramaters', async () => {
            await record()('SEARCH', 'a@y.com', {data: 'data'});
            const expectedParameters = [
                {column: 'user', type: TYPES.VarChar, value: 'a@y.com'},
                {column: 'action', type: TYPES.VarChar, value: 'SEARCH'},
                {column: 'details', type: TYPES.VarChar, value: JSON.stringify({data: 'data'})}
            ];

            expect(addRowStub.getCall(0).args[1]).to.eql(expectedParameters);
        });
    });
});
