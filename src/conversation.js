export { conversationManager };

let Conversation = () => {
    let self = {
        context: [],
        currentMessage: '',
        addMessage: (role, content) => {
            self.context.push({
                role: role,
                content: content,
            });
        },
        cleanContext: (len) => {
            let getBytes = (str) => {
                return new Blob([str]).size;
            };
            let sum = 0;
            let splitIndex = self.context.length;
            for (let i = self.context.length - 1; i >= 0; i--) {
                const bytes = getBytes(self.context[i].content);
                if (sum + bytes > len) {
                    splitIndex = i;
                    break;
                }
                sum += bytes;
                splitIndex = 0;
            }
            self.context = self.context.slice(splitIndex);
        },
    };
    return self;
}

let conversationManager = (() => {
    let self = {
        currentConversation: {},
    };
    self.currentConversation = Conversation();
    return self;
})();
