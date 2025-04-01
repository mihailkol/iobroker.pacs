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
        this.log.info("Начало инициализации адаптера");

        // Создаём базовые объекты для событий
        await this.createEventObjects();

        // Загружаем конфигурацию
        this.config = this.native;
        this.log.info("Конфигурация загружена:", JSON.stringify(this.config, null, 2));

        this.log.info("Адаптер успешно инициализирован");
    }

    /**
     * Создание объектов для хранения событий
     */
    async createEventObjects() {
        // Канал для событий
        await this.setObjectNotExistsAsync("events", {
            type: "channel",
            common: {
                name: "События",
                desc: "Канал для хранения входящих и исходящих событий"
            },
            native: {}
        });

        // Входящие события
        await this.setObjectNotExistsAsync("events.incoming", {
            type: "state",
            common: {
                name: "Входящие события",
                type: "array",
                role: "list",
                read: true,
                write: true,
                desc: "Хранилище входящих событий"
            },
            native: {}
        });

        // Исходящие события
        await this.setObjectNotExistsAsync("events.outgoing", {
            type: "state",
            common: {
                name: "Исходящие события",
                type: "array",
                role: "list",
                read: true,
                write: true,
                desc: "Хранилище исходящих событий"
            },
            native: {}
        });

        this.log.info("Объекты событий успешно созданы");
    }

    /**
     * Обработка изменений состояний
     */
    async onStateChange(id, state) {
        if (!state || state.ack) return;

        this.log.debug(`Изменение состояния: ${id} = ${JSON.stringify(state)}`);

        // Здесь можно добавить обработку входящих событий
    }

    /**
     * Выгрузка адаптера
     */
    async onUnload(callback) {
        try {
            this.log.info("Завершение работы адаптера...");
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