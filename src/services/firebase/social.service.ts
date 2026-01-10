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
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { FoodPost, Comment, FriendRequest, User } from '../../types';

export const socialService = {
  // Create a food post
  createPost: async (
    userId: string,
    userName: string,
    restaurantId: string,
    restaurantName: string,
    images: string[],
    caption?: string,
    rating?: number,
    tags: string[] = []
  ): Promise<string> => {
    try {
      const postData: Omit<FoodPost, 'id'> = {
        userId,
        userName,
        restaurantId,
        restaurantName,
        images,
        caption,
        rating,
        tags,
        likes: [],
        comments: [],
        createdAt: new Date(),
      };

      const postRef = doc(collection(db, 'posts'));
      await setDoc(postRef, {
        ...postData,
        createdAt: Timestamp.fromDate(postData.createdAt),
      });

      return postRef.id;
    } catch (error: any) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  // Get feed posts
  getFeedPosts: async (userId: string, limitCount: number = 20): Promise<FoodPost[]> => {
    try {
      // Get user's friends
      const userDoc = await getDoc(doc(db, 'users', userId));
      const friends = userDoc.exists() ? userDoc.data().friends || [] : [];

      // Get posts from friends and self
      const userIds = [userId, ...friends];

      const q = query(
        collection(db, 'posts'),
        where('userId', 'in', userIds.slice(0, 10)), // Firestore 'in' limit is 10
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const posts: FoodPost[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as FoodPost[];

      return posts;
    } catch (error: any) {
      console.error('Error getting feed posts:', error);
      return [];
    }
  },

  // Get user's posts
  getUserPosts: async (userId: string): Promise<FoodPost[]> => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const posts: FoodPost[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as FoodPost[];

      return posts;
    } catch (error: any) {
      console.error('Error getting user posts:', error);
      return [];
    }
  },

  // Like a post
  likePost: async (postId: string, userId: string): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
      });
    } catch (error: any) {
      console.error('Error liking post:', error);
      throw error;
    }
  },

  // Unlike a post
  unlikePost: async (postId: string, userId: string): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: arrayRemove(userId),
      });
    } catch (error: any) {
      console.error('Error unliking post:', error);
      throw error;
    }
  },

  // Add comment to post
  addComment: async (
    postId: string,
    userId: string,
    userName: string,
    text: string,
    userPhotoURL?: string
  ): Promise<void> => {
    try {
      const comment: Comment = {
        id: doc(collection(db, 'temp')).id, // Generate unique ID
        userId,
        userName,
        userPhotoURL,
        text,
        createdAt: new Date(),
      };

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...comment,
          createdAt: Timestamp.fromDate(comment.createdAt),
        }),
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  // Upload image to storage
  uploadImage: async (uri: string, path: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // Send friend request
  sendFriendRequest: async (fromUserId: string, toUserId: string): Promise<void> => {
    try {
      const requestData: Omit<FriendRequest, 'id'> = {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      const requestRef = doc(collection(db, 'friendRequests'));
      await setDoc(requestRef, {
        ...requestData,
        createdAt: Timestamp.fromDate(requestData.createdAt),
      });
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId: string): Promise<void> => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const { fromUserId, toUserId } = requestDoc.data();

      // Update request status
      await updateDoc(requestRef, { status: 'accepted' });

      // Add to friends list for both users
      const fromUserRef = doc(db, 'users', fromUserId);
      const toUserRef = doc(db, 'users', toUserId);

      await updateDoc(fromUserRef, {
        friends: arrayUnion(toUserId),
      });

      await updateDoc(toUserRef, {
        friends: arrayUnion(fromUserId),
      });
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  // Get friend requests
  getFriendRequests: async (userId: string): Promise<FriendRequest[]> => {
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const requests: FriendRequest[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as FriendRequest[];

      return requests;
    } catch (error: any) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  },

  // Search users
  searchUsers: async (searchQuery: string): Promise<User[]> => {
    try {
      // Note: For production, consider using Algolia or similar for better search
      const q = query(collection(db, 'users'), limit(20));

      const querySnapshot = await getDocs(q);
      const users: User[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        }))
        .filter((user: any) =>
          user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
        ) as User[];

      return users;
    } catch (error: any) {
      console.error('Error searching users:', error);
      return [];
    }
  },
};
