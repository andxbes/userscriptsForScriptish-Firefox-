// ==UserScript==
// @id             101.ru
// @name           101.ru
// @version        2.0
// @namespace      
// @author         andxbes
// @description    
// @include        http://101.ru/*
// @require 		http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @run-at         document-end
// ==/UserScript==


  Player();






function Player() {
    var obj = this;//ссылка на текущий обьект 
    this.playMusic = null;
    this.log = function (str) {
        window.console.info(str);
    };
    this.log("конструктор");
    this.$playsNode = null;//обьекты старого дома 
    this.$currentPlayers = null; // обьекты нового дома (плеера)

    //ищем инициализируем наши плеера , добавляем обработку событий на воспроизведение  
    this.initPlaysNode = function () {
       
       
        $playsNode = $('[flashvars]');

        obj.addNodePlayer();

        obj.addEventChangeStatusPlaer();
    };

    //при смене вкладки(привязываем обработчик события) или загрузке страницы запускает процесс построения DOM
    this.addEventChangeShanelTabs = function () {

        $('#channel_tabs').click(function () {

            setTimeout(obj.initPlaysNode, 1000);
        });
    };

    this.addEventChangeStatusPlaer = function () {
        $currentPlayers = $('.myPlayer audio');
        playMusic = $currentPlayers[0];
        playMusic.play();

        for (var i = 0, max = $currentPlayers.length; i < max; i++) {

            //реализуем перелистывание на следующий трек 
            $currentPlayers[i].addEventListener('ended', function (x, $current) {
                return function () {
                    obj.log("The audio has ended");
                    if (x < $current.length - 1)
                        playMusic = $current[x + 1 ];
                    else
                        playMusic = $current[0];
                    playMusic.play();
                };
            }(i, $currentPlayers));//замыкаем 

            // останавливаем предидущий  плеер .
            $currentPlayers[i].addEventListener('play', function () {
                if (playMusic == this)
                    return;
                obj.log("The audio has pause");
                playMusic.pause();
                playMusic.currentTime = 0;
                playMusic = this;

            });
        }
       
    };

    this.addEventChangeShanelTabs();

    this.addNodePlayer = function () {
        var panel = $(".list.tracks");

        panel.empty();//удаляем мусор
        panel.css('left', '0px').css('background', '#E9F8B0').css('color', '#6B0035');
        for (var play = 0; play < $playsNode.length; play++) {

            var ob = $playsNode[play];

            var mp3 = obj.getUrl(ob);
            var id = obj.getId(mp3);
            var name = obj.getName(ob);
            

            obj.log("name - " + name + "\n id - " + id + "\n url - " + mp3);

            panel.append('<div class="myBlock"><div class="myPlayerName" ><a>' + name + '</a>\n\
                <a class="h3 icon add right personal-tracks" href="#" favid="' + id + '" favmodule="channel" ></a></div>\n\
                <div class="myPlayer" ><audio id=' + id + ' src=\'' + mp3 + '\' controls ><br/><br/></audio> \n\
                <a href=' + mp3 + ' download="' + name + '.mp3" >Скачать</a></div>');
        }



        $(".myPlayer,.myPlayerName").css('position', 'relative').css('float', 'center').css('left', '0px');
        $('.myPlayerName').css('background', '#ACCBF3');

    };

    //Todo
    this.getUrl = function (node) {
        var flashvars = $(node).attr('flashvars');
        var mp3 = flashvars.slice(9, flashvars.length - 2);
        return mp3;
    };

    this.getName = function (node) {
        var text = $(node).text();
        return text;
    };

    this.getId = function (url) {
        var temp = url.split('\/');
        var id = temp[temp.length - 1];
        return id.slice(0, id.length - 4);
    };


    $('#channel_tabs').trigger('click');
}
