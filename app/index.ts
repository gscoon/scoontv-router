const Path = require('path');
const readline = require('readline');
const fs = require('fs');

const rootDir = Path.join(__dirname, './../');
const rootParentDir = Path.join(rootDir, './../');

// load environment variables
require('dotenv').config({
    path: Path.join(rootDir, '.env'),
});

const port = parseInt(process.env.ROUTER_PORT || '8888');
const sslPath = process.env.SSL_PATH ? process.env.SSL_PATH : Path.join(rootParentDir, './ssl');

const proxy = require('redbird')({
    port,
    letsencrypt: {
        path: sslPath,
        // port: 9999 // LetsEncrypt minimal web server port for handling challenges. Routed 80->9999, no need to open 9999 in firewall. Default 3000 if not defined.
    },
    ssl: {
        // http2: true,
        port: 443, // SSL port used to serve registered https routes with LetsEncrypt certificate.
    }
});

registerRoutes(Path.join(rootDir, 'local.routes.conf'));

function registerRoutes(localRoutesPath: string) {
    return new Promise((resolve, reject) => {
        const production = process.env.NODE_ENV === 'production';

        const readInterface = readline.createInterface({
            input: fs.createReadStream(localRoutesPath),
            console: false
        });


        readInterface.on('line', function (line) {
            let [external, internal, useSSL] = line.split(' ');
            if (!external || !internal) {
                return;
            }

            console.log({ external, internal, useSSL });

            const options: any = {};

            if (useSSL === 'true') {
                options.ssl = {
                    letsencrypt: {
                        email: process.env.SSL_EMAIL || 'gscoon@gmail.com',
                        production,
                    },
                }
            }

            proxy.register(external, internal, options)
        });

        readInterface.on('done', resolve);
    })
}