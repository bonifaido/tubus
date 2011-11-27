var connect = require('connect');
var fs = require('fs');
var socketio = require('socket.io');
var youtubedl = require('youtube-dl');


var __DOWNLOADS = __dirname + '/downloads';

if (!fs.statSync(__DOWNLOADS).isDirectory())
	fs.mkdirSync(__DOWNLOADS);

var server = connect.createServer();
server.use('/', connect.static(__dirname + '/public'));
server.use('/browse', connect.static(__DOWNLOADS));
server.use('/browse', connect.directory(__DOWNLOADS));
server.use(connect.logger());
server.listen(2000);

io = socketio.listen(server);


io.sockets.on('connection', function (socket) {

	socket.on('download', function (options) {

		if (socket.youtube) {

			socket.emit('error', { text: 'you already have a download' });

		} else {

			var args = [];
			if (options['format'] != 'video') {
				args.push('--extract-audio');
				args.push('--audio-format');
				args.push(options['format']);
			}

			socket.dl = youtubedl.download(options['url'], __DOWNLOADS, args);

			socket.dl.on('progress', function (data) {
				socket.emit('progress', Number(data.percent));
			});

			socket.dl.on('end', function (data) {
				console.log('youtube-dl finished: ' + data.filename);
				socket.emit('done', data.filename);
				socket.dl = undefined;
			});

			socket.dl.on('error', function (error) {
				socket.emit('error', error);
				socket.dl = undefined
			});

		}

	});

	socket.on('disconnect', function () {
		if (socket.dl) {
			socket.dl.stop();
			console.log('client disconnected - youtube-dl process killed');
		}
	});

});
