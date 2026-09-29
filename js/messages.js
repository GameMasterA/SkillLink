/**
 * SkillLink — Central Messaging Engine (js/messages.js)
 * Manages real-time multi-user chat streams across Client and Freelancer dashboards.
 */

let activeConversationId = null;
let messageRefreshTimer = null;
const MESSAGE_REFRESH_INTERVAL = 5000;

document.addEventListener("DOMContentLoaded", () => {
    initMessagingEngine();
});

function buildConversationId(userAId, userBId) {
    const ids = [String(userAId), String(userBId)].sort();
    return `conv-${ids[0]}-${ids[1]}`;
}

function getUserDisplayName(user) {
    if (!user) return "User";
    return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";
}

function escapeMessageHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getConversationParticipant(conv, userId) {
    return conv?.participants?.find(participant => String(participant.id) !== String(userId)) || null;
}

function getMessageReceiverId(message, conversation) {
    if (message.receiverId) return String(message.receiverId);
    const recipient = getConversationParticipant(conversation, message.senderId);
    return recipient?.id ? String(recipient.id) : "";
}

function formatMessageTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value || "")
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getCloudMessagesClient() {
    return window.isSupabaseConfigured?.() && window.supabaseClient?.from ? window.supabaseClient : null;
}

async function getAuthenticatedUserId() {
    const client = getCloudMessagesClient();
    if (!client?.auth?.getSession) return null;

    try {
        const { data } = await client.auth.getSession();
        return data?.session?.user?.id || null;
    } catch (error) {
        return null;
    }
}

async function ensureCloudMessagingSession() {
    const authUserId = await getAuthenticatedUserId();
    if (!authUserId) {
        return { supported: false, userId: null, error: new Error("Cloud messaging requires an authenticated Supabase session.") };
    }
    return { supported: true, userId: authUserId, error: null };
}

function mapCloudMessage(row, conversation) {
    const senderId = String(row.sender_id);
    const receiverId = String(row.receiver_id);
    const sender = conversation.participants.find(participant => String(participant.id) === senderId);
    return {
        id: row.id,
        senderId,
        receiverId,
        text: row.content,
        timestamp: row.created_at || new Date().toISOString(),
        isRead: Boolean(row.is_read),
        senderName: sender?.name || "User",
        cloudSynced: true
    };
}

async function fetchCloudConversationMessages(conversation) {
    const client = getCloudMessagesClient();
    if (!client) return { supported: false, messages: [], error: null };

    const sessionState = await ensureCloudMessagingSession();
    if (!sessionState.supported) return { supported: false, messages: [], error: sessionState.error };

    const participantIds = conversation.participants.map(participant => String(participant.id));
    const [firstDirection, secondDirection] = await Promise.all([
        client.from("messages").select("id,sender_id,receiver_id,content,is_read,created_at", {
            sender_id: participantIds[0], receiver_id: participantIds[1]
        }),
        client.from("messages").select("id,sender_id,receiver_id,content,is_read,created_at", {
            sender_id: participantIds[1], receiver_id: participantIds[0]
        })
    ]);

    const error = firstDirection.error || secondDirection.error;
    if (error) return { supported: true, messages: [], error };

    const messages = [...(firstDirection.data || []), ...(secondDirection.data || [])]
        .map(row => mapCloudMessage(row, conversation))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    return { supported: true, messages, error: null };
}

async function getParticipantProfile(userId) {
    const localUser = typeof getUsers === "function"
        ? getUsers().find(user => String(user.id) === String(userId))
        : null;
    if (localUser) return localUser;

    const client = getCloudMessagesClient();
    if (!client) return null;
    const { data, error } = await client.from("profiles").select("id,email,role,name,first_name,last_name", { id: userId });
    if (error || !Array.isArray(data) || !data[0]) return null;
    const profile = data[0];
    return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "User"
    };
}

