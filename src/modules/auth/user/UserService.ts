import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { BadRequest, Unauthorized } from 'ts-httpexceptions';
import { Connection, Repository } from 'typeorm';
import * as uuidv4 from 'uuid/v4';
import { SpotifyInformationEntity } from './spotify/SpotifyInformationEntity';
import { UserEntity } from './UserEntity';
import { $log } from 'ts-log-debug';

@Service()
export class UserService {

  public static repository: Repository<UserEntity>;
  private connection: Connection;

  constructor(private typeORMService: TypeORMService) {
  }

  public static async find(
    idOrToken: any,
    isToken = false
  ) {
    if ( isToken ) {
      return await UserService.repository.findOne({ token: idOrToken }, { relations: [ 'spotifyInformation' ] });
    }

    return await UserService.repository.findOne(idOrToken, { relations: [ 'spotifyInformation' ] });
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

  public async validate(
    email,
    password
  ) {
    if ( await this.exists(email) ) {
      const user = await this.connection.manager.findOne(UserEntity, { email });

      if ( user.verifyPassword(password) ) {
        // Update token
        user.token = UserEntity.generateToken();
        await this.connection.manager.save(user);

        return {
          id: user.id,
          email: user.email,
          token: user.token
        };
      }
    }

    throw new Unauthorized('Failed to authorize with given credentials.');
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
}
