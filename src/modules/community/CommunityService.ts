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
        'participants.spotifyInformation',
      ]
    });

    if ( _.isNil(community) ) {
      throw new NotFound('Community not found');
    }

    return community;
  }
}
