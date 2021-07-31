const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require("express-session");
const alert = require('alert');
// import { AkismetClient } from 'akismet-api';

const {AkismetClient} = require('akismet-api');
const app = express();

// 7691756b3af5


const key = '7691756b3af5';
const blog = 'http://localhost:3000';
const lang = 'he';
const charset = 'UTF-8';
const client = new AkismetClient({ key, blog,lang, charset });








app.set('view engine', 'ejs');
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  expires: false
})); //, expires:false}

const mongoDBurl = "mongodb+srv://admin-or:123@cluster0.fukes.mongodb.net/Women?retryWrites=true&w=majority";
mongoose.connect(mongoDBurl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const commentSchema = new mongoose.Schema({
  ip:String,
  useragent:String,
  content: String,
  nickname: String,
  img: String,
  date: String,
  hour: String
});


const postSchema = new mongoose.Schema({
  nickname: String,
  img: String,
  title: String,
  content: String,
  date: String,
  views: [String],
  comments: [commentSchema]
});

const userSchema = new mongoose.Schema({
  userType:String,
  img: String,
  nickname: String,
  password: String
});

const eventSchema = new mongoose.Schema({
  nickname: String,
  img: String,
  title: String,
  location:String,
  content: String,
  date: String,
  hour:String,
  eventDate:String,
  views: [String],
  comments: [commentSchema]
});

const articleSchema = new mongoose.Schema({
  nickname:String,
  title:String,
  date:String,
  img:String,
  content: String,
  link:String,
  views: [String],
  comments: [commentSchema]
});

const Comment = new mongoose.model('Comment', commentSchema);
const Post = new mongoose.model('Post', postSchema);
const User = new mongoose.model('User', userSchema);
const YourselfPost = new mongoose.model('YourselfPost', postSchema);
const Event = new mongoose.model('Event', eventSchema);
const Article = new mongoose.model('Article', articleSchema);


app.get("/", async function(req, res) {

  if (req.session.user == null) {
    req.session.user = {nickname:"guest"};
  }
  var posts = await Post.find({}).exec();
  var yourSelfPosts = await YourselfPost.find({}).exec();
  var eventPosts = await Event.find({}).exec();
  var articlePosts = await Article.find({}).exec();

  postsAndViews = [];
  postsAndViews.push({len:posts.length,views:getViews(posts)});
  postsAndViews.push({len:yourSelfPosts.length,views:getViews(yourSelfPosts)});
  postsAndViews.push({len:eventPosts.length,views:getViews(eventPosts)});
  postsAndViews.push({len:articlePosts.length,views:getViews(articlePosts)});





  res.render("forum", {user: req.session.user,postAndViews:postsAndViews});
});


function getViews(posts){
  views=0;
  posts.forEach(function(post){
    views+=post.views.length;
  });

  return views;
}



app.get("/eventList", async function(req,res){
  var events = await Event.find({}).exec();
  sorted_events = events.sort((a, b) => new Date(a.date) - new Date(b.date));

  /*revers date from yyyy-mm-dd to dd-mm-yyyy */
  for (let index = 0; index < sorted_events.length; index++) {
    date = sorted_events[index].date.toString().split('-');
    sorted_events[index].date = date[2] + '/' + date[1] + '/' + date[0];
  }
  res.render("eventList",{user: req.session.user,events:sorted_events});
});




app.get("/articles",async function(req,res){
  var articles = await Article.find({}).exec();
  var forum = "articleList";

  sorted_articles = articles.sort((a, b) => new Date(a.date) - new Date(b.date));

  /*revers date from yyyy-mm-dd to dd-mm-yyyy */
  for (let index = 0; index < sorted_articles.length; index++) {
    date = sorted_articles[index].date.toString().split('-');
    sorted_articles[index].date = date[2] + '/' + date[1] + '/' + date[0];
  }
  res.render("postList",{posts:sorted_articles,user:req.session.user, forum:forum});

});



app.get("/postList", async function(req, res) {
  var posts = await Post.find({}).exec();
  let date;
  var forum = "postList"
  sorted_posts = posts.sort((a, b) => new Date(a.date) - new Date(b.date));

  /*revers date from yyyy-mm-dd to dd-mm-yyyy */
  for (let index = 0; index < sorted_posts.length; index++) {
    date = sorted_posts[index].date.toString().split('-');
    sorted_posts[index].date = date[2] + '/' + date[1] + '/' + date[0];

  }

  res.render("postList", {posts: sorted_posts.reverse(),user: req.session.user,forum: forum});
});


app.get("/posts/:postId", async function(req, res) {
  var postId = req.params.postId;

  var requestedPost = await Post.findOne({_id: postId}).exec();
  if (requestedPost == null) {
    var requestedPost = await YourselfPost.findOne({_id: postId}).exec();
    if(requestedPost == null){
      var requestedPost = await Event.findOne({_id: postId}).exec();
      if(requestedPost == null)
        var requestedPost = await Article.findOne({_id: postId}).exec();
      }
  }

  // console.log(req.session.user);
  var views = requestedPost.views;
  if (!views.includes(req.session.user.id) && req.session.user.nickname!="guest")
    views.push(req.session.user.id);

  await Post.updateOne({_id: postId}, {views: views}).exec();
  await YourselfPost.updateOne({_id: postId}, {views: views}).exec();
  await Article.updateOne({_id: postId}, {views: views}).exec();
  date = requestedPost.date.toString().split('-');
  requestedPost.date = date[2] + '/' + date[1] + '/' + date[0];

  for (var index = 0; index < requestedPost.comments.length; index++) {

    /*revers date from yyyy-mm-dd to dd-mm-yyyy */
    date = requestedPost.comments[index].date.toString().split('-');
    requestedPost.comments[index].date = date[2] + '/' + date[1] + '/' + date[0];


  }

  res.render("commentList", {
    post: requestedPost,
    user: req.session.user
  });
});

app.get("/events/:eventId", async function(req,res){
  var eventId = req.params.eventId;
  var requestedEvent = await Event.findOne({_id: eventId}).exec();
  var views = requestedEvent.views;
  if (!views.includes(req.session.user.id) && req.session.user.nickname!="guest")
    views.push(req.session.user.id);

  await Event.updateOne({_id: eventId}, {views: views}).exec();

  res.render("commentList", {
    post: requestedEvent,
    user: req.session.user
  });
});





app.get("/register", function(req, res) {
  res.render("register", {
    isExist: "false",
    user: req.session.user
  });
});

app.get("/login", function(req, res) {
  res.render("login", {logged: "false",user: req.session.user});
});

app.get("/LogOut", function(req, res) {
  req.session.user = null;
  res.redirect("/");
});

app.get("/yourSelfPosts", async function(req, res) {
  var posts = await YourselfPost.find({}).exec();
  let date;
  var forum = "yourSelfPosts";
  sorted_posts = posts.sort((a, b) => new Date(a.date) - new Date(b.date));

  /*revers date from yyyy-mm-dd to dd-mm-yyyy */
  for (let index = 0; index < sorted_posts.length; index++) {
    date = sorted_posts[index].date.toString().split('-');
    sorted_posts[index].date = date[2] + '/' + date[1] + '/' + date[0];

  }

  res.render("postList", {
    posts: sorted_posts.reverse(),
    user: req.session.user,
    forum: forum
  });
});




app.post("/posts/:postId", async function(req, res) {

  var content = req.body.comment;
  var today = new Date();
  var date = today.toISOString().split('T')[0];
  var hour = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var user_img = (await User.findOne({
    nickname: req.session.user.nickname}).exec()).img;



  var comment = new Comment({
    ip: '123.123.123.123',
    useragent: 'CommentorsAgent 1.0 WebKit',
    content: content,
    nickname: req.session.user.nickname,
    date: date,
    hour: hour,
    img: user_img
  });

  var postId = req.params.postId;

  try {
    const isSpam = await client.checkSpam(comment);

    if (isSpam){
      console.log('OMG Spam!');
      res.redirect("/posts/" + postId);
      return;

    }
    else
      console.log('Totally not spam');
  } catch (err) {
      console.error('Something went wrong:', err.message);
  }

  let requestedPost = await Post.findOne({_id: postId}).exec();

  if(requestedPost!=null){

    requestedPost.comments.push(comment);
    let commnets = requestedPost.comments;
    await Post.updateOne({_id: postId}, {comments: commnets}).exec();
  }
  else if(await YourselfPost.findOne({_id: postId}).exec()){
    let requestedPost = await YourselfPost.findOne({_id: postId}).exec();
    requestedPost.comments.push(comment);
    let commnets = requestedPost.comments;
    await YourselfPost.updateOne({_id: postId}, {comments: commnets}).exec();
}
  else if(await Event.findOne({_id: postId}).exec()){
  let requestedPost = await Event.findOne({_id: postId}).exec();
  requestedPost.comments.push(comment);
  let commnets = requestedPost.comments;
  await Event.updateOne({_id: postId}, {comments: commnets}).exec();
  }
  else{
    let requestedPost = await Article.findOne({_id: postId}).exec();
    requestedPost.comments.push(comment);
    let commnets = requestedPost.comments;
    await Article.updateOne({_id: postId}, {comments: commnets}).exec();
  }

  // res.render("commentList", {post: requestedPost,user: req.session.user});
  res.redirect("/posts/" + postId);
});

app.post("/postList", async function(req, res) {
  var nickname = req.session.user.nickname;
  var title = req.body.postTitle;
  var content = req.body.postContent;
  var today = new Date();
  var date = today.toISOString().split('T')[0];
  var views = [];
  var comments = [];

  var user_img = (await User.findOne({nickname: nickname}).exec()).img;

  var post = new Post({
    nickname: nickname,
    title: title,
    content: content,
    date: date,
    views: views,
    comments: comments,
    img: user_img
  });
  post.save();
  res.redirect("/postList");

});

app.post("/eventList", async function(req, res) {
  var nickname = req.session.user.nickname;
  var title = req.body.postTitle;
  var location = req.body.postLocation;
  var content = req.body.postContent;
  var today = new Date();
  var date = today.toISOString().split('T')[0];


  var eventDate = req.body.eventDate;

  eventDate = eventDate.toString().split('-');
  eventDate = eventDate[2] + '/' + eventDate[1] + '/' + eventDate[0];
  var hour = req.body.eventHour;
  var views = [];
  var comments = [];

  var user_img = (await User.findOne({nickname: nickname}).exec()).img;

  var event = new Event({
    nickname: nickname,
    title: title,
    location:location,
    content: content,
    hour:hour,
    date: date,
    eventDate:eventDate,
    views: views,
    comments: comments,
    img: user_img
  });
  event.save();
  res.redirect("/eventList");

});




app.post("/yourSelfPosts", async function(req, res) {
  var nickname = req.session.user.nickname;
  var title = req.body.postTitle;
  var content = req.body.postContent;
  var today = new Date();
  var date = today.toISOString().split('T')[0];
  var views = [];
  var comments = [];

  var user_img = (await User.findOne({
    nickname: nickname
  }).exec()).img;

  var post = new YourselfPost({
    nickname: nickname,
    title: title,
    content: content,
    date: date,
    views: views,
    comments: comments,
    img: user_img
  });
  post.save();
  res.redirect("/yourSelfPosts");

});

app.post("/articleList", async function(req,res){
  var nickname= req.session.user.nickname;
  var title = req.body.postTitle;
  var today = new Date();

  var date = today.toISOString().split('T')[0];
  var content = req.body.postContent;
  var link = req.body.link;
  var views=[];
  var comments=[];
  var img = (await User.findOne({
    nickname: nickname
  }).exec()).img;

  var article = new Article({
    nickname:nickname,
    title:title,
    date:date,
    img:img,
    content:content,
    link:link,
    views:views,
    comments:comments
  });
  article.save();
  res.redirect("/articles");
});




app.post("/register", async function(req, res) {
  var nickname = req.body.nickname;
  var password = req.body.password;
  User.findOne({
    nickname: nickname
  }, function(err, user) {
    if (user) {
      res.render("register", {
        isExist: "true",
        user: "guest"
      });
    } else {
      while (rnd != "8" && rnd != "3") {
        var rnd = (Math.floor(Math.random() * 8) + 1).toString();
      }
      var user = new User({
        userType:"user",
        nickname: nickname,
        img: "https://bootdey.com/img/Content/avatar/avatar" + rnd + ".png",
        password: password
      });
      user.save();
      res.redirect("login");
    }
  });
});


app.post("/login", async function(req, res) {
  var nickname = req.body.nickname;
  var password = req.body.password;
  User.findOne({
    nickname: nickname,
    password: password
  }, function(err, user) {
    if (user) {
      req.session.user = {nickname:user.nickname, id:user._id,userType:user.userType};

      res.render("forum", {user: req.session.user});
    } else {
      res.render("login", {logged: "true",user: req.session.user
      });
    }
  });
});

app.post("/deletePost",async function(req,res){
  var postId=req.body.postId;
  var forum=req.body.forum;
  if(forum=="yourSelfPosts"){
    await YourselfPost.deleteOne({_id:postId}).exec();
    res.redirect("/yourSelfPosts");

  }
  else if(forum=="postList"){
    await Post.deleteOne({_id:postId}).exec();
    res.redirect("/postList");
  }

  else if(forum=="articleList"){
    await Article.deleteOne({_id:postId}).exec();
    res.redirect("/articles");
  }

  else{
    await Event.deleteOne({_id:postId}).exec();
    res.redirect("/eventList");

  }


});


app.listen(3000, function() {
  console.log("server running on port 3000");
});
