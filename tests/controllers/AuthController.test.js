/* eslint-disable import/no-named-as-default */

// Import the database client
import dbClient from '../../utils/db';

// Describe the AuthController
describe('+ AuthController', () => {
  // Define a mock user
  const mockUser = {
    email: 'test@beast.com',
    password: 'tesetsdafdsfasdf',
  };

  // Initialize an empty token variable
  let token = '';

  // Before running the tests, perform setup tasks
  before(function (done) {
    // Set a timeout of 10 seconds for the setup tasks
    this.timeout(10000);

    // Access the users collection in the database
    dbClient.usersCollection()
      .then((usersCollection) => {
        // Delete any existing user with the same email
        usersCollection.deleteMany({ email: mockUser.email })
          .then(() => {
            // Create a new user using a POST request
            request.post('/users')
              .send({
                email: mockUser.email,
                password: mockUser.password,
              })
              .expect(201)
              .end((requestErr, res) => {
                if (requestErr) {
                  return done(requestErr);
                }
                // Verify the response body
                expect(res.body.email).to.eql(mockUser.email);
                expect(res.body.id.length).to.be.greaterThan(0);
                done();
              });
          })
          .catch((deleteErr) => done(deleteErr));
      }).catch((connectErr) => done(connectErr));
  });

  // Test suite for the GET /connect endpoint
  describe('+ GET: /connect', () => {
    // Test case: Fails with no "Authorization" header field
    it('+ Fails with no "Authorization" header field', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Fails for a non-existent user
    it('+ Fails for a non-existent user', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth('foo@bar.com', 'raboof', { type: 'basic' })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Fails with a valid email and wrong password
    it('+ Fails with a valid email and wrong password', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth(mockUser.email, 'raboof', { type: 'basic' })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Fails with an invalid email and valid password
    it('+ Fails with an invalid email and valid password', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth('zoro@strawhat.com', mockUser.password, { type: 'basic' })
        .expect(401)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Succeeds for an existing user
    it('+ Succeeds for an existing user', function (done) {
      this.timeout(5000);
      request.get('/connect')
        .auth(mockUser.email, mockUser.password, { type: 'basic' })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body.token).to.exist;
          expect(res.body.token.length).to.be.greaterThan(0);
          token = res.body.token;
          done();
        });
    });
  });

  // Test suite for the GET /disconnect endpoint
  describe('+ GET: /disconnect', () => {
    // Test case: Fails with no "X-Token" header field
    it('+ Fails with no "X-Token" header field', function (done) {
      this.timeout(5000);
      request.get('/disconnect')
        .expect(401)
        .end((requestErr, res) => {
          if (requestErr) {
            return done(requestErr);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Fails for a non-existent user
    it('+ Fails for a non-existent user', function (done) {
      this.timeout(5000);
      request.get('/disconnect')
        .set('X-Token', 'raboof')
        .expect(401)
        .end((requestErr, res) => {
          if (requestErr) {
            return done(requestErr);
          }
          expect(res.body).to.deep.eql({ error: 'Unauthorized' });
          done();
        });
    });

    // Test case: Succeeds with a valid "X-Token" field
    it('+ Succeeds with a valid "X-Token" field', function (done) {
      request.get('/disconnect')
        .set('X-Token', token)
        .expect(204)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({});
          expect(res.text).to.eql('');
          expect(res.headers['content-type']).to.not.exist;
          expect(res.headers['content-length']).to.not.exist;
          done();
        });
    });
  });
});
