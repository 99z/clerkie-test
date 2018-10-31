const mongoose = require('mongoose');
const mongoURL = 'mongodb://localhost/interview_challenge';

mongoose.connect(mongoURL);
mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Mongo connection error'));
