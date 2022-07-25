// ==UserScript==
// @name         Nataliedate
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       andxbes
// @match        https://nataliedate.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nataliedate.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'user_settings_andxbes';
    const CHAT_EXCEPTION = 'chat_exeption';
    const CHAT_INFOS = 'chatinfos';

    let last_profile = 0;

    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY));
    let dup_profiles = [];

    function get_user_tocken(){
        let result = null;
        let user = JSON.parse(localStorage.getItem("user"));
        if(user){
            //TODO токен выдается на 5 минут, далее сам на странице обновляется
            let expires = user[".expires"];
            let tocken = user?.access_token;

            console.log(expires);

            if(tocken){
                result = tocken;
            }
        }

        return result;
    };

    function get_curent_id(){
        let result = null;

        let user_profile = JSON.parse(localStorage.getItem("user_profile"));

        result = user_profile?.id;

        return result;
    };

    //Получаем историю переписки
    function get_chat_info(user_id){
        if(user_id){
            fetch('https://engbkprod2.azurewebsites.net/api/chats/' + user_id + '/messages?itemsPerPage=9&page=1&minMessageId=0' , {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    "authorization": "Bearer " + get_user_tocken()
                }
            })
                .then(response => {
                console.warn(response);
                if(response.ok !== true){
                    throw CHAT_EXCEPTION;
                }

                return response.json()
            })
                .then(body => {

                if(need_send_messages(body?.items)){

                    console.warn('Надо отправить', body.items,'всего сообщений ',messages.length );

                    send_message(user_id, body.items );
                    //window.open(`https://nataliedate.com/chats/${user_id}/messages`);

                }else{
                    console.warn('Не нужно отправлять',user_id , body.items);
                }


                remove_settings(user_id);

            })
                .catch(error => {
                //console.error(error);
                if(error === CHAT_EXCEPTION){
                    get_chat_info__2(user_id);
                }
            });
        }
    }

    //Если первая ссылка не отдает список , последний способ узнать о наличии сообщений , проверить послдеднее сообщение , и если его нет , то это 100% нужно отправить 1 е
    function get_chat_info__2(user_id){
        //https://engbkprod2.azurewebsites.net/api/chatinfos/profile/1334550

        if(user_id){
            fetch('https://engbkprod2.azurewebsites.net/api/chatinfos/profile/' + user_id , {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    "authorization": "Bearer " + get_user_tocken()
                }
            })
                .then(response => {
                console.warn(response);
                if(response.ok !== true){
                    throw CHAT_INFOS;
                }

                return response.json()
            })
                .then(body => {

                let messages = new Array();

                if(body?.lastMessage){
                    messages.push(body.lastMessage);
                }


                if(need_send_messages(messages) || messages.length == 0){
                    console.warn('Надо отправить', messages,'всего сообщений ',messages.length );

                    send_message(user_id, messages);
                }else{
                    console.warn('Не нужно отправлять', user_id , messages);
                }

                remove_settings(user_id);

            })
                .catch(error => {

                console.error(error);

            });

        }
    }


    function need_send_messages(messages,self_count){
        let result = false;
        if(Array.isArray(messages) && messages.length > 0){
            let him_messages = messages.filter(x => {
                return x.profileId != get_curent_id()
            });

            let only_you_messages = him_messages.length == 0;

            let you_messages = messages.filter(x => {
                return x.profileId == get_curent_id()
            });

            let current = new Date();
            let last = new Date(you_messages[0].creationDate);

            let diffInhours = Math.floor((current - last)/ (1000 * 60 * 60));

            let last_24 = diffInhours > 24;

            console.warn('последнее сообщение отправлено ', diffInhours, 'есть сообщение клиента' , !only_you_messages, 'твоих сообщений', you_messages);

            result = only_you_messages && last_24 && you_messages.length < 2;
        }
        return result;
    }

    function send_message(user_id, messages = []){

        let you_messages = messages.filter(x => {
            return x.profileId == get_curent_id()
        });
        let self_count = you_messages.length;

        let win = window.open(`https://nataliedate.com/profile/${user_id}?self_count=${self_count}`);
    }

    let next_index = 0;


    function process(next_index = 0){
        if(dup_profiles){

            if(next_index < dup_profiles.length){
                setTimeout(function(){
                    let profile = dup_profiles[next_index];
                    console.warn('-----------------', profile);
                    get_chat_info(profile);
                    process(++next_index);

                },1000);
            }

        }
    }

    const trigger = (el, etype, custom) => {
        const evt = custom ?? new Event( etype, { bubbles: true } );
        el.dispatchEvent( evt );
    };

    function remove_settings(user_id){
        var myIndex = settings?.prem_profiles.indexOf(user_id);
        if (myIndex !== -1) {
            settings.prem_profiles.splice(myIndex, 1);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
        console.warn('remove settings',settings);
    }


    //console.warn(location.pathname);
    if(location.pathname == '/profile/' + get_curent_id()){

        //------------------------------------------------------------- Ввод переменных ---------------------------------------------------------------------------

        if(!Array.isArray(settings?.prem_profiles) || settings.prem_profiles.length == 0){
            let prem_profiles = prompt('Введите идентификаторы премиум юзеров, разделяя пробелами', '')?.match(/\d{1,}/gs);
            prem_profiles = Array.from(new Set(prem_profiles));//уникальные id
            if(prem_profiles){
                //localStorage.setItem("prem_profiles",JSON.stringify(prem_profiles));

                let frases = [];
                if(settings?.frases.length > 0 && confirm(`Оставить предыдущие фразы ?\n${settings.frases.join('\n ---------------- \n')} `) ){
                    frases = settings.frases;
                }else{
                    frases.push(prompt('Введите первую фразу', ''));
                    frases.push(prompt('Введите вторую фразу, добивная', ''));
                }

                if(confirm(`Запустить процесс рассылки с параметрами? \n Фразы:\n${frases.join('\n ---------------- \n')} \n Профили:\n${prem_profiles.join(', \n')} `)){
                    settings = {
                        "prem_profiles": prem_profiles,
                        "frases": frases
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
                }
            }
        }

        dup_profiles = settings?.prem_profiles?.slice();
        //------------------------------------------------------- Перебор юзеров ------------------------------------------------------------------------
        process();

    }

    if(location.pathname.indexOf('/profile/') !== -1 && location.pathname !== '/profile/' + get_curent_id()){
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const self_count = urlParams.get('self_count');
        if(typeof self_count !== 'undefined' && self_count >= 0){
            window.addEventListener('load',function(){

                setTimeout(function(){

                    let button = document.querySelector('.user-profile .user-controls button.btn.btn--action.btn--user__write');
                    trigger(button, `click`);
                    setTimeout(function(){
                        let message_wrapper = document.querySelector('.message-wrapper .message-header');

                        message_wrapper.addEventListener('click',function(){
                            navigator.clipboard.writeText(settings.frases[self_count])
                                .then(() => {
                                console.log('Text copied to clipboard');
                            })
                                .catch(err => {
                                console.error('Error in copying text: ', err);
                            });
                        });

                    },1000);

                },2000);

            });

        }

    }

    /*send
    POST
    https://engbkprod2.azurewebsites.net/api/chats/-358302642/messages
    with tocken
    and body
    content: text


    */



})();
