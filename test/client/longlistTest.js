require('jsdom-global/register');
const chai = require('chai');
const $ = require('jquery');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const initialPage = '<html>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>' +
    '<div class="listItem"></div>'+
    '</html>';


describe('Client side long list splitting', () => {

    before(() => {
        document.body.innerHTML = initialPage;
        require('../../assets/javascripts/moreless/longlist');
    });

    it('should initially hide all but first and last 3', () => {
        $.each($('.listItem'), (key, value) => {
            if(key < 2 || key > 4) {
                expect($(value).hasClass('js-hidden')).to.equal(false);
            } else if(key === 3 || key === 4) {
                expect($(value).hasClass('js-hidden')).to.equal(true);
            }
        });
    });

    it('should place a button in place of middle values', () => {
        expect($('#showFullList').length).to.eql(1);
    });

    it('should remove ... button when it is clicked', () => {
        $('#showFullList').click();
        expect($('#showFullList').length).to.eql(0);
    });

    it('should show the full list when it is clicked', () => {
        $.each($('.listItem'), (key, value) => {
            expect($(value).hasClass('js-hidden')).to.equal(false);
        });
    });

});
