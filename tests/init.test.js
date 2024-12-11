// This function imports the supertest library for making HTTP requests,
// the chai library for assertion, and the server module.

import supertest from 'supertest';
import chai from 'chai';
import api from '../server';

// The following global variables are assigned values for easy access
// throughout the test suite:
// - app: the server module
// - request: supertest instance for making HTTP requests to the server
// - expect: chai's expect function for assertion
// - assert: chai's assert function for assertion

global.app = api;
global.request = supertest(api);
global.expect = chai.expect;
global.assert = chai.assert;
