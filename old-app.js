const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const bcrypt = require("bcrypt");
const joi = require("joi");
const { client, connectDB } = require("./connectDB");
const db = client.db(process.env.MONGODB_DATABASE || "sessions");
const ejs = require("ejs");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.NODE_SESSION_SECRET || "default_secret",
    store: MongoStore.create({
      client: client,
      dbName: process.env.MONGODB_DATABASE || "sessions",
      crypto: {
        secret: process.env.MONGODB_SESSION_SECRET || "default_session_secret",
      },
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Home Page
app.get("/", (req, res) => {
  const loginRegister = `
    <!DOCTYPE html>
    <html>
    <head>
    <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <div class="container">
            <h1>Welcome to the Home Page</h1>
            <br>
            <a href="/login">Login</a>
            <a href="/signup">Signup</a>
        </div>
    </body>
    </html>
    `;

  const signedIn = `
    <!DOCTYPE html>
    <html>
    <head>
    <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <div class="container">
            <h1>Hello, ${req.session.username}</h1>
            <br>
            <a href="/members">Go to Members Area</a>
            <a href="/logout">Logout</a>
        </div>
    </body>
    </html>
    `;

  if (!req.session.authenticated) {
    res.send(loginRegister);
  } else {
    res.send(signedIn);
  }
});

// Login Page
app.get("/login", (req, res) => {
  const form = `
        <form action="/loginSubmit" method="POST">
            <label>Login</label>
            <input type="email" name="email" placeholder="Enter your email" required/>
            <input type="password" name="password" placeholder="Enter your password" required/>
            <button type="submit">Submit</button>
        </form>
    `;
  res.send(form);
});

// Login Submission
app.post("/loginSubmit", async (req, res) => {
  const { email, password } = req.body;

  const joiSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(3).required(),
  });

  const validatedResult = joiSchema.validate(req.body);

  if (validatedResult.error) {
    return res.send(`Invalid input. <a href="/login">Try again</a>`);
  }

  const user = await db.collection("users").findOne({ email });

  if (!user) {
    return res.send(`Invalid gmail. <a href="/login">Try again</a>`);
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.send(`Invalid password. <a href="/login">Try again</a>`);
  }

  req.session.authenticated = true;
  req.session.username = user.username;
  req.session.cookie.maxAge = 60 * 60 * 1000;

  res.redirect("/members");
});

// Signup Page
app.get("/signup", (req, res) => {
  const form = `
        <form action="/signupSubmit" method="POST">
            <label>Create user</label>
            <input type="text" name="username" placeholder="Enter your username" required/>
            <input type="email" name="email" placeholder="Enter your email" required/>
            <input type="password" name="password" placeholder="Enter your password" required/>
            <button type="submit">Submit</button>
        </form>
    `;
  res.send(form);
});

// Signup Submission
app.post("/signupSubmit", async (req, res) => {
  const { username, email, password } = req.body;

  const schema = joi.object({
    username: joi.string().alphanum().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().min(3).required(),
  });

  // Returns an object with value and error properties.
  // If validation fails, error will contain details about the failure.
  const validationResult = schema.validate(req.body);

  if (validationResult.error) {
    return res.send(`Invalid input. <a href="/signup">Try again</a>`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.collection("users").insertOne({
    username: username,
    email: email,
    password: hashedPassword,
  });

  req.session.authenticated = true;
  req.session.username = username;
  req.session.cookie.maxAge = 60 * 60 * 1000;

  res.redirect("/members");
});

// Members Area Page
app.get("/members", (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/");
  }

  const images = ["cat1.jpg", "cat2.jpg", "cat3.jpg"];
  const randomImage = images[Math.floor(Math.random() * images.length)];

  const welcomeMessage = `
    <!DOCTYPE html>
    <html>
    <head>
    <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <div class="container">
          <h1>Hello, ${req.session.username}</h1>
          <br>
          <img src="/images/${randomImage}" alt="random cat image">
          <br>
          <a href="/logout">Logout</a>
        </div>
    </body>
    </html>
  `;

  res.send(welcomeMessage);
});

// Logout Page
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// 404 Page
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 - Not Found</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/">Go back home</a>
        </div>
      </body>
    </html>
  `);
});

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
