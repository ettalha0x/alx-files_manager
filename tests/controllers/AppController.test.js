/* eslint-disable import/no-named-as-default */

// Import the database client module
import dbClient from '../../utils/db';

// Test suite for the AppController
describe('+ AppController', () => {
  // Set up the test environment before running the tests
  before(function (done) {
    // Increase the timeout for this test
    this.timeout(10000);

    // Clear the users and files collections in the database
    Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
      .then(([usersCollection, filesCollection]) => {
        Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})])
          .then(() => done())
          .catch((deleteErr) => done(deleteErr));
      }).catch((connectErr) => done(connectErr));
  });

  // Test suite for the GET /status endpoint
  describe('+ GET: /status', () => {
    // Test case for checking if the services are online
    it('+ Services are online', function (done) {
      // Send a GET request to the /status endpoint
      request.get('/status')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          // Check if the response body matches the expected result
          expect(res.body).to.deep.eql({ redis: true, db: true });
          done();
        });
    });
  });

  // Test suite for the GET /stats endpoint
  describe('+ GET: /stats', () => {
    // Test case for checking the correct statistics about db collections
    it('+ Correct statistics about db collections', function (done) {
      // Send a GET request to the /stats endpoint
      request.get('/stats')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          // Check if the response body matches the expected result
          expect(res.body).to.deep.eql({ users: 0, files: 0 });
          done();
        });
    });

    // Test case for checking the correct statistics about db collections with data
    it('+ Correct statistics about db collections [alt]', function (done) {
      // Increase the timeout for this test
      this.timeout(10000);

      // Insert test data into the users and files collections
      Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
        .then(([usersCollection, filesCollection]) => {
          Promise.all([
            usersCollection.insertMany([{ email: 'john@mail.com' }]),
            filesCollection.insertMany([
              { name: 'foo.txt', type: 'file'},
              {name: 'pic.png', type: 'image' },
            ])
          ])
            .then(() => {
              // Send a GET request to the /stats endpoint
              request.get('/stats')
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }
                  // Check if the response body matches the expected result
                  expect(res.body).to.deep.eql({ users: 1, files: 2 });
                  done();
                });
            })
            .catch((deleteErr) => done(deleteErr));
        }).catch((connectErr) => done(connectErr));
    });
  });
});
