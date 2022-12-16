require('dotenv').config()

const path = require('path');

const mongoose = require('mongoose')
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');


const app = express();
const store = new MongoDBStore({
    uri: process.env.MONGO_URL,
    collection: 'sessions'
});

const csrfProtection = csrf();


mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

app.set('view engine', 'ejs')
app.set('views', 'views')

const User = require('./models/user');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.use(csrfProtection);

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => console.log(err));
});

app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAdmin = req.session.isAdmin;
    res.locals.user = req.session.user;
    next();
});

const trilasRoutes = require('./routes/trials')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')

app.use('/trials',trilasRoutes)
app.use('/user', userRoutes)
app.use('/admin', adminRoutes)

app.get('/', (req, res, next) => {
    res.render('home');
})


module.exports = app