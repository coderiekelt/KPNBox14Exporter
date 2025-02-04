import axios from "axios";
import client from "prom-client";

let boxBaseUrl = null;
let cookieHeader = null;
let authorization = null;
let context = null;

const KPNBox = {
    initialize: async (baseUrl) => {
        boxBaseUrl = baseUrl;

        const response = await axios.get(baseUrl);
        cookieHeader = response.headers['set-cookie'][0];
    },
    authenticate: async (username, password) => {
        if (boxBaseUrl) {
            await KPNBox.initialize(boxBaseUrl);
        }

        let body = {
            service: 'sah.Device.Information',
            method: 'createContext',
            parameters: {
                applicationName: 'webui',
                username: username,
                password: password,
            },
        };

        const response = await fetch(`${boxBaseUrl}/ws/NeMo/Intf/lan:getMIBs`, {
            credentials: 'include',
            headers: {
                'Cookie': cookieHeader,
                'Authorization': 'X-Sah-Login',
            },
            "body": JSON.stringify(body),
            "method": "POST",
            "mode": "cors"
        });

        cookieHeader = response.headers.get('set-cookie');
        const responseBody = await response.json();

        authorization = `X-Sah ${responseBody.data.contextID}`;
        context = responseBody.data.contextID;
    },
    sendRequest: async (path, service, method, parameters) => {
        if (path === null) {
            path = '/ws/NeMo/Intf/lan:getMIBs'
        }

        let body = {
            service: service,
            method: method,
            parameters: parameters,
        };

        const response = await fetch(`${boxBaseUrl}${path}`, {
            credentials: 'include',
            headers: {
                'Cookie': cookieHeader,
                'Authorization': authorization,
                'X-Context': context,
            },
            "body": JSON.stringify(body),
            "method": "POST",
            "mode": "cors"
        });

        return await response.json();
    },
    enumeratePorts: async (registry) => {
        let enabledGauge = new client.Gauge({
            name: 'ethp_enabled',
            help: 'Is port EthN enabled?',
            labelNames: ['port']
        });

        let activeGauge = new client.Gauge({
            name: `ethp_status`,
            help: `Is port EthN active?`,
            labelNames: ['port']
        });

        let packetsRxCounter = new client.Counter({
            name: 'ethp_packets_rx',
            help: 'Received packets on EthN',
            labelNames: ['port']
        });

        let packetsTxCounter = new client.Counter({
            name: 'ethp_packets_tx',
            help: 'Sent packets on EthN',
            labelNames: ['port']
        });

        let bytesRxCounter = new client.Counter({
            name: 'ethp_bytes_rx',
            help: 'Received bytes on EthN',
            labelNames: ['port']
        });

        let bytesTxCounter = new client.Counter({
            name: 'ethp_bytes_tx',
            help: 'Sent bytes on EthN',
            labelNames: ['port']
        });


        for (let i = 0; i < process.env.KPN_BOX_ETHN; i++) {
            const _infoRsp = await KPNBox.sendRequest(null, `NeMo.Intf.ETH${i}`, 'getMIBs', {});
            const _statRsp = await KPNBox.sendRequest(null, `NeMo.Intf.ETH${i}`, 'getNetDevStats', {});

            let isEnabled = _infoRsp.status.base[`ETH${i}`].Enable;
            let isActive = _infoRsp.status.base[`ETH${i}`].Status;

            enabledGauge.set({ port: i }, isEnabled ? 1 : 0);
            activeGauge.set({ port: i }, isActive ? 1 : 0);

            packetsRxCounter.inc({ port: i }, _statRsp.status.RxPackets);
            packetsTxCounter.inc({ port: i }, _statRsp.status.TxPackets);
            bytesRxCounter.inc({ port: i }, _statRsp.status.RxBytes);
            bytesTxCounter.inc({ port: i }, _statRsp.status.TxBytes);
        }

        registry.registerMetric(enabledGauge);
        registry.registerMetric(activeGauge);
        registry.registerMetric(packetsRxCounter);
        registry.registerMetric(packetsTxCounter);
        registry.registerMetric(bytesRxCounter);
        registry.registerMetric(bytesTxCounter);
    }
};

export default KPNBox;