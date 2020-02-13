/**
 * @name pdf
 *
 * @desc Renders a PDF of the Puppeteer API spec. This is a pretty long page and will generate a nice, A4 size multi-page PDF.
 *
 * @see {@link https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pdf}
 */

const commandLineArgs = require('command-line-args')
const mkdirp = require('mkdirp');
const yesno = require('yesno');
const puppeteer = require('puppeteer');
const path = require('path');


DEFAULT_OUT = './out'
DEFAULT_TIMEOUT = 3 * 60 * 1000
const optionDefinitions = [
	{ name: 'verbose', alias: 'v', type: Boolean, multiple: true, defaultValue: [] },
	{ name: 'silent', alias: 's', type: Boolean, multiple: true, defaultValue: [] },
	{ name: 'mute', alias: 'm', type: Boolean, multiple: false, defaultValue: false },
	{ name: 'urls', type: String, alias: 'u', multiple: true, defaultOption: true, defaultValue: [] },
	{ name: 'out', type: String, alias: 'o', defaultValue: DEFAULT_OUT },
	{ name: 'timeout', alias: 't', type: Number, defaultValue: DEFAULT_TIMEOUT },
	{ name: 'autoAccept', alias: 'y', type: Boolean, defaultValue: false }

]
var options = commandLineArgs(optionDefinitions)
options['out'] = options['out'] || DEFAULT_OUT
options['out'] = path.resolve(options['out'])
options['verbose'] = options['silent'].length >= 1 ? [] : options['verbose']
options['timeout'] = options['timeout'] || DEFAULT_TIMEOUT
var printLevel = options.mute ? -Infinity : options.verbose.length - options.silent.length
log = (...args) => { if (printLevel >= 0) { console.log(...args) } }
info = (...args) => { if (printLevel >= 1) { console.info(...args) } }
debug = (...args) => { if (printLevel >= 2) { console.debug(...args) } }
error = (...args) => { if (printLevel >= -3) { console.error(...args) } }
warn = (...args) => { if (printLevel >= -2) { console.warn(...args) } }
async function verify() {
	log(options['urls'].length, "Urls")
	log("Timeout is set to:", options['timeout'])
	log("Output is set to:", options['out'])

	if (!options['autoAccept']) {
		const ok = await yesno({
			question: 'Do you wish to crawl?'
		});
		return ok
	}
	else return true
}

async function init() {
	mkdirp.sync(options['out'])
	browser = await puppeteer.launch({ 'headless': true })
}
async function teardown() {
	log("Exiting.")
	try {
		await browser.close()
	}
	catch{
		process.exit()
	}
}
function generateNameFromUrl(url) {
	// Replace disallowed chareacters with UNDERSCORE
	uniqueName = url.replace("://", "_")
		.replace(/\./g, "_")
		.replace(/\//g, "_")
		.replace(/\?/g, "_")
		.replace(/\*/g, "_")
		.replace(/\"/g, "_")
		.replace(/\</g, "_")
		.replace(/\>/g, "_")
		.replace(/\|/g, "_")
	return uniqueName;
}
async function main() {
	try {
		const page = await browser.newPage()
		var resultStatus = {}
		for (url of options['urls']) {
			resultStatus[url] = await UrlAsPdf(page, url, options['out'])
		}
	}
	finally {
		entries = Object.entries(resultStatus);
		failed = entries.map(x => { if (!x[1]) return x[0]; }).filter(x => x)
		log("Successes:" + (entries.length - failed.length) + "/" + entries.length)
		if (failed.length > 0) {
			warn("Failed:\n", ...failed)
		}
		else log("Yay! everything completed without any failure")
	}
}
async function UrlAsPdf(page, url, outdir) {
	let name = generateNameFromUrl(url)
	save_path = path.resolve(outdir, name)
	try {
		info("Crawling:", url)
		await page.goto(url, { waitUntil: "networkidle0", timeout: options['timeout'] })
		await page.emulateMedia('screen');
		await page.pdf({ path: save_path + '.pdf', format: 'A4', printBackground: true, })
		return true
	}
	catch (err) {
		error("Url Failed:", url, "\n", "Reason:", err.message)
		return false
	}
}
//runner
(async () => {
	var browser;
	debug("options:", options)
	if (await verify()) {
		await init()
		await main()
	}
	await teardown()
})()