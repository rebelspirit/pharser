const {Schema, model} = require('mongoose');

const schema = new Schema({
    backdrop_path: {type: String, default: null},
    created_by: {type: Array, default: null},
    episode_run_time: {type: Array, default: null},
    first_air_date: {type: String, default: null},
    genres: {type: Array, default: null},
    homepage: {type: String, default: null},
    id: {type: Number, default: null, required: true},
    imdb_id: {type: String, default: null},
    in_production: {type: Boolean, default: null},
    languages: {type: Array, default: null},
    last_air_date: {type: String, default: null},
    last_episode_to_air: {type: Object, default: null},
    name: {type: String, default: null},
    next_episode_to_air: {type: Object, default: null},
    networks: {type: Array, default: null},
    number_of_episodes: {type: Number, default: 0},
    number_of_seasons: {type: Number, default: 0},
    origin_country: {type: Array, default: null},
    original_language: {type: String, default: null},
    original_name: {type: String, default: null, required: true},
    overview: {type: String, default: null},
    popularity: {type: Number, default: 0},
    poster_path: {type: String, default: null},
    production_companies: {type: Array, default: null},
    seasons: {type: Array, default: null},
    status: {type: String, default: null},
    type: {type: String, default: null},
    vote_average: {type: Number, default: 0},
    vote_count: {type: Number, default: 0},
    kinopoisk_id: {type: String, default: null},
    iframe_src: {type: String, default: null},
    iframe: {type: String, default: null}
});

module.exports = model('serial', schema);