async function syncCloudInbox() {
    const activeUser = getActiveUser();
    const client = getCloudMessagesClient();
    if (!activeUser?.id || !client) return;

    const sessionState = await ensureCloudMessagingSession();
    if (!sessionState.supported) return;

    const [incoming, outgoing] = await Promise.all([
        client.from("messages").select("id,sender_id,receiver_id,content,is_read,created_at", { receiver_id: String(activeUser.id) }),
        client.from("messages").select("id,sender_id,receiver_id,content,is_read,created_at", { sender_id: String(activeUser.id) })
    ]);
    const error = incoming.error || outgoing.error;
    if (error) {
        console.warn("[SkillLink Messages] Inbox sync failed; keeping local conversations.", error);
        return;
    }

    const rows = [...(incoming.data || []), ...(outgoing.data || [])];
    const groupedRows = new Map();
    rows.forEach(row => {
        const otherId = String(row.sender_id) === String(activeUser.id) ? String(row.receiver_id) : String(row.sender_id);
        if (!groupedRows.has(otherId)) groupedRows.set(otherId, []);
        groupedRows.get(otherId).push(row);
    });

    const localConversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    for (const [otherId, otherRows] of groupedRows) {
        const profile = await getParticipantProfile(otherId);
        const otherName = getUserDisplayName(profile || { id: otherId });
        const conversationId = buildConversationId(activeUser.id, otherId);
        let conversation = localConversations.find(entry => entry.conversationId === conversationId);
        if (!conversation) {
            conversation = {
                conversationId,
                participants: [
                    { id: activeUser.id, name: getUserDisplayName(activeUser), role: activeUser.role || "user" },
                    { id: otherId, name: otherName, role: profile?.role || "user" }
                ],
                messages: []
            };
            localConversations.push(conversation);
        } else {
            const otherParticipant = getConversationParticipant(conversation, activeUser.id);
            if (otherParticipant && otherParticipant.name === "User") otherParticipant.name = otherName;
        }

        const cloudMessages = otherRows.map(row => mapCloudMessage(row, conversation));
        const localOnly = (conversation.messages || []).filter(message => !message.cloudSynced &&
            !cloudMessages.some(cloudMessage => String(cloudMessage.id) === String(message.id)));
        conversation.messages = [...cloudMessages, ...localOnly]
            .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
        const latest = conversation.messages[conversation.messages.length - 1];
        if (latest) {
            conversation.lastMessage = latest.text;
            conversation.lastTimestamp = latest.timestamp;
        }
    }

    if (typeof saveStoredMessages === "function") saveStoredMessages(localConversations);
    renderConversationList();
}

async function persistCloudMessage(message, receiverId) {
    const client = getCloudMessagesClient();
    if (!client) return { supported: false, message: null, error: null };

    const sessionState = await ensureCloudMessagingSession();
    if (!sessionState.supported) {
        return { supported: false, message: null, error: sessionState.error };
    }

    const authUserId = String(sessionState.userId);
    const senderId = String(message.senderId || authUserId);
    const normalizedMessage = {
        ...message,
        senderId: senderId === "null" ? authUserId : senderId,
        receiverId: String(receiverId)
    };

    const { data, error } = await client.from("messages").insert([{
        id: normalizedMessage.id,
        sender_id: authUserId,
        receiver_id: String(receiverId),
        content: normalizedMessage.text,
        is_read: false,
        created_at: normalizedMessage.timestamp
    }]);
    return {
        supported: true,
        message: !error && Array.isArray(data) && data[0] ? data[0] : null,
        error: error || null
    };
}

async function markCloudMessagesRead(conversation, userId) {
    const client = getCloudMessagesClient();
    if (!client?.rpc) return { supported: false, error: null };

    const sessionState = await ensureCloudMessagingSession();
    if (!sessionState.supported) return { supported: false, error: sessionState.error };

    const sender = getConversationParticipant(conversation, userId);
    if (!sender) return { supported: true, error: null };
    const { error } = await client.rpc("mark_messages_read", { p_sender_id: String(sender.id) });
    return { supported: true, error: error || null };
}

function saveConversationMessages(conversationId, messages) {
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const index = conversations.findIndex(entry => entry.conversationId === conversationId);
    if (index < 0) return;
    conversations[index].messages = messages;
    const latest = messages[messages.length - 1];
    if (latest) {
        conversations[index].lastMessage = latest.text;
        conversations[index].lastTimestamp = latest.timestamp;
    }
    if (typeof saveStoredMessages === "function") saveStoredMessages(conversations);
}

function markLocalConversationRead(conversation, userId) {
    if (!conversation || !Array.isArray(conversation.messages)) return;
    let changed = false;
    conversation.messages = conversation.messages.map(message => {
        if (getMessageReceiverId(message, conversation) === String(userId) && !message.isRead) {
            changed = true;
            return { ...message, isRead: true };
        }
        return message;
    });
    if (changed && typeof saveStoredMessages === "function") {
        const conversations = getStoredMessages();
        const index = conversations.findIndex(entry => entry.conversationId === conversation.conversationId);
        if (index >= 0) {
            conversations[index].messages = conversation.messages;
            saveStoredMessages(conversations);
        }
    }
}

