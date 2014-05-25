(function ($) {
  $.fn.__toggle = $.fn.toggle;
  $.fn.toggle = function () {
    var args = Array.prototype.slice.apply(arguments);
    var i = 0;
    if (typeof args[0] !== 'function') {
      $(this).__toggle.apply(this, args);
      return;
    }
    $(this).on('click', function (ev) {
      args[i].apply(this, arguments);
      i = (i + 1) % args.length;
    });
  };
})(jQuery);
