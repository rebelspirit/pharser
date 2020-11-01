const readlineSync = require('readline-sync');
const colors = require('colors');
const { imageConverter } = require('./service/imageConverter');
const {  deleteFolder, createFolder } = require('./utils');

(async () => {
    const processType = [
        'Create all needed folders'.cyan,
        'Convert Images from JPG to WebP'.cyan,
        'Delete Folders with JPG images'.cyan
    ];
    const questionType = readlineSync.keyInSelect(processType, '[SERVER]: Hello my master! What process do you want to run ?'.green);

    try {
        switch (questionType) {
            case 0: // Create all needed folders
                console.log(`[SERVER]: Ok, ${processType[questionType].toLocaleLowerCase()}`.green + ' goes to run.'.green);
                await createFolder("download");
                await createFolder("img_movie_posters");
                await createFolder("img_movie_backdrops");
                await createFolder("img_serial_posters");
                await createFolder("img_serial_backdrops");
                break;
            case 1: // Convert Images
                console.log(`[SERVER]: Ok, ${processType[questionType].toLocaleLowerCase()}`.green + ' goes to run.'.green);
                // Convert JPG posters and backdrops to webp format
                await imageConverter('img_movie_posters', 'build/movie_images_posters', 10, 20000);
                await imageConverter('img_movie_backdrops', 'build/movie_images_backdrop', 10, 20000);
                await imageConverter('img_serial_posters', 'build/serial_images_posters', 10, 20000);
                await imageConverter('img_serial_backdrops', 'build/serial_images_backdrop', 10, 20000);
                break;
            case 2: // Delete Folders with JPG
                console.log(`[SERVER]: Ok, ${processType[questionType].toLocaleLowerCase()}`.green + ' goes to run.'.green);
                // Delete folders with JPG posters and backdrops
                await deleteFolder("download");
                await deleteFolder("img_movie_posters");
                await deleteFolder("img_movie_backdrops");
                await deleteFolder("img_serial_posters");
                await deleteFolder("img_serial_backdrops");
                break;
            default:
                break;
        }
    } catch (e) {
        console.log(colors.red(e.message))
    }
})();