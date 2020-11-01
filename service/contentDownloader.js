const Path = require('path');
const scriptName = Path.basename(__filename);
const fetch = require('node-fetch');
const colors = require('colors');
const movie = require('../models/movie');
const movies_id = require('../models/movies_id.js');
const movies_report = require('../models/movies_report.js');
const serial = require('../models/serial');
const serials_id = require('../models/serials_id.js');
const serials_report = require('../models/serials_report.js');

const {timer, downloadFile} = require('../utils');

const API_KEY = '37381515063aba22627eb415da0adfe3';
const VIDEOCDN_API_TOKEN = 'QDH5tZqrotr27szq3U9Yx2lEgunhKbuo';
const language = 'language=ru';
const region = 'region=RU';

// Function that download content from TMDB API and compare them with VideoSDN API
exports.contentDownloader = async (array, count, delay, type, posters, backdrops) => {
    try {
        // Add movie's ID if them downloaded successful
        let successDownloaded = [];
        // Increase number if download missed
        let missed = 0;

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
                // Save ID's array to database
                let saveAllMoviesID;
                if (type === 'movie') {
                    saveAllMoviesID = movies_id({items: successDownloaded});
                }
                if (type === 'serial') {
                    saveAllMoviesID = serials_id({items: successDownloaded});
                }
                await saveAllMoviesID.save();
                console.log("[SERVER]: Saved to database array with successfully downloaded id's, length is: ".green, colors.cyan(successDownloaded.length));
                // Save report to database about download content
                let report;
                if (type === 'movie') {
                    report = movies_report({
                        success_download: successDownloaded.length,
                        missed_download: missed,
                        total: successDownloaded.length + missed
                    });
                }
                if (type === 'serial') {
                    report = serials_report({
                        success_download: successDownloaded.length,
                        missed_download: missed,
                        total: successDownloaded.length + missed
                    });
                }

                await report.save();
                console.log("[SERVER]: Saved to database download report object..".green);
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
                    console.log("[DOWNLOADER]:  Get details from TMDB by id:".green, colors.cyan(id));

                    let response;
                    let videoCdnResponse;
                    // Getting from TMDB
                    let data;
                    // Getting from VideoCDN
                    let videoCdnData;

                    if (type === 'movie') {
                        response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&${language}&${region}`);
                        data = await response.json();
                        videoCdnResponse = await fetch(`https://videocdn.tv/api/movies?api_token=${VIDEOCDN_API_TOKEN}&direction=desc&field=global&limit=10&ordering=last_media_accepted&imdb_id=${data.imdb_id}`);
                        videoCdnData = await videoCdnResponse.json();

                        console.log("[DOWNLOADER]: VideoCDN by id".green, colors.cyan(id), "exist's:".green, colors.cyan(videoCdnData.data.length ? "true" : "false"), videoCdnData.data.length ? `title: ${colors.cyan(data.title)}`.green : `title: ${colors.red(data.title)}`.green);
                    }

                    if (type === 'serial') {
                        const get_external_id = await fetch(`https://api.themoviedb.org/3/tv/${id}/external_ids?api_key=${API_KEY}&${language}&${region}`);
                        const external_id = await get_external_id.json();

                        if (external_id.imdb_id) {
                            response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&${language}&${region}`);
                            data = await response.json();
                            data.imdb_id = external_id.imdb_id;
                            videoCdnResponse = await fetch(`https://videocdn.tv/api/tv-series?api_token=${VIDEOCDN_API_TOKEN}&direction=desc&field=global&limit=10&ordering=last_media_accepted&imdb_id=${external_id.imdb_id}`);
                            videoCdnData = await videoCdnResponse.json();
                            console.log("[DOWNLOADER]: VideoCDN by id".green, colors.cyan(id), "exist's:".green, colors.cyan(videoCdnData.data.length ? "true" : "false"), videoCdnData.data.length ? `title: ${colors.cyan(data.name)}`.green : `title: ${colors.red(data.name)}`.green);
                        } else {
                            data = null
                        }
                    }


                    // If VideoCDN response contains needed concat data with previous object
                    if (data && videoCdnData.data.length && data.poster_path && data.backdrop_path) {
                        videoCdnData.data[0].kinopoisk_id ? data.kinopoisk_id = videoCdnData.data[0].kinopoisk_id : null;
                        videoCdnData.data[0].iframe_src ? data.iframe_src = videoCdnData.data[0].iframe_src : null;
                        videoCdnData.data[0].iframe ? data.iframe = videoCdnData.data[0].iframe : null;

                        //Create links for download posters and backdrops
                        const poster_link = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
                        const backdrop_link = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                        console.log(`[DOWNLOADER]: Get image poster from:`.green, colors.cyan(data.poster_path));
                        console.log(`[DOWNLOADER]: Get image backdrop from:`.green, colors.cyan(data.backdrop_path));

                        // Where put images
                        const poster = Path.resolve(__dirname, posters, data.poster_path.slice(1));
                        const backdrop = Path.resolve(__dirname, backdrops, data.backdrop_path.slice(1));
                        // Download posters img and backdrops
                        await downloadFile(poster_link, poster);
                        await downloadFile(backdrop_link, backdrop);

                        // Add new link to movie data object
                        data.poster_path = `${data.poster_path.slice(0, -4)}.webp`;
                        data.backdrop_path = `${data.backdrop_path.slice(0, -4)}.webp`;

                        // And push to successful object on database
                        let SUCCESSFUL_DOWNLOADED;
                        if (type === 'movie') {
                            SUCCESSFUL_DOWNLOADED = new movie(data);
                        }
                        if (type === 'serial') {
                            SUCCESSFUL_DOWNLOADED = new serial(data);
                        }
                        await SUCCESSFUL_DOWNLOADED.save();
                        successDownloaded.push(data.id);
                    } else {
                        // If doesnt contain needed data push to partial object on database for next time check
                        missed = missed + 1;
                    }

                }
                // Some useful system information
                console.log("..of array length:".green, colors.cyan(array.length));
                console.log("Success:".green, colors.cyan(successDownloaded.length));
                console.log("Missed:".green, colors.cyan(missed));
                await timer(array.length, count, delay);
                console.log("------------------------------".yellow);
            }
        }, delay);

    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }
};