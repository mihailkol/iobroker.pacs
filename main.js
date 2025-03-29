'use strict';

const utils = require('@iobroker/adapter-core');

class Pacs extends utils.Adapter {
    constructor(options) {
        super({
            ...options,
            name: 'pacs',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.log.info('PACS adapter started');
        await this.initObjects();
    }

    async initObjects() {
        // �������� ��������� ��������
        await this.setObjectNotExistsAsync('devices', {
            type: 'channel',
            common: { name: '���������� �������� �������' },
            native: {}
        });

        await this.setObjectNotExistsAsync('users', {
            type: 'channel',
            common: { name: '������������ �������' },
            native: {}
        });
    }

    onStateChange(id, state) {
        if (state) {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            this.log.info(`state ${id} deleted`);
        }
    }

    onMessage(obj) {
        if (typeof obj === 'object' && obj.command) {
            // ��������� ������ �� �������
        }
    }

    onUnload(callback) {
        try {
            this.log.info('PACS adapter shutting down');
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (module.parent) {
    module.exports = (options) => new Pacs(options);
} else {
    new Pacs();
}