// ==UserScript==
// @name         Nataliedate
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  try to take over the world!
// @author       andxbes
// @match        https://nataliedate.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nataliedate.com
// @grant        GM_addStyle
// @grant        GM_addElement
// @run-at       document-idle
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#api:GM_addElement

(function () {
    'use strict';

    const STORAGE_KEY = 'user_settings_andxbes_';
    const CHAT_EXCEPTION = 'chat_exception';
    const CHAT_INFOS = 'chat_info';

    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY + get_current_id()));
    let all_frases = settings?.phrases?.length ? settings.phrases.length : 0;
    let dup_profiles = [];


    let errorPhrases = [];
    let allSuccessSended = 0;

    function save_data(phrases = [], users = []) {
        if (users.length > 0) {
            users = Array.from(new Set(users));
        }

        let settings = {
            "prem_profiles": users,
            "phrases": phrases
        };

        localStorage.setItem(STORAGE_KEY + get_current_id(), JSON.stringify(settings));

        return settings;
    }


    function array_column(a, i, ok) {
        return a.reduce((c, v, k) => {
            if (ok === undefined) {
                c[k] = v[i];
            } else {
                c[v[ok]] = v[i]
            }
            return c;
        }, [])
    }

    function get_user_token() {
        let result = null;
        let user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            //TODO токен выдается на 5 минут, далее сам на странице обновляется
            let expires = user[".expires"];
            let token = user?.access_token;

            if (token) {
                result = token;
            }
        }

        return result;
    };

    function get_visit_token() {
        return JSON.parse(localStorage.getItem("visitToken"))?.token;
    }

    function get_current_id() {
        let result = null;

        let user_profile = JSON.parse(localStorage.getItem("user_profile"));

        result = user_profile?.id;

        return result;
    };


    function set_phrases() {
        let phrases = [];
        if (settings?.phrases?.length > 0 && confirm(`Оставить предыдущие фразы ?\n${settings.phrases.join('\n ---------------------- \n')} `)) {
            phrases = settings.phrases;
        } else {
            phrases.push(prompt('Введите первую фразу', ''));

            for (let i = 1; confirm(`Добавить следующую добивную фразу в цепочку ?`); i++) {
                let fr = prompt(`Введите добивную фразу №${i}`, '');
                if (fr !== null && fr !== '') {
                    phrases.push(fr);
                }
            }

        }
        return phrases;
    }

    //Получаем историю переписки
    //     function get_chat_info(chat_id, func){
    //         if(chat_id){
    //             fetch('https://engbkprod2.azurewebsites.net/api/chats/' + chat_id + '/messages?itemsPerPage=9&page=1&minMessageId=0' , {
    //                 method: 'GET',
    //                 cache: 'no-cache',
    //                 headers: {
    //                     "authorization": "Bearer " + get_user_token()
    //                 }
    //             })
    //                 .then(response => {
    //                 console.warn(response);
    //                 if(response.ok !== true){
    //                     throw CHAT_EXCEPTION;
    //                 }

    //                 return response.json()
    //             })
    //                 .then(body => {

    //                 if(need_send_messages(body?.items)){

    //                     console.warn('Надо отправить', body.items,'всего сообщений ',body.items.length );

    //                     func(body.items);

    //                 }else{
    //                     //console.warn('Не нужно отправлять',chat_id , body.items);
    //                 }

    //             })
    //                 .catch(error => {
    //                 console.error(error);
    //             });
    //         }
    //     }

    //Если первая ссылка не отдает список , последний способ узнать о наличии сообщений , проверить послдеднее сообщение , и если его нет , то это 100% нужно отправить 1 е
    async function get_chat_info__2(user_id, func) {
        //https://engbkprod2.azurewebsites.net/api/chatinfos/profile/1334550

        if (user_id) {
            let response = await fetch('https://engbkprod2.azurewebsites.net/api/chatinfos/profile/' + user_id, {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    "authorization": "Bearer " + get_user_token()
                }
            });
            if (response.ok === true) {
                let body = await response.json();

                let messages = new Array();

                if (body?.lastMessage) {
                    messages.push(body.lastMessage);
                }

                if (need_send_messages(messages) || messages.length == 0) {
                    // console.warn('Надо отправить' , user_id , messages, 'всего сообщений ',messages.length );
                    await func(user_id, messages);
                }
            }
        }
    }


    function need_send_messages(messages, self_count) {
        let result = false;
        if (Array.isArray(messages) && messages.length > 0) {
            let him_messages = messages.filter(x => {
                return x.profileId != get_current_id()
            });

            let only_you_messages = him_messages.length == 0;

            let you_messages = messages.filter(x => {
                return x.profileId == get_current_id()
            });
            let diff_In_Hours = 99;
            if (you_messages.length > 0) {
                let current = new Date();
                let last = new Date(you_messages[0].creationDate);
                diff_In_Hours = Math.floor((current - last) / (1000 * 60 * 60));
            }
            let last_12 = diff_In_Hours > 2; // 2 часа

            //console.warn('последнее сообщение отправлено ', diff_In_Hours, 'есть сообщение клиента' , !only_you_messages, 'твоих сообщений', you_messages);

            result = only_you_messages && last_12 && you_messages.length < 2;
        }
        return result;
    }


    function select_phrase(last_message) {
        let result = '';
        let phrases = settings?.phrases;

        if (phrases.length > 0 && last_message != undefined) {
            let index = -1;
            last_message = last_message.trim();
            if (last_message == '') {
                result = phrases[0];
            } else if ((index = phrases.indexOf(last_message)) >= 0 && ++index < phrases.length) {
                result = phrases[index];
            }
            result = result.trim();
        }

        if (result === '') {

            let index = errorPhrases.find((element) => element.text === last_message);
            if (index != undefined) {
                index.count++;
            } else {
                errorPhrases.push({
                    'text': last_message,
                    'count': 1
                });
            }
        }

        return result;
    }


    function get_unpaid_only_users(func, perPage = 100, page = 0) {
        fetch(`https://engbkprod2.azurewebsites.net/api/chats/me?page=${page}&perPage=${perPage}&unreadOnly=false&unpaidOnly=true&paidOnly=false&onlineOnly=true&retentionOnly=false&dialogOnly=false&favoriteOnly=false&answerFirstOnly=false&disabledFilters=paid,retain,favorite`, {
            method: 'GET',
            cache: 'no-cache',

            headers: {
                "authorization": "Bearer " + get_user_token(),
                //'visit-token' : get_visit_token(),
            },
            //body:  form_data
        })
            .then(response => {
                if (response.ok !== true) {
                    throw CHAT_INFOS;
                }

                return response.json()
            })
            .then(body => {

                func(body, page).then(
                    () => {
                        if (body.items.length > 0) {
                            get_unpaid_only_users(func, perPage, ++page);
                        } else {
                            console.warn('Отправлено сообщений', allSuccessSended);
                            console.warn('Ошибочных,часто повторяемых, фраз', errorPhrases.sort((a, b) => b.count - a.count));
                            throw "Конец чатов";
                        }
                    }
                ).catch(error => {
                    console.error('END 1', error);
                });

            })
            .catch(error => {
                console.error('END 2', error);
            });


    }


    async function process_chats(body, page) {
        console.warn('process on ' + page, body);
        if (body?.items && body.items.length > 0) {

            let need_send_chats = body.items.filter((chat) => {
                return chat.lastMessage && need_send_messages([chat.lastMessage]) &&
                    select_phrase(chat.lastMessage?.content) !== '';
            })

            let profileInfo = array_column(need_send_chats, 'profileInfo');

            let users = array_column(profileInfo, 'profileId');

            dup_profiles = users.slice();
            console.warn('Будет отправлено для :', dup_profiles);
            // ------------------------------------------------------- Перебор юзеров ------------------------------------------------------------------------
            await process();
        }

    }

    async function send_message(user_id, messages = []) {
        let you_messages = messages.filter(x => {
            return x.profileId == get_current_id()
        });
        let self_count = you_messages.length;

        if (self_count > 0) {

            let last_messaage = you_messages[self_count - 1];
            let frase = select_phrase(last_messaage?.content);

            //console.warn('Попытка отправить ',user_id , last_messaage?.chatId, frase);
            await send_to_chatid(last_messaage?.chatId, frase,
                (body) => {
                    //console.warn('Отправлено добивочное',user_id , body,' Предыдущее сообщение: ', messages);
                    allSuccessSended++;
                });
        } else if (messages.length === 0) {
            //let win = window.open(`https://nataliedate.com/profile/${user_id}?self_count=${self_count}`);

            await send_new_message(user_id, select_phrase(''),
                (body) => {
                    console.warn('Отправлено первое', user_id, body, ' Предыдущее сообщение: ', messages);
                    allSuccessSended++;
                    //let win = window.open(`https://nataliedate.com/profile/${user_id}?self_count=${self_count}`);
                });

        }
    }


    async function send_new_message(profile, message, func) {
        if (profile !== '' && message !== '' && message !== null && message !== 'null') {
            let form_data = new FormData();
            form_data.append('content', message);

            let response = await fetch(`https://engbkprod2.azurewebsites.net/api/chats/messages/${profile}`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    "authorization": "Bearer " + get_user_token(),
                    'visit-token': get_visit_token(),
                },
                body: form_data
            });
            if (response.ok === true) {
                let body = await response.json();
                func(body);
            }
        }
    }


    async function send_to_chatid(chatid, message, func) {
        if (chatid !== '' && message !== '' && message !== null && message !== 'null') {
            // console.warn(chatid, message);

            let form_data = new FormData();
            form_data.append('content', message);

            let response = await fetch(`https://engbkprod2.azurewebsites.net/api/chats/${chatid}/messages`, {
                method: 'POST',
                cache: 'no-cache',

                headers: {
                    "authorization": "Bearer " + get_user_token(),
                    'visit-token': get_visit_token(),
                },
                body: form_data
            });

            if (response.ok === true) {
                let body = await response.json();
                func(body);
            }
        }
    }

    function get_users_by_search(func, perPage = 100, limit = 2000) {

        fetch(`https://nataliedate-search.azurewebsites.net/profiles/suitable?itemsPerPage=${perPage}&page=1&profileId=${get_current_id()}`, {
            method: 'GET',
            cache: 'no-cache',

            headers: {
                "authorization": "Bearer " + get_user_token(),
                //'visit-token' : get_visit_token(),
            },
            //body:  form_data
        })
            .then(response => {
                if (response.ok !== true) {
                    throw 'Search Error';
                }

                return response.json()
            })
            .then(body => {

                func(body).then(() => {
                    console.warn('Отправлено сообщений', allSuccessSended);
                    if (allSuccessSended < limit) {
                        setTimeout(() => {
                            get_users_by_search(func, perPage, limit);
                        }, (1.5 * 60 * 1000));
                    }
                });
            })
            .catch(error => {

                console.error('END', error);


            });
    }

    //like
    //POST https://nataliedate.com/api/profile/likes/me/3990300




    let next_index = 0;


    async function process(next_index = 0) {
        if (dup_profiles) {

            if (next_index < dup_profiles.length) {

                let profile = dup_profiles[next_index];
                //console.warn(`-------- get_chat_info__2( ${profile} ) ---------`);
                try {
                    await get_chat_info__2(profile, send_message);
                } catch (ex) {
                    console.error(ex);
                }
                await process(++next_index);
                // await sleep(1000);
            }

        }
    }


    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const trigger = (el, etype, custom) => {
        const evt = custom ?? new Event(etype, { bubbles: true });
        el.dispatchEvent(evt);
    };


    //console.warn(location.pathname);
    if (location.pathname == '/profile/' + get_current_id()) {

        //------------------------------------------------------------- Ввод переменных ---------------------------------------------------------------------------
        if (confirm('Запустить процесс расссылки по списку профилей?')) {

            let prem_profiles = prompt('Введите идентификаторы премиум юзеров, разделяя пробелами', '')?.match(/\d{1,}/gs);
            prem_profiles = Array.from(new Set(prem_profiles));//уникальные id
            if (prem_profiles && prem_profiles.length > 0) {

                let phrases = set_phrases();

                if (confirm(`Запустить процесс рассылки с параметрами? \n Фразы:\n${phrases.join('\n ---------------- \n')} \n Профили:\n${prem_profiles.join(', \n')} `)) {
                    settings = save_data(phrases, prem_profiles);
                }
            }


            dup_profiles = settings.prem_profiles.slice();
            //------------------------------------------------------- Перебор юзеров ------------------------------------------------------------------------
            process().then(() => {
                console.warn('Конец рассылки');
            });
        }
    }

    //страницы юзеров
    if (location.pathname.indexOf('/profile/') !== -1 && location.pathname !== '/profile/' + get_current_id()) {

        let profile = location.pathname.match(/\d{3,}/i)[0];

        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const self_count = urlParams.get('self_count');
        if (typeof self_count !== 'undefined' && self_count >= 0) {
            window.addEventListener('load', function () {

                //get_chat_info__2(profile, send_message);

                setTimeout(function () {

                    let button = document.querySelector('.user-profile .user-controls button.btn.btn--action.btn--user__write');
                    trigger(button, `click`);
                    setTimeout(function () {
                        let message_wrapper = document.querySelector('.message-wrapper .message-header');

                        message_wrapper.addEventListener('click', function () {
                            navigator.clipboard.writeText(settings.phrases[self_count])
                                .then(() => {
                                    console.log('Text copied to clipboard');
                                })
                                .catch(err => {
                                    console.error('Error in copying text: ', err);
                                });
                        });

                    }, 1000);

                }, 2000);

            });

        }

    }


    if (location.pathname.indexOf('/chats') !== -1 && confirm('Запустить процесс расссылки по чатам?')) {
        console.error('/chats');
        let phrases = set_phrases();
        settings = save_data(phrases);

        if (confirm(`Запустить процесс рассылки с параметрами? \n Фразы:\n${phrases.join('\n ---------------- \n')} \n`)) {
            get_unpaid_only_users(process_chats, 500, 0);
        }

    }




    //search

    let gerl_profiles = [];
    let search_profiles = [];
    if (location.pathname.indexOf('/search') !== -1) {
        console.error('/search');

        if (confirm('Запустить процесс расссылки по поиску?')) {
            let phrases = set_phrases();

            if (confirm(`Запустить процесс рассылки с параметрами? \n Фразы:\n${phrases.join('\n ---------------- \n')} \n`)) {
                get_users_by_search((body) => {
                    let f_profiles = body.items.filter(el => {
                        return el.gender == 1 && el.age >= 23;
                    });
                    let f_gerl_profiles = body.items.filter(el => {
                        return el.gender != 1;
                    });

                    gerl_profiles.push(...f_gerl_profiles);
                    search_profiles.push(...f_profiles);

                    let users = array_column(f_profiles, 'profileId');

                    settings = save_data(phrases, users);
                    dup_profiles = settings.prem_profiles.slice();
                    //------------------------------------------------------- Перебор юзеров ------------------------------------------------------------------------
                    return process();
                }, 500);
            }

        }



    }


    GM_addStyle(
        '#root, .root-wrap, .user-online, body, html { background: powderblue; } \
        .content-chat--chat { background: white } \
        #natalidate_helper {    \
            display: flex;\
            flex-direction: column;\
            gap: 1rem;\
            width: 25%;\
            position: absolute;\
            z-index: 100;\
            right: 0;\
            top: 0;\
            bottom: 0;\
            padding: 20px;\
            position: fixed;\
            background: linear-gradient(0deg, #e4ff00, #3c0af5);}\
       .nh__text{ display: inline-flex;\
                width: 100% !important;\
                background: cyan;\
                padding: 5px;\
                min-height: 100px;\
        } \
        #nh__list {\
           display: flex;\
           flex-direction: column;\
           gap: 1rem;\
           overflow-y: scroll;\
           height: calc(100vh - 120px)\
       }\
     '
    );


    // ----------------------------------------  settings --------------------------------------------------

    const helper = GM_addElement(document.getElementsByTagName('body')[0], 'div', {
        id: 'natalidate_helper'
    });

    const form = GM_addElement(helper, 'form', {
        id: 'nh__form',
    });


    const close_settings = GM_addElement(form, 'button', {
        id: 'close_settings',
        class: 'close_settings',
        title: 'Закрыть',
        textContent: '✖',
        style: 'background: white;border-radius: 50%;width: 25px;height: 25px;margin: 0 0 1rem;'
    });

    const list = GM_addElement(form, 'div', {
        id: 'nh__list',
        class: 'nh__list',
    });
    const nh__buttons = GM_addElement(form, 'div', {
        id: 'nh__buttons',
        class: 'nh__buttons',
        style: 'display: flex;gap: 1rem;margin: 1rem 0;justify-content: space-between;'
    });

    GM_addElement(nh__buttons, 'button', {
        type: 'submit',
        title: 'Сохранить',
        textContent: '✔',
        style: "background: crimson; color: white;",
        class: 'btn'
    });

    const nh__add__text = GM_addElement(nh__buttons, 'button', {
        id: 'nh__add__text',
        type: 'button',
        style: "background: forestgreen;color: white;",
        class: 'btn',
        title: 'Добавить еще',
        textContent: '✚'
    });





    nh__add__text.addEventListener('click', function () {
        add_field('');
        list.scrollTo(0, list.scrollHeight);
    });



    function print_text_fields() {
        list.innerHTML = '';

        if (settings?.phrases?.length) {
            let i = 0;
            while (i < settings.phrases.length) {
                add_field(settings.phrases[i]);
                i++;
            }
        } else {
            add_field('');
        }

    }
    print_text_fields();

    function add_field(text = '') {
        GM_addElement(list, 'textarea', {
            class: 'nh__text',
            name: 'phrases[]',
            textContent: text
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = new FormData(form);
        let form_phrases = data.getAll('phrases[]');
        form_phrases = form_phrases.map(element => element.trim()).filter(word => word.length > 0);
        console.warn(form_phrases);
        settings = save_data(form_phrases);
        // SAVE FIELDS
        print_text_fields();

        return false;
    });

})();
