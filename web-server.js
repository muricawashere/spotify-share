var app = require('express')()
var mongoose = require('mongoose')
var cookieParser = require('cookie-parser')
app.use(cookieParser())

mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/discord')

var spotifyClient = mongoose.Schema({
    spotifyToken: String,
    discord_id: Number
})
var newUser = mongoose.model('spotifyClient', spotifyClient)

newUser.find({}).remove().exec()

app.get('/', (req, res) => {
    res.render('../web_server/step1.ejs')
})

app.get('/callback', (req, res) => {
    res.redirect('/')
})

app.get('/2', (req, res) => {
    console.log(req.cookies)
    var newClient = new newUser({
        spotifyToken: req.cookies.spotifytoken,
        discord_id: req.cookies.id
    })
    newClient.save().then(item => {
        res.render('../web_server/close.ejs')
        console.log(item)
    })
})

app.listen(3000, () => {console.log('listening')})