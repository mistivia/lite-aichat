const userMsgCls = "msg bg-gray-200 rounded-xl px-4 py-2 my-4 max-w-1/2 ml-auto text-base/6";
const aiMsgCls = "msg bg-gray-100 rounded-xl px-4 py-2 my-4 max-w-2/3 text-base/6";

let createMessage = (message, isUser) => {
    let div = document.createElement('div');
    div.className = isUser ? userMsgCls : aiMsgCls;
    let p = document.createElement('p');
    p.textContent = message;
    div.appendChild(p);
    return div;
}

export {
    createMessage,
}
