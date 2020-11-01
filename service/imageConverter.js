const fs = require('fs');
const colors = require('colors');
const imageMin = require('imagemin');
const imageMinWebp = require('imagemin-webp');
const Path = require('path');
const scriptName = Path.basename(__filename);
const { timer } = require('../utils');

// Function for convert images from folder to folder
exports.imageConverter = async (input, output, round, delay) => {
    const convertStack = [];

    try {
        await fs.readdir(input, (error, files) => {
            if (error) console.log(colors.yellow(scriptName) , colors.red(error.message));
            files.forEach(file => {
                convertStack.push(file)
            });

            let count = convertStack.length;

            console.log(`[IMG_CONVERTER]: Start convert ${colors.cyan(input)}`.green, `length: ${colors.cyan(count)}`.green);
            const interval = setInterval(async () => {
                if (convertStack.length === 0) {
                    clearInterval(interval);
                    console.log(`[IMG_CONVERTER]: Finish! All images from folder ${colors.cyan(input)}`.yellow, `successfully converted and now destination is ${colors.cyan(output)}`.yellow);
                    fs.readdir(output,  (err, files) => {
                        console.log(`[IMG_CONVERTER]: Files: ${colors.cyan(files.length)}`.yellow, `on ${colors.cyan(output)}`.yellow);
                    });
                } else {
                    const roundToConvert = [];
                    const converterRoundNumber = round < count ? round : count;

                    for (let i = 0; i < converterRoundNumber; i++) {
                        const item = convertStack.shift();
                        roundToConvert.push(item);
                    }

                    for (const item of roundToConvert) {
                        console.log(`[IMG_CONVERTER]: Start convert ${colors.cyan(item)}`.green, `and put image to: ${colors.cyan(output)}`.green, `to finish: ${colors.cyan(count = count - 1)}`.green);

                        await imageMin([`${input}/${item}`], {
                            destination: output,
                            plugins: [
                                imageMinWebp({quality: 75})
                            ]
                        });
                    }

                    // Some useful system information
                    console.log("..of array length:".green, colors.cyan(convertStack.length));
                    await timer(convertStack.length, round, delay);
                    console.log("------------------------------".yellow);
                }

            }, delay);
        });
    } catch (e) {
        console.log(colors.yellow(scriptName) , colors.red(e.message))
    }
};