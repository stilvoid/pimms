var fs = require("fs");
var path = require("path");
var spawn = require("child_process").spawn;

var nosef = require("nosef");

var dir = process.cwd();

var media_player_command = "mplayer";
var media_player_options = [];

var current_player = null;

var allowed_file_patterns = [
    /.mp\w+$/i,
    /.mov$/i,
    /.avi$/i,
    /.flv$/i,
    /.wav$/i,
    /.flac$/i
];

if(process.argv.length > 2) {
    dir = process.argv[2];
}

console.log("Starting in", dir);

function cd(request, response, params) {
    var new_dir = path.join(dir, path.normalize(decodeURIComponent(params.get.path)));

    var output = {
        "files": [],
        "folders": []
    };

    fs.readdir(new_dir, function(err, data) {
        if(err) {
            response.error("Could not cd to " + new_dir);
        } else {
            dir = new_dir;

            data.forEach(function(entry) {
                var matched;

                if(!/^\./.test(entry)) {
                    if(fs.statSync(path.join(dir, entry)).isDirectory()) {
                        output.folders.push(entry);
                    } else {
                        matched = false;

                        allowed_file_patterns.forEach(function(pattern) {
                            if(pattern.test(entry)) {
                                matched = true;
                            }
                        });

                        if(matched) {
                            output.files.push(entry);
                        }
                    }
                }
            });

            output.folders.sort();
            output.files.sort();

            response.JSON(output);
        }
    });
}

function stop_player() {
    if(current_player) {
        current_player.kill();
        current_player = null;
    }
}

function play(request, response, params) {
    var file = path.join(dir, path.normalize(decodeURIComponent(params.get.path)));

    stop_player();

    fs.stat(file, function(err, data) {
        if(err) {
            response.error("Could not play " + file);
        } else {
            current_player = spawn(media_player_command, media_player_options.concat(file));

            response.JSON(file);
        }
    });
}

function stop(request, response) {
    stop_player();

    response.JSON("OK");
}

var config = {
    port: 8001,
    host: "0.0.0.0",
    middleware: function(request, response) {
        console.log(request.url);
    },
    urls: [
        ["/play/", play],
        ["/cd/", cd],
        ["/stop/", stop],
        ["/media/{{path}}", nosef.handlers.file("./media/", "path")],
        ["/", nosef.handlers.file("./media/index.html")]
    ]
};

nosef.server(config);
