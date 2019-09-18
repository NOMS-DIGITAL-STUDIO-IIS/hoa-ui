require('jsdom-global/register');
const chai = require('chai');
const $ = require('jquery');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const initialPage = '<html>' +
    '<table id="filterTable">' +
    '<tbody>' +
    '<input type = "text" name = "filter"' +
    '<tr class = "filterableRow" data-id = "Matthew"><td class = "filterableItem">Matthew</td></tr>' +
    '<tr class = "filterableRow" data-id = "Matt"><td class = "filterableItem">Matt</td></tr>' +
    '<tr class = "filterableRow" data-id = "Ma"><td class = "filterableItem">Ma</td></tr>' +
    '<tr class = "filterableRow" data-id = "Alistair"><td class = "filterableItem">Alistair</td></tr>' +
    '<tr class = "filterableRow" data-id = "Zed"><td class = "filterableItem">Zed</td></tr>' +
    '</tbody>' +
    '</table>'+
    '</html>';

const isVisible = item => !item.attr('style') || item.attr('style') !== 'display: none;';

describe('moreless', item => {

    before(() => {
        document.body.innerHTML = initialPage;
        require('../../assets/javascripts/admin/tableFilter');
    });

    it('should initially have all items visible', () => {
        $.each($('.filterableRow'), (key, value) => {
            expect(isVisible($(value))).to.eql(true);
        });
    });

    it('should remove any not beginning with M when typed', () => {
        $(':input[name=filter]').val('M');
        $(':input[name=filter]').change();

        $.each($('.filterableRow'), (key, value) => {
            if (key < 3) {
                expect(isVisible($(value))).to.eql(true);
            } else {
                expect(isVisible($(value))).to.eql(false);
            }
        });

    });

    it('should not care about case', () => {
        $(':input[name=filter]').val('mA');
        $(':input[name=filter]').change();

        $.each($('.filterableRow'), (key, value) => {
            if (key < 3) {
                expect(isVisible($(value))).to.eql(true);
            } else {
                expect(isVisible($(value))).to.eql(false);
            }
        });
    });

    it('should remove any not entirely contained', () => {
        $(':input[name=filter]').val('Mat');
        $(':input[name=filter]').change();

        $.each($('.filterableRow'), (key, value) => {
            if (key < 2) {
                expect(isVisible($(value))).to.eql(true);
            } else {
                expect(isVisible($(value))).to.eql(false);
            }
        });
    });

});

