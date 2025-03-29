/* global $, systemDictionary, socket */

$(function () {
    // Инициализация админки
    $('#tab-users').append('<div class="user-table-container"></div>');
    $('#tab-devices').append('<div class="device-table-container"></div>');

    // Загрузка данных при открытии админки
    loadData();

    function loadData() {
        socket.emit('getObjectView', 'system', 'instance', { startkey: 'system.adapter.pacs.', endkey: 'system.adapter.pacs.\u9999' }, function (err, res) {
            if (err) console.error(err);
            // Обработка данных
        });
    }

    // Здесь будет основной код интерфейса из предыдущего ответа
});