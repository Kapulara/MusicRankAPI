import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { $log } from 'ts-log-debug';
import { Connection } from 'typeorm';
import { SpotifyLocalService } from '../spotify/SpotifyLocalService';
import { UserEntity } from '../auth/user/UserEntity';
import { UserService } from '../auth/user/UserService';
import { CommunityEntity } from './CommunityEntity';
import { NotFound } from 'ts-httpexceptions';
import { SongProposalEntity } from './song-proposal/SongProposalEntity';

@Service()
export class CommunityService {

  public connection: Connection;

  constructor(
    private typeORMService: TypeORMService,
    private userService: UserService,
    private spotifyLocalService: SpotifyLocalService
  ) {
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
  }

  public async create(
    community: CommunityEntity,
    user: UserEntity
  ) {
    const playlist = await this.createPlaylist(community.name);

    community.playlistId = playlist.id;
    community.participants = [ user ];
    community.admin = user;
    await this.connection.manager.save(community);

    user.communities.push(community);
    user.adminCommunities.push(community);
    await this.connection.manager.save(user);

    return community.toAllColumns(user);
  }

  public async createPlaylist(name: string) {
    const playlistAccount = await this.userService.getPlaylistAccount();
    $log.info(playlistAccount);

    const { body: playlist } = await this.spotifyLocalService.apiFunction('createPlaylist', [
      playlistAccount.spotifyId,
      `MusicRank.club - ${name}`,
      {
        description: 'A curated playlist by the community over at music rank!',
        public: true
      }
    ], playlistAccount);
    $log.info(playlist);

    const { body: unfollowRequest } = await this.spotifyLocalService.apiFunction('unfollowPlaylist', [ playlist.id ]);
    $log.info(unfollowRequest);

    return playlist;
  }

  public async updatePlaylist(community: CommunityEntity) {
    const playlistAccount = await this.userService.getPlaylistAccount();

    const acceptedSongs = await this.connection
      .manager
      .find(SongProposalEntity, {
        community: community.id,
        isAccepted: true,
        isDenied: false
      });
    const acceptedUris = acceptedSongs.map((acceptedSong) => acceptedSong.songId);

    const { body: replacedTracks } = await this.spotifyLocalService.apiFunction('replaceTracksInPlaylist', [
      community.playlistId,
      []
    ], playlistAccount);

    // const { body: playlistDetails } = await this.spotifyLocalService.apiFunction('changePlaylistDetails', [
    //   community.playlistId,
    //   {
    //     name: `MusicRank.club - ${community.name}`,
    //     description: 'A curated playlist by the community over at music rank!'
    //   }
    // ], playlistAccount);
    // $log.info(playlistDetails);

    const uris = acceptedUris.map((acceptedUri) => `spotify:track:${acceptedUri}`);
    if ( uris.length > 0 ) {
      const { body: addTracks } = await this.spotifyLocalService.apiFunction('addTracksToPlaylist', [
        community.playlistId,
        uris
      ], playlistAccount);
      $log.info('addTracks', addTracks);
    }

    $log.info('replacedTracks', replacedTracks);
    console.log(acceptedUris.map((acceptedUri) => `spotify:track:${acceptedUri}`));
  }

  public async getCommunity(
    id: string
  ) {
    let where: any = { id };

    try {
      const parsedId = parseInt(id, 10);
      $log.info(parsedId);
      if ( _.isNaN(parsedId) || `${parsedId}`.length !== id.length ) {
        where = {
          playlistId: id
        };
      }
    } catch (e) {
      if ( !_.isNil(e) ) {
        where = {
          playlistId: id
        };
      }
    }

    $log.info(where);

    const community = await this.connection.manager.findOne(CommunityEntity, {
      where,
      relations: [
        'admin',
        'songProposals',
        'participants',
        'participants.spotifyInformation'
      ]
    });

    if ( _.isNil(community) ) {
      throw new NotFound('Community not found');
    }

    return community;
  }

  public async getAll(user: UserEntity) {
    const communityIds = user.communities.map((community) => community.id);

    const communities = await Promise.all(
      communityIds.map(async (communityId) => await this.getCommunity(`${communityId}`))
    );

    return communities.map((community) => community.toAllColumns(user));
  }

  public async update(
    communityToUpdate: CommunityEntity,
    community: CommunityEntity
  ) {
    communityToUpdate.name = community.name;
    communityToUpdate.threshold = community.threshold;
    await this.connection.manager.save(communityToUpdate);
    await this.updatePlaylist(communityToUpdate);
  }

  public async delete(id: string) {
    const communityToDelete = await this.getCommunity(id);

    await Promise.all(
      communityToDelete
        .songProposals
        .map(async (songProposal) => this.connection.manager.remove(songProposal))
    );

    communityToDelete
      .participants
      .length = 0;

    await this.connection.manager.remove(communityToDelete);
  }
}
