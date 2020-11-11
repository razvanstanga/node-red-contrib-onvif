module.exports = (RED) => {
    "use strict";
    let onvif = require("node-onvif");

    function snapshot(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        let msg = {
            name: config.name,
            url: config.url,
            error: false
        };

        node.on("input", function (msg) {
            try {
                let _msg = JSON.parse(msg.payload);
                if (typeof _msg === "object") {
                    if(_msg.hasOwnProperty("url")) {
                        msg.url = _msg.url;
                    }
                    if(_msg.hasOwnProperty("username")) {
                        msg.username = _msg.username;
                    }
                    if(_msg.hasOwnProperty("password")) {
                        msg.password = _msg.password;
                    }
                    if(_msg.hasOwnProperty("interval")) {
                        msg.interval = _msg.interval;
                    }
                    if(_msg.hasOwnProperty("active")) {
                        msg.active = _msg.active;
                    }
                }
            }
            catch (ex) {}

            config.url = msg.url || config.url;
            config.username = msg.username || config.username;
            config.password = msg.password || config.password;
            config.interval = msg.interval || config.interval;
            node.active = config.active = msg.active || config.active;

            if(msg.hasOwnProperty("payload")) {
                msg._payload = msg.payload;
            }
            msg.node = this.type;

            runInterval(msg, node, config);
        });

        if (!config.url) {
            node.warn("No URL is specified. Please specify in node configuration.");
            return;
        }

        config.interval = parseInt(config.interval);
        node.intervalId = null;

        runInterval(msg, node, config);

        node.on("close", () => {
            if (this.intervalId != null) {
                clearInterval(this.intervalId);
            }
        });
    }
    RED.nodes.registerType("ONVIF Snapshot", snapshot);

    RED.httpAdmin.post("/onvif-snapshot/:id/:state", RED.auth.needsPermission("onvif-snapshot.write"), (req, res) => {
        let node = RED.nodes.getNode(req.params.id);
        let state = req.params.state;
        if (node !== null && typeof node !== "undefined" ) {
            if (state === "enable") {
                node.active = true;
                res.sendStatus(200);
            } else if (state === "disable") {
                node.active = false;
                res.sendStatus(201);
            } else {
                res.sendStatus(404);
            }
        } else {
            res.sendStatus(404);
        }
    });

    function runInterval(msg, node, config) {
        if (node.intervalId != null) {
            clearInterval(node.intervalId);
        }
        if (node.active == false) return;
        node.log("URL (" + config.interval + " seconds): " + config.url);

        let fetch = function() {
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
                let base64Image = Buffer.from(res.body, 'binary').toString('base64');
                msg.payload = prefix + base64Image;
                msg.binaryImage = res.body;
                node.send(msg);
            }).catch((error) => {
                msg.payload = null;
                msg.error = error;
                node.send(msg);
            });
        }
        fetch();
        node.intervalId = setInterval(() => {
            fetch();
        }, config.interval * 1000);
    }
}
