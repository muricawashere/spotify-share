const Discord = require('discord.js')
var mongoose = require('mongoose')
var SpotifyWebApi = require('spotify-web-api-node')
const client = new Discord.Client()

var DISCORD_TOKEN = 'NDg4NDQ1OTQ5NTM0OTI4OTA3.DncUkw.WV7iAsuKfrvdcJKLL-bE1ntKN0g'
var PREFIX = '!'

var SPOTIFY_ID = 'fb22713c7e084c338ac8ab2476bf2bea'
var SPOTIFY_SECRET = 'ad795b153d624d9d8af769ae1f760f63'
var SPOTIFY_SCOPES = 'user-top-read user-modify-playback-state user-read-currently-playing user-read-private user-read-email user-read-playback-state'

mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/discord')

var ClientSchema = mongoose.Schema({
    spotifyToken: String,
    discord_id: Number
})
var spotifyClient = mongoose.model('spotifyClient', ClientSchema)

var spotifyApi = new SpotifyWebApi({
    'clientId': SPOTIFY_ID,
    clientSecret: SPOTIFY_SECRET
})

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`)
    client.user.setPresence({status: 'online', game: {name: 'you -_-', type: 'WATCHING'}})
})

client.on('message', msg => {
    if(!msg.content.startsWith(PREFIX)) return;

    var messageArray = msg.content.split(' ')
    var command = messageArray[0].split('').slice(1, messageArray[0].length).join('')
    var args = messageArray.slice(1)

    console.log(command)
    console.log(args)

    var spotifyRole = msg.guild.roles.find('name', 'Linked With Spotify')
    if(!spotifyRole) {
        msg.guild.createRole({
            name: 'Linked With Spotify',
            color: 'GREEN'
        }).then(role => {
        })
    }

    if(command == 'unlink') {
        spotifyClient.findOneAndRemove({discord_id: msg.author.id}, function(data) {
            msg.member.removeRole(spotifyRole).catch(console.error)
            msg.reply('you have been unlinked')
        })
    }

    if(command == 'link') {
        spotifyClient.findOne({discord_id: msg.author.id}, (err, client) => {
            if(err) throw err;
            if(client) return msg.reply('your already linked but you can unlink with ```!unlink```')
            msg.reply('check your dms')
            msg.author.send({embed: {
                title: 'Link Spotify to Discord',
                url: createURL(msg.author.id),
                description: 'Click above to link with spotify'
            }})
            lookForUser(msg.author.id, function(client) {
                console.log(client.spotifyToken)
                spotifyApi.setAccessToken(client.spotifyToken)
                spotifyApi.getMe().then(function(data) {
                    console.log(data)
                    msg.author.send(`Hello, ${data.body.display_name || data.body.id} thanks for linking your account`)
                    msg.member.addRole(spotifyRole).catch(console.error)
                }, function(err) {
                    console.error(err)
                })
            })
        })
    }

    if(command == 'mytop') {
        var amount = args[1] || 10
        if(amount>50) amount = 50
        console.log(amount)
        if(!args[0] == 'songs' || !args[0] == 'artists') return msg.reply('choose "songs" or "artists" like ```!mytop songs [10]```')
        spotifyClient.findOne({discord_id: msg.author.id}, (err, client) => {
            if(err) throw err;
            if(!client) return msg.reply('looks like you havent set your account up')
            spotifyApi.setAccessToken(client.spotifyToken)
            if(args[0] == 'songs') {
                spotifyApi.getMyTopTracks({limit: amount}).then(function(topArtist) {
                    console.log(topArtist.body.items[1].artists)
                    var songArray = []
                    for(songNum in topArtist.body.items) {
                        console.log(topArtist.body.items[songNum].name)
                        songArray.push({
                            name: `${songNum+1}. ${topArtist.body.items[songNum].name}`,
                            value: `[${topArtist.body.items[songNum].artists[0].name}](${topArtist.body.items[songNum].artists[0].external_urls.spotify})`,
                            inline: true
                        })
                    }
                    msg.channel.send({embed: {
                        title: `**${msg.author.username}'s top ${amount}**`,
                        description: '',
                        fields: songArray
                    }})
                }, function(err) {console.error(err)})
            }
            if(args[0] == 'artists') {
            }
        })
    }

    if(command == 'me') {
        console.log(msg.author.id)
        spotifyClient.findOne({discord_id: msg.author.id}, (err, client) => {
            console.log(err, client)
            if(err) throw err;
            if(!client) return msg.reply('looks like you arent linked!')
            spotifyApi.setAccessToken(client.spotifyToken)
            spotifyApi.getMyCurrentPlaybackState().then(function(data) {
                console.log(data.body.item.name)
                //msg.reply(`your listening to ${data.body.item.name} by ${data.body.item.album.artists[0].name}`)
                msg.channel.send({embed: {
                    title: data.body.item.name,
                    description: data.body.item.album.artists[0].name,
                    url: data.body.item.external_urls.spotify,
                    thumbnail: {
                        url: data.body.item.album.images[0].url
                    },
                    color: 0x2ecc71
                }})
                console.log(data.body.item.album.images[0].url)
            }, function(err) {
                console.error(err)
            })
        })
    }

    if(command == 'state') {
        var player = msg.guild.member(msg.mentions.users.first()) || msg.guild.members.get(args[0]) || msg.guild.members.get("name", args[0])
        //console.log(player)
        if(!player) return msg.reply('no user found :/')
        spotifyClient.findOne({discord_id: player.id}, (err, client) => {
            if(err) throw err;
            if(!client) return msg.reply('looks like they havent linked there account yet')
            spotifyApi.setAccessToken(client.spotifyToken)
            spotifyApi.getMyCurrentPlaybackState().then(function(data) {
                msg.channel.send({embed: {
                    title: data.body.item.name,
                    description: data.body.item.album.artists[0].name,
                    url: data.body.item.external_urls.spotify,
                    thumbnail: {
                        url: data.body.item.album.images[0].url
                    },
                    color: 0x2ecc71
                }}).then(message => {

                })
            }, function(err) {
                console.error(err)
            })
        })
    }

    if(command == 'search') {
        var searchString = args.join(' ')
        if(!searchString) return msg.reply('you didnt search for anything')
        spotifyClient.findOne({discord_id: msg.author.id}, (err, client) => {
            if(err) throw err;
            if(!client) return msg.reply('looks like you havent set your account up!')
            console.log(err, client)
            spotifyApi.setAccessToken(client.spotifyToken)
            spotifyApi.search(searchString, ['track'], {limit: 10}).then(data => {
                //console.log(data.body.tracks.items)
                var index = 0
                msg.channel.send(`__**Search Results**__
${data.body.tracks.items.map(song => `**${++index}**. **${song.name}** - **${song.album.artists[0].name}**`).join('\n')}
\n
__If you want to play a song respond with your selection__`)
                try {
                    msg.channel.awaitMessages(remsg => remsg.content > 0 && remsg < 11, {
                        maxMatches: 1,
                        time: 10000,
                        errors: ['time']
                    }).then((collected) => {
                        var songID = parseInt(collected.first().content)
                        console.log(songID, client.spotifyToken, data.body.tracks.items[songID - 1].uri)
                        playTrack(client.spotifyToken, data.body.tracks.items[songID - 1].uri, msg, 0)
                    }).catch(err => console.error(err))
                } catch(err) {
                    console.log(err)
                }
            }, err => console.error(err))
        })
    }

    if(command == 'artists') {
        var searchString = args.join(' ')
        if(!searchString) return msg.reply('you didnt search for anything')
        spotifyClient.findOne({discord_id: msg.author.id}, (err, client) => {
            if(err) throw err;
            if(!client) return msg.reply('looks like you havent set your account up!')
            spotifyApi.setAccessToken(client.spotifyToken)
            spotifyApi.search(searchString, ['artist'], {limit: 10}).then(data => {
                var index = 0
                console.log(data.body.items)
                msg.channel.send(`__**Search Results**__`)
            }, err => {console.error(err)})
        })
    }

    if(command == 'join') {
        var host = msg.guild.member(msg.mentions.users.first()) || msg.guild.members.get(args[0]) || msg.guild.members.get("name", args[0])
        if(!host) return msg.reply('no user found')
        console.log(host.user.id)
        spotifyClient.findOne({discord_id: host.user.id}, function(err, host) {
            if(err) throw err;
            if(!host) return msg.reply('looks like they havent set their account up!')
            spotifyApi.setAccessToken(host.spotifyToken)
            spotifyApi.getMyCurrentPlaybackState().then(function(hoststate) {
                console.log(hoststate.body)
                if(!hoststate.body.is_playing) return msg.reply('they arent playing anything right now :(')
                spotifyClient.findOne({discord_id: msg.author.id}, (err, player) => {
                    if(err) throw err;
                    if(!player) return msg.reply('you havent set your account up!')
                    console.log(player)
                    spotifyApi.setAccessToken(player.spotifyToken)
                    spotifyApi.getMyCurrentPlaybackState().then(function(playerdat) {
                        console.log(playerdat.body)
                        if(!playerdat.body.device.id) return msg.reply('try changing the device your listening to this on')
                        var playopts = {
                            device_id: playerdat.body.device.id,
                            uris: [hoststate.body.item.uri]
                        }
                        if(args[0] == 'begin') {
                            playopts.position_ms = ''
                        }
                        spotifyApi.play(playopts).then(function(data) {
                            msg.reply(`now playing ${playerdat.body.item.name} on your account`)
                        }, function(err) {
                            console.error(err)
                        })
                    },function(err) {
                        console.error(err)
                    })
                })
            },function(err) {
                console.error(err)
            })
        })
    }
    //console.log(msg.content)
})

