import BaseToCore "BaseToCore";
import OrderedMap "mo:base/OrderedMap";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";

module {
  // ── Shared type aliases ─────────────────────────────────────────────────────
  type VideoId = Text;
  type ChannelId = Text;

  type Category = {
    #music;
    #gaming;
    #education;
    #vlog;
    #comedy;
    #other;
  };

  type UserProfile = { name : Text };

  type VideoMetadata = {
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

  type Comment = {
    id : Text;
    videoId : VideoId;
    author : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  type Channel = {
    id : ChannelId;
    principal : Principal;
    name : Text;
    profile : Text;
  };

  type MembershipTier = {
    id : Text;
    channelId : ChannelId;
    name : Text;
    priceUsd : Nat;
    tierLevel : Nat;
    description : Text;
  };

  type SubscriptionStatus = {
    #active;
    #canceled;
    #past_due;
  };

  type Subscription = {
    id : Text;
    user : Principal;
    channelId : ChannelId;
    tierId : Text;
    status : SubscriptionStatus;
    startDate : Time.Time;
    nextBillingDate : Time.Time;
  };

  type Course = {
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

  type PlaylistVisibility = {
    #publicVisibility;
    #privateVisibility;
  };

  type Playlist = {
    id : Text;
    creator : Principal;
    title : Text;
    description : Text;
    visibility : PlaylistVisibility;
    videoIds : [VideoId];
  };

  type Donation = {
    id : Text;
    donor : Principal;
    channelId : ChannelId;
    amountUsd : Nat;
    timestamp : Time.Time;
    message : ?Text;
  };

  type StripeAccount = {
    id : Text;
    owner : Principal;
    accountName : Text;
    secretKey : Text;
    connectId : ?Text;
    payoutSettings : ?Text;
  };

  type ChannelStripeConnection = {
    channelId : ChannelId;
    stripeAccountId : Text;
  };

  // ── StripeConfiguration (scalar, no migration needed) ───────────────────────
  type StripeConfiguration = {
    secretKey : Text;
    allowedCountries : [Text];
  };

  // ── OldActor — uses OrderedMap / mo:base types ───────────────────────────────
  type OldStorageState = { var authorizedPrincipals : [Principal]; var blobTodeletete : [Blob] };

  type OldActor = {
    accessControlState : BaseToCore.OldAccessControlState;

    storage : OldStorageState;

    var userProfiles : OrderedMap.Map<Principal, UserProfile>;
    var videos : OrderedMap.Map<Text, VideoMetadata>;
    var comments : OrderedMap.Map<Text, Comment>;
    var channels : OrderedMap.Map<Text, Channel>;
    var membershipTiers : OrderedMap.Map<Text, MembershipTier>;
    var subscriptions : OrderedMap.Map<Text, Subscription>;
    var courses : OrderedMap.Map<Text, Course>;
    var playlists : OrderedMap.Map<Text, Playlist>;
    var donations : OrderedMap.Map<Text, Donation>;
    var channelFollows : OrderedMap.Map<Principal, [ChannelId]>;
    var stripeAccounts : OrderedMap.Map<Text, StripeAccount>;
    var channelStripeConnections : OrderedMap.Map<Text, ChannelStripeConnection>;

    var configuration : ?StripeConfiguration;
  };

  // ── NewActor — uses Map / mo:core types ─────────────────────────────────────
  type NewActor = {
    accessControlState : BaseToCore.NewAccessControlState;

    userProfiles : Map.Map<Principal, UserProfile>;
    videos : Map.Map<Text, VideoMetadata>;
    comments : Map.Map<Text, Comment>;
    channels : Map.Map<Text, Channel>;
    membershipTiers : Map.Map<Text, MembershipTier>;
    subscriptions : Map.Map<Text, Subscription>;
    courses : Map.Map<Text, Course>;
    playlists : Map.Map<Text, Playlist>;
    donations : Map.Map<Text, Donation>;
    channelFollows : Map.Map<Principal, [ChannelId]>;
    stripeAccounts : Map.Map<Text, StripeAccount>;
    channelStripeConnections : Map.Map<Text, ChannelStripeConnection>;

    // Rate-limiting state — new in this version, initialised empty on migration
    videoUploadLog : Map.Map<Principal, [Time.Time]>;

    var configuration : ?StripeConfiguration;
  };

  public func run(old : OldActor) : NewActor {
    {
      accessControlState = BaseToCore.migrateAccessControlState(old.accessControlState);

      userProfiles = BaseToCore.migrateOrderedMap<Principal, UserProfile>(old.userProfiles);
      videos = BaseToCore.migrateOrderedMap<Text, VideoMetadata>(old.videos);
      comments = BaseToCore.migrateOrderedMap<Text, Comment>(old.comments);
      channels = BaseToCore.migrateOrderedMap<Text, Channel>(old.channels);
      membershipTiers = BaseToCore.migrateOrderedMap<Text, MembershipTier>(old.membershipTiers);
      subscriptions = BaseToCore.migrateOrderedMap<Text, Subscription>(old.subscriptions);
      courses = BaseToCore.migrateOrderedMap<Text, Course>(old.courses);
      playlists = BaseToCore.migrateOrderedMap<Text, Playlist>(old.playlists);
      donations = BaseToCore.migrateOrderedMap<Text, Donation>(old.donations);
      channelFollows = BaseToCore.migrateOrderedMap<Principal, [ChannelId]>(old.channelFollows);
      stripeAccounts = BaseToCore.migrateOrderedMap<Text, StripeAccount>(old.stripeAccounts);
      channelStripeConnections = BaseToCore.migrateOrderedMap<Text, ChannelStripeConnection>(old.channelStripeConnections);

      // Initialise rate-limit log empty — no prior data to migrate
      videoUploadLog = Map.empty<Principal, [Time.Time]>();

      var configuration = old.configuration;
    };
  };
};
