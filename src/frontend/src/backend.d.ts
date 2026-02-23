import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface Course {
    id: string;
    title: string;
    channelId: ChannelId;
    requiredTierLevel?: bigint;
    description: string;
    courseImage?: string;
    isVisible: boolean;
    priceUsd?: bigint;
    videoIds: Array<VideoId>;
}
export interface Subscription {
    id: string;
    status: SubscriptionStatus;
    nextBillingDate: Time;
    tierId: string;
    channelId: ChannelId;
    user: Principal;
    startDate: Time;
}
export interface Donation {
    id: string;
    channelId: ChannelId;
    message?: string;
    timestamp: Time;
    amountUsd: bigint;
    donor: Principal;
}
export interface StripeAccount {
    id: string;
    owner: Principal;
    payoutSettings?: string;
    secretKey: string;
    accountName: string;
    connectId?: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type VideoId = string;
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface MembershipTier {
    id: string;
    tierLevel: bigint;
    channelId: ChannelId;
    name: string;
    description: string;
    priceUsd: bigint;
}
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Comment {
    id: string;
    content: string;
    author: Principal;
    timestamp: Time;
    videoId: VideoId;
}
export type ChannelId = string;
export interface Playlist {
    id: string;
    title: string;
    creator: Principal;
    description: string;
    visibility: PlaylistVisibility;
    videoIds: Array<VideoId>;
}
export interface Channel {
    id: ChannelId;
    principal: Principal;
    name: string;
    profile: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface VideoMetadata {
    id: VideoId;
    title: string;
    likeCount: bigint;
    thumbnailUrl: string;
    channelId: ChannelId;
    requiredTierLevel?: bigint;
    description: string;
    viewCount: bigint;
    isPrivate: boolean;
    category: Category;
    videoUrl: string;
    uploadDate: Time;
}
export interface ChannelStripeConnection {
    channelId: ChannelId;
    stripeAccountId: string;
}
export interface UserProfile {
    name: string;
}
export enum Category {
    music = "music",
    other = "other",
    vlog = "vlog",
    education = "education",
    gaming = "gaming",
    comedy = "comedy"
}
export enum PlaylistVisibility {
    privateVisibility = "privateVisibility",
    publicVisibility = "publicVisibility"
}
export enum SubscriptionStatus {
    active = "active",
    canceled = "canceled",
    past_due = "past_due"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(comment: Comment): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelSubscription(subscriptionId: string): Promise<void>;
    connectChannelToStripeAccount(connection: ChannelStripeConnection): Promise<void>;
    createChannel(channel: Channel): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createCourse(course: Course): Promise<void>;
    createMembershipTier(tier: MembershipTier): Promise<void>;
    createPlaylist(playlist: Playlist): Promise<void>;
    createStripeAccount(account: StripeAccount): Promise<void>;
    createSubscription(subscription: Subscription): Promise<void>;
    deleteCourse(courseId: string): Promise<void>;
    deleteMembershipTier(tierId: string): Promise<void>;
    deletePlaylist(playlistId: string): Promise<void>;
    deleteStripeAccount(accountId: string): Promise<void>;
    deleteVideo(videoId: VideoId): Promise<void>;
    followChannel(channelId: ChannelId): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannel(channelId: ChannelId): Promise<Channel | null>;
    getChannelCourses(channelId: ChannelId): Promise<Array<Course>>;
    getChannelDonations(channelId: ChannelId): Promise<Array<Donation>>;
    getChannelFollowers(channelId: ChannelId): Promise<Array<Principal>>;
    getChannelMembershipTiers(channelId: ChannelId): Promise<Array<MembershipTier>>;
    getChannelStripeConnection(channelId: ChannelId): Promise<ChannelStripeConnection | null>;
    getChannelVideos(channelId: ChannelId): Promise<Array<VideoMetadata>>;
    getComments(videoId: VideoId): Promise<Array<Comment>>;
    getCourse(courseId: string): Promise<Course | null>;
    getFollowedChannels(): Promise<Array<ChannelId>>;
    getFullVideoMetadata(videoId: VideoId): Promise<{
        video: VideoMetadata;
        channel: Channel;
    } | null>;
    getPersonalizedCourses(): Promise<Array<Course>>;
    getPlaylist(playlistId: string): Promise<Playlist | null>;
    getPublicPlaylists(): Promise<Array<Playlist>>;
    getStripeAccount(accountId: string): Promise<StripeAccount | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getThumbnailUrl(videoId: VideoId): Promise<string | null>;
    getUserChannels(): Promise<Array<Channel>>;
    getUserDonationHistory(): Promise<Array<Donation>>;
    getUserPlaylists(): Promise<Array<Playlist>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStripeAccounts(): Promise<Array<StripeAccount>>;
    getUserSubscriptionTierLevel(channelId: ChannelId): Promise<bigint | null>;
    getVideo(videoId: VideoId): Promise<VideoMetadata | null>;
    getVideoAuthenticated(videoId: VideoId): Promise<VideoMetadata | null>;
    getVideoUrl(videoId: VideoId): Promise<string | null>;
    getVideosByCategory(category: Category): Promise<Array<VideoMetadata>>;
    hasActiveSubscription(channelId: ChannelId): Promise<boolean>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowingChannel(channelId: ChannelId): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    likeVideo(videoId: VideoId): Promise<void>;
    recordDonation(donation: Donation): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchVideos(searchTerm: string): Promise<Array<VideoMetadata>>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    toggleVideoPrivacy(videoId: VideoId): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unfollowChannel(channelId: ChannelId): Promise<void>;
    updateCallerUserProfile(updatedProfile: UserProfile): Promise<void>;
    updateChannel(channelId: ChannelId, updatedName: string, updatedProfile: string): Promise<void>;
    updateCourse(courseId: string, updatedCourse: Course): Promise<void>;
    updateMembershipTier(tierId: string, updatedTier: MembershipTier): Promise<void>;
    updatePlaylist(playlistId: string, updatedPlaylist: Playlist): Promise<void>;
    updateStripeAccount(accountId: string, updatedAccount: StripeAccount): Promise<void>;
    updateVideo(videoId: VideoId, updatedMetadata: VideoMetadata): Promise<void>;
    uploadVideo(metadata: VideoMetadata): Promise<void>;
}
