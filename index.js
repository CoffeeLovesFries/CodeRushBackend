/*
    JPCS Code Rush Game for JPCSCart: Code Rush
    Created: September 23, 2023
    Note: This is a single file service for 
          the DLSL Enlistment Week 2023 as
          such a light game doesn't really
          require that much complex file and
          folder structure to begin with. 
    Author: Coffee Delulu of C1A 2023
*/
const PORT = process.env.PORT || 4000;

const express = require("express");
const app = express();

const server = app.listen(PORT, () => {});
const cors = require("cors")

const ioServer = require("socket.io")(server, {
    cors: {
        origin: ["http://localhost:3001", "https://5tszpsmv-3001.asse.devtunnels.ms/", "https://needed-wrench-production.up.railway.app"],
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});
const util = require('util');


const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(cors({ origin: ["https://5tszpsmv-3001.asse.devtunnels.ms/"] }));
app.use(bodyParser.urlencoded({ extended: false }));


const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('coderush.db')
const readline = require('readline');
const generateRandomName = require("./randomNameGenerator");
const { ResultManager } = require("./resultManager");
const { RoomManager } = require("./roomManager");


// map of user id to room id
const userRaceMap = {};

// map of challenge id to room id
const roomChallengeMap = {};

const resultManager = new ResultManager();
const roomManager = new RoomManager();


console.log("JPCS Code Rush Backend Service")

// Database Initialization

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS players(
        uuid TEXT NOT NULL PRIMARY KEY CHECK (uuid <> ''),
        name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (name <> ''),
        top_wpm INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    )`)
})

// Routing 

app.get('/', (req, res) => {
    console.log(req.method + ' Request From ' + req.hostname + ' > ' + req.path)
    res.json(
        {
            message: 'CodeRush Api Works :)',
            from: 'Coffee'
        })
})

app.post('/api/v2/player', (req, res) => {
    if (!req.body.hasOwnProperty('type')) {
        res.status(400).json(
            {
                error: 'Bad Request',
                message: "No 'type' property in api request"
            })
        return
    }

    if (!req.body.hasOwnProperty('data')) {
        res.status(400).json(
            {
                error: 'Bad Request',
                message: "No 'data' property in api request"
            })
        return
    }

    const { type, data } = req.body

    console.log('API Call Type: ' + type)

    if (type == 'register_player') {

    }
    else if (type == 'player_data_request') {
        if (!data.hasOwnProperty('uuid')) {
            res.status(400).json(
                {
                    error: 'Bad Request',
                    message: "No 'uuid' property in api request"
                })
            return
        }

        const { uuid } = data

        const query = 'SELECT * FROM players WHERE uuid COLLATE NOCASE = ?'

        db.all(query, [uuid], (err, rows) => {
            if (err) {
                console.error(`Error retrieving player data: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
            }
            else {
                if (rows.length > 0) {
                    res.status(200).json({ data: rows })
                }
                else {
                    console.log('Player Not Found')
                    res.status(400).json(
                        {
                            error: 'Player Not Found',
                            message: "Idk bro, player doesn't exist"
                        })
                    return
                }
            }
        })
    }
    else if (type == 'request_all_player_data') {
        const query = 'SELECT * FROM players'

        db.all(query, (err, rows) => {
            if (err) {
                console.error(`Error retrieving player data: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
            }
            else {
                res.status(200).json({ data: rows })
            }
        })
    }
    else if (type == 'increment_player_game_count') {

    }
    else if (type == 'update_player_top_wpm') {
        if (!data.hasOwnProperty('uuid')) {
            res.status(400).json(
                {
                    error: 'Bad Request',
                    message: "No 'uuid' property in api request"
                })
            return
        }

        if (!data.hasOwnProperty('wpm')) {
            res.status(400).json(
                {
                    error: 'Bad Request',
                    message: "No 'wpm' property in api request"
                })
            return
        }

        const { uuid, wpm } = data

        const querySelectTotalWPM = 'SELECT top_wpm FROM players WHERE uuid = ?'

        db.get(querySelectTotalWPM, [uuid], function (err, row) {
            if (err) {
                console.error(`Error retrieving top_wpm: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
                return
            }

            if (row && row.top_wpm > wpm) {
                console.log(`The existing top_wpm (${row.top_wpm}) is higher than the incoming WPM (${wpm}). No update is performed.`)
                res.status(400).json(
                    {
                        error: 'Bad Request',
                        message: "Incoming WPM is higher than current Top WPM in api request"
                    })
            }
            else {
                const queryUpdateTotalWPM = 'UPDATE players SET top_wpm = ? WHERE uuid = ?'

                db.run(queryUpdateTotalWPM, [wpm, uuid], function (err) {
                    if (err) {
                        console.error(`Error updating top_wpm: ${err.message}`)
                        res.status(400).json({ error: 'Internal Server Error' })
                    }
                    else {
                        console.log(`Top WPM updated for player with UUID ${uuid}`)
                        res.status(200).json({ message: "OK" })
                    }
                })
            }
        })
    }
    else {
        console.error(`Invalid Request Attempt`)
        res.status(400).json(
            {
                error: 'Bad Request',
                message: 'Invalid API Request. Why?'
            })
    }
});

