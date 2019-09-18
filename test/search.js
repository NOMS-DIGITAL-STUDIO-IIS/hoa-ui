process.env.NODE_ENV = 'test';

const proxyquire = require('proxyquire');
proxyquire.noCallThru();

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

const standardResponse = [{
    prisonNumber: {value: 'AB111122'},
    receptionDate: {value: '1999-01-12'},
    lastName: {value: 'SURNAME L'},
    firstName: {value: 'FIRST L'},
    middleName: {value: 'MIDDLE L'},
    dob: {value: '1980-01-12'},
    isAlias: {value: false},
    aliasLast: {value: 'SURNAME L'},
    aliasFirst: {value: 'FIRST L'},
    aliasMiddle: {value: 'MIDDLE L'}
}];

describe('Search', () => {
    let getCollectionStub, getTupleStub, inmateProxy;

    beforeEach(() => {
        getCollectionStub = sinon.stub().callsArgWith(2, standardResponse);
        getTupleStub = sinon.stub().returns(null);

        inmateProxy = (getCollection = getCollectionStub, getTuple = getTupleStub) => {
            return proxyquire('../data/search', {
                './dataAccess/iisData': {
                    getCollection: getCollection,
                    getTuple: getTuple
                }
            }).getSearchResults;
        };
    });

    afterEach(() => {
        sinon.reset();
    });

    describe('inmate', () => {
        it('should call db.getCollection', async () => {
            await inmateProxy()({prisonNumber: 7});

            expect(getCollectionStub).to.have.callCount(1);
        });

        it('should return recordset as an array', async () => {
            const data = await inmateProxy()({prisonNumber: 7});

            expect(data).to.be.an('array');
        });

        it('should correctly format the result', async () => {
            const data = await inmateProxy()({prisonNumber: 7});
            const expectedResult = [
                {
                    "aliasMiddle": "MIDDLE L",
                    "aliasFirst": "FIRST L",
                    "aliasLast": "SURNAME L",
                    "dob": "1980-01-12",
                    "prisonNumber": "AB111122",
                    "isAlias": false,
                    "firstName": "FIRST L",
                    "lastName": "SURNAME L",
                    "middleName": "MIDDLE L",
                    "receptionDate": "1999-01-12",
                }
            ];

            expect(data).to.eql(expectedResult);
        });
    });

    describe('WHERE statement', () => {
        it('should populate prison number if passed in', async () => {
            await inmateProxy()({prisonNumber: '12345678'});
            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE PRISON_NUMBER = @PRISON_NUMBER');
            expect(params[0].column).to.eql('PRISON_NUMBER');
            expect(params[0].value).to.eql('12345678');
        });

        it('should populate PNC number if passed in', async () => {
            await inmateProxy()({pncNumber: '7'});
            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain("WHERE PNC_NUMBER = @PNC_NUMBER");
            expect(params[0].column).to.eql('PNC_NUMBER');
            expect(params[0].value).to.eql('7');
        });

        it('should populate CRO number if passed in', async () => {
            await inmateProxy()({croNumber: '7'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain("WHERE CRO_NUMBER = @CRO_NUMBER");
            expect(params[0].column).to.eql('CRO_NUMBER');
            expect(params[0].value).to.eql('7');
        });

        it('should populate name if passed in', async () => {
            await inmateProxy()({forename: 'Dave'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE FORENAME_1 = @FORENAME_1');
            expect(params[0].column).to.eql('FORENAME_1');
            expect(params[0].value).to.eql('Dave');
        });

        it('should populate full name if passed in', async () => {
            await inmateProxy()({forename: 'Dave', forename2: 'James', surname: 'Jones'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE FORENAME_1 = @FORENAME_1 AND ' +
                'FORENAME_2 = @FORENAME_2 AND ' +
                'SURNAME = @SURNAME');

            expect(params[0].column).to.eql('FORENAME_1');
            expect(params[0].value).to.eql('Dave');

            expect(params[1].column).to.eql('FORENAME_2');
            expect(params[1].value).to.eql('James');

            expect(params[2].column).to.eql('SURNAME');
            expect(params[2].value).to.eql('Jones');
        });

        it('should use wildcard for full name if percentages used', async () => {
            await inmateProxy()({forename: 'Dave%', forename2: 'James%', surname: 'Jones%'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE FORENAME_1 LIKE @FORENAME_1 AND ' +
                'FORENAME_2 LIKE @FORENAME_2 AND ' +
                'SURNAME LIKE @SURNAME');

            expect(params[0].column).to.eql('FORENAME_1');
            expect(params[0].value).to.eql('Dave%');

            expect(params[1].column).to.eql('FORENAME_2');
            expect(params[1].value).to.eql('James%');

            expect(params[2].column).to.eql('SURNAME');
            expect(params[2].value).to.eql('Jones%');
        });

        it('should automatically use wildcard for first and middle name if initial used', async () => {
            await inmateProxy()({forename: 'D', forename2: 'J'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE FORENAME_1 LIKE @FORENAME_1 AND ' +
                'FORENAME_2 LIKE @FORENAME_2');

            expect(params[0].column).to.eql('FORENAME_1');
            expect(params[0].value).to.eql('D%');

            expect(params[1].column).to.eql('FORENAME_2');
            expect(params[1].value).to.eql('J%');
        });

        it('should not automatically use wildcard for first and middle name if more than initial used', async () => {
            await inmateProxy()({forename: 'Da', forename2: 'Ja'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE FORENAME_1 = @FORENAME_1 AND ' +
                'FORENAME_2 = @FORENAME_2');

            expect(params[0].column).to.eql('FORENAME_1');
            expect(params[0].value).to.eql('Da');

            expect(params[1].column).to.eql('FORENAME_2');
            expect(params[1].value).to.eql('Ja');
        });

        it('should populate dob if passed in', async () => {
            await inmateProxy()({dobOrAge: 'dob', dobDay: 'dd', dobMonth: 'mm', dobYear: 'yyyy'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE BIRTH_DATE = @BIRTH_DATE');
            expect(params[0].column).to.eql('BIRTH_DATE');
            expect(params[0].value).to.eql('yyyy-mm-dd');
        });

        it('should populate age if passed in', async () => {
            await inmateProxy()({dobOrAge: 'age', age: '44-45'});

            const sql = getCollectionStub.getCalls()[0].args[0];

            expect(sql).to.contain('BIRTH_DATE >= @from_date AND BIRTH_DATE <= @to_date');
        });

        it('should populate address if passed in', async () => {
            await inmateProxy()({address: '1 high street'});

            const sql = getCollectionStub.getCalls()[0].args[0];

            expect(sql).to.contain('CONTAINS(ADDRESS_TEXT');
            expect(sql).to.contain('NEAR((1, high, street)');
        });

        it('should combine where statements', async () => {
            await inmateProxy()({prisonNumber: '77777777', forename: 'Dave'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE PRISON_NUMBER = @PRISON_NUMBER AND ' +
                'FORENAME_1 = @FORENAME_1');
            expect(params[0].column).to.eql('PRISON_NUMBER');
            expect(params[0].value).to.eql('77777777');
            expect(params[1].column).to.eql('FORENAME_1');
            expect(params[1].value).to.eql('Dave');
        });

        it('should not use wildcard if no percentage on name', async () => {
            await inmateProxy()({prisonNumber: 77, forename: 'Dave'});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE PRISON_NUMBER = @PRISON_NUMBER AND ' +
                'FORENAME_1 = @FORENAME_1');
            expect(params[0].column).to.eql('PRISON_NUMBER');
            expect(params[0].value).to.eql(77);
            expect(params[1].column).to.eql('FORENAME_1');
            expect(params[1].value).to.eql('Dave');
        });

        it('should populate gender if passed in', async () => {
            await inmateProxy()({gender: ['M']});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE (SEX = @gender0)');
            expect(params[0].column).to.eql('gender0');
            expect(params[0].value).to.eql('M');
        });

        it('should be able to populate multiple genders', async () => {
            await inmateProxy()({gender: ['M', 'F']});

            const sql = getCollectionStub.getCalls()[0].args[0];
            const params = getCollectionStub.getCalls()[0].args[1];

            expect(sql).to.contain('WHERE (SEX = @gender0 OR SEX = @gender1)');
            expect(params[0].column).to.eql('gender0');
            expect(params[0].value).to.eql('M');
            expect(params[1].column).to.eql('gender1');
            expect(params[1].value).to.eql('F');
        });

        it('should populate hasHDC if passed in', async () => {
            await inmateProxy()({hasHDC: true});

            const sql = getCollectionStub.getCalls()[0].args[0];

            expect(sql).to.contain("HAS_HDC = 'TRUE'");
        });
    });

    it('should order the data by alias, surname, first initial, then date of first reception.', async () => {
        await inmateProxy()({prisonNumber: 7});

        const sql = getCollectionStub.getCalls()[0].args[0];

        expect(sql).to.contain('ORDER BY IS_ALIAS, PRIMARY_SURNAME, PRIMARY_INITIAL, BIRTH_DATE, RECEPTION_DATE DESC');
    });
});
