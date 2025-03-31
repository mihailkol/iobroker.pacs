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
        this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
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

            // Подписка на изменения
            await this.subscribeStatesAsync("users.*");
            await this.subscribeStatesAsync("devices.*");

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
            await this.setStateAsync(`${userId}.${state.id}`, state.def, true);
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
            await this.setStateAsync(`${deviceId}.${state.id}`, state.def, true);
        }
    }

    /**
     * Метод для получения списка устройств (для выпадающего списка)
     */
    async getDevicesList(params, callback) {
        try {
            const devices = await this.getDevicesAsync();
            const result = devices.map(device => ({
                value: device._id,
                label: device.common.name || device._id
            }));
            callback(result);
        } catch (err) {
            this.log.error(`Error getting devices list: ${err}`);
            callback([]);
        }
    }

    /**
     * Метод для получения списка объектов ioBroker (для выпадающего списка)
     */
    async getObjectsList(params, callback) {
        try {
            const objects = await this.getObjectListAsync({
                startkey: '',
                endkey: '\u9999',
                include_docs: true
            });

            const result = objects.rows
                .filter(obj => !obj.value.common.hidden)
                .map(obj => ({
                    value: obj.id,
                    label: obj.value.common.name || obj.id
                }));

            callback(result);
        } catch (err) {
            this.log.error(`Error getting objects list: ${err}`);
            callback([]);
        }
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
    async onMessage(obj) {
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
     * Обработка изменений объектов
     */
    async onObjectChange(id, obj) {
        if (!id) return;
        this.log.debug(`objectChange ${id}: ${JSON.stringify(obj)}`);
    }

    /**
     * Обработка изменений состояний
     */
    async onStateChange(id, state) {
        if (!id || !state || state.ack) return;
        this.log.debug(`stateChange ${id}: ${JSON.stringify(state)}`);

        // Здесь можно добавить обработку изменений состояний
    }

    /**
     * Выгрузка адаптера
     */
    async onUnload(callback) {
        try {
            this.log.info("Cleaning up before shutdown...");
            // Дополнительная очистка при необходимости
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