import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { VideoMetadata, Comment, Channel, UserProfile, ChannelId, MembershipTier, Subscription, Course, Playlist, Donation, StripeAccount, ChannelStripeConnection, StripeConfiguration } from '../backend';
import { Category } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal: Principal | string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      const principalObj = typeof principal === 'string' ? principal : principal;
      return actor.getUserProfile(principalObj as any);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useUpdateCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
    },
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Video Queries
export function useGetAllVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<VideoMetadata[]>({
    queryKey: ['videos', 'all'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const categories: Category[] = [
        Category.music,
        Category.gaming,
        Category.education,
        Category.vlog,
        Category.comedy,
        Category.other,
      ];
      const allVideos = await Promise.all(
        categories.map((cat) => actor.getVideosByCategory(cat as any))
      );
      return allVideos.flat();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGetVideo(videoId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<VideoMetadata | null>({
    queryKey: ['video', videoId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      if (!videoId) throw new Error('Video ID is required');
      const video = await actor.getVideo(videoId);
      return video;
    },
    enabled: !!actor && !isFetching && !!videoId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useGetVideosByCategory(category: Category) {
  const { actor, isFetching } = useActor();

  return useQuery<VideoMetadata[]>({
    queryKey: ['videos', 'category', category],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getVideosByCategory(category as any);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useSearchVideos(searchTerm: string) {
  const { actor, isFetching } = useActor();

  return useQuery<VideoMetadata[]>({
    queryKey: ['videos', 'search', searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm) return [];
      return actor.searchVideos(searchTerm);
    },
    enabled: !!actor && !isFetching && !!searchTerm,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useUploadVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metadata: VideoMetadata) => {
      if (!actor) throw new Error('Actor not available');
      await actor.uploadVideo(metadata);
    },
    onSuccess: (_, metadata) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['channelVideos', metadata.channelId] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.refetchQueries({ queryKey: ['videos', 'all'] });
    },
    onError: (error: any) => {
      console.error('Upload video mutation error:', error);
      throw error;
    },
  });
}

export function useUpdateVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, metadata }: { videoId: string; metadata: VideoMetadata }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateVideo(videoId, metadata);
    },
    onSuccess: (_, { videoId, metadata }) => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['channelVideos', metadata.channelId] });
    },
  });
}

export function useToggleVideoPrivacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleVideoPrivacy(videoId);
    },
    onSuccess: (_, videoId) => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useDeleteVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, channelId }: { videoId: string; channelId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteVideo(videoId);
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['channelVideos', channelId] });
    },
  });
}

export function useLikeVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likeVideo(videoId);
    },
    onSuccess: (_, videoId) => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

// Comment Queries
export function useGetComments(videoId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ['comments', videoId],
    queryFn: async () => {
      if (!actor || !videoId) return [];
      return actor.getComments(videoId);
    },
    enabled: !!actor && !isFetching && !!videoId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: Comment) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addComment(comment);
    },
    onSuccess: (_, comment) => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.videoId] });
    },
  });
}

// Channel Queries
export function useGetChannel(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Channel | null>({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return null;
      return actor.getChannel(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useGetUserChannels() {
  const { actor, isFetching } = useActor();

  return useQuery<Channel[]>({
    queryKey: ['userChannels'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserChannels();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useGetChannelVideos(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<VideoMetadata[]>({
    queryKey: ['channelVideos', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      return actor.getChannelVideos(channelId as any);
    },
    enabled: !!actor && !isFetching && !!channelId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useCreateChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channel: Channel) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createChannel(channel);
    },
    onSuccess: (_, channel) => {
      queryClient.invalidateQueries({ queryKey: ['channel', channel.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
    },
  });
}

export function useUpdateChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, name, profile }: { channelId: string; name: string; profile: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateChannel(channelId, name, profile);
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
    },
  });
}

// Channel Following Queries
export function useFollowChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: ChannelId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.followChannel(channelId);
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['followedChannels'] });
      queryClient.invalidateQueries({ queryKey: ['isFollowing', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channelFollowers', channelId] });
    },
  });
}

export function useUnfollowChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: ChannelId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfollowChannel(channelId);
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['followedChannels'] });
      queryClient.invalidateQueries({ queryKey: ['isFollowing', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channelFollowers', channelId] });
    },
  });
}

export function useIsFollowingChannel(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isFollowing', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return false;
      return actor.isFollowingChannel(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useGetFollowedChannels() {
  const { actor, isFetching } = useActor();

  return useQuery<ChannelId[]>({
    queryKey: ['followedChannels'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowedChannels();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetChannelFollowers(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['channelFollowers', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      return actor.getChannelFollowers(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

// Membership Tier Queries
export function useGetChannelMembershipTiers(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<MembershipTier[]>({
    queryKey: ['membershipTiers', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      return actor.getChannelMembershipTiers(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useCreateMembershipTier() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: MembershipTier) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createMembershipTier(tier);
    },
    onSuccess: (_, tier) => {
      queryClient.invalidateQueries({ queryKey: ['membershipTiers', tier.channelId] });
    },
  });
}

export function useUpdateMembershipTier() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tierId, tier }: { tierId: string; tier: MembershipTier }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMembershipTier(tierId, tier);
    },
    onSuccess: (_, { tier }) => {
      queryClient.invalidateQueries({ queryKey: ['membershipTiers', tier.channelId] });
    },
  });
}

export function useDeleteMembershipTier() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tierId, channelId }: { tierId: string; channelId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMembershipTier(tierId);
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['membershipTiers', channelId] });
    },
  });
}

