// ==UserScript==
// @name         Убираем блокировку на c.wingi.ru
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Убираем блокировку .
// @author       andxbes
// @match        http://c.wingi.ru/*
// @grant        none
// ==/UserScript==

(function($) {
    'use strict';
    // Your code here...
    $('.notification-dialog-background , #publish').remove();
    $('.notification-dialog').css('top','10%');

  
})(jQuery);
