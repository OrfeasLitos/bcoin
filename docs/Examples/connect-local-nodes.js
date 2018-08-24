'use strict';

// Usage: $ node ./docs/Examples/connect-local-nodes.js

const bcoin = require('../..').set('regtest');
const NetAddress = bcoin.net.NetAddress;
const Network = bcoin.Network;

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const regtest = Network.get().toString();
const spvNode = new bcoin.SPVNode({
  network: regtest,
  httpPort: 48449 // avoid clash of ports
});

const fullNode = new bcoin.FullNode({
  network: regtest,
  port: 48445,
  bip37: true, // accept SPV nodes
  listen: true
});

(async () => {
  await spvNode.open();
  await fullNode.open();

  await spvNode.connect();
  await fullNode.connect();

  const addr = new NetAddress({
    host: '127.0.0.1',
    port: fullNode.pool.options.port
  });
  const peer = spvNode.pool.createOutbound(addr);
  spvNode.pool.peers.add(peer);

  // allow some time to establish connection
  await delay(4000);

  await fullNode.disconnect();
  await spvNode.disconnect();

  await fullNode.close();
  await spvNode.close();

  console.log('success!');
})();
