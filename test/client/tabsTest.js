require('jsdom-global/register');
const chai = require('chai');
const $ = require('jquery');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const {init} = require('../../assets/javascripts/tabs/tabs');

const initialPage = '<html>' +
    '<div id="holder">' +
    '<ul>' +
    '<li class="active">' +
    '<a id="tab1" class="searchTab" data-tab="panel1">Tab 1</a>' +
    '</li>' +
    '<li>' +
    '<a id="tab2" class="searchTab" data-tab="panel2">Tab 2</a>' +
    '</li>' +
    '</ul>' +
    '<div id="panel1" class="tabPanel initiallyHidden" data-panel="panel1"></div>' +
    '<div id="panel2" class="tabPanel" data-panel="panel2"></div>' +
    '</div>' +
    '</html>';

describe('Client side tabs', () => {
    beforeEach(() => {
        document.body.innerHTML = initialPage;
        init('#holder');
    });

    it('should replace initiallyHidden with js-hidden', () => {
        expect($('#panel1').hasClass('initiallyHidden')).to.eql(false);
        expect($('#panel1').hasClass('js-hidden')).to.eql(true);
    });

    it('should add class of active to selected tab', () => {

        $('#tab2').click();
        expect($('#tab1').parent().hasClass('active')).to.eql(false);
        expect($('#tab2').parent().hasClass('active')).to.eql(true);
    });

    it('should add and remove js-hidden to panels', () => {

        $('#tab2').click();
        expect($('#panel1').hasClass('js-hidden')).to.eql(true);
        expect($('#panel2').hasClass('js-hidden')).to.eql(false);
    });
});
