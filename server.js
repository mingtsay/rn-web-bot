var webduino = require('webduino-js');
var getBoard = function(deviceId, cb) {
    var board = new webduino.WebArduino(deviceId);
    board.on('ready', function() { cb(board); });
    board.on('error', function() { cb(false); });
};
var boardObject = {
    deviceId: null,
    board: null,
    isBoardReady: false,
    leds: {},
    led: function(pin, action, cb) {
        var led = boardObject.leds[pin] = boardObject.leds[pin] || new webduino.module.Led(boardObject.board, boardObject.board.getDigitalPin(pin));
        if (action === 'on') led.on(cb);
        if (action === 'off') led.off(cb);
        if (action === 'toggle') led.toggle(cb);
        if (action === 'get') cb.call(led);
    }
};

var Bot = require('telebot');
var bot = new Bot(require('./bot_token'));

bot.on('/start', msg => {
    return bot.sendMessage(msg.chat.id, '安安，您好', { reply: msg.message_id });
});

bot.on('/help', msg => {
    return bot.sendMessage(msg.chat.id, '安安，我是說明訊息', { reply: msg.message_id });
});

bot.on('/board', msg => {
    var cmds = msg.text.split(' ');
    var action = cmds.length > 1 && cmds[1].length ? cmds[1].toLowerCase() : null;
    var deviceId = cmds.length > 2 && cmds[2].length ? cmds[2] : null;

    if (action && ['set', 'status'].indexOf(action) !== -1)
        if (deviceId)
            if (action === 'set')
                return getBoard(deviceId, function(board) {
                    boardObject.deviceId = deviceId;
                    boardObject.board = board ? board : null;
                    boardObject.isBoardReady = !!board;
                    bot.sendMessage(msg.chat.id, '裝置 <code>' + deviceId + '</code> ' + (board ? '已連線' : '已斷線') + '！', { reply: msg.message_id, parse: 'HTML' });
                });
            else if (action === 'status')
                return getBoard(deviceId, function(board) {
                    bot.sendMessage(msg.chat.id, '裝置 <code>' + deviceId + '</code> ' + (board ? '已上線' : '未上線'), { reply: msg.message_id, parse: 'HTML' });
                });
        else
            return bot.sendMessage(msg.chat.id, '裝置 ID 錯誤', { reply: msg.message_id });

    return bot.sendMessage(msg.chat.id, '使用方法：/board <set|status> <裝置ID>', { reply: msg.message_id });
});

bot.on('/io', msg => {
    if (!boardObject.isBoardReady)
        return bot.sendMessage(msg.chat.id, '請先使用 /board 連線至 Webduino', { reply: msg.message_id });

    var cmds = msg.text.split(' ');
    var pin = cmds.length > 1 && cmds[1].length ? parseInt(cmds[1], 10) : null;
    var action = cmds.length > 2 && cmds[2].length ? cmds[2].toLowerCase() : null;
    var datetimeA = cmds.length > 3 && cmds[3].length ? cmds[3] : null;
    var datetimeB = cmds.length > 4 && cmds[4].length ? cmds[4] : null;
    var datetime = null, timeout = null;
    var today = new Date().getFullYear() + '/' + (new Date().getMonth() + 1) + '/' + new Date().getDate();

    if (action === 't')
        action = 'toggle';

    if (datetimeA && datetimeB)
        datetime = new Date(datetimeA + ' ' + datetimeB);
    else if (datetimeA && !isNaN(parseFloat(datetimeA)) && isFinite(datetimeA))
        timeout = datetimeA * 1000;
    else if (datetimeA)
        datetime = new Date(today + ' ' + datetimeA);

    if (!timeout && (datetime && isNaN(datetime.getTime())))
        return bot.sendMessage(msg.chat.id, '觸發時間設定錯誤！', { reply: msg.message_id });

    if (datetime)
        timeout = datetime.getTime() - (new Date()).getTime();

    if (pin)
        if (pin !== NaN)
            if (action && ['on', 'off', 'toggle', 'get'].indexOf(action) !== -1)
                if (timeout) {
                    setTimeout(function() {
                        boardObject.led(pin, action, function() {
                            bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>' + (this.intensity ? 'On' : 'Off') + '</code>', { reply: msg.message_id, parse: 'HTML' });
                        });
                    }, timeout);
                    return bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 已預約於 <code>' + (timeout / 1000) + '</code> 秒後執行 <code>' + action + '</code> 動作', { reply: msg.message_id, parse: 'HTML' });
                } else
                    return boardObject.led(pin, action, function() {
                        bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>' + (this.intensity ? 'On' : 'Off') + '</code>', { reply: msg.message_id, parse: 'HTML' });
                    });
            else
                return bot.sendMessage(msg.chat.id, '動作輸入錯誤，使用方法：/io <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
        else
            return bot.sendMessage(msg.chat.id, '腳位輸入錯誤，使用方法：/io <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
    return bot.sendMessage(msg.chat.id, '使用方法：/io <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
});

bot.on('/schedule', msg => {
    return bot.sendMessage(msg.chat.id, '安安，我是排程', { reply: msg.message_id });
});

bot.connect();
