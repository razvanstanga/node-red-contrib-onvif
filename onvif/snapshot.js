module.exports = (RED) => {
    "use strict";
    let onvif = require("node-onvif");
    let isSharpAvailable = false;
    let sharp;
    try {
        sharp = require('sharp');
        isSharpAvailable = true;
    }
    catch (ex) {}

    function snapshot(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.on("input", function (msg) {

            config.name     = msg.payload.name      || config.name;
            config.url      = msg.payload.url       || config.url;
            config.username = msg.payload.username  || config.username;
            config.password = msg.payload.password  || config.password;
            config.resize   = msg.payload.resize    || config.resize;

            if(msg.hasOwnProperty("payload")) {
                msg._payload = msg.payload;
            }
            msg.node = this.type;

            if (!config.url) {
                node.warn("No URL is specified. Please specify in node configuration.");
                return;
            }

            run(msg, node, config);
        });
    }
    RED.nodes.registerType("ONVIF Snapshot", snapshot);

    function run(msg, node, config) {
        let onvifInstance = new onvif.OnvifDevice({
            xaddr: config.url,
            user : config.username,
            pass : config.password
        });

        onvifInstance.init().then((info) => {
            node.log('Fetching snapshot from ' + config.url);
            return onvifInstance.fetchSnapshot();
        }).then((res) => {
            let prefix = 'data:' + res.headers['content-type'] + ';base64,';

            if (config.resize && isSharpAvailable) {
                sharp(Buffer.from(res.body, 'binary'))
                    .resize(config.resize)
                    .toFormat('png')
                    .toBuffer()
                    .then( data => {
                        msg.payload = {
                            config: config,
                            image: {
                                base64: (prefix + data.toString('base64')),
                                binary: res.body
                            }
                        };
                        node.send(msg);
                    }).catch( err => {

                    });
            } else {
                let base64Image = Buffer.from(res.body, 'binary').toString('base64');
                msg.payload = {
                    config: config,
                    image: {
                        base64: (prefix + base64Image),
                        binary: res.body
                    }
                };
                node.send(msg);
            }
        }).catch((error) => {
            msg.payload = null;
            msg.error = error;
            node.send(msg);
        });
    }
}
