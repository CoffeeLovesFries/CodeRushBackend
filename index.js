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

const express = require('express')
const app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('coderush.db')
const readline = require('readline')

console.log("JPCS Code Rush Backend Service")

// Database Initialization

db.serialize(() => 
{
    db.run(`CREATE TABLE IF NOT EXISTS players(
        uuid TEXT NOT NULL PRIMARY KEY CHECK (uuid <> ''),
        name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (name <> ''),
        top_wpm INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    )`)
})

// Routing 

app.get('/', (req, res) => 
{
    console.log(req.method + ' Request From ' + req.hostname + ' > ' + req.path)
    res.json(
    {
        message: 'CodeRush Api Works :)',
        from: 'Coffee'
    })
})

app.post('/api/v2/player', (req, res) => 
{
    if (!req.body.hasOwnProperty('type'))
    {
        res.status(400).json(
        { 
            error: 'Bad Request',
            message: "No 'type' property in api request" 
        })
        return
    }

    if (!req.body.hasOwnProperty('data'))
    {
        res.status(400).json(
        { 
            error: 'Bad Request',
            message: "No 'data' property in api request" 
        })
        return
    }

    const { type, data } = req.body

    console.log('API Call Type: ' + type)

    if (type == 'register_player') 
    {
        if (!data.hasOwnProperty('uuid'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'uuid' property in api request" 
            })
            return
        }

        if (!data.hasOwnProperty('name'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'name' property in api request" 
            })
            return
        }

        const { uuid, name } = data

        if (name.length < 3)
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "Name is too short" 
            })
            return
        }

        if (name.length > 15)
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "Name is too long" 
            })
            return
        }

        if (/[^a-zA-Z0-9_]/.test(name)) 
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "Name has invalid characters" 
            })
            return
        }

        db.run(`INSERT INTO players 
        (
            uuid, 
            name
        ) 
        VALUES (?, ?)`, 
        [
            uuid, 
            name
        ], 
        function (err) 
        {
            if (err) 
            {
                console.error(`Error adding new player ${name}:`, err.message)
                if (err.message == 'SQLITE_CONSTRAINT: UNIQUE constraint failed: players.uuid')
                {
                    res.status(400).json(
                    { 
                        error: 'UUID Exists',
                        message: err.message
                    })
                }
                else if (err.message == "SQLITE_CONSTRAINT: UNIQUE constraint failed: players.name")
                {
                    res.status(400).json(
                    { 
                        error: 'Name Exists',
                        message: err.message
                    })
                }
                else if (err.message == "SQLITE_CONSTRAINT: CHECK constraint failed: uuid <> ''")
                {
                    res.status(400).json(
                    { 
                        error: 'UUID Empty',
                        message: err.message
                    })
                }
                else if (err.message == "SQLITE_CONSTRAINT: CHECK constraint failed: name <> ''")
                {
                    res.status(400).json(
                    { 
                        error: 'Name Empty',
                        message: err.message
                    })
                }
                else
                {
                    res.status(400).json(
                    { 
                        error: 'Unknown Error',
                        message: err.message
                    })
                }
                return
            } 
            else 
            {
                console.log(`New player ${name} added with row id ${this.lastID}!`)
                res.status(200).json({ message: "OK" })
                return
            }
        })
    }
    else if (type == 'player_data_request') 
    {
        if (!data.hasOwnProperty('uuid'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'uuid' property in api request" 
            })
            return
        }

        const { uuid } = data

        const query = 'SELECT * FROM players WHERE uuid COLLATE NOCASE = ?'
        
        db.all(query, [uuid], (err, rows) => 
        {
            if (err) 
            {
                console.error(`Error retrieving player data: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
            } 
            else 
            {
                if (rows.length > 0) 
                {
                    res.status(200).json({ data: rows })
                } 
                else 
                {
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
    else if (type == 'request_all_player_data') 
    {
        const query = 'SELECT * FROM players'

        db.all(query, (err, rows) => 
        {
            if (err) 
            {
                console.error(`Error retrieving player data: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
            }
            else 
            {
                res.status(200).json({ data: rows })
            }
        })
    }
    else if (type == 'increment_player_game_count')
    {
        if (!data.hasOwnProperty('uuid'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'uuid' property in api request" 
            })
            return
        }

        const query = 'UPDATE players SET total_games = total_games + 1 WHERE uuid = ?'

        const { uuid } = data

        db.run(query, [uuid], function (err) 
        {
            if (err) 
            {
                console.error(`Error updating total_games: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
            } 
            else 
            {
                console.log(`Total games updated for player with UUID ${uuid}`)
                res.status(200).json({ message: "OK" })
            }
        })
    }
    else if (type == 'update_player_top_wpm')
    {
        if (!data.hasOwnProperty('uuid'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'uuid' property in api request" 
            })
            return
        }

        if (!data.hasOwnProperty('wpm'))
        {
            res.status(400).json(
            { 
                error: 'Bad Request',
                message: "No 'wpm' property in api request" 
            })
            return
        }

        const { uuid, wpm } = data

        const querySelectTotalWPM = 'SELECT top_wpm FROM players WHERE uuid = ?'

        db.get(querySelectTotalWPM, [uuid], function (err, row) 
        {
            if (err) 
            {
                console.error(`Error retrieving top_wpm: ${err.message}`)
                res.status(400).json({ error: 'Internal Server Error' })
                return
            }

            if (row && row.top_wpm > wpm) 
            {
                console.log(`The existing top_wpm (${row.top_wpm}) is higher than the incoming WPM (${wpm}). No update is performed.`)
                res.status(400).json(
                { 
                    error: 'Bad Request',
                    message: "Incoming WPM is higher than current Top WPM in api request" 
                })
            } 
            else 
            {
                const queryUpdateTotalWPM = 'UPDATE players SET top_wpm = ? WHERE uuid = ?'
           
                db.run(queryUpdateTotalWPM, [wpm, uuid], function (err) 
                {
                    if (err) 
                    {
                        console.error(`Error updating top_wpm: ${err.message}`)
                        res.status(400).json({ error: 'Internal Server Error' })
                    } 
                    else 
                    {
                        console.log(`Top WPM updated for player with UUID ${uuid}`)
                        res.status(200).json({ message: "OK" })
                    }
                })
            }
        })
    }
    else
    {
        console.error(`Invalid Request Attempt`)
        res.status(400).json(
        { 
            error: 'Bad Request',
            message: 'Invalid API Request. Why?'
        })
    }
}) 

// Listening Worker

const server = app.listen(4000, function () 
{
    let host = server.address().address
    let port = server.address().port
})

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
        db.run(query, [nameToDelete], function (err) 
        {
            if (err) 
            {
                console.error(`Error deleting row: ${err.message}`)
            } 
            else 
            {
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