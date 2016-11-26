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
    },
    btns: {},
    btnsCB: {}
};

var Bot = require('telebot');
var bot = new Bot(require('./bot_token'));

var userWhitelist = [123456789];
var validateUser = function(msg, cb) {
    if (userWhitelist.indexOf(msg.from.id) !== -1) return cb(msg);
    return bot.sendMessage(msg.chat.id, '安安，您好', { reply: msg.message_id });
}

bot.on('/start', msg => {
    return bot.sendMessage(msg.chat.id, '安安，您好', { reply: msg.message_id });
});

bot.on('/board', msg => {
    return validateUser(msg, function(msg) {
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
});

bot.on('/led', msg => {
    return validateUser(msg, function(msg) {
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
                    return bot.sendMessage(msg.chat.id, '動作輸入錯誤，使用方法：/led <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
            else
                return bot.sendMessage(msg.chat.id, '腳位輸入錯誤，使用方法：/led <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
        return bot.sendMessage(msg.chat.id, '使用方法：/led <腳位> <on|off|toggle|get> [指定觸發時間]', { reply: msg.message_id });
    });
});

bot.on('/btn', msg => {
    return validateUser(msg, function(msg) {
        if (!boardObject.isBoardReady)
            return bot.sendMessage(msg.chat.id, '請先使用 /board 連線至 Webduino', { reply: msg.message_id });

        var cmds = msg.text.split(' ');
        var pin = cmds.length > 1 && cmds[1].length ? parseInt(cmds[1], 10) : null;

        if (pin) {
            var btn = boardObject.btns[pin] = boardObject.btns[pin] || new webduino.module.Button(boardObject.board, boardObject.board.getDigitalPin(pin));
            if (!boardObject.btnsCB[msg.chat.id]) boardObject.btnsCB[msg.chat.id] = {};
            if (!boardObject.btnsCB[msg.chat.id][msg.from.id]) boardObject.btnsCB[msg.chat.id][msg.from.id] = {};
            if (!boardObject.btnsCB[msg.chat.id][msg.from.id][pin]) boardObject.btnsCB[msg.chat.id][msg.from.id][pin] = {};

            btn.on('pressed', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].pressed = function() {
                bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>Pressed</code>\n取消所有通知 /btn_dismiss', { parse: 'HTML' });
            });
            btn.on('released', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].released = function() {
                bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>Released</code>\n取消所有通知 /btn_dismiss', { parse: 'HTML' });
            });
            btn.on('longPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].longPress = function() {
                bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>Long Pressed</code>\n取消所有通知 /btn_dismiss', { parse: 'HTML' });
            });
            btn.on('sustainedPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].sustainedPress = function() {
                bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 狀態為 <code>Sustained Pressed</code>\n取消所有通知 /btn_dismiss', { parse: 'HTML' });
            });
            return bot.sendMessage(msg.chat.id, '腳位 <code>' + pin + '</code> 已設定為按鈕模式\n取消所有通知 /btn_dismiss', { reply: msg.message_id, parse: 'HTML' });
        }
        return bot.sendMessage(msg.chat.id, '使用方法：/btn <腳位>', { reply: msg.message_id });
    });
});

bot.on('/btn_dismiss', msg => {
    return validateUser(msg, function(msg) {
        var cmds = msg.text.split(' ');
        var pin = cmds.length > 1 && cmds[1].length ? parseInt(cmds[1], 10) : null;

        if (boardObject.btnsCB[msg.chat.id] && boardObject.btnsCB[msg.chat.id][msg.from.id])
            if (pin && boardObject.btnsCB[msg.chat.id][msg.from.id][pin]) {
                if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].pressed === 'function')
                    boardObject.btns[pin].removeListener('pressed', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].pressed);
                if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].released === 'function')
                    boardObject.btns[pin].removeListener('released', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].released);
                if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].longPress === 'function')
                    boardObject.btns[pin].removeListener('longPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].longPress);
                if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].sustainedPress === 'function')
                    boardObject.btns[pin].removeListener('sustainedPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].sustainedPress);
                return bot.sendMessage(msg.chat.id, '已取消腳位 <code>' + pin + '</code> 通知', { reply: msg.message_id, parse: 'HTML' });
            } else {
                for (var pin in boardObject.btns)
                    if (boardObject.btnsCB[msg.chat.id][msg.from.id][pin]) {
                        if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].pressed === 'function')
                            boardObject.btns[pin].removeListener('pressed', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].pressed);
                        if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].released === 'function')
                            boardObject.btns[pin].removeListener('released', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].released);
                        if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].longPress === 'function')
                            boardObject.btns[pin].removeListener('longPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].longPress);
                        if (typeof boardObject.btnsCB[msg.chat.id][msg.from.id][pin].sustainedPress === 'function')
                            boardObject.btns[pin].removeListener('sustainedPress', boardObject.btnsCB[msg.chat.id][msg.from.id][pin].sustainedPress);
                    }
                return bot.sendMessage(msg.chat.id, '已取消所有腳位通知', { reply: msg.message_id, parse: 'HTML' });
            }
        return bot.sendMessage(msg.chat.id, '無通知可取消', { reply: msg.message_id, parse: 'HTML' });
    });
});

bot.on('/whitelist', msg => {
    return validateUser(msg, function(msg) {
        var cmds = msg.text.split(' ');
        var action = cmds.length > 1 && cmds[1].length ? cmds[1].toLowerCase() : null;
        var userId = cmds.length > 2 && cmds[2].length ? parseInt(cmds[2], 10) : null;

        if (action)
            switch(action) {
                case 'list': return bot.sendMessage(msg.chat.id, '目前白名單有：' + userWhitelist.join(', '), { reply: msg.message_id, parse: 'HTML' });
                case 'add':
                case 'remove':
                    if (!userId)
                        return bot.sendMessage(msg.chat.id, '請輸入 userId！使用方法：/whitelist ' + action + ' <userId>', { reply: msg.message_id });

                    if (action === 'add') {
                        if (userWhitelist.indexOf(userId) !== -1)
                            return bot.sendMessage(msg.chat.id, 'userId <code>' + userId + '</code> 已經在白名單內了！', { reply: msg.message_id, parse: 'HTML' });
                        userWhitelist.push(userId);
                        return bot.sendMessage(msg.chat.id, '已將 <code>' + userId + '</code> 加入白名單！', { reply: msg.message_id, parse: 'HTML' });
                    } else {
                        if (userWhitelist.indexOf(userId) === -1)
                            return bot.sendMessage(msg.chat.id, 'userId <code>' + userId + '</code> 不在白名單中！', { reply: msg.message_id, parse: 'HTML' });
                        if (userId === msg.from.id)
                            return bot.sendMessage(msg.chat.id, '您不得將自己從白名單中移除！', { reply: msg.message_id, parse: 'HTML' });
                        userWhitelist.splice(userWhitelist.indexOf(userId), 1);
                        return bot.sendMessage(msg.chat.id, '已將 <code>' + userId + '</code> 自白名單內移除！', { reply: msg.message_id, parse: 'HTML' });
                    }
            }
        return bot.sendMessage(msg.chat.id, '使用方法：\n/whitelist list\n/whitelist <add|remove> <userId>', { reply: msg.message_id });
    });
});

bot.connect();
