"use strict";

const assert = require('chai').assert;
const Sequelize = require('sequelize');
const winston = require('winston');
const WinstonTransportSequelize = require('../winston-transport-sequelize');

let sequelize = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

let logger = new winston.Logger({
  transports: [
    new WinstonTransportSequelize({
      level: 'info',
      sequelize: sequelize
    })
  ]
});

let transport = logger.transports.sequelize;

describe('WinstonTransportSequelize:', function () {
  let message = 'message';
  let meta = { meta: 'meta' };

  before(function() {
    return sequelize.sync({ force: true });
  });

  function transportCallback(loggedFn, errorFn) {
    function onLogged() {
      transport.removeListener('logged',  onLogged);
      loggedFn && loggedFn();
    }

    function onError() {
      transport.removeListener('error', onError);
      errorFn && errorFn();
    }

    transport.on('logged', onLogged).on('error', onError);
  }

  it('#log()', function (done) {
    function onLogged() {
      transport.model.findOne({ where: { message: 'message' } }).then((res) => {
        res = res.get();
        assert.equal(res.level, 'info', 'different level');
        assert.equal(JSON.stringify(res.meta), JSON.stringify(res.meta), 'different meta objects');
        done();
      });
    }

    transportCallback(onLogged, () => { throw new Error('Error in the log function') });

    logger.info(message, meta);
  });

  it('#clear()', function () {
    return transport.clear(2).then(() => {
      return transport.model.count().then((count) => {
        assert.equal(count, 1);
      });
    }).then(() => {
      return transport.clear().then(() => {
        return transport.model.count().then((count) => {
          assert.equal(count, 0);
        });
      });
    });
  });
});
