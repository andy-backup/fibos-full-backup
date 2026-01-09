const config = require('./config');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let childProcessP;

// 初始化备份目录
if (!fs.existsSync(config.backup_dir)) {
    fs.mkdirSync(config.backup_dir, { recursive: true });
    console.log('Created backup directory:', config.backup_dir);
}

/**
 * 启动 FIBOS 进程
 * 关键修改：使用 detached: true 开启新的进程组
 */
function runSeed() {
    console.log('Starting FIBOS seed...');
    // 使用 detached: true 配合 shell: true
    childProcessP = spawn('fibos seed.js', { 
        shell: true, 
        stdio: 'inherit',
        detached: true // 创建新进程组
    });

    // 进程销毁时防止父进程挂死
    childProcessP.unref(); 
    
    childProcessP.on('error', (err) => {
        console.error('Failed to start fibos:', err);
    });
}

/**
 * 停止 FIBOS 进程
 * 关键修改：通过杀掉进程组 ID (负 PID) 来确保杀掉所有子进程
 */
async function endSeed() {
    if (childProcessP && childProcessP.pid) {
        console.log(`Killing FIBOS process group ${childProcessP.pid}...`);
        try {
            // 在 Unix/Linux 下，-pid 表示向整个进程组发送信号
            process.kill(-childProcessP.pid, 'SIGTERM');
        } catch (e) {
            console.log('Process already gone or error:', e.message);
        }
        
        // 等待进程真正退出
        await new Promise((resolve) => {
            const timer = setTimeout(() => {
                console.log('Force killing group...');
                try { process.kill(-childProcessP.pid, 'SIGKILL'); } catch(e){}
                resolve();
            }, 5000); // 5秒不退就强杀

            childProcessP.on('exit', () => {
                clearTimeout(timer);
                resolve();
            });
        });
        childProcessP = null;
    }
    console.log('Wait 2s for file descriptors release...');
    await new Promise(resolve => setTimeout(resolve, 2000));
}

async function uploadToS3(filePath) {
    const fileName = path.basename(filePath);
    try {
        const { stdout } = await exec(`bash ./9-upload.sh "${filePath}"`);
        console.log(`Uploaded ${fileName}: ${stdout.trim()}`);
    } catch (err) {
        console.error(`S3 upload failed: ${err.message}`);
    }
}

async function startSyncLoop() {
    while (true) {
        try {
            runSeed();

            console.log('Syncing... wait 10s...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // 获取区块信息
            const response = await fetch("http://127.0.0.1:8870/v1/chain/get_info", {
                method: 'POST'
            });
            const info = await response.json();
            console.log('Current block:', info.head_block_num);

            // 停止 FIBOS
            await endSeed();

            // 压缩
            const tarFileName = `${info.head_block_time}-${info.head_block_num}.tar.gz`;
            const tarFilePath = path.join(config.backup_dir, tarFileName);
            console.log('Creating tar...');
            await exec(`tar -zcvf "${tarFilePath}" "${config.data_dir}"`);

            // 上传
            await uploadToS3(tarFilePath);

            console.log('Done. Rest 30s...');
            await new Promise(resolve => setTimeout(resolve, 30000));

        } catch (error) {
            console.error('Error in loop:', error.message);
            if (childProcessP) await endSeed();
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

startSyncLoop();