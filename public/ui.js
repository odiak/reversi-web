(function ($) {
    var re  = {},
        _re = re;
    
    re.gWorker = IOWorker('game.js');
    
    if (!re.gWorker) {
        $(function () {
            $('#wrapper').html('Your browser is not supported.');
        });
        return;
    }
    
    if (typeof console !== 'object') {
        console = {};
    }
    
    if (typeof console.log !== 'function') {
        console.log = function () {};
    }
    
    
    
    re.defaultOptions = {
        colors: {
            black: 'player',
            white: 'computer'
        },
        enableAnimation: true,
        showMovable: true
    };
    
    
    re.localStorage = (typeof localStorage === 'object' ? localStorage : {});
    
    
    re.options = (function () {
        if (typeof re.localStorage.reversiOptions !== 'string') {
            re.localStorage.reversiOptions = JSON.stringify(re.defaultOptions);
        }
        
        return JSON.parse(re.localStorage.reversiOptions);        
    })();
    
    re.saveOptionsToLocalStorage = function (obj) {
        if (typeof obj === 'object') {
            re.localStorage.reversiOptions = JSON.stringify(obj);
        } else {
            re.localStorage.reversiOptions = JSON.stringify(re.options);
        }
    };
    
    re.setDefaultOptions = function () {
        re.saveOptionsToLocalStorage(re.defaultOptions);
    };
    
    
    re.flags = {};
    re.flags.ready = $.Deferred();
    $(document).on('ready', function () {
        re.flags.ready.resolve();
    });
    
    
    re.flags.getColors = $.Deferred();
    re.gWorker.send('getColors');
    
    re.gWorker.on('setColors', function (data) {
        re.colors = data;
        re.flags.getColors.resolve();
    });
    
    
    re.flags.getSize = $.Deferred();
    re.gWorker.send('getSize');
    
    re.gWorker.on('setSize', function (data) {
        re.size = data;
        re.flags.getSize.resolve();
    });
    
    
    re.gWorker.on('log', function (data) {
        console.log(data);
    });
    
    
    re.gWorker.on('setup', function (data) {
        var re     = _re,
            board  = data,
            s      = re.size,
            black  = re.colors.black,
            white  = re.colors.white,
            i, j, e, c;
        
        for (i = 0; i < s; i++) {
            for (j = 0; j < s; j++) {
                e = re.$table.find('td').eq(i + j * s);
                
                e.removeClass();
                
                switch (board[i][j]) {
                    case black:
                    	c = 'black';
                    	break;
                    case white:
                    	c = 'white';
                    	break;
                    default:
                    	c = 'empty';
                    	break;
                }
                
                e.addClass(c);
            }
        }
    });
    
    
    re.gWorker.on('setCounter', function (data) {
        var e;
        
        e = $('#counter');
        
        e.find('.black .count').text(data.black);
        e.find('.white .count').text(data.white);
    });
    
    
    re.gWorker.on('setMovablePos', function (data) {
        var re = _re,
            s  = re.size,
            i, max_i, e;
        
        e = re.$table.find('td');
        
        re.$table.find('td.movable').removeClass();
        
        for (i = 0, max_i = data.length; i < max_i; i++) {
            e.eq(data[i].x + data[i].y * s)
            .addClass('movable');
        }
    });
    
    
    re.gWorker.on('update', function (data) {
        var re    = _re,
            x     = data.x,
            y     = data.y,
            color = data.color,
            black = re.colors.black,
            white = re.colors.white,
            s     = re.size,
            tds   = re.$table.find('td');
        
        tds.eq(x + y * s).removeClass()
        .addClass(
            color === black ? 'black' :
            color === white ? 'white' :
                    		  'empty'
        );
    });
    
    
    re.gWorker.on('notice', function (data) {
        alert(data);
    });
    
    
    re.gWorker.on('display', function (data) {
        re.$message.text(data + '');
    });
    
    
    
    $.when(
        re.flags.getColors,
        re.flags.getSize,
        re.flags.ready
    )
    .done(function () {
        var board = $('#board'),
            table = $.create('table'),
            s     = re.size,
            controllers,
            x, y,
            tr, tds,
            genFunc;
        
        board.html('');
        board.append(table);
        
        board.on('selectstart', function (event) {
            event.preventDefault();
            return false;
        });
        
        genFunc = function (x, y) {
            var pos = {x: x, y: y};
            return function () {
                re.gWorker.send('input', pos);
            };
        };
        
        for (y = 0; y < s; y++) {
            tr = $.create('tr');
            for (x = 0; x < s; x++) {
                tr.append($.create('td')
                    .append($.create('div'))
                    .click(genFunc(x, y)));
            }
            table.append(tr);
        }
        
        re.$board = board;
        re.$table = table;
        
        re.$message     = $('#message');
        re.$settings    = $('#settings');
        re.$controllers = $('#controllers');
        
        re.$controllers.find('.gameStart').click(function () {
            re.gWorker.send('start');
        });
        
        var during = 1000,
            easing = 'easeOutQuart';
        
        re.$controllers.find('.showSettings')
        .toggle(function () {
            re.$message.hide();
            re.$controllers.find('#counter').hide();
            re.$settings.slideDown(during, easing);
            re.$board.slideUp(during, easing);
            $(this).val('hide settings');
            re.$controllers.find('.gameStart').attr('disabled', 'true');
            re.gWorker.send('pause');
        }, function () {
            re.$message.show();
            re.$controllers.find('#counter').show();
            re.$settings.slideUp(during, easing);
            re.$board.slideDown(during, easing);
            $(this).val('settings');
            re.$controllers.find('.gameStart').removeAttr('disabled');
            re.gWorker.send('resume');
        });
        
        
        if (re.options.colors.black === 'player') {
            re.$settings.find('.black.player').attr('checked', 'checked');
            re.gWorker.send('change', ['black', 'player']);
        }
        else if (re.options.colors.black === 'computer') {
            re.$settings.find('.black.computer').attr('checked', 'checked');
            re.gWorker.send('change', ['black', 'computer']);
        }
        
        if (re.options.colors.white === 'player') {
            re.$settings.find('.white.player').attr('checked', 'checked');
            re.gWorker.send('change', ['white', 'player']);
        }
        else if (re.options.colors.white === 'computer') {
            re.$settings.find('.white.computer').attr('checked', 'checked');
            re.gWorker.send('change', ['white', 'computer']);
        }
        
        if (re.options.enableAnimation) {
            re.$settings.find('.enableAnimation').attr('checked', 'checked');
            re.$table.addClass('enableAnimation');
        } else {
            re.$settings.find('.enableAnimation').removeAttr('checked');
            re.$table.removeClass('enableAnimation');
        }
        
        if (re.options.showMovable) {
            re.$settings.find('.showMovable').attr('checked', 'checked');
            re.$table.addClass('showMovable');
        } else {
            re.$settings.find('.showMovable').removeAttr('checked');
            re.$table.removeClass('showMovable');
        }
        
        
        re.gWorker.send('start');
        
        
        re.$settings.find('.black.player').on('change', function () {
            re.gWorker.send('change', ['black', 'player']);
            re.options.colors.black = 'player';
            re.saveOptionsToLocalStorage();
        });
        
        re.$settings.find('.black.computer').on('change', function () {
            re.gWorker.send('change', ['black', 'computer']);
            re.options.colors.black = 'computer';
            re.saveOptionsToLocalStorage();
        });
        
        re.$settings.find('.white.player').on('change', function () {
            re.gWorker.send('change', ['white', 'player']);
            re.options.colors.white = 'player';
            re.saveOptionsToLocalStorage();
        });
        
        re.$settings.find('.white.computer').on('change', function () {
            re.gWorker.send('change', ['white', 'computer']);
            re.options.colors.white = 'computer';
            re.saveOptionsToLocalStorage();
        });
        
        re.$settings.find('.enableAnimation').on('change', function () {
            var flag = !!$(this).attr('checked');
            re.options.enableAnimation = flag;
            if (flag) {
                re.$table.addClass('enableAnimation');
            } else {
                re.$table.removeClass('enableAnimation');
            }
            re.saveOptionsToLocalStorage()
        });
        
        re.$settings.find('.showMovable').on('change', function () {
            var flag = !!$(this).attr('checked');
            re.options.showMovable = flag;
            if (flag) {
                re.$table.addClass('showMovable');
            } else {
                re.$table.removeClass('showMovable');
            }
            re.saveOptionsToLocalStorage();
        });
    });
})(jQuery);
