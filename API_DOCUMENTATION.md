# FoodSwipe API Documentation

This document describes the services and methods available in the FoodSwipe app.

## Table of Contents
1. [Authentication Service](#authentication-service)
2. [Swipe Service](#swipe-service)
3. [Chat Service](#chat-service)
4. [Social Service](#social-service)
5. [Google Places Service](#google-places-service)

---

## Authentication Service

Location: `src/services/firebase/auth.service.ts`

### Methods

#### `signUp(email, password, displayName)`
Creates a new user account.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (min 6 characters)
- `displayName` (string): User's display name

**Returns:** `Promise<User>`

**Example:**
```typescript
const user = await authService.signUp(
  'john@example.com',
  'password123',
  'John Doe'
);
```

#### `signIn(email, password)`
Signs in an existing user.

**Parameters:**
- `email` (string): User's email
- `password` (string): User's password

**Returns:** `Promise<User>`

**Example:**
```typescript
const user = await authService.signIn('john@example.com', 'password123');
```

#### `signOut()`
Signs out the current user.

**Returns:** `Promise<void>`

**Example:**
```typescript
await authService.signOut();
```

#### `getCurrentUser()`
Gets the currently authenticated Firebase user.

**Returns:** `FirebaseUser | null`

**Example:**
```typescript
const currentUser = authService.getCurrentUser();
```

#### `getUserData(userId)`
Fetches user data from Firestore.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<User | null>`

**Example:**
```typescript
const userData = await authService.getUserData('user123');
```

---

## Swipe Service

Location: `src/services/firebase/swipe.service.ts`

### Methods

#### `recordSwipe(userId, restaurantId, direction)`
Records a user's swipe on a restaurant.

**Parameters:**
- `userId` (string): User's ID
- `restaurantId` (string): Restaurant's ID
- `direction` ('left' | 'right'): Swipe direction

**Returns:** `Promise<void>`

**Side Effects:**
- If direction is 'right', checks for matches with friends
- Creates match documents if friends also swiped right

**Example:**
```typescript
await swipeService.recordSwipe('user123', 'restaurant456', 'right');
```

#### `getUserSwipes(userId)`
Gets all swipes for a user.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<Swipe[]>`

**Example:**
```typescript
const swipes = await swipeService.getUserSwipes('user123');
```

#### `getLikedRestaurants(userId)`
Gets all restaurant IDs that a user swiped right on.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const likedIds = await swipeService.getLikedRestaurants('user123');
```

#### `getUserMatches(userId)`
Gets all matches for a user.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<SwipeMatch[]>`

**Example:**
```typescript
const matches = await swipeService.getUserMatches('user123');
```

---

## Chat Service

Location: `src/services/firebase/chat.service.ts`

### Methods

#### `createChatRoom(participants, type, restaurantId?, name?)`
Creates a new chat room.

**Parameters:**
- `participants` (string[]): Array of user IDs
- `type` ('direct' | 'group'): Chat type
- `restaurantId` (string, optional): Associated restaurant ID
- `name` (string, optional): Group chat name

**Returns:** `Promise<string>` (chat room ID)

**Example:**
```typescript
const chatId = await chatService.createChatRoom(
  ['user1', 'user2', 'user3'],
  'group',
  'restaurant123',
  'Pizza Night'
);
```

#### `getUserChatRooms(userId)`
Gets all chat rooms for a user.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<ChatRoom[]>`

**Example:**
```typescript
const chatRooms = await chatService.getUserChatRooms('user123');
```

#### `sendMessage(chatRoomId, senderId, senderName, text, type?, additionalData?)`
Sends a message to a chat room.

**Parameters:**
- `chatRoomId` (string): Chat room ID
- `senderId` (string): Sender's user ID
- `senderName` (string): Sender's display name
- `text` (string): Message text
- `type` ('text' | 'image' | 'restaurant', optional): Message type
- `additionalData` (any, optional): Additional data (e.g., restaurant info)

**Returns:** `Promise<void>`

**Example:**
```typescript
await chatService.sendMessage(
  'chat123',
  'user123',
  'John Doe',
  'Let\'s go here!',
  'text'
);
```

#### `getChatMessages(chatRoomId, limitCount?)`
Gets messages from a chat room.

**Parameters:**
- `chatRoomId` (string): Chat room ID
- `limitCount` (number, optional): Max messages to fetch (default: 50)

**Returns:** `Promise<Message[]>`

**Example:**
```typescript
const messages = await chatService.getChatMessages('chat123', 100);
```

#### `subscribeToMessages(chatRoomId, callback)`
Subscribes to real-time message updates.

**Parameters:**
- `chatRoomId` (string): Chat room ID
- `callback` (function): Callback function receiving messages array

**Returns:** `function` (unsubscribe function)

**Example:**
```typescript
const unsubscribe = chatService.subscribeToMessages('chat123', (messages) => {
  console.log('New messages:', messages);
});

// Later, to stop listening:
unsubscribe();
```

#### `markMessageAsRead(messageId, userId)`
Marks a message as read by a user.

**Parameters:**
- `messageId` (string): Message ID
- `userId` (string): User's ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await chatService.markMessageAsRead('msg123', 'user123');
```

#### `findOrCreateDirectChat(userId1, userId2)`
Finds existing direct chat or creates new one.

**Parameters:**
- `userId1` (string): First user's ID
- `userId2` (string): Second user's ID

**Returns:** `Promise<string>` (chat room ID)

**Example:**
```typescript
const chatId = await chatService.findOrCreateDirectChat('user1', 'user2');
```

---

## Social Service

Location: `src/services/firebase/social.service.ts`

### Methods

#### `createPost(userId, userName, restaurantId, restaurantName, images, caption?, rating?, tags?)`
Creates a new food post.

**Parameters:**
- `userId` (string): User's ID
- `userName` (string): User's display name
- `restaurantId` (string): Restaurant ID
- `restaurantName` (string): Restaurant name
- `images` (string[]): Array of image URLs
- `caption` (string, optional): Post caption
- `rating` (number, optional): User's rating (0-5)
- `tags` (string[], optional): Post tags

**Returns:** `Promise<string>` (post ID)

**Example:**
```typescript
const postId = await socialService.createPost(
  'user123',
  'John Doe',
  'restaurant456',
  'Pizza Palace',
  ['https://example.com/image.jpg'],
  'Best pizza ever!',
  4.5,
  ['pizza', 'italian']
);
```

#### `getFeedPosts(userId, limitCount?)`
Gets feed posts from user and friends.

**Parameters:**
- `userId` (string): User's ID
- `limitCount` (number, optional): Max posts to fetch (default: 20)

**Returns:** `Promise<FoodPost[]>`

**Example:**
```typescript
const posts = await socialService.getFeedPosts('user123', 30);
```

#### `getUserPosts(userId)`
Gets all posts by a specific user.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<FoodPost[]>`

**Example:**
```typescript
const userPosts = await socialService.getUserPosts('user123');
```

#### `likePost(postId, userId)`
Likes a post.

**Parameters:**
- `postId` (string): Post ID
- `userId` (string): User's ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await socialService.likePost('post123', 'user123');
```

#### `unlikePost(postId, userId)`
Unlikes a post.

**Parameters:**
- `postId` (string): Post ID
- `userId` (string): User's ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await socialService.unlikePost('post123', 'user123');
```

#### `addComment(postId, userId, userName, text, userPhotoURL?)`
Adds a comment to a post.

**Parameters:**
- `postId` (string): Post ID
- `userId` (string): User's ID
- `userName` (string): User's display name
- `text` (string): Comment text
- `userPhotoURL` (string, optional): User's photo URL

**Returns:** `Promise<void>`

**Example:**
```typescript
await socialService.addComment(
  'post123',
  'user123',
  'John Doe',
  'Looks delicious!'
);
```

#### `uploadImage(uri, path)`
Uploads an image to Firebase Storage.

**Parameters:**
- `uri` (string): Local image URI
- `path` (string): Storage path

**Returns:** `Promise<string>` (download URL)

**Example:**
```typescript
const url = await socialService.uploadImage(
  'file:///path/to/image.jpg',
  'posts/user123/image1.jpg'
);
```

#### `sendFriendRequest(fromUserId, toUserId)`
Sends a friend request.

**Parameters:**
- `fromUserId` (string): Sender's user ID
- `toUserId` (string): Recipient's user ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await socialService.sendFriendRequest('user123', 'user456');
```

#### `acceptFriendRequest(requestId)`
Accepts a friend request.

**Parameters:**
- `requestId` (string): Friend request ID

**Returns:** `Promise<void>`

**Side Effects:**
- Updates both users' friends lists
- Marks request as accepted

**Example:**
```typescript
await socialService.acceptFriendRequest('request123');
```

#### `getFriendRequests(userId)`
Gets pending friend requests for a user.

**Parameters:**
- `userId` (string): User's ID

**Returns:** `Promise<FriendRequest[]>`

**Example:**
```typescript
const requests = await socialService.getFriendRequests('user123');
```

#### `searchUsers(searchQuery)`
Searches for users by display name.

**Parameters:**
- `searchQuery` (string): Search term

**Returns:** `Promise<User[]>`

**Note:** Basic implementation. Consider using Algolia for production.

**Example:**
```typescript
const users = await socialService.searchUsers('john');
```

---

## Google Places Service

Location: `src/services/api/googlePlaces.service.ts`

### Methods

#### `searchNearbyRestaurants(params)`
Searches for nearby restaurants.

**Parameters:**
- `params` (NearbySearchParams):
  - `latitude` (number): User's latitude
  - `longitude` (number): User's longitude
  - `radius` (number): Search radius in meters
  - `type` (string, optional): Place type (default: 'restaurant')
  - `keyword` (string, optional): Search keyword
  - `minprice` (number, optional): Min price level (0-4)
  - `maxprice` (number, optional): Max price level (0-4)
  - `opennow` (boolean, optional): Only open restaurants

**Returns:** `Promise<Restaurant[]>`

**Example:**
```typescript
const restaurants = await googlePlacesService.searchNearbyRestaurants({
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 5000,
  opennow: true,
  maxprice: 2
});
```

#### `getRestaurantDetails(placeId)`
Gets detailed information about a restaurant.

**Parameters:**
- `placeId` (string): Google Places ID

**Returns:** `Promise<Restaurant | null>`

**Example:**
```typescript
const restaurant = await googlePlacesService.getRestaurantDetails('ChIJ...');
```

#### `getPhotoUrl(photoReference, maxWidth?)`
Gets URL for a Google Places photo.

**Parameters:**
- `photoReference` (string): Photo reference from Places API
- `maxWidth` (number, optional): Max width in pixels (default: 400)

**Returns:** `string` (photo URL)

**Example:**
```typescript
const photoUrl = googlePlacesService.getPhotoUrl('CmRaAAAA...', 800);
```

#### `autocomplete(input, latitude?, longitude?)`
Autocompletes restaurant search.

**Parameters:**
- `input` (string): Search input
- `latitude` (number, optional): User's latitude
- `longitude` (number, optional): User's longitude

**Returns:** `Promise<any[]>` (predictions)

**Example:**
```typescript
const predictions = await googlePlacesService.autocomplete(
  'pizza',
  37.7749,
  -122.4194
);
```

---

## Error Handling

All service methods may throw errors. Always wrap calls in try-catch blocks:

```typescript
try {
  const user = await authService.signIn(email, password);
} catch (error) {
  console.error('Login failed:', error.message);
  Alert.alert('Error', error.message);
}
```

## Rate Limits

- **Firebase**: 50,000 reads/day on free tier
- **Google Places API**: $200 free credit/month (~40,000 requests)

## Best Practices

1. **Cache Data**: Store frequently accessed data locally
2. **Batch Operations**: Use Firestore batch writes when possible
3. **Optimize Queries**: Use indexes and limit results
4. **Handle Errors**: Always implement error handling
5. **Security**: Validate user permissions before operations

---

For more information, see the [README.md](./README.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md).
