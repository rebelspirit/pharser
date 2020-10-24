const express = require('express');
const fetch = require('node-fetch');
const http = require('https');
const fs = require('fs');
const Path = require('path');
const cron = require("node-cron");
const webp = require('webp-converter');
const {ungzip} = require('node-gzip');
const colors = require('colors');
const mongoose = require('mongoose');
const movie = require('./models/movie.js');
const allMoviesID = require('./models/allMoviesID.js');
const partialMovie = require('./models/partial_movie.js');
const readlineSync = require('readline-sync');

const app = express();
const httpServer = http.createServer(app);
const PORT = 8080;
const API_KEY = '37381515063aba22627eb415da0adfe3';
const language = 'language=ru';
const region = 'region=RU';

// cron.schedule("* * * * *", function() {
//     console.log("<----- START CRON JOB ----->");
//     console.log('get movies is running');
//     getMovies();
//     console.log("<----- END CRON JOB ----->");
// });

const countOfParsingItems = 20;
const delay = 10000;

const deleteItem = (item) => {
    fs.stat(item, (err) => {
        if (err) return console.error(err);

        fs.unlink(item, (err) => {
            if(err) return console.log(err);
            console.log('[SERVER]: File deleted successfully:'.green, colors.cyan(item));
        });
    });
};
const convertImages = (input, output) => {
    webp.cwebp(input, output,"-q 80",(status, error) => {
        // if conversion successful status will be '100'
        // if conversion fails status will be '101'
        if (status === "100") {
            console.log(`[CONVERTER]: Image convert successfully! And new link is:`.green, colors.cyan(output))
        } else {
            console.log(status, error);
        }
    })
};

const createFolder = (name) => {
    fs.mkdir(Path.join(__dirname, name),
        { recursive: false }, (err) => {
            if (err) {
                return console.log(`[INITIALIZATION]: Directory already exists!`.yellow, colors.cyan(name));
            }
            console.log(`[INITIALIZATION]: Directory created successfully!`.yellow, colors.cyan(name));
        });
};

const getCurrentDate = () => {
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

const downloadFile = (async (url, path) => {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", (err) => {
            reject(err);
        });
        fileStream.on("finish", function() {
            resolve();
        });
    });
});

const getFullDayBackup = async (date) => {
    try {
        const name = `${date}.json.gz`;
        const url = `http://files.tmdb.org/p/exports/movie_ids_${date}.json.gz`;
        const path = Path.resolve(__dirname, 'download', name);
        const fileStream = fs.createWriteStream(path);

        const res = await fetch(url);

        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", (err) => {
                reject(err);
            });
            fileStream.on("finish", function() {
                resolve();
            });
        });

    } catch (e) {
        console.log(colors.red(e.message))
    }

};

const startMoviesParsing = async (count, delay) => {
    try {
        // Get current date
        const date = await getCurrentDate();
        // Get backup of current day
        await getFullDayBackup(date);
        // Get compressed Day import for the prev day
        const data = fs.readFileSync(`download/${date}.json.gz`);
        // Decompressed data and make them to string
        const decompressed = await ungzip(data);
        const stringData = await decompressed.toString();
        console.log("[PARSER]: Start parsing decompressed data..".green);
        // Convert string of objects to array of objects
        const arr = stringData.split("\n");
        console.log("[PARSER]: Result data length: ".green, colors.cyan(arr.length));
        // Create array for most popular content
        const mostPopular = [];
        // Run cycle and filter the prev data array (sort by popularity)
        arr.forEach((item) => {
            if(item){
                const obj = JSON.parse(item);

                if(obj.popularity > 1) {
                    // Save only ID's on array
                    mostPopular.push(obj.id)
                }
            }
        });
        console.log("[PARSER]: New data length (by popularity): ".green, colors.cyan(mostPopular.length));
        // Save ID's array to database
        const saveAllMoviesID = allMoviesID({items: mostPopular});
        await saveAllMoviesID.save();
        // Call downloader function for parsing or update
        await contentDownloader(mostPopular, count, delay)

    } catch (e) {
        console.log(colors.red(e.message))
    }

};

