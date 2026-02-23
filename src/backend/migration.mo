import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import List "mo:base/List";

module {
    type OldActor = {
        userProfiles : OrderedMap.Map<Principal, { name : Text }>;
        videos : OrderedMap.Map<Text, {
            id : Text;
            title : Text;
            description : Text;
            category : {
                #music;
                #gaming;
                #education;
                #vlog;
                #comedy;
                #other;
            };
            uploadDate : Time.Time;
            likeCount : Nat;
            channelId : Text;
            videoUrl : Text;
            thumbnailUrl : Text;
            requiredTierLevel : ?Nat;
            isPrivate : Bool;
        }>;
        comments : OrderedMap.Map<Text, {
            id : Text;
            videoId : Text;
            author : Principal;
            content : Text;
            timestamp : Time.Time;
        }>;
        channels : OrderedMap.Map<Text, {
            id : Text;
            principal : Principal;
            name : Text;
            profile : Text;
        }>;
        membershipTiers : OrderedMap.Map<Text, {
            id : Text;
            channelId : Text;
            name : Text;
            priceUsd : Nat;
            tierLevel : Nat;
            description : Text;
        }>;
        subscriptions : OrderedMap.Map<Text, {
            id : Text;
            user : Principal;
            channelId : Text;
            tierId : Text;
            status : {
                #active;
                #canceled;
                #past_due;
            };
            startDate : Time.Time;
            nextBillingDate : Time.Time;
        }>;
        courses : OrderedMap.Map<Text, {
            id : Text;
            channelId : Text;
            title : Text;
            description : Text;
            priceUsd : ?Nat;
            requiredTierLevel : ?Nat;
            videoIds : [Text];
        }>;
        playlists : OrderedMap.Map<Text, {
            id : Text;
            creator : Principal;
            title : Text;
            description : Text;
            visibility : {
                #publicVisibility;
                #privateVisibility;
            };
            videoIds : [Text];
        }>;
        donations : OrderedMap.Map<Text, {
            id : Text;
            donor : Principal;
            channelId : Text;
            amountUsd : Nat;
            timestamp : Time.Time;
            message : ?Text;
        }>;
        channelFollows : OrderedMap.Map<Principal, [Text]>;
        stripeAccounts : OrderedMap.Map<Text, {
            id : Text;
            owner : Principal;
            accountName : Text;
            secretKey : Text;
            connectId : ?Text;
            payoutSettings : ?Text;
        }>;
        channelStripeConnections : OrderedMap.Map<Text, {
            channelId : Text;
            stripeAccountId : Text;
        }>;
    };

    type NewActor = {
        userProfiles : OrderedMap.Map<Principal, { name : Text }>;
        videos : OrderedMap.Map<Text, {
            id : Text;
            title : Text;
            description : Text;
            category : {
                #music;
                #gaming;
                #education;
                #vlog;
                #comedy;
                #other;
            };
            uploadDate : Time.Time;
            likeCount : Nat;
            channelId : Text;
            videoUrl : Text;
            thumbnailUrl : Text;
            requiredTierLevel : ?Nat;
            isPrivate : Bool;
            viewCount : Nat;
        }>;
        comments : OrderedMap.Map<Text, {
            id : Text;
            videoId : Text;
            author : Principal;
            content : Text;
            timestamp : Time.Time;
        }>;
        channels : OrderedMap.Map<Text, {
            id : Text;
            principal : Principal;
            name : Text;
            profile : Text;
        }>;
        membershipTiers : OrderedMap.Map<Text, {
            id : Text;
            channelId : Text;
            name : Text;
            priceUsd : Nat;
            tierLevel : Nat;
            description : Text;
        }>;
        subscriptions : OrderedMap.Map<Text, {
            id : Text;
            user : Principal;
            channelId : Text;
            tierId : Text;
            status : {
                #active;
                #canceled;
                #past_due;
            };
            startDate : Time.Time;
            nextBillingDate : Time.Time;
        }>;
        courses : OrderedMap.Map<Text, {
            id : Text;
            channelId : Text;
            title : Text;
            description : Text;
            priceUsd : ?Nat;
            requiredTierLevel : ?Nat;
            videoIds : [Text];
            courseImage : ?Text;
            isVisible : Bool;
        }>;
        playlists : OrderedMap.Map<Text, {
            id : Text;
            creator : Principal;
            title : Text;
            description : Text;
            visibility : {
                #publicVisibility;
                #privateVisibility;
            };
            videoIds : [Text];
        }>;
        donations : OrderedMap.Map<Text, {
            id : Text;
            donor : Principal;
            channelId : Text;
            amountUsd : Nat;
            timestamp : Time.Time;
            message : ?Text;
        }>;
        channelFollows : OrderedMap.Map<Principal, [Text]>;
        stripeAccounts : OrderedMap.Map<Text, {
            id : Text;
            owner : Principal;
            accountName : Text;
            secretKey : Text;
            connectId : ?Text;
            payoutSettings : ?Text;
        }>;
        channelStripeConnections : OrderedMap.Map<Text, {
            channelId : Text;
            stripeAccountId : Text;
        }>;
    };

    public func run(old : OldActor) : NewActor {
        let textMap = OrderedMap.Make<Text>(Text.compare);

        let videos = textMap.map<{
            id : Text;
            title : Text;
            description : Text;
            category : {
                #music;
                #gaming;
                #education;
                #vlog;
                #comedy;
                #other;
            };
            uploadDate : Time.Time;
            likeCount : Nat;
            channelId : Text;
            videoUrl : Text;
            thumbnailUrl : Text;
            requiredTierLevel : ?Nat;
            isPrivate : Bool;
        }, {
            id : Text;
            title : Text;
            description : Text;
            category : {
                #music;
                #gaming;
                #education;
                #vlog;
                #comedy;
                #other;
            };
            uploadDate : Time.Time;
            likeCount : Nat;
            channelId : Text;
            videoUrl : Text;
            thumbnailUrl : Text;
            requiredTierLevel : ?Nat;
            isPrivate : Bool;
            viewCount : Nat;
        }>(
            old.videos,
            func(_id, oldVideo) {
                { oldVideo with viewCount = 0 };
            },
        );

        let courses = textMap.map<{
            id : Text;
            channelId : Text;
            title : Text;
            description : Text;
            priceUsd : ?Nat;
            requiredTierLevel : ?Nat;
            videoIds : [Text];
        }, {
            id : Text;
            channelId : Text;
            title : Text;
            description : Text;
            priceUsd : ?Nat;
            requiredTierLevel : ?Nat;
            videoIds : [Text];
            courseImage : ?Text;
            isVisible : Bool;
        }>(
            old.courses,
            func(_id, oldCourse) {
                {
                    oldCourse with
                    courseImage = null;
                    isVisible = true;
                };
            },
        );

        {
            old with
            videos;
            courses;
        };
    };
};
