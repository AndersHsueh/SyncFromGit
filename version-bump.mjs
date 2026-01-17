import fs from 'fs';
import path from 'path';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const manifestJsonPath = path.join(process.cwd(), 'manifest.json');
const versionsJsonPath = path.join(process.cwd(), 'versions.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
manifestJson.version = version;

const versionsJsonExists = fs.existsSync(versionsJsonPath);
let versionsJson = {};
if (versionsJsonExists) {
	versionsJson = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
}

versionsJson[version] = 'https://github.com/your-username/sync-from-git/releases/download/v' + version + '/main.js';

fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 2));
fs.writeFileSync(versionsJsonPath, JSON.stringify(versionsJson, null, 2));

console.log('Version updated to ' + version);