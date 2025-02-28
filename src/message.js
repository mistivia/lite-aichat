let createMessage = (message, isUser) => {
    let div = document.createElement('div');
    div.className = isUser ? 'message user-message' : 'message ai-message';
    let p = document.createElement('p');
    p.textContent = message;
    div.appendChild(p);
    return div;
}

export {
    createMessage,
}
