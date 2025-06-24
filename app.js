const express = require("express");
require("express-async-errors");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

const app = express();
const csrf = require("host-csrf");
const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");
app.use(cookieParser(process.env.SESSION_SECRET || "notverysecret"));
app.use(require("body-parser").urlencoded({ extended: true }));

require("dotenv").config(); // to load the .env file into the process.env object

const session = require("express-session");

const MongoDBStore = require("connect-mongodb-session")(session);
const url = process.env.MONGO_URI;

const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: "mySessions",
});
store.on("error", function (error) {
  console.log(error);
});

const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};

let csrf_development_mode = true;
if (app.get("env") === "production") {
  csrf_development_mode = false;
  app.set("trust proxy", 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}
const csrf_options = {
  protected_operations: ["PATCH"],
  protected_content_types: ["application/json"],
  development_mode: csrf_development_mode,
};

const csrf_middleware = csrf(csrf_options);

app.use(session(sessionParms));
app.use(require("connect-flash")());
app.use(helmet());
app.use(xss());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const passport = require("passport");
const passportInit = require("./passport/passportInit");
passportInit();
app.use(passport.initialize());
app.use(passport.session());

app.use(csrf_middleware);

app.use(require("./middleware/storeLocals"));

app.get("/", (req, res) => {
  res.render("index", { _csrf: csrf.token(req, res) });
});
app.use("/sessions", require("./routes/sessionRoutes"));

// secret word handling
const secretWordRouter = require("./routes/secretWord");
const auth = require("./middleware/auth");
app.use("/secretWord", auth, secretWordRouter);

const jobsRouter = require("./routes/jobs");
app.use("/jobs", auth, jobsRouter);

app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
  if (err instanceof csrf.CSRFError) {
    res.status(403).send("Invalid CSRF token.");
  } else {
    res.status(500).send(err.message);
    console.log(err);
  }
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await require("./db/connect")(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