const query = 'SELECT * FROM players WHERE uuid COLLATE NOCASE = ?'
function getPlayer(uuid) {

    const all = util.promisify(db.all.bind(db));
    return all(query, [uuid]).then((rows, err) => {
        if (err) {
            console.error(`Error retrieving player data: ${JSON.stringify(err)}`)
            return null;
        } else {
            if (rows.length > 0) {
                return rows[0];
            } else {
                console.log('Player Not Found')
                return null;
            }
        }
    });
}

async function registerPlayer(uuid, name) {

    if (name == null) {
        name = generateRandomName();
    }

    if (name.length < 3) {
        console.err("Name is too short");
        return;
    }

    if (/[^a-zA-Z0-9_-]/.test(name)) {
        console.error("Name contains invalid characters");
        return;
    }

    const run = util.promisify(db.run.bind(db));
    await run(`INSERT INTO players 
    (
        uuid, 
        name
    ) 
    VALUES (?, ?)`,
        [
            uuid,
            name
        ],
        function (err) {
            if (err) {
                console.error(`Error adding new player ${name}:`, err.message)
                return;
            } else {
                console.log(`New player ${name} added with row id ${this.lastID}!`)
                return;
            }
        });

}



// events
ioServer.on('connection', async (socket) => {
    const userId = socket.request._query['userId'];
    const sessionId = socket.id;

    var player = await getPlayer(userId);
    if (player == null) {
        console.log("Registering Player: " + userId);
        await registerPlayer(userId, null);
        console.log("Registered Player: " + (player = await getPlayer(userId)).name);
    }

    console.log(player.name + " connected.");

    socket.on('disconnect', () => {
        const raceId = userRaceMap[userId];
        if (raceId) {
            roomManager.leaveRace(raceId, userId);
            userRaceMap[userId] = null;
        }
    });


    socket.on('player_data_request', (data) => {
        console.log('player_data_request: ' + data);
    });


    socket.on('join', raceId => {
        console.log('join: ' + raceId);

        const room = roomManager.getRaceById(raceId);
        if (!room) {
            console.error("Room " + raceId + " not found");
            return;
        }

        socket.join(raceId);
        roomManager.joinRace(raceId, userId);

        ioServer.to(raceId).emit('member_joined', {
            id: userId,
            username: player.name,
            progress: 0,
            recentlyTypedLiteral: '',
        });
        socket.emit('race_joined', {
            ...room,
            challenge: roomChallengeMap[raceId],
        });
    });

    // user started playing
    socket.on('play', (data) => {
        console.log("Play: " + userId);

        const challenge = {
            project: {
                fullName: 'JPCS Cart',
                language: 'javascript',
                licenseName: 'MIT',
            },
            url: '',
            content: "i'm sorry baby, i love you so much ^__^",
            path: 'index.js',
        }

        var roomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        roomChallengeMap[roomId] = challenge;
        userRaceMap[userId] = roomId;

        const room = roomManager.createRace(roomId, userId);
        if (!room) {
            console.error("Internal server error while creating room.");
        }

        roomManager.joinRace(roomId, userId);
        socket.join(roomId);

        ioServer.to(roomId).emit('race_joined', {
            ...room,
            challenge: challenge,
        });
    });

    // called on multiplayer only
    socket.on('start_race', (data) => {
        console.log("Race Started");

        const raceId = userRaceMap[userId];
        roomManager.startRace(raceId);

        let count = 5;
        const interval = setInterval(() => {
            ioServer.to(raceId).emit('countdown', count);
            count--;
            if (count === 0) {
                clearInterval(interval);
                ioServer.to(raceId).emit('countdown', null);

                ioServer.to(raceId).emit('race_started', new Date().getTime());
            }
        }, 1000);
    });

    socket.on('key_stroke', async (keyStroke) => {
        keyStroke["timestamp"] = Date.now();

        var roomId = userRaceMap[userId];

        var room = roomManager.getRaceById(roomId);
        if (room == null) {
            console.error("Room " + roomId + " not found")
            return;
        }

        const keyStrokes = room.players[userId].keyStrokes;
        if (keyStrokes.length == 0) {
            room.startTime = keyStroke.timestamp;
        }

        keyStrokes.push(keyStroke);

        if (keyStroke["correct"]) {
            await updateProgress(userId, socket);
        }

        const progress = room.players[userId].progress;


        if (progress == 100) {
            const result = resultManager.getResult(roomChallengeMap[roomId].content, room, roomId, await getPlayer(userId));
            ioServer.to(roomId).emit('race_completed', result);
        }

        // only finish race if all players are done
        const participants = roomManager.getParticipants(roomId);
        const allDone = Object.keys(participants).map((userId) => {
            return participants[userId].progress;
        }).filter((progress) => progress < 100).length == 0;
        if (allDone) {
            roomManager.finishRace(roomId);
        }
    });


});

