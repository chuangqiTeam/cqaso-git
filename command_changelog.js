const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');
const co = require('co');
const colors = require('colors');
const thunkify = require('thunkify');

const program = {
    // submit message正则匹配
    message: '\[added\]|\[removed\]|\[changed\]|\[fixed\]',
    // 输出文档路径
    out: 'CHANGELOG.md',
}

const commitRegex = new RegExp(program.message);

function main(version) {

    co(function *() {
        // 获得最新tag
        const tag = yield thunkify(latestTag)();

        // 获得log信息
        const log = yield thunkify(changelog)(tag);

        // 优化log信息
        const formatedLog = formatLog(tag, log);
        console.log(formatedLog);

        // writeLog(log, tag);

    }).catch(err => {
        console.log('😟  ' + err.message.red);
    });


    // latestTag(function (tag) {
    //     changelog(tag, function (log) {
    //         log = log.map(function (subject) {
    //             return subject.replace(/^([a-f|0-9]+)/, '[$1](../../commit/$1)')
    //         });
    //         log = '- ' + log.join('\n- ');
    //         if (program.stdout) {
    //             console.log(log);
    //         } else {
    //             writeLog(log, tag);
    //         }
    //         if (callback)
    //             callback(log);
    //         }
    //     );
    // });
}

function formatLog(tag, log) {
    const title = tag + ' - ' + new Date().toUTCString();
    const dashes = title.replace(/./g, '-');
    log = log.map(function (subject) {
        return subject.replace(/^([a-f|0-9]+)/, '[$1](../../commit/$1)')
    });
    log = '- ' + log.join('\n- ');
    let src = title + '\n' + dashes + '\n\n';
    src += log;
    return src;
}

function writeLog(log) {
    if (fs.existsSync(program.out)) {
        log += '\n\n\n';
        log += fs.readFileSync(program.out).toString();
    }
    fs.writeFileSync(program.out, log);
}

function changelog(tag, next) {
    exec('git log --no-merges --oneline ' + tag + '..HEAD', function (err, log) {
        next(err, parseLog(log));
    });
}

function parseLog(log) {
    return log.split('\n').filter(function (commit) {
        return commitRegex.test(commit);
    });
}

// 最新的tag
function latestTag(next) {
    exec('git tag', function(err, tags) {
        next(err, filterTagStringToLatest(tags));
    });
}

function filterTagStringToLatest(tagString) {
    return lastSemverTag(tagString.split('\n'));
}

function splitTag(tag) {
    return tag.replace(/^v/, '').split('.').map(function (n) {
        return parseInt(n);
    });
}

function sortTagsNumerically(a, b) {
    a = splitTag(a);
    b = splitTag(b);
    if (a[0] > b[0])
        return -1;
    else if (a[0] === b[0] && a[1] > b[1])
        return -1;
    else if (a[0] === b[0] && a[1] === b[1] && a[2] > b[2])
        return -1;
    else
        return 1;
    }
;

function isSemver(tag) {
    return tag.match(/v?[0-9]+\.[0-9]+\.[0-9]+(.+)?/);
}

function lastSemverTag(tags) {
    var tag = tags.filter(isSemver).sort(sortTagsNumerically)[0];
    if (!tag) {
        console.log('no previous semver tag found, tag a commit in the past and try again');
        process.exit();
    }
    return tag;
}

function execHandler(cb) {
    return function (err, stdout, stderr) {
        if (err)
            throw new Error(err);
        if (cb)
            cb(stdout);
        };
}

module.exports = main;
