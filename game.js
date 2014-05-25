(function () {
    var re  = {},
        _re = re;
    
    
    re.size  =  8;
    
    re.black = -1;
    re.empty =  0;
    re.white =  1;
    
    re.colors = {
        black: re.black,
        white: re.white,
        empty: re.empty
    };
    
    re.first = re.black;
    
    re.player   = 0;
    re.computer = 1;
    
    re.which = {}
    
    re.which.black = re.player;
    re.which.white = re.computer;
    
    re.isPlayer = function (color) {
        var re = _re;
        return ((color === re.black && re.which.black === re.player) ||
                (color === re.white && re.which.white === re.player));
    };
    
    re.board = [];
    
    re.liberty = [];
    
    re.updateLog    = [];
    re.movablePos   = [];
    re.movableDir   = [];
    re.discs        = [];
    re.turns        = 0;
    re.currentColor = re.first;
    
    re.maxTurns     = 60;
    
    re.isStarted    = false;
    re.readyInput   = false;
    
    re.vectors = [
        [-1, -1],
        [-1,  0],
        [-1,  1],
        [ 0, -1],
    //  [ 0,  0],
        [ 0,  1],
        [ 1, -1],
        [ 1,  0],
        [ 1,  1]
    ];
    
    
    
    importScripts('/lib/json2.js');
    importScripts('ioworker.js');
    re.io = IOWorker;
    
    
    re.io.on('getColors', function () {
        re.io.send('setColors', re.colors);
    });
    
    
    re.io.on('getSize', function () {
        re.io.send('setSize', re.size);
    });
    
    
    re.io.on('input', function (data) {
        var re = _re;
        
        if (!re.isStarted || !re.readyInput) { return; }
        
        if (!isNaN(-data.x)) if (!isNaN(-data.y)) re.input(data.x, data.y); 
    });
    
    
    re.io.on('start', function () {
        re.gameStart();
    });
    
    
    re.io.on('change', function (data) {
        var re = _re;
        
        if ((data[0] === 'black'  || data[0] === 'white') &&
            (data[1] === 'player' || data[1] === 'computer')) {
            re.which[data[0]] = re[data[1]];
        }
    });
    
    
    re.io.on('pause', function () {
        re.pause();
    });
    
    
    re.io.on('resume', function () {
        re.resume();
    });
    
    
    re.log = function (str) {
        re.io.send('log', str);
    };
    
    
    
    re.sleep = function (msec) {
        var d = new Date - 0;
        while ((new Date - d) < msec);
    };
    
    
    
    re.input = function (x, y) {
        var re  = _re,
            res, obj;
        
        if (!re.readyInput) return;
        
        res = re.move({
            x: x,
            y: y,
            color: re.currentColor
        });
        
        if (!res) if (re.isPlayer(re.currentColor)) {
            re.display('cannot move there');
            return;
        }
        
        re.readyInput = false;
        
        re.nextTurn();
    };
    
    
    
    re.pushUpdates = function () {
        var re        = _re,
            updateLog = re.updateLog,
            updates   = updateLog.length
                ? updateLog[updateLog.length - 1]
                : false,
            i, max_i, obj;
        
        if (!updates) { return false; }
        
        obj = {
            color: -re.currentColor
        };
        
        for (i = 0, max_i = updates.length; i < max_i; i++) {
            obj.x = updates[i].x;
            obj.y = updates[i].y;
            re.sleep(30);
            re.io.send('update', obj);
        }
    };
    
    
    
    re.display = function (str) {
        re.io.send('display', str + '');
    };
    
    
    
    re.notice = function (str) {
        re.io.send('notice', str + '');
    };
    
    
    
    re.setCounter = function () {
        var re    = _re,
            discs = re.discs;
        
        re.io.send('setCounter', {
            black: discs[re.black + 1],
            white: discs[re.white + 1]
        });
    };
    
    
    
    re.showMovable = function () {
        var re = _re;
        re.io.send('setMovablePos', re.movablePos[re.turns]);
    };
    
    
    
    re.updateBoard = function () {
        var re    = _re,
            board = re.board;
        
        re.io.send('setup', board);
    };
    
    
    
    re.pause = function () {
        re.isPaused   = true;
        re.readyInput = false;
    };
    
    
    
    re.resume = function () {
        re.isPaused = false;
        re.nextTurn();
    };
    
    
    
    re.gameStart = function () {
        var re = _re;
        
        re.init();
        re.isStarted  = true;
        re.readyInput = false;
        
        re.updateBoard();
        
        //re.display('game is started');
        
        re.nextTurn();
    };
    
    
    
    re.gameEnd = function () {
        var re = _re,
            b  = re.discs[re.black + 1],
            w  = re.discs[re.white + 1],
            res;
        
        re.isStarted  = false;
        re.readyInput = false;
        
        res = 'Game Over & ';
        
        if (b > w) {
            res += 'Black wins!';
        } else if (b < w) {
            res += 'White wins!';
        } else {
            res += 'There is a tie!'
        }
        
        re.display(res);
    };
    
    
    
    re.init = function () {
        var re      = _re,
            s       = re.size,
            board   = re.board,
            black   = re.black,
            white   = re.white,
            empty   = re.empty,
            colors  = re.colors,
            liberty = re.liberty,
            i, j;
        
        for (i = s; i--;) {
            board[i]   = [];
            liberty[i] = [];
            for (j = s; j--;) {
                board[i][j] = empty;
                liberty[i][j] = 8;
            }
        }
        
        board[3][3] =
        board[4][4] = white;
        board[3][4] =
        board[4][3] = black;
        
        re.decreaseLiberty({x: 3, y: 3});
        re.decreaseLiberty({x: 3, y: 4});
        re.decreaseLiberty({x: 4, y: 3});
        re.decreaseLiberty({x: 4, y: 4});
                
        re.discs[black + 1] = 2;
        re.discs[white + 1] = 2;
        re.discs[empty + 1] = s * s - 4;
        
        re.turns = 0;
        re.currentColor = black;
        
        re.updateLog = [];
        
        re.initMovable();
        
        return true;
    };
    
    
    
    re.checkMobility = function (pos) {
        var re    = _re,
            x     = pos.x,
            y     = pos.y,
            color = pos.color,
            s     = re.size,
            res   = [],
            board = re.board,
            vx, vy,
            px, py,
            count;
        
        if (board[x][y] !== re.empty) {
            return res;
        }
        
        for (vx = -1; vx <= 1; vx++) {
            for (vy = -1; vy <= 1; vy++) {
                if (vx !== 0 || vy !== 0) {
                    px = x + vx;
                    py = y + vy;
                    count = 0;
                    
                    while (0 <= px && px < s && 0 <= py && py < s && board[px][py] === -color) {
                        px += vx;
                        py += vy;
                        count ++;
                    }
                    
                    if (count && 0 <= px && px < s && 0 <= py && py < s && board[px][py] === color) {
                        res[3 * (vx + 1) + (vy + 1)] = count;
                    }
                }
            }
        }
        
        return res;
    };
    
    
    
    re.move = function (pos) {
        var re    = _re,
            x     = pos.x,
            y     = pos.y,
            s     = re.size,
            turns = re.turns;
        
        if (x < 0 || s <= x) { return false; }
        if (y < 0 || s <= y) { return false; }
        if (re.movableDir[turns][x][y].length === 0) { return false; }
        
        re.turnOver(pos);
        
        re.decreaseLiberty(pos);
        
        re.turns++;
        re.currentColor = -re.currentColor;
        
        re.initMovable();
        
        return true;
    };
    
    
    
    re.initMovable = function () {
        var re  = _re,
            pos = {},
            s   = re.size,
            t   = re.turns,
            res, x, y;
        
        re.movablePos[t] = [];
        re.movableDir[t] = [];
        
        for (x = 0; x < s; x++) {
            re.movableDir[t][x] = [];
            for (y = 0; y < s; y++) {
                pos = {
                    x: x,
                    y: y,
                    color: re.currentColor
                };
                res = re.checkMobility(pos);
                res.length && re.movablePos[t].push(pos);
                re.movableDir[t][x][y] = res;
            }
        }
    };
    
    
    
    re.turnOver = function (pos) {
        var re      = _re,
            t       = re.turns,
            s       = re.size,
            c       = re.currentColor,
            x       = pos.x,
            y       = pos.y,
            vx, vy,
            i,
            diff,
            res,
            updates = [];
            board   = re.board,
            dir     = re.movableDir[t][x][y];
        
        board[x][y] = re.currentColor;
        updates.push({
            x: x,
            y: y,
            color: c
        });
        
        for (vx = -1; vx <= 1; vx++) {
            for (vy = -1; vy <= 1; vy++) {
                if (vx !== 0 || vy !== 0) {
                    res = dir[3 * (vx + 1) + (vy + 1)];
                    if (res) {
                        x = pos.x;
                        y = pos.y;
                        for (i = 0; i < res; i++) {
                            x += vx;
                            y += vy;
                            board[x][y] = c;
                            updates.push({
                                x: x,
                                y: y,
                                color: c
                            });
                        }
                    }
                }
            }
        }
        
        diff = updates.length;
        
        re.discs[ c + 1] += diff;
        re.discs[-c + 1] -= diff - 1;
        re.discs[_re.empty + 1] -= 1;
        
        re.updateLog.push(updates);
    };
    
    
    
    re.isGameOver = function () {
        var re           = _re,
            s            = re.size,
            c            = re.currentColor,
            t            = re.turns,
            maxTurns     = re.maxTurns,
            movablePos   = re.movablePos,
            disc         = {color: -c},
            x, y, res;
        
        if (t === maxTurns) {
            return true;
        }
        
        if (movablePos[t].length) {
            return false;
        }
        
        for (x = 0; x < s; x++) {
            disc.x = x;
            for (y = 0; y < s; y++) {
                disc.y = y;
                
                if (re.checkMobility(disc).length) {
                    return false;
                }
            }
        }
        
        return true;
    };
    
    
    
    re.pass = function () {
        var re           = _re,
            movablePos = re.movablePos,
            turns        = re.turns,
            updateLog    = re.updateLog;
        
        if (movablePos[turns].length) { return false; }
        if (re.isGameOver())          { return false; }
        
        re.currentColor = -re.currentColor;
        updateLog.push([]);
        
        re.initMovable();
        
        return true;
    };
    
    
    
    re.undo = function () {
        var re            = _re,
            turns         = re.turns,
            updateLog     = re.updateLog,
            movablePos    = re.movablePos,
            movableDir    = re.movableDir,
            board         = re.board,
            updates       = updateLog.length
                ? updateLog[updateLog.length - 1].slice(0)
                : false,
            updatesLength = updates.length,
            s             = re.size,
            discs         = re.discs,
            empty         = re.empty,
            x, y, i, max_i, diff;
        
        if (turns === 0) { return false; }
        if (!updates)    { return false; }
        
        re.currentColor = -re.currentColor;
        
        if (!updates.length) {
            movablePos[turns] = [];
            for (x = 0; x < s; x++) {
                for (y = 0; y < s; y++) {
                    movableDir[turns][x][y] = [];
                }
            }
        } else {
            re.turns--;
            
            x = updates[0].x;
            y = updates[0].y;
            board[x][y] = re.empty;
            
            re.decreaseLiberty(updates[0], -1);
            
            for (i = 1, max_i = updatesLength; i < max_i; i++) {
                x = updates[i].x;
                y = updates[i].y;
                board[x][y] = -re.currentColor;
            }
            
            diff = updatesLength;
            discs[ re.currentColor + 1] -= diff;
            discs[-re.currentColor + 1] += diff - 1;
            discs[ empty           + 1] -= 1;
        }
        
        updateLog.pop();
        
        return true;
    };
    
    
    
    re.nextTurn = (function () {
        var func = function () {
            var re     = _re,
                black  = re.black,
                white  = re.white,
                which  = re.which,
                player = re.player,
                color  = re.currentColor,
                delay  = 0;
            
            re.setCounter();
            re.pushUpdates();
            re.showMovable();
            
            if (re.isGameOver()) {
                re.gameEnd();
                return;
            }
            
            re.pass();
            
            re.setCounter();
            re.pushUpdates();
            re.showMovable();
            
            re.readyInput = false;
            
            color = re.currentColor;
            
            if (color === black) {
                re.display('Black\'s Turn.');
            } else {
                re.display('White\'s Turn.');
            }
            
            if (re.isPlayer(color)) {
                re.readyInput = true;
            } else {
                re.sleep(delay);
                re.AI();
            }
        };
        
        return function () {
            setTimeout(func, 0);
        };
    })();
    
    
    
    re.decreaseLiberty = function (p, d) {
        var re      = _re,
            x       = p.x,
            y       = p.y,
            s       = re.size,
            v       = re.vectors,
            liberty = re.liberty,
            vx, vy,
            _x, _y,
            i, max_i;
        
        if (typeof d !== 'number') {
            d = 1;
        }
        d = ~~(d);
        
        for (i = 0, max_i = v.length; i < max_i; i++) {
            vx = v[i][0];
            vy = v[i][1];
            _x = x + vx;
            _y = y + vy;
            if (0 <= _x && 0 <= _y && _x < s && _y < s) {
                liberty[_x][_y] -= d;
            }
        }
    };
    
    
    
    re.AI = function () {
        var re           = _re,
            movablePos   = re.movablePos,
            turns        = re.turns;
        
        re.AI.move();
                
        re.nextTurn();
    };
    
    
    
    re.AI.normal_depth    = 5;
    re.AI.wld_depth       = 10;
    re.AI.presearch_depth = 2;
    
    
    
    re.AI.move = function () {
        var re       = _re,
            movables = re.movablePos[re.turns],
            i, max_i, val,
            k, depth,
            alpha, beta;
        
        k = 0;
        
        alpha = -1e+100;
        beta  = -alpha;
                
        if (re.turns < (re.maxTurns - re.AI.wld_depth)) {
            depth = re.AI.normal_depth;
            re.AI.wld = false;
        } else {
            depth = re.maxTurns - re.turns;
            re.AI.wld = true;
        }
        
        if (movables.length === 1) {
            k = 0;
        }
        
        else {
            re.shuffle(movables);
            movables = re.AI.sort(movables, alpha, beta, re.AI.presearch_depth);
            
            for (i = 0, max_i = movables.length; i < max_i; i++) {
                re.move(movables[i]);
                val = -re.AI.negamax(depth, -beta, -alpha);
                re.undo();
                
                if (val > alpha) {
                    k = i;
                    alpha = val;
                }
            }
        }
        
        if (!re.isPaused) {
            re.move(movables[k]);
        }
    };
    
    
    
    re.AI.sort = function (movables, alpha, beta, depth) {
        var i, max_i, list = [], res,
            _movables = [];
        
        for (i = 0, max_i = movables.length; i < max_i; i++) {
            list[i] = {};
            list[i].k = i;
            res = re.move(movables[i]);
            list[i].v = -re.AI.negamax(depth, -beta, -alpha);
            if (res) { re.undo(); }
        }
        
        list.sort(function (a, b) {
            return b.v - a.v;
        });
        
        for (i = 0, max_i = list.length; i < max_i; i++) {
            _movables[i] = movables[list[i].k];
        }
        
        return _movables;
    };
    
    
    
    re.shuffle = function (arr) {
        var i = arr.length, j, t;
        while (i) {
            j = Math.floor(Math.random()*i);
            t = arr[--i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    };
    
    
    
    re.AI.negamax = function (depth, alpha, beta) {
        var re       = _re,
            turns    = re.turns,
            movables = re.movablePos[turns],
            val,
            i, len;
        
        if (re.isGameOver() || !depth) {
            return re.AI.evaluate();
        }
        
        if (!movables.length) {
            re.pass();
            val = -re.AI.negamax(depth - 1, -beta, -alpha);
            re.undo();
            return val;
        }
        
        for (i = 0, len = movables.length; i < len; i++) {
            re.move(movables[i]);
            val = -re.AI.negamax(depth - 1, -beta, -alpha);
            re.undo();
            
            if (val >= beta) {
                return val;
            }
            
            alpha = Math.max(alpha, val);
        }
        
        return alpha;
    };
    
    
    
    re.AI.evaluate = function () {
        var re       = _re,
            evaluate = re.AI.evaluate,
            weight   = evaluate.weight,
            color    = re.currentColor,
            val      = 0;
        
        if (!re.AI.wld) {
            
            val += evaluate.countMobility();
            val += evaluate.checkLiberty ( color);
            val -= evaluate.checkLiberty (-color);
            val += evaluate.checkEdge    ( color);
            val -= evaluate.checkEdge    (-color);
            val += evaluate.checkX       ( color);
            val -= evaluate.checkX       (-color);
            
        } else {
            
            val += evaluate.perfectEvaluate();
            
        }
        
        return val;
    };
    
    
    
    re.AI.evaluate.weight = {
        mobility: 67,
        liberty:  -13,
        stable:   110,
        corner:   200,
        wing:     -308,
        cmove:    -449,
        xmove:    -552
    };
    
    
    re.AI.evaluate.countMobility = function () {
        var re = _re;
        return re.movablePos[re.turns].length * re.AI.evaluate.weight.mobility;
    };
    
    
    re.AI.evaluate.checkLiberty = function (color) {
        var re      = _re,
            board   = re.board,
            s       = re.size,
            liberty = re.liberty,
            weight  = re.AI.evaluate.weight,
            res     = 0,
            i, j;
        
        for (i = 0; i < s; i++) {
            for (j = 0; j < s; j++) {
                if (board[i][j] === color) {
                    res += liberty[i][j];
                }
            }
        }
        
        return res * weight.liberty;
    };
    
    
    re.AI.evaluate.checkX = function (color) {
        var re     = _re,
            board  = re.board,
            empty  = re.empty,
            weight = re.AI.evaluate.weight,
            pos, p,
            i, max_i,
            x1, y1, x2, y2,
            res = 0;
        
        pos = [
            [[0, 0], [1, 1]],
            [[0, 7], [1, 6]],
            [[7, 0], [6, 1]],
            [[7, 7], [6, 6]]
        ];
        
        for (i = 0, max_i = pos.length; i < max_i; i++) {
            p  = pos[i];
            x1 = p[0][0];
            y1 = p[0][1];
            x2 = p[1][0];
            y2 = p[1][1];
            
            if (board[x1][y1] === empty && board[x2][y2] === color) {
                res++;
            }
        }
        
        return res * weight.xmove;
    };
    
    
    re.AI.evaluate.checkEdge = function (color) {
        var re     = _re,
            s      = re.size,
            board  = re.board,
            empty  = re.empty,
            weight = re.AI.evaluate.weight,
            x, y,
            xyvset,
            pos, _pos, p,
            i, max_i,
            j, max_j,
            vx, vy,
            c, f,
            stable = 0,
            corner = 0,
            wing   = 0,
            cmove  = 0;
        
        xyvset = [
            [[0, 0], [ 1,  0]],
            [[0, 0], [ 0,  1]],
            [[0, 7], [ 1,  0]],
            [[0, 7], [ 0, -1]],
            [[7, 0], [-1,  0]],
            [[7, 0], [ 0,  1]],
            [[7, 7], [-1,  0]],
            [[7, 7], [-1, -1]]
        ];
        
        pos = [];
        for (i = 0, max_i = xyvset.length; i < max_i; i++) {
            x  = xyvset[i][0][0];
            y  = xyvset[i][0][1];
            vx = xyvset[i][1][0];
            vy = xyvset[i][1][1];
            _pos = [];
            while (0 <= x && 0 <= y && x < s && y < s) {
                _pos.push(board[x][y]);
                x += vx;
                y += vy;
            }
            pos.push(_pos.slice(0));
        }
        
        
        for (i = 0, max_i = pos.length; i < max_i; i++) {
            c = 0;
            p = pos[i];
            for (j = 0, max_j = p.length; j < max_j; j++) {
                if (p[j] === color) {
                    c += 1;
                } else {
                    break;
                }
            }
            
            stable += c;
            
            if (p[0] === color) {
                corner += 1;
            }
            
            f = p[1] === color &&
                p[2] === color &&
                p[3] === color &&
                p[4] === color &&
                p[5] === color &&
                p[6] === color;
            
            if (f) {
                wing += 1;
            }
            
            if (p[0] === empty && p[1] === color) {
                cmove += 1;
            }
        }
        
        return stable * weight.stable
             + corner * weight.corner
             + wing   * weight.wing
             + cmove  * weight.cmove;
    };
    
    
    
    re.AI.evaluate.perfectEvaluate = function () {
        var re = _re;
        return re.discs[ re.currentColor]
             - re.discs[-re.currentColor];
    };
})();
