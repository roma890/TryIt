// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  cuisinePreferences: string[];
  priceRangePreference: PriceRange;
  friends: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DietaryRestriction {
  type: 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free' | 'dairy-free' | 'nut-free';
  strict: boolean;
}

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

// Restaurant Types
export interface Restaurant {
  id: string;
  placeId: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  cuisine: string[];
  priceLevel: PriceRange;
  rating: number;
  reviewCount: number;
  photos: string[];
  logoUrl?: string;
  openingHours?: OpeningHours;
  menu?: MenuItem[];
  phoneNumber?: string;
  website?: string;
  distanceFromUser?: number;
  reviews?: Review[];
}

export interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url?: string;
  relative_time_description?: string;
}

export interface OpeningHours {
  weekday_text: string[];
  open_now: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrl?: string;
  dietaryInfo?: string[];
}

// Swipe Types
export interface Swipe {
  id: string;
  userId: string;
  restaurantId: string;
  direction: 'left' | 'right';
  timestamp: Date;
}

export interface SwipeMatch {
  id: string;
  userIds: string[];
  restaurantId: string;
  createdAt: Date;
  groupChatId?: string;
}

// Filter Types
export interface FilterOptions {
  cuisines: string[];
  priceRange: PriceRange[];
  radius: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  openNow: boolean;
  minRating?: number;
  excludeFastFood?: boolean;
}

// Social/Feed Types
export interface FoodPost {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  restaurantId: string;
  restaurantName: string;
  images: string[];
  caption?: string;
  rating?: number;
  tags: string[];
  likes: string[];
  comments: Comment[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: Date;
}

// Chat Types
export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  restaurantId?: string;
  name?: string;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  type: 'text' | 'image' | 'restaurant';
  restaurantData?: Restaurant;
  imageUrl?: string;
  createdAt: Date;
  readBy: string[];
}

// Friend Types
export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface FriendSuggestion {
  user: User;
  matchScore: number;
  commonRestaurants: Restaurant[];
  mutualFriends: string[];
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  SignUp: undefined;
  RestaurantDetails: { restaurant: Restaurant };
  UserProfile: { userId: string };
  ChatRoom: { chatRoomId: string };
  EditProfile: undefined;
  Settings: undefined;
  Filters: undefined;
  CreatePost: { restaurant: Restaurant };
  FriendSearch: undefined;
};

export type MainTabParamList = {
  Swipe: undefined;
  Social: undefined;
  Matches: undefined;
  Chat: undefined;
  Profile: undefined;
};
