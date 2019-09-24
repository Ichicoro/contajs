const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const fs = require('fs')
const port = 6060

app.use(bodyParser.json())

let config = JSON.parse(fs.readFileSync("config.json", "utf8"))

// Periodically save the config file //
setInterval(() => {
    fs.writeFile("config.json", JSON.stringify(config, null, 4), 'utf8', function (err) {});
}, 5*1000)


Number.prototype.roundDecimals = function() {
    return Number(this.toFixed(2))
}


function findUser(username) {
    return config.users.map(u => u.username).indexOf(username)
}

function findCar(car) {
    return config.cars.map(c => c.id).indexOf(car)
}

function addDebt(username, amount, whose) {
    const foundIndex = findUser(username)
    const whoseIndex = findUser(whose)
    if (foundIndex == -1 || whoseIndex == -1)
        return -1

    amount = amount.roundDecimals()
    console.log(amount)
    
    debt = {
        type: "debt",
        username: username,
        whose: whose,
        amount: amount,
        timestamp: (new Date()).getTime()
    }

    config.users[whoseIndex].debt += amount
    config.users[whoseIndex].debt = config.users[whoseIndex].debt.roundDecimals()

    config.actions.unshift(debt)

    return 0
}

function addCar(username, car) {
    const foundIndex = findUser(username)
    const carIndex = findCar(car)
    if (foundIndex == -1 || carIndex == -1)
        return -1
    
    cardata = {
        type: "car",
        username: username,
        car: car,
        timestamp: (new Date()).getTime()
    }

    config.cars[carIndex].count += 1
    config.actions.unshift(cardata)

    return 0
}


function deleteActionByTimestamp(timestamp) {
    const index = config.actions.map(a => a.timestamp).indexOf(timestamp)
    console.log(config.actions.map(a=>a.timestamp).indexOf(timestamp))
    if (index == -1)
        return -1
    else deleteAction(index)
}


function deleteAction(index) {
    if (index < 0 || index >= config.actions.length)
        return -1
    
    action = config.actions[index]
    if (action.type == 'debt') {
        user = findUser(action.whose)
        config.users[user].debt = (config.users[user].debt - action.amount).roundDecimals()
    } else {
        car = findCar(action.car)
        config.cars[car].count -= 1
    }

    config.actions = config.actions.filter((a,i) => i != index)
    return 0
}


app.get('/cars', (req, res) => {
    if (req.headers.username && req.headers.password) {
        var username = req.headers["username"]
        var password = req.headers["password"]
    } else {
        return res.status(400).send({error: "missing_parameters"})
    }

    const userIndex = findUser(username)
    if (userIndex == -1) {
        return res.status(401).send({error: "invalid_username"})
    } else if (config.users[userIndex].password != password) {
        return res.status(401).send({error: "wrong_password"})
    }

    res.status(200).send({
        "error": null,
        "data": config.cars
    })
})


app.get('/users', (req, res) => {
    if (req.headers.username && req.headers.password) {
        var username = req.headers["username"]
        var password = req.headers["password"]
    } else {
        return res.status(400).send({error: "missing_parameters"})
    }

    const userIndex = findUser(username)
    if (userIndex == -1) {
        return res.status(401).send({error: "invalid_username"})
    } else if (config.users[userIndex].password != password) {
        return res.status(401).send({error: "wrong_password"})
    }

    let newdata = []
    config.users.forEach(u => newdata.push({
        username: u.username,
        name: u.name,
        debt: u.debt
    }))
    res.status(200).send({
        "error": null,
        "data": newdata
    })
})


/*
GET {
    "username"
    "password"
}
*/
app.get('/actions', (req, res) => {
    if (req.headers.username && req.headers.password) {
        var username = req.headers["username"]
        var password = req.headers["password"]
    } else {
        return res.status(400).send({error: "missing_parameters"})
    }

    const userIndex = findUser(username)
    if (userIndex == -1) {
        return res.status(401).send({error: "invalid_username"})
    } else if (config.users[userIndex].password != password) {
        return res.status(401).send({error: "wrong_password"})
    }
    return res.status(200).send({
        "error": null,
        "data": config.actions
    })
})


/*
POST {
    "username"
    "password"
    "type"      // debt or car
    "amount"    // if it's a debt
    "whose"     // if it's a debt
    "car"       // if it's a car
}
*/
app.post('/actions', (req, res) => {
    if (req.headers.username && req.headers.password) {
        var username = req.headers["username"]
        var password = req.headers["password"]
    } else {
        return res.status(400).send({error: "missing_parameters"})
    }

    const userIndex = findUser(username)
    if (userIndex == -1) {
        return res.status(401).send({error: "invalid_username"})
    } else if (config.users[userIndex].password != password) {
        return res.status(401).send({error: "wrong_password"})
    }

    if (req.body.type == "debt") {
        if (addDebt(username, req.body.amount, req.body.whose) == -1)
            return res.status(400).send({error: "missing_parameters"})
    } else if (req.body.type == "car") {
        if (addCar(username, req.body.car) == -1)
            return res.status(400).send({error: "missing_parameters"})
    } else {
        return res.status(400).send({error: "invalid_post_type"})
    }

    return res.status(200).send({error: null, data: "Ok"})
})


/*
DELETE {
    "username"
    "password"
    "type"      // "timestamp" or "index"
    "value"
}
*/
app.delete('/actions', (req, res) => {
    if (req.headers.username && req.headers.password) {
        var username = req.headers["username"]
        var password = req.headers["password"]
    } else {
        return res.status(400).send({error: "missing_parameters"})
    }

    const userIndex = findUser(username)
    if (userIndex == -1) {
        return res.status(401).send({error: "invalid_username"})
    } else if (config.users[userIndex].password != password) {
        return res.status(401).send({error: "wrong_password"})
    }

    if (req.body.type == "timestamp") {
        if (deleteActionByTimestamp(req.body.value) == -1)
            return res.status(400).send({error: "invalid_timestamp"})
    } else if (req.body.type == "index") {
        if (deleteAction(req.body.value) == -1)
            return res.status(400).send({error: "invalid_index"})
    } else {
        return res.status(400).send({error: "invalid_delete_type"})
    }

    return res.status(200).send({data: "Ok"})
})


app.listen(port, () => console.log("Ready on port " + port))
