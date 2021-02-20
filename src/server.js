var express = require('express');
var path = require('path');

var app = express();


// *******  if need to server side rendering *********

// View engine setup  (needs "views" directory )
app.set('views', path.join(__dirname, 'views'));

// choose one
app.set('view engine', 'ejs'); // option-1 
app.set('view engine', 'pug'); // option-2

// if need to sent any static file to client (needs "public" directory )
app.use(express.static(path.join(__dirname, 'public')));

// *********************************************


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