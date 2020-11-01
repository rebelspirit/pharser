const fs = require('fs');
const Path = require('path');
const fetch = require('node-fetch');
const colors = require('colors');
const scriptName = Path.basename(__filename);

// Function that download full daily backup of content from TMDB server
exports.getFullDayBackup = async (date, type) => {
    try {
        const name = `${date}_${type}.json.gz`;
        let url;
        const path = Path.resolve(__dirname, `../download`, name);
        const fileStream = fs.createWriteStream(path);

        if (type === 'movie') {
            url = `http://files.tmdb.org/p/exports/movie_ids_${date}.json.gz`;
        }
        if (type === 'serial') {
            url = `http://files.tmdb.org/p/exports/tv_series_ids_${date}.json.gz`;
        }

        const res = await fetch(url);

        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", error => {
                reject(error);
            });
            fileStream.on("finish", () => {
                resolve();
            });
        });

    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }

};