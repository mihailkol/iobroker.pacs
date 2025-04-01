"use strict";

const utils = require("@iobroker/adapter-core");

class PacsAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "pacs",
        });

        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
    }

    /**
     * Инициализация адаптера
     */
    async onReady() {
        this.log.info("Adapter initialization started");

        // Создаём базовые объекты для событий
        await this.createEventObjects();

        // Загружаем конфигурацию
        this.config = this.native;
        this.log.info("Configuration loaded:", JSON.stringify(this.config, null, 2));

        this.log.info("Adapter initialized successfully");
    }

    /**
     * Создание объектов для хранения событий
     */
    async createEventObjects() {
        // Канал для событий
        await this.setObjectNotExistsAsync("events", {
            type: "channel",
            common: {
                name: "Events",
                desc: "Channel for storing incoming and outgoing events"
            },
            native: {}
        });

        // Входящие события
        await this.setObjectNotExistsAsync("events.incoming", {
            type: "state",
            common: {
                name: "Incoming events",
                type: "array",
                role: "list",
                read: true,
                write: true,
                desc: "Storage for incoming events"
            },
            native: {}
        });

        // Исходящие события
        await this.setObjectNotExistsAsync("events.outgoing", {
            type: "state",
            common: {
                name: "Outgoing events",
                type: "array",
                role: "list",
                read: true,
                write: true,
                desc: "Storage for outgoing events"
            },
            native: {}
        });

        this.log.info("Event objects created successfully");
    }

    /**
     * Обработка изменений состояний
     */
    async onStateChange(id, state) {
        if (!state || state.ack) return;

        this.log.debug(`State change: ${id} = ${JSON.stringify(state)}`);

        // Здесь можно добавить обработку входящих событий
        // и сохранение их в events.incoming
    }

    /**
     * Выгрузка адаптера
     */
    async onUnload(callback) {
        try {
            this.log.info("Cleaning up before shutdown...");
            callback();
        } catch (err) {
            callback(err);
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new PacsAdapter(options);
} else {
    (() => new PacsAdapter())();
}