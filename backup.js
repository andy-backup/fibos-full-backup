const config = require('./config');
const { spawn } = require('child_process');

let p;

function runSeed() {
	p = spawn('fibos seed.js > log.log', { shell: true });
}

async function endSeed() {
	if (p) {
		console.log('kill fibos');
		p.kill(15);
	}
	console.log('sleep 1 s');
	await new Promise(resolve => setTimeout(resolve, 1000));
}


runSeed();
syncData();

async function syncData() {
	console.log("start now ,waiting 10 s")
	await new Promise(resolve => setTimeout(resolve, 10 * 1000));
	const rep = await fetch("http://127.0.0.1:8870/v1/chain/get_info", {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({})
	});
	const a = await rep.json();

	console.log("now head_block_num==> ",a.head_block_num);

	await endSeed();
	console.log("tar  =====>");
	spawn('tar', ['-zcvf', config.backup_dir + "/data_" + a.head_block_num + ".tar.gz", config.data_dir]);

	console.log("restart   sync");
	runSeed();

	console.log("waiting 30 s");
	await new Promise(resolve => setTimeout(resolve, 30 * 1000));
	await syncData()
}