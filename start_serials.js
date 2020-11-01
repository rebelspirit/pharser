const express = require('express');
const http = require('https');
const colors = require('colors');
const cron = require("node-cron");
const mongoose = require('mongoose');
const serials_id = require('./models/serials_id.js');
const Path = require('path');
const scriptName = Path.basename(__filename);

const { createFolder } = require('./utils');
const { startParsing, startUpdate } = require('./service/parser');

const app = express();
const httpServer = http.createServer(app);
const PORT = 8060;

// cron.schedule("* * * * *", function() {
//     console.log("<----- START CRON JOB ----->");
//     console.log('get movies is running');
//     getMovies();
//     console.log("<----- END CRON JOB ----->");
// });

const countOfParsingItems = 20;
const delay = 10000;

const init = async () => {
    try {
        //Check and create needed folders
        await createFolder("../download");
        await createFolder("../img_serial_posters");
        await createFolder("../img_serial_backdrops");
        // Check needed data in database (Movies, TV Shows)
        const serials = await serials_id.find({});

        if (serials.length) {
            // If movies exists -> start check updates and compare with prev day movies array
            console.log("[INITIALIZATION]: OK! Array with Serial id's in database exists".yellow);
            console.log("[INITIALIZATION]: Next step is try to check new serials data for this day and compare them with previous data array from database..".yellow);
            await startUpdate(countOfParsingItems, delay, 'serial');
        } else {
            console.log("[INITIALIZATION]: WARNING! Array with Serials id's in database doesn't exists!".yellow);
            console.log("[INITIALIZATION]: Next step is try download serials data, parsing them, and create array with serials id's in database..".yellow);
            await startParsing(countOfParsingItems, delay, 'serial');
        }

    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }
};

(async () => {
    try {
        await mongoose.connect("mongodb+srv://admin:P@ssw0rd00@atlantis-rydzc.mongodb.net/App?retryWrites=true&w=majority", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        httpServer.listen(PORT, () => console.log(`[SERVER]: App has been started on port ${colors.cyan(PORT)}..`.green));
        await init();
    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }
})();