function getUnreadCount(conversation, userId) {
    return (conversation.messages || []).filter(message =>
        getMessageReceiverId(message, conversation) === String(userId) && !message.isRead
    ).length;
}

async function refreshConversationMessages(conversationId = activeConversationId) {
    if (!conversationId) return;
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const conversation = conversations.find(entry => entry.conversationId === conversationId);
    if (!conversation) return;

    const cloudResult = await fetchCloudConversationMessages(conversation);
    if (!cloudResult.supported || cloudResult.error) {
        if (cloudResult.error) console.warn("[SkillLink Messages] Cloud refresh failed; keeping local messages.", cloudResult.error);
        renderConversationList();
        return;
    }

    const cloudIds = new Set(cloudResult.messages.map(message => String(message.id)));
    const localOnly = (conversation.messages || []).filter(message => !message.cloudSynced && !cloudIds.has(String(message.id)));
    const mergedMessages = [...cloudResult.messages, ...localOnly]
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    saveConversationMessages(conversationId, mergedMessages);

    const activeUser = getActiveUser();
    if (activeUser && String(conversationId) === String(activeConversationId)) {
        const readResult = await markCloudMessagesRead(conversation, activeUser.id);
        const markedMessages = mergedMessages.map(message =>
            getMessageReceiverId(message, conversation) === String(activeUser.id) ? { ...message, isRead: true } : message
        );
        saveConversationMessages(conversationId, markedMessages);
        if (readResult.error) console.warn("[SkillLink Messages] Read receipt update failed.", readResult.error);
    }

    renderConversationList();
}

function startMessageRefresh() {
    if (messageRefreshTimer) window.clearInterval(messageRefreshTimer);
    messageRefreshTimer = window.setInterval(() => {
        if (!document.hidden) {
            syncCloudInbox();
            refreshConversationMessages();
        }
    }, MESSAGE_REFRESH_INTERVAL);
}

function getConversationByParticipantIds(userAId, userBId) {
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    return conversations.find(conv => {
        if (!conv || !Array.isArray(conv.participants)) return false;
        const ids = conv.participants.map(participant => String(participant.id));
        return ids.includes(String(userAId)) && ids.includes(String(userBId));
    }) || null;
}

function openConversationWithUser(participantId, participantName) {
    const activeUser = getActiveUser();
    if (!activeUser || !activeUser.id) {
        if (typeof showToast === "function") {
            showToast("Please sign in to message this freelancer.", "error");
        }
        const currentPath = typeof window !== "undefined" && window.location ? (window.location.pathname || "") : "";
        const isSubfolder = currentPath.includes("/client/") || currentPath.includes("/freelancer/");
        const target = isSubfolder ? "../login.html" : "login.html";
        if (typeof window !== "undefined" && window.location) {
            window.location.href = target;
        }
        return null;
    }

    if (String(participantId) === String(activeUser.id)) {
        if (typeof showToast === "function") {
            showToast("This is your own profile.", "info");
        }
        return null;
    }

    const knownUser = typeof getUsers === "function"
        ? getUsers().find(user => String(user.id) === String(participantId))
        : null;
    const existingConversation = getConversationByParticipantIds(activeUser.id, participantId);
    if (existingConversation) {
        activeConversationId = existingConversation.conversationId;
        if (typeof renderConversationList === "function") {
            renderConversationList();
        }
        const currentPath = typeof window !== "undefined" && window.location ? (window.location.pathname || "") : "";
        if (!currentPath.includes("/messages.html") && (activeUser.role === "client" || activeUser.role === "freelancer")) {
            const targetMessagesPage = activeUser.role === "client" ? "client/messages.html" : "freelancer/messages.html";
            window.location.href = `${targetMessagesPage}?conversation=${encodeURIComponent(existingConversation.conversationId)}`;
        }
        refreshConversationMessages(existingConversation.conversationId);
        return existingConversation.conversationId;
    }

    const conversationId = buildConversationId(activeUser.id, participantId);
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const newConversation = {
        conversationId,
        participants: [
            { id: activeUser.id, name: getUserDisplayName(activeUser), role: activeUser.role || "client" },
            {
                id: participantId,
                name: participantName || getUserDisplayName(knownUser),
                role: knownUser?.role || "freelancer"
            }
        ],
        lastMessage: "",
        lastTimestamp: "",
        messages: []
    };

    conversations.push(newConversation);
    if (typeof saveStoredMessages === "function") {
        saveStoredMessages(conversations);
    }

    activeConversationId = conversationId;
    if (typeof renderConversationList === "function") {
        renderConversationList();
    }

    const currentPath = typeof window !== "undefined" && window.location ? (window.location.pathname || "") : "";
    const isMessagesPage = currentPath.includes("/messages.html");
    if (!isMessagesPage) {
        const targetMessagesPage = activeUser.role === "client" ? "client/messages.html" : (activeUser.role === "freelancer" ? "freelancer/messages.html" : "login.html");
        if (targetMessagesPage !== "login.html" && typeof window !== "undefined" && window.location) {
            window.location.href = `${targetMessagesPage}?conversation=${encodeURIComponent(conversationId)}`;
        }
    }

    refreshConversationMessages(conversationId);

    return conversationId;
}

