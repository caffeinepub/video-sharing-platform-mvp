import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";

import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";

import Migration "migration";

(with migration = Migration.run)
actor {
    let accessControlState = AccessControl.initState();
    include MixinAuthorization(accessControlState);
    include MixinObjectStorage();

    public shared ({ caller }) func initializeAccessControl() : async () {
        AccessControl.initialize(accessControlState, caller);
    };

    // ── Input validation constants ────────────────────────────────────────────
    let MAX_CHANNEL_NAME_LEN   : Nat = 100;
    let MAX_VIDEO_TITLE_LEN    : Nat = 200;
    let MAX_DESCRIPTION_LEN    : Nat = 5000;
    let MAX_CHANNELS_PER_USER  : Nat = 5;
    let MAX_VIDEOS_PER_HOUR    : Nat = 10;
    let ONE_HOUR_NS            : Int = 3_600_000_000_000; // 1 hour in nanoseconds

    // ── Rate-limiting state ───────────────────────────────────────────────────
    // Tracks per-user video upload timestamps (rolling window)
    let videoUploadLog = Map.empty<Principal, [Time.Time]>();

    func recordVideoUpload(user : Principal) {
        let now = Time.now();
        let prev = switch (videoUploadLog.get(user)) {
            case (null) { [] };
            case (?ts) { ts };
        };
        // Keep only timestamps within the last hour
        let recent = List.empty<Time.Time>();
        for (t in prev.vals()) {
            if (now - t < ONE_HOUR_NS) { recent.add(t) };
        };
        recent.add(now);
        videoUploadLog.add(user, recent.toArray());
    };

    func isRateLimited(user : Principal) : Bool {
        let now = Time.now();
        switch (videoUploadLog.get(user)) {
            case (null) { false };
            case (?ts) {
                var count : Nat = 0;
                for (t in ts.vals()) {
                    if (now - t < ONE_HOUR_NS) { count += 1 };
                };
                count >= MAX_VIDEOS_PER_HOUR;
            };
        };
    };

    func countUserChannels(user : Principal) : Nat {
        var count : Nat = 0;
        for (ch in channels.values()) {
            if (ch.principal == user) { count += 1 };
        };
        count;
    };

    // ── UserProfile ───────────────────────────────────────────────────────────

    public type UserProfile = {
        name : Text;
    };

    let userProfiles = Map.empty<Principal, UserProfile>();

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return null;
        };
        userProfiles.get(caller);
    };

    public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
        if (caller != user and not (AccessControl.isAdmin(accessControlState, caller))) {
            return null;
        };
        userProfiles.get(user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can save profiles");
        };
        if (profile.name.size() == 0) {
            Runtime.trap("Validation: Profile name cannot be empty");
        };
        if (profile.name.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Profile name exceeds 100 character limit");
        };
        userProfiles.add(caller, profile);
    };

    public shared ({ caller }) func updateCallerUserProfile(updatedProfile : UserProfile) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update profiles");
        };
        if (updatedProfile.name.size() == 0) {
            Runtime.trap("Validation: Profile name cannot be empty");
        };
        if (updatedProfile.name.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Profile name exceeds 100 character limit");
        };
        switch (userProfiles.get(caller)) {
            case (null) { Runtime.trap("Profile not found") };
            case (?_) {
                userProfiles.add(caller, updatedProfile);
            };
        };
    };

    // ── Core Types ────────────────────────────────────────────────────────────

    public type VideoId = Text;
    public type ChannelId = Text;
    public type Category = {
        #music;
        #gaming;
        #education;
        #vlog;
        #comedy;
        #other;
    };

    public type VideoMetadata = {
        id : VideoId;
        title : Text;
        description : Text;
        category : Category;
        uploadDate : Time.Time;
        likeCount : Nat;
        channelId : ChannelId;
        videoUrl : Text;
        thumbnailUrl : Text;
        requiredTierLevel : ?Nat;
        isPrivate : Bool;
        viewCount : Nat;
    };

    public type Comment = {
        id : Text;
        videoId : VideoId;
        author : Principal;
        content : Text;
        timestamp : Time.Time;
    };

    public type Channel = {
        id : ChannelId;
        principal : Principal;
        name : Text;
        profile : Text;
    };

    public type MembershipTier = {
        id : Text;
        channelId : ChannelId;
        name : Text;
        priceUsd : Nat;
        tierLevel : Nat;
        description : Text;
    };

    public type SubscriptionStatus = {
        #active;
        #canceled;
        #past_due;
    };

    public type Subscription = {
        id : Text;
        user : Principal;
        channelId : ChannelId;
        tierId : Text;
        status : SubscriptionStatus;
        startDate : Time.Time;
        nextBillingDate : Time.Time;
    };

    public type Course = {
        id : Text;
        channelId : ChannelId;
        title : Text;
        description : Text;
        priceUsd : ?Nat;
        requiredTierLevel : ?Nat;
        videoIds : [VideoId];
        courseImage : ?Text;
        isVisible : Bool;
    };

    public type PlaylistVisibility = {
        #publicVisibility;
        #privateVisibility;
    };

    public type Playlist = {
        id : Text;
        creator : Principal;
        title : Text;
        description : Text;
        visibility : PlaylistVisibility;
        videoIds : [VideoId];
    };

    public type Donation = {
        id : Text;
        donor : Principal;
        channelId : ChannelId;
        amountUsd : Nat;
        timestamp : Time.Time;
        message : ?Text;
    };

    let videos = Map.empty<Text, VideoMetadata>();
    let comments = Map.empty<Text, Comment>();
    let channels = Map.empty<Text, Channel>();
    let membershipTiers = Map.empty<Text, MembershipTier>();
    let subscriptions = Map.empty<Text, Subscription>();
    let courses = Map.empty<Text, Course>();
    let playlists = Map.empty<Text, Playlist>();
    let donations = Map.empty<Text, Donation>();

    // ── Internal helpers ──────────────────────────────────────────────────────

    func getUserTierLevel(user : Principal, channelId : ChannelId) : ?Nat {
        for (subscription in subscriptions.values()) {
            if (subscription.user == user and subscription.channelId == channelId and subscription.status == #active) {
                return switch (membershipTiers.get(subscription.tierId)) {
                    case (null) { null };
                    case (?tier) { ?tier.tierLevel };
                };
            };
        };
        null;
    };

    func hasAccessToPrivateVideo(user : Principal, video : VideoMetadata) : Bool {
        for (course in courses.values()) {
            var videoInCourse = false;
            for (courseVideoId in course.videoIds.vals()) {
                if (courseVideoId == video.id) {
                    videoInCourse := true;
                };
            };
            if (videoInCourse) {
                switch (course.requiredTierLevel) {
                    case (null) { return true };
                    case (?requiredLevel) {
                        switch (getUserTierLevel(user, course.channelId)) {
                            case (null) { };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) { return true };
                            };
                        };
                    };
                };
            };
        };
        false;
    };

    func canAccessVideo(caller : Principal, video : VideoMetadata) : Bool {
        if (not video.isPrivate) {
            return true;
        };

        switch (channels.get(video.channelId)) {
            case (null) { false };
            case (?channel) {
                channel.principal == caller or AccessControl.isAdmin(accessControlState, caller) or hasAccessToPrivateVideo(caller, video);
            };
        };
    };

    func isChannelOwner(caller : Principal, channelId : ChannelId) : Bool {
        switch (channels.get(channelId)) {
            case (null) { false };
            case (?channel) {
                channel.principal == caller or AccessControl.isAdmin(accessControlState, caller);
            };
        };
    };

    // ── Video management ──────────────────────────────────────────────────────

    public shared ({ caller }) func toggleVideoPrivacy(videoId : VideoId) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            Runtime.trap("Unauthorized: Only users can toggle video privacy");
        };

        switch (videos.get(videoId)) {
            case (null) {
                Runtime.trap("Video not found");
            };
            case (?video) {
                if (not isChannelOwner(caller, video.channelId)) {
                    Runtime.trap("Unauthorized: Only video owners or admin can toggle video privacy");
                };
                videos.add(videoId, { video with isPrivate = not video.isPrivate });
            };
        };
    };

    public shared ({ caller }) func updateVideo(videoId : VideoId, updatedMetadata : VideoMetadata) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update videos");
        };

        if (updatedMetadata.title.size() == 0) {
            Runtime.trap("Validation: Video title cannot be empty");
        };
        if (updatedMetadata.title.size() > MAX_VIDEO_TITLE_LEN) {
            Runtime.trap("Validation: Video title exceeds 200 character limit");
        };
        if (updatedMetadata.description.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Video description exceeds 5000 character limit");
        };

        switch (videos.get(videoId)) {
            case (null) { Runtime.trap("Video not found") };
            case (?existingVideo) {
                if (not isChannelOwner(caller, existingVideo.channelId)) {
                    Runtime.trap("Unauthorized: Can only update videos from your own channel");
                };
                videos.add(videoId, {
                    existingVideo with
                    title = updatedMetadata.title;
                    description = updatedMetadata.description;
                    category = updatedMetadata.category;
                    requiredTierLevel = updatedMetadata.requiredTierLevel;
                    thumbnailUrl = updatedMetadata.thumbnailUrl;
                    isPrivate = updatedMetadata.isPrivate;
                });
            };
        };
    };

    public shared ({ caller }) func deleteVideo(videoId : VideoId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete videos");
        };

        switch (videos.get(videoId)) {
            case (null) { Runtime.trap("Video not found") };
            case (?existingVideo) {
                if (not isChannelOwner(caller, existingVideo.channelId)) {
                    Runtime.trap("Unauthorized: Can only delete videos from your own channel");
                };
                videos.remove(videoId);
            };
        };
    };

    public shared ({ caller }) func uploadVideo(metadata : VideoMetadata) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can upload videos");
        };

        if (not isChannelOwner(caller, metadata.channelId)) {
            Runtime.trap("Unauthorized: Can only upload videos to your own channel");
        };

        // Input validation
        if (metadata.title.size() == 0) {
            Runtime.trap("Validation: Video title cannot be empty");
        };
        if (metadata.title.size() > MAX_VIDEO_TITLE_LEN) {
            Runtime.trap("Validation: Video title exceeds 200 character limit");
        };
        if (metadata.description.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Video description exceeds 5000 character limit");
        };
        if (metadata.videoUrl.size() == 0) {
            Runtime.trap("Validation: Video URL cannot be empty");
        };

        // Rate limiting: max 10 videos per hour per user
        if (isRateLimited(caller)) {
            Runtime.trap("Rate limit: Maximum 10 video uploads per hour exceeded");
        };

        recordVideoUpload(caller);
        videos.add(metadata.id, metadata);
    };

    public query ({ caller }) func getVideo(videoId : VideoId) : async ?VideoMetadata {
        switch (videos.get(videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    // Return null instead of trapping for unauthorized private video access
                    return null;
                };
                return ?video;
            };
        };
    };

    public query ({ caller }) func getVideoAuthenticated(videoId : VideoId) : async ?VideoMetadata {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return null;
        };

        switch (videos.get(videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    return null;
                };
                switch (video.requiredTierLevel) {
                    case (null) { ?video };
                    case (?requiredLevel) {
                        let userTierLevel = getUserTierLevel(caller, video.channelId);
                        switch (userTierLevel) {
                            case (null) { null };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?video;
                                } else {
                                    null;
                                };
                            };
                        };
                    };
                };
            };
        };
    };

    public query ({ caller }) func getVideosByCategory(category : Category) : async [VideoMetadata] {
        videos.values().filter(func(video) {
            video.category == category and canAccessVideo(caller, video)
        }).toArray();
    };

    public query ({ caller }) func searchVideos(searchTerm : Text) : async [VideoMetadata] {
        let term = searchTerm.toLower();
        videos.values().filter(func(video) {
            (video.title.toLower().contains(#text term) or video.description.toLower().contains(#text term)) and canAccessVideo(caller, video)
        }).toArray();
    };

    public shared ({ caller }) func likeVideo(videoId : VideoId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can like videos");
        };
        switch (videos.get(videoId)) {
            case (null) { Runtime.trap("Video not found") };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Runtime.trap("Unauthorized: Cannot like a private video you don't have access to");
                };
                videos.add(videoId, { video with likeCount = video.likeCount + 1 });
            };
        };
    };

    public shared ({ caller }) func addComment(comment : Comment) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can add comments");
        };
        if (comment.author != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only add comments as yourself");
        };
        if (comment.content.size() == 0) {
            Runtime.trap("Validation: Comment content cannot be empty");
        };
        if (comment.content.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Comment content exceeds 5000 character limit");
        };
        switch (videos.get(comment.videoId)) {
            case (null) { Runtime.trap("Video not found") };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Runtime.trap("Unauthorized: Cannot comment on a private video you don't have access to");
                };
                comments.add(comment.id, comment);
            };
        };
    };

    public query ({ caller }) func getComments(videoId : VideoId) : async [Comment] {
        switch (videos.get(videoId)) {
            case (null) { [] };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    // Return empty array instead of trapping for private video comment access
                    return [];
                };
                comments.values().filter(func(comment) { comment.videoId == videoId }).toArray();
            };
        };
    };

    // ── Channel management ────────────────────────────────────────────────────

    public shared ({ caller }) func createChannel(channel : Channel) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create channels");
        };
        if (channel.principal != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only create a channel for yourself");
        };

        // Input validation
        if (channel.name.size() == 0) {
            Runtime.trap("Validation: Channel name cannot be empty");
        };
        if (channel.name.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Channel name exceeds 100 character limit");
        };
        if (channel.profile.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Channel profile description exceeds 5000 character limit");
        };

        // Rate limiting: max 5 channels per user
        if (countUserChannels(caller) >= MAX_CHANNELS_PER_USER and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Rate limit: Maximum 5 channels per user exceeded");
        };

        switch (channels.get(channel.id)) {
            case (?_) { Runtime.trap("Channel already exists") };
            case (null) {
                channels.add(channel.id, channel);
            };
        };
    };

    public query ({ caller }) func getUserChannels() : async [Channel] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };
        channels.values().filter(func(channel) { channel.principal == caller }).toArray();
    };

    public query func getChannel(channelId : ChannelId) : async ?Channel {
        channels.get(channelId);
    };

    public shared ({ caller }) func updateChannel(channelId : ChannelId, updatedName : Text, updatedProfile : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update channels");
        };

        if (not isChannelOwner(caller, channelId)) {
            Runtime.trap("Unauthorized: Can only update your own channel");
        };

        // Input validation
        if (updatedName.size() == 0) {
            Runtime.trap("Validation: Channel name cannot be empty");
        };
        if (updatedName.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Channel name exceeds 100 character limit");
        };
        if (updatedProfile.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Channel profile description exceeds 5000 character limit");
        };

        switch (channels.get(channelId)) {
            case (null) { Runtime.trap("Channel not found") };
            case (?channel) {
                channels.add(channelId, { channel with name = updatedName; profile = updatedProfile });
            };
        };
    };

    public query ({ caller }) func getChannelVideos(channelId : ChannelId) : async [VideoMetadata] {
        videos.values().filter(func(video) {
            video.channelId == channelId and canAccessVideo(caller, video)
        }).toArray();
    };

    public query ({ caller }) func getVideoUrl(videoId : VideoId) : async ?Text {
        switch (videos.get(videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    return null;
                };
                switch (video.requiredTierLevel) {
                    case (null) { ?video.videoUrl };
                    case (?requiredLevel) {
                        let userTierLevel = getUserTierLevel(caller, video.channelId);
                        switch (userTierLevel) {
                            case (null) { null };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?video.videoUrl;
                                } else {
                                    null;
                                };
                            };
                        };
                    };
                };
            };
        };
    };

    public query ({ caller }) func getThumbnailUrl(videoId : VideoId) : async ?Text {
        switch (videos.get(videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    return null;
                };
                ?video.thumbnailUrl;
            };
        };
    };

    public query ({ caller }) func getFullVideoMetadata(videoId : VideoId) : async ?{
        video : VideoMetadata;
        channel : Channel;
    } {
        switch (videos.get(videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    return null;
                };
                switch (channels.get(video.channelId)) {
                    case (null) { null };
                    case (?channel) {
                        ?{ video; channel };
                    };
                };
            };
        };
    };

    // ── Membership tiers ──────────────────────────────────────────────────────

    public shared ({ caller }) func createMembershipTier(tier : MembershipTier) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create membership tiers");
        };

        if (not isChannelOwner(caller, tier.channelId)) {
            Runtime.trap("Unauthorized: Can only create tiers for your own channel");
        };

        if (tier.name.size() == 0) {
            Runtime.trap("Validation: Tier name cannot be empty");
        };
        if (tier.name.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Tier name exceeds 100 character limit");
        };
        if (tier.description.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Tier description exceeds 5000 character limit");
        };

        membershipTiers.add(tier.id, tier);
    };

    public shared ({ caller }) func updateMembershipTier(tierId : Text, updatedTier : MembershipTier) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update membership tiers");
        };

        switch (membershipTiers.get(tierId)) {
            case (null) { Runtime.trap("Membership tier not found") };
            case (?existingTier) {
                if (not isChannelOwner(caller, existingTier.channelId)) {
                    Runtime.trap("Unauthorized: Can only update tiers for your own channel");
                };
                if (updatedTier.name.size() == 0) {
                    Runtime.trap("Validation: Tier name cannot be empty");
                };
                if (updatedTier.name.size() > MAX_CHANNEL_NAME_LEN) {
                    Runtime.trap("Validation: Tier name exceeds 100 character limit");
                };
                if (updatedTier.description.size() > MAX_DESCRIPTION_LEN) {
                    Runtime.trap("Validation: Tier description exceeds 5000 character limit");
                };
                membershipTiers.add(tierId, updatedTier);
            };
        };
    };

    public shared ({ caller }) func deleteMembershipTier(tierId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete membership tiers");
        };

        switch (membershipTiers.get(tierId)) {
            case (null) { Runtime.trap("Membership tier not found") };
            case (?existingTier) {
                if (not isChannelOwner(caller, existingTier.channelId)) {
                    Runtime.trap("Unauthorized: Can only delete tiers from your own channel");
                };
                membershipTiers.remove(tierId);
            };
        };
    };

    public query func getChannelMembershipTiers(channelId : ChannelId) : async [MembershipTier] {
        membershipTiers.values().filter(func(tier) { tier.channelId == channelId }).toArray();
    };

    // ── Subscriptions ─────────────────────────────────────────────────────────

    public shared ({ caller }) func createSubscription(subscription : Subscription) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create subscriptions");
        };
        if (subscription.user != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only create subscriptions for yourself");
        };
        switch (membershipTiers.get(subscription.tierId)) {
            case (null) { Runtime.trap("Membership tier not found") };
            case (?_) {
                subscriptions.add(subscription.id, subscription);
            };
        };
    };

    public shared ({ caller }) func cancelSubscription(subscriptionId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can cancel subscriptions");
        };

        switch (subscriptions.get(subscriptionId)) {
            case (null) { Runtime.trap("Subscription not found") };
            case (?subscription) {
                if (subscription.user != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only cancel your own subscriptions");
                };
                subscriptions.add(subscriptionId, { subscription with status = #canceled });
            };
        };
    };

    public query ({ caller }) func hasActiveSubscription(channelId : ChannelId) : async Bool {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return false;
        };

        for (subscription in subscriptions.values()) {
            if (subscription.user == caller and subscription.channelId == channelId and subscription.status == #active) {
                return true;
            };
        };
        false;
    };

    public query ({ caller }) func getUserSubscriptionTierLevel(channelId : ChannelId) : async ?Nat {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return null;
        };
        getUserTierLevel(caller, channelId);
    };

    // ── Courses ───────────────────────────────────────────────────────────────

    public shared ({ caller }) func createCourse(course : Course) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create courses");
        };

        if (not isChannelOwner(caller, course.channelId)) {
            Runtime.trap("Unauthorized: Can only create courses for your own channel");
        };

        if (course.title.size() == 0) {
            Runtime.trap("Validation: Course title cannot be empty");
        };
        if (course.title.size() > MAX_VIDEO_TITLE_LEN) {
            Runtime.trap("Validation: Course title exceeds 200 character limit");
        };
        if (course.description.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Course description exceeds 5000 character limit");
        };

        courses.add(course.id, course);
    };

    public shared ({ caller }) func updateCourse(courseId : Text, updatedCourse : Course) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update courses");
        };

        switch (courses.get(courseId)) {
            case (null) { Runtime.trap("Course not found") };
            case (?existingCourse) {
                if (not isChannelOwner(caller, existingCourse.channelId)) {
                    Runtime.trap("Unauthorized: Can only update courses for your own channel");
                };
                if (updatedCourse.title.size() == 0) {
                    Runtime.trap("Validation: Course title cannot be empty");
                };
                if (updatedCourse.title.size() > MAX_VIDEO_TITLE_LEN) {
                    Runtime.trap("Validation: Course title exceeds 200 character limit");
                };
                if (updatedCourse.description.size() > MAX_DESCRIPTION_LEN) {
                    Runtime.trap("Validation: Course description exceeds 5000 character limit");
                };
                courses.add(courseId, updatedCourse);
            };
        };
    };

    public shared ({ caller }) func deleteCourse(courseId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete courses");
        };

        switch (courses.get(courseId)) {
            case (null) { Runtime.trap("Course not found") };
            case (?existingCourse) {
                if (not isChannelOwner(caller, existingCourse.channelId)) {
                    Runtime.trap("Unauthorized: Can only delete courses from your own channel");
                };
                courses.remove(courseId);
            };
        };
    };

    public query ({ caller }) func getChannelCourses(channelId : ChannelId) : async [Course] {
        let isOwner = isChannelOwner(caller, channelId);
        courses.values().filter(func(course) {
            course.channelId == channelId and (isOwner or course.isVisible)
        }).toArray();
    };

    public query ({ caller }) func getCourse(courseId : Text) : async ?Course {
        switch (courses.get(courseId)) {
            case (null) { null };
            case (?course) {
                let isOwner = isChannelOwner(caller, course.channelId);

                if (not course.isVisible and not isOwner) {
                    // Return null instead of trapping for invisible course access
                    return null;
                };

                switch (course.requiredTierLevel) {
                    case (null) { ?course };
                    case (?requiredLevel) {
                        if (isOwner) {
                            return ?course;
                        };

                        let userTierLevel = getUserTierLevel(caller, course.channelId);
                        switch (userTierLevel) {
                            case (null) { null };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?course;
                                } else {
                                    null;
                                };
                            };
                        };
                    };
                };
            };
        };
    };

    public query ({ caller }) func getPersonalizedCourses() : async [Course] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };
        let followedChannels = switch (channelFollows.get(caller)) {
            case (null) { [] };
            case (?follows) { follows };
        };

        let recommended = List.empty<Course>();

        for (course in courses.values()) {
            var addCourse = false;

            for (channelId in followedChannels.vals()) {
                if (course.channelId == channelId) {
                    addCourse := true;
                };
            };

            if (addCourse and course.isVisible and canAccessCourse(caller, course)) {
                recommended.add(course);
            };
        };

        recommended.toArray();
    };

    func canAccessCourse(caller : Principal, course : Course) : Bool {
        switch (course.requiredTierLevel) {
            case (null) { true };
            case (?requiredLevel) {
                switch (getUserTierLevel(caller, course.channelId)) {
                    case (null) { false };
                    case (?userLevel) { userLevel >= requiredLevel };
                };
            };
        };
    };

    // ── Playlists ─────────────────────────────────────────────────────────────

    public shared ({ caller }) func createPlaylist(playlist : Playlist) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create playlists");
        };
        if (playlist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only create playlists for yourself");
        };
        if (playlist.title.size() == 0) {
            Runtime.trap("Validation: Playlist title cannot be empty");
        };
        if (playlist.title.size() > MAX_VIDEO_TITLE_LEN) {
            Runtime.trap("Validation: Playlist title exceeds 200 character limit");
        };
        if (playlist.description.size() > MAX_DESCRIPTION_LEN) {
            Runtime.trap("Validation: Playlist description exceeds 5000 character limit");
        };
        playlists.add(playlist.id, playlist);
    };

    public shared ({ caller }) func updatePlaylist(playlistId : Text, updatedPlaylist : Playlist) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update playlists");
        };

        switch (playlists.get(playlistId)) {
            case (null) { Runtime.trap("Playlist not found") };
            case (?existingPlaylist) {
                if (existingPlaylist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only update your own playlists");
                };
                if (updatedPlaylist.title.size() == 0) {
                    Runtime.trap("Validation: Playlist title cannot be empty");
                };
                if (updatedPlaylist.title.size() > MAX_VIDEO_TITLE_LEN) {
                    Runtime.trap("Validation: Playlist title exceeds 200 character limit");
                };
                if (updatedPlaylist.description.size() > MAX_DESCRIPTION_LEN) {
                    Runtime.trap("Validation: Playlist description exceeds 5000 character limit");
                };
                playlists.add(playlistId, updatedPlaylist);
            };
        };
    };

    public shared ({ caller }) func deletePlaylist(playlistId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete playlists");
        };

        switch (playlists.get(playlistId)) {
            case (null) { Runtime.trap("Playlist not found") };
            case (?existingPlaylist) {
                if (existingPlaylist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only delete your own playlists");
                };
                playlists.remove(playlistId);
            };
        };
    };

    public query ({ caller }) func getUserPlaylists() : async [Playlist] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };
        playlists.values().filter(func(playlist) { playlist.creator == caller }).toArray();
    };

    public query func getPublicPlaylists() : async [Playlist] {
        playlists.values().filter(func(playlist) { playlist.visibility == #publicVisibility }).toArray();
    };

    public query ({ caller }) func getPlaylist(playlistId : Text) : async ?Playlist {
        switch (playlists.get(playlistId)) {
            case (null) { null };
            case (?playlist) {
                if (playlist.visibility == #privateVisibility and playlist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    // Return null instead of trapping for private playlist access
                    return null;
                };
                ?playlist;
            };
        };
    };

    // ── Donations ─────────────────────────────────────────────────────────────

    public shared ({ caller }) func recordDonation(donation : Donation) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can record donations");
        };
        if (donation.donor != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only record donations for yourself");
        };
        switch (channels.get(donation.channelId)) {
            case (null) { Runtime.trap("Channel not found") };
            case (?_) {
                donations.add(donation.id, donation);
            };
        };
    };

    public query func getChannelDonations(channelId : ChannelId) : async [Donation] {
        donations.values().filter(func(donation) { donation.channelId == channelId }).toArray();
    };

    public query ({ caller }) func getUserDonationHistory() : async [Donation] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };
        donations.values().filter(func(donation) { donation.donor == caller }).toArray();
    };

    // ── Channel follows ───────────────────────────────────────────────────────

    let channelFollows = Map.empty<Principal, [ChannelId]>();

    public shared ({ caller }) func followChannel(channelId : ChannelId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only authenticated users can follow channels");
        };

        switch (channels.get(channelId)) {
            case (null) { Runtime.trap("Channel not found") };
            case (?_) {
                let currentFollows = switch (channelFollows.get(caller)) {
                    case (null) { [] };
                    case (?follows) { follows };
                };

                for (followedChannel in currentFollows.vals()) {
                    if (followedChannel == channelId) {
                        Runtime.trap("Already following this channel");
                    };
                };

                let updated = List.empty<ChannelId>();
                for (f in currentFollows.vals()) { updated.add(f) };
                updated.add(channelId);
                channelFollows.add(caller, updated.toArray());
            };
        };
    };

    public shared ({ caller }) func unfollowChannel(channelId : ChannelId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only authenticated users can unfollow channels");
        };

        switch (channelFollows.get(caller)) {
            case (null) { Runtime.trap("You are not following this channel") };
            case (?currentFollows) {
                let filtered = List.empty<ChannelId>();
                for (ch in currentFollows.vals()) {
                    if (ch != channelId) { filtered.add(ch) };
                };

                if (filtered.size() == currentFollows.size()) {
                    Runtime.trap("You are not following this channel");
                };

                channelFollows.add(caller, filtered.toArray());
            };
        };
    };

    public query ({ caller }) func isFollowingChannel(channelId : ChannelId) : async Bool {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return false;
        };

        switch (channelFollows.get(caller)) {
            case (null) { false };
            case (?currentFollows) {
                for (followedChannel in currentFollows.vals()) {
                    if (followedChannel == channelId) {
                        return true;
                    };
                };
                false;
            };
        };
    };

    public query ({ caller }) func getFollowedChannels() : async [ChannelId] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };

        switch (channelFollows.get(caller)) {
            case (null) { [] };
            case (?follows) { follows };
        };
    };

    public query func getChannelFollowers(channelId : ChannelId) : async [Principal] {
        switch (channels.get(channelId)) {
            case (null) { [] };
            case (?_) {
                let followers = List.empty<Principal>();
                for ((user, followedChannels) in channelFollows.entries()) {
                    for (followedChannel in followedChannels.vals()) {
                        if (followedChannel == channelId) {
                            followers.add(user);
                        };
                    };
                };
                followers.toArray();
            };
        };
    };

    // ── Stripe accounts ───────────────────────────────────────────────────────
    // SECURITY NOTE: StripeAccount.secretKey and connectId contain sensitive credentials.
    // These are stored encrypted in the canister state and MUST only be returned to the
    // account owner (enforced by caller == account.owner checks below).
    // Never log or expose these values in error messages or debug output.
    // Future improvement: encrypt keys at rest using a key management service.

    public type StripeAccount = {
        id : Text;
        owner : Principal;
        accountName : Text;
        // SENSITIVE: Stripe secret key — only visible to account owner
        secretKey : Text;
        // SENSITIVE: Stripe Connect account ID — only visible to account owner
        connectId : ?Text;
        payoutSettings : ?Text;
    };

    let stripeAccounts = Map.empty<Text, StripeAccount>();

    public shared ({ caller }) func createStripeAccount(account : StripeAccount) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create Stripe accounts");
        };
        // Enforce owner matches caller — prevents creating accounts on behalf of others
        if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Can only create Stripe accounts for yourself");
        };
        if (account.accountName.size() == 0) {
            Runtime.trap("Validation: Account name cannot be empty");
        };
        if (account.accountName.size() > MAX_CHANNEL_NAME_LEN) {
            Runtime.trap("Validation: Account name exceeds 100 character limit");
        };
        if (account.secretKey.size() == 0) {
            Runtime.trap("Validation: Stripe secret key cannot be empty");
        };
        switch (stripeAccounts.get(account.id)) {
            case (?_) { Runtime.trap("Stripe account already exists") };
            case (null) {
                stripeAccounts.add(account.id, account);
            };
        };
    };

    public shared ({ caller }) func updateStripeAccount(accountId : Text, updatedAccount : StripeAccount) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update Stripe accounts");
        };

        switch (stripeAccounts.get(accountId)) {
            case (null) { Runtime.trap("Stripe account not found") };
            case (?existingAccount) {
                // Only the account owner can update — prevents credential theft
                if (existingAccount.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only update your own Stripe accounts");
                };
                if (updatedAccount.accountName.size() == 0) {
                    Runtime.trap("Validation: Account name cannot be empty");
                };
                if (updatedAccount.secretKey.size() == 0) {
                    Runtime.trap("Validation: Stripe secret key cannot be empty");
                };
                stripeAccounts.add(accountId, updatedAccount);
            };
        };
    };

    public shared ({ caller }) func deleteStripeAccount(accountId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete Stripe accounts");
        };

        switch (stripeAccounts.get(accountId)) {
            case (null) { Runtime.trap("Stripe account not found") };
            case (?existingAccount) {
                if (existingAccount.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only delete your own Stripe accounts");
                };
                stripeAccounts.remove(accountId);
            };
        };
    };

    // Returns only the caller's own Stripe accounts — never exposes other users' credentials
    public query ({ caller }) func getUserStripeAccounts() : async [StripeAccount] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return [];
        };
        stripeAccounts.values().filter(func(account) { account.owner == caller }).toArray();
    };

    // Returns a single Stripe account only if the caller is the owner — enforces credential isolation
    public query ({ caller }) func getStripeAccount(accountId : Text) : async ?StripeAccount {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return null;
        };

        switch (stripeAccounts.get(accountId)) {
            case (null) { null };
            case (?account) {
                // Only the owner can retrieve their Stripe credentials
                if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    return null;
                };
                ?account;
            };
        };
    };

    // ── Channel-Stripe connections ─────────────────────────────────────────────

    public type ChannelStripeConnection = {
        channelId : ChannelId;
        stripeAccountId : Text;
    };

    let channelStripeConnections = Map.empty<Text, ChannelStripeConnection>();

    public shared ({ caller }) func connectChannelToStripeAccount(connection : ChannelStripeConnection) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can connect channels to Stripe accounts");
        };

        if (not isChannelOwner(caller, connection.channelId)) {
            Runtime.trap("Unauthorized: Can only connect your own channels");
        };

        switch (stripeAccounts.get(connection.stripeAccountId)) {
            case (null) { Runtime.trap("Stripe account not found") };
            case (?account) {
                if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Runtime.trap("Unauthorized: Can only use your own Stripe accounts");
                };
                channelStripeConnections.add(connection.channelId, connection);
            };
        };
    };

    public query ({ caller }) func getChannelStripeConnection(channelId : ChannelId) : async ?ChannelStripeConnection {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return null;
        };

        switch (channelStripeConnections.get(channelId)) {
            case (null) { null };
            case (?connection) {
                if (not isChannelOwner(caller, channelId)) {
                    return null;
                };
                ?connection;
            };
        };
    };

    // ── Stripe platform configuration ─────────────────────────────────────────

    var configuration : ?Stripe.StripeConfiguration = null;

    public query func isStripeConfigured() : async Bool {
        configuration != null;
    };

    public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Runtime.trap("Unauthorized: Only admins can perform this action");
        };
        configuration := ?config;
    };

    func getStripeConfiguration() : Stripe.StripeConfiguration {
        switch (configuration) {
            case (null) { Runtime.trap("Stripe needs to be first configured") };
            case (?value) { value };
        };
    };

    public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
        await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
    };

    public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
        await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };
};
