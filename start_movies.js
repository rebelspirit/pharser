const express = require('express');
const http = require('https');
const colors = require('colors');
const cron = require("node-cron");
const mongoose = require('mongoose');
const movies_id = require('./models/movies_id.js');
const Path = require('path');
const scriptName = Path.basename(__filename);

const { createFolder } = require('./utils');
const { startParsing, startUpdate } = require('./service/parser');

const app = express();
const httpServer = http.createServer(app);
const PORT = 8050;

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
        await createFolder("../img_movie_posters");
        await createFolder("../img_movie_backdrops");
        // Check needed data in database (Movies, TV Shows)
        const movies = await movies_id.find({});

        if (movies.length) {
            // If movies exists -> start check updates and compare with prev day movies array
            console.log("[INITIALIZATION]: OK! Array with Movies id's in database exists".yellow);
            console.log("[INITIALIZATION]: Next step is try to check new movies data for this day and compare them with previous data array from database..".yellow);
            await startUpdate(countOfParsingItems, delay, 'movie');
        } else {
            console.log("[INITIALIZATION]: WARNING! Array with Movies id's in database doesn't exists!".yellow);
            console.log("[INITIALIZATION]: Next step is try download movies data, parsing them, and create array with movies id's in database..".yellow);
            await startParsing(countOfParsingItems, delay, 'movie');
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