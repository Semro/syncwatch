import"./ui.js";const a=document.getElementById("room"),c=document.getElementById("name"),s=document.getElementById("connect"),l=document.getElementById("share"),o=document.getElementById("shared"),u=document.getElementById("usersListTitle"),i=document.getElementById("usersList"),r=document.getElementById("error");function d(e){chrome.runtime.sendMessage({from:`get${e}`})}function p(e){let t=0;for(let n=0;n<3;n++)t=e.indexOf("/",t),t++;return`${e.substring(0,t)}favicon.ico`}function m(e){l.style.display=e,u.style.display=e,i.style.display=e}l.onclick=()=>{chrome.runtime.sendMessage({from:"popupShare"})};o.onclick=()=>(chrome.tabs.create({url:o.href}),!1);chrome.runtime.onMessage.addListener(e=>{if(e.from==="status"&&(e.status==="connect"?(s.value=chrome.i18n.getMessage("popup_button_disconnect"),s.onclick=()=>{chrome.runtime.sendMessage({from:"disconnect"})},m("block")):(s.value=chrome.i18n.getMessage("popup_button_connect"),s.onclick=()=>{r.style.display="none";const t={name:c.value,room:a.value};chrome.runtime.sendMessage({from:"join",data:t}),s.value=`${chrome.i18n.getMessage("popup_button_connecting")}...`},m("none"),o.style.display="none"),document.getElementById("status").innerText=`${chrome.i18n.getMessage("popup_status")}:													   ${chrome.i18n.getMessage(`socket_event_${e.status}`)}`),e.from==="share"&&e.data!==null){o.href=e.data.url,o.innerText="";const t=document.createElement("img"),n=document.createElement("span");t.style.height="16px",t.src=p(e.data.url),n.innerText=e.data.title,o.appendChild(t),o.appendChild(n),o.style.display="block"}if(e.from==="sendUsersList"){i.innerText="";for(const t in e.list){const n=document.createElement("li");n.innerText=e.list[t],i.appendChild(n)}}e.from==="sendError"&&(r.style.display="block",r.innerText=chrome.i18n.getMessage(e.error)),e.from==="sendUser"&&(c.value=e.data.name,a.value=e.data.room)});c.placeholder=chrome.i18n.getMessage("popup_input_name");a.placeholder=chrome.i18n.getMessage("popup_input_room");l.value=chrome.i18n.getMessage("popup_button_share");u.innerText=`${chrome.i18n.getMessage("popup_usersInRoom")}:`;const h=["User","Status","UsersList","Share"];for(const e of h)d(e);
