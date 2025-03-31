"use strict";

const utils = require("@iobroker/adapter-core");

class PacsAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "pacs", // Название адаптера
        });

        this.modemPort = null; // Переменная для хранения экземпляра порта

        // Подписка на события
        this.on("ready", this.onReady.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Инициализация адаптера
     */
    async onReady() {
        this.log.info("Adapter initialized");

        // Логируем текущую конфигурацию
        this.log.info(`Current config: ${JSON.stringify(this.config, null, 2)}`);

        // Создаем или обновляем объекты пользователей и устройств на основе конфигурации
        await this.syncUsersAndDevices(this.config.users, this.config.devices);

        this.log.info('Adapter ready');
    }


    /**
     * Синхронизация объектов пользователей и устройств
     */
    async syncUsersAndDevices(users, devices) {
        this.log.info(`Users from config: ${JSON.stringify(users, null, 2)}`);
        this.log.info(`Devices from config: ${JSON.stringify(devices, null, 2)}`);

        // Получаем текущие объекты пользователей и устройств
        const currentUsers = await this.getObjectListAsync({ startkey: `${this.namespace}.users.`, endkey: `${this.namespace}.users.\u9999` });
        const currentDevices = await this.getObjectListAsync({ startkey: `${this.namespace}.devices.`, endkey: `${this.namespace}.devices.\u9999` });

        // Обработка пользователей
        if (Array.isArray(users)) {
            const userNames = users.map(user => user.name.replace(/[^a-zA-Z0-9]/g, '_'));

            // Удаляем пользователей, которых больше нет в конфигурации
            for (const userObj of currentUsers.rows) {
                const userName = userObj.id.split('.').pop();
                if (!userNames.includes(userName)) {
                    this.log.info(`Deleting user object: ${userObj.id}`);
                    await this.delObjectAsync(userObj.id);
                }
            }

            // Создаем или обновляем пользователей
            for (const user of users) {
                const userId = `users.${user.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                this.log.info(`Creating/updating user object: ${userId}`);

                // Создаем объект пользователя
                await this.setObjectNotExistsAsync(userId, {
                    type: 'folder',
                    common: {
                        name: user.name,
                        role: 'info',
                    },
                    native: {},
                });

                // Создаем состояние для телефона
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

                // Создаем состояние для устройств
                await this.setObjectNotExistsAsync(`${userId}.devices`, {
                    type: 'state',
                    common: {
                        name: 'Devices',
                        type: 'string', // Если devices - это массив, можно использовать 'array'
                        role: 'info',
                        read: true,
                        write: true,
                    },
                    native: {},
                });
                await this.setStateAsync(`${userId}.devices`, JSON.stringify(user.devices), true); // Сохраняем как строку
            }
        } else {
            this.log.warn("Users data is not an array or not provided");
        }

        // Обработка устройств
        if (Array.isArray(devices)) {
            const deviceNames = devices.map(device => device.name.replace(/[^a-zA-Z0-9]/g, '_'));

            // Удаляем устройства, которых больше нет в конфигурации
            for (const deviceObj of currentDevices.rows) {
                const deviceName = deviceObj.id.split('.').pop();
                if (!deviceNames.includes(deviceName)) {
                    this.log.info(`Deleting device object: ${deviceObj.id}`);
                    await this.delObjectAsync(deviceObj.id);
                }
            }

            // Создаем или обновляем устройства
            for (const device of devices) {
                const deviceId = `devices.${device.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                this.log.info(`Creating/updating device object: ${deviceId}`);

                // Создаем объект устройства
                await this.setObjectNotExistsAsync(deviceId, {
                    type: 'folder',
                    common: {
                        name: device.name,
                        role: 'info',
                    },
                    native: {},
                });

                // Создаем состояние для deviceId
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

                // Создаем состояние для DTMF
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
     * Обработка сообщений
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
     * Выгрузка адаптера
     */
    async onUnload(callback) {
        try {
            this.log.info("Adapter shutting down...");

            // Закрываем порт модема
            await this.closeModemPort();
        } catch (err) {
            this.log.error(`Error during shutdown: ${err}`);
        } finally {
            callback();
        }
    }
}

// Экспорт адаптера
if (require.main !== module) {
    module.exports = (options) => new DtmfAdapter(options);
} else {
    (() => new DtmfAdapter())();
}