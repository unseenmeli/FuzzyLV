import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string().optional(),
    }),
    profiles: i.entity({
      username: i.string().unique().indexed(),
      friendCode: i.string().unique().indexed(),
      createdAt: i.number(),
    }),
    connections: i.entity({
      status: i.string(), // "pending", "accepted", "blocked"
      senderUsername: i.string(),
      receiverUsername: i.string(),
      createdAt: i.number(),
      acceptedAt: i.number().optional(),
    }),
    invitations: i.entity({
      type: i.string(), // "relationship", "friendship", "group"
      status: i.string(), // "pending", "accepted", "declined"
      senderUsername: i.string(),
      receiverUsername: i.string(),
      groupId: i.string().optional(), // For group invites
      message: i.string().optional(),
      processedBySender: i.boolean().optional(), // Track if sender has created their side
      createdAt: i.number(),
      respondedAt: i.number().optional(),
    }),
    relationships: i.entity({
      name: i.string(),
      type: i.string(),
      emoji: i.string().optional(),
      photo: i.string().optional(),
      mood: i.string().optional(),
      note: i.string().optional(),
      partnerUsername: i.string().optional(),
      createdAt: i.number(),
    }),
    friendships: i.entity({
      name: i.string(),
      type: i.string(),
      emoji: i.string().optional(),
      photo: i.string().optional(),
      status: i.string().optional(),
      friendUsername: i.string().optional(),
      lastSeen: i.number().optional(),
      createdAt: i.number(),
    }),
    groups: i.entity({
      name: i.string(),
      type: i.string(),
      memberCount: i.number(),
      emoji: i.string().optional(),
      photo: i.string().optional(),
      createdAt: i.number(),
    }),
    choice: i.entity({
      activeType: i.string(),
      activeId: i.string(),
      activeName: i.string(),
      activeEmoji: i.string().optional(),
      updatedAt: i.number(),
    }),
    messages: i.entity({
      text: i.string(),
      chatType: i.string(), // "relationship", "friendship", "group"
      chatId: i.string(), // ID of the relationship/friendship/group
      senderUsername: i.string(),
      receiverUsername: i.string().optional(), // For direct chats
      groupId: i.string().optional(), // For group messages
      createdAt: i.number(),
      isRead: i.boolean().optional(),
    }),
  },
  links: {
    userProfile: {
      forward: { on: "profiles", has: "one", label: "owner" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    connectionSender: {
      forward: { on: "connections", has: "one", label: "sender" },
      reverse: { on: "$users", has: "many", label: "sentConnections" },
    },
    connectionReceiver: {
      forward: { on: "connections", has: "one", label: "receiver" },
      reverse: { on: "$users", has: "many", label: "receivedConnections" },
    },
    invitationSender: {
      forward: { on: "invitations", has: "one", label: "sender" },
      reverse: { on: "$users", has: "many", label: "sentInvitations" },
    },
    invitationReceiver: {
      forward: { on: "invitations", has: "one", label: "receiver" },
      reverse: { on: "$users", has: "many", label: "receivedInvitations" },
    },
    invitationConnection: {
      forward: { on: "invitations", has: "one", label: "connection" },
      reverse: { on: "connections", has: "many", label: "invitations" },
    },
    userRelationships: {
      forward: { on: "relationships", has: "one", label: "owner" },
      reverse: { on: "$users", has: "many", label: "relationships" },
    },
    userFriendships: {
      forward: { on: "friendships", has: "one", label: "owner" },
      reverse: { on: "$users", has: "many", label: "friendships" },
    },
    userGroups: {
      forward: { on: "groups", has: "many", label: "members" },
      reverse: { on: "$users", has: "many", label: "groups" },
    },
    userChoice: {
      forward: { on: "choice", has: "one", label: "owner" },
      reverse: { on: "$users", has: "one", label: "currentChoice" },
    },
    messageSender: {
      forward: { on: "messages", has: "one", label: "sender" },
      reverse: { on: "$users", has: "many", label: "sentMessages" },
    },
  },
});

type AppSchema = typeof _schema;
interface Schema extends AppSchema {}
const schema: Schema = _schema;

export type { AppSchema };
export default schema;