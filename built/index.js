"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const fileType = require("file-type");
const util = require("util");
const commander = require("commander");
const moment = require("moment");
const os = require("os");
const chalk_1 = require("chalk");
const fsp = {
    readFile: util.promisify(fs.readFile),
    readdir: util.promisify(fs.readdir),
    stat: util.promisify(fs.stat),
    readlink: util.promisify(fs.readlink),
    access: util.promisify(fs.access)
};
async function ProcessElement(opts, dir, name, handler) {
    const fspath = path.join(dir, name);
    try {
        const fstats = await fsp.stat(fspath);
        const file = {
            name,
            fspath,
            fstats
        };
        if (file.fstats.isDirectory()) {
            return WalkDir(opts, file.fspath, handler);
        }
        if (file.fstats.isSymbolicLink()) {
            const resolvedPath = await fsp.readlink(fspath);
            return ProcessElement(opts, dir, resolvedPath, handler);
        }
        if (file.fstats.isCharacterDevice()) {
            if (!opts.quiet) {
                console.log(chalk_1.default.bold.gray('Skipping character device'), fspath);
            }
            return;
        }
        if (file.fstats.isBlockDevice()) {
            if (!opts.quiet) {
                console.log(chalk_1.default.bold.gray('Skipping Block Device'), fspath);
            }
            return;
        }
        if (file.fstats.isFIFO()) {
            if (!opts.quiet) {
                console.log(chalk_1.default.bold.gray('Skipping FIFO'), fspath);
            }
            return;
        }
        if (file.fstats.isSocket()) {
            if (!opts.quiet) {
                console.log(chalk_1.default.bold.gray('Skipping Socket'), fspath);
            }
            return;
        }
        if (file.fstats.isFile()) {
            try {
                if (path.parse(fspath).ext !== '.pdf') {
                    return;
                }
                const contents = await fsp.readFile(fspath);
                const inferredType = fileType(contents);
                if (!inferredType || inferredType.ext !== 'pdf') {
                    if (!opts.quiet) {
                        console.log(chalk_1.default.bold.gray('Skipping non-pdf file'), fspath);
                    }
                    return;
                }
                const parsed = await pdf(contents);
                await handler(name, fspath, fstats, parsed);
            }
            catch (err) {
                if (!opts.quiet) {
                    console.log(chalk_1.default.bold.gray('Skipping'), fspath, err.message);
                }
            }
        }
    }
    catch (err) {
        if (!opts.quiet) {
            console.log(chalk_1.default.bold.gray('Skipping'), fspath, err.message);
        }
    }
}
async function WalkDir(opts, dir, handler) {
    const dirstats = await fsp.stat(dir);
    if (!dirstats.isDirectory()) {
        console.log(chalk_1.default.bold.redBright('Location is not a directory'), dir);
        return;
    }
    try {
        const elements = await fsp.readdir(dir);
        await Promise.all(elements.map(element => ProcessElement(opts, dir, element, handler)));
    }
    catch (err) {
        if (!opts.quiet) {
            console.log(chalk_1.default.bold.grey('Skipping'), dir, err.message);
        }
    }
}
const dateFmts = [
    'MM-DD',
    'DD-MM',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'MM-DD-YYYY',
    'DD-MM-YYYY',
    'YYYY-MM-DD',
    'YYYY-MM-DDThh-mm-ss.SSS',
    'YYYY-MM-DD:hh:mmA',
    'YYYY-MM-DD:hh:mm',
    'hh:mmA'
];
commander
    .version('0.1.0')
    .usage('<dirpath> <pattern> [options]')
    .description('Recursively searches the <dirpath> attempting to match the <pattern> e.g. C:/users/xyz/documents "some text.*and some other text"')
    .option('-a, --after <after>', 'Match files created exclusively after this date/datetime.' + os.EOL +
    `\tAcceptable formats (in order of precedence): ${os.EOL}${dateFmts.map(f => `\t\t[${f}]`).join(os.EOL)}`, s => moment(s, dateFmts).toDate())
    .option('-b, --before <before>', 'Match files created exclusively before this date/datetime.' + os.EOL +
    `\tAcceptable formats (in order of precedence): ${os.EOL}${dateFmts.map(f => `\t\t[${f}]`).join(os.EOL)}`, s => moment(s, dateFmts).toDate())
    .option('--minpages <minpages>', 'Match files with more than this many pages.', s => Number.parseInt(s, 10))
    .option('--maxpages <maxpages>', 'Match files with less than this many pages.', s => Number.parseInt(s, 10))
    .option('--maxmb <maxmb>', 'Match files with less than this many megabytes.', s => Number.parseInt(s, 10))
    .option('--minmb <minmb>', 'Match files with more than this many megabytes.', s => Number.parseInt(s, 10))
    .option('--notnames', 'Ignore matches in file names', s => true)
    .option('--updated', 'Consider last updated time instead of created time', s => true)
    .option('-q, --quiet', 'Do not output the pre-search description, or the match description')
    .option('-i, --insensitive', 'Case insensitive')
    .action((pathstr, patternstr, cmd) => {
    let p = pathstr;
    let pattern = patternstr;
    // validate path
    p = p.replace(new RegExp('/', 'g'), path.sep);
    p = p.replace(new RegExp('\\\\', 'g'), path.sep);
    if (p.includes('~')) {
        p = path.resolve(p.replace('~', os.homedir()));
        // wierd problems with windows paths
        const doubleDriveWindowsPath = p.match(/(.*?\:.*?)(.\:.*)$/);
        if (doubleDriveWindowsPath && doubleDriveWindowsPath[2]) {
            p = doubleDriveWindowsPath[2];
        }
    }
    p = path.resolve(p);
    try {
        if (!p) {
            console.log(chalk_1.default.bold.redBright('No path given!'));
            process.exit(1);
        }
        if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
            console.log(chalk_1.default.bold.redBright('Path does not exist or is not a folder:' + p));
            process.exit(1);
        }
    }
    catch (err) {
        console.log(chalk_1.default.bold.redBright('Invalid path:'), err.message);
        commander.outputHelp(() => process.exit(1));
    }
    const opts = cmd instanceof Object && cmd.opts() || {};
    try {
        if (!pattern) {
            console.log(chalk_1.default.bold.redBright('No pattern given!'));
            process.exit(1);
        }
        if (pattern.includes(' ')) {
            // spaces are garbage in pdfs
            pattern = pattern.replace(' ', '\\s+');
        }
        pattern = new RegExp(pattern, 'gm' + (opts.insensitive ? 'i' : ''));
    }
    catch (err) {
        console.log(chalk_1.default.bold.redBright('Invalid Pattern:'), err.message);
        process.exit(1);
    }
    opts.path = p;
    opts.pattern = pattern;
    let description = `Searching ${opts.path} for files matching ${opts.pattern}`;
    if (opts.minpages && opts.maxpages) {
        description += ` with (strictly) between ${opts.minpages} and ${opts.maxpages} pages`;
    }
    else if (opts.minpages) {
        description += ` with more than ${opts.minpages} pages`;
    }
    else if (opts.maxpages) {
        description += ` with less than ${opts.maxpages} pages`;
    }
    if (opts.before && opts.after) {
        description += `, ${opts.updated ? 'updated' : 'created'} (strictly) between "${opts.after.toLocaleString()}" and "${opts.before.toLocaleString()}"`;
    }
    else if (opts.after) {
        description += `, ${opts.updated ? 'updated' : 'created'} after "${opts.after.toLocaleString()}"`;
    }
    else if (opts.before) {
        description += `, ${opts.updated ? 'updated' : 'created'} before "${opts.before.toLocaleString()}"`;
    }
    if (opts.maxmb && opts.minmb) {
        description += `, (strictly) between ${opts.minmb}MB and ${opts.maxmb}MB in size`;
    }
    else if (opts.maxmb) {
        description += `, less than ${opts.maxmb}MB`;
    }
    else if (opts.minmb) {
        description += `, more than ${opts.minmb}MB`;
    }
    if (opts.notnames) {
        description += `, ignoring file names`;
    }
    if (!opts.quiet) {
        console.log(chalk_1.default.whiteBright(description));
    }
    const SearchFile = async (name, path, stats, data) => {
        if (opts.after && !moment(opts.updated ? stats.ctime : stats.birthtime).isAfter(opts.after)) {
            return;
        }
        if (opts.before && !moment(opts.updated ? stats.ctime : stats.birthtime).isBefore(opts.before)) {
            return;
        }
        if (data.numpages && opts.maxpages && (data.numpages >= opts.maxpages)) {
            return;
        }
        if (data.numpages && opts.minpages && (data.numpages <= opts.minpages)) {
            return;
        }
        const bytesPerMB = 1e6;
        if (opts.minmb && (stats.size / bytesPerMB) <= opts.minmb) {
            return;
        }
        if (opts.maxmb && (stats.size / bytesPerMB) >= opts.maxmb) {
            return;
        }
        if (!opts.notnames && opts.pattern.test(name)) {
            console.log(chalk_1.default.gray('Matching Name'), chalk_1.default.green(path));
            return;
        }
        if (opts.pattern.test(data.text)) {
            console.log(chalk_1.default.grey('Matching Content'), chalk_1.default.green(path), (data.text.match(opts.pattern) || [])[0]);
            return;
        }
    };
    return WalkDir(opts, opts.path, SearchFile)
        .catch(e => {
        console.log('Unhandled error! Please report at github.com/sammons/pdf-searcher', e);
        process.exit(1);
    })
        .then(() => {
        process.stdout.resume();
        process.exit(0);
    });
})
    .parse(process.argv);