client.login(DISCORD_TOKEN).then(console.log).catch(console.error)

function playTrack(spotifyToken, songURI, msg, location) {
    console.log('play')
    if(!location) {location = 0}
    spotifyApi.setAccessToken(spotifyToken)
    spotifyApi.getMyCurrentPlaybackState().then(function(playerdat) {
        if(!playerdat.body.device.id) return msg.reply('try changing the device your listening to this on')
        spotifyApi.play({
            device_id: playerdat.body.device.id,
            uris: [songURI],
            position_ms: location
        }).then(function(data) {
            return data
        }, function(err) {throw err})
    })
}

function createURL(theirID) {
    return 'https://accounts.spotify.com/authorize?response_type=token&client_id=' + SPOTIFY_ID + `&state=${theirID}` +('&scope=' + encodeURIComponent(SPOTIFY_SCOPES)) + '&redirect_uri=' + encodeURIComponent('http://206.189.73.140:3000')
}

function lookForUser(searchID, callback) {
    console.log(`looking for ${searchID}`)
    spotifyClient.findOne({discord_id: searchID}, (err, client) => {
        if(err) throw err;
        if(!client) return setTimeout(function() {lookForUser(searchID, callback)}, 1000);
        console.log(client)
        callback(client)
    })
}

function findHost(people, hostid) {
    if(hostid == people[0].discord_id) {
        return people[0]
    } else {
        return people[1]
    }
}

function findClient(people, clientid) {
    if(clientid == people[0].discord_id) {
        return people[0]
    } else {
        return people[1]
    }
}