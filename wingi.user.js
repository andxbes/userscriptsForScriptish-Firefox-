// ==UserScript==
// @name        c.wingi.ru
// @namespace   work
// @author         andxbes
// @include     http://c.wingi.ru/*
// @version     1
// @grant       none
// @run-at       document-end
// ==/UserScript==


(function($) {
    'use strict';
    // Your code here...
    function some(){
        var el = $('#post-lock-dialog');
        if(el.css('display')=='block'){
            
            var blackQ = $('.notification-dialog-background');
            var publichButton = $('#publish');
            if(blackQ.length > 0 && publichButton.length > 0 ){
               blackQ.remove();
               publichButton.remove();
               $('.notification-dialog').css('top','10%');
               console.info('убираем');
            }
      }

    }
   var timerId=setInterval(some, 3000); 
})(jQuery);
