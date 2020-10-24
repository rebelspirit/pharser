const {Schema, model} = require('mongoose');

const schema = new Schema({
    adult: {type: Boolean, default: false},
    backdrop_path: {type: String, default: null},
    belongs_to_collection: {type: Array, default: null},
    budget: {type: Number, default: 0},
    genres: {type: Array, default: null},
    homepage: {type: String, default: null},
    id: {type: Number, default: null, required: true},
    imdb_id: {type: String, default: null},
    original_language: {type: String, default: null},
    original_title: {type: String, default: null, required: true},
    overview: {type: String, default: null},
    popularity: {type: Number, default: 0},
    poster_path: {type: String, default: null},
    production_companies: {type: Array, default: null},
    production_countries: {type: Array, default: null},
    release_date: {type: String, default: null},
    revenue: {type: Number, default: null},
    runtime: {type: Number, default: null},
    spoken_languages: {type: Array, default: null},
    status: {type: String, default: null},
    tagline: {type: String, default: null},
    title: {type: String, default: null},
    video: {type: Boolean, default: false},
    vote_average: {type: Number, default: 0},
    vote_count: {type: Number, default: 0},
    kinopoisk_id: {type: String, default: null},
    iframe_src: {type: String, default: null},
    iframe: {type: String, default: null}
});

module.exports = model('movie', schema);