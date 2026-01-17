import { build } from 'esbuild';

const isDev = process.argv.includes('development');
const isWatch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const watchPlugin = {
	name: 'watch',
	setup(build) {
		if (isWatch) {
			build.onStart(() => {
				console.log('Watching...');
			});

			build.onEnd((result) => {
				if (result.errors.length > 0) {
					console.log('Build failed with errors.');
					return;
				}
				console.log('Build finished.');
			});
		}
	},
};

build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	format: 'cjs',
	minify: !isDev,
	sourcemap: isDev,
	platform: 'node', // 添加这一行以支持Node.js内置模块
	external: ['obsidian'],
	logLevel: 'info',
	outfile: 'dist/main.js',
	plugins: [watchPlugin],
}).catch(() => process.exit(1));