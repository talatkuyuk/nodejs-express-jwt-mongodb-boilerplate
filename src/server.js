var express = require('express');
var app = express();

app.get('/', (req, res, next) => {
    res.send("Hello");
})

var port = 3000;

app.listen(port, function () {
    console.log('Server started on port ' + port);
});