const contentDownloader = async (array, count, delay) => {
    try {
        // Timer function for get estimated time
        const timer = (items, count) => {
            const timestamp = (items / count) * 10;
            const hoursTime = Math.floor(timestamp / 60 / 60);
            const minutesTime = Math.floor(timestamp / 60) - (hoursTime * 60);
            const secondsTime = timestamp % 60;
            const formatted = hoursTime + ':' + minutesTime + ':' + secondsTime;

            console.log("Time for end:".green, colors.cyan(formatted), "hours".green);
        };

        let success = 0;
        let partial = 0;

        console.log("///////////////////////////////////".yellow);
        console.log("//// START DOWNLOAD ONE BY ONE ////".yellow);
        console.log("///////////////////////////////////".yellow);

        // Now get content details step by step
        const interval = setInterval(async () => {
            if (array.length === 0) {
                console.log("///////////////////////////////////".yellow);
                console.log("///// END DOWNLOAD ONE BY ONE /////".yellow);
                console.log("///////////////////////////////////".yellow);
                clearInterval(interval);
            } else {
                // Round array include countOfParsingItems number items
                const roundToDownload = [];
                // Cycle for get countOfParsingItems items from mostPopular array
                for (let i = 0; i < count; i++) {
                    const item = array.shift();
                    roundToDownload.push(item);
                }
                // Step by step getting data from two sides TMDB and VideoCDN
                for (const id of roundToDownload) {
                    console.log("[DOWNLOADER]: Get details by id:".green, colors.cyan(id));
                    // Getting from TMDB
                    const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&${language}&${region}`);
                    const data = await response.json();

                    // Getting from VideoCDN
                    const videoCdnResponse = await fetch(`https://videocdn.tv/api/movies?api_token=QDH5tZqrotr27szq3U9Yx2lEgunhKbuo&direction=desc&field=global&limit=10&ordering=last_media_accepted&imdb_id=${data.imdb_id}`);
                    const videoCdnData = await videoCdnResponse.json();
                    console.log("[DOWNLOADER]: VideoCDN by id".green, colors.cyan(id), "exist's:".green, colors.cyan(videoCdnData.data.length ? "true" : "false"));

                    // If VideoCDN response contains needed concat data with previous object
                    if (videoCdnData.data.length && data.poster_path && data.backdrop_path) {
                        videoCdnData.data[0].kinopoisk_id ? data.kinopoisk_id = videoCdnData.data[0].kinopoisk_id : null;
                        videoCdnData.data[0].iframe_src ? data.iframe_src = videoCdnData.data[0].iframe_src : null;
                        videoCdnData.data[0].iframe ? data.iframe = videoCdnData.data[0].iframe : null;

                        //Create links for download posters and backdrops
                        const poster_link = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
                        const backdrop_link = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                        console.log(`[DOWNLOADER]: Get image poster from:`.green, colors.cyan(poster_link));
                        console.log(`[DOWNLOADER]: Get image backdrop from:`.green, colors.cyan(backdrop_link));

                        // Where put images
                        const poster = Path.resolve(__dirname, 'img_movie_posters', data.poster_path.slice(1));
                        const backdrop = Path.resolve(__dirname, 'img_movie_backdrops', data.backdrop_path.slice(1));
                        // Download posters img and backdrops
                        await downloadFile(poster_link, poster);
                        await downloadFile(backdrop_link, backdrop);

                        // Convert JPG posters and backdrops to webp format
                        await convertImages(`img_movie_posters${data.poster_path}`, `img_movie_posters${data.poster_path.slice(0, -4)}.webp`);
                        await convertImages(`img_movie_backdrops${data.backdrop_path}`, `img_movie_backdrops${data.backdrop_path.slice(0, -4)}.webp`);

                        // Delete JPG images
                        await deleteItem(`img_movie_posters${data.poster_path}`);
                        await deleteItem(`img_movie_backdrops${data.backdrop_path}`);

                        data.poster_path = `${data.poster_path.slice(0, -4)}.webp`;
                        data.backdrop_path = `${data.backdrop_path.slice(0, -4)}.webp`;

                        // And push to successful object on database
                        const SUCCESSFUL_DOWNLOADED = new movie(data);
                        await SUCCESSFUL_DOWNLOADED.save();
                        success = success + 1;
                    } else {
                        // If doesnt contain needed data push to partial object on database for next time check
                        const PARTIAL_DOWNLOADED = new partialMovie(data);
                        await PARTIAL_DOWNLOADED.save();
                        partial = partial + 1;
                    }

                }
                // Some useful system information
                console.log("..of array length:".green, colors.cyan(array.length));
                console.log("Success:".green, colors.cyan(success));
                console.log("Partial:".green, colors.cyan(partial));
                await timer(array.length, count);
                console.log("------------------------------".yellow);
            }
        }, delay);
    } catch (e) {
        console.log(colors.red(e.message))
    }
};


