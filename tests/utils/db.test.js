/* eslint-disable import/no-named-as-default */
import dbClient from '../../utils/db';

// Checks if the DB client is alive
describe('+ DBClient utility', () => {
  before(function (done) {
    this.timeout(10000);
    Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
      .then(([usersCollection, filesCollection]) => {
        Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})])
          .then(() => done())
          .catch((deleteErr) => done(deleteErr));
      }).catch((connectErr) => done(connectErr));
  });

  // Checks if the DB client is alive
  it('+ Client is alive', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  // Returns the number of users in the database
  it('+ nbUsers returns the correct value', async () => {
    expect(await dbClient.nbUsers()).to.equal(0);
  });

  // Returns the number of files in the database
  it('+ nbFiles returns the correct value', async () => {
    expect(await dbClient.nbFiles()).to.equal(0);
  });
});
