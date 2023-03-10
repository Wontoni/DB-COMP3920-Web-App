require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const expireTime = 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

//Users and Passwords (in memory 'database')
var users = []; 

/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.dyx5jlr.mongodb.net/?retryWrites=true&w=majority`,
	crypto: {
		secret: mongodb_session_secret
	}
});

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}));

app.get('/', (req,res) => { // Homepage
    if (req.session.authenticated) {
        res.redirect('/members');
    } else {
        res.render("index")
    }
}); 

app.get('/signup', (req,res) => { // Get Signup
    if (req.session.authenticated) {
        res.redirect('/members');
    } else {
        var userMsg = req.query.userMsg;
        var passMsg = req.query.passMsg;
        var emailMsg = req.query.emailMsg;
        res.render("signup", {userMsg: userMsg, emailMsg: emailMsg, passMsg: passMsg})
    }
});

app.post('/createUser', (req,res)=> { // Post Signup
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    var hashedPassword = bcrypt.hashSync(password, saltRounds);


    if (email && password && username) {
        users.push({ username: username, email: email, password: hashedPassword });
        res.redirect('/')
    } else {
        if(!username) {
            var userMsg = "Please enter a username.";
        }
        if (!password) {
            var passMsg = "Please enter a password.";
        }
        if (!email) {
            var emailMsg = "Please enter an email.";
        }

        res.redirect(`/signup?userMsg=${userMsg}&emailMsg=${emailMsg}&passMsg=${passMsg}`)
    }
});


app.get('/login', (req,res) => { // Get Login
    if (req.session.authenticated) {
        res.redirect('/members');
    } else {
        var userMsg = req.query.userMsg;
        var passMsg = req.query.passMsg;
        res.render("login" , {userMsg: userMsg, passMsg: passMsg})
    }
});

app.post('/loginUser', (req,res)=> { // Post Login
    var username = req.body.username;
    var password = req.body.password;

    if (username && password) {
        for (i = 0; i < users.length; i++) {
            if (users[i].username == username) {
                if (bcrypt.compareSync(password, users[i].password)) {
                    req.session.authenticated = true;
                    req.session.username = username;
                    req.session.cookie.maxAge = expireTime;
            
                    res.redirect('/members');
                    return;
                }
            }
        }
    
        //user and password combination not found
        res.redirect("/login");
    } else {
        if(!username) {
            var userMsg = "Please enter a username."
        }
        if (!password) {
            var passMsg = "Please enter a password."
        }

        res.redirect(`/login?userMsg=${userMsg}&passMsg=${passMsg}`)
    }

});

app.get('/members', (req,res) =>{ // Members Page
    if (!req.session.authenticated) {
        res.redirect('/login');
    } else {
        var username = req.session.username;
        var imgId = Math.floor(Math.random() * 4 + 1)
        res.render("members", {username: username, imgId: imgId})
    }
});

app.post('/sign-out', (req,res) => {
    req.session.authenticated = false;
    res.redirect("/")
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => { // 404 Catch All
	res.status(404);
	res.render("404")
});

app.listen(port, () => {
	console.log("Node application listening on port " + port);
}); 