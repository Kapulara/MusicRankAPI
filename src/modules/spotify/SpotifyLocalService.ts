import {
  AfterRoutesInit,
  BeforeRoutesInit,
  ExpressApplication,
  Inject,
  ServerSettingsService,
  Service
} from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as Passport from 'passport';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import * as SpotifyWebApi from 'spotify-web-api-node';
import { Forbidden, InternalServerError } from 'ts-httpexceptions';
import { $log } from 'ts-log-debug';
import { Connection } from 'typeorm';
import { UserEntity } from '../auth/user/UserEntity';
import { UserService } from '../auth/user/UserService';
import _ = require('lodash');
import moment = require('moment');

@Service()
export class SpotifyLocalService implements BeforeRoutesInit, AfterRoutesInit {

  public spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: (process.env.BASE_URL || 'http://0.0.0.0:9090') + '/v1/spotify/callback'
  });

  public allowedFunctions = [
    'getTrack',
    'getTracks',
    'getAlbum',
    'getAlbums',
    'getArtist',
    'getArtists',
    'getArtistAlbums',
    'getAlbumTracks',
    'getArtistTopTracks',
    'getArtistRelatedArtists',

    // Search
    'search',
    'searchAlbums',
    'searchArtists',
    'searchTracks',
    'searchPlaylists',

    // User
    'getUser',
    'getMe',
    'getUserPlaylists',

    // Playlist
    'getPlaylist',
    'getPlaylistTracks',
    'createPlaylist',
    'followPlaylist',
    'unfollowPlaylist',
    'changePlaylistDetails',
    'uploadCustomPlaylistCoverImage',
    'addTracksToPlaylist',
    'removeTracksFromPlaylist',
    'removeTracksFromPlaylistByPosition',
    'replaceTracksInPlaylist',
    'reorderTracksInPlaylist',

    // Audio Analysis
    'getAudioFeaturesForTrack',
    'getAudioAnalysisForTrack',
    'getAudioFeaturesForTracks',

    // Recommendations
    'getRecommendations',
    'getAvailableGenreSeeds',

    // Saved
    'getMySavedTracks',
    'containsMySavedTracks',
    'removeFromMySavedTracks',
    'addToMySavedTracks',
    'removeFromMySavedAlbums',
    'addToMySavedAlbums',
    'getMySavedAlbums',
    'containsMySavedAlbums',

    // Top Artists and Tracks
    'getMyTopArtists',
    'getMyTopTracks',
    'getMyRecentlyPlayedTracks',

    // Player
    'getMyDevices',
    'getMyCurrentPlayingTrack',
    'getMyCurrentPlaybackState',
    'transferMyPlayback',
    'play',
    'pause',
    'skipToPrevious',
    'skipToNext',
    'seek',
    'setRepeat',
    'setShuffle',
    'setVolume',

    // Follow
    'followUsers',
    'followArtists',
    'unfollowUsers',
    'unfollowArtists',
    'isFollowingUsers',
    'getFollowedArtists',
    'areFollowingPlaylist',
    'isFollowingArtists',

    // Other
    'getNewReleases',
    'getFeaturedPlaylists',
    'getCategories',
    'getCategory',
    'getPlaylistsForCategory'
  ];
  private connection: Connection;

  constructor(
    private userService: UserService,
    private serverSettings: ServerSettingsService,
    private typeORMService: TypeORMService,
    @Inject(ExpressApplication) private  expressApplication: ExpressApplication
  ) {

    // used to serialize the user for the session
    Passport.serializeUser(SpotifyLocalService.serialize);

    // used to deserialize the user
    Passport.deserializeUser(this.deserialize.bind(this));
  }

  /**
   *
   * @param user
   * @param done
   */
  static serialize(
    user,
    done
  ) {
    done(null, user.id);
  }

  $beforeRoutesInit() {
    const options: any = this.serverSettings.get('passport') || {} as any;
    const { userProperty, pauseStream } = options;

    this.expressApplication.use(Passport.initialize({ userProperty }));
    this.expressApplication.use(Passport.session({ pauseStream }));
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
    UserService.repository = this.connection.getRepository(UserEntity);

    this.initializeSpotify();
  }

  public async apiFunction(
    functionName: string,
    args = [],
    asUser: UserEntity = null
  ) {
    $log.info('Executing as user', asUser);
    if ( !_.isNil(asUser) ) {
      await this.checkRefresh(asUser);
    }

    if ( this.allowedFunctions.indexOf(functionName) === -1 ) {
      throw new Forbidden('Not allowed to call this Spotify API function');
    }

    if ( !_.isArray(args) ) {
      if ( _.isEqual(args, {}) ) {
        args = [];
      } else {
        args = [ args ];
      }
    } else {
      args = args.filter((arg) => !_.isEqual(arg, {}));
    }

    $log.info(args);

    try {
      if ( args.length > 0 ) {
        return await this.spotifyApi[ functionName ](...args);
      } else {
        return await this.spotifyApi[ functionName ]();
      }
    } catch (err) {
      console.trace();
      $log.error(err);
      throw new InternalServerError(err.message);
    }
  }

  /**
   *
   * @param id
   * @param done
   */
  public deserialize(
    id,
    done
  ) {
    UserService.find(id)
      .then((user: any) => {
        done(null, user);
      });
  }

  public async updateSpotifyInformation(user): Promise<UserEntity> {
    const { updated, user: refreshedUser } = await this.checkRefresh(user);

    if ( updated ) {
      const { body: spotifyInformation } = await this.spotifyApi.getMe();

      refreshedUser.spotifyInformation.json = JSON.stringify(spotifyInformation, null, 2);
      $log.info(spotifyInformation);

      await this.connection.manager.save(refreshedUser.spotifyInformation);
      refreshedUser.spotifyInformation.json = spotifyInformation;

      return refreshedUser;
    }

    return refreshedUser;
  }

  public async checkRefresh(
    user: UserEntity,
    forceRefresh = false
  ): Promise<any> {
    const updatedDate = moment(user.spotifyInformation.updatedDate);
    const currentTime = moment();

    const { accessToken, refreshToken, expiresIn } = user.spotifyInformation;

    this.spotifyApi.setAccessToken(accessToken);
    this.spotifyApi.setRefreshToken(refreshToken);

    $log.info(`Difference ${currentTime.diff(updatedDate, 's')}s`);
    $log.info(`Expires In ${expiresIn}s`);
    $log.info(`Should update: ${currentTime.diff(updatedDate, 's') > expiresIn}`);
    if ( forceRefresh || currentTime.diff(updatedDate, 's') > expiresIn ) {
      const { body } = await this.spotifyApi.refreshAccessToken();
      const { access_token, expires_in } = body;

      user.spotifyInformation.accessToken = access_token;
      user.spotifyInformation.expiresIn = expires_in;
      user.spotifyInformation.updatedDate = moment().format('YYYY-MM-DD HH:mm:ss');

      await this.connection.manager.save(user.spotifyInformation);

      this.spotifyApi.setAccessToken(access_token);

      return {
        updated: true,
        user
      };
    }

    return {
      updated: false,
      user
    };
  }

  private initializeSpotify() {
    Passport.use(new SpotifyStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: (process.env.BASE_URL || 'http://0.0.0.0:9090') + '/v1/spotify/callback'
      },
      (
        accessToken,
        refreshToken,
        expiresIn,
        profile,
        done
      ) => {
        this.userService.createOrGetUser(
          {
            accessToken,
            refreshToken,
            expiresIn,
            profile
          }
        )
          .then((user) => {
            $log.info(user);
            done(null, user);
          })
          .catch((err) => {
            $log.error(err);
            done(err);
          });
      }
    ));
  }
}
