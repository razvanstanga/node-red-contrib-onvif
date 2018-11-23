module.exports = (RED) => {
    "use strict";
    let onvif = require("node-onvif");

    function snapshot(config) {
        RED.nodes.createNode(this, config);
        this.active = config.active;
        var node = this;

        if (!config.url) {
            node.warn("No URL is specified. Please specify in node configuration.");
            return;
        }
        if (node.active == false) return;

        config.interval = parseInt(config.interval);
        node.intervalId = null;

        runInterval(node, config);

        node.on("close", () => {
            if (this.intervalId != null) {
                clearInterval(this.intervalId);
            }
        });
    }
    RED.nodes.registerType("ONVIF Snapshot", snapshot);

    RED.httpAdmin.post("/onvif-snapshot/:id/:state", RED.auth.needsPermission("onvif-snapshot.write"), (req, res) => {
        var node = RED.nodes.getNode(req.params.id);
        var state = req.params.state;
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

    function runInterval(node, config) {
        if (node.intervalId != null) {
            clearInterval(node.intervalId);
        }
        node.log("URL (" + config.interval + " seconds): " + config.url);

        let msg = {
            name: config.name,
            url: config.url,
            error: false
        };

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
