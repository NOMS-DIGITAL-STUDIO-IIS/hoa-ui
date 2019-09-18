const {
    getIndex,
    postPagination,
    postFilters,
    postAddToShortlist
} = require('../../controllers/searchController');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const content = require('../../data/content');
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('searchController', () => {
    let reqMock;
    let resMock;

    beforeEach(() => {
        reqMock = {
            user: {
                email: 'x@y.com',
            },
            query: {},
            session: {},
            url: 'http://something.com/search'
        };
        resMock = {render: sinon.spy(), redirect: sinon.spy(), status: sinon.spy()};
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('getIndex', () => {
        it('should render the search page', () => {
            getIndex(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            const view = resMock.render.getCalls()[0].args[0];
            expect(view).to.eql('search/index');
        });

        it('should pass in error object if in query', () => {
            reqMock.query.error = 'ETIMEOUT';
            const expectedError = {
                title: 'The search timed out. Try a more specific query',
                desc: content.errMsg.DB_ERROR_DESC
            };

            getIndex(reqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            const payload = resMock.render.getCalls()[0].args[1];
            expect(payload.err).to.eql(expectedError);
        });

        it('should clear userinput', () => {
            reqMock.session.userInput = {some: 'thing'};
            const expectedUi= {};

            getIndex(reqMock, resMock);
            expect(reqMock.session.userInput).to.eql(expectedUi);
        });

        it('should tell the view to use placeholder', () => {
            getIndex(reqMock, resMock);
            const payload = resMock.render.getCalls()[0].args[1];
            expect(payload.usePlaceholder).to.eql(true);
        });
    });

    describe('postSearchForm', () => {
        let validatorStub, addressValidator, postSearchFormProxy;

        beforeEach(() => {
            validatorStub = sinon.stub().returns(null);

            postSearchFormProxy = (descriptionValidator = addressValidator = validatorStub) => {
                return proxyquire('../../controllers/searchController', {
                    './helpers/formValidators': {
                        validateDescriptionForm: descriptionValidator,
                        validateAddressForm: addressValidator
                    }
                }).postSearchForm;
            };
        });

        it('should redirect to search results if no validation error returned', () => {
            const localReqMock = {
                body: {
                    searchFormType: 'nameAge',
                    forename: 'Matthew',
                    surname: 'Whitfield'
                },
                session: {
                    userInput: {}
                },
                url: 'http://something.com/search',
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy()(localReqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith('/search/results');
        });

        it('should set the userInput on the session ', () => {
            const localReqMock = {
                body: {
                    searchFormType: 'nameAge',
                    forename: 'Matthew',
                    surname: 'Whitfield'
                },
                query: {0: 'names', 1: 'identifier'},
                session: {
                    userInput: {}
                },
                url: 'http://something.com/search',
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy()(localReqMock, resMock);
            expect(localReqMock.session.userInput).to.eql({
                forename: 'Matthew',
                surname: 'Whitfield'
            });
        });

        it('should ignore items in query string that do not exist', () => {
            const localReqMock = {
                body: {
                    searchFormType: 'nameAge',
                    forename: 'Matthew',
                    surname: 'Whitfield'
                },
                query: {0: 'names', 1: 'identifier', 2: 'incorrect'},
                session: {
                    userInput: {}
                },
                url: 'http://something.com/search',
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy()(localReqMock, resMock);
            expect(localReqMock.session.userInput).to.eql({
                forename: 'Matthew',
                surname: 'Whitfield'
            });
        });

        it('should only use the fields from the selected search type ', () => {
            const localReqMock = {
                body: {
                    searchFormType: 'other',
                    forename: 'Matthew',
                    surname: 'Whitfield',
                    address: 'address input'
                },
                query: {0: 'names', 1: 'identifier'},
                session: {
                    userInput: {}
                },
                url: 'http://something.com/search',
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy()(localReqMock, resMock);
            expect(localReqMock.session.userInput).to.eql({address: 'address input'});
        });

        it('should render search with validation error if any of the inputs do not validate', () => {
            const descriptionValidatorStub = sinon.stub().returns({error: 'error'});

            const localReqMock = {
                body: {
                    searchFormType: 'nameAge',
                    forename: 'Matthew',
                    surname: 'Whitfield'
                },
                query: {0: 'names'},
                session: {
                    userInput: {}
                },
                url: 'http://something.com/search',
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy(descriptionValidatorStub)(localReqMock, resMock);
            expect(resMock.render).to.have.callCount(1);
            const view = resMock.render.getCalls()[0].args[0];
            const payload = resMock.render.getCalls()[0].args[1];
            expect(view).to.eql('search/index');
            expect(payload.err).to.eql({error: 'error'});
        });

        it('should reset the visited results', () => {
            const localReqMock = {
                body: {
                    searchFormType: 'nameAge',
                    forename: 'Matthew',
                    surname: 'Whitfield'
                },
                query: {0: 'names', 1: 'identifier', 2: 'incorrect'},
                session: {
                    visited: ['id1']
                },
                get: function() {
                    return '';
                }
            };

            postSearchFormProxy()(localReqMock, resMock);
            expect(localReqMock.session.visited).to.eql([]);
        });
    });

    describe('getResults', () => {
        let getSearchResultsCountStub;
        let getZeroSearchResultsCountStub;
        let getSearchResultsStub;
        let auditSpy;
        let getResultsProxy;

        beforeEach(() => {
            getSearchResultsCountStub = sinon.stub().resolves([{totalRows: {value: 20}}]);
            getZeroSearchResultsCountStub = sinon.stub().resolves([{totalRows: {value: 0}}]);
            getSearchResultsStub = sinon.stub().resolves({forename: 'Matt'});
            auditSpy = sinon.spy();

            reqMock = {
                headers: {
                    referer: 'http://something.com/search/results?page=2'
                },
                session: {
                    userInput: {
                        forename: 'Matthew',
                        surname: 'Whitfield'
                    }
                },
                query: {page: 1},
                user: {email: 'x@y.com'},
                url: 'http://something.com/search/results?page=2&filters=Female',
                get: item => 'http://something.com/search/results?page=2'
            };


            getResultsProxy = (getSearchResultsCount = getSearchResultsCountStub,
                getSearchResults = getSearchResultsStub) => {
                    return proxyquire('../../controllers/searchController',
                        {
                            '../data/search': {
                            getSearchResultsCount: getSearchResultsCount,
                            getSearchResults: getSearchResults
                        },
                        '../data/audit': {
                            record: auditSpy
                        }
                    }).getResults;
                };
        });

        it('should redirect to search if no referrer', async () => {
            reqMock = {headers: {referer: undefined}};

            await getResultsProxy()(reqMock, resMock);
            expect(resMock.redirect).to.have.callCount(1);
            expect(resMock.redirect).to.have.been.calledWith('/search');
        });

        context('rowcounts === 0', () => {
            it('should not call getSearchResults', async () => {
                await getResultsProxy(getZeroSearchResultsCountStub)(reqMock, resMock);
                expect(getSearchResultsStub).to.have.callCount(0);
            });

            it('should render results page', async () => {
                await getResultsProxy(getZeroSearchResultsCountStub)(reqMock, resMock);
                expect(resMock.render).to.have.callCount(1);
            });

            it('should pass appropriate data to view', async () => {
                await getResultsProxy(getZeroSearchResultsCountStub)(reqMock, resMock);

                const expectedData = [];
                const expectedCount = 0;

                const payload = resMock.render.getCalls()[0].args[1];

                expect(payload.data).to.be.eql(expectedData);
                expect(payload.rowCount).to.be.eql(expectedCount);

            });

            it('should tell the view if id search', async () => {
                reqMock.session.userInput = {prisonNumber: '666'};
                await getResultsProxy(getZeroSearchResultsCountStub)(reqMock, resMock);
                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.idSearch).to.eql(true);
            });

        });

        context('rowcounts > 0', () => {
            it('should call getSearchResults', async () => {
                await getResultsProxy()(reqMock, resMock);
                expect(getSearchResultsStub).to.have.callCount(1);
            });

            it('should audit the search', async () => {
                await getResultsProxy()(reqMock, resMock);
                expect(auditSpy).to.have.callCount(1);
            });

            it('should pass the appropriate data to audit', async () => {
                await getResultsProxy()(reqMock, resMock);
                expect(auditSpy).to.be.calledWith('SEARCH', 'x@y.com', {
                    forename: 'Matthew',
                    page: 1,
                    surname: 'Whitfield'
                });
            });

            it('should redirectToReferer if the page is not valid', async () => {
                reqMock.query.page = '20';
                await getResultsProxy()(reqMock, resMock);

                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?page=2&invalidPage=20');
            });

            it('should render results page', async () => {
                await getResultsProxy()(reqMock, resMock);
                expect(resMock.render).to.have.callCount(1);
            });

            it('should pass appropriate data to view', async () => {
                await getResultsProxy()(reqMock, resMock);

                const expectedData = [{forename: 'Matt', shortListed: false, visited: false}];
                const expectedCount = 20;

                const payload = resMock.render.getCalls()[0].args[1];

                expect(payload.data).to.be.eql(expectedData);
                expect(payload.rowCount).to.be.eql(expectedCount);
            });

            it('should pass suggestions to view', async () => {
                await getResultsProxy()(reqMock, resMock);

                const expectedSuggestions = {
                    forename: [{type: "useInitial", term: "forename", value: "M"}],
                        surname: [
                        {type: "addWildcard", term: "surname", value: "Whitfield%"},
                        {type: "addShorterWildcard", term: "surname", value: "Whitfie%"}],
                        firstLast: [
                        {type: "swap", term: "forename", value: "Whitfield"},
                        {type: "swap", term: "surname", value: "Matthew"}]
                };

                const payload = resMock.render.getCalls()[0].args[1];

                expect(payload.suggestions).to.be.eql(expectedSuggestions);
            });

            it('should pass form contents to view', async () => {
                await getResultsProxy()(reqMock, resMock);

                const expectedFormContents = {
                    forename: "Matthew",
                    surname: "Whitfield"
                };

                const payload = resMock.render.getCalls()[0].args[1];

                expect(payload.formContents).to.be.eql(expectedFormContents);
            });

            it('should pass pagination details to view', async () => {
                await getResultsProxy()(reqMock, resMock);

                const expectedPagination = {
                    'totalPages': 2,
                    'currPage': 1,
                    'showPrev': false,
                    'showNext': true
                };

                const payload = resMock.render.getCalls()[0].args[1];

                expect(payload.pagination).to.be.eql(expectedPagination);
            });

            it('should handle when no page passed in', async () => {
                reqMock.url = 'http://something.com/search/results';

                const expectedPagination = {
                    'totalPages': 2,
                    'currPage': 1,
                    'showPrev': false,
                    'showNext': true
                };

                const expectedQueryStrings = {
                    prevPage: "?page=0",
                    thisPage: "",
                    nextPage: "?page=2"
                };

                await getResultsProxy()(reqMock, resMock);

                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.pagination).to.be.eql(expectedPagination);
                expect(payload.queryStrings).to.be.eql(expectedQueryStrings);

            });

            it('should add visited data', async () => {
                reqMock.session.visited = ['1', '3'];

                const receivedData = [
                    {prisonNumber: '1', forename: 'Matt'},
                    {prisonNumber: '2', forename: 'Alistair'},
                    {prisonNumber: '3', forename: 'Zed'},
                ];

                getSearchResultsStub = sinon.stub().resolves(receivedData);
                await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);

                const expectedData = [
                    {forename: 'Matt', prisonNumber: '1', visited: true, shortListed: false},
                    {forename: 'Alistair', prisonNumber: '2', visited: false, shortListed: false},
                    {forename: 'Zed', prisonNumber: '3', visited: true, shortListed: false}
                ];

                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.data).to.be.eql(expectedData);
            });

            it('should not add visited data when there are no results', async () => {
                reqMock.session.visited = ['1', '3'];
                const receivedData = null;

                getSearchResultsStub = sinon.stub().resolves(receivedData);

                await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);

                const expectedData = [];

                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.data).to.be.eql(expectedData);
            });

            it('should pass a pageError if one is present', async () => {
                reqMock.query.invalidPage = '20';
                await getResultsProxy()(reqMock, resMock);

                const expectedPayloadError = {
                    title: 'Invalid selection',
                    desc: 'The page number 20 does not exist'
                };
                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.err).to.eql(expectedPayloadError);

            });

            context('Rejected getRows promise', () => {
                it('should redirect to search page', async () => {
                    getSearchResultsCountStub = sinon.stub().rejects({code: 'ETIMEOUT'});
                    await getResultsProxy()(reqMock, resMock);

                    expect(resMock.redirect).to.have.callCount(1);
                    expect(resMock.redirect).to.have.been.calledWith('/search?error=ETIMEOUT');
                });
            });

            context('Rejected getSearchResults promise', () => {
                it('should redirect to search page', async () => {
                    getSearchResultsStub = sinon.stub().rejects({code: 'ETIMEOUT'});
                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);

                    expect(resMock.redirect).to.have.callCount(1);
                    expect(resMock.redirect).to.have.been.calledWith('/search?error=ETIMEOUT');
                });
            });

            it('should not pass the shortList to the view', async () => {
                await getResultsProxy()(reqMock, resMock);
                const payload = resMock.render.getCalls()[0].args[1];
                expect(payload.shortList).to.be.eql(null);
            });

            context('When shortList is in the query', () => {

                it('should pass the latest name into the view', async () => {
                    reqMock.query.shortList = 'AB111111';
                    reqMock.query.shortListName = 'Matthew Whitfield';
                    const expectedShortListName = 'Matthew Whitfield';

                    await getResultsProxy()(reqMock, resMock);
                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.shortList.latestName).to.be.eql(expectedShortListName);
                });

                it('should pass the shortList to the view in an array', async () => {
                    reqMock.query.shortList = 'AB111111';
                    const expectedShortList = ['AB111111'];

                    await getResultsProxy()(reqMock, resMock);
                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.shortList.prisonNumbers).to.be.eql(expectedShortList);

                });

                it('should pass the shortList to the view in an array if already multiple', async () => {
                    reqMock.query.shortList = ['AB111111', 'AB111112'];
                    const expectedShortList = ['AB111111', 'AB111112'];

                    await getResultsProxy()(reqMock, resMock);
                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.shortList.prisonNumbers).to.be.eql(expectedShortList);

                });

                it('should pass the href of the comparison page', async () => {
                    reqMock.query.shortList = ['AB111111', 'AB111112'];
                    await getResultsProxy()(reqMock, resMock);

                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.shortList.href).to.be.eql('/comparison/AB111111,AB111112');
                });

                it('should attach shortlist information to results', async () => {
                    reqMock.query.shortList = ['AB111111', 'AB111112'];

                    const receivedData = [
                        {prisonNumber: 'AB111111', forename: 'Matt'},
                        {prisonNumber: 'AB111112', forename: 'Alistair'},
                        {prisonNumber: 'AB111113', forename: 'Zed'},
                    ];

                    getSearchResultsStub = sinon.stub().resolves(receivedData);
                    await getResultsProxy()(reqMock, resMock);

                    const expectedData = [
                        {forename: 'Matt', prisonNumber: 'AB111111', shortListed: true, visited: false},
                        {forename: 'Alistair', prisonNumber: 'AB111112', shortListed: true, visited: false},
                        {forename: 'Zed', prisonNumber: 'AB111113', shortListed: false, visited: false}
                    ];

                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.data).to.be.eql(expectedData);
                });
            });

            context('When filters are in the query', () => {

                it('should make sure no filters in userinput if none in query string', async () => {
                    reqMock.session.userInput.gender = ['F'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                    };

                    await getResultsProxy()(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should add the filters to the user input in an array', async () => {
                    reqMock.query.filters = 'Female';

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        gender: ['F']
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should be able to handle multiple genders', async () => {
                    reqMock.query.filters = ['Female', 'Male'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        gender: ['F', 'M']
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should be able to handle HDC', async () => {
                    reqMock.query.filters = ['HDC'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        hasHDC: [true]
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should be able to handle Lifer', async () => {
                    reqMock.query.filters = ['Lifer'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        isLifer: [true]
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should replace the filters to the user input', async () => {
                    reqMock.query.filters = 'Male';
                    reqMock.session.userInput.gender = ['F'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        gender: ['M']
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should remove any gender that is not in query', async () => {
                    reqMock.query.filters = 'Female';
                    reqMock.session.userInput.gender = ['F', 'M'];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        gender: ['F']
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should remove any other filter that is not in query', async () => {
                    reqMock.query.filters = 'HDC';
                    reqMock.session.userInput.gender = ['F'];
                    reqMock.session.userInput.hasHDC = [true];

                    const expectedUserInput = {
                        forename: 'Matthew',
                        surname: 'Whitfield',
                        page: 1,
                        hasHDC: [true]
                    };

                    await getResultsProxy(getSearchResultsCountStub, getSearchResultsStub)(reqMock, resMock);
                    expect(reqMock.session.userInput).to.eql(expectedUserInput);
                });

                it('should send appropriate data to view', async () => {
                    reqMock.query.filters = ['Female', 'HDC'];
                    await getResultsProxy()(reqMock, resMock);

                    const expectedFilters = {Female: true, HDC: true};

                    const payload = resMock.render.getCalls()[0].args[1];
                    expect(payload.filtersForView).to.eql(expectedFilters);
                });
            });
        });

        describe('postPagination', () => {
            it('should redirect to appropriate page', () => {
                reqMock = {
                    body: {
                        pageNumber: '8'
                    }
                };
                postPagination(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?page=8');

            });

            it('should not alter the rest of the query string', () => {
                reqMock = {
                    body: {
                        pageNumber: '8'
                    },
                    query: {
                        filters: 'HDC'
                    }
                };
                postPagination(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?filters=HDC&page=8');
            });
        });

        describe('postFilters', () => {
            it('should redirect to first results page appending the filter', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        filter: 'Male'
                    },
                    get: (item) => 'http://something.com/search/results'
                };
                postFilters(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?filters=Male&page=1');

            });

            it('should remove the filter if it was already on referrer', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        filter: 'Male'
                    },
                    get: (item) => 'http://something.com/search/results?filters=Male'
                };
                postFilters(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?page=1');
            });

            it('should be able to add more than one filter', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        filter: 'Female'
                    },
                    get: (item) => 'http://something.com/search/results?filters=Male'
                };
                postFilters(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?filters=Male&filters=Female&page=1');
            });
        });

        describe('postAddToShortlist', () => {
            it('should redirect to first same page appending the short list ', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        addToShortListName: 'Matthew Whitfield',
                        addToShortList: 'Male'
                    },
                    get: (item) => 'http://something.com/search/results'
                };
                postAddToShortlist(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?shortList=Male&shortListName=Matthew%20Whitfield');

            });

            it('should remove the filter if it was already on referrer', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        addToShortList: 'Male'
                    },
                    get: (item) => 'http://something.com/search/results?shortList=Male'
                };
                postAddToShortlist(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results');
            });

            it('should be able to add more than one filter', () => {
                reqMock = {
                    body: {
                        pageNumber: '8',
                        addToShortList: 'Female'
                    },
                    get: (item) => 'http://something.com/search/results?shortList=Male'
                };
                postAddToShortlist(reqMock, resMock);
                expect(resMock.redirect).to.have.callCount(1);
                expect(resMock.redirect).to.have.been.calledWith('/search/results?shortList=Male&shortList=Female');
            });
        });
    });
});
