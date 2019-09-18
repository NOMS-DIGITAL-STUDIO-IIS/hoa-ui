const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const content = require('../../data/content');
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

const allItems = [
    'summary',
    'sentencing',
    'courtHearings',
    'movements',
    'hdc',
    'offences',
    'offencesInCustody',
    'addresses',
    'aliases'
];
const allDataRequests = [
    'summary',
    'sentencing',
    'courtHearings',
    'movements',
    'hdcRecall',
    'hdcInfo',
    'offences',
    'offencesInCustody',
    'addresses',
    'aliases'
];

describe('printController', () => {
    let resMock, subjectStub, createPdfStub, auditStub, getController;

    beforeEach(() => {
        subjectStub = sinon.stub().resolves({
            summary: {
                prisonNumber: '     id1',
                firstName: 'Matthew',
                middleName: 'James',
                lastName: 'Whitfield'
            }
        });
        createPdfStub = sinon.stub();
        auditStub = sinon.spy();

        getController = ({subject = subjectStub, createPdf = createPdfStub} = {}) => {
            return proxyquire('../../controllers/printController', {
                '../data/subject': {
                    getSubject: subject
                },
                './helpers/pdfHelpers': {
                    createPdf: createPdf
                },
                '../data/audit': {
                    record: auditStub
                }
            });
        };

        resMock = {render: sinon.spy(), redirect: sinon.spy(), status: sinon.spy(), writeHead: sinon.spy()};
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('getPrintForm', () => {
        it('should render the print form page if id is passed in with url', async () => {
            const reqMock = {
                query: {},
                params: {prisonNo: '12345678'},
                url: 'http://something.com/subject/blah?page=2'
            };

            await getController().getPrintForm(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render).to.have.been.calledWith('print', {
                content: content.view.print,
                prisonNumber: '12345678',
                name: {forename: 'Matthew', surname: 'Whitfield'},
                err: null,
                returnQuery: '?page=2'
            });
        });

        it('should render with ui error if user error is passed in, with no name', async () => {
            const reqMock = {
                query: {err: 'noneSelected'},
                params: {prisonNo: '12345678'},
                url: 'http://something.com/subject/blah?page=2'
            };

            await getController().getPrintForm(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render).to.have.been.calledWith('print', {
                content: content.view.print,
                prisonNumber: '12345678',
                name: {forename: 'Matthew', surname: 'Whitfield'},
                err: {title: content.view.print.noneSelected},
                returnQuery: '?page=2'
            });
        });

        it('should render with db error and no name if db error in query', async () => {
            const reqMock = {
                query: {err: 'db'},
                params: {prisonNo: '12345678'},
                url: 'http://something.com/subject/blah?page=2'
            };

            await getController().getPrintForm(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render).to.have.been.calledWith('print', {
                content: content.view.print,
                prisonNumber: '12345678',
                name: null,
                err: {title: content.pdf.dbError.title, desc: content.pdf.dbError.desc},
                returnQuery: '?page=2'
            });
        });

        it('should return to search page if no prison number passed in', async () => {
            const reqMock = {
                query: {},
                params: {}
            };

            await getController().getPrintForm(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith('/search');
        });
    });

    describe('postPrintForm', () => {
        it('should redirect to the pdf with the appropriate query string', async () => {
            const reqMock = {
                body: {
                    printOption: allItems
                },
                query: {},
                params: {prisonNo: '12345678'},
                user: {email: 'x@y.com'}
            };

            const expectedUrl = '/print/12345678/pdf?' +
                'fields=summary' +
                '&fields=sentencing' +
                '&fields=courtHearings' +
                '&fields=movements' +
                '&fields=hdc' +
                '&fields=offences' +
                '&fields=offencesInCustody' +
                '&fields=addresses' +
                '&fields=aliases';

            await getController().postPrintForm(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith(expectedUrl);
        });

        it('should audit the search', async () => {
            const reqMock = {
                body: {
                    printOption: ['summary', 'offencesInCustody']
                },
                query: {fields: ['summary', 'custodyOffences']},
                params: {prisonNo: '12345678'},
                user: {email: 'x@y.com'}
            };
            await getController().postPrintForm(reqMock, resMock);
            expect(auditStub).to.have.callCount(1);
        });

        it('should pass the appropriate data to audit', async () => {
            const reqMock = {
                body: {
                    printOption: ['summary', 'offencesInCustody']
                },
                query: {fields: ['summary', 'custodyOffences']},
                params: {prisonNo: '12345678'},
                user: {email: 'x@y.com'}
            };
            await getController().postPrintForm(reqMock, resMock);
            expect(auditStub).to.be.calledWith('PRINT', 'x@y.com', {prisonNo: '12345678',
                fieldsPrinted: ['summary', 'offencesInCustody']});
        });

        it('should remove any unexpected inputs', async () => {
            const reqMock = {
                body: {
                    printOption: ['summary', 'offencesInCustody', 'matt']
                },
                query: {},
                params: {prisonNo: '12345678'},
                user: {email: 'x@y.com'}
            };

            const expectedUrl = '/print/12345678/pdf?fields=summary&fields=offencesInCustody';

            await getController().postPrintForm(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith(expectedUrl);
        });

        it('should return to print form if no items are selected', async () => {
            const reqMock = {
                body: {},
                query: {},
                params: {prisonNo: '12345678'},
                user: {email: 'x@y.com'},
                url: 'http://something.com/subject/blah?page=2'
            };

            await getController().postPrintForm(reqMock, resMock);
            expect(resMock.render).to.have.been.calledWith('print', {content: content.view.print,
                prisonNumber: '12345678',
                name: null,
                err: {title: 'Please select at least one item to print'},
                name: {forename: 'Matthew', surname: 'Whitfield'},
                returnQuery: '?page=2'
            });
        });
    });

    describe('getPdf', () => {
        it('should redirect to search form if nothing in query string', async () => {
            const reqMock = {
                query: {},
                params: {prisonNo: '12345678'}
            };
            await getController().getPdf(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith('/search');
        });

        it('should get the data for the fields in the query string', async () => {
            const reqMock = {
                query: {fields: allItems},
                params: {prisonNo: '12345678'}
            };
            await getController().getPdf(reqMock, resMock);
            expect(subjectStub).to.have.callCount(1);
            expect(subjectStub).to.be.calledWith('12345678', allDataRequests);
        });

        it('should call createPdf if all data requests resolve successfully', async () => {
            const reqMock = {
                query: {fields: ['summary', 'addresses']},
                params: {prisonNo: '12345678'}
            };
            await getController().getPdf(reqMock, resMock);
            expect(createPdfStub).to.have.callCount(1);
        });

        it('should pass in the data to createpdf', async () => {
            const reqMock = {
                query: {fields: ['summary', 'addresses']},
                params: {prisonNo: '12345678'}
            };

            const expectedPrintItems = ['summary', 'addresses'];
            const expectedData = {
                summary: {
                    firstName: 'Matthew',
                    lastName: 'Whitfield',
                    middleName: 'James',
                    prisonNumber: '     id1'
                }
            };
            const expectedOptions = {
                type: 'searchPrint'
            };

            await getController().getPdf(reqMock, resMock);
            expect(createPdfStub.getCall(0).args[1]).to.eql(expectedPrintItems);
            expect(createPdfStub.getCall(0).args[2]).to.eql(expectedData);
            expect(createPdfStub.getCall(0).args[4]).to.eql(expectedOptions);
        });

        it('should get name and id details even if subject is not requested', async () => {
            const reqMock = {
                query: {fields: ['offences', 'addresses']},
                params: {prisonNo: '12345678'}
            };

            const expectedPrintItems = ['offences', 'addresses'];
            const expectedData = {
                summary: {
                    firstName: 'Matthew',
                    lastName: 'Whitfield',
                    middleName: 'James',
                    prisonNumber: '     id1'
                }
            };
            const expectedOptions = {
                type: 'searchPrint'
            };

            await getController().getPdf(reqMock, resMock);
            expect(createPdfStub.getCall(0).args[1]).to.eql(expectedPrintItems);
            expect(createPdfStub.getCall(0).args[2]).to.eql(expectedData);
            expect(createPdfStub.getCall(0).args[4]).to.eql(expectedOptions);
        });

        it('should work if only 1 item is requested', async () => {
            const reqMock = {
                query: {fields: 'addresses'},
                params: {prisonNo: '12345678'}
            };

            const expectedPrintItems = ['addresses'];
            const expectedData = {
                summary: {
                    firstName: 'Matthew',
                    lastName: 'Whitfield',
                    middleName: 'James',
                    prisonNumber: '     id1'
                }
            };
            const expectedOptions = {
                type: 'searchPrint'
            };

            await getController().getPdf(reqMock, resMock);
            expect(createPdfStub.getCall(0).args[1]).to.eql(expectedPrintItems);
            expect(createPdfStub.getCall(0).args[2]).to.eql(expectedData);
            expect(createPdfStub.getCall(0).args[4]).to.eql(expectedOptions);
        });

        it('should not call createPdf if any data requests resolve unsuccessfully', async () => {
            const reqMock = {
                query: {fields: ['summary', 'addresses']},
                params: {prisonNo: '12345678'}
            };

            const subjectStub = sinon.stub().rejects();
            await getController({subject: subjectStub}).getPdf(reqMock, resMock)
            expect(createPdfStub).to.have.callCount(0);
        });

        it('should redirect to print page if any data requests resolve unsuccessfully', async () => {
            const reqMock = {
                query: {fields: ['summary', 'addresses']},
                params: {prisonNo: '12345678'}
            };

            const subjectStub = sinon.stub().rejects();
            await getController({subject: subjectStub}).getPdf(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith('/print/12345678?err=db');
        });
    });
});
