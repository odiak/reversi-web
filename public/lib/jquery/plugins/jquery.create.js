/* 

jquery.create.js: jQuery plugin, extension of document.createElement().
written by odiak (kaido@odiak.net).
Public Domain.

examples:
  $.create('div')
  --> <div></div>
  
  $.create('a', {href: 'http://example.com'}, 'link')
  --> <a href="http://example.com/">link</a>
  
  $.create('span', 'a')
  --> <span>a</span>
  
  $.create('input', {type: 'button', value: 'click!'})
  --> <input type="button" value="click!" />
  
  $.create('p', 'hello!', {class: 'bold'})
  --> <p class="bold">hello!</p>

*/


(function ($) {    
    $.create = function (t, i, a) {
        var e, tagName, innerText, attributes, textNode, key, attribute;
        var d = document;
        
        typeof i === 'object' && (i = i.valueOf());
        typeof a === 'object' && (a = a.valueOf());
        
        tagName    = '' + (t || '');
        innerText  = (typeof i === 'string' && i) || (typeof a === 'string' && a) || '';
        attributes = (typeof a === 'object' && a) || (typeof i === 'object' && i) || {};
        
        if (!tagName) { return; }
        
        e = d.createElement(t);
        textNode = d.createTextNode(innerText);
        e.appendChild(textNode);
        
        for (key in attributes) if (attributes.hasOwnProperty(key)) {
            attribute = d.createAttribute(key);
            attribute.nodeValue = attributes[key];
            e.setAttributeNode(attribute);
        }
        
        e = $(e);
        return e;
    };
})(jQuery);