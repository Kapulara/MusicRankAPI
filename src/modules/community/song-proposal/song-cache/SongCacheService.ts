import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { Connection } from 'typeorm';
import { SpotifyLocalService } from '../../../spotify/SpotifyLocalService';
import { UserEntity } from '../../../auth/user/UserEntity';
import { CommunityService } from '../../CommunityService';
import { SongCacheEntity } from './SongCacheEntity';
import { InternalServerError } from 'ts-httpexceptions';

@Service()
export class SongCacheService {

  public connection: Connection;

  constructor(
    private typeORMService: TypeORMService,
    private spotifyLocalService: SpotifyLocalService
  ) {
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
  }

  public async getSong(
    songId: string,
    user: UserEntity
  ) {
    const songCacheEntity = await this.connection.manager.findOne(SongCacheEntity, { songId });

    if ( !_.isNil(songCacheEntity) ) {
      return songCacheEntity;
    }

    await this.spotifyLocalService.checkRefresh(user);
    const { statusCode, body: track } = await this.spotifyLocalService
      .spotifyApi
      .getTrack(songId);

    if ( statusCode !== 200 ) {
      throw new InternalServerError(`Spotify API returned ${statusCode} while caching song.`);
    }

    const newSongCacheEntity = new SongCacheEntity();
    newSongCacheEntity.songId = songId;
    newSongCacheEntity.json = JSON.stringify(track);
    await this.connection.manager.save(newSongCacheEntity);
    await this.getSong(songId, user);

    return newSongCacheEntity;
  }

}
