import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { ChatRoom, Message } from '../../types';

export const chatService = {
  // Create a chat room
  createChatRoom: async (
    participants: string[],
    type: 'direct' | 'group',
    restaurantId?: string,
    name?: string
  ): Promise<string> => {
    try {
      const chatRoomData: Omit<ChatRoom, 'id'> = {
        type,
        participants,
        restaurantId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const chatRoomRef = doc(collection(db, 'chatRooms'));
      await setDoc(chatRoomRef, {
        ...chatRoomData,
        createdAt: Timestamp.fromDate(chatRoomData.createdAt),
        updatedAt: Timestamp.fromDate(chatRoomData.updatedAt),
      });

      return chatRoomRef.id;
    } catch (error: any) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  },

  // Get user's chat rooms
  getUserChatRooms: async (userId: string): Promise<ChatRoom[]> => {
    try {
      const q = query(
        collection(db, 'chatRooms'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const chatRooms: ChatRoom[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as ChatRoom[];

      return chatRooms;
    } catch (error: any) {
      console.error('Error getting user chat rooms:', error);
      return [];
    }
  },

  // Send a message
  sendMessage: async (
    chatRoomId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: 'text' | 'image' | 'restaurant' = 'text',
    additionalData?: any
  ): Promise<void> => {
    try {
      const messageData: Omit<Message, 'id'> = {
        chatRoomId,
        senderId,
        senderName,
        text,
        type,
        createdAt: new Date(),
        readBy: [senderId],
        ...additionalData,
      };

      const messageRef = doc(collection(db, 'messages'));
      await setDoc(messageRef, {
        ...messageData,
        createdAt: Timestamp.fromDate(messageData.createdAt),
      });

      // Update chat room's last message and updatedAt
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        lastMessage: {
          ...messageData,
          id: messageRef.id,
        },
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a chat room
  getChatMessages: async (
    chatRoomId: string,
    limitCount: number = 50
  ): Promise<Message[]> => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages: Message[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Message[];

      return messages.reverse(); // Most recent at the end
    } catch (error: any) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  },

  // Subscribe to chat messages (real-time)
  subscribeToMessages: (
    chatRoomId: string,
    callback: (messages: Message[]) => void
  ): (() => void) => {
    const q = query(
      collection(db, 'messages'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: Message[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Message[];

      callback(messages);
    });

    return unsubscribe;
  },

  // Mark message as read
  markMessageAsRead: async (messageId: string, userId: string): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
      });
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  },

  // Find or create direct chat
  findOrCreateDirectChat: async (userId1: string, userId2: string): Promise<string> => {
    try {
      // Try to find existing direct chat
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', userId1)
      );

      const querySnapshot = await getDocs(q);
      const existingChat = querySnapshot.docs.find((doc) => {
        const participants = doc.data().participants;
        return participants.includes(userId2);
      });

      if (existingChat) {
        return existingChat.id;
      }

      // Create new direct chat
      return await chatService.createChatRoom([userId1, userId2], 'direct');
    } catch (error: any) {
      console.error('Error finding or creating direct chat:', error);
      throw error;
    }
  },
};