// Subscription Queries
export function useGetUserSubscriptionTierLevel(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ['userSubscriptionTierLevel', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return null;
      return actor.getUserSubscriptionTierLevel(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useHasActiveSubscription(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['hasActiveSubscription', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return false;
      return actor.hasActiveSubscription(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useCreateSubscription() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscription: Subscription) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createSubscription(subscription);
    },
    onSuccess: (_, subscription) => {
      queryClient.invalidateQueries({ queryKey: ['hasActiveSubscription', subscription.channelId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptionTierLevel', subscription.channelId] });
    },
  });
}

export function useCancelSubscription() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId, channelId }: { subscriptionId: string; channelId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.cancelSubscription(subscriptionId);
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['hasActiveSubscription', channelId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptionTierLevel', channelId] });
    },
  });
}

// Course Queries
export function useGetChannelCourses(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Course[]>({
    queryKey: ['channelCourses', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      return actor.getChannelCourses(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useGetCourse(courseId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Course | null>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!actor || !courseId) return null;
      return actor.getCourse(courseId);
    },
    enabled: !!actor && !isFetching && !!courseId,
  });
}

export function useGetPersonalizedCourses() {
  const { actor, isFetching } = useActor();

  return useQuery<Course[]>({
    queryKey: ['personalizedCourses'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPersonalizedCourses();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCourse() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (course: Course) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCourse(course);
    },
    onSuccess: (_, course) => {
      queryClient.invalidateQueries({ queryKey: ['channelCourses', course.channelId] });
    },
  });
}

export function useUpdateCourse() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, course }: { courseId: string; course: Course }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCourse(courseId, course);
    },
    onSuccess: (_, { courseId, course }) => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['channelCourses', course.channelId] });
      queryClient.invalidateQueries({ queryKey: ['personalizedCourses'] });
    },
  });
}

export function useDeleteCourse() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, channelId }: { courseId: string; channelId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCourse(courseId);
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channelCourses', channelId] });
    },
  });
}

// Playlist Queries
export function useGetUserPlaylists() {
  const { actor, isFetching } = useActor();

  return useQuery<Playlist[]>({
    queryKey: ['userPlaylists'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserPlaylists();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPlaylist(playlistId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Playlist | null>({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      if (!actor || !playlistId) return null;
      return actor.getPlaylist(playlistId);
    },
    enabled: !!actor && !isFetching && !!playlistId,
  });
}

export function useCreatePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlist: Playlist) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPlaylist(playlist);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
}

export function useUpdatePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, playlist }: { playlistId: string; playlist: Playlist }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePlaylist(playlistId, playlist);
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
}

export function useDeletePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePlaylist(playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
}

// Donation Queries
export function useGetChannelDonations(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Donation[]>({
    queryKey: ['channelDonations', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return [];
      return actor.getChannelDonations(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useRecordDonation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donation: Donation) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordDonation(donation);
    },
    onSuccess: (_, donation) => {
      queryClient.invalidateQueries({ queryKey: ['channelDonations', donation.channelId] });
    },
  });
}

// Stripe Account Queries
export function useGetUserStripeAccounts() {
  const { actor, isFetching } = useActor();

  return useQuery<StripeAccount[]>({
    queryKey: ['userStripeAccounts'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserStripeAccounts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStripeAccount(accountId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<StripeAccount | null>({
    queryKey: ['stripeAccount', accountId],
    queryFn: async () => {
      if (!actor || !accountId) return null;
      return actor.getStripeAccount(accountId);
    },
    enabled: !!actor && !isFetching && !!accountId,
  });
}

export function useCreateStripeAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: StripeAccount) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createStripeAccount(account);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStripeAccounts'] });
    },
  });
}

export function useUpdateStripeAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, account }: { accountId: string; account: StripeAccount }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateStripeAccount(accountId, account);
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['stripeAccount', accountId] });
      queryClient.invalidateQueries({ queryKey: ['userStripeAccounts'] });
    },
  });
}

export function useDeleteStripeAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteStripeAccount(accountId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStripeAccounts'] });
    },
  });
}

// Channel Stripe Connection Queries
export function useGetChannelStripeConnection(channelId: string | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<ChannelStripeConnection | null>({
    queryKey: ['channelStripeConnection', channelId],
    queryFn: async () => {
      if (!actor || !channelId) return null;
      return actor.getChannelStripeConnection(channelId);
    },
    enabled: !!actor && !isFetching && !!channelId,
  });
}

export function useConnectChannelToStripeAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connection: ChannelStripeConnection) => {
      if (!actor) throw new Error('Actor not available');
      return actor.connectChannelToStripeAccount(connection);
    },
    onSuccess: (_, connection) => {
      queryClient.invalidateQueries({ queryKey: ['channelStripeConnection', connection.channelId] });
    },
  });
}

// Stripe Configuration Queries
export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isStripeConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isStripeConfigured'] });
    },
  });
}
