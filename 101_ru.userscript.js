// ==UserScript==
// @id             101.ru
// @name           101.ru
// @version        2.0
// @namespace      
// @author         andxbes
// @description    
// @include        http://101.ru/*
// @require 		http://ajax.googleapis.com/ajax/libs/jquery/1.3/jquery.min.js
// @run-at         document-end
// ==/UserScript==
(function (window, undefined) {
  var w;
  var serialNumber = 0;
  var playMp3 = null;
  if (typeof unsafeWindow != undefined) {
    w = unsafeWindow
  } else {
    w = window;
  }
  if (w.self != w.top) {
    return;
  }
  
  //инициализируем при переключении вкладок 
  $('#channel_tabs').click(function () {
           setTimeout(initClickListenerForPlayClass,1500);
  });
  
  
  //функция инициализации события 
  function initClickListenerForPlayClass() {
    w.console.info("событие click установлено для .play  ");
    
    $('.play').click(function () {
      if (playMp3 !== null) {
        w.console.info('pause' + serialNumber);
        playMp3.pause();
        $(playMp3.parentNode).remove();
      }
      var flashvars = $(this).attr('flashvars');
      var mp3 = flashvars.slice(9, flashvars.length - 2);
      w.console.info(mp3);
      $(this).after('<div><audio id="' + serialNumber + '"  src=\'' + mp3 + '\' controls  ></audio> <a href=\'' + mp3 + '\'>Скачать</a></div>');
      playMp3 = document.getElementById('' + serialNumber);
      serialNumber++;
      playMp3.play();
    });
  }
  
  
  //Инициализируем при загрузке страницы 
  initClickListenerForPlayClass();
  
}) (window);
