export const getChatId = (
  chatType: string,
  username1: string,
  username2: string
): string => {
  const usernames = [username1, username2].sort();
  return `${chatType}_${usernames[0]}_${usernames[1]}`;
};

export const validateChatData = (
  choice: any,
  activeChat: any,
  userProfile: any
): {
  isValid: boolean;
  error?: string;
  otherUsername?: string;
} => {
  if (!choice) {
    return { isValid: false, error: "No chat selected" };
  }

  if (!activeChat) {
    return { isValid: false, error: "Chat data not found" };
  }

  if (!userProfile) {
    return { isValid: false, error: "User profile not loaded" };
  }

  let otherUsername = null;

  if (choice.activeType === "relationship") {
    otherUsername = activeChat.partnerUsername;
  } else if (choice.activeType === "friendship") {
    otherUsername = activeChat.friendUsername;
  } else if (choice.activeType === "connection") {
    otherUsername = activeChat.senderUsername === userProfile.username
      ? activeChat.receiverUsername
      : activeChat.senderUsername;
  }

  if (!otherUsername) {
    return { isValid: false, error: "Could not determine chat partner" };
  }

  return { isValid: true, otherUsername };
};

export const ensureChatConsistency = async (
  db: any,
  user: any,
  chatType: string,
  chatId: string,
  chatName: string,
  chatEmoji?: string
) => {
  try {
    const choiceData = await db.queryOnce({
      choice: { $: { where: { "owner.id": user.id } } }
    });

    const existingChoice = choiceData?.choice?.[0];

    if (!existingChoice || 
        existingChoice.activeType !== chatType || 
        existingChoice.activeId !== chatId) {
      
      const choiceId = existingChoice?.id || db.id();
      
      await db.transact([
        existingChoice 
          ? db.tx.choice[choiceId].update({
              activeType: chatType,
              activeId: chatId,
              activeName: chatName,
              activeEmoji: chatEmoji || null,
              updatedAt: Date.now()
            })
          : db.tx.choice[choiceId].update({
              owner: user.id,
              activeType: chatType,
              activeId: chatId,
              activeName: chatName,
              activeEmoji: chatEmoji || null,
              updatedAt: Date.now()
            })
      ]);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error ensuring chat consistency:", error);
    return false;
  }
};