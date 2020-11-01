const fs = require('fs');
const { ungzip } = require('node-gzip');
const colors = require('colors');
const Path = require('path');
const scriptName = Path.basename(__filename);
const movies_id = require('../models/movies_id.js');
const serials_id = require('../models/serials_id.js');

const { contentDownloader } = require('../service/contentDownloader');
const { getFullDayBackup } = require('../service/dailyBackup');
const { getCurrentDate } = require('../utils');

// Function that start parsing all Movies
exports.startParsing = async (count, delay, type) => {
    try {
        // Get current date
        const date = await getCurrentDate();
        // Get backup of current day
        await getFullDayBackup(date, type);
        // Get compressed Day import for the prev day
        const data = fs.readFileSync(`./download/${date}_${type}.json.gz`);
        // Decompressed data and make them to string
        const decompressed = await ungzip(data);
        const stringData = await decompressed.toString();
        console.log("[PARSER]: Start decompressed data and convert them..".green);
        // Convert string of objects to array of objects
        const arr = stringData.split("\n");
        console.log("[PARSER]: Decompressed data length is: ".green, colors.cyan(arr.length));
        // Create array for most popular content
        const mostPopular = [];
        // Run cycle and filter the prev data array (sort by popularity)
        arr.forEach(item => {
            if (item) {
                const obj = JSON.parse(item);

                if (obj.popularity > 1) {
                    // Save only ID's on array
                    mostPopular.push(obj.id)
                }
            }
        });
        console.log("[PARSER]: Filtered (popularity > 1.00) data array length is: ".green, colors.cyan(mostPopular.length));
        // Call downloader function for parsing or update
        if (type === 'movie') {
            await contentDownloader(mostPopular, count, delay, type, '../img_movie_posters', '../img_movie_backdrops');
        }
        if (type === 'serial') {
            await contentDownloader(mostPopular, count, delay, type, '../img_serial_posters', '../img_serial_backdrops');
        }
    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }

};

// Function that start updating database with new Movies
exports.startUpdate = async (count, delay, type) => {
    try {
        // Get current date
        const date = await getCurrentDate();
        // Get backup of current day
        await getFullDayBackup(date, type);
        // Get compressed Day import for the prev day
        const data = fs.readFileSync(`./download/${date}_${type}.json.gz`);
        // Decompressed data and make them to string
        const decompressed = await ungzip(data);
        const stringData = await decompressed.toString();
        console.log("[UPDATER]: Start decompressed data and convert them..".green);
        // Convert string of objects to array of objects
        const arr = stringData.split("\n");
        console.log("[UPDATER]: Decompressed data length is: ".green, colors.cyan(arr.length));
        // Array with new data
        const newData = [];

        arr.forEach(item => {
            if (item) {
                const obj = JSON.parse(item);

                if(obj.popularity > 1) {
                    // Save only ID's on array
                    newData.push(obj.id)
                }
            }
        });
        console.log("[UPDATER]: Filtered (popularity > 1.00) data array length is:".green, colors.cyan(newData.length));
        // Array with old data from database (only ID's)
        let oldData;
        if (type === 'movie') {
            oldData = await movies_id.find({});
        }
        if (type === 'serial') {
            oldData = await serials_id.find({});
        }

        console.log("[UPDATER]: Previous period data array (from database) length is:".green, colors.cyan(oldData[0].items.length));
        // Array with difference between New Data and Old data from database
        const difference = newData.filter(x => !oldData[0].items.includes(x));
        console.log("[UPDATER]: Difference between new data and array with id's (from database) is:".green, colors.cyan(difference.length));
        // Call downloader function for parsing or update
        if (type === 'movie') {
            await contentDownloader(difference, count, delay, type, '../img_movie_posters', '../img_movie_backdrops');
        }
        if (type === 'serial') {
            await contentDownloader(difference, count, delay, type, '../img_serial_posters', '../img_serial_backdrops');
        }
    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }
};