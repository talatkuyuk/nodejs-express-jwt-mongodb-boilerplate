var express = require('express');
var path = require('path');

var app = express();


// parse JSON (parse application/json)
app.use(express.json());

// parse urlencoded bodies (parse application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res, next) => {
    res.send("Hello");
})

var port = 3000;

app.listen(port, function () {
    console.log('Server started on port ' + port);
});