function initMessagingEngine() {
    const chatContainer = document.getElementById("chatInterfaceContainer");
    if (!chatContainer) return;

    const params = new URLSearchParams(window.location.search || "");
    const queryConversation = params.get("conversation");
    if (queryConversation) {
        activeConversationId = queryConversation;
        const currentUser = getActiveUser();
        const targetConversation = getStoredMessages().find(entry => entry.conversationId === queryConversation);
        if (targetConversation && currentUser) {
            markLocalConversationRead(targetConversation, currentUser.id);
            markCloudMessagesRead(targetConversation, currentUser.id);
        }
    }

    renderConversationList();
    syncCloudInbox();
    refreshConversationMessages();
    startMessageRefresh();

    const sendForm = document.getElementById("sendMessageForm");
    if (sendForm) {
        sendForm.addEventListener("submit", handleSendMessageSubmit);
    }
}

function getActiveUser() {
    if (typeof getCurrentUser === "function") {
        return getCurrentUser();
    }
    try {
        const stored = JSON.parse(localStorage.getItem("skillLinkUser") || "null");
        return stored && stored.id ? stored : null;
    } catch (error) {
        return null;
    }
}

function renderConversationList() {
    const listContainer = document.getElementById("conversationsList");
    if (!listContainer) return;

    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const activeUser = getActiveUser();

    if (!activeUser) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">Sign in to view conversations.</div>`;
        return;
    }

    const relevantConversations = conversations.filter(conv => {
        if (!conv || !Array.isArray(conv.participants)) return false;
        return conv.participants.some(participant => String(participant.id) === String(activeUser.id));
    });

    const visibleConversations = relevantConversations;
    if (activeConversationId && !visibleConversations.some(conv => conv.conversationId === activeConversationId)) {
        activeConversationId = null;
    }
    const totalUnread = visibleConversations.reduce((total, conv) => total + getUnreadCount(conv, activeUser.id), 0);
    const badge = document.getElementById("messagesUnreadBadge");
    if (badge) {
        badge.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
        badge.hidden = totalUnread === 0;
    }

    if (visibleConversations.length === 0) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No active conversations yet.</div>`;
        renderChatThread();
        return;
    }

    listContainer.innerHTML = visibleConversations.map(conv => {
        const otherParticipant = getConversationParticipant(conv, activeUser.id) || conv.participants[0];
        const isActive = conv.conversationId === activeConversationId;
        const unreadCount = getUnreadCount(conv, activeUser.id);

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" onclick="selectConversation('${conv.conversationId}')" style="padding:14px; border-bottom:1px solid rgba(255,255,255,0.4); cursor:pointer; background:${isActive ? 'rgba(2,132,199,0.12)' : 'transparent'}; border-radius:12px; transition:0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-dark); font-size:14px;">${escapeMessageHtml(otherParticipant.name)}</strong>
                    <span style="font-size:11px; color:var(--text-light);">${escapeMessageHtml(formatMessageTime(conv.lastTimestamp))}</span>
                </div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeMessageHtml(conv.lastMessage || 'No messages yet')}
                </p>
                ${unreadCount ? `<span class="badge" aria-label="${unreadCount} unread messages">${unreadCount} new</span>` : ""}
            </div>
        `;
    }).join("");

    renderChatThread();
}

function selectConversation(convId) {
    activeConversationId = convId;
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const activeUser = getActiveUser();
    const conversation = conversations.find(entry => entry.conversationId === convId);
    if (conversation && activeUser) {
        markLocalConversationRead(conversation, activeUser.id);
        markCloudMessagesRead(conversation, activeUser.id);
    }
    renderConversationList();
    refreshConversationMessages(convId);
}

