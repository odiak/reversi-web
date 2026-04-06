(function () {
    function defer() {
        var resolve, reject;
        var promise = new Promise(function (res, rej) {
            resolve = res;
            reject = rej;
        });
        return { promise: promise, resolve: resolve, reject: reject };
    }

    function domReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function qs(root, selector) {
        return root.querySelector(selector);
    }

    function qsa(root, selector) {
        return root.querySelectorAll(selector);
    }

    /** easeOutQuart — same family as former jQuery easing name */
    var SLIDE_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';

    function slideUp(element, durationMs, done) {
        if (!element.animate) {
            element.style.display = 'none';
            done();
            return;
        }
        var h = element.offsetHeight;
        element.style.overflow = 'hidden';
        element.style.height = h + 'px';
        element.offsetHeight;
        var anim = element.animate(
            [{ height: h + 'px' }, { height: '0px' }],
            { duration: durationMs, easing: SLIDE_EASING, fill: 'forwards' }
        );
        anim.finished.then(function () {
            anim.cancel();
            element.style.display = 'none';
            element.style.height = '';
            element.style.overflow = '';
            done();
        });
    }

    function slideDown(element, durationMs, done) {
        var prevDisplay = element.style.display;
        element.style.display = '';
        var cs = getComputedStyle(element);
        if (cs.display === 'none') {
            element.style.display = 'block';
        }
        var target = element.scrollHeight;
        element.style.overflow = 'hidden';
        element.style.height = '0px';
        element.offsetHeight;
        if (!element.animate) {
            element.style.height = '';
            element.style.overflow = '';
            element.style.display = prevDisplay;
            done();
            return;
        }
        var anim = element.animate(
            [{ height: '0px' }, { height: target + 'px' }],
            { duration: durationMs, easing: SLIDE_EASING, fill: 'forwards' }
        );
        anim.finished.then(function () {
            anim.cancel();
            element.style.height = '';
            element.style.overflow = '';
            done();
        });
    }

    var re = {};

    re.gWorker = IOWorker('game.js');

    if (!re.gWorker) {
        domReady(function () {
            var w = byId('wrapper');
            if (w) w.innerHTML = 'Your browser is not supported.';
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
            white: 'computer',
        },
        enableAnimation: true,
        showMovable: true,
    };

    re.localStorage = typeof localStorage === 'object' ? localStorage : {};

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
    re.flags.ready = defer();
    domReady(function () {
        re.flags.ready.resolve();
    });

    re.flags.getColors = defer();
    re.gWorker.send('getColors');

    re.gWorker.on('setColors', function (data) {
        re.colors = data;
        re.flags.getColors.resolve();
    });

    re.flags.getSize = defer();
    re.gWorker.send('getSize');

    re.gWorker.on('setSize', function (data) {
        re.size = data;
        re.flags.getSize.resolve();
    });

    re.gWorker.on('log', function (data) {
        console.log(data);
    });

    re.gWorker.on('setup', function (data) {
        var board = data,
            s = re.size,
            black = re.colors.black,
            white = re.colors.white,
            tds = qsa(re.table, 'td'),
            i,
            j,
            e,
            c;

        for (i = 0; i < s; i++) {
            for (j = 0; j < s; j++) {
                e = tds[i + j * s];

                e.className = '';

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

                e.classList.add(c);
            }
        }
    });

    re.gWorker.on('setCounter', function (data) {
        var e = byId('counter');
        if (!e) return;
        qs(e, '.black .count').textContent = data.black;
        qs(e, '.white .count').textContent = data.white;
    });

    re.gWorker.on('setMovablePos', function (data) {
        var s = re.size,
            tds = qsa(re.table, 'td'),
            i,
            max_i;

        qsa(re.table, 'td').forEach(function (td) {
            td.classList.remove('movable');
        });

        for (i = 0, max_i = data.length; i < max_i; i++) {
            tds[data[i].x + data[i].y * s].classList.add('movable');
        }
    });

    re.gWorker.on('update', function (data) {
        var x = data.x,
            y = data.y,
            color = data.color,
            black = re.colors.black,
            white = re.colors.white,
            s = re.size,
            tds = qsa(re.table, 'td'),
            cls =
                color === black ? 'black' : color === white ? 'white' : 'empty';

        tds[x + y * s].className = cls;
    });

    re.gWorker.on('notice', function (data) {
        alert(data);
    });

    re.gWorker.on('display', function (data) {
        re.message.textContent = data + '';
    });

    Promise.all([re.flags.getColors.promise, re.flags.getSize.promise, re.flags.ready.promise]).then(
        function () {
            var boardEl = byId('board'),
                table = document.createElement('table'),
                s = re.size,
                gameStartBtn,
                showSettingsBtn,
                counterEl,
                settingsOpen = false,
                settingsAnimating = false,
                during = 1000,
                x,
                y,
                tr,
                td,
                div,
                genFunc;

            boardEl.innerHTML = '';
            boardEl.appendChild(table);

            boardEl.addEventListener('selectstart', function (event) {
                event.preventDefault();
                return false;
            });

            genFunc = function (x, y) {
                var pos = { x: x, y: y };
                return function () {
                    re.gWorker.send('input', pos);
                };
            };

            for (y = 0; y < s; y++) {
                tr = document.createElement('tr');
                for (x = 0; x < s; x++) {
                    td = document.createElement('td');
                    div = document.createElement('div');
                    td.appendChild(div);
                    td.addEventListener('click', genFunc(x, y));
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }

            re.board = boardEl;
            re.table = table;
            re.message = byId('message');
            re.settings = byId('settings');
            re.controllers = byId('controllers');

            gameStartBtn = qs(re.controllers, '.gameStart');
            showSettingsBtn = qs(re.controllers, '.showSettings');
            counterEl = byId('counter');

            gameStartBtn.addEventListener('click', function () {
                re.gWorker.send('start');
            });

            showSettingsBtn.addEventListener('click', function () {
                if (settingsAnimating) {
                    return;
                }
                settingsAnimating = true;

                var pending = 2;
                function onPanelTransitionDone() {
                    if (--pending === 0) {
                        settingsAnimating = false;
                    }
                }

                if (settingsOpen) {
                    re.message.style.display = '';
                    if (counterEl) counterEl.style.display = '';
                    slideUp(re.settings, during, onPanelTransitionDone);
                    slideDown(re.board, during, onPanelTransitionDone);
                    showSettingsBtn.value = 'settings';
                    gameStartBtn.disabled = false;
                    re.gWorker.send('resume');
                } else {
                    re.message.style.display = 'none';
                    if (counterEl) counterEl.style.display = 'none';
                    slideDown(re.settings, during, onPanelTransitionDone);
                    slideUp(re.board, during, onPanelTransitionDone);
                    showSettingsBtn.value = 'hide settings';
                    gameStartBtn.disabled = true;
                    re.gWorker.send('pause');
                }
                settingsOpen = !settingsOpen;
            });

            if (re.options.colors.black === 'player') {
                qs(re.settings, '.black.player').checked = true;
                re.gWorker.send('change', ['black', 'player']);
            } else if (re.options.colors.black === 'computer') {
                qs(re.settings, '.black.computer').checked = true;
                re.gWorker.send('change', ['black', 'computer']);
            }

            if (re.options.colors.white === 'player') {
                qs(re.settings, '.white.player').checked = true;
                re.gWorker.send('change', ['white', 'player']);
            } else if (re.options.colors.white === 'computer') {
                qs(re.settings, '.white.computer').checked = true;
                re.gWorker.send('change', ['white', 'computer']);
            }

            if (re.options.enableAnimation) {
                qs(re.settings, '.enableAnimation').checked = true;
                re.table.classList.add('enableAnimation');
            } else {
                qs(re.settings, '.enableAnimation').checked = false;
                re.table.classList.remove('enableAnimation');
            }

            if (re.options.showMovable) {
                qs(re.settings, '.showMovable').checked = true;
                re.table.classList.add('showMovable');
            } else {
                qs(re.settings, '.showMovable').checked = false;
                re.table.classList.remove('showMovable');
            }

            re.gWorker.send('start');

            qs(re.settings, '.black.player').addEventListener('change', function () {
                re.gWorker.send('change', ['black', 'player']);
                re.options.colors.black = 'player';
                re.saveOptionsToLocalStorage();
            });

            qs(re.settings, '.black.computer').addEventListener('change', function () {
                re.gWorker.send('change', ['black', 'computer']);
                re.options.colors.black = 'computer';
                re.saveOptionsToLocalStorage();
            });

            qs(re.settings, '.white.player').addEventListener('change', function () {
                re.gWorker.send('change', ['white', 'player']);
                re.options.colors.white = 'player';
                re.saveOptionsToLocalStorage();
            });

            qs(re.settings, '.white.computer').addEventListener('change', function () {
                re.gWorker.send('change', ['white', 'computer']);
                re.options.colors.white = 'computer';
                re.saveOptionsToLocalStorage();
            });

            qs(re.settings, '.enableAnimation').addEventListener('change', function () {
                var flag = this.checked;
                re.options.enableAnimation = flag;
                if (flag) {
                    re.table.classList.add('enableAnimation');
                } else {
                    re.table.classList.remove('enableAnimation');
                }
                re.saveOptionsToLocalStorage();
            });

            qs(re.settings, '.showMovable').addEventListener('change', function () {
                var flag = this.checked;
                re.options.showMovable = flag;
                if (flag) {
                    re.table.classList.add('showMovable');
                } else {
                    re.table.classList.remove('showMovable');
                }
                re.saveOptionsToLocalStorage();
            });
        }
    );
})();
