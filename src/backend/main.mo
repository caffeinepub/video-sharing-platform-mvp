import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import List "mo:base/List";

import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";

import Migration "migration";

// Apply data migration
(with migration = Migration.run)
actor {
    let accessControlState = AccessControl.initState();

    public shared ({ caller }) func initializeAccessControl() : async () {
        AccessControl.initialize(accessControlState, caller);
    };

    public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
        AccessControl.getUserRole(accessControlState, caller);
    };

    public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
        AccessControl.assignRole(accessControlState, caller, user, role);
    };

    public query ({ caller }) func isCallerAdmin() : async Bool {
        AccessControl.isAdmin(accessControlState, caller);
    };

    public type UserProfile = {
        name : Text;
    };

    transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    var userProfiles = principalMap.empty<UserProfile>();

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view profiles");
        };
        principalMap.get(userProfiles, caller);
    };

    public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
        if (caller != user and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only view your own profile");
        };
        principalMap.get(userProfiles, user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can save profiles");
        };
        userProfiles := principalMap.put(userProfiles, caller, profile);
    };

    public shared ({ caller }) func updateCallerUserProfile(updatedProfile : UserProfile) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update profiles");
        };
        switch (principalMap.get(userProfiles, caller)) {
            case (null) { Debug.trap("Profile not found") };
            case (?_) {
                userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
            };
        };
    };

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

    let storage = Storage.new();
    include MixinStorage(storage);

    transient let textMap = OrderedMap.Make<Text>(Text.compare);

    var videos = textMap.empty<VideoMetadata>();
    var comments = textMap.empty<Comment>();
    var channels = textMap.empty<Channel>();
    var membershipTiers = textMap.empty<MembershipTier>();
    var subscriptions = textMap.empty<Subscription>();
    var courses = textMap.empty<Course>();
    var playlists = textMap.empty<Playlist>();
    var donations = textMap.empty<Donation>();

    func getUserTierLevel(user : Principal, channelId : ChannelId) : ?Nat {
        let activeSubscriptions = Iter.filter(
            textMap.vals(subscriptions),
            func(subscription : Subscription) : Bool {
                subscription.user == user and subscription.channelId == channelId and subscription.status == #active;
            },
        );

        for (subscription in activeSubscriptions) {
            return switch (textMap.get(membershipTiers, subscription.tierId)) {
                case (null) { null };
                case (?tier) { ?tier.tierLevel };
            };
        };
        null;
    };

    func hasAccessToPrivateVideo(user : Principal, video : VideoMetadata) : Bool {
        let coursesWithVideo = Iter.filter(
            textMap.vals(courses),
            func(course : Course) : Bool {
                for (courseVideoId in course.videoIds.vals()) {
                    if (courseVideoId == video.id) {
                        return true;
                    };
                };
                false;
            },
        );

        for (course in coursesWithVideo) {
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
        false;
    };

    func canAccessVideo(caller : Principal, video : VideoMetadata) : Bool {
        if (not video.isPrivate) {
            return true;
        };

        switch (textMap.get(channels, video.channelId)) {
            case (null) { false };
            case (?channel) {
                channel.principal == caller or AccessControl.isAdmin(accessControlState, caller) or hasAccessToPrivateVideo(caller, video);
            };
        };
    };

    func isChannelOwner(caller : Principal, channelId : ChannelId) : Bool {
        switch (textMap.get(channels, channelId)) {
            case (null) { false };
            case (?channel) {
                channel.principal == caller or AccessControl.isAdmin(accessControlState, caller);
            };
        };
    };

    public shared ({ caller }) func toggleVideoPrivacy(videoId : VideoId) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            Debug.trap("Unauthorized: Only users can toggle video privacy");
        };

        let existingVideo = textMap.get(videos, videoId);
        switch (existingVideo) {
            case (null) {
                Debug.trap("Video not found");
            };
            case (?video) {
                if (not isChannelOwner(caller, video.channelId)) {
                    Debug.trap("Unauthorized: Only video owners or admin can toggle video privacy");
                };
                let updatedVideo = {
                    video with
                    isPrivate = not video.isPrivate;
                };
                videos := textMap.put(videos, videoId, updatedVideo);
            };
        };
    };

    public shared ({ caller }) func updateVideo(videoId : VideoId, updatedMetadata : VideoMetadata) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update videos");
        };

        switch (textMap.get(videos, videoId)) {
            case (null) { Debug.trap("Video not found") };
            case (?existingVideo) {
                if (not isChannelOwner(caller, existingVideo.channelId)) {
                    Debug.trap("Unauthorized: Can only update videos from your own channel");
                };

                let updatedVideo = {
                    existingVideo with
                    title = updatedMetadata.title;
                    description = updatedMetadata.description;
                    category = updatedMetadata.category;
                    requiredTierLevel = updatedMetadata.requiredTierLevel;
                    thumbnailUrl = updatedMetadata.thumbnailUrl;
                    isPrivate = updatedMetadata.isPrivate;
                };
                videos := textMap.put(videos, videoId, updatedVideo);
            };
        };
    };

    public shared ({ caller }) func deleteVideo(videoId : VideoId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can delete videos");
        };

        switch (textMap.get(videos, videoId)) {
            case (null) { Debug.trap("Video not found") };
            case (?existingVideo) {
                if (not isChannelOwner(caller, existingVideo.channelId)) {
                    Debug.trap("Unauthorized: Can only delete videos from your own channel");
                };

                videos := textMap.delete(videos, videoId);
            };
        };
    };

    public shared ({ caller }) func uploadVideo(metadata : VideoMetadata) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can upload videos");
        };
        
        if (not isChannelOwner(caller, metadata.channelId)) {
            Debug.trap("Unauthorized: Can only upload videos to your own channel");
        };
        
        videos := textMap.put(videos, metadata.id, metadata);
    };

    public query ({ caller }) func getVideo(videoId : VideoId) : async ?VideoMetadata {
        switch (textMap.get(videos, videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Private video access denied");
                };
                return ?video;
            };
        };
    };

    public query ({ caller }) func getVideoAuthenticated(videoId : VideoId) : async ?VideoMetadata {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can access authenticated video endpoint");
        };

        switch (textMap.get(videos, videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Private video access denied");
                };
                switch (video.requiredTierLevel) {
                    case (null) { ?video };
                    case (?requiredLevel) {
                        let userTierLevel = getUserTierLevel(caller, video.channelId);
                        switch (userTierLevel) {
                            case (null) {
                                Debug.trap("Unauthorized: This video requires a membership subscription");
                            };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?video;
                                } else {
                                    Debug.trap("Unauthorized: Your membership tier is insufficient for this video");
                                };
                            };
                        };
                    };
                };
            };
        };
    };

    public query ({ caller }) func getVideosByCategory(category : Category) : async [VideoMetadata] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(videos),
                func(video : VideoMetadata) : Bool {
                    video.category == category and canAccessVideo(caller, video);
                },
            )
        );
    };

    public query ({ caller }) func searchVideos(searchTerm : Text) : async [VideoMetadata] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(videos),
                func(video : VideoMetadata) : Bool {
                    (Text.contains(Text.toLowercase(video.title), #text(Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(video.description), #text(Text.toLowercase(searchTerm)))) and canAccessVideo(caller, video);
                },
            )
        );
    };

    public shared ({ caller }) func likeVideo(videoId : VideoId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can like videos");
        };
        switch (textMap.get(videos, videoId)) {
            case (null) { Debug.trap("Video not found") };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Cannot like a private video you don't have access to");
                };
                let updatedVideo = {
                    video with
                    likeCount = video.likeCount + 1;
                };
                videos := textMap.put(videos, videoId, updatedVideo);
            };
        };
    };

    public shared ({ caller }) func addComment(comment : Comment) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can add comments");
        };
        if (comment.author != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only add comments as yourself");
        };
        switch (textMap.get(videos, comment.videoId)) {
            case (null) { Debug.trap("Video not found") };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Cannot comment on a private video you don't have access to");
                };
                comments := textMap.put(comments, comment.id, comment);
            };
        };
    };

    public query ({ caller }) func getComments(videoId : VideoId) : async [Comment] {
        switch (textMap.get(videos, videoId)) {
            case (null) { [] };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Cannot view comments on a private video you don't have access to");
                };
                Iter.toArray(
                    Iter.filter(
                        textMap.vals(comments),
                        func(comment : Comment) : Bool {
                            comment.videoId == videoId;
                        },
                    )
                );
            };
        };
    };

    public shared ({ caller }) func createChannel(channel : Channel) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create channels");
        };
        if (channel.principal != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only create a channel for yourself");
        };
        let existingChannel = textMap.get(channels, channel.id);
        switch (existingChannel) {
            case (?_) { Debug.trap("Channel already exists") };
            case (null) {
                channels := textMap.put(channels, channel.id, channel);
            };
        };
    };

    public query ({ caller }) func getUserChannels() : async [Channel] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view their channels");
        };
        Iter.toArray(
            Iter.filter(
                textMap.vals(channels),
                func(channel : Channel) : Bool {
                    channel.principal == caller;
                },
            )
        );
    };

    public query func getChannel(channelId : ChannelId) : async ?Channel {
        textMap.get(channels, channelId);
    };

    public shared ({ caller }) func updateChannel(channelId : ChannelId, updatedName : Text, updatedProfile : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update channels");
        };

        if (not isChannelOwner(caller, channelId)) {
            Debug.trap("Unauthorized: Can only update your own channel");
        };

        switch (textMap.get(channels, channelId)) {
            case (null) { Debug.trap("Channel not found") };
            case (?channel) {
                let updatedChannel = {
                    channel with
                    name = updatedName;
                    profile = updatedProfile;
                };
                channels := textMap.put(channels, channelId, updatedChannel);
            };
        };
    };

    public query ({ caller }) func getChannelVideos(channelId : ChannelId) : async [VideoMetadata] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(videos),
                func(video : VideoMetadata) : Bool {
                    video.channelId == channelId and canAccessVideo(caller, video);
                },
            )
        );
    };

    public query ({ caller }) func getVideoUrl(videoId : VideoId) : async ?Text {
        switch (textMap.get(videos, videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Cannot access URL of a private video you don't have access to");
                };
                switch (video.requiredTierLevel) {
                    case (null) { ?video.videoUrl };
                    case (?requiredLevel) {
                        let userTierLevel = getUserTierLevel(caller, video.channelId);
                        switch (userTierLevel) {
                            case (null) {
                                Debug.trap("Unauthorized: This video requires a membership subscription");
                            };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?video.videoUrl;
                                } else {
                                    Debug.trap("Unauthorized: Your membership tier is insufficient for this video");
                                };
                            };
                        };
                    };
                };
            };
        };
    };

    public query ({ caller }) func getThumbnailUrl(videoId : VideoId) : async ?Text {
        switch (textMap.get(videos, videoId)) {
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
        switch (textMap.get(videos, videoId)) {
            case (null) { null };
            case (?video) {
                if (not canAccessVideo(caller, video)) {
                    Debug.trap("Unauthorized: Cannot access metadata of a private video you don't have access to");
                };
                switch (textMap.get(channels, video.channelId)) {
                    case (null) { null };
                    case (?channel) {
                        ?{
                            video;
                            channel;
                        };
                    };
                };
            };
        };
    };

    public shared ({ caller }) func createMembershipTier(tier : MembershipTier) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create membership tiers");
        };

        if (not isChannelOwner(caller, tier.channelId)) {
            Debug.trap("Unauthorized: Can only create tiers for your own channel");
        };
        
        membershipTiers := textMap.put(membershipTiers, tier.id, tier);
    };

    public shared ({ caller }) func updateMembershipTier(tierId : Text, updatedTier : MembershipTier) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update membership tiers");
        };

        switch (textMap.get(membershipTiers, tierId)) {
            case (null) { Debug.trap("Membership tier not found") };
            case (?existingTier) {
                if (not isChannelOwner(caller, existingTier.channelId)) {
                    Debug.trap("Unauthorized: Can only update tiers for your own channel");
                };
                membershipTiers := textMap.put(membershipTiers, tierId, updatedTier);
            };
        };
    };

    public shared ({ caller }) func deleteMembershipTier(tierId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can delete membership tiers");
        };

        switch (textMap.get(membershipTiers, tierId)) {
            case (null) { Debug.trap("Membership tier not found") };
            case (?existingTier) {
                if (not isChannelOwner(caller, existingTier.channelId)) {
                    Debug.trap("Unauthorized: Can only delete tiers from your own channel");
                };
                membershipTiers := textMap.delete(membershipTiers, tierId);
            };
        };
    };

    public query func getChannelMembershipTiers(channelId : ChannelId) : async [MembershipTier] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(membershipTiers),
                func(tier : MembershipTier) : Bool {
                    tier.channelId == channelId;
                },
            )
        );
    };

    public shared ({ caller }) func createSubscription(subscription : Subscription) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create subscriptions");
        };
        if (subscription.user != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only create subscriptions for yourself");
        };
        switch (textMap.get(membershipTiers, subscription.tierId)) {
            case (null) { Debug.trap("Membership tier not found") };
            case (?_) {
                subscriptions := textMap.put(subscriptions, subscription.id, subscription);
            };
        };
    };

    public shared ({ caller }) func cancelSubscription(subscriptionId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can cancel subscriptions");
        };

        switch (textMap.get(subscriptions, subscriptionId)) {
            case (null) { Debug.trap("Subscription not found") };
            case (?subscription) {
                if (subscription.user != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only cancel your own subscriptions");
                };

                let canceledSubscription = {
                    subscription with
                    status = #canceled;
                };
                subscriptions := textMap.put(subscriptions, subscriptionId, canceledSubscription);
            };
        };
    };

    public query ({ caller }) func hasActiveSubscription(channelId : ChannelId) : async Bool {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can check subscription status");
        };

        let activeSubscriptions = Iter.filter(
            textMap.vals(subscriptions),
            func(subscription : Subscription) : Bool {
                subscription.user == caller and subscription.channelId == channelId and subscription.status == #active;
            },
        );

        for (_subscription in activeSubscriptions) {
            return true;
        };
        false;
    };

    public query ({ caller }) func getUserSubscriptionTierLevel(channelId : ChannelId) : async ?Nat {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can check their subscription tier level");
        };
        getUserTierLevel(caller, channelId);
    };

    public shared ({ caller }) func createCourse(course : Course) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create courses");
        };

        if (not isChannelOwner(caller, course.channelId)) {
            Debug.trap("Unauthorized: Can only create courses for your own channel");
        };
        
        courses := textMap.put(courses, course.id, course);
    };

    public shared ({ caller }) func updateCourse(courseId : Text, updatedCourse : Course) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update courses");
        };

        switch (textMap.get(courses, courseId)) {
            case (null) { Debug.trap("Course not found") };
            case (?existingCourse) {
                if (not isChannelOwner(caller, existingCourse.channelId)) {
                    Debug.trap("Unauthorized: Can only update courses for your own channel");
                };
                courses := textMap.put(courses, courseId, updatedCourse);
            };
        };
    };

    public shared ({ caller }) func deleteCourse(courseId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can delete courses");
        };

        switch (textMap.get(courses, courseId)) {
            case (null) { Debug.trap("Course not found") };
            case (?existingCourse) {
                if (not isChannelOwner(caller, existingCourse.channelId)) {
                    Debug.trap("Unauthorized: Can only delete courses from your own channel");
                };
                courses := textMap.delete(courses, courseId);
            };
        };
    };

    public query ({ caller }) func getChannelCourses(channelId : ChannelId) : async [Course] {
        let isOwner = isChannelOwner(caller, channelId);
        
        Iter.toArray(
            Iter.filter(
                textMap.vals(courses),
                func(course : Course) : Bool {
                    course.channelId == channelId and (isOwner or course.isVisible);
                },
            )
        );
    };

    public query ({ caller }) func getCourse(courseId : Text) : async ?Course {
        switch (textMap.get(courses, courseId)) {
            case (null) { null };
            case (?course) {
                let isOwner = isChannelOwner(caller, course.channelId);
                
                if (not course.isVisible and not isOwner) {
                    Debug.trap("Unauthorized: This course is not visible");
                };
                
                switch (course.requiredTierLevel) {
                    case (null) { ?course };
                    case (?requiredLevel) {
                        if (isOwner) {
                            return ?course;
                        };
                        
                        let userTierLevel = getUserTierLevel(caller, course.channelId);
                        switch (userTierLevel) {
                            case (null) {
                                Debug.trap("This course requires a membership subscription");
                            };
                            case (?userLevel) {
                                if (userLevel >= requiredLevel) {
                                    ?course;
                                } else {
                                    Debug.trap("Your membership tier is insufficient for this course");
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
            Debug.trap("Unauthorized: Only users can get personalized recommendations");
        };
        let followedChannels = switch (principalMap.get(channelFollows, caller)) {
            case (null) { [] };
            case (?follows) { follows };
        };

        var recommendedCoursesList = List.nil<Course>();

        for (course in textMap.vals(courses)) {
            var addCourse = false;

            for (channelId in followedChannels.vals()) {
                if (course.channelId == channelId) {
                    addCourse := true;
                };
            };

            if (addCourse and course.isVisible and canAccessCourse(caller, course)) {
                recommendedCoursesList := List.push(course, recommendedCoursesList);
            };
        };

        List.toArray(recommendedCoursesList);
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

    public shared ({ caller }) func createPlaylist(playlist : Playlist) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create playlists");
        };
        if (playlist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only create playlists for yourself");
        };
        playlists := textMap.put(playlists, playlist.id, playlist);
    };

    public shared ({ caller }) func updatePlaylist(playlistId : Text, updatedPlaylist : Playlist) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update playlists");
        };

        switch (textMap.get(playlists, playlistId)) {
            case (null) { Debug.trap("Playlist not found") };
            case (?existingPlaylist) {
                if (existingPlaylist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only update your own playlists");
                };
                playlists := textMap.put(playlists, playlistId, updatedPlaylist);
            };
        };
    };

    public shared ({ caller }) func deletePlaylist(playlistId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can delete playlists");
        };

        switch (textMap.get(playlists, playlistId)) {
            case (null) { Debug.trap("Playlist not found") };
            case (?existingPlaylist) {
                if (existingPlaylist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only delete your own playlists");
                };
                playlists := textMap.delete(playlists, playlistId);
            };
        };
    };

    public query ({ caller }) func getUserPlaylists() : async [Playlist] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view their playlists");
        };

        Iter.toArray(
            Iter.filter(
                textMap.vals(playlists),
                func(playlist : Playlist) : Bool {
                    playlist.creator == caller;
                },
            )
        );
    };

    public query func getPublicPlaylists() : async [Playlist] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(playlists),
                func(playlist : Playlist) : Bool {
                    playlist.visibility == #publicVisibility;
                },
            )
        );
    };

    public query ({ caller }) func getPlaylist(playlistId : Text) : async ?Playlist {
        switch (textMap.get(playlists, playlistId)) {
            case (null) { null };
            case (?playlist) {
                if (playlist.visibility == #privateVisibility and playlist.creator != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: This playlist is private");
                };
                ?playlist;
            };
        };
    };

    public shared ({ caller }) func recordDonation(donation : Donation) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can record donations");
        };
        if (donation.donor != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only record donations for yourself");
        };
        switch (textMap.get(channels, donation.channelId)) {
            case (null) { Debug.trap("Channel not found") };
            case (?_) {
                donations := textMap.put(donations, donation.id, donation);
            };
        };
    };

    public query func getChannelDonations(channelId : ChannelId) : async [Donation] {
        Iter.toArray(
            Iter.filter(
                textMap.vals(donations),
                func(donation : Donation) : Bool {
                    donation.channelId == channelId;
                },
            )
        );
    };

    public query ({ caller }) func getUserDonationHistory() : async [Donation] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view their donation history");
        };

        Iter.toArray(
            Iter.filter(
                textMap.vals(donations),
                func(donation : Donation) : Bool {
                    donation.donor == caller;
                },
            )
        );
    };

    var channelFollows : OrderedMap.Map<Principal, [ChannelId]> = principalMap.empty<[ChannelId]>();

    public shared ({ caller }) func followChannel(channelId : ChannelId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only authenticated users can follow channels");
        };

        switch (textMap.get(channels, channelId)) {
            case (null) { Debug.trap("Channel not found") };
            case (?_) {
                let currentFollows = switch (principalMap.get(channelFollows, caller)) {
                    case (null) { [] };
                    case (?follows) { follows };
                };

                for (followedChannel in currentFollows.vals()) {
                    if (followedChannel == channelId) {
                        Debug.trap("Already following this channel");
                    };
                };

                let updatedList = List.push(channelId, List.fromArray(currentFollows));
                channelFollows := principalMap.put(channelFollows, caller, List.toArray(updatedList));
            };
        };
    };

    public shared ({ caller }) func unfollowChannel(channelId : ChannelId) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only authenticated users can unfollow channels");
        };

        switch (principalMap.get(channelFollows, caller)) {
            case (null) { Debug.trap("You are not following this channel") };
            case (?currentFollows) {
                let filteredList = List.filter(
                    List.fromArray(currentFollows),
                    func(channel : ChannelId) : Bool {
                        channel != channelId;
                    },
                );

                if (List.size(filteredList) == currentFollows.size()) {
                    Debug.trap("You are not following this channel");
                };

                channelFollows := principalMap.put(channelFollows, caller, List.toArray(filteredList));
            };
        };
    };

    public query ({ caller }) func isFollowingChannel(channelId : ChannelId) : async Bool {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only authenticated users can check following status");
        };

        switch (principalMap.get(channelFollows, caller)) {
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
            Debug.trap("Unauthorized: Only authenticated users can view followed channels");
        };

        switch (principalMap.get(channelFollows, caller)) {
            case (null) { [] };
            case (?follows) { follows };
        };
    };

    public query func getChannelFollowers(channelId : ChannelId) : async [Principal] {
        switch (textMap.get(channels, channelId)) {
            case (null) { Debug.trap("Channel not found") };
            case (?_) {
                var followers : [Principal] = [];

                for ((user, followedChannels) in principalMap.entries(channelFollows)) {
                    for (followedChannel in followedChannels.vals()) {
                        if (followedChannel == channelId) {
                            let updatedList = List.push(user, List.fromArray(followers));
                            followers := List.toArray(updatedList);
                        };
                    };
                };

                followers;
            };
        };
    };

    public type StripeAccount = {
        id : Text;
        owner : Principal;
        accountName : Text;
        secretKey : Text;
        connectId : ?Text;
        payoutSettings : ?Text;
    };

    var stripeAccounts = textMap.empty<StripeAccount>();

    public shared ({ caller }) func createStripeAccount(account : StripeAccount) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can create Stripe accounts");
        };
        if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Debug.trap("Unauthorized: Can only create Stripe accounts for yourself");
        };
        switch (textMap.get(stripeAccounts, account.id)) {
            case (?_) { Debug.trap("Stripe account already exists") };
            case (null) {
                stripeAccounts := textMap.put(stripeAccounts, account.id, account);
            };
        };
    };

    public shared ({ caller }) func updateStripeAccount(accountId : Text, updatedAccount : StripeAccount) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can update Stripe accounts");
        };

        switch (textMap.get(stripeAccounts, accountId)) {
            case (null) { Debug.trap("Stripe account not found") };
            case (?existingAccount) {
                if (existingAccount.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only update your own Stripe accounts");
                };
                stripeAccounts := textMap.put(stripeAccounts, accountId, updatedAccount);
            };
        };
    };

    public shared ({ caller }) func deleteStripeAccount(accountId : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can delete Stripe accounts");
        };

        switch (textMap.get(stripeAccounts, accountId)) {
            case (null) { Debug.trap("Stripe account not found") };
            case (?existingAccount) {
                if (existingAccount.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only delete your own Stripe accounts");
                };
                stripeAccounts := textMap.delete(stripeAccounts, accountId);
            };
        };
    };

    public query ({ caller }) func getUserStripeAccounts() : async [StripeAccount] {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view their Stripe accounts");
        };
        Iter.toArray(
            Iter.filter(
                textMap.vals(stripeAccounts),
                func(account : StripeAccount) : Bool {
                    account.owner == caller;
                },
            )
        );
    };

    public query ({ caller }) func getStripeAccount(accountId : Text) : async ?StripeAccount {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view Stripe accounts");
        };

        switch (textMap.get(stripeAccounts, accountId)) {
            case (null) { null };
            case (?account) {
                if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only view your own Stripe accounts");
                };
                ?account;
            };
        };
    };

    public type ChannelStripeConnection = {
        channelId : ChannelId;
        stripeAccountId : Text;
    };

    var channelStripeConnections = textMap.empty<ChannelStripeConnection>();

    public shared ({ caller }) func connectChannelToStripeAccount(connection : ChannelStripeConnection) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can connect channels to Stripe accounts");
        };

        if (not isChannelOwner(caller, connection.channelId)) {
            Debug.trap("Unauthorized: Can only connect your own channels");
        };
        
        switch (textMap.get(stripeAccounts, connection.stripeAccountId)) {
            case (null) { Debug.trap("Stripe account not found") };
            case (?account) {
                if (account.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                    Debug.trap("Unauthorized: Can only use your own Stripe accounts");
                };
                channelStripeConnections := textMap.put(channelStripeConnections, connection.channelId, connection);
            };
        };
    };

    public query ({ caller }) func getChannelStripeConnection(channelId : ChannelId) : async ?ChannelStripeConnection {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can view channel Stripe connections");
        };

        switch (textMap.get(channelStripeConnections, channelId)) {
            case (null) { null };
            case (?connection) {
                if (not isChannelOwner(caller, channelId)) {
                    Debug.trap("Unauthorized: Can only view connections for your own channels");
                };
                ?connection;
            };
        };
    };

    var configuration : ?Stripe.StripeConfiguration = null;

    public query func isStripeConfigured() : async Bool {
        configuration != null;
    };

    public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can perform this action");
        };
        configuration := ?config;
    };

    func getStripeConfiguration() : Stripe.StripeConfiguration {
        switch (configuration) {
            case (null) { Debug.trap("Stripe needs to be first configured") };
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
