# node-red-contrib-onvif

A <a href="http://nodered.org" target="_blank">Node-RED</a> node that interacts with ip cameras using the ONVIF protocol.

## Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-onvif

## Flows usage

### Input
```json
msg.payload = {
    url: "", // IP camera URL
    username: "", // IP camera username
    password: "", // IP camera password
}
```

### Output
```json
msg.payload = {
    image: {
        "base64": "", // Base64 encoded image
        "binary": "", // Binary image
    }
}
```

## Dashboard Usage

ONVIF Snapshot returns msg.payload in the form of a base64 encoded image to use with a Node-RED Dashboard template

    <img src="{{ msg.payload.image.base64 }}">
