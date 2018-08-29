'use strict';

// Usage: $ node ./docs/Examples/connect-local-nodes.js

const bcoin = require('../..').set('regtest');
const NetAddress = bcoin.net.NetAddress;
const Network = bcoin.Network;
const pEvent = require('p-event'); // tool to await for events

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const regtest = Network.get().toString();

// create nodes
const spvNode = new bcoin.SPVNode({
  network: regtest,
  httpPort: 48449, // avoid clash of ports

  // write log file and chain data to specific directory
  prefix: '~/connect-test/SPV',
  memory: false,
  logFile: true,
  logConsole: false,
  logLevel: 'spam',

  // reduce log spam on SPV node (won't warn on Full node)
  maxOutbound: 1,
});

const fullNode = new bcoin.FullNode({
  network: regtest,
  port: 48445,
  bip37: true, // accept SPV nodes
  listen: true,

  // write log file and chain data to specific directory
  prefix: '~/connect-test/FULL',
  memory: false,
  logFile: true,
  logConsole: false,
  logLevel: 'spam'
});
// nodes created!


(async () => {
  // creates directory at `prefix`
  await spvNode.ensure();
  await fullNode.ensure();

  // start nodes
  await spvNode.open();
  await fullNode.open();

  await spvNode.connect();
  await fullNode.connect();
  // nodes started!

  // give spvNode some time to figure
  // out that its peer list is empty
  await delay(800);

  // no peers for the spvNode yet :(
  console.log('spvNode\'s peers before connection:', spvNode.pool.peers.head());

  // get peer from known address
  const addr = new NetAddress({
    host: '127.0.0.1',
    port: fullNode.pool.options.port
  });

  // connect spvNode with fullNode
  const peer = spvNode.pool.createOutbound(addr);
  spvNode.pool.peers.add(peer);

  // await to establish connection
  await pEvent(spvNode.pool, 'peer connect');
  // nodes are now connected!

  console.log('spvNode\'s peers after connection:', spvNode.pool.peers.head());

  // closing nodes
  await fullNode.disconnect();
  await spvNode.disconnect();

  await fullNode.close();
  await spvNode.close();
  // nodes closed
})();
