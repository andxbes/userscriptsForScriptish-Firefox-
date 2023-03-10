// ==UserScript==
// @name         Nataliedate
// @namespace    http://tampermonkey.net/
// @version      1.5.6
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

    let errorPhrases = [];
    let allSuccessSended = 0;

    function get_data() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY + get_current_id()));
    };

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


    function need_send_messages(messages) {
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
        let settings = get_data();
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
        return result;
    }


    function detect_unused_phrases(last_message, user_id = 0) {
        let index = errorPhrases.find((element) => element.text === last_message);
        if (index != undefined) {
            if (index.users_id.indexOf(user_id) === -1) {
                index.count++;
                index.users_id.push(user_id);
            }
        } else {
            errorPhrases.push({
                'text': last_message,
                'count': 1,
                'users_id': [user_id]
            });
        }
    }


    function get_unpaid_only_users(func, endFunc, only_online = false, perPage = 100, page = 0) {
        fetch(`https://engbkprod2.azurewebsites.net/api/chats/me?page=${page}&perPage=${perPage}&unreadOnly=false&unpaidOnly=true&paidOnly=false&onlineOnly=${only_online}&retentionOnly=false&dialogOnly=false&favoriteOnly=false&answerFirstOnly=false&disabledFilters=paid,retain,favorite`, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                "authorization": "Bearer " + get_user_token(),
            },
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
                            get_unpaid_only_users(func, endFunc, only_online, perPage, ++page);
                        } else {
                            console.warn('Отправлено сообщений', allSuccessSended);
                            //console.warn('Ошибочных,часто повторяемых, фраз', errorPhrases.sort((a, b) => b.count - a.count));
                            if (only_online) {
                                console.warn('Повторим перебор через  минуту');
                                setTimeout(() => {
                                    get_unpaid_only_users(func, endFunc, only_online, perPage);
                                }, (1.5 * 60 * 1000));

                            } else {
                                throw "Конец чатов";
                            }
                        }
                    }
                ).catch(error => {
                    console.error('END 1', error);
                    endFunc();
                });

            })
            .catch(error => {
                console.error('END 2', error);
                endFunc();
            });


    }


    async function process_chats(body, page) {
        console.warn('process on ' + page, body);
        if (body?.items && body.items.length > 0) {

            let need_send_chats = body.items.filter((chat) => {

                let phrase = select_phrase(chat.lastMessage?.content);
                let user_id = chat.profileInfo?.profileId;

                if (phrase === '') {
                    detect_unused_phrases(chat.lastMessage?.content, user_id);
                }

                return chat.lastMessage && need_send_messages([chat.lastMessage]) && phrase !== '';
            })

            let profileInfo = array_column(need_send_chats, 'profileInfo');

            let users = array_column(profileInfo, 'profileId');

            let for_users = users.slice();
            console.warn('Будет отправлено для :', for_users);
            // ------------------------------------------------------- Перебор юзеров ------------------------------------------------------------------------
            await process(for_users);
        }

    }

    async function send_message(user_id, messages = []) {
        let you_messages = messages.filter(x => {
            return x.profileId == get_current_id()
        });
        let self_count = you_messages.length;

        if (self_count > 0) {

            let last_messaage = you_messages[self_count - 1];
            let phrase = select_phrase(last_messaage?.content);

            if (phrase === '') {
                detect_unused_phrases(last_messaage?.content, user_id);
            }

            //console.warn('Попытка отправить ',user_id , last_messaage?.chatId, frase);
            await send_to_chatid(last_messaage?.chatId, phrase,
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

    function get_users_by_search(func, endFunc, perPage = 100, limit = 2000) {

        fetch(`https://nataliedate-search.azurewebsites.net/profiles/suitable?itemsPerPage=${perPage}&page=1&profileId=${get_current_id()}`, {
            method: 'GET',
            cache: 'no-cache',

            headers: {
                "authorization": "Bearer " + get_user_token()
            }
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
                            get_users_by_search(func, endFunc, perPage, limit);
                        }, (1.5 * 60 * 1000));
                    } else {
                        endFunc();
                    }
                });
            })
            .catch(error => {
                console.error('END', error);
                endFunc();
            });
    }

    //like
    //POST https://nataliedate.com/api/profile/likes/me/3990300




    let next_index = 0;


    async function process(dup_profiles, next_index = 0) {
        if (dup_profiles) {

            if (next_index < dup_profiles.length) {

                let profile = dup_profiles[next_index];
                //console.warn(`-------- get_chat_info__2( ${profile} ) ---------`);
                try {
                    await get_chat_info__2(profile, send_message);
                } catch (ex) {
                    console.error(ex);
                }
                await process(dup_profiles, ++next_index);
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




    // --------------------------------------------        UI       ------------------------------------------------------------- 



    const nh_actions_wrapp = GM_addElement(document.getElementsByTagName('body')[0], 'div', {
        class: 'nh_actions_wrapp',
    });

    const nh_actions = GM_addElement(nh_actions_wrapp, 'div', {
        class: 'nh_actions',
    });


    const send_new_messages = GM_addElement(nh_actions, 'button', {
        id: 'send_new_messages',
        title: 'Отправка новых сообщений',
        textContent: '❤',
        style: 'background: limegreen;color: white;'
    });

    send_new_messages.addEventListener('click', function () {
        send_new_messages.disabled = true;
        console.warn('send_new_messages');
        //search

        let gerl_profiles = [];
        let search_profiles = [];

        get_users_by_search(
            (body) => {
                /* user.datingPurpose
                1: Отношения
                2: Создание семьи
                3: Дружба
                4: Деловые контакты
                5: Путешествия
                6: Занятия спортом
                7: Флирт
                */


                let f_profiles = body.items.filter(el => {
                    return el.gender == 1 && el.age >= 23;
                });
                let f_gerl_profiles = body.items.filter(el => {
                    return el.gender != 1;
                });
                //TODO вывести профили девушек
                gerl_profiles.push(...f_gerl_profiles);
                search_profiles.push(...f_profiles);

                let users = array_column(f_profiles, 'profileId');

                // settings = save_data(phrases, users);
                if (users.length > 0) {
                    users = Array.from(new Set(users));
                }
                return process(users.slice());
            },
            () => {
                console.warn('endFunc');
                send_new_messages.disabled = false;
                console.warn('Профили девушек:', gerl_profiles);
            },
            500);

    });

    const send_finish_off = GM_addElement(nh_actions, 'button', {
        id: 'send_new_messages',
        title: 'Отправка добивов',
        textContent: '❀',
        style: 'background: forestgreen ;color: white;'
    });

    send_finish_off.addEventListener('click', function () {
        send_finish_off.disabled = true;
        console.warn('send_finish_off');

        get_unpaid_only_users(process_chats,
            () => {
                send_finish_off.disabled = false;
            }, false, 500, 0);

    });

    const send_finish_off_for_online_users = GM_addElement(nh_actions, 'button', {
        id: 'send_new_messages',
        title: 'Отправка добивов, только юзерам онлайн с перепроверкой через минуту (бесконечно)',
        textContent: '✾',
        style: 'background: darkgreen;color: white;'
    });

    send_finish_off_for_online_users.addEventListener('click', function () {
        send_finish_off_for_online_users.disabled = true;
        console.warn('send_finish_off_for_online_users');

        get_unpaid_only_users(process_chats,
            () => {
                send_finish_off_for_online_users.disabled = false;
            }, true, 500, 0);

    });

    const send_by_ids = GM_addElement(nh_actions, 'button', {
        id: 'send_by_ids',
        title: 'Плюшки (отправка по списку id юзеров)',
        textContent: '⛑',
        style: 'background: darkorange;color: white;'
    });

    send_by_ids.addEventListener('click', function () {
        send_by_ids.disabled = true;
        console.warn('send_by_ids');

        let prem_profiles = prompt('Введите идентификаторы премиум юзеров, разделяя пробелами', '')?.match(/\d{1,}/gs);
        prem_profiles = Array.from(new Set(prem_profiles));//уникальные id
        if (prem_profiles && prem_profiles.length > 0) {

            if (prem_profiles.length > 0) {
                prem_profiles = Array.from(new Set(prem_profiles));
                process(prem_profiles.slice()).then(() => {
                    send_by_ids.disabled = false;
                    console.warn('Конец рассылки');
                });
            }
        } else {
            send_by_ids.disabled = false;
        }
    });




    const open_settings = GM_addElement(nh_actions, 'button', {
        id: 'open_settings',
        title: 'Настройки',
        textContent: '✑',
        style: 'background: dodgerblue;color: white;'
    });
    open_settings.addEventListener('click', function () {
        helper.classList.toggle("show");
        if (helper.classList.contains('show')) {
            print_text_fields();
        }
    });




    // ----------------------------------------  settings --------------------------------------------------

    const helper = GM_addElement(document.getElementsByTagName('body')[0], 'div', {
        class: 'natalidate_helper'
    });
    const close_settings = GM_addElement(helper, 'button', {
        id: 'close_settings',
        class: 'close_settings btn',
        title: 'Закрыть',
        textContent: '✖',
        style: 'border-radius: 50%;display: inline-flex;width: auto;color: white;font-weight: 900;    margin-right: auto;padding: 0;'
    });
    close_settings.addEventListener('click', function () {
        helper.classList.toggle("show");
    });

    const form = GM_addElement(helper, 'form', {
        id: 'nh__form',
    });






    const list = GM_addElement(form, 'div', {
        id: 'nh__list',
        class: 'nh__list',
    });
    const nh__buttons = GM_addElement(form, 'div', {
        id: 'nh__buttons',
        class: 'nh__buttons',
        style: 'display: flex;margin: 1rem 0;justify-content: space-between;'
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
        let settings = get_data();
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
        save_data(form_phrases);
        // SAVE FIELDS
        print_text_fields();

        return false;
    });

    //------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------
    //------------------------------------ Popular phrases -------------------------------------
    //------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------

    const popular_phrases_container = GM_addElement(document.getElementsByTagName('body')[0], 'div', {
        class: 'popular-phrases-container'
    });

    const popular_phrases_actions = GM_addElement(popular_phrases_container, 'div', {
        class: 'popular-phrases__actions'
    });
    const close_popular_phrases_container = GM_addElement(popular_phrases_actions, 'button', {
        class: 'close-popular-phrases-container btn',
        title: 'Закрыть',
        textContent: '✖',
        style: 'border-radius: 50%;display: inline-flex;width: auto;color: white;font-weight: 900;    margin-right: auto;padding: 0;'
    });
    GM_addElement(popular_phrases_container, 'h3', {
        class: 'popular-phrases__actions',
        textContent: "Последние фразы, которых нет в цепочке, с количеством чатов где они остались последними.",
        style: 'color: white;margin: 1rem 0;'

    });
    const popular_phrases_list = GM_addElement(popular_phrases_container, 'div', {
        class: 'popular-phrases__list'
    });

    const more_popular_phrases = GM_addElement(nh_actions, 'button', {
        title: 'Частые, последние фразы, вне цепочки, когда либо написанные юзеру (Доступно во время рассылки добивов)',
        textContent: '📬',
        style: 'background: black;color: white;'
    });

    more_popular_phrases.addEventListener('click', function () {
        popular_phrases_container.classList.toggle("show");
        if (popular_phrases_container.classList.contains('show')) {

            //print_text_fields();
            // errorPhrases
            if (errorPhrases.length > 0) {
                popular_phrases_list.innerHTML = '';

                let errorPhrases_sorted = errorPhrases.sort((a, b) => b.count - a.count);

                for (let eph = 0; eph < errorPhrases_sorted.length & eph < 20; eph++) {
                    let nh__phrases__row = GM_addElement(popular_phrases_list, 'div', {
                        class: 'nh__phrases__row',
                    });
                    GM_addElement(nh__phrases__row, 'span', {
                        class: 'nh__count',
                        textContent: errorPhrases_sorted[eph].count
                    });
                    GM_addElement(nh__phrases__row, 'textarea', {
                        class: 'nh__text',
                        textContent: errorPhrases_sorted[eph].text
                    });
                }
            }
        }
    });


    close_popular_phrases_container.addEventListener('click', function () {
        popular_phrases_container.classList.toggle("show");
    });

    // -------------------------------     Styles      ------------------------------------ 
    GM_addStyle(
        '\
        #root, .root-wrap, .user-online, body, html { background: powderblue; } \
        .content-chat--chat { background: white } \
        .natalidate_helper {    \
            display: none;\
            flex-direction: column;\
            gap: 1rem;\
            width: 40%;\
            max-width: 100%;\
            z-index: 100;\
            right: 0;\
            top: 0;\
            bottom: 0;\
            padding: 20px;\
            position: fixed;\
            background: linear-gradient(0deg, #e4ff00, #3c0af5);}\
       .nh__text{ display: inline-flex;\
                width: 100% !important;\
                background: greenyellow;\
                border-radius: 8px;\
                padding: 7px;\
                min-height: 6.25rem;\
        } \
        #nh__list,\
        .popular-phrases__list{\
           display: flex;\
           flex-direction: column;\
           gap: 2rem;\
           overflow-y: scroll;\
        }\
        #nh__list {\
           height: calc(100vh - 10rem);\
       }\
       .show {display: flex !important;}\
       .nh_actions_wrapp{\
        position: fixed;\
        top: 0;\
        right: 0;\
        left: 0;\
        display: flex;\
        justify-content: center;\
        pointer-events: none;\
        z-index: 50;\
       }\
       .nh_actions {\
        pointer-events: auto;\
        background: white;\
        min-width: 50px;\
        /*border-radius: 20px 0px 0 20px;*/\
        box-shadow: 0 0 10px black;\
        justify-content: center; \
        display: flex;\
        align-items: center;\
        padding: 0.6rem;\
        gap: 0.6rem;\
        border-radius: 0 0px 20px 20px;\
       }\
       .nh_actions button{\
        border-radius: 50%;width: 2.5rem;height: 2.5rem;margin: 0 0 1rem;font-size: 1.6rem;margin:0;\
       }\
       .nh_actions button[disabled]{\
        opacity: 0.4;\
       }\
       .popular-phrases-container{\
        display: none;\
        flex-direction: column;\
        gap: 1rem;\
        z-index: 100;\
        right: 0;\
        left: 0;\
        top: 20vh;\
        bottom: 0;\
        padding: 20px;\
        position: fixed;\
        background: linear-gradient(0deg, #e4ff00, #3c0af5);\
       }\
       .nh__phrases__row{\
        display:flex;\
        gap: 1rem;\
        align-items: center;\
        flex-shrink: 0;\
       }\
       .nh__count{\
        display: flex;\
        aspect-ratio: 1 / 1;\
        background: white;\
        border-radius: 50%;\
        flex-shrink: 1;\
        padding: 0.5rem;\
        justify-content: center;\
        align-items: center;\
       }\
       @media (max-width: 770px){\
         .header-wrapper{\
            padding-top: 0px;  \
         }    \
         .natalidate_helper{\
            width: 70%;     \
         }\
         .acc-menu {\
            position: absolute;\
            top: 20px;\
            right: 10px;\
        }\
        .sidebar__mobile, .overlay {\
            top: 65px;\
        }\
       } \
     '
    );

})();
