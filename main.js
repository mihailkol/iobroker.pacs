"use strict";

const utils = require("@iobroker/adapter-core");

class DtmfAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "dtmf", // �������� ��������
        });

        this.modemPort = null; // ���������� ��� �������� ���������� �����

        // �������� �� �������
        this.on("ready", this.onReady.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * ������������� ��������
     */
    async onReady() {
        this.log.info("Adapter initialized");

        // �������� ������� ������������
        this.log.info(`Current config: ${JSON.stringify(this.config, null, 2)}`);

        // ������� ��� ��������� ������� ������������� � ��������� �� ������ ������������
        await this.syncUsersAndDevices(this.config.users, this.config.devices);

        this.log.info('Adapter ready');
    }


    /**
     * ������������� �������� ������������� � ���������
     */
    async syncUsersAndDevices(users, devices) {
        this.log.info(`Users from config: ${JSON.stringify(users, null, 2)}`);
        this.log.info(`Devices from config: ${JSON.stringify(devices, null, 2)}`);

        // �������� ������� ������� ������������� � ���������
        const currentUsers = await this.getObjectListAsync({ startkey: `${this.namespace}.users.`, endkey: `${this.namespace}.users.\u9999` });
        const currentDevices = await this.getObjectListAsync({ startkey: `${this.namespace}.devices.`, endkey: `${this.namespace}.devices.\u9999` });

        // ��������� �������������
        if (Array.isArray(users)) {
            const userNames = users.map(user => user.name.replace(/[^a-zA-Z0-9]/g, '_'));

            // ������� �������������, ������� ������ ��� � ������������
            for (const userObj of currentUsers.rows) {
                const userName = userObj.id.split('.').pop();
                if (!userNames.includes(userName)) {
                    this.log.info(`Deleting user object: ${userObj.id}`);
                    await this.delObjectAsync(userObj.id);
                }
            }

            // ������� ��� ��������� �������������
            for (const user of users) {
                const userId = `users.${user.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                this.log.info(`Creating/updating user object: ${userId}`);

                // ������� ������ ������������
                await this.setObjectNotExistsAsync(userId, {
                    type: 'folder',
                    common: {
                        name: user.name,
                        role: 'info',
                    },
                    native: {},
                });

                // ������� ��������� ��� ��������
                await this.setObjectNotExistsAsync(`${userId}.phone`, {
                    type: 'state',
                    common: {
                        name: 'Phone number',
                        type: 'string',
                        role: 'info',
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                await this.setStateAsync(`${userId}.phone`, user.phone, true);

                // ������� ��������� ��� ���������
                await this.setObjectNotExistsAsync(`${userId}.devices`, {
                    type: 'state',
                    common: {
                        name: 'Devices',
                        type: 'string', // ���� devices - ��� ������, ����� ������������ 'array'
                        role: 'info',
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                await this.setStateAsync(`${userId}.devices`, JSON.stringify(user.devices), true); // ��������� ��� ������
            }
        } else {
            this.log.warn("Users data is not an array or not provided");
        }

        // ��������� ���������
        if (Array.isArray(devices)) {
            const deviceNames = devices.map(device => device.name.replace(/[^a-zA-Z0-9]/g, '_'));

            // ������� ����������, ������� ������ ��� � ������������
            for (const deviceObj of currentDevices.rows) {
                const deviceName = deviceObj.id.split('.').pop();
                if (!deviceNames.includes(deviceName)) {
                    this.log.info(`Deleting device object: ${deviceObj.id}`);
                    await this.delObjectAsync(deviceObj.id);
                }
            }

            // ������� ��� ��������� ����������
            for (const device of devices) {
                const deviceId = `devices.${device.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                this.log.info(`Creating/updating device object: ${deviceId}`);

                // ������� ������ ����������
                await this.setObjectNotExistsAsync(deviceId, {
                    type: 'folder',
                    common: {
                        name: device.name,
                        role: 'info',
                    },
                    native: {},
                });

                // ������� ��������� ��� deviceId
                await this.setObjectNotExistsAsync(`${deviceId}.deviceId`, {
                    type: 'state',
                    common: {
                        name: 'Device ID',
                        type: 'string',
                        role: 'info',
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                await this.setStateAsync(`${deviceId}.deviceId`, device.deviceId, true);

                // ������� ��������� ��� DTMF
                await this.setObjectNotExistsAsync(`${deviceId}.DTMF`, {
                    type: 'state',
                    common: {
                        name: 'DTMF',
                        type: 'number',
                        role: 'info',
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                await this.setStateAsync(`${deviceId}.DTMF`, device.DTMF, true);
            }
        } else {
            this.log.warn("Devices data is not an array or not provided");
        }
    }

    /**
     * ��������� ���������
     */
    async onMessage(obj) {
        if (typeof obj === 'object' && obj.command) {
            this.log.debug(`Received message: ${JSON.stringify(obj)}`);

            switch (obj.command) {

                default:
                    this.log.warn(`Unknown command: ${obj.command}`);
                    break;
            }
        }
    }

    /**
     * �������� ��������
     */
    async onUnload(callback) {
        try {
            this.log.info("Adapter shutting down...");

            // ��������� ���� ������
            await this.closeModemPort();
        } catch (err) {
            this.log.error(`Error during shutdown: ${err}`);
        } finally {
            callback();
        }
    }
}

// ������� ��������
if (require.main !== module) {
    module.exports = (options) => new DtmfAdapter(options);
} else {
    (() => new DtmfAdapter())();
}