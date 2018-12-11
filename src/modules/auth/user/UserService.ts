import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { BadRequest, NotFound } from 'ts-httpexceptions';
import { $log } from 'ts-log-debug';
import { Connection, Repository } from 'typeorm';
import { SpotifyInformationEntity } from './spotify/SpotifyInformationEntity';
import { UserEntity } from './UserEntity';

@Service()
export class UserService {

  public static repository: Repository<UserEntity>;
  private connection: Connection;
  public static relations: string[] = [
    'spotifyInformation',
    'songProposals',
    'votes',
    'adminCommunities',
    'adminCommunities.admin',
    'adminCommunities.songProposals',
    'adminCommunities.participants',
    'adminCommunities.participants.spotifyInformation',
    'communities',
    'communities.admin',
    'communities.songProposals',
    'communities.participants',
    'communities.participants.spotifyInformation',
  ];

  constructor(private typeORMService: TypeORMService) {
  }

  public static async find(
    idOrToken: any,
    isToken = false
  ) {
    let user;
    if ( isToken ) {
      user = await UserService.repository
        .findOne({ token: idOrToken }, {
          relations: this.relations
        });
    } else {
      user = await UserService.repository
        .findOne(idOrToken, {
          relations: this.relations
        });
    }

    if ( _.isNil(user) ) {
      throw new NotFound('User not found.');
    }

    return user;
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
    UserService.repository = this.connection.getRepository(UserEntity);
    // console.log('this.connection =>', this.connection);
  }

  public async create(
    userObject: UserEntity
  ) {
    if ( _.isNil(userObject[ 'email' ]) ) {
      throw new BadRequest('Email is required.');
    }
    if ( _.isNil(userObject[ 'password' ]) ) {
      throw new BadRequest('Password is required.');
    }

    if ( await this.exists(userObject[ 'email' ]) ) {
      throw new BadRequest('Email already exists.');
    }

    await this.connection.manager.save(userObject);

    return `User created with ${userObject.email}`;
  }

  public async exists(email: string) {
    return _.isNil(await this.connection.manager.findOne(UserEntity, { email })) === false;
  }

  public async createOrGetUser(spotifyInformation: any) {
    $log.info('Creating or receiving user...');
    const { profile } = spotifyInformation;
    const spotifyEmail = profile._json.email;
    $log.info('Email ' + spotifyEmail);

    if ( await this.exists(spotifyEmail) ) {
      $log.info('User exists with ' + spotifyEmail);
      let user = await UserService.repository.findOne({ email: spotifyEmail }, { relations: [ 'spotifyInformation' ] });
      $log.info(user);

      if ( _.isNil(user.spotifyId) ) {
        const dbSpotifyInformation = new SpotifyInformationEntity();
        dbSpotifyInformation.accessToken = spotifyInformation.accessToken;
        dbSpotifyInformation.refreshToken = spotifyInformation.refreshToken;
        dbSpotifyInformation.expiresIn = spotifyInformation.expiresIn;
        dbSpotifyInformation.url = profile._json.href;
        dbSpotifyInformation.json = profile._raw;

        await this.connection.manager.save(dbSpotifyInformation);

        user.spotifyId = profile.id;
        user.spotifyInformation = dbSpotifyInformation;

        await UserService.repository.save(user);
        return user;
      }

      if ( user.spotifyId === profile.id ) {
        return user;
      } else {
        throw new BadRequest('Mismatch spotifyId and profileId');
      }
    } else {
      const dbSpotifyInformation = new SpotifyInformationEntity();
      dbSpotifyInformation.accessToken = spotifyInformation.accessToken;
      dbSpotifyInformation.refreshToken = spotifyInformation.refreshToken;
      dbSpotifyInformation.expiresIn = spotifyInformation.expiresIn;
      dbSpotifyInformation.url = profile._json.href;
      dbSpotifyInformation.json = profile._raw;

      await this.connection.manager.save(dbSpotifyInformation);

      const user = new UserEntity();
      user.email = spotifyEmail;
      user.name = profile.displayName;
      user.spotifyId = profile.id;
      user.spotifyInformation = dbSpotifyInformation;

      await UserService.repository.insert(user);
      return user;
    }
  }

  public async getPlaylistAccount() {
    const user = await this.connection.manager
      .findOne(
        UserEntity,
        { isPlaylistAccount: true },
        { relations: [ 'spotifyInformation', 'adminCommunities', 'communities' ] }
      );

    if ( _.isNil(user) ) {
      throw new NotFound('User not found.');
    }

    return user;
  }
}
