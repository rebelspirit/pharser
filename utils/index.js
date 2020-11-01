const fs = require('fs');
const Path = require('path');
const colors = require('colors');
const fetch = require('node-fetch');
const scriptName = Path.basename(__filename);

// Timer function for get estimated time
exports.timer = (items, count, delay) => {
    const timestamp = (items / count) * (delay / 1000);
    const hoursTime = Math.floor(timestamp / 60 / 60);
    const minutesTime = Math.floor(timestamp / 60) - (hoursTime * 60);
    const secondsTime = timestamp % 60;
    const formatted = hoursTime + ':' + minutesTime + ':' + secondsTime;

    console.log("Time for end:".green, colors.cyan(formatted), "hours".green);
};
// Delete item function accepts name of item
exports.deleteItem = item => {
    fs.stat(item, error => {
        if (error) return console.log(colors.yellow(scriptName) , colors.red(error.message))

        fs.unlink(item, error => {
            if(error) return console.log(colors.yellow(scriptName) , colors.red(error.message));
            console.log('[SERVER]: File deleted successfully:'.green, colors.cyan(item));
        });
    });
};
// Delete folder function accepts name of folder
exports.deleteFolder = folder => {
    fs.rmdirSync(folder, { recursive: true });
    console.log(`[SERVER]: Folder with JPG images deleted:`.green, colors.cyan(folder));
};
// Create folder function accepts name of folder
exports.createFolder = name => {
    fs.mkdir(Path.join(__dirname, name),
        { recursive: false }, error => {
            if (error) return console.log(`[SERVER]: Directory already exists!`.green, colors.cyan(name));

            console.log(`[SERVER]: Directory created successfully!`.green, colors.cyan(name));
        });
};
// Function that return current date for server
exports.getCurrentDate = () => {
    const today = new Date();
    const month = () => {
        const a = today.getMonth() + 1;

        if (a < 10) {
            return "0" + a
        } else {
            return a
        }

    };
    const day = () => {
        const a = today.getDate();
        if (a < 10) {
            return "0" + a
        } else {
            return a
        }
    };
    // Change date to needed format for export
    const date = month()+'_'+day()+'_'+today.getFullYear();
    console.log("[SERVER]: Current date is:".green, colors.cyan(date));
    return date;
};
// Function for download that accepts URL and path where save downloaded file
exports.downloadFile = (async (url, path) => {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", (err) => {
            reject(err);
        });
        fileStream.on("finish", () => {
            resolve();
        });
    });
});