const checkAndCompareNewMovies = async (count, delay) => {
    try {
        // Get current date
        const date = await getCurrentDate();
        // Get backup of current day
        await getFullDayBackup(date);
        // Get compressed Day import for the prev day
        const data = fs.readFileSync(`download/${date}.json.gz`);
        // Decompressed data and make them to string
        const decompressed = await ungzip(data);
        const stringData = await decompressed.toString();
        console.log("[UPDATER]: Start parsing decompressed data..".green);
        // Convert string of objects to array of objects
        const arr = stringData.split("\n");
        console.log("[UPDATER]: Result data length: ".green, colors.cyan(arr.length));
        // Array with new data
        const newData = [];

        arr.forEach((item) => {
            if(item){
                const obj = JSON.parse(item);

                if(obj.popularity > 1) {
                    // Save only ID's on array
                    newData.push(obj.id)
                }
            }

        });
        console.log("[UPDATER]: New data length is:".green, colors.cyan(newData.length));
        // Array with old data from database (only ID's)
        const oldData = await allMoviesID.find({});
        console.log("[UPDATER]: Old data length is:".green, colors.cyan(oldData[0].items.length));
        // Array with difference between New Data and Old data from database
        let difference = newData.filter(x => !oldData[0].items.includes(x));
        console.log("[UPDATER]: Difference length is:".green, colors.cyan(difference.length));
        // Call downloader function for parsing or update
        await contentDownloader(difference, count, delay);
    } catch (e) {
        console.log(colors.red(e.message))
    }
};

const initialization = async () => {
    try {
        //Check and create needed folders
        await createFolder("img_movie_posters");
        await createFolder("img_movie_backdrops");
        // Check needed data in database (Movies, TV Shows)
        const movies = await allMoviesID.find({});

        if (movies.length) {
            // If movies exists -> start check updates and compare with prev day movies array
            console.log("[INITIALIZATION]: OK! Movies in database exists".yellow);
            console.log("[INITIALIZATION]: Next step is try to check new movies..".yellow);
            await checkAndCompareNewMovies(countOfParsingItems, delay);
        } else {
            console.log("[INITIALIZATION]: WARNING! No movies in database".yellow);
            console.log("[INITIALIZATION]: Next step is try parsing movies..".yellow);
            await startMoviesParsing(countOfParsingItems, delay);
        }

    } catch (e) {
        console.log(colors.red(e.message))
    }
};

const startServer = async () => {
    try {
        await mongoose.connect("mongodb+srv://admin:P@ssw0rd00@atlantis-rydzc.mongodb.net/App?retryWrites=true&w=majority", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        httpServer.listen(PORT, () => console.log(`[SERVER]: App has been started on port ${colors.cyan(PORT)}..`.green));

    } catch (e) {
        console.log(colors.red(e.message))
    }

};

const startServerMenu = async () => {
    const processType = [
        'Continue start server'.cyan,
        'Start parsing all content'.cyan,
        'Start update existing content'.cyan,
        'Create all needed folders'.cyan
    ];
    const questionType = readlineSync.keyInSelect(processType, '[SERVER]: Hello my master! What process do you want to run ?'.green);

    try {
        switch (questionType) {
            case 0: // Continue start server
                console.log(`[SERVER]: Ok, ${processType[questionType].toLocaleLowerCase()}`.green + ' goes to run.'.green);
                await startServer();
                await initialization();
                break;
            case 1: // Start parsing all content
                console.log(`[SERVER]: Ok, ${processType[questionType].toLocaleLowerCase()}`.green + ' goes to run.'.green);
                await startServer();
                break;
            case 2: // Start update existing content
                await startServer();
                break;
            case 3: // Create all needed folders
                await createFolder("download");
                await createFolder("img_movie_posters");
                await createFolder("img_movie_backdrops");
                break;
            default:
                break;
        }
    } catch (e) {
        console.log(colors.red(e.message))
    }
};

startServerMenu();

// if (readlineSync.keyInYN('Do you want this module?')) {
//     // 'Y' key was pressed.
//     console.log('Installing now...');
//     // Do something...
// } else {
//     // Another key was pressed.
//     console.log('Searching another...');
//     // Do something...
// }




app.get('/', (req, res) => res.send('Welcome! Node server on air!'));


