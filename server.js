const express = require("express");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const rateLimit = require('express-rate-limit');
require('dotenv').config({path:'cred.env'});

const app = express();
const port = 7000
const PORT = process.env.PORT || port;
const users = JSON.parse(process.env.USERS || '[]');


// Passport configuration
passport.use(new LocalStrategy(
    (username, password, done) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            console.log("User not logged in:", username);
            return done(null, false, { message: 'Incorrect username or password.' });
        }
        console.log("User logged in: ", username);
        return done(null, user);
    }
));
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});


//Limit on the users attempts
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);


// Session configuration
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 18 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && PORT !== port
    }
}));


// Initialize passport
app.use(passport.initialize());
app.use(passport.session());


// Login route
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
}));


// Import routes
const routes = require("./server/routes.js"); 
app.use(routes);


// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


// Start server
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});