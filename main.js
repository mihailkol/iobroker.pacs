"use strict";

const utils = require("@iobroker/adapter-core");

class PacsAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "pacs",
        });

        this.on("ready", this.onReady.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Инициализация адаптера
     */
    async onReady() {
        try {
            this.log.info("Starting PACS adapter initialization...");

            // Инициализация структуры объектов
            await this.initObjects();

            // Синхронизация данных из конфига
            await this.syncConfigData();

            this.log.info("Adapter successfully initialized");
        } catch (err) {
            this.log.error(`Initialization failed: ${err}`);
        }
    }

    /**
     * Инициализация базовой структуры объектов
     */
    async initObjects() {
        // Создаем основные каналы
        await this.setObjectNotExistsAsync("info", {
            type: "channel",
            common: {
                name: "Information",
                desc: "Adapter information"
            },
            native: {}
        });

        await this.setObjectNotExistsAsync("users", {
            type: "channel",
            common: {
                name: "Users",
                desc: "User management"
            },
            native: {}
        });

        await this.setObjectNotExistsAsync("devices", {
            type: "channel",
            common: {
                name: "Devices",
                desc: "Device management"
            },
            native: {}
        });
    }

    /**
     * Синхронизация данных из конфига с объектами
     */
    async syncConfigData() {
        if (!this.config) {
            this.log.warn("No config found");
            return;
        }

        // Обработка пользователей
        if (Array.isArray(this.config.users)) {
            for (const user of this.config.users) {
                await this.createUserObjects(user);
            }
        }

        // Обработка устройств
        if (Array.isArray(this.config.devices)) {
            for (const device of this.config.devices) {
                await this.createDeviceObjects(device);
            }
        }
    }

    /**
     * Создание объектов для пользователя
     */
    async createUserObjects(user) {
        if (!user.name) return;

        const userId = `users.${this.normalizeId(user.name)}`;

        // Создаем канал пользователя
        await this.setObjectNotExistsAsync(userId, {
            type: "channel",
            common: {
                name: user.name,
                desc: `User ${user.name} channel`
            },
            native: {}
        });

        // Создаем все необходимые состояния
        const userStates = [
            { id: "name", type: "string", role: "text", def: user.name },
            { id: "phone", type: "string", role: "text", def: user.phone || "" },
            { id: "telegramId", type: "string", role: "text", def: user.telegramId || "" },
            { id: "schedule", type: "string", role: "text", def: user.schedule || "working_hours" },
            { id: "isAdmin", type: "boolean", role: "indicator", def: user.isAdmin || false },
            { id: "devices", type: "string", role: "text", def: JSON.stringify(user.devices || []) }
        ];

        for (const state of userStates) {
            await this.setObjectNotExistsAsync(`${userId}.${state.id}`, {
                type: "state",
                common: {
                    name: state.id,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: true
                },
                native: {}
            });
            await this.setStateAsync(`${userId}.${state.id}`, { val: state.def, ack: true });
        }
    }

    /**
     * Создание объектов для устройства
     */
    async createDeviceObjects(device) {
        if (!device.name) return;

        const deviceId = `devices.${this.normalizeId(device.name)}`;

        // Создаем канал устройства
        await this.setObjectNotExistsAsync(deviceId, {
            type: "channel",
            common: {
                name: device.name,
                desc: `Device ${device.name} channel`
            },
            native: {}
        });

        // Создаем все необходимые состояния
        const deviceStates = [
            { id: "name", type: "string", role: "text", def: device.name },
            { id: "object", type: "string", role: "text", def: device.object || "" },
            { id: "command", type: "string", role: "text", def: device.command || "" }
        ];

        for (const state of deviceStates) {
            await this.setObjectNotExistsAsync(`${deviceId}.${state.id}`, {
                type: "state",
                common: {
                    name: state.id,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: true
                },
                native: {}
            });
            await this.setStateAsync(`${deviceId}.${state.id}`, { val: state.def, ack: true });
        }
    }

    /**
     * Метод для получения списка устройств (для выпадающего списка)
     */
    getDevicesList(params, callback) {
        this.getObjectView('system', 'device', {}, (err, devices) => {
            if (err) {
                this.log.error(`Error getting devices list: ${err}`);
                return callback([]);
            }

            const result = devices.rows.map(device => ({
                value: device.id,
                label: device.value.common.name || device.id
            }));

            callback(result);
        });
    }

    /**
     * Метод для получения списка объектов ioBroker (для выпадающего списка)
     */
    getObjectsList(params, callback) {
        this.getObjectList({ startkey: '', endkey: '\u9999' }, (err, objects) => {
            if (err) {
                this.log.error(`Error getting objects list: ${err}`);
                return callback([]);
            }

            const result = objects.rows
                .filter(obj => !obj.value.common || !obj.value.common.hidden)
                .map(obj => ({
                    value: obj.id,
                    label: obj.value.common.name || obj.id
                }));

            callback(result);
        });
    }

    /**
     * Нормализация ID (замена спецсимволов)
     */
    normalizeId(id) {
        return id.replace(/[^a-zA-Z0-9_\-]/g, "_");
    }

    /**
     * Обработка сообщений от admin UI
     */
    onMessage(obj) {
        if (typeof obj === 'object' && obj.command) {
            this.log.debug(`Received message: ${JSON.stringify(obj)}`);

            try {
                switch (obj.command) {
                    case "getDevicesList":
                        this.getDevicesList(obj.params || {}, (result) => {
                            this.sendTo(obj.from, obj.command, result, obj.callback);
                        });
                        break;

                    case "getObjectsList":
                        this.getObjectsList(obj.params || {}, (result) => {
                            this.sendTo(obj.from, obj.command, result, obj.callback);
                        });
                        break;

                    default:
                        this.log.warn(`Unknown command: ${obj.command}`);
                        this.sendTo(obj.from, obj.command, { error: "Unknown command" }, obj.callback);
                }
            } catch (err) {
                this.log.error(`Error processing message: ${err}`);
                this.sendTo(obj.from, obj.command, { error: err.message }, obj.callback);
            }
        }
    }

    /**
     * Выгрузка адаптера
     */
    onUnload(callback) {
        try {
            this.log.info("Cleaning up before shutdown...");
            callback();
        } catch (err) {
            callback(err);
        }
    }
}

// Экспорт адаптера
if (require.main !== module) {
    module.exports = (options) => new PacsAdapter(options);
} else {
    (() => new PacsAdapter())();
}