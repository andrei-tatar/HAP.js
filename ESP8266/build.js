var arguments = process.argv.slice(2);
if (arguments.length < 2) {
    console.log("Invalid number of args");
    console.log("node build.js destination_path build_type");
    process.exit(1);
}

var fs = require('fs'),
    spawn = require('child_process').spawn,
    path = require('path');

var destination_path = arguments[0];
var make_type = arguments[1];
if (make_type != 'all') {
    execute('make', arguments.slice(1), function (code) {
        process.exit(code);
    });
    return;
}

var headerFiles = getFilesSync('.', '.h');
var type, version;

for (var i=0; i<headerFiles.length; i++) {
    var fileContent = fs.readFileSync(headerFiles[i]).toString();

    var typeMatch = fileContent.match(/#define\s+OTA_TYPE\s+"([a-zA-Z0-9_\-]+)"/);
    if (!typeMatch) continue;
    type = typeMatch[1];

    var versionMatch = fileContent.match(/#define\s+OTA_VERSION\s+(\d+)/);
    if (!versionMatch) continue;
    version = versionMatch[1];

    break;
}

if (!type || !version) {
    console.error("No header file found that contanins type and version");
    return;
}

var dstPath = path.join(destination_path, type);
createDirectoryTree(dstPath);
var dst1 = path.join(dstPath, "user1.bin");
var dst2 = path.join(dstPath, "user2.bin");
deleteFileIfExists(dst1);
deleteFileIfExists(dst2);

var fwPath = path.join('firmware', 'upgrade');
var file1 = path.join(fwPath, "user1.512.new.bin");
var file2 = path.join(fwPath, "user2.512.new.bin");

var finalDstPath = path.join(destination_path, type, version);
var fdst1 = path.join(finalDstPath, "user1.bin");
var fdst2 = path.join(finalDstPath, "user2.bin");

execute('make', ['rebuild', 'app=1'], function (code) {
    if (code == 0) {
        fs.renameSync(file1, dst1);

        execute('make', ['rebuild', 'app=2'], function (code) {
            fs.renameSync(file2, dst2);

            createDirectoryTree(finalDstPath);
            deleteFileIfExists(fdst1);
            deleteFileIfExists(fdst2);

            fs.renameSync(dst1, fdst1);
            fs.renameSync(dst2, fdst2);

            console.log('Copied %s to %s', file1, fdst1);
            console.log('Copied %s to %s', file2, fdst2);

            process.exit(code);
        });
    }
    else
        process.exit(code);
});

function getFilesSync(dir, extension) {
    var foundFiles = [];
    var list = fs.readdirSync(dir);
    for (var i=0; i<list.length; i++) {
        var file = path.join(dir, list[i]);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory())
            foundFiles = foundFiles.concat(getFilesSync(file, extension));
        else if (path.extname(file) == extension)
            foundFiles.push(file);
    }

    return foundFiles;
}

function execute(command, arguments, complete) {
    var cmdProcess = spawn(command, arguments);

    cmdProcess.stdout.on('data', function (data) {
        process.stdout.write(data);
    });

    cmdProcess.stderr.on('data', function (data) {
        process.stderr.write(data);
    });

    cmdProcess.on('exit', function (code) {
        if (complete) complete(code);
    });
}

function directoryExists(dirPath) {
    try {
        var stat = fs.statSync(dirPath);
        return stat && stat.isDirectory();
    } catch (e) {
        return false
    }
}

function createDirectoryTree(dirPath) {
    if (directoryExists(dirPath)) return;

    var parent = path.dirname(dirPath);
    createDirectoryTree(parent);

    fs.mkdirSync(dirPath);
}

function deleteFileIfExists(filePath) {
    var stat;
    try {
        stat = fs.statSync(filePath);
    } catch (e) {

    }

    if (stat && stat.isFile())
        fs.unlinkSync(filePath);
}