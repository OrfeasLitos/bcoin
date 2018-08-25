'use strict';

// Usage: $ node ./docs/Examples/connect-local-nodes.js

const bcoin = require('../..').set('regtest');
const NetAddress = bcoin.net.NetAddress;
const Network = bcoin.Network;
const assert = require('assert');

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const regtest = Network.get().toString();

// create nodes
const spvNode = new bcoin.SPVNode({
  network: regtest,
  httpPort: 48449 // avoid clash of ports
});

const fullNode = new bcoin.FullNode({
  network: regtest,
  port: 48445,
  bip37: true, // accept SPV peers
  listen: true
});
// nodes created!

// resolves only when the first successfully
// connected peer is the one in the input
async function waitToConnect(peer) {
  const promise = new Promise((resolve, reject) => {
    spvNode.pool.on('peer open', newPeer => {
      if (peer.hostname() === newPeer.hostname())
        resolve();
      else{
        reject();}
    });
  });
}

(async () => {
  // start nodes
  await spvNode.open();
  await fullNode.open();

  await spvNode.connect();
  await fullNode.connect();
  // nodes started!

  // give spvNode some time to figure
  // out that its peer list is empty
  await delay(800);

  // get peer from known address
  const addr = new NetAddress({
    host: '127.0.0.1',
    port: fullNode.pool.options.port
  });

  // no peers for the spvNode yet :(
  console.log('spvNode\'s peers before connection:', spvNode.pool.peers.head());
  assert.equal(spvNode.pool.peers.head(), null);

  // connect spvNode with fullNode
  const peer = spvNode.pool.createOutbound(addr);
  spvNode.pool.peers.add(peer);

  // wait for peer to connect
  try {
    await waitToConnect(peer);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  // nodes are now connected!
  console.log('spvNode\'s peers after connection:', spvNode.pool.peers.head());
  assert.equal(spvNode.pool.peers.head().inspect(),
    '<Peer: handshake=true host=127.0.0.1:48445 outbound=true ping=-1>');

  // closing nodes
  await fullNode.disconnect();
  await spvNode.disconnect();

  await fullNode.close();
  await spvNode.close();
  // nodes closed
  console.log('success!');
})();
