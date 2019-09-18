const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('subjectController', () => {
    let reqMock;
    let resMock;
    let subjectStub;
    let auditSpy;
    let getSubject;

    beforeEach(() => {
        reqMock = {
            user: {email: 'x@y.com'},
            params: {id: 'id1', page: 'aliases'},
            session: {},
            url: 'http://something.com/search/results?page=2&filters=Female',
            get: function(string) {
                return '';
            }
        };
        resMock = {render: sinon.spy(), redirect: sinon.spy(), status: sinon.spy()};

        subjectStub = sinon.stub().resolves({
            prisonNumber: 'id1',
            personIdentifier: '1',
            dob: '1'
        });
        auditSpy = sinon.spy();
        getSubject = ({subject = subjectStub} = {}) => {
            return proxyquire('../../controllers/subjectController', {
                '../data/subject': {
                    getSubject: subject
                },
                '../data/audit': {
                    record: auditSpy
                }
            }).getSubject;
        };
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('getSubject', () => {
        it('should assign the page visited to the session', async () => {
            await getSubject()(reqMock, resMock);
            expect(reqMock.session.visited).to.eql(['id1']);
        });

        it('should add the page visited to the session if some exist', async () => {
            reqMock.session.visited = ['idexisting'];
            await getSubject()(reqMock, resMock);
            expect(reqMock.session.visited).to.eql(['idexisting', 'id1']);
        });

        it('should audit that the page has been viewed', async () => {
            await getSubject()(reqMock, resMock);
            expect(auditSpy).to.have.callCount(1);
            expect(auditSpy).to.be.calledWith('VIEW', 'x@y.com', {page: 'aliases', prisonNumber: 'id1'});
        });

        it('should call getSummary and pass in prison number', async () => {
            await getSubject()(reqMock, resMock);
            expect(subjectStub).to.have.callCount(1);
            expect(subjectStub).to.be.calledWith('id1');
        });

        describe('data requested', () => {
            it('should get data for the appropriate page if aliases', async () => {
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['aliases']);
            });

            it('should get data for the appropriate page if hdcinfo', async () => {
                reqMock.params.page = 'hdcinfo';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['hdcRecall', 'hdcInfo']);
            });

            it('should get data for the appropriate page if movements', async () => {
                reqMock.params.page = 'movements';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['movements']);
            });

            it('should get data for the appropriate page if addresses', async () => {
                reqMock.params.page = 'addresses';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['addresses']);
            });

            it('should get data for the appropriate page if offences', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['offences']);
            });

            it('should get data for the appropriate page if offencesInCustody', async () => {
                reqMock.params.page = 'offencesincustody';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['offencesInCustody']);
            });

            it('should get data for the appropriate page if summary', async () => {
                reqMock.params.page = 'summary';
                await getSubject()(reqMock, resMock);
                expect(subjectStub).to.have.callCount(1);
                expect(subjectStub).to.be.calledWith('id1', ['sentenceSummary']);
            });
        });

        it('should render the appropriate subject page', async () => {
            await getSubject()(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render.getCall(0).args[0]).to.eql('subject/aliases');
        });

        it('should render the appropriate subject page if not summary', async () => {
            reqMock.params.page = 'offences';
            await getSubject()(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            expect(resMock.render.getCall(0).args[0]).to.eql('subject/offences');
        });

        describe('page data', () => {
            it('should send appropriate subject data to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[0]).to.eql('subject/offences');
                expect(resMock.render.getCall(0).args[1].subject).to.eql({
                    dob: '1', personIdentifier: '1', prisonNumber: 'id1'
                });
            });

            it('should send return query to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].returnQuery).to.eql('?page=2&filters=Female');
            });

            it('should send no results text to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].noResultsText).to.eql('Prisoner has no offences');
            });

            it('should send no results text to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].noResultsText).to.eql('Prisoner has no offences');
            });

            it('should send content to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].content).to.eql({
                    title: 'Prisoner details',
                    aliases: 'Prisoner has no aliases',
                    offencesincustody: 'Prisoner has no offences in custody',
                    movements: 'Prisoner has no movements',
                    hdcinfo: 'Prisoner has no HDC information',
                    hdcrecall: 'Prisoner has no HDC recall history',
                    offences: 'Prisoner has no offences',
                    addresses: 'Prisoner has no addresses',
                    sentences: 'Prisoner has no sentence history'
                });
            });

            it('should send nav content to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].nav).to.eql({
                    summary: {title: 'Sentence summary'},
                    sentences: {title: 'Sentence history'},
                    movements: {title: 'Movements'},
                    hdcinfo: {title: 'HDC recalls and history'},
                    offences: {title: 'Offences', active: true},
                    offencesincustody: {title: 'Offences in custody'},
                    aliases: {title: 'Aliases'},
                    addresses: {title: 'Addresses'}
                });
            });

            it('should send moment and case to page', async () => {
                reqMock.params.page = 'offences';
                await getSubject()(reqMock, resMock);
                expect(resMock.render.getCall(0).args[1].moment).to.eql(require('moment'));
                expect(resMock.render.getCall(0).args[1].setCase).to.eql({
                    sentence: require('../../controllers/helpers/textHelpers').sentence,
                    capital: require('../../controllers/helpers/textHelpers').capital,
                    capitalWithAcronyms: require('../../controllers/helpers/textHelpers').capitalWithAcronyms,
                    sentenceWithAcronyms: require('../../controllers/helpers/textHelpers').sentenceWithAcronyms
                });
            });
        });

        context('Promise rejection', () => {
            it('should render error page if getSummary rejects', async () => {
                subjectStub = sinon.stub().rejects('error');
                await getSubject({summary: subjectStub})(reqMock, resMock);

                expect(resMock.render).to.have.callCount(1);
                expect(resMock.render).to.be.calledWith('subject/error');
            });

            it('should render error page if get[page] rejects', async () => {
                subjectStub = sinon.stub().rejects('error');
                await getSubject({summary: subjectStub})(reqMock, resMock);

                expect(resMock.render).to.have.callCount(1);
                expect(resMock.render).to.be.calledWith('subject/error');
            });
        });
    });
});
