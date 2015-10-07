// ==UserScript==
// @name        urodremove
// @namespace   andxbes
// @description удаляем блоки не дающие смотреть видео . 
// @include     http://urod.ru/*
// @require 		http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @version     1
// @grant       none
// @run-at         document-end
// ==/UserScript==
//otodiv

$('.otodiv').remove();
console.info('удалили');