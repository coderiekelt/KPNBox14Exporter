import dotenv from "dotenv";
import http from "http";
import KPNBox from "./kpnbox.js";
import client from "prom-client";
import url from "url";

dotenv.config();

await KPNBox.initialize(process.env.KPN_BOX_URL);

const registry = new client.Registry();
registry.setDefaultLabels({
    device: process.env.KPN_BOX_NAME
});

const writeWANStatus = async () => {
    const _resp = await KPNBox.sendRequest(null, 'NMC', 'getWANStatus', {});
}


let httpServer = http.createServer(async (req, res) => {
    const route = url.parse(req.url).pathname

    if (route !== '/metrics') {
        res.statusCode = 401;
        res.setHeader('Content-Type', registry.contentType);
        res.end();

        return;
    }

    await KPNBox.authenticate(process.env.KPN_BOX_USER, process.env.KPN_BOX_PASS);
    await KPNBox.enumeratePorts(registry);

    res.statusCode = 200;
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

httpServer.listen(process.env.METRICS_PORT, process.env.METRICS_HOST, () => {
    console.log(`[HTTP] Listening for requests on ${process.env.METRICS_HOST}:${process.env.METRICS_PORT}`);
});