function renderChatThread() {
    const messagesBody = document.getElementById("chatMessagesBody");
    const headerTitle = document.getElementById("chatHeaderTitle");
    if (!messagesBody) return;

    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const activeUser = getActiveUser();
    const conv = conversations.find(c => c.conversationId === activeConversationId &&
        Array.isArray(c.participants) && c.participants.some(participant => String(participant.id) === String(activeUser?.id)));

    if (!activeUser) {
        messagesBody.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Sign in to access your conversations.</div>`;
        if (headerTitle) headerTitle.textContent = "Chat";
        return;
    }

    if (!conv) {
        messagesBody.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Select a conversation to start chatting.</div>`;
        if (headerTitle) headerTitle.textContent = "Chat";
        return;
    }

    const otherParticipant = getConversationParticipant(conv, activeUser.id) || conv.participants[0];
    if (headerTitle) headerTitle.textContent = otherParticipant.name;

    const conversationMessages = Array.isArray(conv.messages) ? conv.messages : [];
    if (conversationMessages.length === 0) {
        messagesBody.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No messages yet. Send the first message to ${escapeMessageHtml(otherParticipant.name)}.</div>`;
        return;
    }

    messagesBody.innerHTML = conversationMessages.map(msg => {
        const isMe = String(msg.senderId) === String(activeUser.id);
        return `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:14px;">
                <div style="max-width:75%; padding:12px 18px; border-radius:${isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px'}; background:${isMe ? 'linear-gradient(135deg, var(--primary), var(--accent-blue))' : 'rgba(255,255,255,0.9)'}; color:${isMe ? '#ffffff' : 'var(--text-dark)'}; font-size:14px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                    ${escapeMessageHtml(msg.text)}
                </div>
                <span style="font-size:11px; color:var(--text-light); margin-top:4px; padding:0 4px;">${escapeMessageHtml(formatMessageTime(msg.timestamp))}${isMe ? (msg.isRead ? ' · Read' : ' · Sent') : ''}</span>
            </div>
        `;
    }).join("");

    messagesBody.scrollTop = messagesBody.scrollHeight;
}

async function handleSendMessageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim() || !activeConversationId) return;

    const text = input.value.trim();
    const activeUser = getActiveUser();
    if (!activeUser) {
        if (typeof showToast === "function") {
            showToast("Please sign in to send a message.", "error");
        }
        return;
    }
    const conversations = typeof getStoredMessages === "function" ? getStoredMessages() : [];
    const sessionState = await ensureCloudMessagingSession();
    const safeSenderId = sessionState.supported ? String(sessionState.userId) : String(activeUser.id);

    const convIndex = conversations.findIndex(c => c.conversationId === activeConversationId);
    if (convIndex !== -1) {
        const sendButton = document.querySelector('#sendMessageForm button[type="submit"]');
        if (sendButton) sendButton.disabled = true;
        const timestamp = new Date().toISOString();
        const conversation = conversations[convIndex];
        if (!conversation.participants.some(participant => String(participant.id) === String(activeUser.id))) {
            if (typeof showToast === "function") showToast("You are not a participant in this conversation.", "error");
            return;
        }
        const recipient = getConversationParticipant(conversation, activeUser.id);
        if (!recipient?.id) {
            if (typeof showToast === "function") showToast("This conversation is missing a valid recipient.", "error");
            if (sendButton) sendButton.disabled = false;
            return;
        }

        const newMessage = {
            id: `msg-${activeUser.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            senderId: safeSenderId,
            receiverId: recipient.id,
            text: text,
            timestamp,
            isRead: false
        };

        const cloudResult = sessionState.supported ? await persistCloudMessage(newMessage, recipient.id) : { supported: false, message: null, error: null };
        if (cloudResult.supported && cloudResult.error) {
            if (sendButton) sendButton.disabled = false;
            if (typeof showToast === "function") {
                showToast("Message could not be delivered. Please check your connection and try again.", "error");
            }
            console.error("[SkillLink Messages] Cloud send failed:", cloudResult.error);
            return;
        }

        if (cloudResult.message) {
            newMessage.id = cloudResult.message.id;
            newMessage.timestamp = cloudResult.message.created_at || timestamp;
            newMessage.cloudSynced = true;
        }
        conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        conversation.messages.push(newMessage);
        conversation.lastMessage = text;
        conversation.lastTimestamp = timestamp;
        if (typeof saveStoredMessages === "function") saveStoredMessages(conversations);

        input.value = "";
        if (sendButton) sendButton.disabled = false;
        renderChatThread();
        renderConversationList();
        refreshConversationMessages(activeConversationId);
    }
}

// Global scope exports
window.selectConversation = selectConversation;
window.renderConversationList = renderConversationList;
window.openConversationWithUser = openConversationWithUser;
window.refreshConversationMessages = refreshConversationMessages;
