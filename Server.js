const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/forum");

const User = mongoose.model("User", {
  username: String,
  password: String,
  role: { type: String, default: "user" }
});

const Comment = mongoose.model("Comment", {
  content: String,
  user: String
});

const Post = mongoose.model("Post", {
  title: String,
  content: String,
  author: String,
  likes: { type: Number, default: 0 },
  comments: [Comment]
});

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("No token");
  try {
    const decoded = jwt.verify(token, "SECRET");
    req.user = decoded;
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

app.post("/register", async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  await User.create({ username: req.body.username, password: hashed });
  res.send("Registered");
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.send("No user");

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.send("Wrong password");

  const token = jwt.sign(
    { username: user.username, role: user.role },
    "SECRET"
  );
  res.json({ token });
});

app.post("/post", auth, async (req, res) => {
  await Post.create({
    title: req.body.title,
    content: req.body.content,
    author: req.user.username
  });
  res.send("Post created");
});

app.get("/posts", async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

app.post("/like/:id", auth, async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.send("Liked");
});

app.post("/comment/:id", auth, async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, {
    $push: { comments: { content: req.body.content, user: req.user.username } }
  });
  res.send("Comment added");
});

app.listen(3000, () => console.log("Server running on port 3000"));
