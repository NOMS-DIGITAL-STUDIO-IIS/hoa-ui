const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('healthCheckTest', () => {
    let callback, healthcheckProxy;

    beforeEach(() => {
        callback = sinon.spy();
        const dbCheckStub = sinon.stub().resolves([{totalRows: {value: 0}}]);

        healthcheckProxy = (dbCheck = dbCheckStub) => {
            return proxyquire('../../server/healthcheck', {
                '../data/healthcheck': {
                    dbCheck: dbCheck
                }
            });
        };
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('healthcheck', () => {
        it('should return healthy if db resolves promise', async () => {
            await healthcheckProxy()(callback);

            const calledWith = callback.getCalls()[0].args[1];

            expect(callback).to.have.callCount(1);
            expect(calledWith.healthy).to.eql(true);
            expect(calledWith.checks.db).to.eql('ok');
        });

        it('should return unhealthy if db rejects promise', async () => {
            const dbCheckStubReject = sinon.stub().rejects({message: 'rubbish'});

            await healthcheckProxy(dbCheckStubReject)(callback);

            const calledWith = callback.getCalls()[0].args[1];

            expect(callback).to.have.callCount(1);
            expect(calledWith.healthy).to.eql(false);
            expect(calledWith.checks.db).to.eql('rubbish');
        });
    });
});
