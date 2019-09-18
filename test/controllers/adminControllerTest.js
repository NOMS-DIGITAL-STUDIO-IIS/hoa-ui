const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('adminController', () => {
    let reqMock;
    let resMock;
    let getActionsStub;
    let printActionsStub;

    beforeEach(() => {
        reqMock = {
            user: {
                email: 'x@y.com'
            }
        };
        resMock = {render: sinon.spy(), redirect: sinon.spy(), status: sinon.spy()};
        getActionsStub = sinon.stub().resolves(['actions']);
        printActionsStub = sinon.stub();
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('getIndex', () => {
        let getIndexProxy;

        beforeEach(() => {
            getIndexProxy = (getActions = getActionsStub) => {
                return proxyquire('../../controllers/adminController', {
                    '../data/audit': {
                        getLatestActions: getActions
                    }
                }).getIndex;
            };
        });

        it('should call getLatestActions', async () => {
            await getIndexProxy()(reqMock, resMock);
            expect(getActionsStub).to.have.callCount(1);
        });

        it('should render admin view if successful', async () => {
            await getIndexProxy()(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render).to.be.calledWith('admin', {
                content: {title: 'Admin'},
                latestAccess: ['actions']
            });
        });

        it('should render admin view with error if unsuccessful', async () => {
            const getActionsRejectStub = sinon.stub().rejects({message: 'oops'});

            try {
                await getIndexProxy(getActionsRejectStub)(reqMock, resMock);
            } catch(e) {
                expect(resMock.render).to.have.callCount(1);
                expect(resMock.render).to.be.calledWith('admin', {
                    content: {title: 'Admin'},
                    latestAccess: [],
                    err: {
                        title: 'An error occurred retrieving audit data',
                        desc: 'Please reload the page to try again'
                    }
                });
            }
        });
    });

    describe('printItems', () => {
        let printItemsProxy;

        beforeEach(() => {
            printItemsProxy = (getActions = getActionsStub, printActions = printActionsStub) => {
                return proxyquire('../../controllers/adminController', {
                    '../data/audit': {
                        getLatestActions: getActions
                    },
                    './helpers/pdfHelpers': {
                        createPdf: printActions,
                        twoColumnTable: '2ColumnStub'
                    }
                }).printItems;
            };
        });

        it('should call getLatestActions', async () => {
            await printItemsProxy()(reqMock, resMock);
            expect(getActionsStub).to.have.callCount(1);
        });

        it('should print actions if successful', async () => {
            await printItemsProxy()(reqMock, resMock);
            expect(printActionsStub).to.have.callCount(1);
        });

        it('should pass appropriate data to printItems', async () => {
            await printItemsProxy()(reqMock, resMock);

            const availablePrintOptions = {
                latestAccess: {
                    title: 'Latest action per user',
                    addContent: '2ColumnStub',
                    getData: getActionsStub
                }
            };

            expect(printActionsStub).to.be.calledWith(resMock, ['latestAccess'], [['actions']], availablePrintOptions);
        });
    });
});
