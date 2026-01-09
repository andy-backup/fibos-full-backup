const config = require('./config');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let p;

if (!fs.existsSync(config.backup_dir)) {
	fs.mkdirSync(config.backup_dir, { recursive: true });
	console.log('Created backup directory:', config.backup_dir);
}

function runSeed() {
	p = spawn('fibos seed.js', { shell: true });
}

async function uploadToS3(filePath) {
	return new Promise((resolve, reject) => {
		const fileName = path.basename(filePath);
		const bucketName = process.env.STORAGE_S3_BUCKET;
		console.log(`Uploading ${fileName} to S3 bucket: ${bucketName}...`);
		
		const uploadProcess = spawn('bash', ['./9-upload.sh', filePath, bucketName]);

		uploadProcess.stdout.on('data', (data) => {
			console.log(`S3 Upload: ${data}`);
		});

		uploadProcess.stderr.on('data', (data) => {
			console.error(`S3 Upload Error: ${data}`);
		});

		uploadProcess.on('close', (code) => {
			if (code === 0) {
				console.log(`Successfully uploaded ${fileName} to S3`);
				resolve();
			} else {
				console.error(`Upload failed with exit code ${code}`);
				reject(new Error(`Upload failed with exit code ${code}`));
			}
		});
	});
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
	console.log('Starting sync, waiting 10s...');
	await new Promise(resolve => setTimeout(resolve, 10 * 1000));
	const rep = await fetch("http://127.0.0.1:8870/v1/chain/get_info", {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({})
	});
	const { head_block_id, head_block_num, head_block_time } = await rep.json();

	console.log('Current block info:', `${head_block_time}-${head_block_num}-${head_block_id}`);

	await endSeed();
	
	const tarFileName = `${head_block_time}-${head_block_num}-${head_block_id}.tar.gz`;
	const tarFilePath = path.join(config.backup_dir, tarFileName);
	console.log('Creating backup archive...', tarFilePath, config.data_dir);
	
	// Create tar archive
	await new Promise((resolve, reject) => {
		const tarProcess = spawn('tar', ['-zcvf', tarFilePath, config.data_dir]);
		
		tarProcess.on('close', (code) => {
			if (code === 0) {
				console.log('Compression completed');
				resolve();
			} else {
				console.error('Compression failed with exit code:', code);
				reject(new Error(`Compression failed with exit code ${code}`));
			}
		});
	});

	// Extract tar file to current directory
	await new Promise((resolve, reject) => {
		const extractProcess = spawn('tar', ['-xzf', tarFilePath, '-C', '.']);
		
		extractProcess.on('close', (code) => {
			if (code === 0) {
				console.log('Extraction completed');
				resolve();
			} else {
				console.error('Extraction failed with exit code:', code);
				reject(new Error(`Extraction failed with exit code ${code}`));
			}
		});
	});

	// Upload to S3
	try {
		await uploadToS3(tarFilePath);
	} catch (error) {
		console.error('S3 upload error:', error.message);
	}
	runSeed();

	console.log('Restarting sync in 30s...');
	await new Promise(resolve => setTimeout(resolve, 30 * 1000));
	await syncData();
}