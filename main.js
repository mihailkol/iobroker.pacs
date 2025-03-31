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
    }

    /**
     * Инициализация адаптера
     */
    async onReady() {
        this.log.info("Adapter initialized");

        // Просто сохраняем конфиг в native
        this.config = this.native;
        this.log.info("Config loaded:", JSON.stringify(this.config, null, 2));
    }

    /**
     * Выгрузка адаптера
     */
    async onUnload(callback) {
        try {
            this.log.info("Adapter shutting down...");
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