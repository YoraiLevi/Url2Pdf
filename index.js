/* eslint-disable max-len */
/**
 * @name pdf
 *
 * @desc Renders a PDF of the Puppeteer API spec. This is a pretty long page and will generate a nice, A4 size multi-page PDF.
 *
 * @see {@link https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pdf}
 */

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const mkdirp = require('mkdirp');
const yesno = require('yesno');
const puppeteer = require('puppeteer');
const path = require('path');

// Constants
DEFAULT_OUT = './out';
DEFAULT_TIMEOUT = 3 * 60 * 1000;

// Config setup
const optionDefinitions = [
  {name: 'help', alias: 'h', type: Boolean, defaultValue: false, description: 'Shows this message'},
  {name: 'verbose', alias: 'v', type: Boolean, multiple: true, defaultValue: [], description: 'Adds verbosity level'},
  {name: 'silent', alias: 's', type: Boolean, multiple: true, defaultValue: [], description: 'Removes verbosity level'},
  {name: 'mute', alias: 'm', type: Boolean, multiple: false, defaultValue: false, description: 'Mutes all info'},
  {name: 'urls', type: String, alias: 'u', multiple: true, defaultOption: true, defaultValue: [], description: 'Urls to crawl into pdfs'},
  {name: 'out', type: String, alias: 'o', defaultValue: DEFAULT_OUT, description: 'Output directory path'},
  {name: 'timeout', alias: 't', type: Number, defaultValue: DEFAULT_TIMEOUT, description: 'Timeout for crawling.'},
  {name: 'autoAccept', alias: 'y', type: Boolean, defaultValue: false, description: 'Auto accepts all prompts'},
];
const banner =
`                                                             
888     888         888  .d8888b.  8888888b.      888  .d888 
888     888         888 d88P  Y88b 888   Y88b     888 d88P"  
888     888         888        888 888    888     888 888    
888     888 888d888 888      .d88P 888   d88P .d88888 888888 
888     888 888P"   888  .od888P"  8888888P" d88" 888 888    
888     888 888     888 d88P"      888       888  888 888    
Y88b. .d88P 888     888 888"       888       Y88b 888 888    
 "Y88888P"  888     888 888888888  888        "Y88888 888    `;
const sections = [
  {
    header: banner,
    content: 'Render web-pages to pdf',
    raw: true,
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
];
const options = commandLineArgs(optionDefinitions);
const usage = commandLineUsage(sections);
if (options.help||options.urls.length==0) {
  console.log(usage);
  process.exit();
}
options['out'] = options['out'] || DEFAULT_OUT;
options['out'] = path.resolve(options['out']);
options['verbose'] = options['silent'].length >= 1 ? [] : options['verbose'];
options['timeout'] = options['timeout'] || DEFAULT_TIMEOUT;
const printLevel = options.mute ? -Infinity : options.verbose.length - options.silent.length;
const log = (...args) => {
  if (printLevel >= 0) {
    console.log(...args);
  }
};
// Logging setup
const info = (...args) => {
  if (printLevel >= 1) {
    console.info(...args);
  }
};
const debug = (...args) => {
  if (printLevel >= 2) {
    console.debug(...args);
  }
};
const error = (...args) => {
  if (printLevel >= -3) {
    console.error(...args);
  }
};
const warn = (...args) => {
  if (printLevel >= -2) {
    console.warn(...args);
  }
};

// Global browser
let browser;

/**
 * Verify with the user if everything is well.
 * @return {boolean} is everything setup correctly?
 */
async function verify() {
  log(options['urls'].length, 'Urls');
  log('Timeout is set to:', options['timeout']);
  log('Output is set to:', options['out']);

  if (!options['autoAccept']) {
    const ok = await yesno({
      question: 'Do you wish to crawl?',
    });
    return ok;
  } else return true;
}
/**
 * Initializes components.
 * @return {void}
 */
async function init() {
  mkdirp.sync(options['out']);
  browser = await puppeteer.launch({'headless': true});
}
/**
 * Tears down components.
 * @return {void}
 */
async function teardown() {
  log('Exiting.');
  try {
    await browser.close();
  } finally {
    process.exit();
  }
}
/**
 * Replace disallowed chareacters with UNDERSCORE.
 * @param {string} url
 * @return {string} valid file name
 */
function generateNameFromUrl(url) {
  uniqueName = url.replace('://', '_')
      .replace(/\./g, '_')
      .replace(/\//g, '_')
      .replace(/\?/g, '_')
      .replace(/\*/g, '_')
      .replace(/\"/g, '_')
      .replace(/\</g, '_')
      .replace(/\>/g, '_')
      .replace(/\|/g, '_');
  return uniqueName;
}
/**
 * Main.
 * @return {void}
 */
async function main() {
  const resultStatus = {};
  try {
    const page = await browser.newPage();
    for (url of options['urls']) {
      resultStatus[url] = await urlAsPdf(page, url, options['out']);
    }
  } finally {
    entries = Object.entries(resultStatus);
    failed = entries.map((x) => {
      if (!x[1]) return x[0];
    }).filter((x) => x);
    log('Successes:' + (entries.length - failed.length) + '/' + entries.length);
    if (failed.length > 0) {
      warn('Failed:\n', ...failed);
    } else log('Yay! everything completed without any failure');
  }
}
/**
 * Crawls a url and saves it as pdf in specified directory
 * @param {*} page puppeteer's Page
 * @param {*} url to crawl
 * @param {*} outdir
 */
async function urlAsPdf(page, url, outdir) {
  const name = generateNameFromUrl(url);
  const savePath = path.resolve(outdir, name);
  try {
    info('Crawling:', url);
    await page.goto(url, {waitUntil: 'networkidle0', timeout: options['timeout']});
    await page.emulateMedia('screen');
    await page.pdf({path: savePath + '.pdf', format: 'A4', printBackground: true});
    return true;
  } catch (err) {
    error('Url Failed:', url, '\n', 'Reason:', err.message);
    return false;
  }
}
// runner
(async () => {
  debug('options:', options);
  if (await verify()) {
    await init();
    await main();
  }
  await teardown();
})();
