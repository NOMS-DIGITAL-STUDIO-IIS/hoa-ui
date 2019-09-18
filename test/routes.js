'use strict';
process.env.NODE_ENV = 'test';
let request = require('supertest');
let expect = require('chai').expect;
let app = require('../server/app');

const logInAs = function() {
    let browser = request.agent(app);

    return browser.post('/disclaimer')
        .expect(302)
        .send({disclaimer: 'disclaimer'})
        .then(function() {
            return browser;
        });
};

describe('routes', () => {
    describe('Test redirections when session set and not set', () => {
        it('should return status code 302, when session NOT set', async () => {
            await request(app).get('/search')
                .expect(302)
                .expect('Location', '/login')
        });

        it('should display error when disclaimer is not checked', done => {
            request(app).post('/disclaimer')
                .send({})
                .expect(400)
                .end((err, res) => {
                if (err) {
                    return done(err);
                }
                expect(res.text).to.contain('error-summary');
                return done();
                });
        });

        it('should NOT display error when disclaimer is checked', async () => {
            await request(app).post('/disclaimer')
                .send({ disclaimer: 'disclaimer'})
                .expect(302);
        });

        it('should return status code 200, when session IS set', async () => {
            const login = await logInAs();

            await login.get('/search')
                .expect(200);
        });

        it('should redirect to the search page when root is visited while the sessions are set', async () => {
            const login = await logInAs();

            await login.get('/')
                .expect(302)
                .expect('Location', '/search');
        });

        it('should redirect to search if non admin user tries to access admin', async () => {
            const login = await logInAs();

            await login.post('/admin')
                .expect(302)
                .expect('Location', '/search');
        });
    });
});
