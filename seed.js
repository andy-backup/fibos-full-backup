const fibos = require('chain');
console.notice("start FIBOS producer node");

var config = require('./config');

const httpPort =  8870;
const p2pPort = 9870;
let producername = config.producername;
let public_key = config.public_key;
let private_key = config.private_key;
fibos.pubkey_prefix = "FO";
fibos.config_dir = config.config_dir;
fibos.data_dir = config.data_dir;

let chain_config = {
	"contracts-console": true,
	'chain-state-db-size-mb': 8 * 1024,
	// "delete-all-blocks": true
};

const snapshotPath = config.snapshot_path;
if(snapshotPath){
	chain_config['snapshot'] = snapshotPath;
} else {
	chain_config['genesis-json'] = config.genesis_path;
}

console.notice("config_dir:", fibos.config_dir);
console.notice("data_dir:", fibos.data_dir);

fibos.load("http", {
	"http-server-address": `0.0.0.0:${httpPort}`,
	"access-control-allow-origin": "*",
	"http-validate-host": false,
	"verbose-http-errors": true
});

fibos.load("net", {
	"max-clients": 100,
	"p2p-max-nodes-per-host": 15,
	"p2p-peer-address": config.p2p_peer_address,
	"p2p-listen-endpoint": `0.0.0.0:${p2pPort}`,
	"agent-name": "FIBOS Bp"
});

let producer_config = {
	'max-transaction-time': 3000,
	'snapshots-dir': 'snapshots'
}

let cross_config = {}

if (producername && public_key && private_key) {
	producer_config['producer-name'] = producername;
	producer_config['enable-stale-production'] = false;
	producer_config['signature-provider'] = `${public_key}=KEY:${private_key}`;
	cross_config['signature-producer'] = producername;
	cross_config['signature-private-key'] = private_key;
}

if(producer_config){
    fibos.load("producer", producer_config);
	fibos.load("producer_api");
}

// snapshot(chain_config);
fibos.load("chain", chain_config);
fibos.load("chain_api");

if(config.USE_WALLET === 'true'){
	fibos.load("wallet");
	fibos.load("wallet_api");
}

fibos.load("cross", cross_config);
fibos.on("close", (code) => {
    process.exit(code);
});

fibos.start();