async function updateProgress(userId, socket) {
    const roomId = userRaceMap[userId];

    const player = await getPlayer(userId);
    if (player == null) {
        console.error("Player " + userId + " not found");
        return;
    }

    const room = roomManager.getRaceById(roomId);
    if (room == null) {
        console.error(`Unable to upate progres for ${userId}`);
        return;
    }
    const challengeContent = roomChallengeMap[roomId];


    const keyStrokes = room.players[userId].keyStrokes;

    const currentInput = keyStrokes.filter((keyStroke) => {
        return keyStroke["correct"] || false;
    }).map((e) => e['key']).join('');

    const code = challengeContent.content;
    const progress = Math.floor(
        (currentInput.length / code.length) * 100,
    );

    room.players[userId].progress = progress;

    ioServer.to(roomId).emit('progress_updated', {
        id: userId,
        username: player.name,
        progress: progress,
        recentlyTypedLiteral: currentInput,
    });

}


// Commands Listener

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

// Function to process user input

function processInput(input) {
    const [command, ...params] = input.split(' ')

    switch (command.toLowerCase()) {
        case 'hello':
            console.log('Hello!')
            break
        case 'add':
            const sum = params.map(Number).reduce((acc, val) => acc + val, 0)
            console.log('Sum:', sum)
            break
        case 'deluser':
            if (params.length < 1)
                break
            const nameToDelete = params[0].toLowerCase()
            const query = 'DELETE FROM players WHERE name COLLATE NOCASE = ?'
            db.run(query, [nameToDelete], function (err) {
                if (err) {
                    console.error(`Error deleting row: ${err.message}`)
                }
                else {
                    console.log(`Row(s) deleted: ${this.changes}`)
                }
            })
            break
        default:
            console.log('Unknown command:', command)
    }

    // Ask for the next input
    rl.question('', processInput)
}

// Start by asking for the first input
rl.question('', processInput)