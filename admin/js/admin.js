/* global $, systemDictionary, socket */

$(function () {
    // ������������� �������
    $('#tab-users').append('<div class="user-table-container"></div>');
    $('#tab-devices').append('<div class="device-table-container"></div>');

    // �������� ������ ��� �������� �������
    loadData();

    function loadData() {
        socket.emit('getObjectView', 'system', 'instance', { startkey: 'system.adapter.pacs.', endkey: 'system.adapter.pacs.\u9999' }, function (err, res) {
            if (err) console.error(err);
            // ��������� ������
        });
    }

    // ����� ����� �������� ��� ���������� �� ����������� ������
});